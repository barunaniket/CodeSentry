-- CodeSentry Database Schema
-- Advanced DBMS Concepts Demonstrated:
-- 1. Triggers (Auto-flagging on threshold breach)
-- 2. Transactions (Atomic case transitions & auditing)
-- 3. Stored Procedures / Functions (Recomputing similarity scores)
-- 4. Indexing (HNSW Vector Index, composite B-Tree, GIN FTS)
-- 5. Full-Text Search (tsvector and tsquery)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- System Settings (e.g. plagiarism threshold)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value VARCHAR(256) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value, description)
VALUES ('plagiarism_threshold', '0.70', 'Default combined similarity threshold for auto-flagging')
ON CONFLICT (key) DO NOTHING;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'MODERATOR', 'STUDENT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Contests table
CREATE TABLE IF NOT EXISTS contests (
    contest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Problems table
CREATE TABLE IF NOT EXISTS problems (
    problem_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(contest_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    statement_text TEXT NOT NULL,
    difficulty VARCHAR(32) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    time_limit_ms INT DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || statement_text)) STORED
);

-- GIN Index for Problem Statement Full-Text Search
CREATE INDEX IF NOT EXISTS idx_problems_tsv ON problems USING GIN(tsv);

-- 4. Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    language VARCHAR(32) NOT NULL CHECK (language IN ('python', 'cpp')),
    source_code TEXT NOT NULL,
    normalized_code TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Composite B-Tree index on (problem_id, submitted_at)
CREATE INDEX IF NOT EXISTS idx_submissions_problem_time ON submissions(problem_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);

-- 5. Submission Embeddings table (Vector Database Component)
CREATE TABLE IF NOT EXISTS submission_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID UNIQUE NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
    language VARCHAR(32) NOT NULL,
    embedding_vector vector(384) NOT NULL,
    model_version VARCHAR(64) DEFAULT 'code-minilm-v1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Vector Index for Fast Cosine Distance Search
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw ON submission_embeddings
USING hnsw (embedding_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 6. Similarity Scores table (Dual Signal: Semantic + Token Overlap)
CREATE TABLE IF NOT EXISTS similarity_scores (
    score_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id_a UUID NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    submission_id_b UUID NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    embedding_score NUMERIC(5, 4) NOT NULL, -- 0.0000 to 1.0000
    ngram_score NUMERIC(5, 4) NOT NULL,      -- 0.0000 to 1.0000
    combined_score NUMERIC(5, 4) NOT NULL,   -- Weighted combination
    matched_lines_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_diff_submissions CHECK (submission_id_a <> submission_id_b),
    CONSTRAINT uq_submission_pair UNIQUE (submission_id_a, submission_id_b)
);

CREATE INDEX IF NOT EXISTS idx_similarity_scores_pair ON similarity_scores(submission_id_a, submission_id_b);
CREATE INDEX IF NOT EXISTS idx_similarity_combined_score ON similarity_scores(combined_score DESC);

-- 7. Plagiarism Cases table
CREATE TABLE IF NOT EXISTS plagiarism_cases (
    case_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id_a UUID NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    submission_id_b UUID NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    combined_score NUMERIC(5, 4) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'FLAGGED' CHECK (status IN ('FLAGGED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
    reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_case_pair UNIQUE (submission_id_a, submission_id_b)
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON plagiarism_cases(status);

-- 8. Case Notes table (with Full-Text Search)
CREATE TABLE IF NOT EXISTS case_notes (
    note_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES plagiarism_cases(case_id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', note_text)) STORED
);

CREATE INDEX IF NOT EXISTS idx_case_notes_tsv ON case_notes USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id);

-- =========================================================================
-- ADVANCED FEATURE 1: TRIGGERS
-- Trigger to automatically flag submission pairs crossing the threshold
-- =========================================================================

CREATE OR REPLACE FUNCTION trg_check_similarity_flag()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold NUMERIC;
    v_sub_a UUID;
    v_sub_b UUID;
BEGIN
    SELECT value::NUMERIC INTO v_threshold
    FROM system_settings
    WHERE key = 'plagiarism_threshold';
    
    IF v_threshold IS NULL THEN
        v_threshold := 0.70;
    END IF;

    -- Standardize ordering so submission_id_a < submission_id_b for deduplication
    IF NEW.submission_id_a < NEW.submission_id_b THEN
        v_sub_a := NEW.submission_id_a;
        v_sub_b := NEW.submission_id_b;
    ELSE
        v_sub_a := NEW.submission_id_b;
        v_sub_b := NEW.submission_id_a;
    END IF;

    IF NEW.combined_score >= v_threshold THEN
        INSERT INTO plagiarism_cases (submission_id_a, submission_id_b, combined_score, status)
        VALUES (v_sub_a, v_sub_b, NEW.combined_score, 'FLAGGED')
        ON CONFLICT (submission_id_a, submission_id_b)
        DO UPDATE SET combined_score = EXCLUDED.combined_score;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_similarity_scores_flag ON similarity_scores;
CREATE TRIGGER trg_similarity_scores_flag
AFTER INSERT OR UPDATE ON similarity_scores
FOR EACH ROW
EXECUTE FUNCTION trg_check_similarity_flag();

-- =========================================================================
-- ADVANCED FEATURE 2: STORED PROCEDURES / FUNCTIONS
-- On-demand batch recomputation of similarity scores for a problem or submission
-- =========================================================================

CREATE OR REPLACE FUNCTION recompute_submission_similarity(p_submission_id UUID)
RETURNS TABLE (
    compared_submission_id UUID,
    embedding_sim NUMERIC,
    ngram_sim NUMERIC,
    final_score NUMERIC
) AS $$
DECLARE
    v_problem_id UUID;
    v_curr_vector vector(384);
    v_rec RECORD;
    v_emb_score NUMERIC;
    v_ngram_score NUMERIC;
    v_combined NUMERIC;
    v_sub_a UUID;
    v_sub_b UUID;
BEGIN
    -- Retrieve target submission problem and embedding
    SELECT s.problem_id, se.embedding_vector
    INTO v_problem_id, v_curr_vector
    FROM submissions s
    JOIN submission_embeddings se ON s.submission_id = se.submission_id
    WHERE s.submission_id = p_submission_id;

    IF v_curr_vector IS NULL THEN
        RAISE EXCEPTION 'Submission % does not have an embedding record.', p_submission_id;
    END IF;

    -- Compare against all other submissions for the same problem
    FOR v_rec IN 
        SELECT s.submission_id AS other_id, se.embedding_vector AS other_vector
        FROM submissions s
        JOIN submission_embeddings se ON s.submission_id = se.submission_id
        WHERE s.problem_id = v_problem_id
          AND s.submission_id <> p_submission_id
    LOOP
        -- Vector cosine similarity = 1 - cosine distance (<=>)
        v_emb_score := ROUND((1 - (v_curr_vector <=> v_rec.other_vector))::NUMERIC, 4);
        IF v_emb_score < 0 THEN v_emb_score := 0; END IF;
        
        -- Existing ngram score if present, else default
        SELECT ngram_score INTO v_ngram_score
        FROM similarity_scores
        WHERE (submission_id_a = p_submission_id AND submission_id_b = v_rec.other_id)
           OR (submission_id_b = p_submission_id AND submission_id_a = v_rec.other_id)
        LIMIT 1;

        IF v_ngram_score IS NULL THEN
            v_ngram_score := v_emb_score; -- Fallback heuristic if not computed
        END IF;

        v_combined := ROUND(((0.65 * v_emb_score) + (0.35 * v_ngram_score))::NUMERIC, 4);

        IF p_submission_id < v_rec.other_id THEN
            v_sub_a := p_submission_id;
            v_sub_b := v_rec.other_id;
        ELSE
            v_sub_a := v_rec.other_id;
            v_sub_b := p_submission_id;
        END IF;

        INSERT INTO similarity_scores (submission_id_a, submission_id_b, embedding_score, ngram_score, combined_score)
        VALUES (v_sub_a, v_sub_b, v_emb_score, v_ngram_score, v_combined)
        ON CONFLICT (submission_id_a, submission_id_b)
        DO UPDATE SET 
            embedding_score = EXCLUDED.embedding_score,
            ngram_score = EXCLUDED.ngram_score,
            combined_score = EXCLUDED.combined_score;

        compared_submission_id := v_rec.other_id;
        embedding_sim := v_emb_score;
        ngram_sim := v_ngram_score;
        final_score := v_combined;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- ADVANCED FEATURE 3: ATOMIC CASE STATUS TRANSITION TRANSACTION PROCEDURE
-- Ensures case status, reviewer, resolved_at, and case note are recorded atomically
-- =========================================================================

CREATE OR REPLACE PROCEDURE transition_case_status(
    p_case_id UUID,
    p_new_status VARCHAR,
    p_reviewer_id UUID,
    p_note_text TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate new status
    IF p_new_status NOT IN ('FLAGGED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- Update plagiarism case
    UPDATE plagiarism_cases
    SET status = p_new_status,
        reviewed_by = p_reviewer_id,
        resolved_at = CASE WHEN p_new_status IN ('RESOLVED', 'DISMISSED') THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE case_id = p_case_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Case % not found', p_case_id;
    END IF;

    -- If a note was provided, insert it
    IF p_note_text IS NOT NULL AND length(trim(p_note_text)) > 0 THEN
        INSERT INTO case_notes (case_id, author_id, note_text)
        VALUES (p_case_id, p_reviewer_id, p_note_text);
    END IF;
END;
$$;

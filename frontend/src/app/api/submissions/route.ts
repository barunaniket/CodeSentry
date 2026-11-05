import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { normalizeCode, generateEmbeddingVector, computeNgramSimilarity, vectorToSql } from '@/lib/similarity';

// GET /api/submissions?problem_id=...&user_id=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problem_id');
    const userId = searchParams.get('user_id');

    let query = `
      SELECT s.submission_id, s.problem_id, s.user_id, s.language, s.source_code, s.normalized_code, s.submitted_at,
             u.name as user_name, u.email as user_email,
             p.title as problem_title, c.title as contest_title
      FROM submissions s
      JOIN users u ON s.user_id = u.user_id
      JOIN problems p ON s.problem_id = p.problem_id
      JOIN contests c ON p.contest_id = c.contest_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (problemId) {
      params.push(problemId);
      query += ` AND s.problem_id = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      query += ` AND s.user_id = $${params.length}`;
    }

    query += ` ORDER BY s.submitted_at DESC LIMIT 50`;
    const res = await pool.query(query, params);
    return NextResponse.json({ submissions: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/submissions (Ingest submission, embed with pgvector, compute dual similarity & trigger flag)
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { problem_id, user_id, language, source_code } = body;

    if (!problem_id || !user_id || !language || !source_code) {
      return NextResponse.json({ error: 'Missing required submission fields' }, { status: 400 });
    }

    // 1. Code Normalization
    const normalized = normalizeCode(source_code, language);

    // 2. Compute 384-d semantic embedding vector
    const embedding = generateEmbeddingVector(normalized, 384);
    const vectorSql = vectorToSql(embedding);

    await client.query('BEGIN');

    // 3. Insert Submission Record
    const insertSubRes = await client.query(
      `INSERT INTO submissions (problem_id, user_id, language, source_code, normalized_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING submission_id, submitted_at`,
      [problem_id, user_id, language, source_code, normalized]
    );
    const newSubId = insertSubRes.rows[0].submission_id;

    // 4. Insert Submission Vector into pgvector table
    await client.query(
      `INSERT INTO submission_embeddings (submission_id, problem_id, language, embedding_vector, model_version)
       VALUES ($1, $2, $3, $4::vector, 'codesentry-dense-v1')`,
      [newSubId, problem_id, language, vectorSql]
    );

    // 5. Query Prior Submissions for the same problem using pgvector nearest-neighbor search (<=>)
    const priorSubmissions = await client.query(
      `SELECT s.submission_id, s.normalized_code,
              ROUND((1 - (se.embedding_vector <=> $1::vector))::numeric, 4) as embedding_sim
       FROM submissions s
       JOIN submission_embeddings se ON s.submission_id = se.submission_id
       WHERE s.problem_id = $2 AND s.submission_id <> $3`,
      [vectorSql, problem_id, newSubId]
    );

    const scoredPairs: any[] = [];

    // 6. Compute Dual Scores (Semantic Vector Cosine + Token N-gram overlap)
    for (const prior of priorSubmissions.rows) {
      const priorSubId = prior.submission_id;
      let embSim = parseFloat(prior.embedding_sim);
      if (embSim < 0) embSim = 0;
      if (embSim > 1) embSim = 1;

      // Structural N-gram score
      const { score: ngramSim, matchedLines } = computeNgramSimilarity(normalized, prior.normalized_code, 3);

      // Weighted Combination (60% semantic embedding + 40% structural overlap)
      const combined = parseFloat(((0.60 * embSim) + (0.40 * ngramSim)).toFixed(4));

      // Deterministic pair ordering (subA < subB) to enforce unique constraint
      const [subA, subB] = newSubId < priorSubId ? [newSubId, priorSubId] : [priorSubId, newSubId];

      // Insert into similarity_scores table (This triggers trg_check_similarity_flag on threshold breach!)
      await client.query(
        `INSERT INTO similarity_scores (submission_id_a, submission_id_b, embedding_score, ngram_score, combined_score, matched_lines_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (submission_id_a, submission_id_b)
         DO UPDATE SET
           embedding_score = EXCLUDED.embedding_score,
           ngram_score = EXCLUDED.ngram_score,
           combined_score = EXCLUDED.combined_score,
           matched_lines_count = EXCLUDED.matched_lines_count`,
        [subA, subB, embSim, ngramSim, combined, matchedLines]
      );

      scoredPairs.push({
        compared_submission_id: priorSubId,
        embedding_score: embSim,
        ngram_score: ngramSim,
        combined_score: combined,
        matched_lines: matchedLines,
      });
    }

    await client.query('COMMIT');

    // 7. Check if a case was automatically flagged by the database trigger
    const flaggedCases = await pool.query(
      `SELECT pc.case_id, pc.combined_score, pc.status, pc.created_at
       FROM plagiarism_cases pc
       WHERE pc.submission_id_a = $1 OR pc.submission_id_b = $1`,
      [newSubId]
    );

    return NextResponse.json({
      success: true,
      submission_id: newSubId,
      scores_computed: scoredPairs.length,
      scored_pairs: scoredPairs,
      flagged_cases: flaggedCases.rows,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Submission error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

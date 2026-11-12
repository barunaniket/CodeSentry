# CodeSentry: Database-Backed Code Plagiarism & Similarity Detection Platform

CodeSentry is an end-to-end  plagiarism  and semantic code similarity detection platform engineered with **PostgreSQL** + **pgvector** and a fullstack **Next.js** web interface.

---

## 🌟 Key Features

1. **Dual Similarity Scoring Engine**:
   - **pgvector Semantic Search**: 384-dimensional dense vectors indexed with **HNSW (Hierarchical Navigable Small World)** vector index using cosine distance (`<=>`).
   - **Structural N-Gram Overlap**: Tokenized 3-gram Jaccard overlap capturing structural syntactic similarity.
   - **Combined Metric**: Weighted similarity verdict ($60\%$ semantic + $40\%$ token-overlap).

2. **Advanced DBMS Capabilities (5 Demonstrated Features)**:
   - **Triggers (`AFTER INSERT OR UPDATE`)**: `trg_check_similarity_flag` automatically creates an entry in `plagiarism_cases` when the combined score crosses the configurable threshold.
   - **Atomic Transactions (`CALL transition_case_status(...)`)**: Status updates (`Flagged` → `Under Review` → `Resolved` / `Dismissed`), reviewer ID, resolved timestamp, and case note insertions execute in a single ACID transaction.
   - **Stored Procedures / Functions (`recompute_submission_similarity`)**: On-demand batch recalculation of vector cosine distance and n-gram overlap across all submissions for a problem.
   - **Indexing**:
     - Vector Index: `HNSW (embedding_vector vector_cosine_ops)`
     - Composite B-Tree: `(problem_id, submitted_at DESC)` and `(submission_id_a, submission_id_b)`
     - Full-Text Search: GIN index on `tsvector` generated columns.
   - **Full-Text Search (tsvector & tsquery)**: Natural language search across problem descriptions and case notes with relevance ranking (`ts_rank`) and query hit highlighting (`ts_headline`).

3. **Role-Based Access Control (RBAC)**:
   - **Student**: Browse problems, submit Python/C++ code, and view submission history.
   - **Moderator**: Access Flagged Cases dashboard, side-by-side explainability diff viewer, matched lines counter, and case note logger.
   - **Admin**: Configure plagiarism threshold in `system_settings`, view aggregate platform analytics, and monitor contest activity.

---

## 🚀 Running the Project

### 1. Database (PostgreSQL + pgvector)
Ensure Docker is installed and run:
```bash
docker compose up -d
```
The database runs on port `5432` with preloaded seed contests, problems, and student accounts.

### 2. Next.js Web Application
```bash
cd frontend
npm install
npm run dev # or npm run build && npm start
```
The web application is live at **http://localhost:3000**.

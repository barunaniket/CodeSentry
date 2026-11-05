import { Pool } from 'pg';

// Create a singleton connection pool to PostgreSQL (with pgvector)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://codesentry:codesentry_password@localhost:5432/codesentry_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/search?q=... - Demonstrates PostgreSQL Full-Text Search with tsvector & tsquery
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim() === '') {
      return NextResponse.json({ problems: [], caseNotes: [] });
    }

    // Convert plain search terms into tsquery format (e.g. 'linear:* & time:*')
    const terms = q.trim().split(/\s+/).map(t => `${t}:*`).join(' & ');

    // 1. Search Problems using GIN indexed tsv column
    const problemResults = await pool.query(
      `SELECT problem_id, contest_id, title, statement_text, difficulty,
              ts_rank(tsv, to_tsquery('english', $1)) as rank,
              ts_headline('english', statement_text, to_tsquery('english', $1), 'StartSel=<b>, StopSel=</b>') as headline
       FROM problems
       WHERE tsv @@ to_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT 10`,
      [terms]
    );

    // 2. Search Case Notes using GIN indexed tsv column
    const noteResults = await pool.query(
      `SELECT cn.note_id, cn.case_id, cn.note_text, cn.created_at,
              u.name as author_name,
              ts_rank(cn.tsv, to_tsquery('english', $1)) as rank,
              ts_headline('english', cn.note_text, to_tsquery('english', $1), 'StartSel=<b>, StopSel=</b>') as headline
       FROM case_notes cn
       JOIN users u ON cn.author_id = u.user_id
       WHERE cn.tsv @@ to_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT 10`,
      [terms]
    );

    return NextResponse.json({
      query: q,
      tsquery: terms,
      problems: problemResults.rows,
      caseNotes: noteResults.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

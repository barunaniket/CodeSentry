import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/cases - List all cases with reviewer & submission metadata
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = `
      SELECT pc.case_id, pc.submission_id_a, pc.submission_id_b, pc.combined_score, pc.status,
             pc.created_at, pc.resolved_at,
             reviewer.name as reviewer_name,
             p.title as problem_title, p.problem_id,
             c.title as contest_title, c.contest_id,
             u_a.name as student_a_name, u_a.email as student_a_email,
             u_b.name as student_b_name, u_b.email as student_b_email,
             ss.embedding_score, ss.ngram_score, ss.matched_lines_count
      FROM plagiarism_cases pc
      JOIN submissions s_a ON pc.submission_id_a = s_a.submission_id
      JOIN submissions s_b ON pc.submission_id_b = s_b.submission_id
      JOIN users u_a ON s_a.user_id = u_a.user_id
      JOIN users u_b ON s_b.user_id = u_b.user_id
      JOIN problems p ON s_a.problem_id = p.problem_id
      JOIN contests c ON p.contest_id = c.contest_id
      LEFT JOIN users reviewer ON pc.reviewed_by = reviewer.user_id
      LEFT JOIN similarity_scores ss ON (
        (ss.submission_id_a = pc.submission_id_a AND ss.submission_id_b = pc.submission_id_b) OR
        (ss.submission_id_a = pc.submission_id_b AND ss.submission_id_b = pc.submission_id_a)
      )
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND pc.status = $${params.length}`;
    }

    query += ` ORDER BY pc.created_at DESC`;
    const res = await pool.query(query, params);
    return NextResponse.json({ cases: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/cases - Transition status atomically using PostgreSQL Procedure
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { case_id, new_status, reviewer_id, note_text } = body;

    if (!case_id || !new_status || !reviewer_id) {
      return NextResponse.json({ error: 'Missing required case transition fields' }, { status: 400 });
    }

    // Call advanced database procedure: transition_case_status
    await pool.query(
      `CALL transition_case_status($1, $2, $3, $4)`,
      [case_id, new_status, reviewer_id, note_text || null]
    );

    return NextResponse.json({ success: true, message: `Case status transitioned to ${new_status}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

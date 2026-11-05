import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contest_id');

    let query = `
      SELECT p.*, c.title as contest_title,
             (SELECT COUNT(*) FROM submissions s WHERE s.problem_id = p.problem_id) as submission_count
      FROM problems p
      JOIN contests c ON p.contest_id = c.contest_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (contestId) {
      params.push(contestId);
      query += ` AND p.contest_id = $${params.length}`;
    }
    query += ` ORDER BY p.created_at ASC`;

    const res = await pool.query(query, params);
    return NextResponse.json({ problems: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

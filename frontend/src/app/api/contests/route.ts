import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT c.*, u.name as creator_name,
             (SELECT COUNT(*) FROM problems p WHERE p.contest_id = c.contest_id) as problem_count,
             (SELECT COUNT(*) FROM submissions s JOIN problems p ON s.problem_id = p.problem_id WHERE p.contest_id = c.contest_id) as submission_count
      FROM contests c
      JOIN users u ON c.created_by = u.user_id
      ORDER BY c.created_at DESC
    `);
    return NextResponse.json({ contests: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

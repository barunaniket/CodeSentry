import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/stats - Aggregate stats for Admin dashboard
export async function GET() {
  try {
    // 1. Total counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM submissions) as total_submissions,
        (SELECT COUNT(*) FROM plagiarism_cases) as total_cases,
        (SELECT COUNT(*) FROM plagiarism_cases WHERE status = 'FLAGGED') as flagged_cases,
        (SELECT COUNT(*) FROM plagiarism_cases WHERE status = 'UNDER_REVIEW') as reviewing_cases,
        (SELECT COUNT(*) FROM plagiarism_cases WHERE status = 'RESOLVED') as resolved_cases,
        (SELECT COUNT(*) FROM contests) as total_contests,
        (SELECT COUNT(*) FROM problems) as total_problems,
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') as total_students
    `);

    // 2. Submissions per contest
    const contestStats = await pool.query(`
      SELECT c.contest_id, c.title,
             COUNT(s.submission_id) as submission_count,
             COUNT(DISTINCT s.user_id) as participant_count
      FROM contests c
      LEFT JOIN problems p ON c.contest_id = p.contest_id
      LEFT JOIN submissions s ON p.problem_id = s.problem_id
      GROUP BY c.contest_id, c.title
      ORDER BY submission_count DESC
    `);

    // 3. Current threshold setting
    const thresholdRes = await pool.query(`
      SELECT value FROM system_settings WHERE key = 'plagiarism_threshold'
    `);

    return NextResponse.json({
      counts: counts.rows[0],
      contestStats: contestStats.rows,
      threshold: thresholdRes.rows[0]?.value || '0.70',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/stats/threshold - Update plagiarism threshold
export async function POST(request: Request) {
  try {
    const { threshold } = await request.json();
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0 || val > 1) {
      return NextResponse.json({ error: 'Threshold must be between 0.01 and 1.00' }, { status: 400 });
    }

    await pool.query(
      `UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = 'plagiarism_threshold'`,
      [val.toFixed(2)]
    );

    return NextResponse.json({ success: true, threshold: val.toFixed(2) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

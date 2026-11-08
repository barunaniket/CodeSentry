import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST /api/recompute - Runs stored procedure recompute_submission_similarity(submission_id)
export async function POST(request: Request) {
  try {
    const { submission_id } = await request.json();
    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT * FROM recompute_submission_similarity($1)`,
      [submission_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Recomputed similarity scores via database stored procedure',
      recomputed_scores: res.rows
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

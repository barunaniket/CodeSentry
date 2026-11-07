import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;

    // Fetch case metadata, problem details, and similarity scores
    const caseRes = await pool.query(
      `SELECT pc.case_id, pc.submission_id_a, pc.submission_id_b, pc.combined_score, pc.status,
              pc.created_at, pc.resolved_at,
              reviewer.name as reviewer_name, reviewer.user_id as reviewer_id,
              p.title as problem_title, p.statement_text as problem_statement, p.problem_id,
              c.title as contest_title,
              s_a.source_code as code_a, s_a.normalized_code as norm_code_a, s_a.language as lang_a, s_a.submitted_at as time_a,
              s_b.source_code as code_b, s_b.normalized_code as norm_code_b, s_b.language as lang_b, s_b.submitted_at as time_b,
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
       WHERE pc.case_id = $1`,
      [caseId]
    );

    if (caseRes.rows.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Fetch associated case notes
    const notesRes = await pool.query(
      `SELECT cn.note_id, cn.note_text, cn.created_at, u.name as author_name, u.role as author_role
       FROM case_notes cn
       JOIN users u ON cn.author_id = u.user_id
       WHERE cn.case_id = $1
       ORDER BY cn.created_at ASC`,
      [caseId]
    );

    return NextResponse.json({
      case: caseRes.rows[0],
      notes: notesRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const [role, setRole] = useState<'ADMIN' | 'MODERATOR' | 'STUDENT'>('MODERATOR');
  const [caseData, setCaseData] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');

  const reviewerId = '22222222-2222-2222-2222-222222222222'; // Alice Martin

  const loadCase = () => {
    fetch(`/api/cases/${caseId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.case) {
          setCaseData(data.case);
          setNotes(data.notes || []);
        }
      });
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  const handleStatusChange = async (newStatus: string) => {
    await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        case_id: caseId,
        new_status: newStatus,
        reviewer_id: reviewerId,
        note_text: noteText.trim() ? noteText : `Status updated to ${newStatus}`,
      }),
    });
    setNoteText('');
    loadCase();
  };

  const handleRecompute = async () => {
    if (!caseData?.submission_id_a) return;
    await fetch('/api/recompute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: caseData.submission_id_a }),
    });
    loadCase();
  };

  if (!caseData) return <div className="p-6">Loading case...</div>;

  const linesA = caseData.code_a.split('\n');
  const linesB = caseData.code_b.split('\n');

  return (
    <div>
      <Navbar currentRole={role} onRoleChange={setRole} />

      <div className="mb-4">
        <Link href="/cases" className="text-xs text-blue-600 hover:underline">
          &larr; Back to Cases
        </Link>
        <h2 className="text-lg font-bold mt-1">
          Case: {caseData.problem_title} (Status: <span className="font-mono">{caseData.status}</span>)
        </h2>
      </div>

      {/* Metrics Bar */}
      <div className="border p-3 rounded bg-gray-50 mb-6 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-500 block text-xs">pgvector Cosine:</span>
          <strong>{(parseFloat(caseData.embedding_score || '0') * 100).toFixed(1)}%</strong>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">N-gram Overlap:</span>
          <strong>{(parseFloat(caseData.ngram_score || '0') * 100).toFixed(1)}%</strong>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Matched Lines:</span>
          <strong>{caseData.matched_lines_count || 0}</strong>
        </div>
        <div>
          <span className="text-gray-500 block text-xs">Combined Score:</span>
          <strong className="text-red-600">{(parseFloat(caseData.combined_score) * 100).toFixed(1)}%</strong>
        </div>
        <div className="ml-auto">
          <button
            onClick={handleRecompute}
            className="border bg-white px-2 py-1 rounded text-xs hover:bg-gray-100"
          >
            Recompute via Stored Procedure
          </button>
        </div>
      </div>

      {/* Code Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border rounded p-3">
          <h3 className="font-semibold text-xs mb-2 text-gray-700">
            Submission A: {caseData.student_a_name} ({caseData.lang_a})
          </h3>
          <pre className="text-xs font-mono bg-gray-50 p-3 rounded border overflow-x-auto max-h-80">
            {linesA.map((line: string, i: number) => (
              <div key={i}>
                <span className="text-gray-400 select-none mr-2">{i + 1}</span>
                {line}
              </div>
            ))}
          </pre>
        </div>

        <div className="border rounded p-3">
          <h3 className="font-semibold text-xs mb-2 text-gray-700">
            Submission B: {caseData.student_b_name} ({caseData.lang_b})
          </h3>
          <pre className="text-xs font-mono bg-gray-50 p-3 rounded border overflow-x-auto max-h-80">
            {linesB.map((line: string, i: number) => (
              <div key={i}>
                <span className="text-gray-400 select-none mr-2">{i + 1}</span>
                {line}
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Review Actions & Transaction Procedure */}
      <div className="border p-4 rounded bg-gray-50 mb-6">
        <h3 className="font-bold text-sm mb-2">Reviewer Actions (Atomic Transaction Procedure)</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => handleStatusChange('UNDER_REVIEW')}
            className="border bg-yellow-100 border-yellow-300 px-3 py-1 text-xs rounded font-medium"
          >
            Set to UNDER_REVIEW
          </button>
          <button
            onClick={() => handleStatusChange('RESOLVED')}
            className="border bg-green-600 text-white px-3 py-1 text-xs rounded font-medium"
          >
            Confirm Plagiarism (RESOLVED)
          </button>
          <button
            onClick={() => handleStatusChange('DISMISSED')}
            className="border bg-gray-200 px-3 py-1 text-xs rounded font-medium"
          >
            DISMISS Case
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add case investigation note..."
            className="border border-gray-300 rounded p-1.5 text-xs flex-1 bg-white"
          />
          <button
            onClick={() => handleStatusChange(caseData.status)}
            disabled={!noteText.trim()}
            className="border bg-gray-800 text-white px-3 py-1.5 text-xs rounded disabled:opacity-50"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h4 className="font-bold text-xs uppercase text-gray-600 mb-2">Case Notes:</h4>
        {notes.length === 0 ? (
          <p className="text-xs text-gray-500">No notes recorded.</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {notes.map((n) => (
              <li key={n.note_id} className="border p-2 rounded bg-white">
                <span className="font-semibold">{n.author_name}: </span>
                {n.note_text}
                <span className="text-gray-400 block text-[10px] mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

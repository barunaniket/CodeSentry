'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function CasesPage() {
  const [role, setRole] = useState<'ADMIN' | 'MODERATOR' | 'STUDENT'>('MODERATOR');
  const [cases, setCases] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch(`/api/cases?status=${filter}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.cases) setCases(data.cases);
      });
  }, [filter]);

  return (
    <div>
      <Navbar currentRole={role} onRoleChange={setRole} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Plagiarism Cases</h2>

        <div className="flex items-center gap-2 text-sm">
          <label>Status Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded p-1 text-sm bg-white"
          >
            <option value="ALL">All</option>
            <option value="FLAGGED">FLAGGED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
        </div>
      </div>

      {cases.length === 0 ? (
        <p className="text-sm text-gray-500">No cases found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Problem</th>
              <th>Student A vs B</th>
              <th>Vector Cosine</th>
              <th>N-gram</th>
              <th>Combined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.case_id}>
                <td>
                  <span
                    className={`font-semibold text-xs ${
                      c.status === 'FLAGGED'
                        ? 'text-red-600'
                        : c.status === 'UNDER_REVIEW'
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td>{c.problem_title}</td>
                <td className="text-xs">
                  {c.student_a_name} vs {c.student_b_name}
                </td>
                <td>{c.embedding_score ? (parseFloat(c.embedding_score) * 100).toFixed(1) + '%' : '-'}</td>
                <td>{c.ngram_score ? (parseFloat(c.ngram_score) * 100).toFixed(1) + '%' : '-'}</td>
                <td className="font-bold">{(parseFloat(c.combined_score) * 100).toFixed(1)}%</td>
                <td>
                  <Link
                    href={`/cases/${c.case_id}`}
                    className="text-blue-600 hover:underline text-xs font-semibold"
                  >
                    View Diff & Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

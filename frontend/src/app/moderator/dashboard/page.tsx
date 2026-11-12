'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell, { PageLoader } from '@/components/DashboardShell';
import { useSession } from '@/hooks/useSession';
import Link from 'next/link';

export default function ModeratorDashboard() {
  const { user, loading, logout } = useSession('MODERATOR');
  const [cases, setCases] = useState<any[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/cases')
      .then((r) => r.json())
      .then((d) => { if (d.cases) setCases(d.cases); })
      .finally(() => setCasesLoading(false));
  }, [user]);

  if (loading || !user) return <PageLoader />;

  const statusColors: Record<string, string> = {
    FLAGGED: 'text-red-600 bg-red-50 border-red-200',
    UNDER_REVIEW: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    RESOLVED: 'text-green-700 bg-green-50 border-green-200',
    DISMISSED: 'text-gray-500 bg-gray-50 border-gray-200',
  };

  return (
    <DashboardShell user={user} onLogout={logout}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-[#172334]">Flagged Cases</h2>
        <span className="text-sm text-gray-500">{cases.length} case(s) found</span>
      </div>

      {casesLoading ? (
        <p className="text-sm text-gray-500">Loading cases…</p>
      ) : cases.length === 0 ? (
        <div className="border border-[#D9DEE5] rounded-lg p-8 text-center text-sm text-gray-500 bg-[#F8F9FA]">
          No plagiarism cases found. The system is clean.
        </div>
      ) : (
        <div className="border border-[#D9DEE5] rounded-lg overflow-hidden">
          <table className="text-sm">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Combined Score</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c: any) => (
                <tr key={c.case_id}>
                  <td className="font-mono text-xs">{c.case_id.slice(0, 8)}…</td>
                  <td className="font-bold">{(c.combined_score * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${statusColors[c.status] || ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      href={`/cases/${c.case_id}`}
                      className="text-xs text-[#1F2B3A] hover:underline font-medium"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}

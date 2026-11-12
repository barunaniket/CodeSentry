'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell, { PageLoader } from '@/components/DashboardShell';
import { useSession } from '@/hooks/useSession';

export default function AdminDashboard() {
  const { user, loading, logout } = useSession('ADMIN');
  const [stats, setStats] = useState<any>(null);
  const [threshold, setThreshold] = useState('0.70');
  const [saved, setSaved] = useState(false);

  const fetchStats = () => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        if (d.threshold) setThreshold(d.threshold);
      });
  };

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      fetchStats();
    }
  };

  if (loading || !user) return <PageLoader />;

  return (
    <DashboardShell user={user} onLogout={logout}>
      <h2 className="text-lg font-bold text-[#172334] mb-5">Admin Dashboard &amp; Settings</h2>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Submissions', value: stats.counts?.total_submissions || 0 },
            { label: 'Total Contests', value: stats.counts?.total_contests || 0 },
            { label: 'Flagged Cases', value: stats.counts?.total_cases || 0, red: true },
            { label: 'Students', value: stats.counts?.total_students || 0 },
          ].map((s) => (
            <div key={s.label} className="border border-[#D9DEE5] p-4 rounded-lg bg-[#F8F9FA]">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.red ? 'text-red-600' : 'text-[#172334]'}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Threshold */}
      <div className="border border-[#D9DEE5] p-5 rounded-lg bg-[#F8F9FA] mb-6">
        <h3 className="font-semibold text-sm text-[#172334] mb-1">Adjust Similarity Trigger Threshold</h3>
        <p className="text-xs text-gray-500 mb-3">
          PostgreSQL trigger checks this threshold in <code>system_settings</code>. Any submission pair with combined score ≥ threshold triggers auto-flagging.
        </p>
        <form onSubmit={handleSaveThreshold} className="flex items-center gap-3">
          <label className="text-xs font-medium text-[#172334]">Threshold (0.01 – 1.00):</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="1.0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="border border-[#D9DEE5] rounded-md p-1.5 text-sm w-24 bg-white focus:outline-none focus:border-[#1F2B3A]"
            required
          />
          <button
            type="submit"
            className="bg-[#1F2B3A] hover:bg-[#172334] text-white text-xs px-3 py-1.5 rounded-md transition-colors"
          >
            Update in DB
          </button>
          {saved && <span className="text-green-600 text-xs font-semibold">✓ Updated!</span>}
        </form>
      </div>

      {/* Contest Breakdown */}
      <div>
        <h3 className="font-semibold text-sm text-[#172334] mb-3">Contest Submissions Breakdown</h3>
        {stats?.contestStats?.length > 0 ? (
          <div className="border border-[#D9DEE5] rounded-lg overflow-hidden">
            <table className="text-sm">
              <thead>
                <tr><th>Contest Title</th><th>Submissions</th><th>Participants</th></tr>
              </thead>
              <tbody>
                {stats.contestStats.map((c: any) => (
                  <tr key={c.contest_id}>
                    <td>{c.title}</td>
                    <td className="font-bold">{c.submission_count}</td>
                    <td>{c.participant_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No contest data yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}

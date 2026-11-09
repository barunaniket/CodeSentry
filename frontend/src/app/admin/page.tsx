'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function AdminPage() {
  const [role, setRole] = useState<'ADMIN' | 'MODERATOR' | 'STUDENT'>('ADMIN');
  const [stats, setStats] = useState<any>(null);
  const [threshold, setThreshold] = useState('0.70');
  const [saved, setSaved] = useState(false);

  const fetchStats = () => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        if (data.threshold) setThreshold(data.threshold);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

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

  return (
    <div>
      <Navbar currentRole={role} onRoleChange={setRole} />

      <h2 className="text-lg font-bold mb-4">Admin Dashboard & Settings</h2>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Total Submissions</div>
            <div className="text-xl font-bold">{stats.counts?.total_submissions || 0}</div>
          </div>
          <div className="border p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Total Contests</div>
            <div className="text-xl font-bold">{stats.counts?.total_contests || 0}</div>
          </div>
          <div className="border p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Flagged Cases</div>
            <div className="text-xl font-bold text-red-600">{stats.counts?.total_cases || 0}</div>
          </div>
          <div className="border p-3 rounded bg-gray-50">
            <div className="text-xs text-gray-500">Students</div>
            <div className="text-xl font-bold">{stats.counts?.total_students || 0}</div>
          </div>
        </div>
      )}

      {/* Threshold Setting */}
      <div className="border p-4 rounded bg-gray-50 mb-6">
        <h3 className="font-bold text-sm mb-2">Adjust Similarity Trigger Threshold</h3>
        <p className="text-xs text-gray-600 mb-3">
          PostgreSQL trigger checks this threshold in <code>system_settings</code>. Any submission pair combined score &ge; threshold triggers auto-flagging.
        </p>
        <form onSubmit={handleSaveThreshold} className="flex items-center gap-3">
          <label className="text-xs font-medium">Threshold (0.01 - 1.00):</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="1.0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="border rounded p-1 text-sm w-24 bg-white"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded"
          >
            Update in DB
          </button>
          {saved && <span className="text-green-600 text-xs font-semibold">Updated!</span>}
        </form>
      </div>

      {/* Contest Activity Table */}
      <div>
        <h3 className="font-bold text-sm mb-2">Contest Submissions Breakdown</h3>
        {stats?.contestStats && (
          <table>
            <thead>
              <tr>
                <th>Contest Title</th>
                <th>Submissions</th>
                <th>Participants</th>
              </tr>
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
        )}
      </div>
    </div>
  );
}

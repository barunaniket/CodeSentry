'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function SearchPage() {
  const [role, setRole] = useState<'ADMIN' | 'MODERATOR' | 'STUDENT'>('MODERATOR');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar currentRole={role} onRoleChange={setRole} />

      <h2 className="text-lg font-bold mb-3">PostgreSQL Full-Text Search (tsvector & tsquery)</h2>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems or case notes (e.g. 'linear time', 'hash table')..."
          className="border border-gray-300 rounded p-2 text-sm flex-1 bg-white"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-sm mb-2">Problem Statements ({results.problems?.length || 0})</h3>
            {results.problems?.length === 0 ? (
              <p className="text-xs text-gray-500">No problems found.</p>
            ) : (
              <div className="space-y-2">
                {results.problems.map((p: any) => (
                  <div key={p.problem_id} className="border p-3 rounded bg-gray-50 text-xs">
                    <div className="font-bold mb-1">{p.title} (Rank: {parseFloat(p.rank).toFixed(4)})</div>
                    <div
                      dangerouslySetInnerHTML={{ __html: p.headline }}
                      className="text-gray-700 [&>b]:text-blue-700 [&>b]:font-bold"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-sm mb-2">Case Notes ({results.caseNotes?.length || 0})</h3>
            {results.caseNotes?.length === 0 ? (
              <p className="text-xs text-gray-500">No notes found.</p>
            ) : (
              <div className="space-y-2">
                {results.caseNotes.map((n: any) => (
                  <div key={n.note_id} className="border p-3 rounded bg-gray-50 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold">Author: {n.author_name}</span>
                      <Link href={`/cases/${n.case_id}`} className="text-blue-600 hover:underline">
                        View Case
                      </Link>
                    </div>
                    <div
                      dangerouslySetInnerHTML={{ __html: n.headline }}
                      className="text-gray-700 [&>b]:text-blue-700 [&>b]:font-bold"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

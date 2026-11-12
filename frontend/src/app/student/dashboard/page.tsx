'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell, { PageLoader } from '@/components/DashboardShell';
import { useSession } from '@/hooks/useSession';

interface Problem {
  problem_id: string;
  title: string;
  statement_text: string;
  difficulty: string;
}

export default function StudentDashboard() {
  const { user, loading, logout } = useSession('STUDENT');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [language, setLanguage] = useState<'python' | 'cpp'>('python');
  const [sourceCode, setSourceCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/problems')
      .then((r) => r.json())
      .then((d) => {
        if (d.problems?.length) {
          setProblems(d.problems);
          setSelectedProblemId(d.problems[0].problem_id);
        }
      });
    loadSubmissions();
  }, [user]);

  const loadSubmissions = () => {
    fetch('/api/submissions')
      .then((r) => r.json())
      .then((d) => { if (d.submissions) setSubmissions(d.submissions); });
  };

  const handlePreset = (type: 'overlap' | 'unique') => {
    if (type === 'overlap') {
      setSourceCode(`# Hash table solution\ndef twoSum(nums, target):\n    lookup = {}\n    for idx, num in enumerate(nums):\n        complement = target - num\n        if complement in lookup:\n            return [lookup[complement], idx]\n        lookup[num] = idx\n    return []`);
    } else {
      setSourceCode(`# Brute force solution\ndef twoSum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblemId || !sourceCode.trim() || !user) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: selectedProblemId,
          user_id: user.user_id,
          language,
          source_code: sourceCode,
        }),
      });
      const data = await res.json();
      setResult(data);
      loadSubmissions();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return <PageLoader />;

  const activeProblem = problems.find((p) => p.problem_id === selectedProblemId);

  return (
    <DashboardShell user={user} onLogout={logout}>
      <h2 className="text-lg font-bold text-[#172334] mb-4">Submit Code</h2>

      <form onSubmit={handleSubmit} className="border border-[#D9DEE5] p-5 rounded-lg bg-[#F8F9FA] mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#172334] mb-1.5">Problem</label>
            <select
              value={selectedProblemId}
              onChange={(e) => setSelectedProblemId(e.target.value)}
              className="w-full border border-[#D9DEE5] rounded-md p-2 text-sm bg-white text-[#172334] focus:outline-none focus:border-[#1F2B3A]"
            >
              {problems.map((p) => (
                <option key={p.problem_id} value={p.problem_id}>
                  {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#172334] mb-1.5">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full border border-[#D9DEE5] rounded-md p-2 text-sm bg-white text-[#172334] focus:outline-none focus:border-[#1F2B3A]"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>

        {activeProblem && (
          <div className="text-xs text-gray-600 bg-white p-3 border border-[#D9DEE5] rounded-md">
            <strong>Statement:</strong> {activeProblem.statement_text}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-[#172334]">Source Code</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => handlePreset('overlap')}
                className="text-xs bg-white hover:bg-gray-100 px-2 py-1 rounded border border-[#D9DEE5] text-gray-600">
                Load Sample Overlap
              </button>
              <button type="button" onClick={() => handlePreset('unique')}
                className="text-xs bg-white hover:bg-gray-100 px-2 py-1 rounded border border-[#D9DEE5] text-gray-600">
                Load Sample Unique
              </button>
            </div>
          </div>
          <textarea
            rows={9}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Paste or write your code here..."
            className="w-full border border-[#D9DEE5] rounded-md p-3 text-xs font-mono bg-white focus:outline-none focus:border-[#1F2B3A]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !sourceCode.trim()}
          className="bg-[#1F2B3A] hover:bg-[#172334] disabled:opacity-50 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {submitting ? 'Processing…' : 'Submit & Check Plagiarism'}
        </button>
      </form>

      {result && (
        <div className="border border-[#D9DEE5] p-5 rounded-lg mb-6 bg-white">
          <h3 className="font-semibold text-[#172334] text-sm mb-2">Submission Result</h3>
          <p className="text-xs text-gray-500 mb-3">
            ID: <code className="bg-[#F8F9FA] px-1 rounded">{result.submission_id}</code>
          </p>
          {result.flagged_cases?.length > 0 && (
            <div className="p-2.5 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md font-medium">
              ⚠ Trigger Activated — High similarity detected! A Flagged Case was automatically created.
            </div>
          )}
          {result.scored_pairs?.length > 0 ? (
            <table className="text-xs">
              <thead>
                <tr>
                  <th>Compared ID</th>
                  <th>pgvector Cosine</th>
                  <th>N-gram Overlap</th>
                  <th>Combined Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.scored_pairs.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className="font-mono">{p.compared_submission_id.slice(0, 8)}…</td>
                    <td>{(p.embedding_score * 100).toFixed(1)}%</td>
                    <td>{(p.ngram_score * 100).toFixed(1)}%</td>
                    <td className="font-bold">{(p.combined_score * 100).toFixed(1)}%</td>
                    <td>
                      {p.combined_score >= 0.7 ? (
                        <span className="text-red-600 font-bold">FLAGGED</span>
                      ) : (
                        <span className="text-green-600">PASSED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-500">First submission for this problem — no prior submissions to compare.</p>
          )}
        </div>
      )}

      <div>
        <h3 className="text-base font-semibold text-[#172334] mb-3">My Recent Submissions</h3>
        {submissions.length === 0 ? (
          <p className="text-sm text-gray-500">No submissions found.</p>
        ) : (
          <table className="text-sm">
            <thead>
              <tr><th>Time</th><th>User</th><th>Problem</th><th>Language</th></tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.submission_id}>
                  <td className="text-xs text-gray-500">
                    {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>{sub.user_name}</td>
                  <td>{sub.problem_title}</td>
                  <td className="font-mono text-xs uppercase">{sub.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardShell>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

interface Problem {
  problem_id: string;
  contest_id: string;
  title: string;
  statement_text: string;
  difficulty: string;
  time_limit_ms: number;
}

export default function HomePage() {
  const [role, setRole] = useState<'ADMIN' | 'MODERATOR' | 'STUDENT'>('STUDENT');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string>('');
  const [language, setLanguage] = useState<'python' | 'cpp'>('python');
  const [sourceCode, setSourceCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const users = {
    STUDENT: '33333333-3333-3333-3333-333333333333',
    MODERATOR: '22222222-2222-2222-2222-222222222222',
    ADMIN: '11111111-1111-1111-1111-111111111111',
  };

  useEffect(() => {
    fetch('/api/problems')
      .then((res) => res.json())
      .then((data) => {
        if (data.problems) {
          setProblems(data.problems);
          if (data.problems.length > 0) setSelectedProblemId(data.problems[0].problem_id);
        }
      });
    loadSubmissions();
  }, []);

  const loadSubmissions = () => {
    fetch('/api/submissions')
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions) setSubmissions(data.submissions);
      });
  };

  const handlePreset = (type: 'plagiarized' | 'original') => {
    if (type === 'plagiarized') {
      setSourceCode(
`# Hash table solution
def twoSum(nums, target):
    lookup = {}
    for idx, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], idx]
        lookup[num] = idx
    return []`
      );
    } else {
      setSourceCode(
`# Brute force solution
def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblemId || !sourceCode.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: selectedProblemId,
          user_id: users[role],
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
      setLoading(false);
    }
  };

  const activeProblem = problems.find((p) => p.problem_id === selectedProblemId);

  return (
    <div>
      <Navbar currentRole={role} onRoleChange={setRole} />

      <h2 className="text-lg font-bold mb-3">1. Submit Code</h2>

      <form onSubmit={handleSubmit} className="border p-4 rounded bg-gray-50 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Problem:</label>
            <select
              value={selectedProblemId}
              onChange={(e) => setSelectedProblemId(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
            >
              {problems.map((p) => (
                <option key={p.problem_id} value={p.problem_id}>
                  {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>

        {activeProblem && (
          <div className="text-xs text-gray-600 bg-white p-2 border rounded">
            <strong>Statement:</strong> {activeProblem.statement_text}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Source Code:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePreset('plagiarized')}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded border"
              >
                Load Sample Overlap Code
              </button>
              <button
                type="button"
                onClick={() => handlePreset('original')}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-0.5 rounded border"
              >
                Load Sample Unique Code
              </button>
            </div>
          </div>
          <textarea
            rows={9}
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Paste or write your code here..."
            className="w-full border border-gray-300 rounded p-2 text-xs font-mono"
            required
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || !sourceCode.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
          >
            {loading ? 'Processing...' : 'Submit & Check Plagiarism'}
          </button>
        </div>
      </form>

      {/* Result Display */}
      {result && (
        <div className="border p-4 rounded mb-6 bg-white">
          <h3 className="font-bold text-sm mb-2">Submission Result</h3>
          <p className="text-xs text-gray-600 mb-2">
            Submission ID: <code className="bg-gray-100 p-0.5">{result.submission_id}</code>
          </p>

          {result.flagged_cases && result.flagged_cases.length > 0 && (
            <div className="p-2 mb-3 bg-red-100 border border-red-300 text-red-800 text-xs rounded font-medium">
              [TRIGGER ACTIVATED] High similarity detected! Database trigger automatically created a Flagged Case.
            </div>
          )}

          <div className="text-xs mb-2">
            Compared with {result.scores_computed} prior submission(s):
          </div>

          {result.scored_pairs && result.scored_pairs.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Compared ID</th>
                  <th>pgvector Cosine</th>
                  <th>N-gram Overlap</th>
                  <th>Combined Score</th>
                  <th>Flag Status</th>
                </tr>
              </thead>
              <tbody>
                {result.scored_pairs.map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td className="font-mono">{p.compared_submission_id.slice(0, 8)}...</td>
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
            <p className="text-xs text-gray-500">First submission for this problem; no previous submissions to compare.</p>
          )}
        </div>
      )}

      {/* Submissions List */}
      <div>
        <h3 className="text-base font-bold mb-2">Recent Submissions</h3>
        {submissions.length === 0 ? (
          <p className="text-xs text-gray-500">No submissions found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Problem</th>
                <th>Language</th>
              </tr>
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
    </div>
  );
}

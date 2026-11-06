'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar({
  currentRole,
  onRoleChange,
}: {
  currentRole: 'ADMIN' | 'MODERATOR' | 'STUDENT';
  onRoleChange: (role: 'ADMIN' | 'MODERATOR' | 'STUDENT') => void;
}) {
  const pathname = usePathname();

  const links = [
    { label: 'Submit Code', href: '/' },
    { label: 'Flagged Cases', href: '/cases' },
    { label: 'Admin Settings', href: '/admin' },
    { label: 'Full-Text Search', href: '/search' },
  ];

  return (
    <div className="border-b pb-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">CodeSentry</h1>
          <p className="text-xs text-gray-500">DBMS Mini Project: Vector & Plagiarism Detection</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Role:</label>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as any)}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          >
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderator</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>
      </div>

      <nav className="flex gap-4 mt-4 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1 rounded border ${
              pathname === link.href ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

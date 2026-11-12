'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { SessionUser } from '@/lib/session';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  STUDENT: 'Student',
};

const ROLE_NAV: Record<string, { label: string; href: string }[]> = {
  STUDENT: [
    { label: 'Submit Code', href: '/student/dashboard' },
    { label: 'Full-Text Search', href: '/search' },
  ],
  MODERATOR: [
    { label: 'Submit Code', href: '/' },
    { label: 'Flagged Cases', href: '/cases' },
    { label: 'Full-Text Search', href: '/search' },
  ],
  ADMIN: [
    { label: 'Submit Code', href: '/' },
    { label: 'Flagged Cases', href: '/cases' },
    { label: 'Admin Settings', href: '/admin' },
    { label: 'Full-Text Search', href: '/search' },
  ],
};

interface DashboardShellProps {
  user: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function DashboardShell({ user, onLogout, children }: DashboardShellProps) {
  const pathname = usePathname();
  const links = ROLE_NAV[user.role] || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <div className="border-b border-[#D9DEE5] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#1F2B3A]" strokeWidth={2} />
              <div>
                <h1 className="text-lg font-bold text-[#172334] leading-tight">CodeSentry</h1>
                <p className="text-xs text-gray-500">DBMS Mini Project: Vector &amp; Plagiarism Detection</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[#172334]">{user.name}</p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[#F8F9FA] border border-[#D9DEE5] text-[#1F2B3A]">
                {ROLE_LABELS[user.role]}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F2B3A] border border-[#D9DEE5] rounded px-2.5 py-1.5 hover:bg-[#F8F9FA] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex gap-2 mt-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                  pathname === link.href
                    ? 'bg-[#1F2B3A] text-white border-[#1F2B3A]'
                    : 'bg-[#F8F9FA] text-gray-600 border-[#D9DEE5] hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

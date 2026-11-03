-- CodeSentry Seed Data
-- Users: Admin, Moderator, Students

INSERT INTO users (user_id, name, email, password_hash, role) VALUES
('11111111-1111-1111-1111-111111111111', 'System Administrator', 'admin@codesentry.org', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890dummyhashadmin', 'ADMIN'),
('22222222-2222-2222-2222-222222222222', 'Prof. Alice Martin', 'alice@contest.edu', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890dummyhashalice', 'MODERATOR'),
('33333333-3333-3333-3333-333333333333', 'Bob Smith (Student)', 'bob@student.edu', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890dummyhashbob', 'STUDENT'),
('44444444-4444-4444-4444-444444444444', 'Charlie Davis (Student)', 'charlie@student.edu', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890dummyhashcharlie', 'STUDENT'),
('55555555-5555-5555-5555-555555555555', 'Diana Evans (Student)', 'diana@student.edu', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890dummyhashdiana', 'STUDENT')
ON CONFLICT (email) DO NOTHING;

-- Contests
INSERT INTO contests (contest_id, title, description, start_time, end_time, created_by) VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'Winter Algorithms Cup 2026', 'Annual departmental competitive programming contest focusing on dynamic programming and graph theory.', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', '22222222-2222-2222-2222-222222222222'),
('aaaa2222-aaaa-2222-aaaa-222222222222', 'Freshman Sprint Round 1', 'Introductory algorithmic challenges for CS undergraduates.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (contest_id) DO NOTHING;

-- Problems
INSERT INTO problems (problem_id, contest_id, title, statement_text, difficulty, time_limit_ms) VALUES
('bbbb1111-bbbb-1111-bbbb-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'Two Sum Optimization', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input would have exactly one solution, and you may not use the same element twice. Optimize for O(N) time complexity using a hash table or dictionary.', 'EASY', 1000),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'Longest Palindromic Substring', 'Given a string s, return the longest palindromic substring in s. A palindrome is a string that reads the same forward and backward. Implement an algorithm with optimal dynamic programming or center expansion with O(N^2) or Manacher O(N) complexity.', 'MEDIUM', 2000),
('bbbb3333-bbbb-3333-bbbb-333333333333', 'aaaa2222-aaaa-2222-aaaa-222222222222', 'Maximum Subarray (Kadane)', 'Given an integer array nums, find the subarray with the largest sum, and return its sum. Must run in O(n) linear time complexity.', 'EASY', 1000)
ON CONFLICT (problem_id) DO NOTHING;


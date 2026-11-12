import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { sessionOptions, AppSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const allowedRoles = ['STUDENT', 'MODERATOR', 'ADMIN'];
    const userRole = allowedRoles.includes(role) ? role : 'STUDENT';

    // Check duplicate email
    const existing = await query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role',
      [name.trim(), email.toLowerCase().trim(), password_hash, userRole]
    );

    const user = result.rows[0];

    const res = NextResponse.json({ success: true, user });
    const session = await getIronSession<AppSession>(req, res, sessionOptions);
    session.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    await session.save();

    return res;
  } catch (err) {
    console.error('[Register] Error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

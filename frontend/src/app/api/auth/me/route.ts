import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const res = NextResponse.json({});
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: session.user }, { status: 200 });
}

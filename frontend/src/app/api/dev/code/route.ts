// GET /api/dev/code?email=... — DEV ONLY
// Returns the most recent pending EMAIL_VERIFY code for a given email.
// Automatically 404s in production (NODE_ENV !== 'development').
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  const codeRow = await prisma.verificationCode.findFirst({
    where: { userId: user.id, type: 'EMAIL_VERIFY', usedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { code: true, expiresAt: true },
  });
  if (!codeRow) {
    return NextResponse.json({ error: 'NO_PENDING_CODE' }, { status: 404 });
  }

  return NextResponse.json({
    code: codeRow.code,
    expiresAt: codeRow.expiresAt.toISOString(),
  });
}

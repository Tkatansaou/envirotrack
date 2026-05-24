export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { prisma } from '@/lib/server/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';

// POST /api/projects/[id]/activate
// Called from the payment success page after order is PAID.
// Checks the linked order status and transitions project DRAFT → ACTIVE.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const csrfFail = verifyCsrf(req);
    if (csrfFail) return csrfFail;

    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (!project.orgId) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: project.orgId, userId: auth.user.sub },
      },
    });
    if (!membership) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    if (project.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'ALREADY_ACTIVE', message: 'Project is not in DRAFT status' },
        { status: 409, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    if (!project.orderId) {
      return NextResponse.json(
        { error: 'NO_ORDER', message: 'No payment order linked to this project' },
        { status: 400, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const order = await prisma.order.findUnique({ where: { id: project.orderId } });
    if (!order || order.status !== 'PAID') {
      return NextResponse.json(
        { error: 'ORDER_NOT_PAID', message: 'Payment not confirmed yet' },
        { status: 402, headers: { 'x-request-id': ctx.requestId } },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: { email: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: { status: 'ACTIVE' } });

      await enqueueOutbox(tx, {
        kind: 'notification.project_activated',
        payload: { userId: auth.user.sub, projectId: id, projectName: project.name },
      });

      if (user) {
        await enqueueOutbox(tx, {
          kind: 'email.project_activated',
          payload: {
            to: user.email,
            projectId: id,
            projectName: project.name,
            projectType: project.type,
          },
        });
      }
    });

    return NextResponse.json(
      { ok: true, status: 'ACTIVE' },
      { status: 200, headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

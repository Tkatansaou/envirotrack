// GET /api/admin/stats — KPIs plateforme (ADMIN+)
export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/middleware';
import { prisma } from '@/lib/server/prisma';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAdmin('ADMIN');
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfPrev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsers7d,
      newUsers30d,
      newUsersPrev30d,
      verifiedUsers,
      activeUsers,

      totalProjects,
      activeProjects,
      projectsByType,

      totalOrders,
      paidOrders30d,
      revenuePaid30d,
      revenueTotal,

      totalCreditsIssued,
      totalCreditsConsumed,

      feedbackNew,
      feedbackTotal,
      feedbackByCategory,
      feedbackAvgRating,

      recentUsers,
      recentOrders,
      recentFeedback,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { createdAt: { gte: startOf7Days } } }),
      prisma.user.count({ where: { createdAt: { gte: startOf30Days } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfPrev30, lt: startOf30Days } } }),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),

      prisma.project.count(),
      prisma.project.count({
        where: { status: { in: ['ACTIVE', 'PGES_TRACKING', 'EIES_SUBMITTED'] } },
      }),
      prisma.project.groupBy({ by: ['type'], _count: { _all: true } }),

      prisma.order.count(),
      prisma.order.count({ where: { status: 'PAID', paidAt: { gte: startOf30Days } } }),
      prisma.order.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOf30Days } },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),

      prisma.creditTransaction.aggregate({
        where: { type: 'CREDIT' },
        _sum: { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: 'DEBIT' },
        _sum: { amount: true },
      }),

      prisma.feedback.count({ where: { status: 'NEW' } }),
      prisma.feedback.count(),
      prisma.feedback.groupBy({ by: ['category'], _count: { _all: true } }),
      prisma.feedback.aggregate({ where: { rating: { not: null } }, _avg: { rating: true } }),

      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, createdAt: true, emailVerifiedAt: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerEmail: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.feedback.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          rating: true,
          status: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    const userGrowthPct =
      newUsersPrev30d === 0
        ? null
        : Math.round(((newUsers30d - newUsersPrev30d) / newUsersPrev30d) * 100);

    return NextResponse.json(
      {
        users: {
          total: totalUsers,
          today: newUsersToday,
          last7d: newUsers7d,
          last30d: newUsers30d,
          growthPct: userGrowthPct,
          verified: verifiedUsers,
          active: activeUsers,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          byType: Object.fromEntries(projectsByType.map((r) => [r.type ?? 'AUTRE', r._count._all])),
        },
        revenue: {
          total: revenueTotal._sum.amount ?? 0,
          last30d: revenuePaid30d._sum.amount ?? 0,
          paidOrders30d,
          totalOrders,
        },
        credits: {
          issued: totalCreditsIssued._sum.amount ?? 0,
          consumed: totalCreditsConsumed._sum.amount ?? 0,
        },
        feedback: {
          total: feedbackTotal,
          pending: feedbackNew,
          byCategory: Object.fromEntries(
            feedbackByCategory.map((r) => [r.category, r._count._all]),
          ),
          avgRating: feedbackAvgRating._avg.rating
            ? Math.round((feedbackAvgRating._avg.rating ?? 0) * 10) / 10
            : null,
        },
        recent: {
          users: recentUsers,
          orders: recentOrders,
          feedback: recentFeedback,
        },
      },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

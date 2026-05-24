export const runtime = 'nodejs';

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';

// Returns regulatory texts matching the project type, formatted as checklist
// suggestions the frontend can preview and accept.
// applicableTypes = [] in the DB means the regulation is national (applies to all).

const bodySchema = z.object({
  projectType: z.enum(['ROUTE', 'BATIMENT', 'MINE', 'ENERGIE', 'AGRICULTURE', 'AUTRE']),
  region: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export interface EnrichSuggestion {
  regulatoryTextId: string;
  source: string;
  title: string;
  url: string;
  type: string;
  suggestedCode: string;
  suggestedArticle: string;
  suggestedCategory: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { projectType, limit } = parsed.data;

    const texts = await prisma.regulatoryText.findMany({
      where: {
        OR: [{ applicableTypes: { has: projectType } }, { applicableTypes: { isEmpty: true } }],
      },
      select: { id: true, source: true, title: true, url: true, type: true },
      orderBy: { scrapedAt: 'desc' },
      take: limit,
    });

    const suggestions: EnrichSuggestion[] = texts.map((t) => ({
      regulatoryTextId: t.id,
      source: t.source,
      title: t.title,
      url: t.url,
      type: t.type,
      suggestedCode: deriveCode(t.type, t.title),
      suggestedArticle: t.title.slice(0, 120),
      suggestedCategory: deriveCategory(t.type),
    }));

    return NextResponse.json(
      { suggestions, total: suggestions.length },
      { headers: { 'x-request-id': ctx.requestId } },
    );
  });
}

function deriveCode(type: string, title: string): string {
  const match = /(\d{4})[^\d]*(\d+)/.exec(title);
  const suffix = match ? `${match[1]}-${match[2]}` : 'EXTERN';
  return `${type.slice(0, 3)}-${suffix}`;
}

function deriveCategory(type: string): string {
  switch (type) {
    case 'LOI':
    case 'DECRET':
    case 'ARRETE':
      return 'ADMINISTRATIF';
    case 'NORME':
    case 'GUIDE':
      return 'EIES';
    case 'RAPPORT':
      return 'PGES';
    default:
      return 'ADMINISTRATIF';
  }
}

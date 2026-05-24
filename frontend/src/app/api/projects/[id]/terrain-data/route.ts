export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { fetchClimateData, type ClimateData } from '@/lib/server/terrain/climate';
import { fetchBiodiversityData, type BiodiversityData } from '@/lib/server/terrain/biodiversity';
import { fetchSocioeconomicData, type SocioeconomicData } from '@/lib/server/terrain/socioeconomic';
import { fetchGeologyData, type GeologyData } from '@/lib/server/terrain/geology';

export interface TerrainDataResponse {
  coords: { lat: number; lon: number } | null;
  climate: ClimateData | null;
  biodiversity: BiodiversityData | null;
  socioeconomic: SocioeconomicData | null;
  geology: GeologyData | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      select: { orgId: true, latitude: true, longitude: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
    }
    if (!project.orgId) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
    }

    // Verify caller is an org member
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: project.orgId, userId: auth.user.sub },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 });
    }

    const lat = project.latitude;
    const lon = project.longitude;

    if (lat == null || lon == null) {
      return NextResponse.json(
        { coords: null, climate: null, biodiversity: null, socioeconomic: null, geology: null },
        { headers: { 'x-request-id': ctx.requestId } },
      );
    }

    // Abort all fetches together if the request is cancelled
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const [climate, biodiversity, socioeconomic, geology] = await Promise.allSettled([
        fetchClimateData(lat, lon, controller.signal),
        fetchBiodiversityData(lat, lon, controller.signal),
        fetchSocioeconomicData(controller.signal),
        fetchGeologyData(lat, lon, controller.signal),
      ]);

      const response: TerrainDataResponse = {
        coords: { lat, lon },
        climate: climate.status === 'fulfilled' ? climate.value : null,
        biodiversity: biodiversity.status === 'fulfilled' ? biodiversity.value : null,
        socioeconomic: socioeconomic.status === 'fulfilled' ? socioeconomic.value : null,
        geology: geology.status === 'fulfilled' ? geology.value : null,
      };

      return NextResponse.json(response, {
        headers: { 'x-request-id': ctx.requestId },
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}

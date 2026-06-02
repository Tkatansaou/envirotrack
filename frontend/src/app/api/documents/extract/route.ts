export const runtime = 'nodejs';
export const maxDuration = 30;

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyCsrf } from '@/lib/server/auth';
import { requireAuth } from '@/lib/server/middleware';
import { makeRequestContext, withRequestContext } from '@/lib/server/observability/request-context';
import { extractFromDocument } from '@/lib/server/documents/extract';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfFail = verifyCsrf(req);
  if (csrfFail) return csrfFail;

  const ctx = makeRequestContext(req.headers);
  return withRequestContext(ctx, async () => {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'EXTRACTION_NOT_CONFIGURED',
          message: 'ANTHROPIC_API_KEY manquant dans .env.local',
        },
        { status: 503 },
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'INVALID_FORM_DATA' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'MISSING_FILE' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'UNSUPPORTED_FILE_TYPE', allowed: [...ALLOWED_MIME] },
        { status: 415 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', maxMb: MAX_BYTES / 1024 / 1024 },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const fields = await extractFromDocument(buffer, file.type, file.name);
      return NextResponse.json({ fields }, { headers: { 'x-request-id': ctx.requestId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'ANTHROPIC_API_KEY_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'EXTRACTION_NOT_CONFIGURED' }, { status: 503 });
      }
      return NextResponse.json(
        { error: 'EXTRACTION_FAILED', detail: msg },
        { status: 502, headers: { 'x-request-id': ctx.requestId } },
      );
    }
  });
}

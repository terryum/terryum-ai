import { NextRequest, NextResponse } from 'next/server';
import { getGroupFromRequest } from '@/lib/group-auth';
import { isAdminFromRequest } from '@/lib/identity';
import { isSupabaseAdminConfigured, getSupabaseAdmin } from '@/lib/supabase';

const BUCKET = 'private-covers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Auth check: must be group member or admin
  const group = getGroupFromRequest(request);
  const admin = isAdminFromRequest(request);
  if (!group && !admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  // Determine image variant from query param
  const variant = request.nextUrl.searchParams.get('variant') || 'cover.webp';
  const allowedVariants = ['cover.webp', 'cover-thumb.webp', 'og.png'];
  const safeVariant = allowedVariants.includes(variant) ? variant : 'cover.webp';

  const filePath = `${slug}/${safeVariant}`;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage.from(BUCKET).download(filePath);

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const contentType = safeVariant.endsWith('.png') ? 'image/png' : 'image/webp';
  const buffer = Buffer.from(await data.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

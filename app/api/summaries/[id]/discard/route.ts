import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const coreUrl = process.env.VIVEBIEN_CORE_URL;
  if (!coreUrl) {
    return NextResponse.json({ error: 'VIVEBIEN_CORE_URL not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${coreUrl}/api/nightly/${params.id}/discard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

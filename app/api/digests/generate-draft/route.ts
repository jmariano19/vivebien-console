import { NextRequest, NextResponse } from 'next/server';

const CORE_API = process.env.VIVEBIEN_API_URL || 'https://carelog.vivebien.io';

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${CORE_API}/api/digests/${userId}/generate-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

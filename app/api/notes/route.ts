import { NextRequest, NextResponse } from 'next/server';
import { addOperatorNote } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, note, createdBy, tags } = body;

    if (!userId || !note || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, note, createdBy' },
        { status: 400 }
      );
    }

    const result = await addOperatorNote(userId, note, createdBy, tags);
    
    return NextResponse.json({ success: true, note: result });
  } catch (error: any) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

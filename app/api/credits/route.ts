import { NextRequest, NextResponse } from 'next/server';
import { addCredits } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, description } = body;

    if (!userId || typeof amount !== 'number' || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, amount, description' },
        { status: 400 }
      );
    }

    const result = await addCredits(userId, amount, description);
    
    if (result.success) {
      return NextResponse.json({ success: true, newBalance: result.newBalance });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

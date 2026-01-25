import { NextRequest, NextResponse } from 'next/server';
import { updateRoutineStatus } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { routineId, status } = body;

    if (!routineId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: routineId, status' },
        { status: 400 }
      );
    }

    const validStatuses = ['active', 'paused', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await updateRoutineStatus(routineId, status);
    
    if (result) {
      return NextResponse.json({ success: true, routine: result });
    } else {
      return NextResponse.json(
        { success: false, error: 'Routine not found' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Routines API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import {
  runBackgroundJobs,
  triggerManualRevenueUpdate,
  getBackgroundJobStatus,
  updateCompetitionStatuses,
  sendCompetitionStartingNotifications,
  sendCompetitionEndingNotifications,
  updateAllActiveCompetitionsRevenue,
} from '@/lib/background-jobs';

async function handleGET(request: NextRequest) {
  try {
    const status = await getBackgroundJobStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Background job status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get background job status' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, competitionId } = body;

    switch (action) {
      case 'run-all':
        const result = await runBackgroundJobs();
        return NextResponse.json(result);

      case 'update-statuses':
        const statusResult = await updateCompetitionStatuses();
        return NextResponse.json(statusResult);

      case 'send-starting-notifications':
        const startingResult = await sendCompetitionStartingNotifications();
        return NextResponse.json(startingResult);

      case 'send-ending-notifications':
        const endingResult = await sendCompetitionEndingNotifications();
        return NextResponse.json(endingResult);

      case 'update-revenue':
        const revenueResult = competitionId
          ? await triggerManualRevenueUpdate(competitionId)
          : await updateAllActiveCompetitionsRevenue();
        return NextResponse.json(revenueResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Background job trigger error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger background job' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);

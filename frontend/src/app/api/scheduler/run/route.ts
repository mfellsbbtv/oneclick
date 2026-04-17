import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  executeProvision,
  executeTermination,
  executeGroupChange,
  executeLicenseChange,
  executeAccountAction,
  executeRoleChange,
} from '@/lib/execution';
import type {
  ProvisionPayload,
  TerminatePayload,
  GroupChangePayload,
  LicenseChangePayload,
  AccountActionPayload,
  RoleChangePayload,
  RequestType,
} from '@/lib/change-request-types';

const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY || '';
const MAX_RETRIES = 3;

// POST /api/scheduler/run — called by the AWS Lambda every minute via EventBridge.
// Claims all change_requests with status='scheduled' AND schedule_time <= NOW() atomically,
// then executes each one. Authentication is via the x-scheduler-key header.
export async function POST(request: NextRequest) {
  // Authenticate
  const key = request.headers.get('x-scheduler-key');
  if (!SCHEDULER_API_KEY || key !== SCHEDULER_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  // Atomically claim all due scheduled jobs — prevents double-execution if Lambda fires twice
  let claimed: Array<{
    id: string;
    request_type: RequestType;
    payload: Record<string, unknown>;
    retry_count: number;
  }>;

  try {
    const result = await pool.query<{
      id: string;
      request_type: RequestType;
      payload: Record<string, unknown>;
      retry_count: number;
    }>(
      `UPDATE change_requests
       SET status = 'executing', updated_at = NOW()
       WHERE status = 'scheduled' AND schedule_time <= NOW()
       RETURNING id, request_type, payload, retry_count`
    );
    claimed = result.rows;
  } catch (err) {
    console.error('[scheduler/run] Failed to claim jobs:', err);
    return NextResponse.json({ error: 'DB query failed' }, { status: 500 });
  }

  if (claimed.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, errors: [] });
  }

  console.log(`[scheduler/run] Claimed ${claimed.length} scheduled job(s)`);

  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;

  await Promise.allSettled(
    claimed.map(async (job) => {
      let executionError: string | null = null;

      try {
        const type = job.request_type;
        const payload = job.payload;

        // Cast through unknown to satisfy TypeScript — payload shape is validated by the DB schema
        const p = payload as unknown;
        if (type === 'provision') {
          const r = await executeProvision(p as ProvisionPayload, 'scheduler');
          if (!r.success) executionError = r.error || 'Provision failed';
        } else if (type === 'terminate') {
          const r = await executeTermination(p as TerminatePayload, 'scheduler');
          if (!r.success) executionError = r.message || 'Termination failed';
        } else if (type === 'group_change') {
          const r = await executeGroupChange(p as GroupChangePayload, 'scheduler');
          if (!r.success) executionError = r.error || 'Group change failed';
        } else if (type === 'license_change') {
          const r = await executeLicenseChange(p as LicenseChangePayload, 'scheduler');
          if (!r.success) executionError = r.error || 'License change failed';
        } else if (['suspend', 'reactivate', 'password_reset'].includes(type)) {
          const r = await executeAccountAction(p as AccountActionPayload, type, 'scheduler');
          if (!r.success) executionError = r.error || 'Account action failed';
        } else if (type === 'role_change') {
          const r = await executeRoleChange(p as RoleChangePayload, 'scheduler');
          if (!r.success) executionError = r.error || 'Role change failed';
        } else {
          executionError = `Unknown request type: ${type}`;
        }
      } catch (err) {
        executionError = err instanceof Error ? err.message : 'Unexpected execution error';
      }

      if (!executionError) {
        // Mark completed
        await pool.query(
          `UPDATE change_requests
           SET status = 'completed', executed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [job.id]
        ).catch((e) => console.error(`[scheduler/run] Failed to mark ${job.id} completed:`, e));
        succeeded++;
      } else {
        console.error(`[scheduler/run] Job ${job.id} failed: ${executionError}`);
        errors.push(`${job.id}: ${executionError}`);
        failed++;

        if (job.retry_count < MAX_RETRIES) {
          // Reset to 'scheduled' so the next Lambda invocation retries (~1 min later)
          await pool.query(
            `UPDATE change_requests
             SET status = 'scheduled', retry_count = retry_count + 1,
                 error_message = $2, updated_at = NOW()
             WHERE id = $1`,
            [job.id, executionError]
          ).catch((e) => console.error(`[scheduler/run] Failed to reset ${job.id} for retry:`, e));
        } else {
          // Max retries exhausted — mark as failed permanently
          await pool.query(
            `UPDATE change_requests
             SET status = 'failed', executed_at = NOW(),
                 error_message = $2, updated_at = NOW()
             WHERE id = $1`,
            [job.id, executionError]
          ).catch((e) => console.error(`[scheduler/run] Failed to mark ${job.id} failed:`, e));
        }
      }
    })
  );

  const durationMs = Date.now() - started;
  console.log(`[scheduler/run] Done in ${durationMs}ms — ${succeeded} succeeded, ${failed} failed`);

  return NextResponse.json({
    processed: claimed.length,
    succeeded,
    failed,
    errors,
    durationMs,
  });
}

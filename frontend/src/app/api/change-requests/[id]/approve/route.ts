import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
} from '@/lib/change-request-types';

// POST /api/change-requests/[id]/approve — admin approves a change request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || null;

    // Fetch and validate the request
    const crResult = await pool.query(
      `SELECT * FROM change_requests WHERE id = $1 FOR UPDATE`,
      [params.id]
    );

    if (crResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const changeRequest = crResult.rows[0];

    if (changeRequest.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot approve a request with status: ${changeRequest.status}` },
        { status: 409 }
      );
    }

    // Record the approval action
    await pool.query(
      `INSERT INTO approval_actions (change_request_id, action, actor_email, reason)
       VALUES ($1, 'approve', $2, $3)`,
      [params.id, session.user.email, reason]
    );

    const scheduleTime: Date | null = changeRequest.schedule_time
      ? new Date(changeRequest.schedule_time)
      : null;

    const isFuture = scheduleTime && scheduleTime > new Date();

    if (isFuture) {
      // Mark as scheduled — the Lambda (via /api/scheduler/run) will pick it up at schedule_time
      await pool.query(
        `UPDATE change_requests
         SET status = 'scheduled', approved_by = $2, approved_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [params.id, session.user.email]
      );

      const updated = await pool.query(`SELECT * FROM change_requests WHERE id = $1`, [params.id]);
      return NextResponse.json({ changeRequest: updated.rows[0], scheduled: true });
    }

    // Immediate execution
    await pool.query(
      `UPDATE change_requests
       SET status = 'executing', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [params.id, session.user.email]
    );

    let executionError: string | null = null;
    try {
      if (changeRequest.request_type === 'provision') {
        const result = await executeProvision(
          changeRequest.payload as ProvisionPayload,
          session.user.email
        );
        if (!result.success) {
          executionError = result.error || 'Provision execution failed';
        }
      } else if (changeRequest.request_type === 'terminate') {
        const result = await executeTermination(
          changeRequest.payload as TerminatePayload,
          session.user.email
        );
        if (!result.success) {
          executionError = result.message || 'Termination execution failed';
        }
      } else if (changeRequest.request_type === 'group_change') {
        const result = await executeGroupChange(
          changeRequest.payload as GroupChangePayload,
          session.user.email
        );
        if (!result.success) {
          executionError = result.error || 'Group change failed';
        }
      } else if (changeRequest.request_type === 'license_change') {
        const result = await executeLicenseChange(
          changeRequest.payload as LicenseChangePayload,
          session.user.email
        );
        if (!result.success) {
          executionError = result.error || 'License change failed';
        }
      } else if (['password_reset', 'suspend', 'reactivate'].includes(changeRequest.request_type)) {
        const result = await executeAccountAction(
          changeRequest.payload as AccountActionPayload,
          changeRequest.request_type,
          session.user.email
        );
        if (!result.success) {
          executionError = result.error || 'Account action failed';
        }
      } else if (changeRequest.request_type === 'role_change') {
        const result = await executeRoleChange(
          changeRequest.payload as RoleChangePayload,
          session.user.email
        );
        if (!result.success) {
          executionError = result.error || 'Role change failed';
        }
      }
    } catch (execErr) {
      executionError = execErr instanceof Error ? execErr.message : 'Execution failed';
    }

    const finalStatus = executionError ? 'failed' : 'completed';
    await pool.query(
      `UPDATE change_requests
       SET status = $2, executed_at = NOW(), error_message = $3, updated_at = NOW()
       WHERE id = $1`,
      [params.id, finalStatus, executionError]
    );

    const updated = await pool.query(`SELECT * FROM change_requests WHERE id = $1`, [params.id]);
    return NextResponse.json({
      changeRequest: updated.rows[0],
      scheduled: false,
      success: !executionError,
      error: executionError,
    });
  } catch (error) {
    console.error('Failed to approve change request:', error);
    return NextResponse.json({ error: 'Failed to approve change request' }, { status: 500 });
  }
}

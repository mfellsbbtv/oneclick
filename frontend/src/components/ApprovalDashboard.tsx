'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import {
  ChangeRequest,
  ChangeRequestStatus,
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/change-request-types';

type TabKey = 'pending' | 'all';

export function ApprovalDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reject dialog state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = activeTab === 'pending' ? '&status=pending_approval' : '';
      const res = await fetch(`/api/change-requests?my=false&limit=50${statusParam}`);
      if (!res.ok) throw new Error('Failed to load requests');
      const data = await res.json();
      setRequests(data.data);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/change-requests/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      // Optimistically update
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: data.changeRequest.status as ChangeRequestStatus } : r))
      );
      if (activeTab === 'pending') {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActionLoading(rejectingId);
    try {
      const res = await fetch(`/api/change-requests/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reject failed');
      setRequests((prev) =>
        activeTab === 'pending'
          ? prev.filter((r) => r.id !== rejectingId)
          : prev.map((r) => (r.id === rejectingId ? { ...r, status: 'rejected' as ChangeRequestStatus } : r))
      );
      setRejectingId(null);
      setRejectReason('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending_approval').length;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['pending', 'all'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'pending' ? (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
                {pendingCount > 0 && activeTab !== 'pending' && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                All Requests
                <span className="text-xs text-gray-400">({total})</span>
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto mb-1">
          <Button variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No {activeTab === 'pending' ? 'pending ' : ''}requests</p>
          <p className="text-sm">
            {activeTab === 'pending' ? "You're all caught up!" : 'No change requests have been submitted yet.'}
          </p>
        </div>
      )}

      {/* Request list */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {REQUEST_TYPE_LABELS[req.request_type]}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                      {req.schedule_time && (
                        <span className="text-xs text-purple-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(req.schedule_time).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                      <div>
                        <span className="text-gray-400">Target: </span>
                        <span className="font-medium">{req.target_user_name || req.target_user_email}</span>
                        {req.target_user_name && (
                          <span className="text-gray-400 ml-1">({req.target_user_email})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">Requested by: </span>
                        <span>{req.requested_by}</span>
                        <span className="text-gray-400 ml-2">
                          {new Date(req.requested_at).toLocaleString()}
                        </span>
                      </div>
                      {req.approved_by && (
                        <div>
                          <span className="text-gray-400">
                            {req.status === 'rejected' ? 'Rejected' : 'Approved'} by:{' '}
                          </span>
                          <span>{req.approved_by}</span>
                        </div>
                      )}
                      {req.error_message && (
                        <div className="text-red-600 text-xs mt-1">Error: {req.error_message}</div>
                      )}
                    </div>
                  </div>

                  {req.status === 'pending_approval' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRejectingId(req.id); setRejectReason(''); }}
                        disabled={actionLoading === req.id}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject reason dialog (simple inline) */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                Reject Request
              </CardTitle>
              <CardDescription>Provide a reason for rejection (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rejectReason">Reason</Label>
                <Input
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Missing manager approval, incorrect target user..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  disabled={!!actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!!actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Confirm Rejection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

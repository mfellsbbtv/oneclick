'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw, Calendar, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  ChangeRequest,
  ChangeRequestStatus,
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/change-request-types';

export function ChangeRequestsList() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'superadmin';

  const [showAll, setShowAll] = useState(false);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const myParam = isAdmin && showAll ? 'my=false' : 'my=true';
      const res = await fetch(`/api/change-requests?${myParam}&limit=50`);
      if (!res.ok) throw new Error('Failed to load requests');
      const data = await res.json();
      setRequests(data.data);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, showAll]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this request?')) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/change-requests/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' as ChangeRequestStatus } : r))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {isAdmin && showAll
              ? `All requests (${total})`
              : `Your requests (${total})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'My Requests' : 'All Requests'}
            </Button>
          )}
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
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No requests yet</p>
          <p className="text-sm">
            Submitted provisioning or termination requests will appear here.
          </p>
        </div>
      )}

      {/* Request list */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="hover:shadow-sm transition-shadow">
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
                      {isAdmin && showAll && (
                        <div>
                          <span className="text-gray-400">Requested by: </span>
                          <span>{req.requested_by}</span>
                        </div>
                      )}
                      <div className="text-gray-400 text-xs">
                        Submitted {new Date(req.requested_at).toLocaleString()}
                      </div>
                      {req.approved_by && (
                        <div className="text-xs">
                          <span className="text-gray-400">
                            {req.status === 'rejected' ? 'Rejected' : 'Approved'} by:{' '}
                          </span>
                          <span>{req.approved_by}</span>
                          {req.approved_at && (
                            <span className="text-gray-400 ml-1">
                              {new Date(req.approved_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      {req.error_message && (
                        <div className="text-red-600 text-xs mt-1">Error: {req.error_message}</div>
                      )}
                    </div>
                  </div>

                  {/* Status icon + cancel action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {req.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {(req.status === 'failed' || req.status === 'rejected') && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {req.status === 'pending_approval' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(req.id)}
                        disabled={cancellingId === req.id}
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        {cancellingId === req.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

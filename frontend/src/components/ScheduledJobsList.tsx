'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Play,
  XCircle,
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { ScheduledJob } from '@/lib/scheduler-types';

type StatusFilter = 'all' | 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
type TypeFilter = 'all' | 'provision' | 'terminate';

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEmployeeInfo(job: ScheduledJob): { name: string; email: string } {
  if (job.job_type === 'provision') {
    const emp = job.payload?.employee;
    if (emp) {
      const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || 'Unknown';
      return { name, email: emp.email || '' };
    }
  }

  if (job.job_type === 'terminate') {
    const email = job.payload?.userEmail || '';
    return { name: email || 'Unknown', email };
  }

  return { name: 'Unknown', email: '' };
}

interface StatusBadgeProps {
  status: ScheduledJob['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<ScheduledJob['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    executing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  const icons: Record<ScheduledJob['status'], React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    executing: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <CheckCircle className="h-3 w-3" />,
    failed: <AlertCircle className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface TypeBadgeProps {
  type: ScheduledJob['job_type'];
}

function TypeBadge({ type }: TypeBadgeProps) {
  if (type === 'provision') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <UserPlus className="h-3 w-3" />
        Provision
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <UserMinus className="h-3 w-3" />
      Terminate
    </span>
  );
}

export function ScheduledJobsList() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/scheduler/schedule');
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`);
      }
      const data = await response.json();
      // The API may return an array directly or wrapped in a property
      const jobList: ScheduledJob[] = Array.isArray(data) ? data : (data.jobs ?? data.data ?? []);
      setJobs(jobList);
      setError(null);
    } catch (err) {
      console.error('Error fetching scheduled jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scheduled jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and poll every 10 seconds
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10_000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleCancel = async (id: string) => {
    setActionInProgress(id + '-cancel');
    try {
      const response = await fetch(`/api/scheduler/schedule/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }
      await fetchJobs();
    } catch (err) {
      console.error('Error cancelling job:', err);
      alert('Failed to cancel job. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteNow = async (id: string) => {
    setActionInProgress(id + '-execute');
    try {
      const response = await fetch(`/api/scheduler/schedule/${id}/execute`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to execute job');
      }
      await fetchJobs();
    } catch (err) {
      console.error('Error executing job:', err);
      alert('Failed to execute job. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = typeFilter === 'all' || job.job_type === typeFilter;
    return matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading scheduled jobs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-red-500">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-medium">Failed to load jobs</p>
            <p className="text-xs text-gray-500">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters:</span>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm text-gray-600">
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="text-sm border rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="executing">Executing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="type-filter" className="text-sm text-gray-600">
                Type:
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="text-sm border rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="provision">Provision</option>
                <option value="terminate">Terminate</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-500">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
              {(statusFilter !== 'all' || typeFilter !== 'all') && ` (filtered from ${jobs.length})`}
            </div>

            <Button variant="ghost" size="sm" onClick={fetchJobs} className="text-gray-500">
              <Loader2 className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Clock className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-base font-medium">No scheduled jobs found</p>
            <p className="text-sm mt-1">
              {statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Schedule a provision or termination to see jobs here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const { name, email } = getEmployeeInfo(job);
            const isCancelling = actionInProgress === job.id + '-cancel';
            const isExecuting = actionInProgress === job.id + '-execute';
            const isActionPending = isCancelling || isExecuting;

            return (
              <Card key={job.id} className="transition-shadow hover:shadow-md">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Job info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={job.job_type} />
                        <StatusBadge status={job.status} />
                        {job.tags && job.tags.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {job.tags.join(', ')}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-gray-900 truncate">{name}</p>
                        {email && email !== name && (
                          <p className="text-sm text-gray-500 truncate">{email}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Scheduled: {formatDateTime(job.schedule_time)}
                        </span>
                        <span>
                          Created: {formatDateTime(job.created_at)}
                        </span>
                        {job.executed_at && (
                          <span>
                            Executed: {formatDateTime(job.executed_at)}
                          </span>
                        )}
                        {job.retry_count > 0 && (
                          <span className="text-amber-600">
                            Retries: {job.retry_count}
                          </span>
                        )}
                      </div>

                      {job.error_message && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded p-2">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{job.error_message}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions (only for pending jobs) */}
                    {job.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleExecuteNow(job.id)}
                          disabled={isActionPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1" />
                              Execute Now
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(job.id)}
                          disabled={isActionPending}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

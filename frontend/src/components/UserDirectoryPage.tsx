'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users } from 'lucide-react';
import { AppStatusBadge } from '@/components/AppStatusBadge';
import type { ManagedUser, AppAccountStatus, AppProvider } from '@/lib/user-types';

interface UsersResponse {
  users: (ManagedUser & {
    app_accounts: Array<{
      app_provider: AppProvider;
      status: AppAccountStatus;
      license_info: Array<{ name?: string } | string>;
    }>;
  })[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  departments: string[];
}

const ALL_PROVIDERS: AppProvider[] = [
  'google-workspace', 'microsoft-365', 'jira', 'zoom', 'github', 'hubspot',
];

export function UserDirectoryPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search
  const searchTimerRef = React.useRef<NodeJS.Timeout>();
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['managed-users', debouncedSearch, status, department, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);
      if (department) params.set('department', department);
      params.set('page', String(page));
      params.set('limit', '50');
      const res = await fetch(`/api/directory/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/directory/sync');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/directory/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
  });

  const isAdmin = session?.user?.role === 'superadmin' || session?.user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Directory</h1>
          <p className="text-muted-foreground mt-1">
            {data?.total ?? 0} managed users
            {syncStatus?.last_synced_at && (
              <span className="ml-2 text-xs">
                Last synced: {new Date(syncStatus.last_synced_at).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
          >
            {syncMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Directory
          </Button>
        )}
      </div>

      {syncMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800 space-y-1">
          <div>
            Sync complete: {syncMutation.data.created} created, {syncMutation.data.updated} updated,
            {' '}{syncMutation.data.archived} archived ({syncMutation.data.duration_ms}ms)
          </div>
          {syncMutation.data.microsoft && (
            <div>
              Microsoft 365: {syncMutation.data.microsoft.synced} synced,
              {' '}{syncMutation.data.microsoft.skipped} skipped,
              {' '}{syncMutation.data.microsoft.errors} errors
              {syncMutation.data.microsoft.errorMessages?.map((m: string, i: number) => (
                <div key={i} className="ml-4 text-red-700 font-mono text-xs">{m}</div>
              ))}
            </div>
          )}
          {syncMutation.data.jira && (
            <div>
              Jira: {syncMutation.data.jira.synced} synced,
              {' '}{syncMutation.data.jira.skipped} skipped,
              {' '}{syncMutation.data.jira.errors} errors
              {syncMutation.data.jira.errorMessages?.map((m: string, i: number) => (
                <div key={i} className="ml-4 text-red-700 font-mono text-xs">{m}</div>
              ))}
            </div>
          )}
          {syncMutation.data.zoom && (
            <div>
              Zoom: {syncMutation.data.zoom.synced} synced,
              {' '}{syncMutation.data.zoom.skipped} skipped,
              {' '}{syncMutation.data.zoom.errors} errors
              {syncMutation.data.zoom.errorMessages?.map((m: string, i: number) => (
                <div key={i} className="ml-4 text-red-700 font-mono text-xs">{m}</div>
              ))}
            </div>
          )}
          {syncMutation.data.github && (
            <div>
              GitHub: {syncMutation.data.github.synced} synced,
              {' '}{syncMutation.data.github.skipped} skipped,
              {' '}{syncMutation.data.github.errors} errors
              {syncMutation.data.github.errorMessages?.map((m: string, i: number) => (
                <div key={i} className="ml-4 text-red-700 font-mono text-xs">{m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          className="border rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">All Departments</option>
          {data?.departments?.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            Failed to load users. Make sure the database is running and migrations have been applied.
          </CardContent>
        </Card>
      ) : data?.users?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No users found. {isAdmin && 'Try syncing the directory.'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.users?.map((user) => {
                  const accountsByProvider = new Map(
                    user.app_accounts?.map((a) => [a.app_provider, a]) ?? []
                  );
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${encodeURIComponent(user.email)}`}
                          className="hover:underline"
                        >
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{user.job_title || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-800' :
                            user.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                            user.status === 'terminated' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {ALL_PROVIDERS.map((provider) => {
                            const acct = accountsByProvider.get(provider);
                            const firstLic = acct?.license_info?.[0];
                            const plan = firstLic
                              ? (typeof firstLic === 'string' ? firstLic : firstLic.name)
                              : undefined;
                            return (
                              <AppStatusBadge
                                key={provider}
                                provider={provider}
                                status={acct?.status ?? 'not_provisioned'}
                                plan={plan}
                              />
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {data.page} of {data.total_pages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.total_pages}
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(data.total_pages)}
                  disabled={page >= data.total_pages}
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

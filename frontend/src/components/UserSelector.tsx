'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X, Loader2, AlertCircle, Users } from 'lucide-react';

export interface TerminableUser {
  email: string;
  name: string;
  groups: string[];
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
}

interface UserSelectorProps {
  onSelect: (user: TerminableUser | null) => void;
  selectedUser: TerminableUser | null;
}

export function UserSelector({ onSelect, selectedUser }: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data: users, isLoading, error } = useQuery<TerminableUser[]>({
    queryKey: ['terminable-users'],
    queryFn: async () => {
      const res = await fetch('/api/directory/terminable-users');
      if (!res.ok) {
        if (res.status === 401) throw new Error('Not authenticated');
        throw new Error('Failed to fetch users');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleSelect = (user: TerminableUser) => {
    onSelect(user);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>User to Terminate</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading authorized users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>User to Terminate</Label>
        <div className="flex items-center gap-2 p-3 border border-red-200 rounded-md bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'Failed to load users'}
          </span>
        </div>
      </div>
    );
  }

  if (users && users.length === 0) {
    return (
      <div className="space-y-2">
        <Label>User to Terminate</Label>
        <div className="flex items-center gap-2 p-3 border border-amber-200 rounded-md bg-amber-50">
          <Users className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-700">
            You don&apos;t have permission to terminate any users. You must be an owner of a security group to terminate its members.
          </span>
        </div>
      </div>
    );
  }

  if (selectedUser) {
    return (
      <div className="space-y-2">
        <Label>User to Terminate</Label>
        <div className="flex items-center justify-between p-3 border-2 border-red-200 rounded-md bg-red-50">
          <div>
            <p className="font-medium text-sm">{selectedUser.name}</p>
            <p className="text-xs text-gray-600">{selectedUser.email}</p>
            {selectedUser.groups.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {selectedUser.groups.map(g => (
                  <span key={g} className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <Label>User to Terminate</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9"
        />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {searchQuery ? 'No matching users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                >
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.groups.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {user.groups.map(g => (
                        <span key={g} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {users && (
        <p className="text-xs text-gray-500">
          {users.length} user{users.length !== 1 ? 's' : ''} available for termination
        </p>
      )}
    </div>
  );
}

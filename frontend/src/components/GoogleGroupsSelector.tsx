'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface GoogleGroup {
  id: string;
  email: string;
  name: string;
  description?: string;
}

interface GoogleGroupsSelectorProps {
  groups: GoogleGroup[];
  selectedGroups: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  pageSize?: number;
}

export function GoogleGroupsSelector({
  groups,
  selectedGroups,
  onSelectionChange,
  pageSize = 20,
}: GoogleGroupsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter groups based on search query (name or email)
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups;
    }
    const query = searchQuery.toLowerCase().trim();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.email.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredGroups.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentGroups = filteredGroups.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    if (selectedGroups.includes(groupId)) {
      onSelectionChange(selectedGroups.filter((id) => id !== groupId));
    } else {
      onSelectionChange([...selectedGroups, groupId]);
    }
  };

  // Select all visible groups
  const selectAllVisible = () => {
    const visibleIds = currentGroups.map((g) => g.id);
    const newSelection = [...new Set([...selectedGroups, ...visibleIds])];
    onSelectionChange(newSelection);
  };

  // Deselect all visible groups
  const deselectAllVisible = () => {
    const visibleIds = new Set(currentGroups.map((g) => g.id));
    onSelectionChange(selectedGroups.filter((id) => !visibleIds.has(id)));
  };

  return (
    <div className="border rounded-lg bg-white">
      {/* Header with search and selection info */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span>
              {selectedGroups.length} selected of {groups.length} total
            </span>
            {searchQuery && (
              <span className="text-blue-600">
                ({filteredGroups.length} matching)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-blue-600 hover:underline"
            >
              Select page
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={deselectAllVisible}
              className="text-blue-600 hover:underline"
            >
              Deselect page
            </button>
          </div>
        </div>
      </div>

      {/* Groups list */}
      <div className="max-h-[320px] overflow-y-auto">
        {currentGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {searchQuery ? 'No groups match your search' : 'No groups available'}
          </div>
        ) : (
          <div className="divide-y">
            {currentGroups.map((group) => (
              <label
                key={group.id}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(group.id)}
                  onChange={() => toggleGroup(group.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {group.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {group.email}
                  </div>
                  {group.description && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {group.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          Showing {filteredGroups.length > 0 ? startIndex + 1 : 0}-
          {Math.min(endIndex, filteredGroups.length)} of {filteredGroups.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs text-gray-600">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected groups summary (collapsed by default, expandable) */}
      {selectedGroups.length > 0 && (
        <details className="border-t">
          <summary className="p-2 text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
            View {selectedGroups.length} selected group{selectedGroups.length !== 1 ? 's' : ''}
          </summary>
          <div className="p-2 bg-blue-50 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {selectedGroups.map((id) => {
                const group = groups.find((g) => g.id === id);
                return group ? (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {group.name}
                    <button
                      type="button"
                      onClick={() => toggleGroup(id)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Users, Shield, Mail, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface MicrosoftGroup {
  id: string;
  displayName: string;
  description?: string;
  type: 'security' | 'distribution' | 'office365';
}

interface MicrosoftGroupsSelectorProps {
  groups: MicrosoftGroup[];
  selectedGroups: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  pageSize?: number;
}

// Icon for group type
const GroupTypeIcon = ({ type }: { type: MicrosoftGroup['type'] }) => {
  switch (type) {
    case 'security':
      return <Shield className="h-3 w-3 text-blue-500" />;
    case 'distribution':
      return <Mail className="h-3 w-3 text-green-500" />;
    case 'office365':
      return <Building2 className="h-3 w-3 text-purple-500" />;
    default:
      return <Users className="h-3 w-3 text-gray-500" />;
  }
};

// Group type label
const GroupTypeLabel = ({ type }: { type: MicrosoftGroup['type'] }) => {
  const labels = {
    security: 'Security',
    distribution: 'Distribution',
    office365: 'M365 Group',
  };
  return <span className="text-xs text-gray-400">{labels[type] || 'Group'}</span>;
};

export function MicrosoftGroupsSelector({
  groups,
  selectedGroups,
  onSelectionChange,
  pageSize = 20,
}: MicrosoftGroupsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<'all' | 'security' | 'distribution' | 'office365'>('all');

  // Filter groups based on search query and type filter
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter((group) => group.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (group) =>
          group.displayName.toLowerCase().includes(query) ||
          (group.description && group.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [groups, searchQuery, typeFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredGroups.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentGroups = filteredGroups.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (type: typeof typeFilter) => {
    setTypeFilter(type);
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

  // Count by type
  const groupCounts = useMemo(() => ({
    all: groups.length,
    security: groups.filter(g => g.type === 'security').length,
    distribution: groups.filter(g => g.type === 'distribution').length,
    office365: groups.filter(g => g.type === 'office365').length,
  }), [groups]);

  return (
    <div className="border rounded-lg bg-white">
      {/* Header with search and filters */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter by name or description..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-1 mb-2">
          {(['all', 'security', 'distribution', 'office365'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeFilterChange(type)}
              className={`px-2 py-1 text-xs rounded ${
                typeFilter === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type === 'office365' ? 'M365' : type.charAt(0).toUpperCase() + type.slice(1)}
              <span className="ml-1 opacity-70">({groupCounts[type]})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span>
              {selectedGroups.length} selected of {groups.length} total
            </span>
            {(searchQuery || typeFilter !== 'all') && (
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
            {searchQuery || typeFilter !== 'all' ? 'No groups match your criteria' : 'No groups available'}
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
                  <div className="flex items-center gap-2">
                    <GroupTypeIcon type={group.type} />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {group.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <GroupTypeLabel type={group.type} />
                    {group.description && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-400 truncate">
                          {group.description}
                        </span>
                      </>
                    )}
                  </div>
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
                    <GroupTypeIcon type={group.type} />
                    {group.displayName}
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

'use client';

import React from 'react';

interface SlackSummaryProps {
  formData: any;
}

export function SlackSummary({ formData }: SlackSummaryProps) {
  const {
    userRole = 'member',
    defaultChannels = ['general'],
    userGroups = [],
  } = formData;

  const formatList = (items: string[]) => {
    if (!items || items.length === 0) return 'None selected';
    return items.join(', ');
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'member':
        return 'Full workspace access';
      case 'single_channel_guest':
        return 'Single-channel guest (limited to one channel)';
      case 'multi_channel_guest':
        return 'Multi-channel guest (limited to selected channels)';
      default:
        return role;
    }
  };

  const getChannelsToShow = () => {
    if (userRole === 'single_channel_guest' && defaultChannels.length > 0) {
      return [defaultChannels[0]]; // Only show first channel for single-channel guests
    }
    return defaultChannels;
  };

  const isGuestUser = userRole.includes('guest');

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
      <h5 className="font-semibold text-purple-900 mb-3 flex items-center">
        <span className="text-lg mr-2">💬</span>
        Slack Setup Summary
      </h5>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">User Role:</span>
          <span className="font-medium">{getRoleDescription(userRole)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">
            {userRole === 'single_channel_guest' ? 'Assigned Channel:' : 'Default Channels:'}
          </span>
          <span className="font-medium">
            #{formatList(getChannelsToShow()).replace(/, /g, ', #')}
            {userRole === 'single_channel_guest' && defaultChannels.length > 1 && (
              <span className="text-gray-500 text-xs ml-1">(others ignored)</span>
            )}
          </span>
        </div>
        
        {!isGuestUser && (
          <div className="flex justify-between">
            <span className="text-gray-600">User Groups:</span>
            <span className="font-medium">{formatList(userGroups)}</span>
          </div>
        )}
        
        {isGuestUser && (
          <div className="flex justify-between">
            <span className="text-gray-600">User Groups:</span>
            <span className="font-medium text-gray-500">Not available for guest users</span>
          </div>
        )}
        
        <hr className="my-3 border-purple-200" />
        
        <div className="bg-white rounded p-3">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-lg">ℹ️</span>
            <div>
              <p className="font-medium text-blue-800">Slack Invitation Process</p>
              <p className="text-blue-700 text-xs mt-1">
                User will receive an invitation email from Slack. They'll need to accept the invitation 
                and set up their password to access the workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded p-3 mt-2">
          <p className="text-xs text-gray-600">
            <strong>Next Steps:</strong>
            <br />
            1. User receives Slack invitation email
            <br />
            2. User clicks "Join Workspace" in email
            <br />
            3. User sets up their Slack password
            <br />
            4. User gains access to selected channels and groups
          </p>
        </div>
      </div>
    </div>
  );
}
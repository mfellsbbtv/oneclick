'use client';

import React, { useState, useEffect } from 'react';
import { generatePassword, shouldShowGeneratedPassword } from '@/lib/password-utils';

interface GoogleWorkspaceSummaryProps {
  formData: any;
}

export function GoogleWorkspaceSummary({ formData }: GoogleWorkspaceSummaryProps) {
  const {
    primaryOrgUnit = '/',
    licenseSku = '1010020027',
    passwordMode = 'auto',
    customPassword,
    changePasswordAtNextLogin = false,
  } = formData;

  // Generate and persist the password for auto mode
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  
  useEffect(() => {
    if (shouldShowGeneratedPassword(formData) && !generatedPassword) {
      setGeneratedPassword(generatePassword());
    }
  }, [formData, generatedPassword]);

  const getLicenseName = (sku: string) => {
    const licenseMap: Record<string, string> = {
      '1010020027': 'Business Starter',
      '1010020028': 'Business Standard',
      '1010020025': 'Business Plus',
      '1010020026': 'Enterprise Standard',
      '1010020030': 'Enterprise Plus',
    };
    return licenseMap[sku] || 'Unknown License';
  };

  const canUserLoginImmediately = passwordMode !== 'custom' || (customPassword && !changePasswordAtNextLogin);
  const actualPassword = passwordMode === 'custom' ? customPassword : generatedPassword;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h5 className="font-semibold text-blue-900 mb-3 flex items-center">
        <span className="text-lg mr-2">🔍</span>
        Google Workspace Setup Summary
      </h5>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Organization Unit:</span>
          <span className="font-medium">{primaryOrgUnit}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">License:</span>
          <span className="font-medium">{getLicenseName(licenseSku)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Password:</span>
          <span className="font-medium">
            {passwordMode === 'auto' ? '🎲 Auto-generated' : '🔐 Custom set'}
          </span>
        </div>
        
        {actualPassword && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {passwordMode === 'auto' ? 'Generated Password:' : 'Custom Password:'}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(actualPassword)}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                title="Copy to clipboard"
              >
                📋 Copy
              </button>
            </div>
            <div className="font-mono text-sm bg-white border rounded px-3 py-2 select-all">
              {actualPassword}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 {passwordMode === 'auto' ? 'This password was automatically generated.' : 'This is your custom password.'} Save it securely - the user will need it to log in.
            </p>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Change Required:</span>
          <span className="font-medium">
            {changePasswordAtNextLogin ? '🔄 Yes' : '✅ No'}
          </span>
        </div>
        
        <hr className="my-3 border-blue-200" />
        
        <div className="bg-white rounded p-3">
          <div className="flex items-start space-x-2">
            {canUserLoginImmediately ? (
              <>
                <span className="text-green-600 text-lg">✅</span>
                <div>
                  <p className="font-medium text-green-800">Ready for immediate login!</p>
                  <p className="text-green-700 text-xs mt-1">
                    User can log in with the password shown above right after creation 
                    (allow 10-15 minutes for Google's propagation).
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="text-yellow-600 text-lg">⚠️</span>
                <div>
                  <p className="font-medium text-yellow-800">Password change required</p>
                  <p className="text-yellow-700 text-xs mt-1">
                    User cannot log in with current password until they complete a password reset flow.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
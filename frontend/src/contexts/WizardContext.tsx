'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppProvider } from '@/lib/providers';

export interface UserInfo {
  fullName: string;
  workEmail: string;
}

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  userInfo: UserInfo | null;
  selectedApps: AppProvider[];
  appConfigs: Record<string, any>;
  isValid: boolean;
}

interface WizardContextType {
  state: WizardState;
  setUserInfo: (info: UserInfo) => void;
  toggleApp: (app: AppProvider) => void;
  setAppConfig: (app: AppProvider, config: any) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  canProceed: () => boolean;
  reset: () => void;
  submitProvisioning: () => Promise<void>;
}

const initialState: WizardState = {
  currentStep: 0,
  totalSteps: 1,
  userInfo: null,
  selectedApps: [],
  appConfigs: {},
  isValid: false,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const setUserInfo = useCallback((info: UserInfo) => {
    setState(prev => ({
      ...prev,
      userInfo: info,
      isValid: !!(info.fullName && info.workEmail && prev.selectedApps.length > 0),
    }));
  }, []);

  const toggleApp = useCallback((app: AppProvider) => {
    setState(prev => {
      const selectedApps = prev.selectedApps.includes(app)
        ? prev.selectedApps.filter(a => a !== app)
        : [...prev.selectedApps, app];
      
      // Calculate total steps: 1 (user info) + 1 per selected app + 1 (review)
      const totalSteps = 1 + selectedApps.length + 1;
      
      // Remove config if app is deselected
      const appConfigs = { ...prev.appConfigs };
      if (!selectedApps.includes(app)) {
        delete appConfigs[app];
      }

      return {
        ...prev,
        selectedApps,
        appConfigs,
        totalSteps,
        isValid: !!(prev.userInfo?.fullName && prev.userInfo?.workEmail && selectedApps.length > 0),
      };
    });
  }, []);

  const setAppConfig = useCallback((app: AppProvider, config: any) => {
    setState(prev => ({
      ...prev,
      appConfigs: {
        ...prev.appConfigs,
        [app]: config,
      },
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps - 1),
    }));
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(Math.max(step, 0), prev.totalSteps - 1),
    }));
  }, []);

  const canProceed = useCallback(() => {
    const { currentStep, userInfo, selectedApps, appConfigs } = state;
    
    // Step 0: User info and app selection
    if (currentStep === 0) {
      return !!(
        userInfo?.fullName &&
        userInfo?.workEmail &&
        userInfo.workEmail.includes('@') &&
        selectedApps.length > 0
      );
    }
    
    // App configuration steps
    if (currentStep > 0 && currentStep <= selectedApps.length) {
      const currentApp = selectedApps[currentStep - 1];
      const config = appConfigs[currentApp];
      return !!config; // Basic check - enhance with app-specific validation
    }
    
    // Review step - always can proceed (to submit)
    return true;
  }, [state]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const submitProvisioning = useCallback(async () => {
    const { userInfo, selectedApps, appConfigs } = state;
    
    if (!userInfo) {
      throw new Error('User information is required');
    }

    const payload = {
      user: userInfo,
      apps: selectedApps,
      configurations: appConfigs,
    };

    try {
      const response = await fetch('/api/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit provisioning request');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Provisioning submission error:', error);
      throw error;
    }
  }, [state]);

  const value: WizardContextType = {
    state,
    setUserInfo,
    toggleApp,
    setAppConfig,
    nextStep,
    previousStep,
    goToStep,
    canProceed,
    reset,
    submitProvisioning,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { StepIndicator } from '@/components/wizard/StepIndicator';
import { UserInfoForm } from '@/components/forms/UserInfoForm';
import { AppToggle } from '@/components/wizard/AppToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getProvider, AppProvider } from '@/lib/providers';
import { GoogleWorkspaceSummary } from '@/components/providers/GoogleWorkspaceSummary';
import { SlackSummary } from '@/components/providers/SlackSummary';

// Dynamic import of provider forms
const ProviderForm = dynamic(() => import('@/components/providers/ProviderForm'), {
  loading: () => <div>Loading...</div>,
});

function WizardContent() {
  const router = useRouter();
  const {
    state,
    setUserInfo,
    toggleApp,
    setAppConfig,
    nextStep,
    previousStep,
    canProceed,
    submitProvisioning,
  } = useWizard();

  const { currentStep, totalSteps, userInfo, selectedApps, appConfigs } = state;

  // Get the current app for configuration steps
  const currentAppIndex = currentStep - 1;
  const currentApp = currentAppIndex >= 0 && currentAppIndex < selectedApps.length 
    ? selectedApps[currentAppIndex] 
    : null;
  const currentProvider = currentApp ? getProvider(currentApp) : null;

  const handleSubmit = async () => {
    try {
      await submitProvisioning();
      router.push('/provision/success');
    } catch (error) {
      console.error('Failed to submit provisioning:', error);
      // Handle error - show toast or error message
    }
  };

  const renderStepContent = () => {
    // Step 0: User info and app selection
    if (currentStep === 0) {
      return (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">User Information</h3>
            <UserInfoForm
              initialData={userInfo}
              onSubmit={setUserInfo}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Applications</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose which applications to provision for this user. At least one must be selected.
            </p>
            <AppToggle
              selectedApps={selectedApps}
              onToggle={toggleApp}
            />
          </div>
        </div>
      );
    }

    // App configuration steps
    if (currentApp && currentProvider) {
      return (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">{currentProvider.icon}</span>
              Configure {currentProvider.name}
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              {currentProvider.description}
            </p>
          </div>
          
          <ProviderForm
            provider={currentProvider}
            initialData={appConfigs[currentApp]}
            onSubmit={(data) => setAppConfig(currentApp, data)}
          />
        </div>
      );
    }

    // Review step
    if (currentStep === totalSteps - 1) {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Review & Submit</h3>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Name:</dt>
                    <dd className="font-medium">{userInfo?.fullName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="font-medium">{userInfo?.workEmail}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applications to Provision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedApps.map((app) => {
                    const provider = getProvider(app);
                    const config = appConfigs[app];
                    return (
                      <div key={app} className="border-l-4 border-blue-500 pl-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{provider?.icon}</span>
                          <span className="font-medium">{provider?.name}</span>
                        </div>
                        {config && (
                          <div className="mt-1">
                            {app === AppProvider.GOOGLE_WORKSPACE && (
                              <GoogleWorkspaceSummary formData={config} />
                            )}
                            {app === AppProvider.SLACK && (
                              <SlackSummary formData={config} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Ready to provision!</strong> Click Submit to create accounts and assign licenses
              for the selected applications. This process may take a few minutes.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Provisioning Wizard</CardTitle>
          <CardDescription>
            Set up new user accounts across your organization's applications
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <StepIndicator
            currentStep={currentStep}
            steps={[
              { id: 0, title: 'User Info', description: '' },
              ...selectedApps.map((app, index) => ({
                id: index + 1,
                title: getProvider(app)?.name || app,
                description: '',
              })),
              { 
                id: selectedApps.length + 1, 
                title: 'Review', 
                description: '' 
              },
            ]}
          />

          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Submit Provisioning
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProvisionPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
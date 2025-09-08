'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StepIndicator } from '@/components/wizard/StepIndicator'
import { UserInfoForm } from '@/components/forms/UserInfoForm'
import { ProviderForm } from '@/components/providers/ProviderForm'
import { AppToggle } from '@/components/wizard/AppToggle'

const STEPS = [
  { id: 1, title: 'User Information', description: 'Basic user details' },
  { id: 2, title: 'Provider Selection', description: 'Choose your cloud provider' },
  { id: 3, title: 'Application Configuration', description: 'Select applications to deploy' },
  { id: 4, title: 'Review & Deploy', description: 'Review and confirm deployment' },
]

export default function ProvisioningWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({})
  const router = useRouter()

  const handleNext = (stepData: any) => {
    setFormData(prev => ({ ...prev, ...stepData }))
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
      router.push(`/provision/${currentStep + 1}`)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      router.push(`/provision/${currentStep - 1}`)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <UserInfoForm onSubmit={handleNext} />
      case 2:
        return <ProviderForm onSubmit={handleNext} />
      case 3:
        return <AppToggle onSubmit={handleNext} />
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Configuration</h3>
            <pre className="bg-muted p-4 rounded-lg">
              {JSON.stringify(formData, null, 2)}
            </pre>
            <div className="flex gap-4">
              <Button onClick={handlePrevious} variant="outline">
                Previous
              </Button>
              <Button onClick={() => console.log('Deploy:', formData)}>
                Deploy Applications
              </Button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Application Provisioning Wizard</h1>
        <p className="text-muted-foreground mt-2">
          Configure and deploy your applications across multiple providers
        </p>
      </div>

      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1]?.title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1]?.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  )
}
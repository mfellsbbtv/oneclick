'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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

export default function StepPage() {
  const params = useParams()
  const router = useRouter()
  const [formData, setFormData] = useState({})
  
  const currentStep = parseInt(params.step as string) || 1

  useEffect(() => {
    // Load form data from localStorage or state management
    const savedData = localStorage.getItem('provisioningData')
    if (savedData) {
      setFormData(JSON.parse(savedData))
    }
  }, [])

  const handleNext = (stepData: any) => {
    const updatedData = { ...formData, ...stepData }
    setFormData(updatedData)
    localStorage.setItem('provisioningData', JSON.stringify(updatedData))
    
    if (currentStep < STEPS.length) {
      router.push(`/provision/${currentStep + 1}`)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      router.push(`/provision/${currentStep - 1}`)
    } else {
      router.push('/provision')
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <UserInfoForm onSubmit={handleNext} initialData={formData} />
      case 2:
        return <ProviderForm onSubmit={handleNext} initialData={formData} />
      case 3:
        return <AppToggle onSubmit={handleNext} initialData={formData} />
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Configuration</h3>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
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
        return <div>Step not found</div>
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
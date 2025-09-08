'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { providerSelectionSchema, type ProviderSelectionData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { providers } from '@/lib/providers'
import { cn } from '@/lib/utils'

interface ProviderFormProps {
  onSubmit: (data: ProviderSelectionData) => void
  initialData?: Partial<ProviderSelectionData>
}

export function ProviderForm({ onSubmit, initialData }: ProviderFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>(
    initialData?.provider || ''
  )

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProviderSelectionData>({
    resolver: zodResolver(providerSelectionSchema),
    defaultValues: initialData,
  })

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId)
    setValue('provider', providerId)
    setValue('credentials', {}) // Reset credentials when provider changes
  }

  const handleFormSubmit = (data: ProviderSelectionData) => {
    onSubmit({
      ...data,
      provider: selectedProvider,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Select Cloud Provider</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the cloud provider where you want to deploy your applications.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <Card
              key={provider.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedProvider === provider.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary/50'
              )}
              onClick={() => handleProviderSelect(provider.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`h-10 w-10 rounded-md ${provider.color} flex items-center justify-center`}>
                    <provider.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>{provider.description}</CardDescription>
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Features:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {provider.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {errors.provider && (
          <p className="text-sm text-destructive mt-2">{errors.provider.message}</p>
        )}
      </div>

      {selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Provider Configuration</CardTitle>
            <CardDescription>
              Configure your {providers.find(p => p.id === selectedProvider)?.name} credentials and settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Credential configuration will be implemented in the next phase of development.
              For now, we'll use default settings for the selected provider.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Previous
        </Button>
        <Button type="submit" disabled={!selectedProvider}>
          Next
        </Button>
      </div>
    </form>
  )
}
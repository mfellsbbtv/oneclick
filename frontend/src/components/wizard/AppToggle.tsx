'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { applications } from '@/lib/providers'

const appToggleSchema = z.object({
  selectedApps: z.array(z.string()).min(1, 'Please select at least one application'),
  configurations: z.record(z.any()).optional(),
})

type AppToggleData = z.infer<typeof appToggleSchema>

interface AppToggleProps {
  onSubmit: (data: AppToggleData) => void
  initialData?: any
}

export function AppToggle({ onSubmit, initialData }: AppToggleProps) {
  const [selectedApps, setSelectedApps] = useState<string[]>(
    initialData?.selectedApps || []
  )

  const {
    handleSubmit,
    formState: { errors },
  } = useForm<AppToggleData>({
    resolver: zodResolver(appToggleSchema),
    defaultValues: {
      selectedApps: initialData?.selectedApps || [],
      configurations: initialData?.configurations || {},
    },
  })

  const handleAppToggle = (appId: string, enabled: boolean) => {
    if (enabled) {
      setSelectedApps(prev => [...prev, appId])
    } else {
      setSelectedApps(prev => prev.filter(id => id !== appId))
    }
  }

  const handleFormSubmit = () => {
    if (selectedApps.length === 0) {
      return
    }
    
    onSubmit({
      selectedApps,
      configurations: {},
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {applications.map((app) => (
          <Card key={app.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <app.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={selectedApps.includes(app.id)}
                  onCheckedChange={(enabled) => handleAppToggle(app.id, enabled)}
                />
              </div>
            </CardHeader>
            {selectedApps.includes(app.id) && (
              <CardContent className="pt-0">
                <div className="rounded-md bg-muted p-3">
                  <Label className="text-sm font-medium">Configuration Options</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Advanced configuration options will be available in the next step.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {errors.selectedApps && (
        <p className="text-sm text-destructive">{errors.selectedApps.message}</p>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Previous
        </Button>
        <Button onClick={handleFormSubmit} disabled={selectedApps.length === 0}>
          Next
        </Button>
      </div>
    </div>
  )
}
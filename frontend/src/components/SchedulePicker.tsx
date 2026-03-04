'use client'

import { useMemo, useState } from 'react'
import { Clock, Calendar, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScheduleConfig } from '@/lib/scheduler-types'

interface SchedulePickerProps {
  onScheduleChange: (config: ScheduleConfig) => void
}

interface Preset {
  label: string
  description: string
  isoString: string
}

function formatReadable(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDatetimeLocalValue(isoString: string): string {
  // datetime-local input expects "YYYY-MM-DDTHH:mm"
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function SchedulePicker({ onScheduleChange }: SchedulePickerProps) {
  const [isScheduled, setIsScheduled] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customTime, setCustomTime] = useState<string>('')

  const presets: Preset[] = useMemo(() => {
    const now = new Date()

    // In 1 Hour
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)

    // Tomorrow 9 AM
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)

    // Next Monday 9 AM (always go to next week even if today is Monday)
    const nextMonday = new Date(now)
    const dayOfWeek = nextMonday.getDay() // 0 = Sunday, 1 = Monday, ...
    const daysUntilNextMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7
    nextMonday.setDate(nextMonday.getDate() + daysUntilNextMonday)
    nextMonday.setHours(9, 0, 0, 0)

    return [
      {
        label: 'In 1 Hour',
        description: formatReadable(inOneHour.toISOString()),
        isoString: inOneHour.toISOString(),
      },
      {
        label: 'Tomorrow 9 AM',
        description: formatReadable(tomorrow.toISOString()),
        isoString: tomorrow.toISOString(),
      },
      {
        label: 'Next Monday 9 AM',
        description: formatReadable(nextMonday.toISOString()),
        isoString: nextMonday.toISOString(),
      },
    ]
  }, [])

  const minDatetimeLocal = useMemo(() => {
    return toDatetimeLocalValue(new Date().toISOString())
  }, [])

  const selectedTime = useMemo(() => {
    if (selectedPreset !== null) {
      const preset = presets.find((p) => p.label === selectedPreset)
      return preset ? preset.isoString : null
    }
    if (customTime) {
      return new Date(customTime).toISOString()
    }
    return null
  }, [selectedPreset, customTime, presets])

  function handleToggle(checked: boolean) {
    setIsScheduled(checked)
    if (!checked) {
      setSelectedPreset(null)
      setCustomTime('')
      onScheduleChange({ isScheduled: false, scheduleTime: null })
    }
  }

  function handlePresetClick(preset: Preset) {
    setSelectedPreset(preset.label)
    setCustomTime(toDatetimeLocalValue(preset.isoString))
    onScheduleChange({ isScheduled: true, scheduleTime: preset.isoString })
  }

  function handleCustomTimeChange(value: string) {
    setCustomTime(value)
    setSelectedPreset(null)
    if (value) {
      const iso = new Date(value).toISOString()
      onScheduleChange({ isScheduled: true, scheduleTime: iso })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Execution Timing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="schedule-toggle" className="text-sm font-medium">
              Schedule for Later
            </Label>
            <p className="text-xs text-muted-foreground">
              Toggle off to execute immediately
            </p>
          </div>
          <Switch
            id="schedule-toggle"
            checked={isScheduled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Scheduler options - only shown when toggled on */}
        {isScheduled && (
          <div className="space-y-4 pt-1">
            {/* Preset buttons */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Quick Presets
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => {
                  const isSelected = selectedPreset === preset.label
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={`flex flex-col items-center justify-center rounded-md border p-2 text-center transition-colors hover:bg-blue-50 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-input bg-background'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-xs font-medium">
                        {preset.label === 'In 1 Hour' && (
                          <Zap className="h-3 w-3" />
                        )}
                        {preset.label === 'Tomorrow 9 AM' && (
                          <Calendar className="h-3 w-3" />
                        )}
                        {preset.label === 'Next Monday 9 AM' && (
                          <Calendar className="h-3 w-3" />
                        )}
                        {preset.label}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                        {preset.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom datetime picker */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-schedule-time" className="text-xs text-muted-foreground">
                Custom Date &amp; Time
              </Label>
              <Input
                id="custom-schedule-time"
                type="datetime-local"
                min={minDatetimeLocal}
                value={customTime}
                onChange={(e) => handleCustomTimeChange(e.target.value)}
              />
            </div>

            {/* Info banner */}
            {selectedTime && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-blue-800">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                <p className="text-xs">
                  <span className="font-medium">Scheduled for: </span>
                  {formatReadable(selectedTime)}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

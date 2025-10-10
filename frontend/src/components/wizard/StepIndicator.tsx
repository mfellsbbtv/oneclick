'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <div className="relative">
        {/* Progress line - positioned above the circles */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" aria-hidden="true">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ 
              width: `${currentStep > 0 ? (currentStep / (steps.length - 1)) * 100 : 0}%` 
            }}
          />
        </div>
        
        {/* Steps */}
        <ol className="relative flex items-start justify-between">
          {steps.map((step, stepIdx) => (
            <li
              key={step.id}
              className="flex flex-col items-center"
              style={{ flex: stepIdx === 0 || stepIdx === steps.length - 1 ? '0' : '1' }}
            >
              {/* Circle indicator */}
              <div className="relative z-10">
                {step.id < currentStep ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary/90">
                    <Check className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                    <span className="sr-only">{step.title}</span>
                  </div>
                ) : step.id === currentStep ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background"
                    aria-current="step"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                    <span className="sr-only">{step.title}</span>
                  </div>
                ) : (
                  <div className="group flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background hover:border-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-muted"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{step.title}</span>
                  </div>
                )}
              </div>
              
              {/* Step labels - positioned below circles with proper spacing */}
              <div className="mt-3 text-center max-w-[100px]">
                <p className="text-xs font-medium text-foreground line-clamp-2">
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
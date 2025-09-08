'use client';

import { AppProvider, getAllProviders } from '@/lib/providers';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AppToggleProps {
  selectedApps: AppProvider[];
  onToggle: (app: AppProvider) => void;
}

export function AppToggle({ selectedApps, onToggle }: AppToggleProps) {
  const providers = getAllProviders();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map((provider) => {
        const isSelected = selectedApps.includes(provider.id);
        
        return (
          <Card
            key={provider.id}
            className={cn(
              "relative p-4 cursor-pointer transition-all",
              isSelected ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"
            )}
            onClick={() => onToggle(provider.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{provider.icon}</span>
                  <h4 className="font-semibold">{provider.name}</h4>
                </div>
                <p className="text-sm text-gray-600">
                  {provider.description}
                </p>
              </div>
              <Switch
                checked={isSelected}
                onCheckedChange={() => onToggle(provider.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
            </div>
            
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </Card>
        );
      })}
    </div>
  );
}
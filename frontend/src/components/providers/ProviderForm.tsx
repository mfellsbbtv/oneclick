'use client';

import { useForm, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ProviderConfig, FieldConfig } from '@/lib/providers';

interface ProviderFormProps {
  provider: ProviderConfig;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
}

function renderField(field: FieldConfig, register: any, control: any, errors: any) {
  const fieldError = errors[field.name];

  switch (field.type) {
    case 'boolean':
      return (
        <div key={field.name} className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.description && (
              <div className="text-sm text-gray-500">{field.description}</div>
            )}
          </div>
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.default || false}
            render={({ field: controllerField }) => (
              <Switch
                checked={controllerField.value}
                onCheckedChange={controllerField.onChange}
              />
            )}
          />
        </div>
      );

    case 'select':
      return (
        <div key={field.name}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <select
            {...register(field.name, { required: field.required })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={field.default}
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldError && (
            <p className="text-sm text-red-600 mt-1">{fieldError.message}</p>
          )}
          {field.description && (
            <p className="text-sm text-gray-500 mt-1">{field.description}</p>
          )}
        </div>
      );

    case 'multiselect':
      return (
        <div key={field.name}>
          <Label>{field.label}</Label>
          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
            {field.options?.map((option) => (
              <Controller
                key={option.value}
                name={field.name}
                control={control}
                defaultValue={field.default || []}
                render={({ field: controllerField }) => (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={controllerField.value?.includes(option.value) || false}
                      onChange={(e) => {
                        const current = controllerField.value || [];
                        if (e.target.checked) {
                          controllerField.onChange([...current, option.value]);
                        } else {
                          controllerField.onChange(
                            current.filter((val: string) => val !== option.value)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                )}
              />
            ))}
          </div>
          {field.description && (
            <p className="text-sm text-gray-500 mt-1">{field.description}</p>
          )}
        </div>
      );

    default: // text, email, password, number
      return (
        <div key={field.name}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            type={field.type}
            {...register(field.name, { 
              required: field.required ? `${field.label} is required` : false 
            })}
            placeholder={field.placeholder}
            defaultValue={field.default}
            className={fieldError ? 'border-red-500' : ''}
          />
          {fieldError && (
            <p className="text-sm text-red-600 mt-1">{fieldError.message}</p>
          )}
          {field.description && (
            <p className="text-sm text-gray-500 mt-1">{field.description}</p>
          )}
        </div>
      );
  }
}

export default function ProviderForm({ provider, initialData, onSubmit }: ProviderFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {},
  });

  const watchedValues = watch();

  // Auto-submit when form data changes
  useEffect(() => {
    const subscription = watch((value) => {
      // Check if all required fields are filled
      const hasRequiredFields = provider.requiredFields.every(field => {
        const val = value[field.name];
        if (field.type === 'multiselect') {
          return Array.isArray(val) && val.length > 0;
        }
        return val !== undefined && val !== null && val !== '';
      });

      if (hasRequiredFields) {
        onSubmit(value);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, onSubmit, provider.requiredFields]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900 uppercase tracking-wide">
          Required Fields
        </h4>
        {provider.requiredFields.map((field) =>
          renderField(field, register, control, errors)
        )}
      </div>

      {provider.optionalFields && provider.optionalFields.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-900 uppercase tracking-wide">
            Optional Fields
          </h4>
          {provider.optionalFields.map((field) =>
            renderField(field, register, control, errors)
          )}
        </div>
      )}

      <div className="pt-4 border-t text-sm text-gray-500">
        <p>Configuration will be saved automatically as you fill out the form.</p>
      </div>
    </div>
  );
}
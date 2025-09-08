'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserInfo } from '@/contexts/WizardContext';

const userInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  workEmail: z.string().email('Please enter a valid email address'),
});

interface UserInfoFormProps {
  initialData: UserInfo | null;
  onSubmit: (data: UserInfo) => void;
}

export function UserInfoForm({ initialData, onSubmit }: UserInfoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: initialData || {
      fullName: '',
      workEmail: '',
    },
  });

  const watchedValues = watch();

  // Auto-submit when form changes and is valid
  useEffect(() => {
    const subscription = watch((value) => {
      const result = userInfoSchema.safeParse(value);
      if (result.success) {
        onSubmit(result.data);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, onSubmit]);

  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full Name *</Label>
        <Input
          id="fullName"
          {...register('fullName')}
          placeholder="John Doe"
          className={errors.fullName ? 'border-red-500' : ''}
        />
        {errors.fullName && (
          <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="workEmail">Work Email *</Label>
        <Input
          id="workEmail"
          type="email"
          {...register('workEmail')}
          placeholder="john.doe@company.com"
          className={errors.workEmail ? 'border-red-500' : ''}
        />
        {errors.workEmail && (
          <p className="text-sm text-red-600 mt-1">{errors.workEmail.message}</p>
        )}
      </div>

      <div className="text-sm text-gray-600">
        <p>* Required fields</p>
      </div>
    </form>
  );
}
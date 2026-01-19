// hooks/useProvisioningSubmit.ts
'use client';

import { useState } from 'react';
import { buildN8nPayload, validateN8nPayload } from '@/lib/n8n-payload-builder';

interface SubmissionState {
  loading: boolean;
  error: string | null;
  success: boolean;
  executionId: string | null;
}

export function useProvisioningSubmit() {
  const [state, setState] = useState<SubmissionState>({
    loading: false,
    error: null,
    success: false,
    executionId: null,
  });

  const submitToN8n = async (formData: {
    fullName: string;
    workEmail: string;
    selectedApps: string[];
    appConfigs: Record<string, any>;
  }) => {
    setState({ loading: true, error: null, success: false, executionId: null });

    try {
      // 1. Build the standardized payload
      const payload = buildN8nPayload(formData);

      // 2. Validate the payload
      const validation = validateN8nPayload(payload);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      console.log('Sending payload to n8n:', payload);

      // 3. Send to n8n webhook
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `n8n request failed: ${response.status} ${JSON.stringify(errorData)}`
        );
      }

      const result = await response.json();

      // 4. Extract execution ID for polling
      const executionId = result.executionId || result.id || null;

      setState({
        loading: false,
        error: null,
        success: true,
        executionId,
      });

      return { success: true, executionId, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Submission error:', errorMessage);

      setState({
        loading: false,
        error: errorMessage,
        success: false,
        executionId: null,
      });

      return { success: false, error: errorMessage };
    }
  };

  return {
    ...state,
    submitToN8n,
  };
}
import { z } from 'zod'

// User Information Schema
export const userInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  organization: z.string().min(2, 'Organization name must be at least 2 characters'),
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
})

export type UserInfoData = z.infer<typeof userInfoSchema>

// Provider Selection Schema
export const providerSelectionSchema = z.object({
  provider: z.string().min(1, 'Please select a cloud provider'),
  credentials: z.record(z.any()).optional(),
  configuration: z.record(z.any()).optional(),
})

export type ProviderSelectionData = z.infer<typeof providerSelectionSchema>

// Application Selection Schema
export const appSelectionSchema = z.object({
  selectedApps: z.array(z.string()).min(1, 'Please select at least one application'),
  configurations: z.record(z.any()).optional(),
})

export type AppSelectionData = z.infer<typeof appSelectionSchema>

// Complete Provisioning Schema
export const provisioningSchema = z.object({
  userInfo: userInfoSchema,
  provider: providerSelectionSchema,
  applications: appSelectionSchema,
  deploymentOptions: z.object({
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    region: z.string().optional(),
    autoScaling: z.boolean().default(false),
    monitoring: z.boolean().default(true),
    backups: z.boolean().default(true),
  }).optional(),
})

export type ProvisioningData = z.infer<typeof provisioningSchema>

// Authentication Schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginData = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export type RegisterData = z.infer<typeof registerSchema>

// Provider Credential Schemas
export const awsCredentialsSchema = z.object({
  accessKeyId: z.string().min(1, 'Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret Access Key is required'),
  region: z.string().default('us-east-1'),
})

export const azureCredentialsSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
})

export const gcpCredentialsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  keyFile: z.string().min(1, 'Service Account Key is required'),
  region: z.string().default('us-central1'),
})

export const dockerCredentialsSchema = z.object({
  registryUrl: z.string().url('Please enter a valid registry URL').optional(),
  username: z.string().optional(),
  password: z.string().optional(),
})

export const kubernetesCredentialsSchema = z.object({
  kubeconfig: z.string().min(1, 'Kubeconfig is required'),
  namespace: z.string().default('default'),
})
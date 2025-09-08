import { 
  Cloud, 
  Server, 
  Database, 
  Globe, 
  Shield, 
  Zap,
  Container,
  Layers,
  Settings,
  Monitor,
  Code,
  MessageSquare
} from 'lucide-react'

export interface Provider {
  id: string
  name: string
  description: string
  icon: any
  color: string
  features: string[]
  credentialFields?: {
    name: string
    type: 'text' | 'password' | 'select' | 'textarea'
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
  }[]
}

export const providers: Provider[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    description: 'Deploy to AWS with EC2, ECS, Lambda, and more',
    icon: Cloud,
    color: 'bg-orange-500',
    features: [
      'EC2 Instances',
      'ECS Containers',
      'Lambda Functions',
      'RDS Databases',
      'S3 Storage',
    ],
    credentialFields: [
      {
        name: 'accessKeyId',
        type: 'text',
        label: 'Access Key ID',
        placeholder: 'AKIA...',
        required: true,
      },
      {
        name: 'secretAccessKey',
        type: 'password',
        label: 'Secret Access Key',
        required: true,
      },
      {
        name: 'region',
        type: 'select',
        label: 'Default Region',
        required: true,
        options: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      },
    ],
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    description: 'Deploy to Azure with App Services, VMs, and containers',
    icon: Cloud,
    color: 'bg-blue-500',
    features: [
      'App Services',
      'Virtual Machines',
      'Container Instances',
      'SQL Database',
      'Blob Storage',
    ],
    credentialFields: [
      {
        name: 'subscriptionId',
        type: 'text',
        label: 'Subscription ID',
        required: true,
      },
      {
        name: 'clientId',
        type: 'text',
        label: 'Client ID',
        required: true,
      },
      {
        name: 'clientSecret',
        type: 'password',
        label: 'Client Secret',
        required: true,
      },
      {
        name: 'tenantId',
        type: 'text',
        label: 'Tenant ID',
        required: true,
      },
    ],
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    description: 'Deploy to GCP with Compute Engine, App Engine, and Cloud Run',
    icon: Cloud,
    color: 'bg-red-500',
    features: [
      'Compute Engine',
      'App Engine',
      'Cloud Run',
      'Cloud SQL',
      'Cloud Storage',
    ],
    credentialFields: [
      {
        name: 'projectId',
        type: 'text',
        label: 'Project ID',
        required: true,
      },
      {
        name: 'keyFile',
        type: 'textarea',
        label: 'Service Account Key (JSON)',
        placeholder: 'Paste your service account key JSON here...',
        required: true,
      },
      {
        name: 'region',
        type: 'select',
        label: 'Default Region',
        required: true,
        options: ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
      },
    ],
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Deploy containerized applications with Docker',
    icon: Container,
    color: 'bg-cyan-500',
    features: [
      'Container Deployment',
      'Multi-stage Builds',
      'Registry Integration',
      'Volume Management',
      'Network Configuration',
    ],
    credentialFields: [
      {
        name: 'registryUrl',
        type: 'text',
        label: 'Registry URL',
        placeholder: 'docker.io',
        required: false,
      },
      {
        name: 'username',
        type: 'text',
        label: 'Username',
        required: false,
      },
      {
        name: 'password',
        type: 'password',
        label: 'Password/Token',
        required: false,
      },
    ],
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Deploy to any Kubernetes cluster with Helm charts',
    icon: Layers,
    color: 'bg-purple-500',
    features: [
      'Helm Deployments',
      'Auto-scaling',
      'Service Mesh',
      'Ingress Configuration',
      'Secret Management',
    ],
    credentialFields: [
      {
        name: 'kubeconfig',
        type: 'textarea',
        label: 'Kubeconfig',
        placeholder: 'Paste your kubeconfig YAML here...',
        required: true,
      },
      {
        name: 'namespace',
        type: 'text',
        label: 'Default Namespace',
        placeholder: 'default',
        required: false,
      },
    ],
  },
]

export interface Application {
  id: string
  name: string
  description: string
  icon: any
  category: string
  supportedProviders: string[]
  defaultConfig: Record<string, any>
  configSchema?: {
    name: string
    type: 'text' | 'number' | 'boolean' | 'select'
    label: string
    required: boolean
    default?: any
    options?: string[]
  }[]
}

export const applications: Application[] = [
  {
    id: 'web-app',
    name: 'Web Application',
    description: 'Deploy a full-stack web application with frontend and backend',
    icon: Globe,
    category: 'Web',
    supportedProviders: ['aws', 'azure', 'gcp', 'kubernetes'],
    defaultConfig: {
      runtime: 'node',
      port: 3000,
      instances: 1,
    },
    configSchema: [
      {
        name: 'runtime',
        type: 'select',
        label: 'Runtime',
        required: true,
        default: 'node',
        options: ['node', 'python', 'java', 'php', 'ruby'],
      },
      {
        name: 'port',
        type: 'number',
        label: 'Port',
        required: true,
        default: 3000,
      },
      {
        name: 'instances',
        type: 'number',
        label: 'Number of Instances',
        required: true,
        default: 1,
      },
    ],
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Deploy a managed database (PostgreSQL, MySQL, or MongoDB)',
    icon: Database,
    category: 'Database',
    supportedProviders: ['aws', 'azure', 'gcp'],
    defaultConfig: {
      engine: 'postgresql',
      version: '13',
      storage: 20,
    },
    configSchema: [
      {
        name: 'engine',
        type: 'select',
        label: 'Database Engine',
        required: true,
        default: 'postgresql',
        options: ['postgresql', 'mysql', 'mongodb'],
      },
      {
        name: 'version',
        type: 'select',
        label: 'Version',
        required: true,
        default: '13',
        options: ['11', '12', '13', '14', '15'],
      },
      {
        name: 'storage',
        type: 'number',
        label: 'Storage (GB)',
        required: true,
        default: 20,
      },
    ],
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Deploy a RESTful API service with auto-scaling',
    icon: Server,
    category: 'API',
    supportedProviders: ['aws', 'azure', 'gcp', 'kubernetes'],
    defaultConfig: {
      runtime: 'node',
      port: 8080,
      autoscale: true,
    },
  },
  {
    id: 'monitoring',
    name: 'Monitoring Stack',
    description: 'Deploy Prometheus, Grafana, and alerting infrastructure',
    icon: Monitor,
    category: 'Monitoring',
    supportedProviders: ['kubernetes', 'docker'],
    defaultConfig: {
      retention: '30d',
      alerts: true,
    },
  },
  {
    id: 'ci-cd',
    name: 'CI/CD Pipeline',
    description: 'Set up continuous integration and deployment pipeline',
    icon: Code,
    category: 'DevOps',
    supportedProviders: ['aws', 'azure', 'gcp'],
    defaultConfig: {
      trigger: 'push',
      environments: ['staging', 'production'],
    },
  },
  {
    id: 'message-queue',
    name: 'Message Queue',
    description: 'Deploy Redis or RabbitMQ for message processing',
    icon: MessageSquare,
    category: 'Infrastructure',
    supportedProviders: ['aws', 'azure', 'gcp', 'kubernetes'],
    defaultConfig: {
      type: 'redis',
      replicas: 1,
    },
  },
]

export const getProviderById = (id: string): Provider | undefined => {
  return providers.find(provider => provider.id === id)
}

export const getApplicationById = (id: string): Application | undefined => {
  return applications.find(app => app.id === id)
}

export const getApplicationsByProvider = (providerId: string): Application[] => {
  return applications.filter(app => app.supportedProviders.includes(providerId))
}

export const getProvidersByApplication = (appId: string): Provider[] => {
  const app = getApplicationById(appId)
  if (!app) return []
  
  return providers.filter(provider => app.supportedProviders.includes(provider.id))
}
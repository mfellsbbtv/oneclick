import { getSession } from 'next-auth/react'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async getHeaders(): Promise<Headers> {
    const headers = new Headers({
      'Content-Type': 'application/json',
    })

    // Add authorization header if user is logged in
    const session = await getSession()
    if (session?.user) {
      headers.append('Authorization', `Bearer ${session.accessToken}`)
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.getHeaders()

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('Content-Type')
      if (contentType && contentType.includes('application/json')) {
        return response.json()
      }

      return response.text() as unknown as T
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Authentication
  async login(credentials: { email: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async register(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  // Users
  async getProfile() {
    return this.request('/users/profile')
  }

  async updateProfile(data: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Providers
  async getProviders() {
    return this.request('/providers')
  }

  async getProviderById(id: string) {
    return this.request(`/providers/${id}`)
  }

  // Provisioning
  async createProvisioningJob(data: {
    provider: string
    applications: string[]
    configuration: any
    userInfo: any
  }) {
    return this.request('/provisioning/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getProvisioningJob(id: string) {
    return this.request(`/provisioning/jobs/${id}`)
  }

  async getProvisioningJobs() {
    return this.request('/provisioning/jobs')
  }

  async cancelProvisioningJob(id: string) {
    return this.request(`/provisioning/jobs/${id}/cancel`, {
      method: 'POST',
    })
  }
}

export const apiClient = new ApiClient()

// React Query hooks
export const useApiQuery = <T>(
  key: string[],
  queryFn: () => Promise<T>,
  options?: any
) => {
  // This would typically use @tanstack/react-query
  // For now, it's a placeholder for the actual implementation
  return {
    data: null,
    isLoading: false,
    error: null,
    ...options,
  }
}

export const useApiMutation = <T>(
  mutationFn: (variables: any) => Promise<T>,
  options?: any
) => {
  // This would typically use @tanstack/react-query
  // For now, it's a placeholder for the actual implementation
  return {
    mutate: mutationFn,
    isLoading: false,
    error: null,
    ...options,
  }
}
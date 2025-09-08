// Core Provisioner Interface matching requirements
export interface Provisioner {
  /**
   * Validate the provisioning input
   * @param input - Raw input data to validate
   * @returns Promise<ValidatedInput> - Validated and normalized input
   */
  validate(input: unknown): Promise<ValidatedInput>;

  /**
   * Create a provisioning plan without executing it
   * @param input - Validated input from validate()
   * @returns Promise<Plan> - The planned actions to be taken
   */
  plan(input: ValidatedInput): Promise<Plan>;

  /**
   * Apply the provisioning plan and create/update resources
   * Must be idempotent - safe to retry
   * @param input - Validated input from validate()
   * @returns Promise<Result> - The result of the provisioning operation
   */
  apply(input: ValidatedInput): Promise<Result>;
}

// Validated input structure
export interface ValidatedInput {
  provider: string;
  data: Record<string, any>;
}

// Planning structure
export interface Plan {
  provider: string;
  actions: Action[];
  estimated_time?: number; // in seconds
  estimated_cost?: number;
  dependencies?: string[];
}

export interface Action {
  type: 'create' | 'update' | 'assign' | 'delete';
  resource: string;
  details: string;
  required?: boolean;
}

// Result structure
export interface Result {
  provider: string;
  status: 'success' | 'partial' | 'error' | 'pending';
  external_ids?: Record<string, string>;
  external_links?: Record<string, string>;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
  raw_response?: any;
}

// Provider metadata
export interface ProviderMetadata {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  requiredScopes?: string[];
  requiredFields: FieldDefinition[];
  optionalFields?: FieldDefinition[];
  defaultConfig?: Record<string, any>;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'multiselect' | 'boolean' | 'number';
  required: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  description?: string;
  placeholder?: string;
  dependsOn?: {
    field: string;
    value: any;
  };
}

// Provider registry interface
export interface ProviderRegistry {
  register(provider: string, implementation: Provisioner, metadata: ProviderMetadata): void;
  get(provider: string): Provisioner;
  getMetadata(provider: string): ProviderMetadata;
  list(): string[];
  listWithMetadata(): Array<{ provider: string; metadata: ProviderMetadata }>;
}
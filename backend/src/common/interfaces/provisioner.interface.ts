export interface ProvisioningPlan {
  id: string;
  provider: string;
  resources: ResourcePlan[];
  estimatedCost?: number;
  estimatedTime?: number;
  dependencies?: string[];
}

export interface ResourcePlan {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  dependencies?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ApplyResult {
  success: boolean;
  resourceId?: string;
  message?: string;
  error?: string;
  outputs?: Record<string, any>;
}

export interface ProvisionerInterface {
  /**
   * Validate the provisioning configuration
   * @param config - The configuration to validate
   * @returns Promise<ValidationResult> - Validation result with any errors or warnings
   */
  validate(config: Record<string, any>): Promise<ValidationResult>;

  /**
   * Create a provisioning plan without executing it
   * @param config - The configuration to plan for
   * @returns Promise<ProvisioningPlan> - The planned resources and actions
   */
  plan(config: Record<string, any>): Promise<ProvisioningPlan>;

  /**
   * Apply the provisioning plan and create resources
   * @param plan - The provisioning plan to execute
   * @returns Promise<ApplyResult> - The result of the provisioning operation
   */
  apply(plan: ProvisioningPlan): Promise<ApplyResult>;

  /**
   * Get the current status of provisioned resources
   * @param resourceId - The ID of the resource to check
   * @returns Promise<any> - The current status and properties of the resource
   */
  getStatus?(resourceId: string): Promise<any>;

  /**
   * Destroy/deprovision resources
   * @param resourceId - The ID of the resource to destroy
   * @returns Promise<ApplyResult> - The result of the destroy operation
   */
  destroy?(resourceId: string): Promise<ApplyResult>;
}
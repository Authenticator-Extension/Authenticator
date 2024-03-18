interface ValidationResult {
  valid: boolean;
  message?: string;
}

interface PermissionInterface {
  id: string;
  description: string;
  revocable: boolean;
  validation?: Array<() => ValidationResult | Promise<ValidationResult>>;
}

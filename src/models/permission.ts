export class Permission implements PermissionInterface {
  id: string;
  description: string;
  revocable: boolean;
  validation?: Array<() => ValidationResult | Promise<ValidationResult>>;

  constructor(permission: PermissionInterface) {
    this.id = permission.id;
    this.description = permission.description;
    this.revocable = permission.revocable;
    this.validation = permission.validation;
  }
}

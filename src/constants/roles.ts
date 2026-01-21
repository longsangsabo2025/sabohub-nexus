/// Shared role definitions for SABOHUB
/// Used by both web (sabohub-nexus) and Flutter (sabohub-app)
export enum SaboRole {
  ceo,
  manager,
  shiftLeader,
  staff,
}

export namespace SaboRole {
  /// Get display name in Vietnamese
  export function displayName(role: SaboRole): string {
    switch (role) {
      case SaboRole.ceo:
        return 'CEO';
      case SaboRole.manager:
        return 'Quản lý';
      case SaboRole.shiftLeader:
        return 'Tổ trưởng';
      case SaboRole.staff:
        return 'Nhân viên';
    }
  }

  /// Convert from string (case-insensitive)
  export function fromString(role: string): SaboRole {
    switch (role.toUpperCase()) {
      case 'CEO':
        return SaboRole.ceo;
      case 'MANAGER':
        return SaboRole.manager;
      case 'SHIFT_LEADER':
        return SaboRole.shiftLeader;
      case 'STAFF':
        return SaboRole.staff;
      default:
        return SaboRole.staff; // Default fallback
    }
  }

  /// Convert to lowercase string (for web compatibility)
  export function toLowerString(role: SaboRole): string {
    return SaboRole[role].toLowerCase();
  }

  /// Convert to uppercase string (for database storage)
  export function toUpperString(role: SaboRole): string {
    return SaboRole[role].toUpperCase();
  }

  /// Check if role can access management features
  export function isManager(role: SaboRole): boolean {
    return role === SaboRole.manager || role === SaboRole.ceo;
  }

  /// Check if role is executive level
  export function isExecutive(role: SaboRole): boolean {
    return role === SaboRole.ceo;
  }

  /// Check if role can manage employees
  export function canManageEmployees(role: SaboRole): boolean {
    return isManager(role) || isExecutive(role);
  }

  /// Check if role can view reports
  export function canViewReports(role: SaboRole): boolean {
    return isManager(role) || isExecutive(role);
  }
}

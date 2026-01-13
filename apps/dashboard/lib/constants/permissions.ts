/**
 * Canonical Permissions Constants
 *
 * This file defines all permissions used throughout the dashboard application.
 * It serves as the single source of truth for permission definitions, categories,
 * and helper functions for permission checking.
 *
 * @module lib/constants/permissions
 */

/**
 * All available permissions in the system.
 * These are the atomic permission values stored in the database and used for authorization.
 */
export const PERMISSIONS = {
  /** Access to view the main dashboard */
  VIEW_DASHBOARD: 'view_dashboard',
  /** Access to view application listings and details */
  VIEW_APPLICATIONS: 'view_applications',
  /** Ability to process and review applications */
  PROCESS_APPLICATIONS: 'process_applications',
  /** Full management of applications including approval/rejection */
  MANAGE_APPLICATIONS: 'manage_applications',
  /** Ability to create, edit, and delete campuses */
  EDIT_CAMPUSES: 'edit_campuses',
  /** Ability to create, edit, and delete faculties */
  EDIT_FACULTIES: 'edit_faculties',
  /** Ability to create, edit, and delete courses */
  EDIT_COURSES: 'edit_courses',
  /** Access to view reports and analytics */
  VIEW_REPORTS: 'view_reports',
  /** Ability to export data to external formats */
  EXPORT_DATA: 'export_data',
  /** Ability to manage team members and their roles */
  MANAGE_TEAM: 'manage_team',
  /** Access to institution and system settings */
  MANAGE_SETTINGS: 'manage_settings',
  /** Full administrative access - grants all permissions */
  ADMIN_ACCESS: 'admin_access',
  /** Ability to export application data to external formats */
  EXPORT_APPLICATIONS: 'export_applications',
} as const;

/**
 * Type representing all valid permission values.
 * Derived from the PERMISSIONS constant for type safety.
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Categories used to group related permissions.
 */
export type PermissionCategory =
  | 'access'
  | 'applications'
  | 'academic'
  | 'reporting'
  | 'administration';

/**
 * Structure for detailed permission information.
 */
export interface PermissionDetail {
  /** Human-readable name for the permission */
  label: string;
  /** Detailed description of what this permission allows */
  description: string;
  /** Category this permission belongs to */
  category: PermissionCategory;
}

/**
 * Detailed information for each permission including labels, descriptions, and categories.
 * Useful for UI display and documentation purposes.
 */
export const PERMISSION_DETAILS: Record<Permission, PermissionDetail> = {
  [PERMISSIONS.VIEW_DASHBOARD]: {
    label: 'View Dashboard',
    description: 'Access to view the main dashboard with overview metrics and statistics',
    category: 'access',
  },
  [PERMISSIONS.VIEW_APPLICATIONS]: {
    label: 'View Applications',
    description: 'Access to view application listings, details, and applicant information',
    category: 'applications',
  },
  [PERMISSIONS.PROCESS_APPLICATIONS]: {
    label: 'Process Applications',
    description:
      'Ability to review applications, add notes, request documents, and update application status',
    category: 'applications',
  },
  [PERMISSIONS.MANAGE_APPLICATIONS]: {
    label: 'Manage Applications',
    description:
      'Full management of applications including final approval, rejection, and bulk operations',
    category: 'applications',
  },
  [PERMISSIONS.EDIT_CAMPUSES]: {
    label: 'Edit Campuses',
    description: 'Create, update, and delete campuses',
    category: 'academic',
  },
  [PERMISSIONS.EDIT_FACULTIES]: {
    label: 'Edit Faculties',
    description: 'Create, update, and delete faculties',
    category: 'academic',
  },
  [PERMISSIONS.EDIT_COURSES]: {
    label: 'Edit Courses',
    description:
      'Ability to create, update, and delete courses, programs, and their requirements',
    category: 'academic',
  },
  [PERMISSIONS.VIEW_REPORTS]: {
    label: 'View Reports',
    description: 'Access to view analytics, reports, and statistical data about applications',
    category: 'reporting',
  },
  [PERMISSIONS.EXPORT_DATA]: {
    label: 'Export Data',
    description: 'Ability to export application data, reports, and records to external formats',
    category: 'reporting',
  },
  [PERMISSIONS.MANAGE_TEAM]: {
    label: 'Manage Team',
    description: 'Ability to invite, remove, and manage team member roles and permissions',
    category: 'administration',
  },
  [PERMISSIONS.MANAGE_SETTINGS]: {
    label: 'Manage Settings',
    description:
      'Access to configure institution settings, integrations, and system preferences',
    category: 'administration',
  },
  [PERMISSIONS.ADMIN_ACCESS]: {
    label: 'Admin Access',
    description:
      'Full administrative access that implicitly grants all other permissions in the system',
    category: 'administration',
  },
  [PERMISSIONS.EXPORT_APPLICATIONS]: {
    label: 'Export Applications',
    description: 'Export application data to external formats (CSV, Excel, PDF)',
    category: 'administration',
  },
};

/**
 * Permissions grouped by their category.
 * Useful for displaying permissions in organized sections in the UI.
 */
export const PERMISSION_GROUPS: Record<PermissionCategory, Permission[]> = {
  access: [PERMISSIONS.VIEW_DASHBOARD],
  applications: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.PROCESS_APPLICATIONS,
    PERMISSIONS.MANAGE_APPLICATIONS,
  ],
  academic: [PERMISSIONS.EDIT_CAMPUSES, PERMISSIONS.EDIT_FACULTIES, PERMISSIONS.EDIT_COURSES],
  reporting: [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.EXPORT_DATA],
  administration: [PERMISSIONS.MANAGE_TEAM, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.ADMIN_ACCESS, PERMISSIONS.EXPORT_APPLICATIONS],
};

/**
 * Category labels for UI display.
 */
export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  access: 'Access',
  applications: 'Applications',
  academic: 'Academic',
  reporting: 'Reporting',
  administration: 'Administration',
};

/**
 * Array of all permission values.
 * Useful when you need a static array of all permissions without calling a function.
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/**
 * Permissions that can be selected when assigning to team members.
 * Excludes view_dashboard as it is granted to all team members by default.
 */
export const SELECTABLE_PERMISSIONS = ALL_PERMISSIONS.filter(
  (p) => p !== PERMISSIONS.VIEW_DASHBOARD
);

/**
 * Returns an array of all permission values.
 *
 * @returns Array containing all permission string values
 *
 * @example
 * ```typescript
 * const allPerms = getAllPermissions();
 * // ['view_dashboard', 'view_applications', ...]
 * ```
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}

/**
 * Expands admin_access to include all permissions.
 * If the user has admin_access, returns all permissions.
 * Otherwise, returns the original permissions array.
 *
 * @param permissions - Array of permissions the user currently has
 * @returns Expanded array of permissions (all permissions if admin_access is present)
 *
 * @example
 * ```typescript
 * const perms = expandAdminAccess(['admin_access']);
 * // Returns all 10 permissions
 *
 * const limitedPerms = expandAdminAccess(['view_dashboard', 'view_applications']);
 * // Returns ['view_dashboard', 'view_applications']
 * ```
 */
export function expandAdminAccess(permissions: Permission[]): Permission[] {
  if (permissions.includes(PERMISSIONS.ADMIN_ACCESS)) {
    return getAllPermissions();
  }
  return permissions;
}

/**
 * Checks if a user has a specific permission.
 * Respects admin_access, which grants all permissions.
 *
 * @param userPermissions - Array of permissions the user has
 * @param required - The permission to check for
 * @returns true if the user has the required permission (or has admin_access)
 *
 * @example
 * ```typescript
 * const userPerms: Permission[] = ['view_dashboard', 'view_applications'];
 *
 * hasPermission(userPerms, 'view_dashboard'); // true
 * hasPermission(userPerms, 'manage_team'); // false
 *
 * const adminPerms: Permission[] = ['admin_access'];
 * hasPermission(adminPerms, 'manage_team'); // true (admin has all permissions)
 * ```
 */
export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  // Admin access grants all permissions
  if (userPermissions.includes(PERMISSIONS.ADMIN_ACCESS)) {
    return true;
  }
  return userPermissions.includes(required);
}

/**
 * Checks if a user has all of the specified permissions.
 * Respects admin_access, which grants all permissions.
 *
 * @param userPermissions - Array of permissions the user has
 * @param required - Array of permissions to check for
 * @returns true if the user has all required permissions
 *
 * @example
 * ```typescript
 * const userPerms: Permission[] = ['view_dashboard', 'view_applications'];
 *
 * hasAllPermissions(userPerms, ['view_dashboard']); // true
 * hasAllPermissions(userPerms, ['view_dashboard', 'manage_team']); // false
 * ```
 */
export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  return required.every((perm) => hasPermission(userPermissions, perm));
}

/**
 * Checks if a user has any of the specified permissions.
 * Respects admin_access, which grants all permissions.
 *
 * @param userPermissions - Array of permissions the user has
 * @param required - Array of permissions to check for
 * @returns true if the user has at least one of the required permissions
 *
 * @example
 * ```typescript
 * const userPerms: Permission[] = ['view_dashboard'];
 *
 * hasAnyPermission(userPerms, ['view_dashboard', 'view_applications']); // true
 * hasAnyPermission(userPerms, ['manage_team', 'manage_settings']); // false
 * ```
 */
export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  // Admin access grants all permissions
  if (userPermissions.includes(PERMISSIONS.ADMIN_ACCESS)) {
    return true;
  }
  return required.some((perm) => userPermissions.includes(perm));
}

/**
 * Gets the category for a given permission.
 *
 * @param permission - The permission to get the category for
 * @returns The category the permission belongs to
 *
 * @example
 * ```typescript
 * getPermissionCategory('view_applications'); // 'applications'
 * getPermissionCategory('admin_access'); // 'administration'
 * ```
 */
export function getPermissionCategory(permission: Permission): PermissionCategory {
  return PERMISSION_DETAILS[permission].category;
}

/**
 * Gets all permissions in a specific category.
 *
 * @param category - The category to get permissions for
 * @returns Array of permissions in the specified category
 *
 * @example
 * ```typescript
 * getPermissionsByCategory('applications');
 * // ['view_applications', 'process_applications', 'manage_applications']
 * ```
 */
export function getPermissionsByCategory(category: PermissionCategory): Permission[] {
  return PERMISSION_GROUPS[category];
}

/**
 * Validates if a string is a valid permission.
 *
 * @param value - The string to validate
 * @returns true if the value is a valid permission
 *
 * @example
 * ```typescript
 * isValidPermission('view_dashboard'); // true
 * isValidPermission('invalid_permission'); // false
 * ```
 */
export function isValidPermission(value: string): value is Permission {
  return getAllPermissions().includes(value as Permission);
}

/**
 * Filters an array of strings to only include valid permissions.
 *
 * @param values - Array of strings to filter
 * @returns Array containing only valid permissions
 *
 * @example
 * ```typescript
 * filterValidPermissions(['view_dashboard', 'invalid', 'admin_access']);
 * // ['view_dashboard', 'admin_access']
 * ```
 */
export function filterValidPermissions(values: string[]): Permission[] {
  return values.filter(isValidPermission);
}

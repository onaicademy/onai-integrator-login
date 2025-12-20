/**
 * Role-Based Access Control (RBAC) System
 * Manages permissions for different user roles
 */

// ============================================
// Role Definitions
// ============================================

export type Role = 'admin' | 'manager' | 'targetologist' | 'analyst' | 'viewer';

export const ROLES: Record<Role, { name: string; level: number; description: string }> = {
  admin: { 
    name: 'Administrator', 
    level: 100, 
    description: 'Full system access - can manage users, settings, and all data' 
  },
  manager: { 
    name: 'Manager', 
    level: 75, 
    description: 'Team management - can view all teams and manage campaigns' 
  },
  targetologist: { 
    name: 'Targetologist', 
    level: 50, 
    description: 'Campaign operator - can manage own campaigns and view analytics' 
  },
  analyst: { 
    name: 'Analyst', 
    level: 25, 
    description: 'Analytics viewer - read-only access to reports and data' 
  },
  viewer: { 
    name: 'Viewer', 
    level: 10, 
    description: 'Basic viewer - limited read-only access' 
  }
};

// ============================================
// Permission Definitions
// ============================================

export type Permission = 
  // Dashboard
  | 'dashboard:view'
  | 'dashboard:view_all_teams'
  | 'dashboard:export'
  
  // Analytics
  | 'analytics:view'
  | 'analytics:view_detailed'
  | 'analytics:export'
  | 'analytics:manage_reports'
  
  // Campaigns
  | 'campaigns:view'
  | 'campaigns:create'
  | 'campaigns:edit'
  | 'campaigns:delete'
  | 'campaigns:view_all'
  
  // Team
  | 'team:view'
  | 'team:view_all'
  | 'team:manage'
  | 'team:create'
  
  // Users
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:manage_roles'
  
  // Settings
  | 'settings:view'
  | 'settings:edit_personal'
  | 'settings:edit_system'
  
  // Admin
  | 'admin:access'
  | 'admin:audit_logs'
  | 'admin:system_config';

// ============================================
// Role-Permission Mapping
// ============================================

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'dashboard:view', 'dashboard:view_all_teams', 'dashboard:export',
    'analytics:view', 'analytics:view_detailed', 'analytics:export', 'analytics:manage_reports',
    'campaigns:view', 'campaigns:create', 'campaigns:edit', 'campaigns:delete', 'campaigns:view_all',
    'team:view', 'team:view_all', 'team:manage', 'team:create',
    'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_roles',
    'settings:view', 'settings:edit_personal', 'settings:edit_system',
    'admin:access', 'admin:audit_logs', 'admin:system_config'
  ],
  manager: [
    'dashboard:view', 'dashboard:view_all_teams', 'dashboard:export',
    'analytics:view', 'analytics:view_detailed', 'analytics:export',
    'campaigns:view', 'campaigns:create', 'campaigns:edit', 'campaigns:view_all',
    'team:view', 'team:view_all', 'team:manage',
    'users:view', 'users:edit',
    'settings:view', 'settings:edit_personal'
  ],
  targetologist: [
    'dashboard:view', 'dashboard:export',
    'analytics:view', 'analytics:view_detailed',
    'campaigns:view', 'campaigns:create', 'campaigns:edit',
    'team:view',
    'settings:view', 'settings:edit_personal'
  ],
  analyst: [
    'dashboard:view',
    'analytics:view', 'analytics:view_detailed', 'analytics:export',
    'campaigns:view',
    'team:view',
    'settings:view', 'settings:edit_personal'
  ],
  viewer: [
    'dashboard:view',
    'analytics:view',
    'team:view',
    'settings:view'
  ]
};

// ============================================
// Resource Access Rules
// ============================================

interface ResourceRule {
  resource: string;
  requiredPermission: Permission;
  additionalCheck?: (context: PermissionContext) => boolean;
}

const RESOURCE_RULES: ResourceRule[] = [
  { resource: '/admin', requiredPermission: 'admin:access' },
  { resource: '/admin/users', requiredPermission: 'users:view' },
  { resource: '/admin/settings', requiredPermission: 'settings:edit_system' },
  { resource: '/admin/audit', requiredPermission: 'admin:audit_logs' },
  { resource: '/analytics/detailed', requiredPermission: 'analytics:view_detailed' },
  { resource: '/campaigns/new', requiredPermission: 'campaigns:create' },
  { resource: '/settings', requiredPermission: 'settings:view' }
];

// ============================================
// Permission Checker Class
// ============================================

interface PermissionContext {
  userId?: string;
  userRole: Role;
  userTeam?: string;
  resourceOwnerId?: string;
  resourceTeam?: string;
}

class PermissionsClass {
  private currentUser: PermissionContext | null = null;

  /**
   * Set current user context
   */
  setUser(user: PermissionContext | null): void {
    this.currentUser = user;
  }

  /**
   * Get current user context
   */
  getUser(): PermissionContext | null {
    return this.currentUser;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: Permission, context?: PermissionContext): boolean {
    const ctx = context || this.currentUser;
    if (!ctx) return false;

    const rolePermissions = ROLE_PERMISSIONS[ctx.userRole] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[], context?: PermissionContext): boolean {
    return permissions.some(p => this.hasPermission(p, context));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: Permission[], context?: PermissionContext): boolean {
    return permissions.every(p => this.hasPermission(p, context));
  }

  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if user can access a resource
   */
  canAccessResource(resourcePath: string, context?: PermissionContext): boolean {
    const ctx = context || this.currentUser;
    if (!ctx) return false;

    // Find matching resource rule
    const rule = RESOURCE_RULES.find(r => resourcePath.startsWith(r.resource));
    
    if (!rule) return true; // No rule means allowed
    
    // Check base permission
    if (!this.hasPermission(rule.requiredPermission, ctx)) {
      return false;
    }

    // Check additional rule if exists
    if (rule.additionalCheck && !rule.additionalCheck(ctx)) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can perform action on resource
   */
  canPerformAction(
    action: 'view' | 'create' | 'edit' | 'delete',
    resourceType: 'campaign' | 'user' | 'team' | 'settings',
    context?: PermissionContext
  ): boolean {
    const ctx = context || this.currentUser;
    if (!ctx) return false;

    const permission = `${resourceType}s:${action}` as Permission;
    return this.hasPermission(permission, ctx);
  }

  /**
   * Check if user owns a resource
   */
  isResourceOwner(resourceOwnerId: string, context?: PermissionContext): boolean {
    const ctx = context || this.currentUser;
    if (!ctx || !ctx.userId) return false;
    return ctx.userId === resourceOwnerId;
  }

  /**
   * Check if user is in the same team as resource
   */
  isSameTeam(resourceTeam: string, context?: PermissionContext): boolean {
    const ctx = context || this.currentUser;
    if (!ctx || !ctx.userTeam) return false;
    return ctx.userTeam === resourceTeam;
  }

  /**
   * Check if user can view all teams
   */
  canViewAllTeams(context?: PermissionContext): boolean {
    return this.hasPermission('dashboard:view_all_teams', context);
  }

  /**
   * Get role information
   */
  getRoleInfo(role: Role): typeof ROLES[Role] | null {
    return ROLES[role] || null;
  }

  /**
   * Compare role levels
   */
  isRoleHigherOrEqual(userRole: Role, requiredRole: Role): boolean {
    const userLevel = ROLES[userRole]?.level || 0;
    const requiredLevel = ROLES[requiredRole]?.level || 0;
    return userLevel >= requiredLevel;
  }

  /**
   * Filter list based on permissions
   */
  filterByPermission<T extends { team?: string; ownerId?: string }>(
    items: T[],
    context?: PermissionContext
  ): T[] {
    const ctx = context || this.currentUser;
    if (!ctx) return [];

    // Admin and managers can see all
    if (this.canViewAllTeams(ctx)) {
      return items;
    }

    // Filter by team or ownership
    return items.filter(item => {
      if (item.ownerId && ctx.userId === item.ownerId) return true;
      if (item.team && ctx.userTeam === item.team) return true;
      return false;
    });
  }

  /**
   * Get navigation items based on permissions
   */
  getNavigationItems(context?: PermissionContext): { path: string; label: string; icon?: string }[] {
    const ctx = context || this.currentUser;
    if (!ctx) return [];

    const items: { path: string; label: string; icon?: string; permission?: Permission }[] = [
      { path: '/dashboard', label: 'Dashboard', icon: 'home', permission: 'dashboard:view' },
      { path: '/analytics', label: 'Analytics', icon: 'chart', permission: 'analytics:view' },
      { path: '/campaigns', label: 'Campaigns', icon: 'target', permission: 'campaigns:view' },
      { path: '/team', label: 'Team', icon: 'users', permission: 'team:view' },
      { path: '/settings', label: 'Settings', icon: 'settings', permission: 'settings:view' },
      { path: '/admin', label: 'Admin', icon: 'shield', permission: 'admin:access' }
    ];

    return items.filter(item => 
      !item.permission || this.hasPermission(item.permission, ctx)
    );
  }

  /**
   * Require permission (throws error if not allowed)
   */
  requirePermission(permission: Permission, context?: PermissionContext): void {
    if (!this.hasPermission(permission, context)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  /**
   * Create authorization guard for routes
   */
  createGuard(requiredPermissions: Permission[]) {
    return (context?: PermissionContext): boolean => {
      return this.hasAllPermissions(requiredPermissions, context);
    };
  }
}

// Export singleton instance
export const Permissions = new PermissionsClass();

// Export class for testing/custom instances
export { PermissionsClass };

// Export all types
export { ROLE_PERMISSIONS, RESOURCE_RULES };

// React hook-style helper (for React components)
export function usePermission(permission: Permission): boolean {
  return Permissions.hasPermission(permission);
}

export function useRole(): Role | null {
  return Permissions.getUser()?.userRole || null;
}

export default Permissions;

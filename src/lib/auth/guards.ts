import { redirect, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { MembershipRole, SessionUser } from './types';

/**
 * Centralized authorization guards
 * Single source of truth for all auth/org/role checks
 */

/**
 * Role hierarchy levels
 * Higher numbers = more permissions
 * Used for hierarchical role checking (hr_admin can access manager/employee pages)
 */
const ROLE_LEVEL: Record<MembershipRole, number> = {
	employee: 1,
	manager: 2,
	hr_admin: 3
};

/**
 * Require user to be authenticated
 * Redirects to signin if not authenticated
 */
export function requireUser(event: RequestEvent): SessionUser {
	const user = event.locals.user;
	if (!user) {
		throw redirect(303, '/auth/signin');
	}
	return user;
}

/**
 * Require user to have an organization
 * Redirects to onboarding if no org
 */
export function requireOrg(user: SessionUser): void {
	if (!user.current_organization_id) {
		throw redirect(303, '/onboarding');
	}
}

/**
 * Require user to have a specific role (strict equality)
 * Returns 403 Forbidden if role doesn't match exactly
 * Use this when you need exact role match
 */
export function requireRole(user: SessionUser, requiredRole: MembershipRole): void {
	if (!user.current_organization_id || !user.current_role) {
		throw redirect(303, '/onboarding');
	}

	if (user.current_role !== requiredRole) {
		throw error(403, 'Forbidden');
	}
}

/**
 * Require user to have a role at or above the required level (hierarchical)
 * hr_admin can access manager/employee pages
 * manager can access employee pages
 * employee can only access employee pages
 */
export function requireRoleOrHigher(user: SessionUser, requiredRole: MembershipRole): void {
	if (!user.current_organization_id || !user.current_role) {
		throw redirect(303, '/onboarding');
	}

	const userLevel = ROLE_LEVEL[user.current_role];
	const requiredLevel = ROLE_LEVEL[requiredRole];

	if (userLevel < requiredLevel) {
		throw error(403, 'Forbidden');
	}
}

/**
 * Require user to have one of the specified roles
 */
export function requireAnyRole(user: SessionUser, allowedRoles: MembershipRole[]): void {
	if (!user.current_organization_id || !user.current_role) {
		throw redirect(303, '/onboarding');
	}

	if (!allowedRoles.includes(user.current_role)) {
		throw error(403, 'Forbidden');
	}
}

/**
 * Combined guard: Require authenticated user with organization
 * Common pattern for app routes
 */
export function requireUserWithOrg(event: RequestEvent): SessionUser {
	const user = requireUser(event);
	requireOrg(user);
	return user;
}

/**
 * Combined guard: Require authenticated user with specific role or higher (hierarchical)
 * Common pattern for role-based routes
 * 
 * Examples:
 * - requireUserWithRole(event, 'manager') allows hr_admin and manager
 * - requireUserWithRole(event, 'employee') allows all roles
 * - requireUserWithRole(event, 'hr_admin') allows only hr_admin
 */
export function requireUserWithRole(
	event: RequestEvent,
	requiredRole: MembershipRole
): SessionUser {
	const user = requireUser(event);
	requireOrg(user);
	
	if (!user.current_role) {
		throw error(500, 'User role missing');
	}

	const userLevel = ROLE_LEVEL[user.current_role];
	const requiredLevel = ROLE_LEVEL[requiredRole];

	if (userLevel < requiredLevel) {
		throw error(403, 'Forbidden');
	}

	return user;
}

/**
 * Combined guard: Require authenticated user with any of specified roles
 */
export function requireUserWithAnyRole(
	event: RequestEvent,
	allowedRoles: MembershipRole[]
): SessionUser {
	const user = requireUser(event);
	requireOrg(user);
	requireAnyRole(user, allowedRoles);
	return user;
}


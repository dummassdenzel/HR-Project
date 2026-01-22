import { redirect, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { MembershipRole, SessionUser } from './types';

/**
 * Centralized authorization guards
 * Single source of truth for all auth/org/role checks
 */

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
 * Require user to have a specific role
 * Returns 403 Forbidden if role doesn't match
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
 * Combined guard: Require authenticated user with specific role
 * Common pattern for role-based routes
 */
export function requireUserWithRole(
	event: RequestEvent,
	requiredRole: MembershipRole
): SessionUser {
	const user = requireUser(event);
	requireOrg(user);
	requireRole(user, requiredRole);
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


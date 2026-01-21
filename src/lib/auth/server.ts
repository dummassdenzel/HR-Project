// Phase 1: Single organization per user
// Phase 2: Multi-organization context selection

import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { MembershipRole, SessionUser } from './types';

/**
 * Get the current authenticated user from locals (already fetched in hooks.server.ts)
 * Returns null if not authenticated
 * 
 * This is efficient - user is cached in event.locals for the request lifecycle
 */
export function getSessionUser(event: RequestEvent): SessionUser | null {
	return event.locals.user ?? null;
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export function requireAuth(event: RequestEvent): SessionUser {
	const user = event.locals.user;
	if (!user) {
		throw redirect(303, '/login');
	}
	return user;
}

/**
 * Require user to have a specific role in their current organization
 * Redirects to unauthorized if role doesn't match
 */
export function requireRole(
	event: RequestEvent,
	requiredRole: MembershipRole
): SessionUser {
	const user = requireAuth(event);
	
	if (!user.current_organization_id || !user.current_role) {
		throw redirect(303, '/onboarding');
	}

	if (user.current_role !== requiredRole) {
		throw redirect(303, '/unauthorized');
	}

	return user;
}

/**
 * Require user to have one of the specified roles
 */
export function requireAnyRole(
	event: RequestEvent,
	allowedRoles: MembershipRole[]
): SessionUser {
	const user = requireAuth(event);
	
	if (!user.current_organization_id || !user.current_role) {
		throw redirect(303, '/onboarding');
	}

	if (!allowedRoles.includes(user.current_role)) {
		throw redirect(303, '/unauthorized');
	}

	return user;
}

/**
 * Check if user has a specific role (non-throwing, returns boolean)
 */
export function hasRole(
	event: RequestEvent,
	requiredRole: MembershipRole
): boolean {
	const user = event.locals.user;
	return user?.current_role === requiredRole;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
	event: RequestEvent,
	allowedRoles: MembershipRole[]
): boolean {
	const user = event.locals.user;
	return user?.current_role ? allowedRoles.includes(user.current_role) : false;
}

/**
 * Get user's current organization ID
 */
export function getCurrentOrganizationId(event: RequestEvent): string | null {
	const user = event.locals.user;
	return user?.current_organization_id ?? null;
}


import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { requireUserWithOrg } from '$lib/auth/guards';

/**
 * Dashboard - Role-based redirect resolver
 * Redirects users to their appropriate landing page based on role
 * 
 * hr_admin → /app/admin
 * manager → /app/manager
 * employee → /app/member
 */
export async function load(event: RequestEvent) {
	const user = requireUserWithOrg(event);

	// Redirect based on role hierarchy
	if (user.current_role === 'hr_admin') {
		throw redirect(303, '/app/admin');
	}

	if (user.current_role === 'manager') {
		throw redirect(303, '/app/manager');
	}

	// Default to member area
	throw redirect(303, '/app/employee');
}


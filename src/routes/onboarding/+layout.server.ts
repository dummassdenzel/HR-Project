import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { requireUser } from '$lib/auth/guards';

/**
 * Onboarding layout
 * Requires authentication
 * Redirects users with orgs to dashboard
 */
export async function load(event: RequestEvent) {
	const user = requireUser(event);

	// If user already has organization, redirect to dashboard
	if (user.current_organization_id) {
		throw redirect(303, '/app/dashboard');
	}

	// User is authenticated but has no org - show onboarding
	return {
		user
	};
}

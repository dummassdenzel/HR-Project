import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireUser } from '$lib/auth/guards';

/**
 * Onboarding layout
 * Requires authentication
 * Redirects users with orgs to dashboard
 */
export const load: LayoutServerLoad = (event) => {
	const user = requireUser(event);

	// If user already has organization, redirect to dashboard
	if (user.current_organization_id) {
		throw redirect(303, '/app/dashboard');
	}

	// User is authenticated but has no org - show onboarding
	// Form data from actions will be available via data.form in the component
	return {
		user
	};
};

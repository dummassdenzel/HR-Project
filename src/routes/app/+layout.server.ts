import type { RequestEvent } from '@sveltejs/kit';
import { requireUserWithOrg } from '$lib/auth/guards';

/**
 * App layout - Base for all authenticated app routes
 * Requires authentication + organization membership
 * Single place for this check - no duplication
 * 
 * If user has no org, redirects to /onboarding
 * If user not authenticated, redirects to /auth/signin
 */
export async function load(event: RequestEvent) {
	// This guard ensures user is authenticated and has an org
	// Will redirect if not
	const user = requireUserWithOrg(event);

	return {
		user
	};
}


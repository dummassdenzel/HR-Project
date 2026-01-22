import type { RequestEvent } from '@sveltejs/kit';
import { requireUserWithOrg } from '$lib/auth/guards';

/**
 * Dashboard - Shared landing page for all authenticated users with orgs
 * No specific role required, just auth + org
 */
export async function load(event: RequestEvent) {
	const user = requireUserWithOrg(event);
	return {
		user
	};
}


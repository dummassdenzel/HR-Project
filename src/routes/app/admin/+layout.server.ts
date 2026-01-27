import type { LayoutServerLoad } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';

/**
 * Admin layout - HR Admin only
 * Requires hr_admin role
 */
export const load: LayoutServerLoad = (event) => {
	const user = requireUserWithRole(event, 'hr_admin');
	return {
		user
	};
};


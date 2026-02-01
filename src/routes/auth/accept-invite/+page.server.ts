import type { PageServerLoad } from './$types';

/**
 * Root accept-invite (no token in path)
 * Redirect or show invalid link — actual flow is /auth/accept-invite/[token]
 */
export const load: PageServerLoad = async () => {
	return {};
};

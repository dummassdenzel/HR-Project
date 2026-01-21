import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';
import type { SessionUser } from '$lib/auth/types';
import type { MembershipRole } from '$lib/auth/types';

export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase client for this request
	event.locals.supabase = createSupabaseServerClient(event.cookies);

	// Get authenticated user
	const {
		data: { user: authUser },
		error: authError
	} = await event.locals.supabase.auth.getUser();

	// If not authenticated, set user to null and continue
	if (authError || !authUser) {
		event.locals.user = null;
		const response = await resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range';
			}
		});
		return response;
	}

	// Get user profile
	const { data: profile, error: profileError } = await event.locals.supabase
		.from('user_profiles')
		.select('full_name, avatar_url')
		.eq('id', authUser.id)
		.maybeSingle();

	// Get user's memberships with organization details
	const { data: memberships, error: membershipsError } = await event.locals.supabase
		.from('organization_memberships')
		.select(`
			id,
			organization_id,
			role,
			department,
			organizations!inner(id, name, slug)
		`)
		.eq('user_id', authUser.id);

	const profileData = profileError || !profile ? null : profile;

	// Build SessionUser object
	let sessionUser: SessionUser;

	if (membershipsError || !memberships || memberships.length === 0) {
		sessionUser = {
			id: authUser.id,
			email: authUser.email,
			full_name: profileData?.full_name ?? null,
			avatar_url: profileData?.avatar_url ?? null,
			current_organization_id: null,
			current_role: null
		};
	} else {
		// For Phase 1: Use first organization (single-org assumption)
		// Can be enhanced later for multi-org selection
		const firstMembership = memberships[0];

		// Type guard and assertion for the joined organization data
		if (!firstMembership || typeof firstMembership !== 'object' || !('organizations' in firstMembership)) {
			sessionUser = {
				id: authUser.id,
				email: authUser.email,
				full_name: profileData?.full_name ?? null,
				avatar_url: profileData?.avatar_url ?? null,
				current_organization_id: null,
				current_role: null
			};
		} else {
			const membership = firstMembership as {
				id: string;
				organization_id: string;
				role: MembershipRole;
				department: string | null;
				organizations: { id: string; name: string; slug: string };
			};

			const org = membership.organizations;

			sessionUser = {
				id: authUser.id,
				email: authUser.email,
				full_name: profileData?.full_name ?? null,
				avatar_url: profileData?.avatar_url ?? null,
				current_organization_id: org.id,
				current_role: membership.role
			};
		}
	}

	// Attach user to locals (cached for this request)
	event.locals.user = sessionUser;

	// Resolve the request
	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});

	return response;
};


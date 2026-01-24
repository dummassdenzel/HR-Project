import { createSupabaseServerClient } from '$lib/supabase/server';
import type { Handle } from '@sveltejs/kit';
import type { SessionUser } from '$lib/auth/types';
import type { MembershipRole } from '$lib/auth/types';

export const handle: Handle = async ({ event, resolve }) => {
	const requestPath = event.url.pathname;
	console.log(`[hooks.server.ts] Processing request: ${requestPath}`);

	// Create Supabase client for this request
	event.locals.supabase = createSupabaseServerClient(event.cookies);
	console.log(`[hooks.server.ts] Supabase client created for: ${requestPath}`);

	// Get authenticated user
	const {
		data: { user: authUser },
		error: authError
	} = await event.locals.supabase.auth.getUser();

	console.log(`[hooks.server.ts] getUser() result for ${requestPath}:`, {
		hasUser: !!authUser,
		userId: authUser?.id,
		userEmail: authUser?.email,
		hasError: !!authError,
		error: authError ? {
			message: authError.message,
			status: authError.status,
			name: authError.name
		} : null
	});

	// If not authenticated, set user to null and continue
	if (authError || !authUser) {
		console.log(`[hooks.server.ts] No authenticated user for ${requestPath}, setting user to null`);
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

	console.log(`[hooks.server.ts] Profile query result for ${requestPath}:`, {
		userId: authUser.id,
		hasProfile: !!profile,
		profileData: profile,
		hasError: !!profileError,
		error: profileError ? {
			message: profileError.message,
			code: profileError.code,
			details: profileError.details,
			hint: profileError.hint
		} : null
	});

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

	console.log(`[hooks.server.ts] Memberships query result for ${requestPath}:`, {
		userId: authUser.id,
		membershipsCount: memberships?.length ?? 0,
		memberships: memberships,
		hasError: !!membershipsError,
		error: membershipsError ? {
			message: membershipsError.message,
			code: membershipsError.code,
			details: membershipsError.details,
			hint: membershipsError.hint
		} : null
	});

	const profileData = profileError || !profile ? null : profile;

	// Build SessionUser object
	let sessionUser: SessionUser;

	if (membershipsError || !memberships || memberships.length === 0) {
		console.log(`[hooks.server.ts] No memberships found for ${requestPath}, creating sessionUser without org`);
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
			console.log(`[hooks.server.ts] Invalid membership structure for ${requestPath}, creating sessionUser without org`);
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

			console.log(`[hooks.server.ts] Found membership with org for ${requestPath}:`, {
				orgId: org.id,
				orgName: org.name,
				orgSlug: org.slug,
				role: membership.role
			});

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

	console.log(`[hooks.server.ts] Final sessionUser for ${requestPath}:`, {
		id: sessionUser.id,
		email: sessionUser.email,
		full_name: sessionUser.full_name,
		current_organization_id: sessionUser.current_organization_id,
		current_role: sessionUser.current_role
	});

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


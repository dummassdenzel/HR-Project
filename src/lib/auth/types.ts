import type { Database } from '$lib/database.types';

export type MembershipRole = Database['public']['Enums']['membership_role'];

export interface UserWithMembership {
	id: string;
	email?: string;
	full_name: string | null;
	avatar_url: string | null;
	memberships: Array<{
		id: string;
		organization_id: string;
		role: MembershipRole;
		department: string | null;
		organization: {
			id: string;
			name: string;
			slug: string;
		};
	}>;
}

export interface SessionUser {
	id: string;
	email?: string;
	full_name: string | null;
	avatar_url: string | null;
	current_organization_id: string | null;
	current_role: MembershipRole | null;
}


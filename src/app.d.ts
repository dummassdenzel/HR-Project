import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';
import type { SessionUser } from './lib/auth/types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			user: SessionUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

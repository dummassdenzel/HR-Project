import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '$lib/database.types';

export function createSupabaseClient() {
	return createBrowserClient<Database>(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY
	);
}


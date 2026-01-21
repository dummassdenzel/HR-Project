import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '$lib/database.types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY} from '$env/static/public';

export function createSupabaseClient() {
	return createBrowserClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY
	);
}


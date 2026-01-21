import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from '$lib/database.types';

export function createSupabaseServerClient(cookieStore: Cookies) {
	return createServerClient<Database>(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name) ?? undefined;
				},
				set(name: string, value: string, options: { path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: boolean | 'lax' | 'strict' | 'none'; maxAge?: number }) {
					cookieStore.set(name, value, {
						path: options.path ?? '/',
						httpOnly: options.httpOnly ?? true,
						secure: options.secure ?? true,
						sameSite: (options.sameSite === true ? 'lax' : (options.sameSite === false ? 'none' : options.sameSite)) ?? 'lax',
						maxAge: options.maxAge
					});
				},
				remove(name: string, options: { path?: string }) {
					cookieStore.delete(name, {
						path: options.path ?? '/'
					});
				}
			}
		}
	);
}


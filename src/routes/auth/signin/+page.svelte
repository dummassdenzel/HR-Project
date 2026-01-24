<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { ActionData } from './$types';

	interface Props {
		data?: ActionData;
		form?: any;
	}

	let { data, form }: Props = $props();
	let pending = $state(false);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<Card class="w-full max-w-md p-8">
		<div class="mb-8">
			<h2 class="text-3xl font-bold tracking-tight text-gray-900">Sign in to your account</h2>
			<p class="mt-2 text-sm text-gray-600">
				Don't have an account?
				<a href="/auth/signup" class="font-medium text-primary hover:underline"> Sign up </a>
			</p>
		</div>

		{#if data?.error}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">{data.error}</h3>
					</div>
				</div>
			</div>
		{/if}

		<form method="POST" use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update();
				pending = false;
			};
		}}>
			<div class="space-y-4">
				<div>
					<Label for="email">Email address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={data?.email || ''}
						disabled={pending}
						class="mt-1"
					/>
				</div>

				<div>
					<Label for="password">Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						disabled={pending}
						class="mt-1"
					/>
				</div>

				<div>
					<Button type="submit" class="w-full" variant="default" disabled={pending}>
						{pending ? 'Signing in...' : 'Sign in'}
					</Button>
				</div>
			</div>
		</form>
	</Card>
</div>


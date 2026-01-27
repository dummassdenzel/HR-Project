<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import type { PageData, ActionData } from './$types';
	import type { Database } from '$lib/database.types';

	type Employee201Profile = Database['public']['Tables']['employee_201_profiles']['Row'];

	let { data }: { data: PageData } = $props();
	let approvePending = $state(false);
	let rejectPending = $state(false);

	// Get form result from actions
	type FormResult = ActionData & {
		profile?: Employee201Profile;
	} | null;

	let formResult = $derived($page.form as FormResult);

	// Track profile from form actions
	let formActionProfile = $state<Employee201Profile | null>(null);
	let profile = $derived(formActionProfile ?? data.profile);

	// Update profile when form actions succeed
	$effect(() => {
		if (formResult?.success && formResult.profile) {
			formActionProfile = formResult.profile;
		}
	});

	// Reset form action profile when data changes
	$effect(() => {
		data.profile;
		formActionProfile = null;
	});

	// Helper to format date
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	// Check if profile can be reviewed (only submitted status)
	const canReview = $derived(profile.status === 'submitted');
</script>

<div class="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-3xl">
		<!-- Back link -->
		<div class="mb-6">
			<a href="/app/admin/201" class="text-sm text-primary hover:underline">
				&larr; Back to list
			</a>
		</div>

		<Card class="p-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Review 201 Profile</h1>
				<p class="mt-2 text-sm text-gray-600">
					Review the employee's submitted 201 file information.
				</p>
			</div>

			<!-- Status Badge -->
			{#if profile.status === 'submitted'}
				<div class="mb-6 rounded-md bg-blue-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800">Pending Review</h3>
							<p class="mt-1 text-sm text-blue-700">
								Submitted on {formatDate(profile.submitted_at)}. Please review and approve or reject.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if profile.status === 'approved'}
				<div class="mb-6 rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">Approved</h3>
							<p class="mt-1 text-sm text-green-700">
								Approved on {formatDate(profile.approved_at)}.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if profile.status === 'rejected'}
				<div class="mb-6 rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Rejected</h3>
							<p class="mt-1 text-sm text-red-700">
								This profile was rejected. The employee can make corrections and resubmit.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Form Result Messages -->
			{#if formResult?.error}
				<div class="mb-6 rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">{formResult.error}</h3>
						</div>
					</div>
				</div>
			{/if}

			{#if formResult?.success}
				<div class="mb-6 rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">{formResult.message}</h3>
						</div>
					</div>
				</div>
			{/if}

			<!-- Profile Details (Read-Only) -->
			<div class="space-y-6">
				<div>
					<Label>Legal Full Name</Label>
					<p class="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
						{profile.legal_full_name || 'Not provided'}
					</p>
				</div>

				<div>
					<Label>Address</Label>
					<p class="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
						{profile.address || 'Not provided'}
					</p>
				</div>

				<div>
					<Label>Birthdate</Label>
					<p class="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
						{profile.birthdate ? formatDate(profile.birthdate) : 'Not provided'}
					</p>
				</div>

				<div>
					<Label>Contact Number</Label>
					<p class="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
						{profile.contact_number || 'Not provided'}
					</p>
				</div>

				<div>
					<Label>Emergency Contact Name</Label>
					<p class="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
						{profile.emergency_contact_name || 'Not provided'}
					</p>
				</div>

				<div>
					<Label>Emergency Contact Number</Label>
					<p class="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
						{profile.emergency_contact_number || 'Not provided'}
					</p>
				</div>

				<!-- Action Buttons -->
				{#if canReview}
					<div class="flex gap-4 pt-6 border-t">
						<form method="POST" action="?/approve" use:enhance={() => {
							approvePending = true;
							return async ({ update }) => {
								await update();
								approvePending = false;
							};
						}}>
							<Button
								type="submit"
								variant="default"
								disabled={approvePending || rejectPending}
							>
								{approvePending ? 'Approving...' : 'Approve'}
							</Button>
						</form>

						<form method="POST" action="?/reject" use:enhance={() => {
							rejectPending = true;
							return async ({ update }) => {
								await update();
								rejectPending = false;
							};
						}}>
							<Button
								type="submit"
								variant="destructive"
								disabled={approvePending || rejectPending}
							>
								{rejectPending ? 'Rejecting...' : 'Reject'}
							</Button>
						</form>
					</div>
				{/if}
			</div>
		</Card>
	</div>
</div>

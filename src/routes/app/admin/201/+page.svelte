<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Helper to format date
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	// Helper to get status badge color
	function getStatusClass(status: string): string {
		switch (status) {
			case 'submitted':
				return 'bg-blue-100 text-blue-800';
			case 'approved':
				return 'bg-green-100 text-green-800';
			case 'rejected':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-6xl">
		<div class="mb-8">
			<h1 class="text-3xl font-bold tracking-tight text-gray-900">Employee 201 Files</h1>
			<p class="mt-2 text-sm text-gray-600">
				Review and manage submitted employee 201 profiles.
			</p>
		</div>

		{#if data.profiles.length === 0}
			<Card class="p-8 text-center">
				<p class="text-gray-500">No submitted profiles to review.</p>
			</Card>
		{:else}
			<Card class="overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Employee Name
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Status
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Submitted
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each data.profiles as profile}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4">
									<div class="text-sm font-medium text-gray-900">
										{profile.legal_full_name || 'Unnamed'}
									</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<span class="inline-flex rounded-full px-2 text-xs font-semibold leading-5 {getStatusClass(profile.status)}">
										{profile.status}
									</span>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
									{formatDate(profile.submitted_at)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm">
									<a
										href="/app/admin/201/{profile.id}"
										class="text-primary hover:underline"
									>
										View Details
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Card>
		{/if}
	</div>
</div>

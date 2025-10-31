<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}

	let { class: className = '', children, ...restProps }: Props = $props();

	const baseClasses = 'rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm';

	const cardClasses = `${baseClasses} ${className}`;
</script>

<div class={cardClasses} {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</div>

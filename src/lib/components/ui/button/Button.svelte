<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'default' | 'ghost';
		size?: 'default' | 'icon';
		children?: Snippet;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		children,
		...restProps
	}: Props = $props();

	const variantClasses = {
		default: 'bg-blue-600 text-white hover:bg-blue-700',
		ghost: 'bg-transparent hover:bg-slate-100'
	};

	const sizeClasses = {
		default: 'px-4 py-2',
		icon: 'p-2'
	};

	const baseClasses =
		'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

	const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<button class={buttonClasses} {...restProps}>
	{#if children}
		{@render children()}
	{/if}
</button>

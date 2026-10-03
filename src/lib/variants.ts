import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
	'inline-flex items-center justify-center gap-1.5 no-underline rounded-md font-sans font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				primary: 'bg-primary text-on-primary hover:bg-primary-hover',
				secondary: 'border border-border-strong bg-transparent text-text hover:bg-surface-accent',
				text: 'bg-transparent text-text underline-offset-4 hover:underline',
			},
			size: {
				default: 'px-4 py-2 text-base',
				sm: 'px-3 py-1.5 text-sm',
			},
		},
		defaultVariants: {
			variant: 'primary',
			size: 'default',
		},
	},
);

export const navLinkVariants = cva(
	'font-sans transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
	{
		variants: {
			context: {
				header: 'rounded-md px-3 py-1.5 text-base no-underline hover:bg-surface-accent hover:text-text active:bg-surface-accent/80',
				mobile:
					'block rounded-md px-3 py-2.5 text-lg no-underline hover:bg-surface-accent hover:text-text active:bg-surface-accent/80',
				body: 'font-normal text-text underline hover:text-text-hover',
			},
			active: {
				true: '',
				false: '',
			},
		},
		compoundVariants: [
			{
				context: ['header', 'mobile'],
				active: false,
				class: 'text-text-muted',
			},
			{
				context: ['header', 'mobile'],
				active: true,
				class:
					'text-text underline decoration-accent underline-offset-4 hover:bg-transparent',
			},
		],
		defaultVariants: {
			context: 'body',
			active: false,
		},
	},
);

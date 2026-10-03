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
				header: 'rounded-md px-3 py-1.5 text-base no-underline underline-offset-[6px]',
				mobile: 'block rounded-md px-3 py-2.5 text-lg no-underline underline-offset-[6px]',
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
				// Hover borrows the faint underline that body links show at rest.
				class: 'text-text-muted hover:text-text hover:underline hover:decoration-current/30',
			},
			{
				context: ['header', 'mobile'],
				active: true,
				// A solid 2px underline in the text color (8.7:1) marks the current page.
				class: 'text-text underline decoration-current decoration-2 hover:text-text',
			},
		],
		defaultVariants: {
			context: 'body',
			active: false,
		},
	},
);

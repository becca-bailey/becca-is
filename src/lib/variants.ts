import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-md font-sans font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				primary: 'bg-gold text-text hover:bg-gold-dark',
				secondary: 'border border-text bg-transparent text-text hover:bg-peach',
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
	'font-sans transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
	{
		variants: {
			context: {
				header: 'rounded-md px-3 py-1.5 text-base no-underline hover:bg-peach hover:text-text active:bg-peach/80',
				mobile:
					'block rounded-md px-3 py-2.5 text-lg no-underline hover:bg-peach hover:text-text active:bg-peach/80',
				body: 'font-normal text-text underline hover:text-[#3D3832]',
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
					'text-text underline decoration-blue underline-offset-4 hover:bg-transparent',
			},
		],
		defaultVariants: {
			context: 'body',
			active: false,
		},
	},
);

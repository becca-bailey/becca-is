import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** True when the current pathname matches a nav href (including nested routes). */
export function isNavActive(href: string, pathname: string): boolean {
	const path =
		pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
	const target = href.endsWith('/') && href.length > 1 ? href.slice(0, -1) : href;
	if (target === '/') return path === '/';
	return path === target || path.startsWith(`${target}/`);
}

import { mailto, site } from './site';

export interface NavItem {
	href: string;
	label: string;
}

export interface FooterLink extends NavItem {
	/** Opens in a new tab with rel="noopener noreferrer". */
	external?: boolean;
	/** Extra rel values, e.g. "me" for IndieWeb identity links. */
	rel?: string;
}

/** Header navigation, desktop and mobile. Order here is display order. */
export const mainNav: NavItem[] = [
	{ href: '/writing', label: 'Essays' },
	{ href: '/reading', label: 'Reading' },
	{ href: '/speaking-and-writing', label: 'Speaking & Technical Writing' },
	{ href: '/making-things', label: 'Projects' },
	{ href: '/about', label: 'About' },
];

/**
 * Footer links. Social profiles carry rel="me" so the site and the profiles
 * verify each other (IndieWeb identity consolidation).
 */
export const footerLinks: FooterLink[] = [
	{ href: mailto(), label: site.email },
	{ href: site.links.bluesky, label: 'Bluesky', external: true, rel: 'me' },
	{ href: site.links.threads, label: 'Threads', external: true, rel: 'me' },
	{ href: site.links.linkedin, label: 'LinkedIn', external: true },
	{ href: site.links.github, label: 'GitHub', external: true, rel: 'me' },
	{ href: site.links.substack, label: 'Substack', external: true },
];

export function footerLinkRel(link: FooterLink) {
	const parts = [link.rel, link.external ? 'noopener noreferrer' : undefined].filter(Boolean);
	return parts.length > 0 ? parts.join(' ') : undefined;
}

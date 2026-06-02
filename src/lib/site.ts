export const site = {
	name: 'Becca Bailey',
	tagline: 'Software Engineer & Writer',
	email: 'beccanelsonbailey@gmail.com',
	url: 'https://becca.is',
	links: {
		linkedin: 'https://linkedin.com/in/beccamakesthings',
		github: 'https://github.com/becca-bailey',
	},
	projectsIntro:
		"A mix of software and hands-on work—projects I've built that still feel worth sharing.",
	projectsDescription: 'Software, data work, and hands-on projects.',
} as const;

export function mailto(email: string = site.email) {
	return `mailto:${email}`;
}

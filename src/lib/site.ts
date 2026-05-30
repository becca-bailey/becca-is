export const site = {
	name: 'Becca Bailey',
	tagline: 'Software Engineer & Writer',
	email: 'beccanelsonbailey@gmail.com',
	url: 'https://becca.is',
	links: {
		linkedin: 'https://linkedin.com/in/beccamakesthings',
		github: 'https://github.com/becca-bailey',
	},
} as const;

export function mailto(email: string = site.email) {
	return `mailto:${email}`;
}

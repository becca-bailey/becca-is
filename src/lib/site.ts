export const site = {
	name: 'Becca Bailey',
	email: 'beccanelsonbailey@gmail.com',
	url: 'https://becca.is',
	links: {
		linkedin: 'https://linkedin.com/in/beccamakesthings',
		github: 'https://github.com/becca-bailey',
		substack: 'https://becca-bailey.substack.com',
	},
	projectsDescription: 'Technical builds, data work, and hands-on creative projects.',
	homeProjectsIntro:
		'A collection of software projects, visualizations, illustrations, and other experiments. Some were built for work, some for fun, and some simply because I wanted to understand how something worked.',
	projectsIntro:
		'Technical and non-technical projects—from platforms and data work to illustration and other hands-on making.',
	homeSpeakingIntro:
		'Conference talks, podcast appearances, and technical writing on frontend engineering, data visualization, developer experience, and the craft of building software.',
	speakingAndWritingIntro:
		'Talks, podcasts, and technical writing—public work on React, data visualization, engineering practice, and developer experience.',
	speakingAndWritingDescription:
		'Talks, podcast appearances, and technical writing by Becca Bailey.',
	aboutDescription:
		'Software engineer, technical communicator, and writer based in Seattle—background, experience, and how to work together.',
	credibility: {
		conferences: ['React Conf', 'DevReach', 'Full Stack', 'Reactathon'],
		publications: ['Formidable', '8th Light', 'Cisco'],
	},
	contactHeading: 'Work With Me',
	contactIntro:
		'Available for speaking engagements, technical writing, developer education, podcast appearances, and selective consulting opportunities.',
} as const;

export function mailto(email: string = site.email) {
	return `mailto:${email}`;
}

export const site = {
  name: "Becca Bailey",
  email: "beccanelsonbailey@gmail.com",
  url: "https://becca.is",
  links: {
    linkedin: "https://linkedin.com/in/beccamakesthings",
    github: "https://github.com/becca-bailey",
    substack: "https://beccabailey.substack.com",
  },
  projectsDescription:
    "Here is some of the most recent work I have done, professionally and otherwise.",
  writingDescription:
    "I write about the tech industry, work in general, knitting, other things that are interesting to me. You can find more of my writing on Performance Anxiety.",
  speakingAndWritingIntro:
    "Talks, podcast conversations, and technical writing about software development and engineering teams.",
  newsletterUrl:
    "https://beccabailey.substack.com/?utm_source=becca.is&utm_campaign=homepage",
  newsletterCta: "Subscribe on Substack",
  contactHeading: "Work with me",
  contactEngineering:
    "I’m open to software engineering and technical leadership opportunities, too. If you have something in mind, I’d love to hear from you.",
  contactIntro:
    "I’m interested in writing commissions and opportunities to expand on my existing research. I’m also available for talks and podcast interviews.",
} as const;

export function mailto(email: string = site.email) {
  return `mailto:${email}`;
}

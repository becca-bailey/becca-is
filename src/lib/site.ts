const writingTagline =
  "Writing about the strange systems we build around work, creativity, technology, and culture.";

export const site = {
  name: "Becca Bailey",
  email: "beccanelsonbailey@gmail.com",
  url: "https://becca.is",
  /** Hero and about page tagline; also the about page meta description. */
  tagline:
    "I'm a software engineer, engineering leader, writer, and researcher. I use data, stories, and reporting to understand communities and the people inside them.",
  links: {
    linkedin: "https://linkedin.com/in/beccamakesthings",
    github: "https://github.com/becca-bailey",
    substack: "https://beccabailey.substack.com",
  },
  projectsDescription:
    "Here is some of the most recent work I have done, professionally and otherwise.",
  /** Meta description for /writing; also opens the writing intro below. */
  writingTagline,
  writingDescription: `${writingTagline} You can find more of my writing on Performance Anxiety.`,
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

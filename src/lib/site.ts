const writingTagline =
  "Writing about the strange systems we build around work, creativity, technology, and culture.";

export const site = {
  name: "Becca Bailey",
  email: "hello@becca.is",
  url: "https://becca.is",
  /** Hero and about page tagline; also the about page meta description. */
  tagline:
    "I'm a software engineer, engineering leader, writer, and researcher. I use data, stories, and reporting to understand communities and the people inside them.",
  /** Cal.com event links for /working. */
  booking: {
    discoveryCall: "https://cal.com/rebecca-bailey-xevm5o/20min",
    techSupport: "https://cal.com/rebecca-bailey-xevm5o/60min",
    /** Hourly rate for tech support sessions, paid at booking. */
    techSupportRate: "$75/hour",
  },
  links: {
    linkedin: "https://linkedin.com/in/beccamakesthings",
    github: "https://github.com/becca-bailey",
    substack: "https://beccabailey.substack.com",
    /** Anne Helen Petersen's Culture Study interview about the Ravelry research. */
    cultureStudyInterview:
      "https://www.patreon.com/CultureStudy/posts/has-creator-171996428",
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
  contactHeading: "Get in touch",
  contactIntro:
    "I’m interested in writing commissions and opportunities to expand on my existing research, and I’m available for talks and podcast interviews. I’m open to software engineering and technical leadership opportunities, too. If you have something in mind, I’d love to hear from you.",
  /** Quiet pointer from the general contact panel to the tech-help page. */
  contactTechHelp:
    "Run a small creative business and need a hand with the technical side?",
  contactTechHelpCta: "See how we can work together",
} as const;

export function mailto(email: string = site.email) {
  return `mailto:${email}`;
}

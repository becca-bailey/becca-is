---
title: The Language of Work
description: >-
  I collected a quarter century of tech company careers pages to see how the
  pitch to workers changes when the job market does.
category: technical
medium: Research & Data Storytelling
featuredImage: ./featured.png
pubDate: 2026-07-01
featured: true
---

I've spent a lot of time reading company careers pages. They're a strange kind of writing: a company telling you who it is, what it values, and why you should want to work there. I wanted to know how that pitch had changed as the job market changed.

The Language of Work looks at careers pages from two dozen tech companies between 1999 and 2026, using the Wayback Machine to piece together their history. I built a pipeline to collect and analyze the language, then turned the findings into interactive data stories.

## What I found

When workers had more options, companies talked more about belonging, care, and diversity. As the market shifted, a lot of that language receded. The care that remained often asked workers to look after themselves, and more companies started openly saying they weren't for everyone.

Language about performance and merit was much more consistent. That made me question the idea that a new generation had permanently changed work. In these pages, many of the changes tracked how much employers needed to compete for workers.

Careers pages tell us how companies present themselves. They can't tell us on their own what it's like to work there. The stories focus on that public language and what changes in it might mean.

## The studies

- **DEI Language:** How companies adopted diversity language, pulled it back, or started defining themselves against it.
- **A Team, Not a Family:** Netflix's 2009 culture deck and how much of its language other employers actually adopted.
- **Bring Your Own Resilience:** What happened to promises of care, and who became responsible for providing it.
- **Masculine Energy:** Gender-coded language in the careers-page archive.
- **The Non-Political Workplace:** A founder's blog analyzed with the same tools I used for the careers pages.

## How I built it

I used Python to collect archived pages, split them into passages, and analyze them with embeddings and LLM APIs. The pipeline tracks content hashes so I can reuse work when the source text hasn't changed. The interactive stories use Astro, React, and visx.

A big part of the work was checking whether the measurements were telling me what I thought they were. For example, a passage can mention care without promising to care for anyone. I used neutral controls and separate LLM evaluations to check the language scores, and compared extracted benefits with manually coded samples.

Some measures didn't hold up. I left the craft axis unpublished because the checks disagreed. The published stories include agreement scores, sample sizes, and limitations so readers can see what supports the claims.

I use AI to help synthesize my drafts and the data into story prose, then review and edit it before publishing.

## Read it

- [The Language of Work — interactive data stories](https://languageofwork.dev)
- [Source on GitHub](https://github.com/becca-bailey/language-of-work)

## Related writing

- [Masculine Energy](/writing/masculine-energy)
- [Deeply Resentful](/writing/deeply-resentful)
- [The Death of Changing the World](https://open.substack.com/pub/beccabailey/p/the-death-of-changing-the-world)
- [A Team, Not a Family](/writing/a-team-not-a-family)
- [Millennials Were Supposed to Fix Work](/writing/millennials-were-supposed-to-fix)
- [Dark Places](/writing/dark-places)

## Writing about the methods

- [LLM Coding, Human Judgment, and Krippendorff's Alpha](/speaking-and-writing/llm-coding-krippendorffs-alpha)
- [LLM-as-a-Judge in Practice: What I Learned When Two AIs Disagreed About Google](/speaking-and-writing/llm-as-a-judge-in-practice)

## Related work

[The Closing Window](/making-things/closing-window) started with a similar question about opportunity. For that project, I used Ravelry data to look at when knitting and crochet designers found an audience.

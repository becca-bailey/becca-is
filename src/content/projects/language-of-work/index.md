---
title: The Language of Work
description: >-
  A computational study of how tech companies describe themselves as
  employers—and what two decades of careers-page language reveals about power in
  the workplace.
category: technical
medium: Research & Data Storytelling
featuredImage: ./featured.png
pubDate: 2026-07-01
featured: true
---

A computational study of how tech companies describe themselves as employers—and what that language reveals about power.

Careers pages are corporate self-presentation at its most deliberate—every word is chosen to attract workers. I've been treating two decades of them (more than a dozen tech companies, 2005–2026, reconstructed from the Wayback Machine) as a longitudinal record, and asking what the language does over time: when it shifts, and why.

The idea I keep coming back to is what I've started calling a **counterforces thesis**: a workplace culture doesn't stay good because leadership cares about it. It stays good while something specific holds ordinary decay back—mostly, that's workers having somewhere else to go. When that leverage erodes, the language of values sticks around as liturgy, but the practice underneath it reverts. The 2010s bet that a new generation would permanently fix work wasn't wrong, exactly. It was rented, not owned—the gains tracked the labor market and receded the moment it inverted.

The data backs this up across a few different studies: idealism peaked in the early-to-mid 2010s and then collapsed (Amazon went from +1.8 z in 2013 to basically neutral by 2026); DEI language got adopted industry-wide and then quietly walked back after 2023; care talk spiked with the Great Resignation and deflated as quits fell—and what stuck around was the kind of "care" that asks workers to absorb it themselves. Meanwhile the substrate that actually serves management—performance-intensity language—barely moves at all, through any of it.

## How it's built

A shared pipeline chunks archived pages, uses an LLM to classify them into registers, and scores them on embedding-based contrast axes—each one paired with a neutral control and a circularity check, because I've been burned before by measuring topical proximity instead of actual stance. Structured LLM extraction pulls benefits into taxonomies I've validated against hand-coded samples (Krippendorff's α ≈ 0.9). Every claim gets stress-tested with coverage-controlled statistics, and when the data can't carry the claim, I say so instead of reaching.

Published as interactive data stories (Astro + React + visx). The part I'm most stubborn about is the discipline of it—going back to primary sources overturned the secondhand version of events more than once, and I think the honest nulls matter as much as the findings do.

**Stack:** Python (embeddings, LLM pipelines, pandas/scipy), OpenAI + Anthropic APIs, SQLite embedding cache, content-hash pipeline DAG, Astro/React/visx.

## Read it

- [The Language of Work — interactive data stories](https://languageofwork.netlify.app/)
- [Source on GitHub](https://github.com/becca-bailey/language-of-work)

## Related writing

- [The Death of Changing the World](https://open.substack.com/pub/beccabailey/p/the-death-of-changing-the-world)
- [A Team, Not a Family](https://open.substack.com/pub/beccabailey/p/a-team-not-a-family)
- [Millennials Were Supposed to Fix Work](https://beccabailey.substack.com/p/bb503447-8aa3-4e59-af99-bb62c57f8a02)

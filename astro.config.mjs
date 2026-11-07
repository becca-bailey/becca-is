// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://becca.is',
  output: 'static',

  redirects: {
    '/working': '/about',
    '/resumes': '/resume',
    '/resumes/developer-educator': '/resume',
    '/talks': '/speaking-and-writing',
    '/talks/[slug]': '/speaking-and-writing/[slug]',
  },

  integrations: [mdx(), react()],

  image: {
    // Book covers are fetched from Open Library at build time and optimised like local images.
    domains: ['covers.openlibrary.org'],
  },

  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-light-high-contrast',
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()]
  },
});
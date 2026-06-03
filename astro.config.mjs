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
    '/talks': '/speaking-and-writing',
    '/talks/[slug]': '/speaking-and-writing/[slug]',
  },

  integrations: [mdx(), react()],

  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()]
  },
});
import type { MDXComponents } from 'mdx/types';
import AuthorNote from './components/writing/AuthorNote.astro';
import MarginNote from './components/writing/MarginNote.astro';

export const components: MDXComponents = {
	AuthorNote,
	MarginNote,
};

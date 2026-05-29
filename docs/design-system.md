# Design System

Warm editorial design system for the portfolio site. Built with Astro, Tailwind CSS v4, and CVA-style variant utilities — no shadcn/ui.

## Overview

- **Headings:** DM Sans (400, 500, 700)
- **Body:** Lora (400)
- **Components:** Astro components with shared CVA variants in `src/lib/variants.ts`
- **Focus color:** Blue `#7CAEF3` — used for focus rings only, never link text

## Color palette

| Name | Hex | Usage |
| ---- | --- | ----- |
| Stone Brown | `#4E473F` | Primary text, headings, link text |
| Cream | `#FBF9F8` | Page and section backgrounds |
| Gold | `#CFAF36` | Primary buttons, accent |
| Gold Dark | `#B8992F` | Primary button hover |
| Blue | `#7CAEF3` | Focus rings only |
| Peach | `#FFE0D3` | Borders, subtle accents |
| Pink | `#FDC1E1` | Decorative accent (sparingly) |
| Pink Dark | `#F06292` | Accessible pink for large text/badges |

## Semantic tokens

Defined in `src/styles/global.css` under `@theme`:

| Token | Maps to | Use |
| ----- | ------- | --- |
| `background` | Cream | Page background |
| `text` | Stone Brown | Body and heading color |
| `text-muted` | `#736B62` | Captions, meta (~4.6:1 on Cream) |
| `border` | Peach | Card and section borders |

Tailwind utilities: `bg-background`, `text-text`, `text-text-muted`, `border-border`, `bg-gold`, `outline-blue`, etc.

## Typography

### Body

- **Font:** Lora
- **Size:** `text-base` (16px) on mobile, `text-lg` (19px) at `md+`
- **Line height:** 1.75

### Headings

All headings use DM Sans, weight 500, letter-spacing `-0.02em`.

| Element | Classes |
| ------- | ------- |
| h1 | `text-3xl md:text-4xl lg:text-5xl` |
| h2 | `text-2xl md:text-3xl` |
| h3 | `text-xl md:text-2xl` |
| h4 | `text-lg md:text-xl` |
| h5 | `text-base md:text-lg` |
| h6 | `text-sm md:text-base` |

Long-form content should use `max-w-prose` (~65ch).

## Border radius

Default: **6px** — use `rounded-md` on buttons, cards, and images.

## CVA variants

Variant definitions live in `src/lib/variants.ts`. The `cn()` helper in `src/lib/utils.ts` merges classes.

### `buttonVariants`

| Prop | Values | Description |
| ---- | ------ | ----------- |
| `variant` | `primary` (default), `secondary`, `text` | Visual style |
| `size` | `default`, `sm` | Padding and font size |

| Variant | Style |
| ------- | ----- |
| Primary | Gold bg, Stone Brown text, gold-dark hover |
| Secondary | Stone Brown outline, peach bg on hover |
| Text | Transparent, underline on hover |
| Disabled | 50% opacity, no pointer events (via `disabled` prop) |

### `navLinkVariants`

| Prop | Values | Description |
| ---- | ------ | ----------- |
| `context` | `header`, `mobile`, `body` (default) | Nav vs body link styling |

| Context | Style |
| ------- | ----- |
| Header | No underline; underline on hover |
| Mobile | Block, larger text, for slide-over panel |
| Body | Underlined; darker stone on hover |

## Components

### `Button.astro`

Renders `<a>` when `href` is provided, otherwise `<button>`.

```astro
<Button href="#contact">Get in touch</Button>
<Button variant="secondary" href="#work">View work</Button>
<Button variant="text">Learn more</Button>
<Button disabled>Unavailable</Button>
<Button size="sm" variant="text" href="#">Small link</Button>
```

### `NavLink.astro`

```astro
<NavLink href="/" context="header">Home</NavLink>
<NavLink href="#about" context="body">Read more</NavLink>
```

### `Header.astro`

- **Static** header (scrolls with page)
- **Desktop (`md+`):** Inline nav links
- **Mobile:** Hamburger opens slide-over panel (vanilla JS, no React)

Nav items: Home, Work, About, Contact.

## Layout

- **Page container:** `max-w-5xl mx-auto px-4 md:px-8`
- **Main padding:** `py-8 md:py-12`
- **Prose blocks:** `max-w-prose`

## Accessibility

### Focus

All interactive elements use a blue focus ring on `:focus-visible`:

```css
outline: 2px solid var(--color-blue);
outline-offset: 2px;
```

### Contrast

| Combination | Ratio | Status |
| ----------- | ----- | ------ |
| Stone Brown text on Cream | ~7.5:1 | Pass AA/AAA |
| Muted text on Cream | ~4.6:1 | Pass AA |
| Stone Brown on Gold (buttons) | ~5.5:1 | Pass AA |
| Blue text on Cream | ~2.2:1 | Fail — do not use for text |

### Decorative colors

Peach, Pink, and Pink Dark are for backgrounds, borders, and accents — not body text on Cream.

## File structure

```
src/
├── lib/
│   ├── utils.ts       # cn() helper
│   └── variants.ts    # CVA buttonVariants, navLinkVariants
├── components/
│   ├── Button.astro
│   ├── NavLink.astro
│   └── Header.astro
├── styles/
│   └── global.css     # @theme tokens + base styles
└── layouts/
    └── Layout.astro
```

## Adding shadcn later

If interactive UI grows (forms, dialogs), shadcn/ui can be added without rewriting tokens. The CVA patterns and `cn()` utility carry over directly.

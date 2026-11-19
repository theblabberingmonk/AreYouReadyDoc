# ADR 0005: Public introduction, private study workspace

Accepted 19 November 2026.

Visitors first see a product introduction at `/`. Sign-in and sign-up are dedicated pages. Both flows default to `/library`; a requested private URL remains the return destination when Clerk supplies one.

Each study page and its metadata generator calls `auth.protect()` before reading content. Paper JSON, search data and illustrations also check authentication on the server. The search index is in `data/`, and illustrations are in `study-assets/`, outside `public/`. Existing illustration URLs are preserved by an authenticated route. Next file tracing includes those files in deployment functions. The Clerk proxy matcher remains explicit so its JavaScript can load.

The design follows the reading hierarchy and spacing guidance of [Editorial](https://github.com/bergside/awesome-design-skills/tree/main/skills/editorial) from Bergside's MIT licensed collection. The existing Source Serif and Inter fonts are retained to keep long answers legible. The landing page uses real content counts, visible server-rendered entry links, an illustrative workflow without exam questions, native FAQ controls, and responsive layouts. No testimonials or learner statistics are invented.

Validation: production build, TypeScript check, `node scripts/check-public-access.mjs <base-url>`, browser review of the landing page and authentication flow. Account creation and cross-device sync require a signed-in session for full verification.

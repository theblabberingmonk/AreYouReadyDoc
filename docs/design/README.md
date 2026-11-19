# Design rules — anti-slop system

Vendored from [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills)
(MIT) and [elayadesign/redesign-skill](https://github.com/elayadesign/redesign-skill)
(MIT). These files are the concrete rulebooks behind the "clinical calm"
contract in [01-product-spec.md](../01-product-spec.md). When they conflict
with the spec, the spec wins and the deviation is recorded below.

| File | Covers |
|---|---|
| [landing-page-design-SKILL.md](landing-page-design-SKILL.md) | Full visual system: type scale, spacing, radius, motion, copy, states, ship checklist |
| [redesign-existing-projects-SKILL.md](redesign-existing-projects-SKILL.md) | Audit + fix-priority order for upgrading this existing site |

## Deliberate deviations (spec wins)

The skills are written for marketing/landing pages. This is a long-form
medical reading app, so the following rules are intentionally not adopted:

1. **Serif + sans pairing (kept).** The skill mandates one typeface and bans
   Inter. We pair Source Serif 4 (reading) with Inter (UI chrome) — the right
   pattern for 170 long-form answers, decided in 01 before the skills existed.
2. **Sticky reader bar (kept).** The skill wants a floating pill nav. A
   full-width sticky bar with the paper progress is the correct docs/reader
   pattern; a floating pill would fight the sticky paper toolbar.
3. **Uniform library grid (kept).** The skill calls three-equal-columns the
   most generic AI layout — true for marketing feature rows, not for a
   library of 17 uniform papers. Rhythm comes from session grouping, not
   asymmetry.
4. **No scroll reveals on reading content.** Reveals apply to library cards
   only. Questions and answers never animate on scroll.
5. **Warm custom palette instead of the skill's dark values.** Same discipline
   (flat surfaces, one accent, tinted shadows), our own paper/teal values.

## Adopted from the skills (applied 2026-11-19)

- Base easing `cubic-bezier(0.22,1,0.36,1)`, UI ≥ 220ms, no browser-default `ease`
- Pressed states (`scale`) on cards, buttons, toggles; visible focus ring (already had)
- `text-wrap: balance` on headings, `pretty` on body/lede/prose/question titles
- No hyphens in UI copy (content data untouched — medical terms stay)
- Progress bars via `transform: scaleX`, never animated `width`
- Scroll reveals via `IntersectionObserver`, once, capped stagger, reduced-motion safe
- Ship: branded favicon, branded 404, skip-link, privacy page + footer links, OG image

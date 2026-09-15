# rekxera-dami-v3

Kurdish-language study timer app. React + TypeScript + Tailwind v4, six switchable themes (Clay, Clarity, Mountain, Forest, Ocean, Night Sky), each with bespoke Timer/Schedule/About layouts; shared Insights page, Supabase auth + data, AI schedule generator and study advisor.

## UI/UX Review & Enhancement Summary

### Cross-cutting enhancements
- **CelebrationOverlay** (`src/components/CelebrationOverlay.tsx`) — rewritten: 56-piece confetti burst with randomized vectors, radial flash, glass summary card, `prefers-reduced-motion` support, screen-reader announcement. All 6 timer variants pass the studied `minutes`.
- **StreakCalendar** (`src/components/StreakCalendar.tsx`) — fixed month-label positioning bug and a crash-prone `Intl` locale call: locales now mapped per app language (`en-US`, `ar`, `ckb`, `kmr`) with a safe fallback chain; added tooltips, today ring, hover feedback, legend.
- **MobileBottomNav** (`src/components/MobileBottomNav.tsx`) — spring-eased sliding active indicator, `aria-current="page"`, press feedback.
- **ProfileDrawer** (`src/components/Auth/ProfileDrawer.tsx`) — proper enter/exit animation state machine (slide in/out, RTL-aware), focus trap, Escape close, focus restore, body scroll lock.
- **ThemeSwitcher** — animated backdrop/panel with staggered theme cards and reduced-motion guard.
- **useTimerSession** (`src/hooks/useTimerSession.ts`) — tab-title live countdown (`✓ / ▶ / ‖`), background-tab completion notification, keyboard shortcuts (Space = start/pause, R = reset) with input-safe guards.

### Per-theme polish
- **Mountain**: flag marker follows terrain silhouette during fill animation, mobile streak stat un-hidden, context-aware start labels.
- **Ocean**: stats driven by translated config instead of hardcoded English switches; dark-mode toggle added to header.
- **Night Sky**: streak unit bug fixed (`12N` → `12 days`); header dark toggle.
- **Forest**: pause label corrected from "Rest"; enlarged preset touch targets.
- **Clay**: emoji stat icons replaced with lucide icons; pulsing active-subject dot.

### Pages
- **Insights** (`src/pages/Insights.tsx`) — now uses the shared palette module; entrance choreography (staggered cards), animated score ring sweep with count-up, subject bars grow from zero.
- **404** (`src/pages/not-found.tsx`) — replaced broken swatch-based colors with themed palette + gentle entrance animation.
- **Schedule (all 6 variants)** — AI modal gets fade/pop entrance with `role="dialog"`/`aria-modal`; day selectors show a "Today" dot indicator; `aria-pressed` states.

### Consistency & accessibility audit results
- Shared palette extracted to `src/themes/palette.ts`; all values aligned with the actual variant color objects (several dark-mode accents were corrected: mountain `#6B8E6F`, forest `#4CAF50`, ocean `#00C8B8`, clarity `#D98A3D`, night-sky `#6B8FD4`).
- All dark-mode toggles across 17 surfaces use lucide `<Sun>/<Moon>` icons with localized `aria-label`s (text glyphs removed); missing toggle added to Night Sky About.
- `aria-pressed` + visible focus outlines on subject/preset/day buttons across all variants.
- i18n keys added for all 4 languages (en, ar, badini, sorani): session-complete strings, streak legend, `start_journey`, `today`.

### Verification
- `tsc --noEmit`: clean. `vite build`: succeeds.

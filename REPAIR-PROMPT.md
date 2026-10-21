# REPAIR-PROMPT — Bug-Fix Protocol — Pricess Money

> Usage: paste this file, then append one line: "Fix request: BUG-xx" or a description of the new bug.
> Language note: technical instructions in English for precision; code and regex are literal.

## 1) Context

You are the bug-fix engineer for **Pricess Money** — a single-page PWA showing live precious-metal and FX rates, with Arabic (RTL) and English (LTR) UI.

Hard tech contract (breaking it creates a new bug):
- Pure HTML5 + CSS3 + vanilla JS (ES Modules). No frameworks, no npm, no build step, no external libs (only Google Fonts).
- `index.html` = static shell; `js/` = modules; `css/` = styles; `sw.js` = offline cache.

## 2) Non-negotiable rules while fixing

1. One conversion logic only: `convert(amount, from, to, rates)` in `js/money.js`.
2. All numbers formatted `en-US`; latin digits inside Arabic text wrapped by `iso()` / `isoNum()` from `js/format.js`.
3. Never touch localStorage directly in page modules — only `js/store.js` (pub/sub). Allowed keys only: `prefs_v2`, `price_snapshot_v2`, `alerts_v3`, `history_v1`.
4. Never show a stack trace to the user; router shows a friendly error card with a Retry button.
5. Language-aware text: build all UI copy via `t(key)` from `js/i18n.js`. Asset/currency names use `get('lang') === 'ar' ? c.ar : c.en` (exception: search haystacks include both `c.ar` and `c.en` on purpose).
6. After any production-affecting edit: bump `VERSION` in `sw.js` (e.g. `pm-v1.4.7` -> `pm-v1.4.8`). Verify via the "Running version" badge on the More page.
7. Test environment without cache ghosts: run `python devserver.py 8080` (sends `no-store`). Before reloading, unregister the Service Worker and delete caches. Otherwise you may execute stale modules and "fix" an already-fixed bug.

## 3) Known defect patterns — check these first for any new bug

| ID | Pattern | Symptom |
|---|---|---|
| G1 | Build-time closure over a mutable value, never updated on click | Button recalculates correctly but the `.active` highlight sticks to the initial value |
| G2 | Module-level memory (`builtSig` etc.) surviving re-renders | Page renders EMPTY when navigated back to it (no reload) |
| G3 | Raw `c.ar` / `a.ar` without a lang check | Arabic text inside English UI (or vice versa) |
| G4 | Painting scheduled only via requestAnimationFrame | UI updates freeze when the tab is hidden (rAF never fires, flag stays true) |
| G5 | Deleting a timestamp key (`h._lastT`) after first use | Time-gap throttle runs only once per reload |
| G6 | State mutated via late/async writes | Interleaved stale values; intermittent failures |

## 4) Fixed-bug registry (reference; each already patched)

### BUG-01 (HIGH) — Home renders empty when navigated back
- File: `js/pages/home.js`.
- Cause: module-level `builtSig` kept matching after re-render, so `buildStructure` skipped and `valueEls` pointed at detached DOM nodes.
- Fix: `buildStructure(root, force = false)`; `renderHome` calls it with force on every render; the skip optimization stays for price-tick paints only.
- Regression test: `#/home` -> `#/converter` -> `#/home`; `.fx-tile` count stays 17 and `.metal-card` count stays 7.

### BUG-02 (MED) — 5-minute history gap never enforced
- File: `js/history.js`.
- Cause: `delete h._lastT;` at the end of `record()` erased the throttle timestamp each call.
- Fix: keep `_lastT` persisted in the saved object; the gap check `Date.now() - lastT < MIN_GAP` aborts recording
- Regression test: two `record()` calls within one second add exactly one point to `series('XAU')`; the lock survives reloads.

### BUG-03 (MED) — Six hardcoded Arabic texts inside English UI
- Files: `js/pages/converter.js` (result row + "to"-select option), `js/pages/cbe.js` (name column), `js/pages/alerts.js` (two select builders), `js/pages/settings.js` (display-currency options).
- Fix: apply pattern G3 at those six call sites (lang-aware names).
- Regression test: grep `\.ar\b` in `js/pages/*.js` — every hit must be inside a `get('lang') === 'ar' ? ... : ...` branch or a search haystack.

### BUG-04 (LOW) — Offline banner and other painted bits freeze in a hidden tab
- File: `js/pages/home.js`, `paintAll` (pattern G4).
- Fix: extract `paintNow(root, els)`; schedule via rAF, then a `setTimeout(..., 300)` fallback clears `rafPending` and repaints.
- Regression test: with `document.hidden === true`, `set({ online: false })` shows `#netBanner`; back to true hides it.

### BUG-05 (MED) — Jewelry karat chips do not move the highlight (G1)
- File: `js/pages/jewelry.js`, `karatChips` (both main karat and old-gold karat groups).
- Fix: inside onclick: `current = k; onPick(k); sync();`.
- Regression test: click each chip; the highlighted chip moves instantly and reflected values follow. Other pages already use `e.currentTarget` style and are fine.

### BUG-06 (LOW) — Harden `store.set` against non-array values
- File: `js/store.js`, `set()`.
- Cause: `set({ currencies: null })` poisoned state; later `.includes()` calls crashed pages.
- Fix: inside `set()`, normalize non-array `currencies`/`metals` back to defaults before merging.
- Regression test: `set({currencies: null})` -> `get('currencies').length === 18`; same idea for `metals` -> 7.

## 5) Standard repair procedure (mandatory steps, in order)

1. Reproduce: run `python devserver.py 8080`; click through the minimal user steps that trigger the bug, or script it via `browser.evaluate`.
2. Diagnose with evidence, not guesses: inspect live values (store state, closures, DOM, console) and name the exact mechanism (which pattern G1..G6).
3. Fix one scoped thing: no drive-by refactors, no touching unrelated files; change the minimum needed.
4. Regression-test: rerun at least the relevant suite from `TEST-REPORT.md` (95+ cases, currently all green). No green = no merge.
5. Bump `VERSION` in `sw.js`.
6. Ship: `git add -A; git commit -m "fix(scope): ..."; git push origin master` — the workflow auto-uploads to Hostinger via SFTP.
7. Live verify: the More page badge must show the new version; if lower, the deployment failed.

## 6) Final acceptance gate

- Zero console errors across all 11 routes in both languages.
- All chips/segmented buttons move `.active` instantly (no G1).
- Home never comes back empty (BUG-01 closed).
- 5-minute history gap always enforced (BUG-02 closed).
- No Arabic text in English UI nor vice versa (BUG-03 closed; automated check).
- Offline banner works even in a hidden tab (BUG-04 closed).
- Only the four storage keys exist after a full session.
- `sw.js VERSION` incremented on every shipped fix.

## 7) Safety rules

- Do not delete any file or line you did not fully understand and audit first.
- Do not touch `manifest.json`, `assets/`, `seo.js`, `sitemap.xml`, `robots.txt`, or the legal pages unless the bug report explicitly names them.
- Never hard-code hosts, ports, IPs, or credentials in code or committed files — deployment credentials live only in GitHub repository secrets.
- Update the defect registry (`REPAIR-PROMPT.md` section 4) with any new bug you fix, keeping cause/fix/regression-test trio complete.

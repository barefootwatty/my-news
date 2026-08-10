# My News — maintenance notes

For whoever works on this next (human or Claude). Read this before changing anything.

## The promises (do not break these)

These were made to Glenn and, in writing, to the friends he shared the app with:

1. **$0/month forever.** No AI calls, no paid APIs, no paid tiers. Every feature
   must work within Vercel's free hobby plan and free data sources.
2. **Privacy: "no sign-up, no tracking, everything stays on your phone."**
   No accounts, no analytics, no cookies, no server-side storage of user data.
   Settings live only in the browser's localStorage. Any feature that would
   send user data anywhere is off the table unless Glenn explicitly re-decides.
3. **Simple enough to share.** One link, no install, no instructions needed.

## What it is

- Live: **https://my-news-au.vercel.app** (also my-news-beryl.vercel.app)
- Repo: **github.com/barefootwatty/my-news** — push to `main` auto-deploys
  (Vercel team "Barra Brain", hobby plan, project `my-news`)
- Local source: `/Users/glennwatt/Claude/Projects/My News`
- Git auth: SSH (`~/.ssh/id_ed25519`, added to Glenn's GitHub 21 Jul 2026).
  Use `git@github.com:barefootwatty/my-news.git`. The old HTTPS keychain token
  cannot write to this repo.

## Architecture (all of it)

| Piece | File | What it does |
|---|---|---|
| App shell | `index.html` | Welcome/settings screen + feed container. One page. |
| Logic | `app.js` | Settings (localStorage), feed build, themes, greeting, voice, card enrichment. |
| Styling | `style.css` | Theme via CSS variables set from JS. `[hidden]{display:none!important}` is load-bearing. |
| Feed fetch | `api/feed.js` | Vercel function. Proxies Google News RSS (`?q=` query, `&d=` days 1–7). CORS + 10 min CDN cache. |
| Card enrichment | `api/preview.js` | THE FRAGILE ONE — see below. |
| PWA | `manifest.webmanifest`, `sw.js`, `icon-*.png` | Add-to-home-screen. Bump the cache name in `sw.js` (`mynews-shell-vN`) when shipping UI changes. |
| Local dev | `dev_server.py` | `python3 dev_server.py` → localhost:8765. Mirrors both API functions in Python. NOT deployed. |

User settings key: `mynews.settings.v1` (JSON), background photo:
`mynews.bgphoto.v1` (JPEG data-URL) — both localStorage.

## The fragile bit: api/preview.js

Google News RSS links point at a Google redirect page, not the article.
`api/preview.js` decodes them using an **undocumented Google endpoint**
(`batchexecute` with `data-n-a-sg` / `data-n-a-ts` tokens scraped from the
redirect page). This is the same approach as the open-source
`googlenewsdecoder` projects. **Google can break it any day.**

- Failure mode is soft: cards show headline + source only (no photo/summary),
  links fall back to the Google redirect. The app keeps working.
- How to check: `curl "https://my-news-au.vercel.app/api/preview?u=<a google
  news rss article link>"` — healthy = JSON with `url`, `image`, `summary`;
  broken = `{}`.
- If it breaks: check how googlenewsdecoder (GitHub/PyPI) adapted, mirror the
  fix in BOTH `api/preview.js` and `dev_server.py`.
- Previews are CDN-cached 24h (`s-maxage=86400`) so each article is decoded
  once globally. A redeploy clears the Vercel CDN cache.

## Making changes

1. Edit locally, test with `python3 dev_server.py` → http://localhost:8765
   (cache-bust with `?v=N`; app state persists in the browser's localStorage —
   clear it to see the first-run welcome screen).
2. `git add -A && git commit && git push` → live in ~45 seconds.
3. Spot-check the live URL afterwards, including `/api/feed` and `/api/preview`.

## Tuning knobs

- Topics: `PRESETS` in `app.js` (label + Google News query). NT query is tuned
  to avoid people named Darwin: `"Northern Territory" OR "Top End" OR (Darwin Australia)`.
- **Relevance (added 10 Aug 2026):** Google News search results are shockingly
  loose (a `"fly fishing"` search returns NBA and deer-hunting stories), so each
  preset can carry `match` — words that must appear in the headline (word-start
  match, so "fish" also hits "fishing") — and optional `prefer` — words that
  float a story to the top (used to put saltwater fly stories first). Custom
  keywords are searched as a quoted phrase and matched against their own
  significant words. If a section goes empty too often, loosen its `match` list.
- **Swipe (added 10 Aug 2026):** swipe left = remove story (key stored in
  `settings.hiddenKeys`, cap 500); swipe right reveals 👍/👎. 👍 stores headline
  words in `boosts` (sorted up), 👎 in `brakes` (sorted down; 2+ hits = skipped).
  Caps 100 each. Words matching an active topic's `match`/`prefer` terms are
  never learned (`protectedTerms()`), so a 👎 on one Darwin story can't sink the
  NT section. "Start the learning fresh" in settings clears all three lists.
- Themes: `THEMES` in `app.js` — add a row, done.
- Preset topics search 2 days (or per-preset `days`); custom keywords 7 days
  (`activeSections()`). Saltwater fly news is scarce → flyfish preset uses 7.
- Cards per section: 8 (`renderSection`). Preview fetch concurrency: 4 (`enrichCards`).
- Junk summary filter: `cleanSummary()` in `app.js`.
- Shipping UI changes: bump `?v=N` on style.css/app.js in index.html AND the
  matching entries + cache name in `sw.js`.

## Known gaps / ideas backlog

- Photo background upload is untested with a real photo (canvas resize +
  localStorage quota path).
- "Good News" preset matches the literal phrase, so US sports "good news"
  stories sneak in. Better query welcome.
- Ideas Glenn liked but hasn't asked for: top-story banner, BOM weather strip
  (bom.gov.au has free feeds), per-section read-aloud buttons.
- Old retired site still up at barefoot-daily-news.vercel.app (frozen 15 Jul
  2026); its repo's nightly workflow is disabled but manual-runnable.

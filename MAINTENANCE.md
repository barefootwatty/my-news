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
   Fonts are bundled in `fonts/` for this reason — do NOT link Google Fonts or
   any other third-party script, font or stylesheet.
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
| Logic | `app.js` | Settings (localStorage), keyword parsing, feed build, looks, greeting, voice, card enrichment, setup link. |
| Styling | `style.css` | Colours via CSS variables set from JS (`THEMES`). `[hidden]{display:none!important}` is load-bearing. |
| Fonts | `fonts/` | Mulish (headings), Barlow (labels/UI), Caudex (summaries) — the AA brand fonts, latin subset, with their OFL licences. |
| Feed fetch | `api/feed.js` | Vercel function. Proxies a news RSS feed: `?q=` query, `&d=` days (1–365, 0 = no limit), `&s=b` for the Bing News backup (default Google News AU). 7 s timeout. Good answers CDN-cached 10 min; failures return 502 and are never cached. |
| Card enrichment | `api/preview.js` | THE FRAGILE ONE — see below. |
| PWA | `manifest.webmanifest`, `sw.js`, `icon-*.png` | Add-to-home-screen. The service worker is network-first, so a push reaches everyone on their next open. |
| Local dev | `dev_server.py` | `python3 dev_server.py` → localhost:8765. Mirrors both API functions in Python. NOT deployed (see `.vercelignore`). |

User settings key: `mynews.settings.v1` (JSON), background photo:
`mynews.bgphoto.v1` (JPEG data-URL) — both localStorage. `settings.v` is the
data version; `migrate()` in `app.js` runs one-off upgrades when it is behind
`DATA_VERSION`.

## How a section finds its stories (rebuilt Nov 2026)

The Nov 2026 complaint was "no news for my keywords". Three causes, all fixed:
multi-word keywords were searched as an exact quoted phrase (almost never
matches a headline); the window was capped at 7 days; and a blocked or failed
Google request came back as a cached "200" that the app showed as "nothing on
this topic".

Now, per section (`loadSection` in `app.js`):

1. Ask Google News for the section's first window (presets 2 days, keywords 7).
2. Keep only stories that are on-topic (`pick`). For a keyword, the headline or
   feed description must mention enough of its parts. Presets also count the
   publisher's name.
3. Fewer than 3 kept? A keyword also asks Bing News (once) and merges it in.
   Bing gets plain words only — it returns nothing for OR, brackets or quotes.
   Its feed carries the real article link, a summary and sometimes a picture,
   so those stories skip `api/preview.js` entirely.
4. Still fewer than 3? Widen and repeat — presets 2 → 7 days; keywords
   7 → 30 → 365 days. The 365-day step asks Google twice (`when:365d` and no
   limit) because each finds stories the other misses. Everything Google has
   returned so far is pooled. A gold note on the section says when it had to
   look back further.
5. A one-part keyword that is still short, where Google found 25 or fewer
   stories in total, is a rare term: stories from the past year are shown even
   if the headline doesn't contain the word (Google matched the article body).
6. Google failed outright? Bing alone carries the section. Both failed? The
   section shows a "Couldn't reach the news sources" message with a Try again
   button — never a false "nothing here".

Checked against the real feeds on 24 Nov 2026: both sources answer Vercel, and
`when:30d` / `when:365d` are honoured. See `HANDOVER.md` for what was found.

### Keyword syntax (`parseKeyword`)

Stored as plain strings in `settings.customKeywords`, so old keywords keep working.

| Typed | Means |
|---|---|
| `Bensbach` | stories must mention it |
| `barramundi stocking` | plain words: with up to three, every word must appear. Four or more may miss one, but never a place short form (`PNG`, `NT`, `Qld` and the rest of `KW_ALIAS`): those come back from `parseKeyword` as `must` |
| `yellowcheek / yellow cheek` | slash (with spaces) = either-or |
| `Lake Murray, PNG / Papua` | comma = must-have-both, every part required |
| `fly tying [streamer]` | brackets float matching stories to the top, but aren't required |
| `Bensbach, -Road` | a leading minus leaves out stories with that word in the headline or summary. It is not sent to Google: Google would also drop stories that only use the word in the article body |
| `F-150, Australia` | Australian stories only (see below) |
| `NT grants: NT, grant / funding` | `Name: ` prefix = short section name |
| anything with `( )` | passed to Google untouched (legacy) |

Matching (`termRe`): word-start, case-insensitive; long words also match their
endings (`grant` → grants); spaces and hyphens are interchangeable (`F-150` →
F150, `fly fish` → flyfishing); short words, numbers and CAPS acronyms of 2–3
letters must match exactly (`NT` never hits "ant" or "nt" inside a word).
In plain keywords `nt`, `png`, `qld` etc. expand to their full names, and
"Australia" becomes a bracket word rather than a required one.

"Australia" is special. A story counts as mentioning it when it says so, or
when its publisher is Australian: site ending `.au`, "australia" in the site
name, or listed in `AU_HOSTS` (Australian sites on a plain `.com` / `.io`: add to it when one turns up). It is sent to Google as a search word only from
square brackets.

PNG works the same way (27 Nov 2026). A publisher whose site ends in `.pg` (The
National, Post-Courier, NBC PNG, EMTV), or is listed in `PG_HOSTS` (PNG outlets
on a plain `.com`), counts as mentioning "PNG" and "Papua New Guinea". PNG
papers write "Lake Murray communities struggle to find water", never "PNG".

`RETUNE` in `app.js` is a one-off map that swaps Glenn's six dead keywords (and
the first attempt at tuning them) for the versions in `TUNED`. Tune a keyword for him by sending a setup
link (below) or having him retype it. The swap runs once per data version, so a
keyword he retypes plain afterwards stays plain. To run it again, bump
`DATA_VERSION` (done for v6, 27 Nov 2026: a retyped "Lake Murray PNG").

### Setup link

Settings → "Copy my setup link" builds `…/#setup=<base64 JSON>` carrying
topics, keywords, blocked words and look (not the photo or the learning lists).
Opening it shows a confirm box before anything is replaced. The data sits after
the `#`, which browsers never send to a server — the privacy promise holds.
Note: an iPhone home-screen app keeps its own storage, separate from Safari.

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
- **Relevance (10 Aug 2026):** Google News search results are shockingly
  loose (a `"fly fishing"` search returns NBA and deer-hunting stories), so each
  preset can carry `match` — words the story must mention (word-start match, so
  "fish" also hits "fishing") — and optional `prefer` — words that float a story
  to the top (used to put saltwater fly stories first). If a section goes empty
  too often, loosen its `match` list. Custom keywords: see the syntax above.
- **Story actions:** swipe left = hide (key stored in `settings.hiddenKeys`,
  cap 500); swipe right, or the ⋯ button, opens More like this / Less like this
  / Hide. "More" stores headline words in `boosts` (sorted up), "Less" in
  `brakes` (sorted down; 2+ hits = skipped). Caps 100 each. Words belonging to
  an active topic are never learned (`protectedTerms()`), so one "Less" on a
  Darwin story can't sink the NT section. "Start the learning fresh" in settings
  clears all three lists.
- **Wrong topic (27 Nov 2026):** the fourth button in that same menu. It hides
  the story and keeps its publisher out of that one topic (`settings.topicBlocks`,
  cap 300; each entry is topic key, topic name, publisher name, publisher site
  and the hidden story). `pick()` skips a story when the publisher's name or
  site matches a block for the section. The topic key is `p:<preset id>` or
  `k:<section name, lower-case>`, so re-tuning a keyword's rule keeps its
  blocks. Settings lists them under "Publishers blocked from a topic"; tapping a
  name removes the block and un-hides the story. Not cleared by "Start the
  learning fresh", and not carried by the setup link.
- Looks: `THEMES` in `app.js`. `auto` = Day/Night following the device. Day and
  Night are the Angling Adventures palette (navy #093657, sky #1798CF, gold
  #E0A23B — **no orange, ever**; source of truth is the Drive doc
  `AA-Brand-Reference`). Walkabout is olive / cork / nickel. No logos anywhere:
  Glenn's call, Nov 2026 — it's his personal app, not an AA product.
- Windows: `ladder` in `activeSections()`. Minimum stories before widening:
  `MIN_STORIES` (3).
- Stories per section: 8, or 5 from the year-long look-back (`renderSection`).
  The first story of each section is the "lead" (big headline; full-width
  picture when the image is 480px+ wide).
- Pictures and summaries load only for stories on or near the screen
  (`previewWatch`), 4 at a time (`queuePreview`).
- Junk summary filter: `cleanSummary()` in `app.js`.
- Shipping UI changes: bump `?v=N` on style.css/app.js in index.html AND the
  matching entries + cache name in `sw.js`. (Both are `v=7` as of 27 Nov 2026.) If you add a file to the `FILES`
  list in `sw.js`, make sure it exists — one 404 there and the new service
  worker never installs.

## Known gaps / ideas backlog

- **Bing News feed** (`https://www.bing.com/news/search?q=…&format=rss`) is as
  unofficial as the Google one. If it changes shape, `parseBing()` in `app.js`
  is the only place that reads it; failure is soft (the backup just adds nothing).
- Photo background upload is untested with a real photo (canvas resize +
  localStorage quota path).
- "Good News" preset: widened in Nov 2026 to heartwarming / uplifting /
  kindness words. Still imperfect; tune `match` if junk sneaks in.
- Yellowcheek, Bensbach and fly-tying patterns barely make the *news*. The real
  content is on YouTube, Reddit and blogs — a possible free add-on source, not
  yet investigated.
- Ideas Glenn liked but hasn't asked for: BOM weather strip (bom.gov.au has
  free feeds), per-section read-aloud buttons.
- Old retired site still up at barefoot-daily-news.vercel.app (frozen 15 Jul
  2026); its repo's nightly workflow is disabled but manual-runnable.

# My News test harness

Runs the app with no internet. `server.js` serves the repo's static files and
runs the **real** `api/feed.js` and `api/preview.js`, but replaces every upstream
fetch (Google News, Bing News, article pages) with fixtures.

The fixtures imitate the feeds; they are not recordings. Passing here proves the
app's own logic, not that Google or Bing still answer the way the fixtures assume.

## Where it goes

This folder lives at `dev/test/` in the repo. `server.js` finds the repo two
levels up (set `MYNEWS_ROOT` to point elsewhere). `dev/` is in `.vercelignore`,
so none of this is served on the live site.

## Run

    pip install playwright pillow && python -m playwright install chromium
    node server.js &            # http://127.0.0.1:8765
    python run.py               # smoke test, exits non-zero on failure
    python run2.py              # interaction tests, prints a JSON report
    # optional: CHROME=/path/to/chrome to use an installed browser
    # optional: PORT=8791 on all three commands when something else is using 8765

Screenshots and `report.json` land in `out/`.

## What the fixtures do (see google() and bing() in server.js)

The stories are invented, but each junk case copies a kind of junk the real
feeds returned on 24 Nov 2026.

| Section | Behaviour it exercises |
|---|---|
| Top End, Fishing | normal presets, with off-topic stories that must be filtered out |
| Good News | Australian-only preset: overseas "feel-good" stories dropped |
| Yellowcheek | nothing recent; a namesake fish removed by `-darter`; one Bing story matched on its description |
| NT business grants | needs a place, a money word and an Australian publisher; Bing adds a third story at 30 days |
| Bensbach | house listings removed by `-Road`; the only story is a rare-term fallback |
| Lake Murray PNG | South Carolina stories dropped; 4 PNG stories kept: one from a `.pg` paper whose headline never says PNG, and NBC PNG's, which only the ask for its site by name returns. Listing pages from those asks dropped; one of the three asks fails and is ignored |
| Fly tying | all fly tying stories count; the streamer one leads |
| AFANT | one headline match plus two rare-term fallbacks; a Maltese association dropped |
| F-150 | Japan-market story dropped; Australian publishers kept |
| googledown | Google fails: Bing alone carries the section |
| downtest | both sources fail: the "Couldn't reach the news sources" message |

`run2.py` also asserts three things added on 27 Nov 2026: plain keywords keep
their place word, "Wrong topic" blocks a publisher from one topic only (and
settings can undo it), and the keyword upgrade runs again for data version 6.

Bing's fixture returns nothing for any query containing OR, brackets or quotes,
as the real feed does. A section that relies on Bing only passes if the app
sends plain words.

# My News test harness

Runs the app with no internet. `server.js` serves the repo's static files and
runs the **real** `api/feed.js` and `api/preview.js`, but replaces every upstream
fetch (Google News, Bing News, article pages) with fixtures.

The fixtures imitate the feeds; they are not recordings. Passing here proves the
app's own logic, not that Google or Bing still answer the way the fixtures assume.

## Where it goes

Put this folder at `dev/test/` in the repo (`server.js` finds the repo two levels
up; set `MYNEWS_ROOT` to point elsewhere). If you commit it, add `dev/` to
`.vercelignore` so it is not served on the live site.

## Run

    pip install playwright pillow && python -m playwright install chromium
    node server.js &            # http://127.0.0.1:8765
    python run.py               # smoke test, exits non-zero on failure
    python run2.py              # interaction tests, prints a JSON report
    # optional: CHROME=/path/to/chrome to use an installed browser

Screenshots and `report.json` land in `out/`.

## What the fixtures do (see google() and bing() in server.js)

| Query contains | Behaviour it exercises |
|---|---|
| `Top End`, `fishing Australia` | normal presets, with off-topic stories that must be filtered out |
| `yellowcheek` | nothing for 7 or 30 days; old stories in the year look-back; one Bing story matched on its description only |
| `voucher` (NT grants) | 2 on-topic Google stories, so Bing is asked and adds a third |
| `Bensbach` | 1 story at 30 days, 3 in the year look-back |
| `Lake Murray` | South Carolina stories that must be dropped; 2 PNG stories kept |
| `streamer` | nothing anywhere: the "No stories" message |
| `AFANT` | Google returns 503: Bing alone carries the section |
| `F-150` | steering words float Australian stories to the top |
| `downtest` | both sources fail: the "Couldn't reach the news sources" message |

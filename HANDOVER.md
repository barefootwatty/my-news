# My News — handover to Claude Code

Written 24 Nov 2026 by the Claude chat session that did the November rebuild.
Reader: Claude Code, picking the app up cold. Owner: Glenn Watt ("Watty", "GW").

Read this first, then `MAINTENANCE.md`. `MAINTENANCE.md` is the standing
reference for how the app works. This file is the state of play and your job list.

---

## 1. The short version

- **What it is:** Glenn's personal news reader. A static page plus two tiny
  Vercel functions. No build step, no framework, no dependencies, no database.
- **Live:** https://my-news-au.vercel.app, running `main`. As of 25 Nov 2026 that includes
  everything on `tune-real-feeds` plus the Mac fixes in section 7b. Sections 1 and 2 below are history.
- **Repo:** https://github.com/barefootwatty/my-news (public). Push to `main`
  deploys to production in about 45 seconds.
- **This branch, `tune-real-feeds`, is not live.** It holds fixes written after
  the live app was checked against the real news feeds for the first time. The
  fixes pass the offline tests. They have **not** been run against real feeds.
- **Glenn stopped the chat session mid-way and wants the rest done in Claude
  Code.** Your job is section 2.

---

## 2. Your job list

1. **Check where you are.** Run `git status` and `git log -1`. If this is
   Glenn's Mac folder it may be on the August code, and may hold changes of his
   own. Don't discard anything. Then get this branch:
   `git fetch origin && git checkout tune-real-feeds`
2. **Run the offline tests** to confirm the branch is sound on this machine.
   Steps in `dev/test/README.md`. Both should pass as they did on 24 Nov.
3. **Run the branch against the real feeds.** `python3 dev_server.py`, open
   http://localhost:8765, and load Glenn's setup: section 7 has a snippet for
   the browser console. This needs open internet, which a Mac session has and a
   cloud session may not.
4. **Judge each section** against section 5. For every keyword: is anything
   shown off-topic? Is anything obviously on-topic missing? Fix the rule in
   `TUNED` (`app.js`), or the engine if the rule can't express it.
5. **Check pictures and summaries appear** on stories. That is `api/preview.js`,
   the fragile part. It was not checked on 24 Nov.
6. **Show Glenn** what each section now shows, in dot points. Ask for his go.
7. **On his go:** merge to `main`, push, wait about a minute, then check the live
   site the same way. Bump nothing further: the version numbers are already `5`.
8. **Tidy up:** delete the `freshen-up` branch (identical to `main` at `f92ded1`)
   and this branch once merged. Ask first.
9. **Ask Glenn to open the app on his phone twice** and say which sections are
   empty or showing junk. His real settings live only on his phone.

---

## 3. Who you're working for

- Glenn is a fishing guide and business owner in Darwin, not a programmer. He
  dictates by voice, so expect loose wording and the odd mis-transcription.
- Write to him in dot points with plain words. He does not read paragraphs.
- No jargon. If you must name a tool, repo or file, say what it is in the same breath.
- Anything he has to open or click needs the link on the same line.
- Do everything you can yourself. Only hand him what you truly cannot do.
- Say how sure you are: certain, likely or guessing. Say what you couldn't verify.
- Australian English.
- Don't ask him things the repo or this file already answers. Decide and tell him.
- Ask before pushing to `main`. Building and testing need no permission.
- No persona. Elsewhere he works with a "Pepper" chief-of-staff setup; that does
  not apply in Claude Code.

---

## 4. Where everything is

| Thing | Where |
|---|---|
| Live app | https://my-news-au.vercel.app (also my-news-beryl.vercel.app) |
| Repo | https://github.com/barefootwatty/my-news |
| Live commit | `f92ded1` on `main` (the 21 Nov rebuild) |
| This branch | `tune-real-feeds` |
| Rollback point | `f7c2a5d`, 10 Aug 2026, the version before the rebuild |
| Hosting | Vercel, team "Barra Brain" (`barra-brain`), project `my-news`, hobby plan |
| Deploy status | `gh api "repos/barefootwatty/my-news/deployments?per_page=3"`, then `/deployments/<id>/statuses` |
| Standing reference | `MAINTENANCE.md` |
| Offline tests | `dev/test/` (see its `README.md`) |
| Glenn's Mac copy | `/Users/glennwatt/Claude/Projects/My News` |

- Git auth on the Mac is SSH (`git@github.com:barefootwatty/my-news.git`). The
  old HTTPS keychain token cannot write to the repo. Reading works either way,
  because the repo is public.
- Pushing any branch makes Vercel build a preview. Previews are likely behind
  Vercel login.
- A second repo, `barefootwatty/barefoot-daily-news`, is a different project.

---

## 5. What the real feeds showed (24 Nov 2026)

Checked by loading the live app (`f92ded1`) in a browser with Glenn's six
original keywords in storage, and by calling `/api/feed` directly.

### Confirmed working

- Google News answers the Vercel function. 37 stories for "fishing Australia"
  over 2 days.
- Bing News answers the Vercel function and returns RSS.
- The date windows work. `when:30d` returned stories aged 0 to 30 days;
  `when:365d` returned stories aged 5 to 363 days.
- The automatic keyword swap worked. The six old keywords became seven tuned ones.
- Top End, Fishing and Fly Fishing presets showed sensible stories.
- No JavaScript errors.

### Things learned about the feeds

- **Bing returns nothing for `OR`, brackets or quotes.** `AFANT` gave 8
  stories; `AFANT OR "Amateur Fishermen's Association"` gave 0. Every tuned
  keyword was sending Bing a query it couldn't answer.
- Bing gives about 8 stories per query, sorted by relevance, many of them years old.
- Bing's item shape is as `parseBing` assumed. `News:Image` is missing on some items.
- **Google with no date limit and Google with `when:365d` return different
  stories.** For `AFANT`, no-limit found a 207-day-old story that `when:365d` missed.
- Google's `site:au` does not work as a filter here. `"F-150" site:au` returned
  everything from one Australian site, mostly not about the F-150.
- Each Google item carries its publisher's site in `<source url="…">`. That is
  how the branch tells an Australian publisher.
- Google's description field repeats the publisher's name. The live code
  matches keywords against it, so a publisher called "NT News" satisfies an
  "NT" rule on every story it runs.

### What each keyword section showed live, and why

| Section | Live result | Cause |
|---|---|---|
| Yellowcheek | Empty | True. Google has 4 stories ever, none in the past year. Bing returns the "yellowcheek darter", an unrelated American fish. |
| NT business grants | One story: an American paper's "NT Daily" column | "NT" matched the paper's initials. Real stories exist but their headlines rarely hold all three required parts. |
| Bensbach | One story: a house listing on Bensbach Road, Glenfield | From Bing. Google has one story in the past year, and it names Bensbach only in the article body. |
| Lake Murray PNG | Two stories, both right | Working. The South Carolina and Oklahoma lakes were filtered out. |
| Streamer fly tying | One story, 11 months old | Too narrow. General fly tying has about 9 stories a month. |
| AFANT | One right, one wrong (a Maltese fishermen's association) | The alternative "Amateur Fishermen's Association" was too loose. Recent stories quote AFANT only in the article body. |
| F-150 | Five stories, mostly Japan-market news and an Isuzu "F Series" recall | Nothing required the story to be Australian. "F-Series" matched Isuzu. |
| Good News (preset) | American and Indian "feel-good" items | Nothing required the story to be Australian. |

### Not checked

- Whether pictures and summaries load on stories (`api/preview.js`).
- Anything on a real iPhone, including the home-screen app.
- What is actually stored on Glenn's phone.

---

## 6. What's on this branch

One commit of code on top of `f92ded1`, plus this file.

- **Bing gets plain words.** `parseKeyword` now also builds `bing`: the first
  alternative of each part, no operators. Presets carry their own `bing` string.
- **The year-long look asks Google twice,** with `when:365d` and with no limit,
  and pools everything seen across all windows (`loadSection`).
- **Keywords match on headline and description only.** The publisher's name is
  stripped from Google's description. Presets still count the publisher's name,
  which is what lets "Fishing World" stories through the Fishing filter.
- **`-word` leaves stories out.** `Bensbach, -Road, -Glenfield`. Applied to the headline in the app only.
  It is no longer sent to Google (changed 24 Nov in Claude Code): `-Road` in the search hid the one real
  Bensbach story, because the article body mentions a road.
- **"Australia" as a must-have part is met by an Australian publisher.** A site
  ending in `.au`, a site with "australia" in its name, or one listed in
  `AU_HOSTS` (`miragenews.com`, `torquecafe.com`, `thedriven.io`). It is not sent to Google as a
  search word unless it's in square brackets.
- **Rare single-term keywords fall back to Google's own match.** If a keyword
  has one part, still has fewer than 3 stories, and Google found 25 or fewer
  stories in total, stories from the past year are shown even when the headline
  doesn't contain the word. This is what surfaces stories that only quote AFANT.
- **Square-bracket words now only float stories up.** Only "Australia" in
  brackets still goes into the search.
- **Good News preset is Australian-only** (`au: true`).
- **Keywords re-tuned,** data version 5. `RETUNE` maps both the original six and
  the first attempt's strings to the current ones in `TUNED`.
- **`dev/test/`** added, with fixtures rebuilt around the junk listed in section 5.
- Version numbers bumped to `5` in `index.html`, `sw.js` and `DATA_VERSION`.

Tested: `dev/test/run.py` and `dev/test/run2.py` both pass. That proves the
app's own logic against imitation feeds. It does not prove the rules are right
against real ones. A Vercel preview of the code commit was built but never opened.

---

## 7. Glenn's keywords on this branch

| Section | Rule (as stored) | Sent to Google | Sent to Bing |
|---|---|---|---|
| Yellowcheek | `yellowcheek / yellow cheek carp / Elopichthys, -darter` | `(yellowcheek OR "yellow cheek carp" OR Elopichthys)` | `yellowcheek` |
| NT business grants | `Northern Territory / NT / Territorian / Darwin, grant / voucher / rebate / funding round, business / industry / tourism / operator / trader, Australia` | place AND money word AND business word | `Northern Territory grant business` |
| Bensbach | `Bensbach, -Road, -Glenfield` | `Bensbach` | `Bensbach` |
| Lake Murray PNG | `Lake Murray, PNG / Papua New Guinea / Papua / Western Province / black bass` | `"Lake Murray" (PNG OR "Papua New Guinea" OR Papua OR "Western Province" OR "black bass")` | `Lake Murray PNG` |
| Fly tying | `fly tying / fly tier / fly pattern [streamer / clouser / deceiver / baitfish]` | `("fly tying" OR "fly tier" OR "fly pattern")` | `fly tying` |
| AFANT | `AFANT / Amateur Fishermen's Association of the NT / Amateur Fishermen's Association of the Northern Territory` | the same three, joined with OR | `AFANT` |
| F-150 | `F-150, Australia / Aussie [Australia]` | `"F-150" Australia` | `F-150 Australia` |

What to expect, and what to doubt:

- **Yellowcheek** will stay empty. That is the truth, and Glenn has been told
  these niche topics barely make the news.
- **Bensbach** should show the one body-mention story, or nothing.
- **NT business grants** is the weakest rule. "funding" is broad and will let in
  hospital and flood funding stories from the NT. "Grant" also matches people
  named Grant. Tune it against what you see.
- **F-150** should drop to a handful of Australian stories a month.
- **AFANT** relies on the rare-term fallback. Check the fallback stories really
  are about NT fishing.
- **Fly tying** is broader than Glenn asked for ("streamer fly tying pattern").
  Streamer stories float to the top. If he wants streamers only, make
  `streamer / clouser / deceiver / baitfish` a required part.

Background for judging relevance: Bensbach and Lake Murray are fishing lodges in
Papua New Guinea that Glenn sends clients to. AFANT is the Amateur Fishermen's
Association of the NT; he is on its board. Yellowcheek (*Elopichthys bambusa*)
is a predatory carp of the Amur basin. He wants Australian F-150 news, not US.

To load his setup in a browser for testing (his preset topics are unknown, so
this uses a plausible set):

```js
localStorage.setItem("mynews.settings.v1", JSON.stringify({
  onboarded: true, name: "Watty", theme: "sunset",
  presetIds: ["nt", "fishing", "flyfish", "goodnews"],
  customKeywords: ["yellow cheek carp fishing", "nt small business grant", "bensbach river png",
    "lake murray png", "streamer fly tying pattern", "AFANT F150 australia"],
  muteOn: false, muteWords: [], hiddenKeys: [], boosts: [], brakes: [], swipeTipSeen: true }));
location.reload();
```

---

## 7a. Real-feed check, 24 Nov 2026 (Claude Code, cloud)

Branch run against real Google and Bing feeds. No JavaScript errors. Offline tests pass.
- NT business grants was letting in road, hospital and Melbourne "Territory" funding
  stories (5 of 6 wrong). Rule tightened: dropped bare "Territory" and bare "funding",
  added a required business word. Now shows the one real business grant story of the year.
- Pictures: the live `/api/preview` returned a picture for 4 of 8 sample stories.
  Some publishers block it; that is the known fragile part.
- AFANT shows 2 AFANT headlines plus NT croc stories that Google matched on the
  article body (rare-term fallback). Likely AFANT is quoted in them; not verified.

## 7b. Real-feed run, 24 Nov 2026 (Claude Code, Glenn's Mac)

Run with `dev_server.py` and the section 7 snippet. Offline tests pass before and after.

- **Top End, Fishing, Fly Fishing, Lake Murray, Fly tying, F-150:** on-topic. F-150 is all Australian.
- **Good News:** Australian-only works. A few weak ones remain (a cricket story, "good news" used loosely).
- **Yellowcheek:** empty, which is true.
- **Bensbach:** was empty. Now shows the one body-mention story (11 months old; it drops off in mid-December).
- **NT business grants:** the cloud session's rule (7a) is the one kept. It was already live, so no settings upgrade was needed.
- **AFANT:** 2 real AFANT stories plus 3 fallback stories, all the same NT croc-versus-fisherman story.
- **Pictures and summaries:** working. 35 of 52 stories had a picture, 49 of 52 linked straight to the
  article. NT News and The Australian block the preview fetch, so their stories show headline only.
- A non-breaking hyphen (`F‑150`) is now read as a plain one.
- No Node on the Mac: the offline test server was run with the Node bundled inside the Python
  `playwright` package (`…/site-packages/playwright/driver/node`), in a throwaway venv, with `CHROME` set
  to the installed Google Chrome.
- **Heads-up:** the cloud session merged this branch to `main` and pushed it live (`e6f77b6`) the same
  evening. The Mac work was merged on top of that and shipped as version 6 of the app files.

## 7c. Three fixes, 27 Nov 2026 (Claude Code, Glenn's Mac)

Found by Glenn on the live app. Tested on the real feeds and offline (`run.py`, `run2.py` pass).

- **Plain keywords keep the place.** Up to three plain words: all required. Four or more may miss
  one, never a place short form (`PNG`, `NT`, `Qld`…). `parseKeyword` returns those as `must`.
  Before: a hand-typed "Lake Murray PNG" showed 8 American stories. After: none.
- **The upgrade runs again** (`DATA_VERSION` 6), so a plain "lake murray png" saved after the first
  upgrade is swapped for the tuned rule.
- **A `.pg` publisher counts as mentioning PNG** (`isPg`, `PG_HOSTS`). The tuned Lake Murray rule
  went from 2 stories to 6 in the past year (5 shown: the year-long look-back caps at 5).
- **"Wrong topic" button** in the story menu (swipe right or ⋯). Blocks that publisher for that
  topic only. Listed, with undo, in settings. See `MAINTENANCE.md`.
- App files are `v=7`. Live as `9b337e1`, checked on the live site.

### PNG outlets: what was found

Checked from Glenn's Mac on 27 Nov 2026. The "cheapest build" at the end of this list was then built
the same day (`app.js?v=8`): see "PNG outlets, asked for by name" in `MAINTENANCE.md`. On the real
feeds it added the NBC PNG drought story to Lake Murray PNG. The papers' own feeds are not used.

- **Google already has NBC PNG.** `"Lake Murray" site:nbc.com.pg` returns "Lake Murray dries up as
  severe drought hits PNG's Western Province" (7 Aug 2026). The normal search never returns it, and
  neither does a search naming several sites with OR. NBC PNG has to be asked for on its own.
- **Post-Courier:** WordPress. Open feed at `/feed/`, and an open search at
  `/wp-json/wp/v2/posts?search=…` (date, link, title, excerpt, picture). Its search *feed* returns nothing.
  The live preview function reached it from Vercel.
- **The National:** WordPress behind Cloudflare. Search feed (`/?s=…&feed=rss2`) and the same JSON
  search answered the Mac; `/feed/` got a Cloudflare challenge. The live preview function got no
  picture or summary from it, so Vercel is likely blocked. Its `robots.txt` shuts out Bing entirely,
  which is why Bing never has it.
- **NBC PNG:** `www.nbc.com.pg` has no feed and bars robots from `/search`. Its WordPress back end,
  `wp.nbc.com.pg`, has an open `/feed/` and the same JSON search. That address is not advertised.
- **Loop PNG:** `looppng.com` no longer resolves. Nothing to add.
- Cheapest build: for keywords that name PNG, one extra Google ask per outlet (`<search> site:nbc.com.pg`
  and so on) through the existing `api/feed.js`. No new source, no new function code.

## 8. Decisions already made

Don't re-open these unless Glenn does.

- The app is just for Glenn. It is not an Angling Adventures product.
- No logos. Angling Adventures colours and fonts, "premium" feel.
- The name stays "My News".
- The three promises in `MAINTENANCE.md` hold: $0 a month forever, no sign-up
  and no tracking, simple enough to share with a link.
- No orange in the Day and Night looks.
- Order of work, from a review Glenn asked for: fix the empty feed before
  anything cosmetic, keep branding quiet, aim for sections that are never empty.

---

## 9. Known issues and rough edges

1. **The fixes on this branch are unproven on real feeds.** Section 2.
2. **Rare-term fallback can show junk** if Google returns loosely related
   stories for a rare word. It is limited to one-part keywords and small result
   sets for that reason. Watch it.
3. **First open after an update shows the old version** for anyone still on the
   August service worker. Opening the app twice fixes it. On an iPhone
   home-screen app: swipe it closed and reopen.
4. **iPhone home-screen storage is separate from Safari's.** A setup link
   opened in Safari does not change the home-screen app.
5. **Keywords can't be edited, only removed and re-added.** On a phone there is
   no way to see the rule behind a chip.
6. **Section order is fixed:** presets in `PRESETS` order, then keywords in the
   order added.
7. **"Charles Darwin" stories pass the Top End filter** because `darwin` is in
   its match list.
8. **AFL, NRL, Cricket, Money and World presets have no relevance filter.**
9. **A keyword containing a colon and a space is read as `Name: rule`.**
10. **Bing thumbnails load from bing.com in the reader's browser.** Images are
    requested with no referrer.
11. **Photo background** has never been tested with a real photo from a phone.
12. **Timeouts:** the function gives up on upstream after 7 seconds, the browser
    gives up on the function after 12. A quiet keyword can make up to five
    requests before it settles.

---

## 10. Ideas, not commitments

- Extra free sources for the niche topics (YouTube, Reddit, blogs). Not
  investigated. Must stay inside the $0 and no-tracking promises.
- Edit a keyword in place, and show its rule on tap.
- Drag to reorder sections.
- BOM weather strip (bom.gov.au has free feeds).
- A read-aloud button per section.
- Match lists for the unfiltered presets.
- Replace the imitation fixtures in `dev/test/server.js` with trimmed real responses.

---

## 11. Working on it

- No build. Edit the files, serve the folder, push.
- Local run against real feeds: `python3 dev_server.py`, then
  http://localhost:8765. It mirrors both functions in Python, so keep it in step
  with `api/*.js` when you change them. `api/feed.js` did not change on this branch.
- **Shipping a UI change:** bump `?v=N` on `style.css` and `app.js` in
  `index.html`, and the matching entries and cache name in `sw.js`.
- **Every file in the `FILES` list in `sw.js` must exist.** One 404 there and
  the new service worker never installs.
- **Changing stored settings:** bump `DATA_VERSION` in `app.js` and add the
  upgrade to `migrate()`.
- **No third-party scripts, fonts or stylesheets.** That is the privacy promise.
- **No lookbehind in regular expressions.** Older iPhones throw on it.
- `api/preview.js` is the fragile part. Read its section in `MAINTENANCE.md`
  before touching it.
- A cloud session may not be able to reach `vercel.app`, Google or Bing from
  its shell. A session on Glenn's Mac can.
- Port 8765 may be taken by another of Glenn's projects. `python3 dev_server.py 8792` and
  `PORT=8791` for the offline tests (`dev/test/README.md`) use other ports. Don't stop the other server.
- The offline swipe tests must centre a story on screen before dragging it (`centre()` in
  `dev/test/run_common.py`): at the top of the screen the sticky top bar takes the drag.

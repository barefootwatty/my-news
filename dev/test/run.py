"""Smoke test: load the app as an old install, check the keyword migration and
what every section ends up showing. Exits non-zero if an expectation fails."""
import json, sys
from playwright.sync_api import sync_playwright
from run_common import *

EXPECT = {  # section -> (stories, note starts with, empty/error text starts with)
    "Top End & NT": (7, None, None), "Fishing": (3, None, None), "Good News": (2, None, None),
    "Yellowcheek": (3, "Quiet topic", None), "NT business grants": (3, "Quiet week", None),
    "Bensbach": (1, "Quiet topic", None), "Lake Murray PNG": (4, None, None),
    "Fly tying": (3, None, None), "AFANT": (3, "Quiet topic", None), "F-150": (3, "Quiet week", None),
    "googledown": (2, None, None), "downtest": (0, None, "Couldn't reach the news sources"),
}
with sync_playwright() as p:
    b = launch(p)
    ctx, pg, errs = page_for(b, "light", touch=True)
    pg.goto(URL); wait_feed(pg); scroll_all(pg)
    data = pg.evaluate("""() => ({
      kws: JSON.parse(localStorage.getItem('mynews.settings.v1')).customKeywords,
      theme: document.documentElement.dataset.theme,
      sections: [...document.querySelectorAll('.section')].map(s => ({
        h: s.querySelector('h2').textContent,
        note: s.querySelector('.note') ? s.querySelector('.note').textContent : null,
        empty: s.querySelector('.empty') ? s.querySelector('.empty').textContent.trim() : null,
        stories: [...s.querySelectorAll('.cardwrap')].map(c => c.querySelector('.headline').textContent)
      }))
    })""")
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("smoke-top.png")); pg.screenshot(path=shot("smoke-full.png"), full_page=True)
    b.close()
bad = [("js errors", errs)] if errs else []
got = {s["h"]: s for s in data["sections"]}
for name, (n, note, empty) in EXPECT.items():
    s = got.get(name)
    if not s: bad.append((name, "section missing")); continue
    if len(s["stories"]) != n: bad.append((name, "stories %d, expected %d" % (len(s["stories"]), n)))
    if (note is None) != (s["note"] is None) or (note and not s["note"].startswith(note)): bad.append((name, "note: %r" % s["note"]))
    if empty and not (s["empty"] or "").startswith(empty): bad.append((name, "empty text: %r" % s["empty"]))
JUNK = ["gibbon", "darter", "South Carolina", "Melbourne tram", "Bensbach Road", "Sliema", "NT Daily", "drilling grant", "Black Spot", "Heritage Grants", "Japanese", "rock songs", "Kindness awards", "Cricketer", "Archives", "My Blog Page", "Maso cup"]
junk = [t for s in data["sections"] for t in s["stories"] if any(j in t for j in JUNK)]
if junk: bad.append(("off-topic stories shown", junk))
if len(data["kws"]) != 9 or data["theme"] != "day": bad.append(("migration", data["kws"], data["theme"]))
if not any("dries up" in t for t in got.get("Lake Murray PNG", {}).get("stories", [])): bad.append(("NBC PNG story (only found by asking for its site by name) missing", got.get("Lake Murray PNG")))
first = {s["h"]: (s["stories"] or [""])[0] for s in data["sections"]}
if "streamer" not in first.get("Fly tying", ""): bad.append(("streamer story should lead Fly tying", first.get("Fly tying")))
for s in data["sections"]:
    print("%-20s %d stories  note=%s  %s" % (s["h"], len(s["stories"]), s["note"], (s["empty"] or "")[:45]))
print("FAILED: " + json.dumps(bad, indent=1) if bad else "SMOKE TEST PASSED")
sys.exit(1 if bad else 0)

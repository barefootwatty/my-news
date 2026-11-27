import json, os
PORT = os.environ.get("PORT", "8765")  # set PORT for both server.js and these scripts when 8765 is taken
URL = "http://127.0.0.1:%s/" % PORT
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# Settings exactly as an old (pre-Nov-2026) install stored them: no data version,
# a retired theme, and Glenn's six original keywords. Loading this exercises migrate().
OLD = {"onboarded": True, "presetIds": ["nt", "fishing", "goodnews"], "theme": "sunset", "name": "Watty",
       "customKeywords": ["yellow cheek carp fishing", "nt small business grant", "bensbach river png", "lake murray png",
                          "streamer fly tying pattern", "AFANT F150 australia", "googledown", "downtest"],
       "muteOn": False, "muteWords": [], "voiceURI": "", "rate": 1, "hiddenKeys": [], "boosts": [], "brakes": [], "swipeTipSeen": True}

def launch(p):
    """Chrome for the tests. Set CHROME=/path/to/chrome to use an installed browser;
    otherwise Playwright's own Chromium is used (python -m playwright install chromium)."""
    exe = os.environ.get("CHROME")
    return p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe else p.chromium.launch()

def route_img(route):
    name = "small.jpg" if "small" in route.request.url else "wide.jpg"
    route.fulfill(path=os.path.join(HERE, name), content_type="image/jpeg")

def page_for(b, scheme, w=390, h=844, store=OLD, touch=False):
    ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, color_scheme=scheme, has_touch=touch, is_mobile=touch)
    ctx.route("https://img.test/**", route_img)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "ERR_" not in m.text and "status of 502" not in m.text else None)
    if store is not None:
        pg.add_init_script("if(!localStorage.getItem('mynews.settings.v1')) localStorage.setItem('mynews.settings.v1', %s)" % json.dumps(json.dumps(store)))
    return ctx, pg, errs

def wait_feed(pg):
    pg.wait_for_function("!document.getElementById('feed').hidden && document.querySelectorAll('.skel').length === 0", timeout=30000)

def scroll_all(pg):
    for y in range(0, 12000, 500):
        pg.evaluate("y => window.scrollTo(0, y)", y); pg.wait_for_timeout(100)
    pg.wait_for_timeout(1000)

def centre(pg, loc):
    """Put a story in the middle of the screen and return its box. A drag has to start on the story itself:
    off screen it hits nothing, and at the very top of the screen it hits the sticky top bar instead."""
    loc.evaluate("e => e.scrollIntoView({ block: 'center' })"); pg.wait_for_timeout(150)
    return loc.bounding_box()

def shot(name):
    return os.path.join(OUT, name)

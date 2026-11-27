"""Interaction tests: keyword matching and parsing, story actions, swipes, settings,
setup link, first run, looks, and the offline fallback. Prints a JSON report and
writes screenshots to out/. Read the report - it does not assert everything."""
import json, base64
from playwright.sync_api import sync_playwright
import os
from run_common import *
res = {}
with sync_playwright() as p:
    b = launch(p)
    # --- J: matcher + parser unit checks ---
    ctx, pg, errs = page_for(b, "light")
    pg.goto(URL); wait_feed(pg)
    cases = [
      ("fish", "Fishing ban lifted", True), ("fish", "Catfish farm opens", False), ("NT", "NT Government grant", True), ("NT", "Giant ant found", False),
      ("NT", "Tourists want more", False), ("grant", "Grants open Monday", True), ("fly fish", "Flyfishing the flats", True), ("fly fish", "Fly-fishing guide", True),
      ("F-150", "Ford F150 arrives", True), ("F-150", "Ford F-1500 concept", False), ("F-150", "the F 150 Lariat", True), ("yellow cheek carp", "Yellow-cheek carp caught", True),
      ("yellowcheek", "Yellow-cheeked gibbon", False), ("Amateur Fishermen's Association", "Amateur Fishermen’s Association of the NT", True),
      ("PNG", "Flights to PNG resume", True), ("PNG", "Save as png file", False), ("Lake Murray", "At Lake Murray, bass bite", True), ("Territorian", "Territorians rejoice", True),
      ("tying", "Tying the perfect clouser", True), ("C++", "Learning C++ fast", True), ("$5", "a $5 note", True),
    ]
    bad = []
    for term, text, want in cases:
        got = pg.evaluate("([t, x]) => termRe(t).test(x.replace(/[’‘]/g, \"'\"))", [term, text])
        if got != want: bad.append((term, text, want, got))
    res["matcher_failures"] = bad
    res["parse"] = pg.evaluate("""() => ['barramundi','Darwin Harbour','nt fishing news','"Top End" tourism','kakadu barra fishing australia','yellowcheek / yellow cheek','Lake Murray, PNG / Papua',
       'F-150 [Australia / Aussie]','NT grants: NT, grant / funding','(afl OR nrl) grand final','AC/DC tour','Star Wars: Andor','australia','   ','a|b','Crocs footy',
       'Lake Murray PNG','kakadu barra fishing news','nt barra fishing lodge'].map(k => { const r = parseKeyword(k); return [k, r.label, r.query, JSON.stringify(r.groups), r.need, r.prefer.join('/'), JSON.stringify(r.must)]; })""")
    # --- P: plain keywords keep the place; a .pg publisher counts as PNG ---
    res["plain_rule"] = pg.evaluate("""() => {
      const sec = (kw) => { const k = parseKeyword(kw); return { kind: 'custom', key: 'k:test', groups: k.groups, need: k.need, must: k.must, prefer: k.prefer, not: k.not }; };
      const story = (title, site) => { const pgp = isPg('https://' + site); return { title, desc: '', src: 'X', host: hostOf('https://' + site), date: new Date(), hay: title + (pgp ? ' | PNG | Papua New Guinea' : ''), hayWide: title }; };
      const keep = (kw, title, site) => pick([story(title, site)], sec(kw), 7, { seenGlobal: new Set() }).length;
      return {
        need3: parseKeyword('Lake Murray PNG').need,
        american_out: keep('Lake Murray PNG', 'Bass Pro Shop Opening Near Lake Murray', 'www.thestate.com'),
        says_png_in: keep('Lake Murray PNG', 'VIDEO: Lake Murray, Papua New Guinea', 'www.abc.net.au'),
        pg_paper_in: keep('Lake Murray PNG', 'Lake Murray communities struggle to find water', 'www.thenational.com.pg'),
        tuned_pg_paper_in: keep(TUNED.murray, 'Lake Murray communities struggle to find water', 'www.thenational.com.pg'),
        tuned_american_out: keep(TUNED.murray, 'Lake Murray communities struggle to find water', 'www.thestate.com'),
        loop_png_counts: isPg('https://www.looppng.com/x'), plain_com_does_not: isPg('https://www.example.com/x'),
        four_words_need: parseKeyword('nt barra fishing lodge').need,
        four_words_may_miss_one: keep('nt barra fishing lodge', 'NT barra lodge reopens for the run-off', 'www.example.com'),
        four_words_never_the_place: keep('nt barra fishing lodge', 'Barra fishing lodge reopens for the run-off', 'www.example.com'),
      }; }""")
    want = {"need3": 3, "american_out": 0, "says_png_in": 1, "pg_paper_in": 1, "tuned_pg_paper_in": 1, "tuned_american_out": 0, "loop_png_counts": True,
            "plain_com_does_not": False, "four_words_need": 3, "four_words_may_miss_one": 1, "four_words_never_the_place": 0}
    assert res["plain_rule"] == want, res["plain_rule"]
    # --- E: kebab actions ---
    first = pg.locator(".section").nth(1).locator(".cardwrap").nth(1)
    title = first.locator(".headline").text_content()
    first.locator(".kebab").click()
    assert first.locator(".acts").is_visible()
    first.locator(".act.less").click(); pg.wait_for_timeout(600)
    st = pg.evaluate("JSON.parse(localStorage.getItem('mynews.settings.v1'))")
    res["less"] = {"title": title, "brakes": st["brakes"], "hidden": st["hiddenKeys"], "still_there": pg.locator(".headline", has_text=title).count()}
    c2 = pg.locator(".section").nth(0).locator(".cardwrap").nth(2)
    t2 = c2.locator(".headline").text_content(); c2.locator(".kebab").click(); c2.locator(".act.more").click()
    res["more"] = {"title": t2, "boosts": pg.evaluate("JSON.parse(localStorage.getItem('mynews.settings.v1')).boosts"), "acts_closed": not c2.locator(".acts").is_visible()}
    # hide lead story -> next becomes lead
    lead = pg.locator(".section").nth(0).locator(".cardwrap").nth(0)
    lt = lead.locator(".headline").text_content(); lead.locator(".kebab").click(); lead.locator(".act.hide").click(); pg.wait_for_timeout(700)
    res["hide_lead"] = {"gone": pg.locator(".headline", has_text=lt).count() == 0, "new_lead_is_lead": pg.evaluate("document.querySelector('.section .cardwrap').classList.contains('lead')")}
    # --- F: swipe left with mouse drag (desktop) ---
    target = pg.locator(".section").nth(0).locator(".cardwrap").nth(1)
    tt = target.locator(".headline").text_content()
    box = target.bounding_box()
    pg.mouse.move(box["x"] + box["width"] - 30, box["y"] + 20); pg.mouse.down()
    for dx in range(0, 200, 20): pg.mouse.move(box["x"] + box["width"] - 30 - dx, box["y"] + 22)
    pg.mouse.up(); pg.wait_for_timeout(700)
    res["swipe_left"] = {"gone": pg.locator(".headline", has_text=tt).count() == 0, "pages": len(ctx.pages)}
    # swipe right opens the actions row, doesn't open the article
    target = pg.locator(".section").nth(0).locator(".cardwrap").nth(1)
    box = target.bounding_box()
    pg.mouse.move(box["x"] + 40, box["y"] + 20); pg.mouse.down()
    for dx in range(0, 130, 13): pg.mouse.move(box["x"] + 40 + dx, box["y"] + 21)
    pg.mouse.up(); pg.wait_for_timeout(400)
    res["swipe_right"] = {"acts_open": target.locator(".acts").is_visible(), "pages": len(ctx.pages)}
    # plain click on the summary opens the article in a new tab
    with ctx.expect_page() as newp:
        pg.locator(".section").nth(0).locator(".cardwrap").nth(2).locator(".meta .when").click()
    res["click_opens"] = newp.value.url; newp.value.close()
    # --- L: double refresh ---
    pg.locator("#btn-refresh").click(); pg.locator("#btn-refresh").click(); wait_feed(pg)
    res["after_refresh"] = pg.evaluate("[...document.querySelectorAll('.section')].map(s => s.querySelector('h2').textContent + ':' + s.querySelectorAll('.cardwrap').length)")
    res["hidden_stay_hidden"] = pg.locator(".headline", has_text=tt).count() == 0
    # --- D: settings ---
    pg.locator("#btn-settings").click(); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("shot-settings.png"), full_page=True)
    res["chips"] = pg.evaluate("[...document.querySelectorAll('#custom-chips .chip')].map(c => c.textContent)")
    # add keyword + mute word, save
    pg.fill("#kw-input", "Darwin Harbour"); pg.click("#kw-add")
    pg.check("#mute-on"); pg.fill("#mute-input", "storms"); pg.click("#mute-add")
    pg.click("#btn-done"); wait_feed(pg)
    res["muted_gone"] = pg.locator(".headline", has_text="storms").count() == 0
    res["new_section"] = pg.evaluate("[...document.querySelectorAll('.section')].map(s => [s.querySelector('h2').textContent, s.querySelectorAll('.cardwrap').length, (s.querySelector('.empty')||{}).textContent||''] ).filter(x => x[0] === 'Darwin Harbour')")
    # --- W: "Wrong topic" keeps one publisher out of one topic only, and settings can undo it ---
    wst = dict(OLD); wst.update({"v": 6, "theme": "day", "presetIds": ["nt", "fishing"], "customKeywords": []})
    wctx, wp, werrs = page_for(b, "light", store=wst); wp.goto(URL); wait_feed(wp)
    pubs = lambda i: wp.evaluate("i => [...document.querySelectorAll('.section')[i].querySelectorAll('.cardwrap:not(.gone) .src')].map(e => e.textContent)", i)
    w = {"before": [pubs(0), pubs(1)]}
    card = wp.locator(".section").nth(0).locator(".cardwrap").filter(has=wp.locator(".src", has_text="NT News")).first
    wtitle = card.locator(".headline").text_content()
    card.locator(".kebab").click(); card.locator(".act.wrong").click(); wp.wait_for_timeout(700)
    w["toast"] = wp.locator("#toast").text_content()
    w["after"] = [pubs(0), pubs(1)]
    w["blocks"] = wp.evaluate("JSON.parse(localStorage.getItem('mynews.settings.v1')).topicBlocks")
    wp.locator("#btn-refresh").click(); wait_feed(wp)
    w["after_refresh"] = [pubs(0), pubs(1)]
    # swipe right opens the same menu, with the Wrong topic button in it
    sw = wp.locator(".section").nth(1).locator(".cardwrap").nth(0); sw.scroll_into_view_if_needed(); box = sw.bounding_box()
    wp.mouse.move(box["x"] + 40, box["y"] + 20); wp.mouse.down()
    for dx in range(0, 130, 13): wp.mouse.move(box["x"] + 40 + dx, box["y"] + 21)
    wp.mouse.up(); wp.wait_for_timeout(400)
    w["swipe_menu_has_it"] = sw.locator(".act.wrong").is_visible()
    wp.locator("#btn-settings").click(); wp.wait_for_timeout(300)
    w["settings_list"] = wp.locator("#block-list").inner_text()
    wp.locator("#block-list").scroll_into_view_if_needed(); wp.screenshot(path=shot("shot-blocked.png"))
    wp.locator("#block-list .chip").first.click(); wp.wait_for_timeout(200)
    w["settings_after_undo"] = wp.locator("#block-list").inner_text()
    wp.click("#btn-done"); wait_feed(wp)
    w["after_undo"] = [pubs(0), pubs(1)]
    w["hidden_story_back"] = wp.locator(".headline", has_text=wtitle).count() == 1
    w["errors"] = werrs; res["wrong_topic"] = w; wctx.close()
    assert w["before"][0].count("NT News") == 2 and "NT News" in w["before"][1], w
    assert "NT News" not in w["after"][0] and "NT News" in w["after"][1], w            # gone from Top End only
    assert "NT News" not in w["after_refresh"][0] and "NT News" in w["after_refresh"][1], w
    assert len(w["blocks"]) == 1 and w["blocks"][0]["t"] == "p:nt" and w["blocks"][0]["p"] == "NT News", w
    assert w["swipe_menu_has_it"] and "Top End & NT" in w["settings_list"] and "NT News" in w["settings_list"], w
    assert "None blocked" in w["settings_after_undo"] and w["after_undo"][0].count("NT News") == 2 and w["hidden_story_back"] and not werrs, w
    # --- U: the upgrade runs again: a plain "Lake Murray PNG" retyped after the first upgrade is swapped for the tuned rule ---
    ust = dict(OLD); ust.update({"v": 5, "theme": "day", "presetIds": [], "customKeywords": ["Lake Murray PNG", "Darwin Harbour"]})
    uctx, up, uerrs = page_for(b, "light", store=ust); up.goto(URL); wait_feed(up)
    res["upgrade_again"] = up.evaluate("""() => { const s = JSON.parse(localStorage.getItem('mynews.settings.v1')); return { v: s.v, kws: s.customKeywords,
      murray: [...document.querySelectorAll('.section')].filter(x => x.querySelector('h2').textContent === 'Lake Murray PNG').map(x => [...x.querySelectorAll('.headline')].map(h => h.textContent))[0] }; }""")
    uctx.close()
    u = res["upgrade_again"]
    assert u["v"] == 6 and u["kws"][0].startswith("Lake Murray PNG: Lake Murray, PNG /") and u["kws"][1] == "Darwin Harbour", u
    assert len(u["murray"]) == 3 and not any("South Carolina" in t or "dam water" in t or "Boater" in t for t in u["murray"]) and not uerrs, u
    # --- G: setup link ---
    link = pg.evaluate("setupLink()")
    res["link_len"] = len(link); res["errors_a"] = errs
    ctx.close()
    ctx, pg, errs = page_for(b, "dark", store=None)
    pg.goto(link); pg.wait_for_timeout(500)
    res["modal_text"] = pg.locator(".modal-card").inner_text()
    pg.screenshot(path=shot("shot-import.png"))
    pg.locator('[data-act="use"]').click(); wait_feed(pg)
    res["imported"] = {"sections": pg.evaluate("[...document.querySelectorAll('.section > h2')].map(h => h.textContent)"), "hash": pg.evaluate("location.hash"), "theme": pg.evaluate("document.documentElement.dataset.theme")}
    scroll_all(pg); pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("shot-night-top.png")); pg.screenshot(path=shot("shot-night-full.png"), full_page=True)
    res["errors_b"] = errs; ctx.close()
    # bad setup links are ignored
    ctx, pg, errs = page_for(b, "light", store=None)
    for bad in ["#setup=!!!!", "#setup=" + base64.urlsafe_b64encode(b'{"p":"x","k":[1,{"a":2}],"t":"<img>"}').decode().rstrip("="), "#setup=" + base64.urlsafe_b64encode(b'not json').decode().rstrip("=")]:
        pg.goto(URL + bad); pg.wait_for_timeout(300)
    res["bad_links"] = {"errors": errs, "modal": pg.locator(".modal").count(), "setup_visible": pg.locator("#setup").is_visible()}
    # --- H: first run ---
    pg.goto(URL); pg.wait_for_timeout(300); pg.screenshot(path=shot("shot-welcome.png"), full_page=True)
    pg.locator("#preset-grid .chip", has_text="Fishing").first.click(); pg.fill("#name-input", "Lou"); pg.fill("#kw-input", "Bensbach")
    pg.click("#btn-done"); wait_feed(pg)
    res["first_run"] = pg.evaluate("[document.querySelector('.mast h2').textContent, ...[...document.querySelectorAll('.section > h2')].map(h => h.textContent)]")
    res["errors_c"] = errs; ctx.close()
    # --- B/C: walkabout + desktop ---
    st = dict(OLD); st["theme"] = "walkabout"; st["v"] = 4; st["customKeywords"] = ["Bensbach"]
    ctx, pg, errs = page_for(b, "light", store=st); pg.goto(URL); wait_feed(pg); scroll_all(pg); pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("shot-walkabout.png")); ctx.close()
    ctx, pg, errs = page_for(b, "light", w=1280, h=900, touch=False); pg.goto(URL); wait_feed(pg); scroll_all(pg); pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
    pg.screenshot(path=shot("shot-desktop.png")); res["errors_d"] = errs; ctx.close()
    # --- N: photo background ---
    ctx, pg, errs = page_for(b, "light"); 
    photo = "data:image/jpeg;base64," + base64.b64encode(open(os.path.join(HERE, "wide.jpg"), "rb").read()).decode()
    pg.add_init_script("localStorage.setItem('mynews.bgphoto.v1', %s)" % json.dumps(photo))
    pg.goto(URL); wait_feed(pg); pg.wait_for_timeout(500); pg.screenshot(path=shot("shot-photo.png")); ctx.close()
    # --- K: service worker offline fallback ---
    ctx, pg, errs = page_for(b, "light")
    pg.goto("http://localhost:8765/"); wait_feed(pg)
    pg.evaluate("navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready)")
    pg.wait_for_timeout(1500)
    res["sw_cache"] = pg.evaluate("caches.keys().then(async ks => [ks, (await (await caches.open(ks[0])).keys()).length])")
    pg.reload(); wait_feed(pg)
    res["sw_controlled"] = pg.evaluate("!!navigator.serviceWorker.controller")
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(2500)
    res["offline"] = {"title": pg.title(), "mast": pg.locator(".mast h2").count(), "fonts_ok": pg.evaluate("document.fonts.check('800 16px Mulish')"), "errors_shown": pg.locator(".empty.error").count()}
    pg.screenshot(path=shot("shot-offline.png")); res["errors_sw"] = errs
    ctx.close(); b.close()
json.dump(res, open(shot("report.json"), "w"), indent=1)
print(json.dumps(res, indent=1))

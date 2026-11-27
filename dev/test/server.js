// Test harness: serves the app's static files and runs the REAL Vercel functions
// (api/feed.js, api/preview.js) with every upstream fetch replaced by fixtures,
// so it works with no internet. The fixtures imitate Google News and Bing News
// RSS as best understood in Nov 2026 — they are NOT recordings of real feeds.
//   node server.js        -> http://127.0.0.1:8765   (PORT=8791 node server.js to use another port)
// Fixture behaviour by query: see google() and bing() below.
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = process.env.MYNEWS_ROOT || path.resolve(__dirname, "../..");
const feed = require(ROOT + "/api/feed.js"), preview = require(ROOT + "/api/preview.js");
const PORT = +process.env.PORT || 8765;
const now = Date.now();
const ago = (d) => new Date(now - d * 864e5).toUTCString();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let n = 0;
// g(title, publisher, daysAgo, publisherSite): the site decides whether the app treats the publisher as Australian
const g = (title, src, days, site) => { const id = "CBMi" + (++n) + "abc"; return `<item><title>${esc(title)} - ${esc(src)}</title><link>https://news.google.com/rss/articles/${id}?oc=5</link><guid isPermaLink="false">${id}</guid><pubDate>${ago(days)}</pubDate><description>${esc(`<a href="https://news.google.com/rss/articles/${id}?oc=5" target="_blank">${esc(title)}</a>&nbsp;&nbsp;<font color="#6f6f6f">${esc(src)}</font>`)}</description><source url="https://${site || "www.example.com"}">${esc(src)}</source></item>`; };
const gRss = (items) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><generator>NFE/5.0</generator><title>x - Google News</title>${items.join("")}</channel></rss>`;
// b(title, publisher, daysAgo, snippet, articleUrl). Shape checked against the real Bing feed on 24 Nov 2026.
const b = (title, src, days, desc, url) => `<item><title>${esc(title)}</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;tid=abc&amp;url=${encodeURIComponent(url || "https://www.example.com/story/" + (++n))}&amp;c=123&amp;mkt=en-au</link><description>${esc(desc)}</description><pubDate>${ago(days)}</pubDate><News:Source>${esc(src)}</News:Source><News:Image>http://img.test/bing-${n}.jpg</News:Image></item>`;
const bRss = (items) => `<?xml version="1.0" encoding="utf-8" ?><rss version="2.0" xmlns:News="https://www.bing.com/news/search?q=x&amp;format=rss&amp;setmkt=en-AU"><channel><title>x - BingNews</title>${items.join("")}</channel></rss>`;

// The stories below are invented, but each junk case copies a kind of junk the real feeds returned.
function google(q, days) {
  const w = (list) => list.filter((x) => days === 0 || x[2] <= days).map((x) => g(...x));
  // A PNG topic also asks each PNG outlet by name ("Lake Murray" site:nbc.com.pg). Only that ask returns NBC PNG's
  // story. The asks also return the site's own listing pages, which must not show, and one of them fails outright.
  if (/ site:/.test(q)) {
    if (!/^"Lake Murray" site:/.test(q)) return gRss([]);
    if (/site:nbc\.com\.pg$/.test(q)) return gRss(w([["Lake Murray dries up as severe drought hits PNG's Western Province", "NBC PNG News", 3, "www.nbc.com.pg"], ["NBC PNG News", "NBC PNG News", 1, "www.nbc.com.pg"], ["Rugby takes centre stage in Nomad as Maso cup kicks off", "NBC PNG News", 2, "www.nbc.com.pg"]]));
    if (/site:postcourier\.com\.pg$/.test(q)) return gRss(w([["Lake Murray communities Archives", "Post Courier", 2, "www.postcourier.com.pg"], ["Lake Murray Lodge reopens after flood repairs in Western Province", "Post Courier", 4, "www.postcourier.com.pg"], ["My Blog Page | Lake Murray | Page 882", "Post Courier", 5, "www.postcourier.com.pg"]]));
    return null; // The National's ask fails: the section must carry on without it
  }
  if (/Top End/.test(q) && !/rebate/.test(q)) return gRss(w([["Darwin Harbour ferry terminal upgrade gets green light", "NT News", 0.1, "www.ntnews.com.au"], ["Top End build-up storms arrive early as Bureau flags active monsoon", "ABC News", 0.3, "www.abc.net.au"], ["Territory tourism operators report record dry season bookings", "Katherine Times", 0.6, "www.katherinetimes.com.au"], ["Kakadu rangers reopen Jim Jim Falls road ahead of schedule", "NT News", 0.9, "www.ntnews.com.au"], ["Charles Darwin letters fetch record price at London auction", "The Guardian", 0.4, "www.theguardian.com"], ["Melbourne tram strike enters second day", "The Age", 0.2, "www.theage.com.au"], ["Palmerston boat ramp to get floating pontoon", "Mirage News", 1.4, "www.miragenews.com"], ["Arnhem Land rangers trial drone croc surveys", "SBS News", 1.7, "www.sbs.com.au"]]));
  if (/^fishing Australia/.test(q)) return gRss(w([["Barra season off to a flyer as run-off rivers fire", "Fishing World", 0.2, "www.fishingworld.com.au"], ["New bag limits for snapper flagged in fisheries review", "ABC News", 0.5, "www.abc.net.au"], ["Tackle shop marks 50 years on the same corner", "NT News", 1.2, "www.ntnews.com.au"], ["Minister announces budget review", "The Australian", 0.3, "www.theaustralian.com.au"]]));
  // Good News is Australian-only: overseas "feel-good" stories must go
  if (/good news/.test(q)) return gRss(w([["Four feel-good rock songs from 1971", "American Songwriter", 0.4, "americansongwriter.com"], ["Heartwarming reunion for lost dog and Cairns family", "ABC News", 0.5, "www.abc.net.au"], ["Kindness awards name fifteen winners", "openPR", 0.6, "www.openpr.com"], ["Uplifting scenes as Australian volunteers rebuild flooded hall", "Good Good Good", 1.0, "www.goodgoodgood.co"], ["Cricketer's heartwarming reply on his role", "Outlook India", 1.5, "www.outlookindia.com"]]));
  // a namesake fish (darter) must be left out by the "-darter" rule
  if (/yellowcheek/.test(q)) return gRss(w([["Yellowcheek darter recovery plan released", "Arkansas Times", 100], ["Anglers chase yellowcheek on fly in remote Amur tributary", "Fly Life", 80, "www.flylife.com.au"], ["Elopichthys bambusa: the pike-like carp few have caught", "Hatch Magazine", 200]]));
  // NT grants: needs a place, a money word, a business word AND an Australian publisher
  if (/rebate/.test(q)) return gRss(w([["NT small business grants of up to $20,000 open next week", "NT News", 1, "www.ntnews.com.au"], ["Northern Territory unveils funding round for tourism business upgrades", "Mirage News", 3, "www.miragenews.com"], ["NT Daily: business licences go online, school funding report delayed", "News Tribune", 6, "www.newstribune.com"], ["Mining junior wins $350,000 SA drilling grant", "NT News", 1, "www.ntnews.com.au"], ["Territory business confidence slips", "NT News", 2, "www.ntnews.com.au"], ["Black Spot funding to improve road safety across Northern Territory", "The National Tribune", 5, "www.nationaltribune.com.au"], ["Heritage Grants Program opens to protect Territory history", "Mirage News", 3, "www.miragenews.com"]]));
  // Bensbach: almost no news. The only recent story doesn't say Bensbach in its headline (rare-term fill)
  if (/^Bensbach/.test(q)) return gRss(w([["Ten big adventures in Papua New Guinea", "Business Advantage PNG", 343, "www.businessadvantagepng.com"], ["8 Bensbach Road, Glenfield, NSW 2167", "Real Estate", 400, "www.realestate.com.au"], ["Local communities celebrate new protected areas in Papua New Guinea", "Panda.org", 1988]]));
  if (/Lake Murray/.test(q)) return gRss(w([["Lake Murray bass tournament draws record field in South Carolina", "The State", 1], ["Lake Murray dam water release planned for Friday", "WIS News 10", 2], ["Boater rescued on Lake Murray", "WLTX", 3], ["Lake Murray Lodge reopens after flood repairs in Western Province", "Post Courier", 4, "www.postcourier.com.pg"], ["Lake Murray communities struggle to find water", "The National", 6, "www.thenational.com.pg"], ["Black bass guides return to Lake Murray for new season", "Fishing World", 5, "www.fishingworld.com.au"]]));
  // all fly tying stories count; the streamer one floats to the top
  if (/fly tying/.test(q)) return gRss(w([["Angling club stages second fly tying evening", "Edinburgh Reporter", 2], ["Fly Tying: a streamer bug, step by step", "YouTube", 5, "www.youtube.com"], ["International fly-tying symposium slated for Lancaster", "River Reporter", 6], ["The art of fly tying", "Ashe Post", 25], ["Colourful streamers yield faster fishing", "The County", 257]]));
  // AFANT: one headline says AFANT; two more only quote AFANT in the article (rare-term fill)
  if (/AFANT/.test(q)) return gRss(w([["Golden snapper recovery should target spawning: AFANT", "NT Independent", 207, "ntindependent.com.au"], ["Fisherman fights off crocodile with a rod", "The Cool Down", 17], ["Man comes face to face with huge croc on boat ramp", "The Nightly", 22, "thenightly.com.au"]]));
  // F-150: Australian stories only
  if (/F-150/.test(q)) return gRss(w([["Ford targets Japanese customers with Ranger and F-150", "autoevolution", 1, "www.autoevolution.com"], ["2027 Ford F-150 pricing confirmed", "CarExpert", 3, "www.carexpert.com.au"], ["Ford Ranger trademark hints at new hybrid ute", "CarExpert", 4, "www.carexpert.com.au"], ["Ford F-150 Lariat: the tow test", "Drive", 6, "www.drive.com.au"], ["Ford F-150 vs RAM 1500 vs Silverado comparison", "4X4 Australia", 27, "www.4x4australia.com.au"]]));
  if (/googledown|downtest/.test(q)) return null; // Google fails
  return gRss([]);
}
function bing(q) {
  // the real Bing feed returns nothing for OR, brackets or quotes: prove the app only sends plain words
  if (/\bOR\b|[()"]/.test(q)) return bRss([]);
  if (/^yellowcheek/.test(q)) return bRss([b("Yellow-cheeked gibbon born at Perth Zoo", "WAtoday", 2, "Keepers are celebrating the arrival of a rare gibbon.", "https://www.watoday.com.au/story/1"), b("Monster predator carp landed on fly in Amur", "Angling International", 20, "A travelling fly angler has landed a metre-plus yellowcheek, the pike-like predatory carp of the Amur basin, after three days of blank sessions.")]);
  if (/^Northern Territory grant/.test(q)) return bRss([b("New $17,000 grant launched to help Northern Territory businesses innovate", "Adelaide Now", 20, "Territory businesses can apply for the new grant from Monday.", "https://www.adelaidenow.com.au/story/2"), b("NT small business grants of up to $20,000 open next week", "NT News", 1, "Applications open next week.", "https://www.ntnews.com.au/story/3")]);
  if (/^Bensbach/.test(q)) return bRss([b("21 Bensbach Road, Glenfield, NSW 2167", "realtor", 96, "Property details for 21 Bensbach Road."), b("Bensbach Airport, Bensbach, Papua New Guinea", "Prokerala", 650, "Looking for information on Bensbach Airport?")]);
  if (/^AFANT/.test(q)) return bRss([b("AFANT launches land-based fishing guide", "NT News", 452, "The guide covers land-based spots across the Top End.", "https://www.ntnews.com.au/story/4"), b("Government grants lease to Sliema amateur fishermen's association", "Malta Independent", 210, "A 45-year lease has been granted to the association.")]);
  if (/^F-150 Australia/.test(q)) return bRss([b("Ford F-150 2026 review: Australian first drive", "CarsGuide", 240, "We drive the updated F-150 on local roads.", "https://www.carsguide.com.au/story/5")]);
  if (/^googledown/.test(q)) return bRss([b("Googledown regatta draws a record fleet", "ABC News", 2, "The backup source carries this section when the main one fails.", "https://www.abc.net.au/story/6"), b("Googledown council backs foreshore plan", "NT News", 5, "A second story from the backup source.", "https://www.ntnews.com.au/story/7")]);
  if (/downtest/.test(q)) return null;
  return bRss([]);
}

global.fetch = async (url, opts) => {
  url = String(url);
  const xml = (body) => body === null ? { ok: false, status: 503, text: async () => "<html>blocked</html>" } : { ok: true, status: 200, text: async () => body };
  if (url.startsWith("https://news.google.com/rss/search")) {
    const q = decodeURIComponent(new URL(url).searchParams.get("q"));
    const m = q.match(/ when:(\d+)d$/);
    return xml(google(q.replace(/ when:\d+d$/, ""), m ? +m[1] : 0));
  }
  if (url.startsWith("https://www.bing.com/news/search")) return xml(bing(new URL(url).searchParams.get("q")));
  if (url.startsWith("https://news.google.com/rss/articles/")) return { ok: true, text: async () => '<div data-n-a-sg="SIG" data-n-a-ts="123"></div>' };
  if (url.includes("batchexecute")) { const id = (decodeURIComponent(opts.body).match(/CBMi\d+abc/) || ["x"])[0]; return { ok: true, text: async () => `)]}'\n[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://example.com.au/article/${id}\\",1]"]]` }; }
  if (url.startsWith("https://example.com.au/article/")) { const id = url.split("/").pop(); const k = +id.replace(/\D/g, ""); return { ok: true, url, text: async () => `<html><head><meta property="og:image" content="https://img.test/${k % 3 === 0 ? "small" : "wide"}-${k}.jpg"><meta property="og:description" content="${k % 4 === 0 ? "Sign in to continue reading" : "The opening lines of the story sit here so the reader gets the gist before deciding whether to tap through and read the whole thing."}"></head></html>` }; }
  throw new Error("unexpected fetch " + url);
};

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) {
    const r = { query: Object.fromEntries(u.searchParams) };
    const s = { _c: 200, setHeader: (k, v) => res.setHeader(k, v), status(c) { this._c = c; return this; }, json(o) { res.writeHead(this._c, { "content-type": "application/json" }); res.end(JSON.stringify(o)); }, send(t) { res.writeHead(this._c); res.end(t); } };
    console.log("[api]", req.url);
    return (u.pathname === "/api/feed" ? feed : preview)(r, s);
  }
  const f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log("test server on " + PORT));

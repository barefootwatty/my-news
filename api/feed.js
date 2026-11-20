// My News — tiny feed helper.
// Browsers aren't allowed to fetch news feeds directly (CORS), so this
// function fetches the RSS feed server-side and passes it through unchanged.
// Runs free on Vercel; good results are cached for 10 minutes to stay fast.
//
//   /api/feed?q=<search>&d=<days>&s=<source>
//     d  1–365 = only stories from the last d days; 0 = no time limit
//     s  "g" (default) = Google News Australia; "b" = Bing News (backup source)
//
// A failed or blocked upstream returns 502 and is NEVER cached — otherwise a
// Google error page would be served to everyone as "no news" for ten minutes.

const UA = "Mozilla/5.0 (MyNewsApp/1.0)";
const TIMEOUT_MS = 7000;

function fail(res, why) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(502).json({ error: why });
}

module.exports = async (req, res) => {
  const query = (req && req.query) || {};
  const q = String(query.q || "").slice(0, 300).trim();
  if (!q) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "missing q" });
    return;
  }
  const source = query.s === "b" ? "b" : "g";
  let days = parseInt(query.d === undefined ? "2" : query.d, 10);
  if (isNaN(days)) days = 2;
  days = Math.min(365, Math.max(0, days));

  const url =
    source === "b"
      ? "https://www.bing.com/news/search?q=" + encodeURIComponent(q) + "&format=rss&setmkt=en-AU"
      : "https://news.google.com/rss/search?q=" +
        encodeURIComponent(q + (days ? " when:" + days + "d" : "")) +
        "&hl=en-AU&gl=AU&ceid=AU:en";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!r.ok) return fail(res, "upstream " + r.status);
    const xml = await r.text();
    // a block page or captcha comes back as HTML, not a feed
    if (!/<rss[\s>]/i.test(xml.slice(0, 3000))) return fail(res, "not a feed");
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
    res.status(200).send(xml);
  } catch (e) {
    fail(res, e && e.name === "AbortError" ? "upstream timeout" : "feed fetch failed");
  } finally {
    clearTimeout(timer);
  }
};

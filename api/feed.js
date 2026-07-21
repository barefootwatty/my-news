// My News — tiny feed helper.
// Browsers aren't allowed to fetch Google News directly (CORS), so this
// function fetches the RSS feed server-side and passes it through unchanged.
// Runs free on Vercel; results are cached for 10 minutes to stay fast.

module.exports = async (req, res) => {
  const q = String((req.query && req.query.q) || "").slice(0, 200).trim();
  if (!q) {
    res.status(400).json({ error: "missing q" });
    return;
  }
  const days = Math.min(7, Math.max(1, parseInt((req.query && req.query.d) || "2", 10) || 2));
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(q + " when:" + days + "d") +
    "&hl=en-AU&gl=AU&ceid=AU:en";
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (MyNewsApp/1.0)" },
    });
    const xml = await r.text();
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
    res.status(200).send(xml);
  } catch (e) {
    res.status(502).json({ error: "feed fetch failed" });
  }
};

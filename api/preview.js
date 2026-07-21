// My News — article preview helper.
// Google News feed links point at a Google redirect page, not the article.
// This function (1) decodes the link to the real article URL, (2) fetches the
// article, and (3) returns its picture + opening summary. Results are cached
// at the CDN for a day, so each article is only ever fetched once per day
// no matter how many people use the app.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function withTimeout(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function pickMeta(html, prop) {
  const p = prop.replace(/[:]/g, "\\$&");
  let m = html.match(
    new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]+content=["\']([^"\']+)', "i")
  );
  if (!m) {
    m = html.match(
      new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' + p + '["\']', "i")
    );
  }
  return m ? m[1] : null;
}

function unescapeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");

  const raw = String((req.query && req.query.u) || "");
  const idm = raw.match(/news\.google\.com\/rss\/articles\/([A-Za-z0-9_-]+)/);
  if (!idm) { res.status(200).json({}); return; }
  const id = idm[1];

  try {
    // 1. Google redirect page carries the signing tokens we need
    const page = await (
      await fetch("https://news.google.com/rss/articles/" + id + "?oc=5", {
        headers: { "User-Agent": UA }, signal: withTimeout(4000),
      })
    ).text();
    const sg = (page.match(/data-n-a-sg="([^"]+)"/) || [])[1];
    const ts = (page.match(/data-n-a-ts="(\d+)"/) || [])[1];
    if (!sg || !ts) throw new Error("no tokens");

    // 2. Ask Google to decode the link
    const inner =
      '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],' +
      '"X","X",1,[1,1,1],1,1,null,0,0,null,0],"' + id + '",' + ts + ',"' + sg + '"]';
    const body =
      "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]]));
    const dec = await (
      await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": UA,
        },
        body,
        signal: withTimeout(4000),
      })
    ).text();
    const um =
      dec.match(/garturlres\\",\\"(https?:[^"\\]+)/) ||
      dec.match(/"garturlres","(https?:[^"]+)"/);
    if (!um) throw new Error("no url");
    const artUrl = um[1];

    // 3. Fetch the article for its picture and opening summary
    let image = null, summary = null, finalUrl = artUrl;
    try {
      const ar = await fetch(artUrl, {
        headers: { "User-Agent": UA }, redirect: "follow", signal: withTimeout(4500),
      });
      finalUrl = ar.url || artUrl;
      const html = (await ar.text()).slice(0, 400000);
      image = unescapeEntities(pickMeta(html, "og:image") || pickMeta(html, "twitter:image"));
      summary =
        pickMeta(html, "og:description") ||
        pickMeta(html, "description") ||
        pickMeta(html, "twitter:description");
      if (image && image.startsWith("//")) image = "https:" + image;
      if (image && !/^https:/.test(image)) image = null;
    } catch (e) { /* article fetch failed — still return the real link */ }

    res.status(200).json({
      url: finalUrl,
      image: image || null,
      summary: unescapeEntities(summary) || null,
    });
  } catch (e) {
    res.status(200).json({});
  }
};

# Local testing only — NOT part of the deployed app.
# Serves the app files and stands in for the Vercel /api functions.
import http.server, urllib.request, urllib.parse, os, re, json, html as htmlmod

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def http_get(url, timeout=6, data=None, headers=None):
    h = {"User-Agent": UA}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.geturl(), r.read()


def pick_meta(page, prop):
    p = re.escape(prop)
    m = re.search(r'<meta[^>]+(?:property|name)=["\']' + p + r'["\'][^>]+content=["\']([^"\']+)', page, re.I)
    if not m:
        m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' + p + r'["\']', page, re.I)
    return htmlmod.unescape(m.group(1)) if m else None


def preview(gn_url):
    m = re.search(r"news\.google\.com/rss/articles/([A-Za-z0-9_-]+)", gn_url)
    if not m: return {}
    art_id = m.group(1)
    try:
        _, page_b = http_get(f"https://news.google.com/rss/articles/{art_id}?oc=5", timeout=6)
        page = page_b.decode("utf-8", "ignore")
        sg = re.search(r'data-n-a-sg="([^"]+)"', page)
        ts = re.search(r'data-n-a-ts="(\d+)"', page)
        if not sg or not ts: return {}
        inner = ('["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],'
                 f'"X","X",1,[1,1,1],1,1,null,0,0,null,0],"{art_id}",{ts.group(1)},"{sg.group(1)}"]')
        body = urllib.parse.urlencode({"f.req": json.dumps([[["Fbv4je", inner, None, "generic"]]])}).encode()
        _, dec_b = http_get("https://news.google.com/_/DotsSplashUi/data/batchexecute", timeout=6, data=body,
                            headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
        dec = dec_b.decode("utf-8", "ignore")
        um = re.search(r'garturlres\\",\\"(https?:[^"\\]+)', dec) or re.search(r'"garturlres","(https?:[^"]+)"', dec)
        if not um: return {}
        art_url = um.group(1)
        out = {"url": art_url, "image": None, "summary": None}
        try:
            final_url, art_b = http_get(art_url, timeout=7)
            art = art_b[:400000].decode("utf-8", "ignore")
            out["url"] = final_url
            img = pick_meta(art, "og:image") or pick_meta(art, "twitter:image")
            if img and img.startswith("//"): img = "https:" + img
            out["image"] = img if (img and img.startswith("https:")) else None
            out["summary"] = (pick_meta(art, "og:description") or pick_meta(art, "description")
                              or pick_meta(art, "twitter:description"))
        except Exception:
            pass
        return out
    except Exception:
        return {}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/preview"):
            qs = urllib.parse.urlparse(self.path).query
            u = urllib.parse.parse_qs(qs).get("u", [""])[0]
            payload = json.dumps(preview(u)).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(payload)
            return
        if self.path.startswith("/api/feed"):
            qs = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(qs)
            q = params.get("q", [""])[0].strip()[:200]
            if not q:
                self.send_response(400); self.end_headers(); return
            try:
                days = min(7, max(1, int(params.get("d", ["2"])[0])))
            except ValueError:
                days = 2
            url = ("https://news.google.com/rss/search?q="
                   + urllib.parse.quote(q + f" when:{days}d")
                   + "&hl=en-AU&gl=AU&ceid=AU:en")
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (MyNewsDev)"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    body = r.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/xml; charset=utf-8")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_response(502); self.end_headers()
                self.wfile.write(str(e).encode())
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        print("[dev]", fmt % args)

print(f"My News dev server on http://localhost:{PORT}")
http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()

# Local testing only — NOT part of the deployed app.
# Serves the app files and stands in for the Vercel /api/feed function.
import http.server, urllib.request, urllib.parse, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
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

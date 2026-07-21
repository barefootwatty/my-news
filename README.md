# My News

**Your news, your way.** A free, shareable news app — pick your topics and
keywords, get a personal news feed. No accounts, no sign-up, no running costs.

## How it works

- Headlines come live from Google News Australia via one tiny serverless
  function (`api/feed.js`) that passes the RSS feed through to the browser.
- Your topic picks, keywords, and blocked words are saved in your own
  browser (localStorage) — nothing is stored on any server.
- "Read it to me" uses your device's built-in text-to-speech.
- Add it to your home screen and it behaves like a normal app (PWA).

## Running it

Deployed on Vercel — push to `main` and it redeploys automatically.

To test locally (needs only Python 3):

    python3 dev_server.py
    # then open http://localhost:8765

`dev_server.py` is a development stand-in for the Vercel function and is not
part of the deployed app.

## Costs

$0. Google News RSS is free, Vercel's free tier covers the hosting and the
feed function, and there is no AI or paid API anywhere in the chain.

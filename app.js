/* My News — pick your topics, get your news. All settings live on this device. */

const STORE_KEY = "mynews.settings.v1";
const PHOTO_KEY = "mynews.bgphoto.v1"; // stored separately: photos are big
const DATA_VERSION = 5;

/* Each preset has a Google News query, and optionally `match`: words the story
   must mention (word-start match, so "fish" also catches "fishing").
   Google pads searches with loosely "related" stories — `match` weeds them out.
   `prefer` words float a story to the top of its section. */
const PRESETS = [
  { id: "nt",       label: "Top End & NT",    query: '"Northern Territory" OR "Top End" OR (Darwin Australia)', bing: "Northern Territory news",
    match: ["northern territory", "top end", "territor", "darwin", "kakadu", "katherine", "arnhem", "litchfield", "tiwi", "nhulunbuy", "palmerston", "daly river", "alice springs"] },
  { id: "fishing",  label: "Fishing",         query: "fishing Australia", bing: "fishing Australia",
    match: ["fish", "angl", "barra", "tackle", "lure", "reel", "crab", "prawn", "snapper", "jetty", "estuary"] },
  // saltwater fly news is scarce (often none for a week), so the section keeps
  // all real fly-fishing stories but `prefer` floats saltwater ones to the top
  { id: "flyfish",  label: "Fly Fishing",     query: '"saltwater fly fishing" OR "fly fishing" OR flyfishing', days: 7, bing: "fly fishing",
    match: ["fly fish"],
    prefer: ["saltwater", "salt water", "bonefish", "tarpon", "trevally", "queenfish", "barramundi", "permit", "milkfish", "flats", "estuary", "giant herring"] },
  { id: "boating",  label: "Boating",         query: "boating Australia", bing: "boating Australia",
    match: ["boat", "marine", "yacht", "vessel", "sail", "ferry", "harbour", "tinnie", "skipper"] },
  { id: "weather",  label: "Weather",         query: "weather Australia BOM", bing: "Australia weather",
    match: ["weather", "forecast", "cyclone", "storm", "rain", "flood", "heat", "monsoon", "temperature", "wind", "wet season"] },
  // au: only Australian publishers or stories that say Australia — the phrase "good news" is everywhere
  { id: "goodnews", label: "Good News",       query: '("good news" OR heartwarming OR uplifting OR "feel-good" OR kindness) Australia', bing: "good news Australia", au: true,
    match: ["good news", "heartwarm", "uplift", "feel good", "kindness", "reunit", "rescue", "generous", "celebrat", "inspir", "miracle"],
    prefer: ["heartwarm", "uplift", "kindness", "reunit", "feel good"] },
  { id: "afl",      label: "AFL Footy",       query: "AFL football", bing: "AFL" },
  { id: "nrl",      label: "Rugby League",    query: "NRL rugby league", bing: "NRL" },
  { id: "cricket",  label: "Cricket",         query: "cricket Australia", bing: "cricket Australia" },
  { id: "travel",   label: "Travel & Tourism",query: "travel tourism Australia", bing: "Australia tourism",
    match: ["travel", "touris", "holiday", "flight", "airline", "cruise", "resort", "airport", "destination"] },
  { id: "money",    label: "Money & Business",query: "business economy Australia", bing: "Australia economy" },
  { id: "world",    label: "World News",      query: "world news", bing: "world news" },
];

/* Looks. "auto" follows the device: Day in light mode, Night in dark mode. */
const THEMES = [
  { id: "auto", label: "Auto" },
  { id: "day", label: "Day", vars: {
      bar1: "#0d456f", bar2: "#093657", barInk: "#ffffff", barSoft: "#84B6DB",
      accent: "#1798CF", strong: "#093657", strongInk: "#ffffff", gold: "#E0A23B",
      bg: "#F4F8FB", sheet: "#ffffff", ink: "#141414", head: "#093657", inkSoft: "#4A6274",
      rule: "#84B6DB", line: "#E1EBF2", note: "#FBF6EC", shadow: "0 10px 26px rgba(9,54,87,.10)" } },
  { id: "night", label: "Night", vars: {
      bar1: "#0b3a5e", bar2: "#072a44", barInk: "#ffffff", barSoft: "#84B6DB",
      accent: "#1798CF", strong: "#E0A23B", strongInk: "#093657", gold: "#E0A23B",
      bg: "#051C2E", sheet: "#0A2E4B", ink: "#F2F7FB", head: "#84B6DB", inkSoft: "#A3C4DC",
      rule: "#1F5F8A", line: "#154463", note: "#12395A", shadow: "0 10px 26px rgba(0,0,0,.30)" } },
  { id: "walkabout", label: "Walkabout", vars: {
      bar1: "#45553D", bar2: "#2E3A29", barInk: "#F6F1E6", barSoft: "#CBB892",
      accent: "#6E7F4F", strong: "#2E3A29", strongInk: "#F6F1E6", gold: "#B98A4E",
      bg: "#F3EEE2", sheet: "#FFFCF5", ink: "#22251E", head: "#2E3A29", inkSoft: "#5F6553",
      rule: "#B4BABC", line: "#E6DECD", note: "#EFE6D2", shadow: "0 10px 26px rgba(46,58,41,.12)" } },
];

const DEFAULTS = {
  v: 0,
  onboarded: false,
  presetIds: [],
  customKeywords: [],
  muteOn: false,
  muteWords: [],
  name: "",
  theme: "auto",
  voiceURI: "",
  rate: 1,
  hiddenKeys: [],   // stories swiped away — never shown again
  boosts: [],       // words from "more like this" headlines — float similar stories up
  brakes: [],       // words from "less like this" headlines — sink or skip similar stories
  swipeTipSeen: false,
};

/* One-off re-tunes (Nov 2026). Glenn's long keywords were searched as exact
   phrases and never found a story; these swap them for versions that do. The
   second block upgrades the first attempt after it was checked against the real
   feeds. Keys are lower-case, single-spaced. */
const TUNED = {
  yellowcheek: "Yellowcheek: yellowcheek / yellow cheek carp / Elopichthys, -darter",
  grants: "NT business grants: Northern Territory / NT / Territory / Territorian / Darwin / Alice Springs / Katherine / Top End, grant / funding / voucher / rebate, business / tourism / operator / fishing, Australia, -Morning Mail",
  bensbach: "Bensbach, -Road, -Glenfield",
  murray: "Lake Murray PNG: Lake Murray, PNG / Papua New Guinea / Papua / Western Province / black bass",
  tying: "Fly tying: fly tying / fly tier / fly pattern [streamer / clouser / deceiver / baitfish]",
  afant: "AFANT: AFANT / Amateur Fishermen's Association of the NT / Amateur Fishermen's Association of the Northern Territory",
  f150: "F-150: F-150, Australia / Aussie [Australia]",
};
const RETUNE = {
  "yellow cheek carp fishing": [TUNED.yellowcheek],
  "nt small business grant": [TUNED.grants],
  "bensbach river png": [TUNED.bensbach],
  "lake murray png": [TUNED.murray],
  "streamer fly tying pattern": [TUNED.tying],
  "afant f150 australia": [TUNED.afant, TUNED.f150],
  // first attempt (data version 4) -> current
  "yellowcheek: yellowcheek / yellow cheek carp / elopichthys": [TUNED.yellowcheek],
  "nt business grants: northern territory / nt / territory / territorian, business, grant / funding / voucher": [TUNED.grants],
  "bensbach": [TUNED.bensbach],
  "streamer fly tying: fly tying / fly pattern / fly tier / tying, streamer / clouser / deceiver / baitfish": [TUNED.tying],
  "afant: afant / amateur fishermen's association": [TUNED.afant],
  "f-150: f-150 / f-series [australia / aussie]": [TUNED.f150],
};

let settings = load();
let speaking = false;
let latestBySection = {}; // sectionLabel -> [items] (for read-aloud)

function load() {
  let s = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) s = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) { /* corrupted or blocked storage — start fresh */ }
  return migrate(s);
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
}

function migrate(s) {
  for (const k of ["presetIds", "customKeywords", "muteWords", "hiddenKeys", "boosts", "brakes"]) {
    if (!Array.isArray(s[k])) s[k] = [];
  }
  if (!THEMES.some((t) => t.id === s.theme)) s.theme = "auto"; // older colour themes retired
  if ((s.v || 0) < DATA_VERSION) {
    const out = [];
    for (const kw of s.customKeywords) {
      const swap = RETUNE[String(kw).replace(/[’‘]/g, "'").toLowerCase().replace(/\s+/g, " ").trim()];
      for (const k of swap || [kw]) {
        if (!out.some((x) => x.toLowerCase() === k.toLowerCase())) out.push(k);
      }
    }
    s.customKeywords = out;
    s.v = DATA_VERSION;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  return s;
}

/* ---------- look & feel ---------- */

const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function activeTheme() {
  let id = settings.theme;
  if (id === "auto") id = darkQuery && darkQuery.matches ? "night" : "day";
  return THEMES.find((x) => x.id === id) || THEMES[1];
}

function applyLook() {
  const t = activeTheme();
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(t.vars)) {
    r.setProperty("--" + k.replace(/[A-Z0-9]/g, (c) => "-" + c.toLowerCase()), v);
  }
  document.documentElement.dataset.theme = t.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.vars.bar2;

  let photo = null;
  try { photo = localStorage.getItem(PHOTO_KEY); } catch (e) {}
  if (photo) {
    document.documentElement.style.setProperty("--bg-photo", `url("${photo}")`);
    document.body.classList.add("has-photo");
  } else {
    document.body.classList.remove("has-photo");
  }
}

function setBackgroundPhoto(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    try {
      localStorage.setItem(PHOTO_KEY, dataUrl);
    } catch (e) {
      toast("That photo is too big to store. Try a smaller one.");
      return;
    }
    applyLook();
    renderPhotoButtons();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast("Couldn't read that photo. Try a different one."); };
  img.src = url;
}

function removeBackgroundPhoto() {
  try { localStorage.removeItem(PHOTO_KEY); } catch (e) {}
  applyLook();
  renderPhotoButtons();
}

function renderPhotoButtons() {
  let has = false;
  try { has = !!localStorage.getItem(PHOTO_KEY); } catch (e) {}
  $("bg-remove").hidden = !has;
}

/* ---------- views ---------- */

const $ = (id) => document.getElementById(id);

function showSetup(editing) {
  stopSpeaking();
  feedGen++; // abandon any feed still loading
  $("setup").hidden = false;
  $("feed").hidden = true;
  $("foot").hidden = true;
  $("topbar").hidden = !editing;
  $("setup-title").textContent = editing ? "Your settings" : "Welcome to My News";
  $("setup-blurb").textContent = editing
    ? "Change your topics, look, voice or blocked words, then save."
    : "Tap the topics you care about, add your own keywords, and get a news feed that's yours. Free, no sign-up, saved on your phone.";
  $("btn-done").textContent = editing ? "Save and show my news" : "Show me my news";
  $("name-input").value = settings.name;
  renderThemeRow();
  renderPhotoButtons();
  renderPresetChips();
  renderCustomChips();
  renderMuteChips();
  renderVoiceOptions();
  $("mute-on").checked = settings.muteOn;
  $("rate-sel").value = String(settings.rate);
  window.scrollTo(0, 0);
}

function showFeed() {
  $("setup").hidden = true;
  $("topbar").hidden = false;
  $("feed").hidden = false;
  $("foot").hidden = false;
  buildFeed();
}

/* ---------- setup screen ---------- */

function renderThemeRow() {
  const row = $("theme-row");
  row.innerHTML = "";
  for (const t of THEMES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme-pick" + (settings.theme === t.id ? " on" : "");
    b.setAttribute("aria-pressed", settings.theme === t.id ? "true" : "false");
    const sw = document.createElement("span");
    sw.className = "swatch";
    const day = THEMES[1].vars, night = THEMES[2].vars;
    sw.style.background = t.vars
      ? `linear-gradient(135deg, ${t.vars.bar2} 50%, ${t.vars.gold} 50%)`
      : `linear-gradient(135deg, ${day.bg} 50%, ${night.bg} 50%)`;
    b.append(sw, t.label);
    b.title = t.id === "auto" ? "Day or Night, following your device" : t.label + " look";
    b.onclick = () => {
      settings.theme = t.id;
      save();
      applyLook();
      renderThemeRow();
    };
    row.appendChild(b);
  }
}

function renderPresetChips() {
  const grid = $("preset-grid");
  grid.innerHTML = "";
  for (const p of PRESETS) {
    const on = settings.presetIds.includes(p.id);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (on ? " on" : "");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.textContent = p.label;
    b.onclick = () => {
      const i = settings.presetIds.indexOf(p.id);
      if (i >= 0) settings.presetIds.splice(i, 1);
      else settings.presetIds.push(p.id);
      save();
      renderPresetChips();
    };
    grid.appendChild(b);
  }
}

function chipList(containerId, items, labelOf, onRemove) {
  const grid = $(containerId);
  grid.innerHTML = "";
  items.forEach((word, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip on";
    b.append(labelOf(word));
    b.title = word;
    b.setAttribute("aria-label", "Remove " + labelOf(word));
    const x = document.createElement("span");
    x.className = "x";
    x.textContent = "×";
    b.appendChild(x);
    b.onclick = () => { onRemove(idx); };
    grid.appendChild(b);
  });
}
function renderCustomChips() {
  chipList("custom-chips", settings.customKeywords, (kw) => parseKeyword(kw).label, (i) => {
    settings.customKeywords.splice(i, 1); save(); renderCustomChips();
  });
}
function renderMuteChips() {
  chipList("mute-chips", settings.muteWords, (w) => w, (i) => {
    settings.muteWords.splice(i, 1); save(); renderMuteChips();
  });
}

function addFromInput(inputId, list, rerender, maxLen) {
  const el = $(inputId);
  const v = el.value.trim().replace(/\s+/g, " ").slice(0, maxLen || 60);
  if (!v) return;
  if (!list.some((w) => w.toLowerCase() === v.toLowerCase())) list.push(v);
  el.value = "";
  save();
  rerender();
  el.focus();
}

/* ---------- voices ---------- */

function englishVoices() {
  if (!window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => {
      // Aussie voices first, then other English
      const aa = a.lang === "en-AU" ? 0 : 1;
      const bb = b.lang === "en-AU" ? 0 : 1;
      return aa - bb || a.name.localeCompare(b.name);
    });
}

function renderVoiceOptions() {
  const sel = $("voice-sel");
  const current = settings.voiceURI;
  sel.innerHTML = '<option value="">Auto (device default)</option>';
  for (const v of englishVoices()) {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = v.name + " (" + v.lang + ")";
    if (v.voiceURI === current) o.selected = true;
    sel.appendChild(o);
  }
}

function chosenVoice() {
  const voices = englishVoices();
  if (settings.voiceURI) {
    const v = voices.find((x) => x.voiceURI === settings.voiceURI);
    if (v) return v;
  }
  return voices.find((v) => v.lang === "en-AU") || voices[0] || null;
}

/* ---------- keywords: turning what was typed into a search + a relevance test ----------

   A keyword becomes `groups` — each group is a list of alternatives, and a
   story is on-topic when it mentions enough of the groups.

     Bensbach                        one word — stories must mention it
     barramundi stocking             two plain words — both must appear
     yellowcheek / yellow cheek      "/" means either-or
     Lake Murray, PNG / Papua        "," means must-have-both (every part required)
     F-150 [Australia]               [brackets] float matching stories to the top,
                                     but aren't required in the story
     Bensbach, -Road                 a leading "-" leaves out stories with that word
     NT grants: NT, grant / funding  "Name: ..." gives the section a short name

   Plain keywords of 3+ words may miss one word (so "kakadu barra fishing news"
   still finds things); anything written with commas is strict.

   "Australia" is special. A story counts as mentioning it when it says so OR
   when its publisher's web address ends in .au — Australian outlets rarely put
   "Australia" in a headline. It's sent to the search only from [brackets]. */

const KW_STOP = new Set("the a an and for of in on to at with news latest".split(" "));
const KW_CONTEXT = new Set(["australia", "australian", "aussie"]);
const KW_ALIAS = {
  nt: ["Northern Territory", "NT"], png: ["PNG", "Papua New Guinea"], wa: ["Western Australia", "WA"],
  qld: ["Queensland", "Qld"], nsw: ["New South Wales", "NSW"], tas: ["Tasmania", "Tas"],
  vic: ["Victoria", "Vic"], nz: ["New Zealand", "NZ"], uk: ["UK", "Britain", "United Kingdom"],
  usa: ["USA", "United States"],
};

const kwCache = new Map();
function parseKeyword(raw) {
  const hit = kwCache.get(raw);
  if (hit) return hit;
  const typed = String(raw).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  let s = typed;
  let label = "";
  const named = s.match(/^([^:"()\[\]\/|,]{1,40}):\s+(\S.*)$/);
  if (named) { label = named[1].trim(); s = named[2].trim(); }

  let out;
  if (/[()]/.test(s)) {
    // hand-written Google search — pass it through, lightly sanity-check the results
    const words = sigWords(s);
    out = { label: label || typed, query: s, bing: words.join(" "), groups: words.length ? [words] : [], need: words.length ? 1 : 0, prefer: [], not: [] };
  } else {
    const prefer = [], not = [];
    s = s.replace(/\[([^\]]*)\]/g, (m, inner) => {
      for (const t of inner.split(/\s*[\/|,]\s*/)) if (t.trim()) prefer.push(t.trim());
      return " ";
    }).trim();

    let groups = [];
    const structured = /,|\s\/\s|\||\sOR\s|\s\+\s/.test(s);
    if (structured) {
      for (const part of s.split(/\s*,\s*|\s+\+\s+/)) {
        const p = part.replace(/"/g, "").trim();
        if (/^-\s*\S/.test(p)) { not.push(p.replace(/^-\s*/, "")); continue; }
        const alts = p.split(/\s+\/\s+|\s*\|\s*|\s+OR\s+/).map((t) => t.trim()).filter(Boolean);
        if (alts.length) groups.push(alts);
      }
    } else {
      const re = /"([^"]+)"|(\S+)/g;
      let m;
      while ((m = re.exec(s))) {
        if (m[1]) { if (m[1].trim()) groups.push([m[1].trim()]); continue; }
        const minus = /^-[\p{L}\p{N}]/u.test(m[2]);
        const w = m[2].replace(/"/g, "").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
        const lw = w.toLowerCase();
        if (!w) continue;
        if (minus) { not.push(w); continue; }
        if (KW_STOP.has(lw)) continue;
        if (KW_CONTEXT.has(lw)) { prefer.push(w); continue; }
        groups.push(KW_ALIAS[lw] ? KW_ALIAS[lw].slice() : [w]);
      }
    }
    if (!groups.length && prefer.length) groups = [prefer.splice(0)]; // only steering words typed, so they are the topic
    if (!groups.length) groups = [[s.replace(/"/g, "") || typed]];
    const n = groups.length;
    const isCtx = (t) => KW_CONTEXT.has(t.toLowerCase());
    const q = (t) => (/[\s\-']/.test(t) ? '"' + t + '"' : t);
    const orJoin = (g) => (g.length > 1 ? "(" + g.map(q).join(" OR ") + ")" : q(g[0]));
    // "Australia" as a required part is judged on the story (see above), not sent as a search word
    let asked = groups.filter((g) => !g.every(isCtx));
    if (!asked.length) asked = groups;
    const steer = prefer.filter(isCtx);
    // "-words" are not sent to the search: Google would also drop stories that only use the word
    // somewhere in the article ("-Road" hid the one real Bensbach story). They are applied to the headline here.
    const query = (asked.map(orJoin).join(" ") + (steer.length ? " " + orJoin(steer) : "")).slice(0, 280);
    // Bing's feed returns nothing for OR / brackets / quotes, so it gets plain words: the first of each part
    const bing = asked.map((g) => g[0]).concat(steer.slice(0, 1)).join(" ").slice(0, 120);
    out = {
      label: label || (structured ? groups[0][0] : s.replace(/(^|\s)-\S+/g, " ").replace(/"/g, "").replace(/\s+/g, " ").trim() || typed),
      query, bing, groups, prefer, not,
      need: structured || n <= 2 ? n : n - 1,
    };
  }
  kwCache.set(raw, out);
  return out;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* Does the text mention this term?
   - starts on a word boundary; longer words also match their endings
     ("grant" hits "grants", "fish" hits "fishing")
   - spaces and hyphens are interchangeable ("fly fish" hits "fly-fishing" and
     "flyfishing"; "F-150" hits "F150")
   - short words, numbers and CAPS acronyms must match exactly ("NT" never hits "ant") */
const termCache = new Map();
function termRe(term) {
  let re = termCache.get(term);
  if (re) return re;
  const t = String(term).replace(/[’‘]/g, "'").trim();
  const toks = t.split(/[\s\-–]+/).filter(Boolean);
  if (!toks.length) re = /$^/;
  else {
    const acronym = /^[A-Z][A-Z0-9]{1,2}$/.test(t);
    const last = toks[toks.length - 1];
    const closed = acronym || last.length <= 3 || /\d/.test(last);
    re = new RegExp(
      "(?:^|[^A-Za-z0-9])" + toks.map(escapeRe).join("[\\s\\-–]*") + (closed ? "(?![A-Za-z0-9])" : ""),
      acronym ? "" : "i"
    );
  }
  termCache.set(term, re);
  return re;
}
function anyTerm(text, terms) {
  return terms.some((t) => termRe(t).test(text));
}
function groupsHit(text, groups) {
  let n = 0;
  for (const g of groups) if (anyTerm(text, g)) n++;
  return n;
}

/* ---------- feed building ---------- */

function activeSections() {
  const sections = [];
  for (const p of PRESETS) {
    if (!settings.presetIds.includes(p.id)) continue;
    const days = p.days || 2;
    const groups = p.match ? [p.match] : [];
    if (p.au) groups.push(["Australia", "Aussie"]);
    sections.push({
      kind: "preset", label: p.label, query: p.query, bing: p.bing || p.label,
      groups, need: groups.length, prefer: p.prefer || [], not: [],
      ladder: days < 7 ? [days, 7] : [days],
    });
  }
  for (const kw of settings.customKeywords) {
    const k = parseKeyword(kw);
    // niche keywords widen their window (week → month → year) until they find something
    sections.push({ kind: "custom", label: k.label, query: k.query, bing: k.bing, groups: k.groups, need: k.need,
      prefer: k.prefer, not: k.not, ladder: [7, 30, 365] });
  }
  return sections;
}

/* ---------- more/less learning ---------- */

const STOP = new Set(("the and for with from that this have will your says said say new all out its " +
  "after over into been were their they them then than there here about when what where which just " +
  "amid near could would should also being because before while under against between during off on " +
  "australia australian aussie news live update updates today year years week day days more most").split(" "));

function hitCount(title, words) {
  const t = title.toLowerCase();
  let n = 0;
  for (const w of words) if (new RegExp("\\b" + escapeRe(w)).test(t)) n++;
  return n;
}

/* The meaningful words of a headline or keyword (for matching + more/less). */
function sigWords(s) {
  return [...new Set(
    s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
  )].slice(0, 6);
}

function keyOf(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/* Words that define the user's chosen topics — never learned as more/less
   signals, or one "less like this" on a Darwin story could sink the whole NT section. */
function protectedTerms() {
  const terms = new Set();
  for (const s of activeSections()) {
    for (const t of [].concat(...s.groups, s.prefer)) {
      for (const w of t.toLowerCase().split(/[\s\-–]+/)) if (w) terms.add(w);
    }
  }
  return [...terms];
}
function learnWords(title) {
  const prot = protectedTerms();
  return sigWords(title).filter((w) => !prot.some((t) => w.startsWith(t) || t.startsWith(w)));
}

/* Remember a list of words, newest last, capped so localStorage stays tiny. */
function remember(list, words, cap) {
  for (const w of words) {
    const i = list.indexOf(w);
    if (i >= 0) list.splice(i, 1);
    list.push(w);
  }
  while (list.length > cap) list.shift();
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Morning" : h < 17 ? "G'day" : "Evening";
  return part + (settings.name ? ", " + settings.name : "");
}

let feedGen = 0; // bumps on every rebuild so a slow, superseded load can't write to the page

async function buildFeed() {
  stopSpeaking();
  const gen = ++feedGen;
  const feed = $("feed");
  const sections = activeSections();
  latestBySection = {};
  previewQueue.length = 0;
  if (previewWatch) previewWatch.disconnect();
  feed.innerHTML = "";

  const mast = document.createElement("div");
  mast.className = "mast";
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const now = new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  mast.innerHTML = `<div class="mast-in"><h2>${escapeHtml(greeting())}</h2><span class="goldrule"></span><p>${today}, updated ${now}</p></div>`;
  feed.appendChild(mast);

  const body = document.createElement("div");
  body.className = "feed-body";
  feed.appendChild(body);

  if (sections.length === 0) {
    const none = document.createElement("div");
    none.className = "empty";
    none.textContent = "No topics picked yet. Open settings to choose some.";
    body.appendChild(none);
    return;
  }

  if (!settings.swipeTipSeen) {
    const tip = document.createElement("div");
    tip.className = "note tip";
    tip.innerHTML = '<span>Swipe a story <b>left</b> to hide it, or <b>right</b> for more or less like it. The ⋯ button on each story does the same.</span>';
    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "Got it";
    ok.onclick = () => { settings.swipeTipSeen = true; save(); tip.remove(); };
    tip.appendChild(ok);
    body.appendChild(tip);
  }

  const ctx = { gen, seenGlobal: new Set() };
  const blocks = sections.map((s) => {
    const div = document.createElement("section");
    div.className = "section";
    body.appendChild(div);
    skeleton(div, s);
    return div;
  });
  await Promise.all(sections.map((s, i) => runSection(blocks[i], s, ctx)));
}

function sectionHead(block, section) {
  block.innerHTML = "";
  const h = document.createElement("h2");
  h.textContent = section.label;
  block.appendChild(h);
}
function skeleton(block, section) {
  sectionHead(block, section);
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  block.appendChild(sheet);
}

async function runSection(block, section, ctx) {
  let result = null, failed = false;
  try { result = await loadSection(section, ctx); } catch (e) { failed = true; }
  if (ctx.gen !== feedGen) return; // the feed was rebuilt while this was loading
  if (failed) {
    sectionHead(block, section);
    const err = document.createElement("div");
    err.className = "empty error";
    err.innerHTML = "<span>Couldn't reach the news sources. Check your connection, then try again.</span>";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "small-btn";
    retry.textContent = "Try again";
    retry.onclick = () => { skeleton(block, section); runSection(block, section, ctx); };
    err.appendChild(retry);
    block.appendChild(err);
    return;
  }
  renderSection(block, section, result, ctx);
}

const MIN_STORIES = 3; // fewer than this and the section looks further afield
const RARE_POOL = 25;  // a search that finds this few stories in total is a rare term: trust the search engine's own match

/* Fetch a section, widening the time window (and adding the backup source)
   until there's something worth showing. Throws only when no source answered. */
async function loadSection(section, ctx) {
  const pool = new Map(); // every Google story seen so far, across the windows tried
  let googleOk = false, googleDown = false, bing = null, bingTried = false;
  let kept = [], days = section.ladder[0];
  const everything = () => [...pool.values()].concat(bing || []).sort((a, b) => (b.date || 0) - (a.date || 0));
  for (const d of section.ladder) {
    days = d;
    if (!googleDown) {
      // the year-long look also asks with no date limit: each turns up stories the other misses
      const asks = d >= 365 ? [d, 0] : [d];
      const got = await Promise.allSettled(asks.map((x) => fetchFeed("g", section.query, x)));
      const ok = got.filter((g) => g.status === "fulfilled");
      if (ok.length) {
        googleOk = true;
        for (const g of ok) for (const it of g.value) {
          const k = keyOf(it.title).slice(0, 60);
          if (k && !pool.has(k)) pool.set(k, it);
        }
      } else if (!googleOk) googleDown = true;
    }
    kept = pick(everything(), section, d, ctx);
    if ((googleDown || (kept.length < MIN_STORIES && section.kind === "custom")) && !bingTried) {
      bingTried = true;
      try { bing = await fetchFeed("b", section.bing, 0); } catch (e) { bing = null; }
      kept = pick(everything(), section, d, ctx);
    }
    if (kept.length >= MIN_STORIES) break;
  }
  if (googleDown && !bing) throw new Error("no source answered");

  // A rare single term (few results in total) with still not enough to show: Google found the word in
  // the article even though the headline doesn't say it. Take those too, newest first.
  if (section.kind === "custom" && section.groups.length <= 1 && kept.length < MIN_STORIES && pool.size && pool.size <= RARE_POOL) {
    const have = new Set(kept.map((it) => it.dkey));
    const loose = pick([...pool.values()].sort((a, b) => (b.date || 0) - (a.date || 0)), { ...section, groups: [], need: 0 }, 365, ctx);
    kept = kept.concat(loose.filter((it) => !have.has(it.dkey)).slice(0, 5 - kept.length));
    days = 365;
  }
  return { kept, days };
}

async function fetchFeed(source, query, days) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(
      "/api/feed?q=" + encodeURIComponent(query) + "&d=" + days + (source === "b" ? "&s=b" : ""),
      { signal: ctrl.signal }
    );
    if (!r.ok) throw new Error("feed " + r.status);
    const xml = await r.text();
    const items = source === "b" ? parseBing(xml) : parseGoogle(xml);
    for (const it of items) {
      if (it.date && isNaN(it.date)) it.date = null;
      // an Australian publisher counts as "mentions Australia" (see the keyword notes)
      // odd hyphens (F‑150 with a non-breaking hyphen) are read as plain ones
      const body = (it.title + " | " + it.desc + (it.au ? " | Australia" : "")).replace(/[’‘]/g, "'").replace(/[\u2010\u2011]/g, "-");
      it.hay = body;                          // what a keyword is tested against
      it.hayWide = body + " | " + it.src;     // presets also count the publisher's name ("Fishing World")
    }
    items.sort((a, b) => (b.date || 0) - (a.date || 0));
    return items;
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/* Is this an Australian publisher? Web address ends in .au, or has "australia" in it,
   or is one of the few big Australian outlets on a plain .com. */
const AU_HOSTS = ["miragenews.com", "torquecafe.com", "thedriven.io"];
function isAu(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /\.au$/.test(host) || host.includes("australia") || AU_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch (e) { return false; }
}

function parseGoogle(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror") || !doc.querySelector("rss")) throw new Error("bad feed");
  const items = [];
  for (const item of doc.querySelectorAll("item")) {
    let title = text(item, "title");
    const link = text(item, "link");
    const src = text(item, "source");
    const srcEl = item.querySelector("source");
    const pub = text(item, "pubDate");
    // Google News titles end with " - Source"; trim it since we show source separately
    if (src && title.endsWith(" - " + src)) title = title.slice(0, -(src.length + 3));
    if (title && /^https?:\/\//i.test(link)) {
      // the description repeats the publisher's name in a <font> tag — drop it so it isn't matched as story text
      const desc = stripTags(text(item, "description").replace(/<font\b[^>]*>[\s\S]*?<\/font>/gi, " "));
      items.push({ title, link, src, date: pub ? new Date(pub) : null, desc, au: isAu(srcEl && srcEl.getAttribute("url")), from: "g" });
    }
  }
  return items;
}

function decodeEntities(s) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return Object.prototype.hasOwnProperty.call(named, e.toLowerCase()) ? named[e.toLowerCase()] : m;
  });
}

/* Bing's feed is read with plain text matching rather than an XML parser, so a
   quirk in its markup can't take the whole backup source down. */
function parseBing(xml) {
  if (!/<rss[\s>]/i.test(xml)) throw new Error("bad feed");
  const items = [];
  for (const block of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const tag = (name) => {
      const m = block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
      if (!m) return "";
      return decodeEntities(m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")).trim();
    };
    const title = stripTags(tag("title"));
    let link = tag("link");
    try {
      const real = new URL(link).searchParams.get("url"); // Bing wraps the article link in a click-tracker
      if (real && /^https?:\/\//i.test(real)) link = real;
    } catch (e) {}
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const pub = tag("pubDate");
    const image = tag("News:Image").replace(/^http:/i, "https:");
    items.push({
      title, link, src: stripTags(tag("News:Source")), date: pub ? new Date(pub) : null,
      desc: stripTags(decodeEntities(tag("description"))),
      image: /^https:\/\//i.test(image) ? image : null, au: isAu(link), from: "b",
    });
  }
  return items;
}

/* Choose the on-topic, not-hidden, not-muted stories inside the time window. */
function pick(items, section, days, ctx) {
  const now = Date.now();
  const maxAge = (days > 0 ? days : 365) * 864e5;
  const muted = settings.muteOn ? settings.muteWords.map((w) => w.toLowerCase()) : [];
  const hidden = new Set(settings.hiddenKeys);
  const seen = new Set();
  const kept = [];
  for (const it of items) {
    if (it.date && (now - it.date.getTime() > maxAge || it.date.getTime() - now > 864e5)) continue;
    const key = keyOf(it.title);
    const dkey = key.slice(0, 60);
    if (!key || seen.has(dkey) || ctx.seenGlobal.has(dkey) || hidden.has(key)) continue;
    const lowTitle = it.title.toLowerCase();
    if (muted.some((w) => lowTitle.includes(w))) continue;
    // the story must actually mention the topic — search engines pad with "related" stories
    const hay = section.kind === "preset" ? it.hayWide : it.hay;
    if (section.not.length && anyTerm(hay, section.not)) continue;
    const hits = groupsHit(hay, section.groups);
    if (hits < section.need) continue;
    const brake = hitCount(it.title, settings.brakes);
    if (brake >= 2) continue; // clearly the kind of story they said "less of"
    seen.add(dkey);
    const preferred = section.prefer.length && anyTerm(hay, section.prefer) ? 3 : 0;
    const complete = section.groups.length > 1 && hits === section.groups.length ? 2 : 0;
    kept.push({ ...it, key, dkey, score: preferred + complete + hitCount(it.title, settings.boosts) - brake });
    if (kept.length >= 24) break;
  }
  kept.sort((a, b) => b.score - a.score || (b.date || 0) - (a.date || 0));
  return kept;
}

function renderSection(block, section, result, ctx) {
  // a story already shown in an earlier section isn't repeated
  const fresh = result.kept.filter((it) => !ctx.seenGlobal.has(it.dkey));
  const show = fresh.slice(0, result.days >= 365 ? 5 : 8);
  for (const it of show) ctx.seenGlobal.add(it.dkey);
  latestBySection[section.label] = show;

  sectionHead(block, section);
  if (show.length === 0) {
    const none = document.createElement("div");
    none.className = "empty";
    none.textContent = section.kind === "custom"
      ? "No stories on this in the past year. A shorter keyword usually finds more."
      : "Nothing new on this in the past week.";
    block.appendChild(none);
    return;
  }
  // say so when a quiet topic had to look further back than usual
  const oldest = Math.max(0, ...show.map((it) => (it.date ? (Date.now() - it.date.getTime()) / 864e5 : 0)));
  if (oldest > section.ladder[0] + 0.5) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = oldest > 30 ? "Quiet topic. These are the latest stories from the past year."
      : oldest > 7 ? "Quiet week. Showing the past month."
      : "Quiet couple of days. Showing the past week.";
    block.appendChild(note);
  }
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  show.forEach((it, i) => sheet.appendChild(makeCard(it, i === 0)));
  block.appendChild(sheet);
}

/* ---------- story cards + swipe (left = hide, right = more/less) ---------- */

const KEBAB = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

function makeCard(it, lead) {
  const wrap = document.createElement("div");
  wrap.className = "cardwrap" + (lead ? " lead" : "");
  wrap.innerHTML = `
    <div class="under under-left" aria-hidden="true"><span>Hide</span></div>
    <div class="under under-right" aria-hidden="true"><span>More or less like this</span></div>
    <div class="card">
      <div class="txt">
        <a class="headline" target="_blank" rel="noopener noreferrer" draggable="false"></a>
        <div class="meta"><span class="src"></span><span class="when"></span>
          <button type="button" class="kebab" aria-label="Options for this story" aria-expanded="false">${KEBAB}</button></div>
        <div class="acts" hidden>
          <button type="button" class="act more">More like this</button>
          <button type="button" class="act less">Less like this</button>
          <button type="button" class="act hide">Hide</button>
        </div>
      </div>
    </div>`;
  const card = wrap.querySelector(".card");
  const head = wrap.querySelector(".headline");
  head.textContent = it.title;
  head.href = it.link;
  wrap.dataset.href = it.link;
  wrap.querySelector(".src").textContent = it.src || "News";
  wrap.querySelector(".when").textContent = relTime(it.date);

  const kebab = wrap.querySelector(".kebab");
  const acts = wrap.querySelector(".acts");
  const toggleActs = (open) => {
    acts.hidden = open === undefined ? !acts.hidden : !open;
    kebab.setAttribute("aria-expanded", acts.hidden ? "false" : "true");
  };
  kebab.onclick = () => toggleActs();
  wrap.querySelector(".more").onclick = () => {
    remember(settings.boosts, learnWords(it.title), 100);
    save();
    toggleActs(false);
    toast("More like this, noted");
  };
  wrap.querySelector(".less").onclick = () => {
    remember(settings.brakes, learnWords(it.title), 100);
    save();
    removeStory(wrap, it);
    toast("Less like this, noted");
  };
  wrap.querySelector(".hide").onclick = () => { removeStory(wrap, it); toast("Story hidden"); };

  if (it.from === "b") {
    // the backup source hands over the real link, a summary and a picture up front
    addSummary(wrap, cleanSummary(it.desc));
    if (it.image) addImage(wrap, it.image);
  } else {
    wrap.dataset.gnlink = it.link;
    watchForPreview(wrap);
  }

  attachSwipe(wrap, card, it, toggleActs);
  return wrap;
}

function addSummary(wrap, summary) {
  if (!summary || wrap.querySelector(".summary")) return;
  const s = document.createElement("div");
  s.className = "summary";
  s.textContent = summary;
  wrap.querySelector(".txt").insertBefore(s, wrap.querySelector(".meta"));
}

function addImage(wrap, src) {
  if (!/^https:\/\//i.test(src) || wrap.querySelector(".thumb")) return;
  const a = document.createElement("a");
  a.className = "thumb";
  a.href = wrap.dataset.href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.tabIndex = -1;
  a.draggable = false;
  a.setAttribute("aria-hidden", "true");
  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = "";
  img.draggable = false;
  img.referrerPolicy = "no-referrer";
  img.onerror = () => { a.remove(); wrap.classList.remove("wide"); };
  // the first story of a section gets a full-width picture when it's big enough to carry it
  img.onload = () => { if (wrap.classList.contains("lead") && img.naturalWidth >= 480) wrap.classList.add("wide"); };
  img.src = src;
  a.appendChild(img);
  wrap.querySelector(".card").appendChild(a);
}

function setHref(wrap, url) {
  if (!/^https?:\/\//i.test(url)) return;
  wrap.dataset.href = url;
  for (const a of wrap.querySelectorAll("a")) a.href = url;
}

function attachSwipe(wrap, card, it, toggleActs) {
  let startX = 0, startY = 0, dx = 0, active = false, horiz = null, moved = false;

  const setX = (x, anim) => {
    card.style.transition = anim ? "transform .18s ease" : "none";
    card.style.transform = x ? `translateX(${x}px)` : "";
  };

  card.addEventListener("pointerdown", (e) => {
    if (e.button || e.target.closest("button")) return;
    startX = e.clientX; startY = e.clientY;
    dx = 0; horiz = null; active = true; moved = false;
  });
  card.addEventListener("pointermove", (e) => {
    if (!active) return;
    const mx = e.clientX - startX, my = e.clientY - startY;
    if (horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = Math.abs(mx) > Math.abs(my);
    if (horiz === false) { active = false; return; } // it's a scroll — let the browser have it
    if (horiz) {
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
      moved = true;
      card.classList.add("dragging");
      dx = Math.max(-160, Math.min(120, mx));
      setX(dx, false);
    }
  });
  const finish = () => {
    card.classList.remove("dragging");
    if (!active) return;
    active = false;
    if (dx < -70) {
      removeStory(wrap, it);
      toast("Story hidden");
    } else {
      setX(0, true);
      if (dx > 70) toggleActs(true);
    }
    dx = 0;
  };
  card.addEventListener("pointerup", finish);
  card.addEventListener("pointercancel", () => { card.classList.remove("dragging"); active = false; dx = 0; setX(0, true); });
  card.addEventListener("click", (e) => {
    // a swipe that ends over the headline mustn't open the article
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
    // tapping anywhere on the story (not just the headline) opens it
    if (e.target.closest("a, button")) return;
    window.open(wrap.dataset.href, "_blank", "noopener,noreferrer");
  }, true);
}

function removeStory(wrap, it) {
  remember(settings.hiddenKeys, [keyOf(it.title)], 500);
  save();
  for (const arr of Object.values(latestBySection)) {
    const i = arr.indexOf(it);
    if (i >= 0) arr.splice(i, 1);
  }
  const sheet = wrap.parentElement;
  wrap.style.height = wrap.offsetHeight + "px";
  requestAnimationFrame(() => wrap.classList.add("gone"));
  setTimeout(() => {
    wrap.remove();
    if (!sheet) return;
    const first = sheet.querySelector(".cardwrap");
    if (first) {
      first.classList.add("lead"); // the next story steps up
      const img = first.querySelector(".thumb img");
      if (img && img.naturalWidth >= 480) first.classList.add("wide");
    } else {
      const none = document.createElement("div");
      none.className = "empty";
      none.textContent = "That's all for this topic.";
      sheet.replaceWith(none);
    }
  }, 380);
}

let toastTimer = null;
function toast(msg) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

/* ---------- pictures + opening lines ----------
   Added a few at a time, and only for stories that are on (or near) the screen,
   so a long feed doesn't fetch previews nobody scrolls to. */

const previewQueue = [];
let previewWorkers = 0;
const previewWatch = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        previewWatch.unobserve(en.target);
        queuePreview(en.target);
      }
    }, { rootMargin: "700px 0px" })
  : null;

function watchForPreview(wrap) {
  if (previewWatch) previewWatch.observe(wrap);
  else queuePreview(wrap);
}
function queuePreview(wrap) {
  previewQueue.push(wrap);
  while (previewWorkers < 4 && previewQueue.length) { previewWorkers++; previewWorker(); }
}
async function previewWorker() {
  while (previewQueue.length) {
    const wrap = previewQueue.shift();
    if (!wrap || !document.body.contains(wrap)) continue;
    try {
      const r = await fetch("/api/preview?u=" + encodeURIComponent(wrap.dataset.gnlink));
      const p = await r.json();
      if (!document.body.contains(wrap)) continue;
      if (p.url) setHref(wrap, p.url); // link straight to the article
      addSummary(wrap, cleanSummary(p.summary));
      if (p.image) addImage(wrap, p.image);
    } catch (e) { /* preview is a bonus — skip on failure */ }
  }
  previewWorkers--;
}

/* Some sites put junk (cookie walls, share bars) in their description field. */
function cleanSummary(s) {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 40) return null;
  if (/no cookies|enable (javascript|cookies)|cookies? (are|is) (disabled|required|blocked)|share via[:]?|subscribe (now|today)|sign in|log ?in to|create an account/i.test(t)) return null;
  return t;
}

function text(node, tag) {
  const el = node.querySelector(tag);
  return el ? el.textContent.trim() : "";
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function relTime(d) {
  if (!d || isNaN(d)) return "recent";
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return mins + " min ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hrs / 24);
  if (days < 14) return days + (days === 1 ? " day ago" : " days ago");
  if (days < 60) return Math.round(days / 7) + " weeks ago";
  return Math.round(days / 30) + " months ago";
}

/* ---------- read it to me ---------- */

function speakFeed() {
  if (speaking) { stopSpeaking(); return; }
  const synth = window.speechSynthesis;
  if (!synth) { toast("This device can't read aloud."); return; }

  const name = settings.name ? ", " + settings.name : "";
  const parts = ["Here's your news" + name + "."];
  for (const [label, items] of Object.entries(latestBySection)) {
    if (!items.length) continue;
    parts.push(label + ".");
    items.slice(0, 4).forEach((it) => parts.push(it.title + ". From " + (it.src || "the news") + "."));
  }
  if (parts.length === 1) { toast("Nothing loaded to read yet. Refresh first."); return; }
  parts.push("That's the wrap. Have a good one.");
  speakParts(parts);
}

function speakParts(parts) {
  const synth = window.speechSynthesis;
  if (!synth) { toast("This device can't read aloud."); return; }
  const voice = chosenVoice();
  speaking = true;
  $("btn-listen").classList.add("speaking");
  const chunks = parts.map((p) => {
    const u = new SpeechSynthesisUtterance(p);
    if (voice) u.voice = voice;
    u.rate = Number(settings.rate) || 1;
    return u;
  });
  chunks[chunks.length - 1].onend = stopSpeaking;
  chunks.forEach((u) => synth.speak(u));
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  speaking = false;
  const b = $("btn-listen");
  if (b) b.classList.remove("speaking");
}

/* ---------- share the app / carry a setup to another device ---------- */

async function copyOrShare(data, copiedMsg) {
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(data.url);
    toast(copiedMsg);
  } catch (e) {
    window.prompt("Copy this link:", data.url);
  }
}

function shareApp() {
  copyOrShare({
    title: "My News",
    text: "Free news app. Pick your own topics and keywords. No sign-up.",
    url: location.origin + location.pathname,
  }, "Link copied. Paste it to a mate.");
}

/* The setup link carries topics, keywords, blocked words and the look in the
   part of the address after "#", which browsers never send to any server. */
function setupLink() {
  const data = { p: settings.presetIds, k: settings.customKeywords, m: settings.muteWords, mo: settings.muteOn ? 1 : 0, t: settings.theme };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return location.origin + location.pathname + "#setup=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function readSetupLink() {
  const m = location.hash.match(/^#setup=([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  try {
    const bin = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    const strings = (a, max, len) => (Array.isArray(a) ? a : [])
      .filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().slice(0, len)).slice(0, max);
    return {
      presetIds: strings(data.p, 20, 20).filter((id) => PRESETS.some((p) => p.id === id)),
      customKeywords: strings(data.k, 40, 200),
      muteWords: strings(data.m, 60, 60),
      muteOn: !!data.mo,
      theme: THEMES.some((t) => t.id === data.t) ? data.t : null,
    };
  } catch (e) { return null; }
}

function offerSetup(incoming) {
  const n = incoming.presetIds.length + incoming.customKeywords.length;
  const box = document.createElement("div");
  box.className = "modal";
  box.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-h">
      <h2 id="modal-h">Load this setup?</h2>
      <p></p>
      <ul></ul>
      <div class="modal-btns">
        <button type="button" class="small-btn ghost" data-act="keep">Keep mine</button>
        <button type="button" class="small-btn" data-act="use">Load setup</button>
      </div>
    </div>`;
  box.querySelector("p").textContent =
    `This link carries ${n} topic${n === 1 ? "" : "s"}. Loading it replaces the topics, keywords and blocked words on this device.`;
  const ul = box.querySelector("ul");
  const names = incoming.presetIds.map((id) => PRESETS.find((p) => p.id === id).label)
    .concat(incoming.customKeywords.map((k) => parseKeyword(k).label));
  for (const name of names.slice(0, 14)) {
    const li = document.createElement("li");
    li.textContent = name;
    ul.appendChild(li);
  }
  const close = () => { box.remove(); history.replaceState(null, "", location.pathname + location.search); };
  box.querySelector('[data-act="keep"]').onclick = close;
  box.querySelector('[data-act="use"]').onclick = () => {
    settings.presetIds = incoming.presetIds;
    settings.customKeywords = incoming.customKeywords;
    settings.muteWords = incoming.muteWords;
    settings.muteOn = incoming.muteOn;
    if (incoming.theme) settings.theme = incoming.theme;
    settings.onboarded = true;
    save();
    close();
    applyLook();
    showFeed();
    toast("Setup loaded");
  };
  document.body.appendChild(box);
  box.querySelector('[data-act="use"]').focus();
}

/* ---------- wire up ---------- */

$("kw-add").onclick = () => addFromInput("kw-input", settings.customKeywords, renderCustomChips, 200);
$("kw-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("kw-add").click(); });
$("mute-add").onclick = () => addFromInput("mute-input", settings.muteWords, renderMuteChips);
$("mute-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("mute-add").click(); });
$("mute-on").onchange = (e) => { settings.muteOn = e.target.checked; save(); };
$("name-input").addEventListener("input", (e) => {
  settings.name = e.target.value.trim().slice(0, 30);
  save();
});
$("bg-input").addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) setBackgroundPhoto(e.target.files[0]);
  e.target.value = "";
});
$("bg-remove").onclick = removeBackgroundPhoto;
$("voice-sel").onchange = (e) => { settings.voiceURI = e.target.value; save(); };
$("rate-sel").onchange = (e) => { settings.rate = Number(e.target.value); save(); };
$("voice-test").onclick = () => {
  if (speaking) { stopSpeaking(); return; }
  const name = settings.name ? ", " + settings.name : "";
  speakParts(["G'day" + name + "! This is how your news will sound."]);
};

$("btn-done").onclick = () => {
  // capture anything typed but not yet added
  if ($("kw-input").value.trim()) $("kw-add").click();
  if ($("mute-input").value.trim()) $("mute-add").click();
  settings.onboarded = true;
  save();
  showFeed();
  window.scrollTo(0, 0);
};

$("swipe-reset").onclick = () => {
  settings.hiddenKeys = [];
  settings.boosts = [];
  settings.brakes = [];
  save();
  toast("Learning cleared. Fresh start.");
};

$("setup-copy").onclick = () => copyOrShare({ title: "My News setup", url: setupLink() }, "Setup link copied");

$("btn-settings").onclick = () => showSetup(true);
$("btn-refresh").onclick = () => buildFeed();
$("btn-listen").onclick = () => speakFeed();
$("btn-share").onclick = () => shareApp();

// voices load lazily on some devices — refresh the picker when they arrive
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    if (!$("setup").hidden) renderVoiceOptions();
  };
}

// "Auto" look follows the device as it flips between light and dark
if (darkQuery) {
  const onFlip = () => { if (settings.theme === "auto") applyLook(); };
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", onFlip);
  else if (darkQuery.addListener) darkQuery.addListener(onFlip);
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

applyLook();
if (settings.onboarded && activeSections().length > 0) showFeed();
else showSetup(false);

const incomingSetup = readSetupLink();
if (incomingSetup) offerSetup(incomingSetup);

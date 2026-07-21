/* My News — pick your topics, get your news. All settings live on this device. */

const STORE_KEY = "mynews.settings.v1";
const PHOTO_KEY = "mynews.bgphoto.v1"; // stored separately: photos are big

const PRESETS = [
  { id: "nt",       label: "Top End & NT",    query: '"Northern Territory" OR "Top End" OR (Darwin Australia)' },
  { id: "fishing",  label: "Fishing",         query: "fishing Australia" },
  { id: "flyfish",  label: "Fly Fishing",     query: '"fly fishing"' },
  { id: "boating",  label: "Boating",         query: "boating Australia" },
  { id: "weather",  label: "Weather",         query: "weather Australia BOM" },
  { id: "goodnews", label: "Good News",       query: '"good news" Australia' },
  { id: "afl",      label: "AFL Footy",       query: "AFL football" },
  { id: "nrl",      label: "Rugby League",    query: "NRL rugby league" },
  { id: "cricket",  label: "Cricket",         query: "cricket Australia" },
  { id: "travel",   label: "Travel & Tourism",query: "travel tourism Australia" },
  { id: "money",    label: "Money & Business",query: "business economy Australia" },
  { id: "world",    label: "World News",      query: "world news" },
];

const THEMES = [
  { id: "sunset", label: "Sunset", accent: "#e8641b", accentDark: "#c9520f", bg: "#fff8f0", ink: "#2b2018", inkSoft: "#6b5d50", card: "#ffffff", line: "#f0e2d2" },
  { id: "ocean",  label: "Ocean",  accent: "#0e7fb8", accentDark: "#0a628f", bg: "#f0f7fb", ink: "#142833", inkSoft: "#4e6675", card: "#ffffff", line: "#d9eaf3" },
  { id: "reef",   label: "Reef",   accent: "#00897b", accentDark: "#00695c", bg: "#f0f8f6", ink: "#15302b", inkSoft: "#527a72", card: "#ffffff", line: "#d4ebe6" },
  { id: "coral",  label: "Coral",  accent: "#d6455f", accentDark: "#b03049", bg: "#fdf2f4", ink: "#33161d", inkSoft: "#7d5560", card: "#ffffff", line: "#f6dbe1" },
  { id: "night",  label: "Night",  accent: "#ff8a3d", accentDark: "#e56f20", bg: "#161210", ink: "#f2eae1", inkSoft: "#b3a596", card: "#221c17", line: "#3a3129" },
];

const DEFAULTS = {
  onboarded: false,
  presetIds: [],
  customKeywords: [],
  muteOn: false,
  muteWords: [],
  name: "",
  theme: "sunset",
  voiceURI: "",
  rate: 1,
};

let settings = load();
let speaking = false;
let latestBySection = {}; // sectionLabel -> [items] (for read-aloud)

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) { /* corrupted or blocked storage — start fresh */ }
  return { ...DEFAULTS };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) {}
}

/* ---------- look & feel ---------- */

function applyLook() {
  const t = THEMES.find((x) => x.id === settings.theme) || THEMES[0];
  const r = document.documentElement.style;
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-dark", t.accentDark);
  r.setProperty("--bg", t.bg);
  r.setProperty("--ink", t.ink);
  r.setProperty("--ink-soft", t.inkSoft);
  r.setProperty("--card", t.card);
  r.setProperty("--line", t.line);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.accent;

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
      alert("That photo is too big to store — try a smaller one.");
      return;
    }
    applyLook();
    renderPhotoButtons();
  };
  img.onerror = () => alert("Couldn't read that photo — try a different one.");
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
  $("setup").hidden = false;
  $("feed").hidden = true;
  $("foot").hidden = true;
  $("topbar").hidden = !editing;
  $("setup-title").textContent = editing ? "Your settings" : "Welcome to My News";
  $("setup-blurb").textContent = editing
    ? "Change your topics, look, voice or blocked words, then save."
    : "Tap the topics you care about, add your own keywords, and get a news feed that's yours. Free, no sign-up, saved on your phone.";
  $("btn-done").textContent = editing ? "Save & show my news" : "Show me my news";
  $("name-input").value = settings.name;
  renderThemeRow();
  renderPhotoButtons();
  renderPresetChips();
  renderCustomChips();
  renderMuteChips();
  renderVoiceOptions();
  $("mute-on").checked = settings.muteOn;
  $("rate-sel").value = String(settings.rate);
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
    b.className = "theme-dot" + (settings.theme === t.id ? " on" : "");
    b.style.background = `linear-gradient(135deg, ${t.accent} 55%, ${t.bg} 55%)`;
    b.textContent = t.label;
    b.title = t.label + " theme";
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
    const b = document.createElement("button");
    b.className = "chip" + (settings.presetIds.includes(p.id) ? " on" : "");
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

function chipList(containerId, items, onRemove) {
  const grid = $(containerId);
  grid.innerHTML = "";
  items.forEach((word, idx) => {
    const b = document.createElement("button");
    b.className = "chip on";
    b.innerHTML = "";
    b.append(word);
    const x = document.createElement("span");
    x.className = "x";
    x.textContent = "×";
    b.appendChild(x);
    b.onclick = () => { onRemove(idx); };
    grid.appendChild(b);
  });
}
function renderCustomChips() {
  chipList("custom-chips", settings.customKeywords, (i) => {
    settings.customKeywords.splice(i, 1); save(); renderCustomChips();
  });
}
function renderMuteChips() {
  chipList("mute-chips", settings.muteWords, (i) => {
    settings.muteWords.splice(i, 1); save(); renderMuteChips();
  });
}

function addFromInput(inputId, list, rerender) {
  const el = $(inputId);
  const v = el.value.trim().replace(/\s+/g, " ").slice(0, 60);
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

/* ---------- feed building ---------- */

function activeSections() {
  const sections = [];
  for (const p of PRESETS) {
    if (settings.presetIds.includes(p.id)) sections.push({ label: p.label, query: p.query, days: 2 });
  }
  for (const kw of settings.customKeywords) {
    // niche keywords get a wider window so the section isn't empty
    sections.push({ label: kw, query: kw, days: 7 });
  }
  return sections;
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? ["Morning", "☀️"] : h < 17 ? ["G'day", "🎣"] : ["Evening", "🌙"];
  const name = settings.name ? ", " + settings.name : "";
  return part[0] + name + " " + part[1];
}

async function buildFeed() {
  stopSpeaking();
  const feed = $("feed");
  const sections = activeSections();
  latestBySection = {};
  feed.innerHTML = "";

  const greet = document.createElement("div");
  greet.className = "greet";
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const now = new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  greet.innerHTML = `<h2>${escapeHtml(greeting())}</h2><p>${today} · updated ${now}</p>`;
  feed.appendChild(greet);

  if (sections.length === 0) {
    feed.innerHTML += '<div class="empty">No topics picked yet — tap ⚙️ to choose some.</div>';
    return;
  }

  const seenGlobal = new Set();
  const blocks = sections.map((s) => {
    const div = document.createElement("div");
    div.className = "section";
    div.innerHTML = `<h2>${escapeHtml(s.label)}</h2><div class="skel"></div><div class="skel"></div><div class="skel"></div>`;
    feed.appendChild(div);
    return div;
  });

  await Promise.all(sections.map(async (s, i) => {
    try {
      const items = await fetchSection(s.query, s.days);
      renderSection(blocks[i], s.label, items, seenGlobal);
    } catch (e) {
      blocks[i].innerHTML = `<h2>${escapeHtml(s.label)}</h2><div class="error">Couldn't load this topic right now — tap ↻ in a minute.</div>`;
    }
  }));

  enrichCards();
}

async function fetchSection(query, days) {
  const d = Math.min(7, Math.max(1, days || 2));
  const r = await fetch("/api/feed?q=" + encodeURIComponent(query) + "&d=" + d);
  if (!r.ok) throw new Error("feed " + r.status);
  const xml = await r.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = [];
  for (const item of doc.querySelectorAll("item")) {
    let title = text(item, "title");
    const link = text(item, "link");
    const src = text(item, "source");
    const pub = text(item, "pubDate");
    // Google News titles end with " - Source"; trim it since we show source separately
    if (src && title.endsWith(" - " + src)) title = title.slice(0, -(src.length + 3));
    if (title && link) items.push({ title, link, src, date: pub ? new Date(pub) : null });
  }
  items.sort((a, b) => (b.date || 0) - (a.date || 0));
  return items;
}

function renderSection(block, label, items, seenGlobal) {
  const muted = settings.muteOn ? settings.muteWords.map((w) => w.toLowerCase()) : [];
  const kept = [];
  for (const it of items) {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seenGlobal.has(key)) continue;
    if (muted.some((w) => it.title.toLowerCase().includes(w))) continue;
    seenGlobal.add(key);
    kept.push(it);
    if (kept.length >= 8) break;
  }
  latestBySection[label] = kept;

  block.innerHTML = `<h2>${escapeHtml(label)}</h2>`;
  if (kept.length === 0) {
    block.innerHTML += '<div class="empty">Nothing fresh on this one right now.</div>';
    return;
  }
  for (const it of kept) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = it.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.dataset.gnlink = it.link;
    a.innerHTML = `<div class="txt">
        <div class="headline">${escapeHtml(it.title)}</div>
        <div class="meta"><span class="src">${escapeHtml(it.src || "News")}</span> · ${relTime(it.date)}</div>
      </div>`;
    block.appendChild(a);
  }
}

/* Progressively add pictures + opening lines to the cards.
   Runs after the headlines are already on screen, a few at a time. */
async function enrichCards() {
  const cards = Array.from(document.querySelectorAll(".card[data-gnlink]"));
  const queue = cards.slice();
  const WORKERS = 4;

  async function worker() {
    while (queue.length) {
      const card = queue.shift();
      if (!card || !document.body.contains(card)) continue;
      try {
        const r = await fetch("/api/preview?u=" + encodeURIComponent(card.dataset.gnlink));
        const p = await r.json();
        if (!document.body.contains(card)) continue;
        if (p.url) card.href = p.url; // link straight to the article
        p.summary = cleanSummary(p.summary);
        if (p.summary) {
          const txt = card.querySelector(".txt");
          const meta = card.querySelector(".meta");
          if (txt && meta && !card.querySelector(".summary")) {
            const s = document.createElement("div");
            s.className = "summary";
            s.textContent = p.summary;
            txt.insertBefore(s, meta);
          }
        }
        if (p.image && !card.querySelector(".thumb")) {
          const img = document.createElement("img");
          img.className = "thumb";
          img.loading = "lazy";
          img.alt = "";
          img.src = p.image;
          img.onerror = () => img.remove();
          card.appendChild(img);
        }
      } catch (e) { /* preview is a bonus — skip on failure */ }
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
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
  return days + (days === 1 ? " day ago" : " days ago");
}

/* ---------- read it to me ---------- */

function speakFeed() {
  if (speaking) { stopSpeaking(); return; }
  const synth = window.speechSynthesis;
  if (!synth) { alert("Sorry — this device can't read aloud."); return; }

  const name = settings.name ? ", " + settings.name : "";
  const parts = ["Here's your news" + name + "."];
  for (const [label, items] of Object.entries(latestBySection)) {
    if (!items.length) continue;
    parts.push(label + ".");
    items.slice(0, 4).forEach((it) => parts.push(it.title + ". From " + (it.src || "the news") + "."));
  }
  if (parts.length === 1) { alert("Nothing loaded to read yet — refresh first."); return; }
  parts.push("That's the wrap. Have a good one.");
  speakParts(parts);
}

function speakParts(parts) {
  const synth = window.speechSynthesis;
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

/* ---------- share ---------- */

async function shareApp() {
  const data = {
    title: "My News",
    text: "Free news app — pick your own topics and keywords. No sign-up.",
    url: location.origin + location.pathname,
  };
  if (navigator.share) {
    try { await navigator.share(data); } catch (e) {}
  } else {
    try {
      await navigator.clipboard.writeText(data.url);
      alert("Link copied — paste it to a mate!");
    } catch (e) { alert("Share this link: " + data.url); }
  }
}

/* ---------- wire up ---------- */

$("kw-add").onclick = () => addFromInput("kw-input", settings.customKeywords, renderCustomChips);
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
};

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

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

applyLook();
if (settings.onboarded && activeSections().length > 0) showFeed();
else showSetup(false);

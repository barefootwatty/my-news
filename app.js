/* My News — pick your topics, get your news. All settings live on this device. */

const STORE_KEY = "mynews.settings.v1";

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

const DEFAULTS = {
  onboarded: false,
  presetIds: [],
  customKeywords: [],
  muteOn: false,
  muteWords: [],
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
    ? "Change your topics, keywords or blocked words, then save."
    : "Tap the topics you care about, add your own keywords, and get a news feed that's yours. Free, no sign-up, saved on your phone.";
  $("btn-done").textContent = editing ? "Save & show my news" : "Show me my news";
  renderPresetChips();
  renderCustomChips();
  renderMuteChips();
  $("mute-on").checked = settings.muteOn;
}

function showFeed() {
  $("setup").hidden = true;
  $("topbar").hidden = false;
  $("feed").hidden = false;
  $("foot").hidden = false;
  buildFeed();
}

/* ---------- setup screen ---------- */

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

async function buildFeed() {
  stopSpeaking();
  const feed = $("feed");
  const sections = activeSections();
  latestBySection = {};
  feed.innerHTML = "";

  const stamp = document.createElement("p");
  stamp.className = "updated";
  stamp.textContent = "Updated " + new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
  feed.appendChild(stamp);

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
      blocks[i].innerHTML = `<h2>${escapeHtml(s.label)}</h2><div class="error">Couldn't load this topic right now — pull refresh in a minute.</div>`;
    }
  }));
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
    block.innerHTML += '<div class="empty">Nothing fresh on this in the last two days.</div>';
    return;
  }
  for (const it of kept) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = it.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = `<div class="headline">${escapeHtml(it.title)}</div>
      <div class="meta"><span class="src">${escapeHtml(it.src || "News")}</span> · ${relTime(it.date)}</div>`;
    block.appendChild(a);
  }
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

  const parts = ["Here's your news."];
  for (const [label, items] of Object.entries(latestBySection)) {
    if (!items.length) continue;
    parts.push(label + ".");
    items.slice(0, 4).forEach((it) => parts.push(it.title + ". From " + (it.src || "the news") + "."));
  }
  if (parts.length === 1) { alert("Nothing loaded to read yet — refresh first."); return; }
  parts.push("That's the wrap. Have a good one.");

  const voice =
    synth.getVoices().find((v) => v.lang === "en-AU") ||
    synth.getVoices().find((v) => v.lang && v.lang.startsWith("en")) || null;

  speaking = true;
  $("btn-listen").classList.add("speaking");
  const chunks = parts.map((p) => {
    const u = new SpeechSynthesisUtterance(p);
    if (voice) u.voice = voice;
    u.rate = 1.0;
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

// warm the voices list (some browsers load it lazily)
if (window.speechSynthesis) window.speechSynthesis.getVoices();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

if (settings.onboarded && activeSections().length > 0) showFeed();
else showSetup(false);

/* ABiMPACT Shoot Calendar — React 18 + htm, no build step. Shoots save to localStorage on this device. */
(function () {
'use strict';
var html = htm.bind(React.createElement);
var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;

/* Fade-and-rise on scroll; re-scanned after every render. */
var revealIO = null;
try {
  revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
} catch (e) {}
window.abReveal = function () {
  document.querySelectorAll('.reveal:not(.in):not([data-obs])').forEach(function (el) {
    if (!revealIO) { el.classList.add('in'); return; }
    el.setAttribute('data-obs', '');
    revealIO.observe(el);
  });
};

var TZ = 'Asia/Manila';
var KEY = 'abimpact.shoots.v1';
var LEGACY_KEY = 'shootbook.v1';
var THEME_KEY = 'abimpact.theme';
var TYPES = ['Reel', 'Interview', 'Product', 'Event', 'BTS'];
var STATUSES = ['Planned', 'Confirmed', 'Shot', 'Delivered'];
var RATIOS = ['9:16', '1:1', '16:9'];
var SHOT_TYPES = ['Wide', 'Medium', 'Close-up', 'Detail', 'B-roll', 'Talking head'];
var MOVES = ['Static', 'Pan', 'Tilt', 'Push-in', 'Gimbal walk', 'Handheld'];
var DEFAULT_GEAR = ['Camera body + 3 batteries', '24-70mm lens', 'Gimbal', 'Wireless lav x2', 'LED panel x2 + stands', 'SD cards (formatted)', 'Phone for 9:16 backup'];

/* ---------- utils ---------- */
function todayISO() {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function nowHM() {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); }
  catch (e) { return ''; }
}
function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
function fmt(iso, opts) { try { return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', Object.assign({ timeZone: 'UTC' }, opts)); } catch (e) { return iso; } }
function monday(iso) { var d = (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7; return addDays(iso, -d); }
function pad2(n) { return String(n).padStart(2, '0'); }
function uid(p) { return p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function cmp(a, b) { return ((a.date || '') + (a.callTime || '')).localeCompare((b.date || '') + (b.callTime || '')); }
function countdown(today, iso) {
  var n = diffDays(today, iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? 'in ' + n + ' days' : Math.abs(n) + ' days ago';
}
function mins(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function dur(a, b) {
  var x = mins(a), y = mins(b); if (x == null || y == null || y <= x) return '';
  var d = y - x, hh = Math.floor(d / 60), mm = d % 60;
  return (hh ? hh + ' hr' + (mm ? ' ' : '') : '') + (mm ? mm + ' min' : '');
}
function mmss(sec) { return Math.floor(sec / 60) + ':' + pad2(sec % 60); }
function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : null; }
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
function initials(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?'; }
function items(arr) { return arr.map(function (i) { return { item: i, done: false }; }); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function byTime(a, b) { return (a.time || '').localeCompare(b.time || ''); }
function mq() { try { return window.matchMedia('(max-width: 760px)').matches; } catch (e) { return false; } }

function norm(o) {
  o = o || {};
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var chk = function (w) { return { item: String(w && w.item != null ? w.item : w), done: !!(w && w.done) }; };
  return {
    id: String(o.id || uid('shoot')), title: String(o.title || 'Untitled shoot'), client: String(o.client || ''),
    type: TYPES.indexOf(o.type) >= 0 ? o.type : 'Reel', status: STATUSES.indexOf(o.status) >= 0 ? o.status : 'Planned',
    date: /^\d{4}-\d{2}-\d{2}$/.test(o.date || '') ? o.date : todayISO(), callTime: String(o.callTime || ''), wrapTime: String(o.wrapTime || ''),
    location: String(o.location || ''), goal: String(o.goal || ''), concept: String(o.concept || ''), platform: String(o.platform || ''), aspectRatio: String(o.aspectRatio || ''),
    mood: arr(o.mood).map(String), palette: arr(o.palette).map(String), lighting: String(o.lighting || ''),
    references: arr(o.references).map(function (r) { return { label: String(r.label || ''), url: String(r.url || '') }; }),
    crew: arr(o.crew).map(function (c) { return { name: String(c.name || ''), role: String(c.role || ''), phone: String(c.phone || '') }; }),
    wardrobe: arr(o.wardrobe).map(chk), gear: arr(o.gear).map(chk),
    runOfShow: arr(o.runOfShow).map(function (r) { return { time: String(r.time || ''), activity: String(r.activity || '') }; }),
    notes: String(o.notes || ''), example: !!o.example,
    shots: arr(o.shots).map(function (s) {
      return { id: String(s.id || uid('s')), scene: String(s.scene || ''), description: String(s.description || ''), shotType: String(s.shotType || 'Medium'), movement: String(s.movement || 'Static'), lens: String(s.lens || ''), duration: Math.max(0, Number(s.duration) || 0), audio: !!s.audio, priority: s.priority === 'Nice-to-have' ? 'Nice-to-have' : 'Must-have', done: !!s.done };
    })
  };
}

function loadInitial() {
  var canSave = true, shoots = null;
  try {
    var raw = window.localStorage.getItem(KEY) || window.localStorage.getItem(LEGACY_KEY);
    if (raw) { var p = JSON.parse(raw); if (Array.isArray(p.shoots)) shoots = p.shoots.filter(function (x) { return !x.example; }).map(norm); }
  } catch (e) { canSave = false; }
  return { shoots: shoots || [], canSave: canSave };
}
function loadTheme() { try { var t = window.localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'auto'; } catch (e) { return 'auto'; } }
function parseRoute() {
  var h = decodeURIComponent((window.location.hash || '').slice(1));
  if (h.indexOf('shoot/') === 0) return { name: 'shoot', id: h.slice(6) };
  if (h === 'dayof') return { name: 'dayof' };
  return { name: 'brief', anchor: h };
}
function go(hash) { window.location.hash = hash; }

function newDraft(date) {
  return {
    title: '', client: '', type: 'Reel', status: 'Planned', date: date, callTime: '09:00', wrapTime: '12:00', aspectRatio: '9:16', location: '', platform: 'Instagram Reels + TikTok',
    concept: '', goal: '', mood: [], palette: [], lighting: '', references: [],
    crew: [{ name: 'Jeth', role: 'DP / Editor', phone: '' }], wardrobe: [], gear: items(DEFAULT_GEAR),
    runOfShow: [{ time: '09:00', activity: 'Arrive and set up' }], notes: ''
  };
}
function toDraft(s) {
  var d = clone(s); delete d.shots; delete d.id; delete d.example; return d;
}
function cleanDraft(d) {
  var has = function (o) { return Object.keys(o).some(function (k) { return k !== 'done' && String(o[k] || '').trim(); }); };
  var trimAll = function (o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = typeof o[k] === 'string' ? o[k].trim() : o[k]; }); return r; };
  return Object.assign({}, d, {
    title: d.title.trim(), client: d.client.trim(), location: d.location.trim(), platform: d.platform.trim(), goal: d.goal.trim(), concept: d.concept.trim(), lighting: d.lighting.trim(),
    mood: d.mood.map(function (m) { return m.trim(); }).filter(Boolean),
    palette: d.palette.map(function (p) { p = p.trim(); return p[0] === '#' ? p : '#' + p; }).filter(function (p) { return /^#[0-9a-fA-F]{3,8}$/.test(p); }),
    references: d.references.filter(has).map(trimAll), crew: d.crew.filter(has).map(trimAll),
    wardrobe: d.wardrobe.filter(has).map(trimAll), gear: d.gear.filter(has).map(trimAll),
    runOfShow: d.runOfShow.filter(has).map(trimAll).sort(byTime)
  });
}

/* ---------- icons ---------- */
function Svg(p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p.children}</svg>`; }
var I = {
  plus: html`<${Svg}><path d="M12 5v14M5 12h14"/><//>`,
  left: html`<${Svg}><path d="M15 6l-6 6 6 6"/><//>`,
  right: html`<${Svg}><path d="M9 6l6 6-6 6"/><//>`,
  up: html`<${Svg}><path d="M6 15l6-6 6 6"/><//>`,
  down: html`<${Svg}><path d="M6 9l6 6 6-6"/><//>`,
  close: html`<${Svg}><path d="M6 6l12 12M18 6L6 18"/><//>`,
  edit: html`<${Svg}><path d="M4 20h4L19 9l-4-4L4 16z"/><//>`,
  copy: html`<${Svg}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/><//>`,
  trash: html`<${Svg}><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/><//>`,
  print: html`<${Svg}><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/><//>`,
  cal: html`<${Svg}><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><//>`,
  check: html`<${Svg}><path d="M5 12.5l4.5 4.5L19 7.5"/><//>`,
  theme: html`<${Svg}><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/><//>`,
  data: html`<${Svg}><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/><//>`,
  bolt: html`<${Svg}><path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/><//>`,
  dup: html`<${Svg}><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/><//>`
};
function Glyph(p) {
  var s = p.status;
  return html`<span class="g" aria-hidden="true"><svg viewBox="0 0 12 12">
    ${s === 'Planned' ? html`<circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>` : null}
    ${s === 'Confirmed' ? html`<circle cx="6" cy="6" r="5" fill="currentColor"/>` : null}
    ${s === 'Shot' ? html`<g><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 1.5a4.5 4.5 0 0 1 0 9z" fill="currentColor"/></g>` : null}
    ${s === 'Delivered' ? html`<g><circle cx="6" cy="6" r="5.5" fill="currentColor"/><path d="M3.4 6.2l1.8 1.8 3.4-3.7" fill="none" stroke="var(--card)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>` : null}
  </svg></span>`;
}
function TypePill(p) { return html`<span class=${'pill t-' + p.type}>${p.type}</span>`; }
function StatusPill(p) { return html`<span class=${'pill st st-' + p.status}><i></i>${p.status}</span>`; }
function ExPill(p) { return p.show ? html`<span class="pill ex">Example</span>` : null; }

/* ---------- modal sheet ---------- */
function Sheet(p) {
  var ref = useRef(null);
  useEffect(function () {
    var prev = document.activeElement;
    var el = ref.current && ref.current.querySelector('input:not([type=color]),select,textarea');
    if (el) el.focus();
    var onKey = function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); p.onClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      var f = ref.current.querySelectorAll('button,input,select,textarea,a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = 'hidden';
    return function () { document.removeEventListener('keydown', onKey, true); document.documentElement.style.overflow = ''; if (prev && prev.focus) try { prev.focus(); } catch (e) {} };
  }, []);
  return html`<div class="scrim" onMouseDown=${function (e) { if (e.target === e.currentTarget) p.onClose(); }}>
    <div class=${'sheet' + (p.narrow ? ' narrow' : '')} role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref=${ref}>
      <div class="sheet-head"><h2 id="sheet-title">${p.title}</h2><button type="button" class="icon-btn" aria-label="Close" onClick=${p.onClose}>${I.close}</button></div>
      <div class="sheet-body">${p.children}</div>
      <div class="sheet-foot">${p.error ? html`<span class="err" role="alert">${p.error}</span>` : null}<div class="r">${p.foot}</div></div>
    </div>
  </div>`;
}

function Field(p) {
  return html`<label class=${'f' + (p.span ? ' ' + p.span : '')}><span>${p.label}</span>${p.children}</label>`;
}

function RowList(p) {
  var rows = p.rows;
  var set = function (i, k, v) { p.onChange(rows.map(function (r, j) { if (j !== i) return r; var n = Object.assign({}, r); n[k] = v; return n; })); };
  var remove = function (i) { p.onChange(rows.filter(function (_, j) { return j !== i; })); };
  var add = function () { p.onChange(rows.concat([Object.assign({}, p.blank)])); setTimeout(function () { var el = document.querySelectorAll('[data-rl="' + p.name + '"]'); if (el.length) { var last = el[el.length - 1].querySelector('input'); if (last) last.focus(); } }, 0); };
  return html`<div class="f" role="group" aria-label=${p.label}>
    <span class="flabel">${p.label}</span>
    <div class="rows">
      ${rows.map(function (r, i) {
        return html`<div class="frow" key=${i} data-rl=${p.name}>
          ${p.cols.map(function (c) {
            return html`<input key=${c.key} class=${'inp' + (c.cls ? ' ' + c.cls : '')} type=${c.type || 'text'} placeholder=${c.ph} aria-label=${c.ph + ' ' + (i + 1)} value=${r[c.key] || ''} onInput=${function (e) { set(i, c.key, e.target.value); }} />`;
          })}
          <button type="button" class="mini" aria-label=${'Remove row ' + (i + 1)} onClick=${function () { remove(i); }}>${I.close}</button>
        </div>`;
      })}
      <button type="button" class="addrow" onClick=${add}>+ Add row</button>
    </div>
  </div>`;
}

function TagInput(p) {
  var st = useState(''), text = st[0], setText = st[1];
  var commit = function () { var t = text.trim().replace(/,$/, ''); if (t && p.value.indexOf(t) < 0) p.onChange(p.value.concat([t])); setText(''); };
  return html`<div class="f"><span class="flabel" id="mood-l">${p.label}</span>
    <div class="tagbox">
      ${p.value.map(function (m, i) { return html`<span class="tchip" key=${m}>${m}<button type="button" aria-label=${'Remove ' + m} onClick=${function () { p.onChange(p.value.filter(function (_, j) { return j !== i; })); }}>${I.close}</button></span>`; })}
      <input aria-labelledby="mood-l" placeholder=${p.value.length ? 'Add another' : 'Type a word, press Enter'} value=${text}
        onInput=${function (e) { var v = e.target.value; if (v.slice(-1) === ',') { setText(v); setTimeout(commit, 0); } else setText(v); }}
        onKeyDown=${function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !text && p.value.length) p.onChange(p.value.slice(0, -1)); }}
        onBlur=${commit} />
    </div></div>`;
}

function PaletteInput(p) {
  var set = function (i, v) { p.onChange(p.value.map(function (x, j) { return j === i ? v : x; })); };
  return html`<div class="f" role="group" aria-label="Palette"><span class="flabel">Palette</span>
    <div class="rows">
      ${p.value.map(function (c, i) {
        var valid = /^#[0-9a-fA-F]{6}$/.test(c);
        return html`<div class="frow" key=${i}>
          <input type="color" class="colorin" aria-label=${'Colour ' + (i + 1) + ' picker'} value=${valid ? c : '#cccccc'} onInput=${function (e) { set(i, e.target.value.toUpperCase()); }} />
          <input class="inp" aria-label=${'Colour ' + (i + 1) + ' hex'} value=${c} onInput=${function (e) { set(i, e.target.value); }} />
          <button type="button" class="mini" aria-label=${'Remove colour ' + (i + 1)} onClick=${function () { p.onChange(p.value.filter(function (_, j) { return j !== i; })); }}>${I.close}</button>
        </div>`;
      })}
      <button type="button" class="addrow" onClick=${function () { p.onChange(p.value.concat(['#A8202F'])); }}>+ Add colour</button>
    </div></div>`;
}

function Seg(p) {
  return html`<div class="seg fill" role="group" aria-label=${p.label}>${p.options.map(function (o) {
    return html`<button type="button" key=${o} aria-pressed=${String(p.value === o)} onClick=${function () { p.onChange(o); }}>${o}</button>`;
  })}</div>`;
}

function ShootSheet(p) {
  var e = p.edit, d = e.draft, c = p.c;
  var up = function (k) { return function (v) { c.setDraft(function (dr) { var n = Object.assign({}, dr); n[k] = v && v.target ? v.target.value : v; return n; }); }; };
  var heading = e.isNew ? (e.shotsFrom ? 'Duplicate shoot' : 'New shoot') : 'Edit shoot';
  return html`<${Sheet} title=${heading} onClose=${c.closeEdit} error=${e.error}
    foot=${html`<button type="button" class="btn outline" onClick=${c.closeEdit}>Cancel</button><button type="button" class="btn primary" onClick=${c.saveShoot}>Save shoot</button>`}>
    <form onSubmit=${function (ev) { ev.preventDefault(); c.saveShoot(); }}>
    <div class="fsec"><h3>Basics</h3><div class="fgrid">
      <${Field} label="Title"><input class="inp" required value=${d.title} onInput=${up('title')} placeholder="e.g. Brand: Product launch reel" /><//>
      <${Field} label="Client" span="s3"><input class="inp" list="clients-dl" value=${d.client} onInput=${up('client')} /><datalist id="clients-dl">${c.clients.map(function (x) { return html`<option key=${x} value=${x} />`; })}</datalist><//>
      <${Field} label="Type" span="s3"><select class="inp" value=${d.type} onChange=${up('type')}>${TYPES.map(function (t) { return html`<option key=${t}>${t}</option>`; })}</select><//>
      <${Field} label="Status" span="s3"><select class="inp" value=${d.status} onChange=${up('status')}>${STATUSES.map(function (t) { return html`<option key=${t}>${t}</option>`; })}</select><//>
      <${Field} label="Date" span="s3"><input class="inp" type="date" required value=${d.date} onInput=${up('date')} /><//>
      <${Field} label="Call time" span="s3"><input class="inp" type="time" value=${d.callTime} onInput=${up('callTime')} /><//>
      <${Field} label="Wrap time" span="s3"><input class="inp" type="time" value=${d.wrapTime} onInput=${up('wrapTime')} /><//>
      <div class="f"><span class="flabel">Aspect ratio</span><${Seg} label="Aspect ratio" options=${RATIOS} value=${d.aspectRatio} onChange=${up('aspectRatio')} /></div>
      <${Field} label="Location" span="s3"><input class="inp" value=${d.location} onInput=${up('location')} /><//>
      <${Field} label="Platform" span="s3"><input class="inp" value=${d.platform} onInput=${up('platform')} /><//>
    </div></div>
    <div class="fsec"><h3>Concept and look</h3><div class="fgrid">
      <${Field} label="Concept"><textarea class="inp" value=${d.concept} onInput=${up('concept')} placeholder="What happens in the video, in two or three sentences."></textarea><//>
      <${Field} label="Goal of the content"><input class="inp" value=${d.goal} onInput=${up('goal')} /><//>
      <${TagInput} label="Mood words" value=${d.mood} onChange=${up('mood')} />
      <${PaletteInput} value=${d.palette} onChange=${up('palette')} />
      <${Field} label="Lighting notes"><textarea class="inp" value=${d.lighting} onInput=${up('lighting')}></textarea><//>
      <${RowList} name="refs" label="References" rows=${d.references} onChange=${up('references')} blank=${{ label: '', url: '' }} cols=${[{ key: 'label', ph: 'Label' }, { key: 'url', ph: 'https://link', type: 'url' }]} />
    </div></div>
    <div class="fsec"><h3>People and kit</h3><div class="fgrid">
      <${RowList} name="crew" label="Talent and crew" rows=${d.crew} onChange=${up('crew')} blank=${{ name: '', role: '', phone: '' }} cols=${[{ key: 'name', ph: 'Name' }, { key: 'role', ph: 'Role' }, { key: 'phone', ph: 'Phone', type: 'tel' }]} />
      <${RowList} name="ward" label="Wardrobe and props" rows=${d.wardrobe} onChange=${up('wardrobe')} blank=${{ item: '', done: false }} cols=${[{ key: 'item', ph: 'Item' }]} />
      <${RowList} name="gear" label="Gear list" rows=${d.gear} onChange=${up('gear')} blank=${{ item: '', done: false }} cols=${[{ key: 'item', ph: 'Item' }]} />
      <${RowList} name="ros" label="Run of show" rows=${d.runOfShow} onChange=${up('runOfShow')} blank=${{ time: '', activity: '' }} cols=${[{ key: 'time', ph: 'Time', type: 'time', cls: 't' }, { key: 'activity', ph: 'Activity' }]} />
    </div></div>
    <div class="fsec"><h3>Notes</h3><div class="fgrid">
      <${Field} label="Notes"><textarea class="inp" value=${d.notes} onInput=${up('notes')}></textarea><//>
    </div></div>
    <button type="submit" hidden></button>
    </form>
  <//>`;
}

function ShotSheet(p) {
  var e = p.edit, d = e.draft, c = p.c;
  var up = function (k) { return function (v) { c.setDraft(function (dr) { var n = Object.assign({}, dr); n[k] = v && v.target ? v.target.value : v; return n; }); }; };
  return html`<${Sheet} narrow title=${e.isNew ? 'Add shot' : 'Edit shot'} onClose=${c.closeEdit} error=${e.error}
    foot=${html`<button type="button" class="btn outline" onClick=${c.closeEdit}>Cancel</button><button type="button" class="btn primary" onClick=${c.saveShot}>Save shot</button>`}>
    <form onSubmit=${function (ev) { ev.preventDefault(); c.saveShot(); }}><div class="fsec"><div class="fgrid">
      <${Field} label="Scene / Location"><input class="inp" value=${d.scene} onInput=${up('scene')} /><//>
      <${Field} label="Description"><textarea class="inp" required value=${d.description} onInput=${up('description')}></textarea><//>
      <${Field} label="Shot type" span="s3"><select class="inp" value=${d.shotType} onChange=${up('shotType')}>${SHOT_TYPES.map(function (t) { return html`<option key=${t}>${t}</option>`; })}</select><//>
      <${Field} label="Movement" span="s3"><select class="inp" value=${d.movement} onChange=${up('movement')}>${MOVES.map(function (t) { return html`<option key=${t}>${t}</option>`; })}</select><//>
      <${Field} label="Lens / Framing" span="s3"><input class="inp" value=${d.lens} onInput=${up('lens')} /><//>
      <${Field} label="Duration (seconds)" span="s3"><input class="inp" type="number" min="0" inputmode="numeric" value=${d.duration} onInput=${up('duration')} /><//>
      <div class="f s3"><span class="flabel">Audio</span><${Seg} label="Audio" options=${['Yes', 'No']} value=${d.audio} onChange=${up('audio')} /></div>
      <div class="f s3"><span class="flabel">Priority</span><${Seg} label="Priority" options=${['Must-have', 'Nice-to-have']} value=${d.priority} onChange=${up('priority')} /></div>
    </div></div><button type="submit" hidden></button></form>
  <//>`;
}

/* ---------- calendar ---------- */
function Toolbar(p) {
  var c = p.c;
  var st = useState(false), open = st[0], setOpen = st[1];
  var wrap = useRef(null), file = useRef(null);
  useEffect(function () {
    if (!open) return;
    var onDoc = function (e) { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    var onKey = function (e) { if (e.key === 'Escape') { setOpen(false); var b = wrap.current && wrap.current.querySelector('button'); if (b) b.focus(); } };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  var act = function (fn) { return function () { setOpen(false); fn(); }; };
  var themeLabel = { auto: 'Auto', light: 'Light', dark: 'Dark' }[c.theme];
  return html`<div class="toolbar no-print">
    <span class=${'saved' + (c.flash ? ' flash' : '') + (c.canSave ? '' : ' off')} role="status" aria-live="polite" title=${c.canSave ? 'Saved on this device' : 'This browser is not saving. Export JSON to keep changes.'}><i></i>${c.canSave ? 'Saved' : 'Not saving'}</span>
    <button type="button" class="icon-btn" onClick=${c.cycleTheme} aria-label=${'Theme: ' + themeLabel + '. Change theme'} title=${'Theme: ' + themeLabel}>${I.theme}</button>
    <div class="menu-wrap" ref=${wrap}>
      <button type="button" class="btn outline sm" aria-haspopup="true" aria-expanded=${String(open)} onClick=${function () { setOpen(!open); }}>${I.data}Data</button>
      ${open ? html`<div class="menu" role="menu">
        <button type="button" role="menuitem" onClick=${act(c.exportJSON)}>Export all shoots (JSON)</button>
        <button type="button" role="menuitem" onClick=${function () { file.current && file.current.click(); }}>Import shoots (JSON)…</button>
        <small>${c.shoots.length} shoots saved in this browser</small>
      </div>` : null}
      <input type="file" accept="application/json,.json" hidden ref=${file} onChange=${function (e) { setOpen(false); c.importFile(e); }} />
    </div>
    <button type="button" class="btn outline sm" onClick=${function () { go('dayof'); }}>${I.bolt}Day-of mode</button>
    <button type="button" class="btn primary sm" onClick=${function () { c.openNew(c.today); }}>${I.plus}New shoot</button>
  </div>`;
}

function NextUp(p) {
  var c = p.c, n = c.next;
  if (!n) return html`<div class="card nextup reveal"><div><span class="cd">Nothing booked</span><h3>No upcoming shoots.</h3><p class="muted" style=${{ marginTop: '12px' }}>Click any day on the calendar to add one.</p></div></div>`;
  return html`<article class="card nextup lift reveal" aria-label="Next shoot">
    <div>
      <span class="cd">Next up · ${countdown(c.today, n.date)}</span>
      <h3>${n.title}</h3>
      <div class="pills"><${TypePill} type=${n.type} /><${StatusPill} status=${n.status} /><${ExPill} show=${n.example} /></div>
      <div style=${{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" class="btn primary" onClick=${function () { go('shoot/' + n.id); }}>Open guide</button>
        ${n.date === c.today ? html`<button type="button" class="btn outline" onClick=${function () { go('dayof'); }}>Day-of mode</button>` : null}
      </div>
    </div>
    <div class="kv">
      <div><span>Date</span><b>${fmt(n.date, { weekday: 'short', day: 'numeric', month: 'short' })}</b></div>
      <div><span>Call time</span><b>${n.callTime || '—'}</b></div>
      <div><span>Client</span><b>${n.client || '—'}</b></div>
      <div><span>Location</span><b>${n.location || '—'}</b></div>
    </div>
  </article>`;
}

function Calendar(p) {
  var c = p.c, today = c.today;
  var fd = useState(today), focusDay = fd[0], setFocusDay = fd[1];
  var ws = useState(monday(today)), strip = ws[0], setStrip = ws[1];
  var kbd = useRef(false);
  var ym = c.month.split('-').map(Number);
  var first = c.month + '-01';
  var dow = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7;
  var dim = new Date(Date.UTC(ym[0], ym[1], 0)).getUTCDate();
  var total = Math.ceil((dow + dim) / 7) * 7;
  var start = addDays(first, -dow);
  var days = []; for (var i = 0; i < total; i++) days.push(addDays(start, i));
  var byDate = {}; c.filtered.forEach(function (x) { (byDate[x.date] = byDate[x.date] || []).push(x); });
  var tabIso = days.indexOf(focusDay) >= 0 ? focusDay : (days.indexOf(today) >= 0 ? today : first);

  useEffect(function () {
    if (!kbd.current) return; kbd.current = false;
    var b = document.querySelector('[data-iso="' + focusDay + '"]'); if (b) b.focus();
  }, [focusDay, c.month]);

  var onKey = function (ev) {
    if (!ev.target.hasAttribute || !ev.target.hasAttribute('data-iso')) return;
    var cur = ev.target.getAttribute('data-iso');
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[ev.key];
    var n = null;
    if (step) n = addDays(cur, step);
    else if (ev.key === 'Home') n = monday(cur);
    else if (ev.key === 'End') n = addDays(monday(cur), 6);
    else if (ev.key === 'PageUp' || ev.key === 'PageDown') { var d = new Date(cur + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + (ev.key === 'PageUp' ? -1 : 1)); n = d.toISOString().slice(0, 10); }
    if (!n) return;
    ev.preventDefault(); kbd.current = true; setFocusDay(n);
    if (days.indexOf(n) < 0 || ev.key === 'PageUp' || ev.key === 'PageDown') c.setMonth(n.slice(0, 7));
  };
  var shiftMonth = function (k) { var d = new Date(Date.UTC(ym[0], ym[1] - 1 + k, 1)); c.setMonth(d.toISOString().slice(0, 7)); };

  var monthLabel = fmt(first, { month: 'long', year: 'numeric' });
  var showMonth = c.view === 'month' && !c.isMobile;

  var filters = html`<div class="filters">
    ${c.clients.length ? html`<div class="grp" role="group" aria-label="Filter by client"><span class="lbl">Client</span>
      ${['All'].concat(c.clients).map(function (x) { return html`<button type="button" key=${x} class="fchip" aria-pressed=${String(c.fClient === x)} onClick=${function () { c.setFClient(x); }}>${x}</button>`; })}</div>` : null}
    <div class="grp" role="group" aria-label="Filter by type"><span class="lbl">Type</span>
      ${['All'].concat(TYPES).map(function (x) { return html`<button type="button" key=${x} class="fchip" aria-pressed=${String(c.fType === x)} onClick=${function () { c.setFType(x); }}>${x}</button>`; })}</div>
    <div class="legend" aria-label="Status legend">${STATUSES.map(function (s) { return html`<span key=${s}><${Glyph} status=${s} />${s}</span>`; })}</div>
  </div>`;

  var month = html`<div>
    <div class="grid" aria-hidden="true" style=${{ marginBottom: '2px' }}>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return html`<div class="dow" key=${d}>${d}</div>`; })}</div>
    <div class="grid" role="grid" aria-label=${monthLabel} onKeyDown=${onKey}>
      ${days.map(function (iso) {
        var inMonth = iso.slice(0, 7) === c.month;
        var label = fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
        var list = byDate[iso] || [];
        return html`<div key=${iso} role="gridcell" class=${'cell' + (inMonth ? '' : ' out') + (iso < today ? ' past' : '') + (iso === today ? ' today' : '')}>
          <button type="button" class="add" data-iso=${iso} tabIndex=${iso === tabIso ? 0 : -1}
            aria-label=${label + (iso === today ? ', today' : '') + (list.length ? ', ' + list.length + (list.length > 1 ? ' shoots' : ' shoot') : '') + '. Add shoot'}
            aria-current=${iso === today ? 'date' : undefined}
            onFocus=${function () { if (focusDay !== iso) setFocusDay(iso); }}
            onClick=${function () { c.openNew(iso); }}><span class="plus">${I.plus}</span></button>
          <span class="dnum">${Number(iso.slice(8))}</span>
          ${list.map(function (x) {
            return html`<button type="button" key=${x.id} class=${'cchip t-' + x.type} onClick=${function () { go('shoot/' + x.id); }}
              aria-label=${x.title + ', ' + x.type + ', ' + x.status + (x.callTime ? ', call ' + x.callTime : '') + '. Open guide'}>
              <${Glyph} status=${x.status} />${x.callTime ? html`<span class="tm">${x.callTime}</span>` : null}<span class="tt">${x.title}</span></button>`;
          })}
        </div>`;
      })}
    </div>
  </div>`;

  // list view, grouped by month
  var groups = [];
  c.filtered.forEach(function (x) {
    var k = x.date.slice(0, 7), g = groups[groups.length - 1];
    if (!g || g.k !== k) groups.push(g = { k: k, rows: [] });
    g.rows.push(x);
  });
  var list = groups.length ? html`<div>${groups.map(function (g) {
    return html`<div class="mgroup" key=${g.k}><h4>${fmt(g.k + '-01', { month: 'long', year: 'numeric' })}</h4>
      ${g.rows.map(function (x) {
        return html`<button type="button" key=${x.id} id=${'row-' + x.id} class=${'lrow' + (x.date < today ? ' past' : '')} onClick=${function () { go('shoot/' + x.id); }}>
          <span class=${'ldate' + (x.date === today ? ' today' : '')}><span>${fmt(x.date, { weekday: 'short' })}</span><b>${Number(x.date.slice(8))}</b></span>
          <span class="ltitle"><b>${x.title}</b><span>${[x.client, x.callTime ? 'Call ' + x.callTime : '', x.example ? 'Example' : ''].filter(Boolean).join(' · ')}</span></span>
          <span class="lpills"><${TypePill} type=${x.type} /><${StatusPill} status=${x.status} /></span>
        </button>`;
      })}</div>`;
  })}</div>` : !c.shoots.length ? html`<div class="empty">No shoots yet.<br /><button type="button" class="btn primary sm" onClick=${function () { c.openNew(today); }}>${I.plus}New shoot</button></div>` : html`<div class="empty">No shoots match these filters.<br /><button type="button" class="btn outline sm" onClick=${function () { c.setFClient('All'); c.setFType('All'); }}>Clear filters</button></div>`;

  var stripDays = []; for (var j = 0; j < 7; j++) stripDays.push(addDays(strip, j));
  var weekstrip = html`<div>
    <div class="cal-month" style=${{ marginBottom: '12px', justifyContent: 'space-between' }}>
      <button type="button" class="icon-btn" aria-label="Previous week" onClick=${function () { setStrip(addDays(strip, -7)); }}>${I.left}</button>
      <b>${fmt(strip, { day: 'numeric', month: 'short' })} – ${fmt(addDays(strip, 6), { day: 'numeric', month: 'short' })}</b>
      <button type="button" class="icon-btn" aria-label="Next week" onClick=${function () { setStrip(addDays(strip, 7)); }}>${I.right}</button>
    </div>
    <div class="weekstrip">${stripDays.map(function (iso) {
      var l = (byDate[iso] || []);
      return html`<button type="button" key=${iso} class=${'wday' + (iso === today ? ' today' : '')}
        aria-label=${fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }) + (l.length ? ', ' + l.length + ' shoot' + (l.length > 1 ? 's' : '') : ', add shoot')}
        onClick=${function () { if (l.length === 1) go('shoot/' + l[0].id); else if (l.length) { var r = document.getElementById('row-' + l[0].id); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else c.openNew(iso); }}>
        ${fmt(iso, { weekday: 'narrow' })}<b>${Number(iso.slice(8))}</b><span class="dots">${l.slice(0, 3).map(function (x) { return html`<i key=${x.id}></i>`; })}</span></button>`;
    })}</div>
  </div>`;

  return html`<div>
    <div class="cal-top reveal">
      <div><div class="eyebrow">Calendar</div><h2>Every shoot, one place.</h2><p>Plan the day, then open the guide on set.</p></div>
      <${Toolbar} c=${c} />
    </div>
    <${NextUp} c=${c} />
    <div class="card cal-card reveal">
      <div class="cal-bar">
        ${showMonth ? html`<div class="cal-month">
          <button type="button" class="icon-btn" aria-label="Previous month" onClick=${function () { shiftMonth(-1); }}>${I.left}</button>
          <button type="button" class="icon-btn" aria-label="Next month" onClick=${function () { shiftMonth(1); }}>${I.right}</button>
          <h3 aria-live="polite">${monthLabel}</h3>
          <button type="button" class="btn outline sm" onClick=${function () { c.setMonth(today.slice(0, 7)); setFocusDay(today); }}>Today</button>
        </div>` : html`<h3 style=${{ fontSize: '26px', letterSpacing: '-.035em' }}>${c.isMobile ? 'This week' : 'All shoots'}</h3>`}
        ${c.isMobile ? null : html`<div class="seg" role="group" aria-label="Calendar view">
          <button type="button" aria-pressed=${String(c.view === 'month')} onClick=${function () { c.setView('month'); }}>Month</button>
          <button type="button" aria-pressed=${String(c.view === 'list')} onClick=${function () { c.setView('list'); }}>List</button>
        </div>`}
      </div>
      ${filters}
      ${c.isMobile ? weekstrip : null}
      ${showMonth ? month : list}
    </div>
  </div>`;
}

/* ---------- shoot guide ---------- */
function Check(p) {
  return html`<label class=${'ck' + (p.cls ? ' ' + p.cls : '')}><input type="checkbox" checked=${p.checked} onChange=${p.onChange} aria-label=${p.aria} /><span class="box">${I.check}</span><span class="lab">${p.children}</span></label>`;
}

function Checklist(p) {
  var done = p.list.filter(function (x) { return x.done; }).length, n = p.list.length;
  return html`<section class="card g-sec reveal" aria-labelledby=${p.id}>
    <h2 id=${p.id}>${p.title}<small>${done}/${n} ${p.word}</small></h2>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax=${n} aria-valuenow=${done} aria-label=${p.title + ' progress'}><i style=${{ width: (n ? done / n * 100 : 0) + '%' }}></i></div>
    ${n ? html`<ul class="checks">${p.list.map(function (w, i) {
      return html`<li key=${i}><${Check} checked=${w.done} onChange=${function () { p.toggle(i); }}>${w.item}<//></li>`;
    })}</ul>` : html`<p class="muted" style=${{ marginTop: '16px' }}>Nothing listed yet. Add items in Edit.</p>`}
  </section>`;
}

function RunOfShow(p) {
  var ros = p.ros.slice().sort(byTime);
  if (!ros.length) return html`<p class="muted">No run of show yet. Add one in Edit.</p>`;
  return html`<div class="runsheet" style=${{ padding: 0 }}>${ros.map(function (r, i) {
    var nxt = ros[i + 1], d = nxt ? dur(r.time, nxt.time) : (/wrap/i.test(r.activity) ? 'Wrap' : dur(r.time, p.wrap));
    return html`<div class="rs-row" key=${i} style=${{ gridTemplateColumns: '110px 1fr' }}>
      <div class="rs-time"><b>${r.time || '—'}</b><span>${d}</span></div>
      <div class="rs-what"><h3>${r.activity}</h3></div>
    </div>`;
  })}</div>`;
}

function ShotList(p) {
  var c = p.c, s = p.shoot, all = s.shots;
  var doneN = all.filter(function (x) { return x.done; }).length;
  var mustLeft = all.filter(function (x) { return x.priority === 'Must-have' && !x.done; }).length;
  var runtime = all.reduce(function (a, x) { return a + (Number(x.duration) || 0); }, 0);
  var rows = all.map(function (x, i) { return { x: x, i: i }; }).filter(function (r) {
    if (c.priF !== 'All' && r.x.priority !== c.priF) return false;
    if (c.doneF === 'Done' && !r.x.done) return false;
    if (c.doneF === 'Remaining' && r.x.done) return false;
    return true;
  });
  var tag = function (x) { return html`<span class=${'tag ' + (x.priority === 'Must-have' ? 'must' : 'extra')}>${x.priority === 'Must-have' ? 'Must' : 'Extra'}</span>`; };
  var acts = function (r) {
    return html`<span class="rowact">
      <button type="button" class="mini" aria-label=${'Move shot ' + (r.i + 1) + ' up'} disabled=${r.i === 0} onClick=${function () { c.moveShot(s.id, r.i, -1); }}>${I.up}</button>
      <button type="button" class="mini" aria-label=${'Move shot ' + (r.i + 1) + ' down'} disabled=${r.i === all.length - 1} onClick=${function () { c.moveShot(s.id, r.i, 1); }}>${I.down}</button>
      <button type="button" class="mini" aria-label=${'Edit shot ' + (r.i + 1)} onClick=${function () { c.editShot(r.x); }}>${I.edit}</button>
      <button type="button" class="mini" aria-label=${'Delete shot ' + (r.i + 1)} onClick=${function () { c.deleteShot(s.id, r.x.id, r.i); }}>${I.trash}</button>
    </span>`;
  };
  return html`<section class="card g-sec reveal" aria-labelledby="g-shots">
    <h2 id="g-shots">Shot list</h2>
    <p class="sl-sum"><b>${doneN} of ${all.length} shots captured</b> · ${mustLeft} must-have${mustLeft === 1 ? '' : 's'} left · ${mmss(runtime)} planned</p>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax=${all.length} aria-valuenow=${doneN} aria-label="Shots captured"><i style=${{ width: (all.length ? doneN / all.length * 100 : 0) + '%' }}></i></div>
    <div class="sl-tools">
      <div class="l">
        <div class="seg" role="group" aria-label="Filter by priority">${['All', 'Must-have', 'Nice-to-have'].map(function (v) { return html`<button type="button" key=${v} aria-pressed=${String(c.priF === v)} onClick=${function () { c.setPriF(v); }}>${v}</button>`; })}</div>
        <div class="seg" role="group" aria-label="Filter by progress">${['All', 'Remaining', 'Done'].map(function (v) { return html`<button type="button" key=${v} aria-pressed=${String(c.doneF === v)} onClick=${function () { c.setDoneF(v); }}>${v}</button>`; })}</div>
      </div>
      <div class="r">
        <button type="button" class="btn outline sm" onClick=${function () { c.copyShots(s); }}>${I.copy}Copy shot list</button>
        <button type="button" class="btn primary sm" onClick=${c.newShot}>${I.plus}Add shot</button>
      </div>
    </div>
    ${rows.length ? null : html`<div class="empty">${all.length ? 'No shots match these filters.' : 'No shots yet. Add the first one.'}</div>`}
    ${rows.length ? html`<div class="tbl-wrap"><table class="shots">
      <thead><tr><th>#</th><th>Scene / Location</th><th>Description</th><th>Shot type</th><th>Movement</th><th>Lens / Framing</th><th>Duration</th><th>Audio</th><th>Priority</th><th>Done</th><th class="no-print"><span class="sr">Actions</span></th></tr></thead>
      <tbody>${rows.map(function (r) {
        var x = r.x;
        return html`<tr key=${x.id} class=${x.done ? 'done' : ''}>
          <td class="n">${pad2(r.i + 1)}</td><td>${x.scene || '—'}</td><td class="desc">${x.description}</td><td>${x.shotType}</td><td>${x.movement}</td><td>${x.lens || '—'}</td>
          <td>${x.duration}s</td><td>${x.audio ? 'Yes' : 'No'}</td><td>${tag(x)}</td>
          <td class="c"><${Check} checked=${x.done} onChange=${function () { c.toggleShot(s.id, x.id); }} aria=${'Shot ' + (r.i + 1) + ' captured'} /></td>
          <td class="no-print">${acts(r)}</td>
        </tr>`;
      })}</tbody>
    </table></div>
    <div class="shot-cards">${rows.map(function (r) {
      var x = r.x;
      return html`<div class="shot-card" key=${x.id}>
        <div class="hd"><${Check} checked=${x.done} onChange=${function () { c.toggleShot(s.id, x.id); }} aria=${'Shot ' + (r.i + 1) + ' captured'}><span><b class="em">${pad2(r.i + 1)}</b> ${x.description}</span><//></div>
        <div class="meta">${tag(x)}<span>${x.scene || 'No scene'}</span><span>${x.shotType}</span><span>${x.movement}</span>${x.lens ? html`<span>${x.lens}</span>` : null}<span>${x.duration}s</span><span>${x.audio ? 'Audio' : 'No audio'}</span></div>
        <div class="acts">${acts(r)}</div>
      </div>`;
    })}</div>` : null}
  </section>`;
}

function Guide(p) {
  var c = p.c, s = p.shoot, today = c.today;
  if (!s) return html`<div class="wrap" style=${{ padding: '80px 24px' }}><button type="button" class="back" onClick=${function () { go('calendar'); }}>${I.left}Calendar</button><h1>Shoot not found.</h1><p class="muted" style=${{ marginTop: '12px' }}>It may have been deleted.</p></div>`;
  var dt = function (t) { return s.date.replace(/-/g, '') + 'T' + (t || '09:00').replace(':', '') + '00'; };
  var gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(s.title) + '&dates=' + dt(s.callTime) + '/' + dt(s.wrapTime || s.callTime) + '&ctz=' + encodeURIComponent(TZ) + '&location=' + encodeURIComponent(s.location) + '&details=' + encodeURIComponent((s.concept || '') + (s.notes ? '\n\nNotes: ' + s.notes : ''));
  var maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.location || '');
  var si = STATUSES.indexOf(s.status);
  var toggleList = function (key) { return function (i) { c.patch(s.id, function (x) { var o = {}; o[key] = x[key].map(function (y, j) { return j === i ? Object.assign({}, y, { done: !y.done }) : y; }); return Object.assign({}, x, o); }); }; };
  return html`<article key=${s.id}>
    <header class="wrap g-head">
      <button type="button" class="back" onClick=${function () { go('calendar'); }}>${I.left}Calendar</button>
      <div class="eyebrow">${s.client || 'No client'}</div>
      <h1>${s.title}</h1>
      <div class="pills"><${TypePill} type=${s.type} /><${StatusPill} status=${s.status} /><${ExPill} show=${s.example} /></div>
      <div class="g-actions">
        <button type="button" class="btn primary sm" onClick=${function () { c.editShoot(s); }}>${I.edit}Edit</button>
        <button type="button" class="btn outline sm" onClick=${function () { c.duplicateShoot(s); }}>${I.dup}Duplicate</button>
        <a class="btn outline sm" href=${gcal} target="_blank" rel="noopener">${I.cal}Add to Google Calendar</a>
        <button type="button" class="btn outline sm" onClick=${c.print}>${I.print}Print</button>
        ${s.date === today ? html`<button type="button" class="btn outline sm" onClick=${function () { go('dayof'); }}>${I.bolt}Day-of mode</button>` : null}
        <button type="button" class="btn ghost sm danger" onClick=${function () { c.deleteShoot(s); }}>${I.trash}Delete</button>
      </div>
    </header>
    <section class="sec band stats-band" aria-label="Shoot at a glance" style=${{ padding: '56px 0' }}>
      <div class="wrap g-stats">
        <div class="stat"><b>${fmt(s.date, { day: 'numeric', month: 'short' })}</b><span>${fmt(s.date, { weekday: 'long' })}</span></div>
        <div class="stat"><b>${s.callTime || '—'}</b><span>Call${s.wrapTime ? ' · wrap ' + s.wrapTime : ''}</span></div>
        <div class="stat"><b>${s.shots.length}</b><span>Shots planned</span></div>
        <div class="stat"><b>${s.aspectRatio || '—'}</b><span>Format</span></div>
        <div class="stat"><b style=${{ color: 'var(--accent-text)' }}>${countdown(today, s.date)}</b><span>Countdown</span></div>
      </div>
    </section>
    <div class="wrap g-body">
      <section class="card g-sec reveal" aria-labelledby="g-ov">
        <h2 id="g-ov">Overview</h2>
        <div class="ov">
          <div><span>Client</span><b>${s.client || '—'}</b></div>
          <div><span>Date</span><b>${fmt(s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
          <div><span>Location</span><b>${s.location || 'No location yet'}</b>${s.location ? html`<div><a href=${maps} target="_blank" rel="noopener">Open in Maps ↗</a></div>` : null}</div>
        </div>
        <div class="stepper" role="group" aria-label="Status">${STATUSES.map(function (st, i) {
          return html`<button type="button" key=${st} class=${'step' + (i <= si ? ' on' : '') + (i === si ? ' cur' : '')} aria-pressed=${String(i === si)} onClick=${function () { c.patch(s.id, function (x) { return Object.assign({}, x, { status: st }); }); }}>
            <span class="b">${i < si ? I.check : null}</span>${st}</button>`;
        })}</div>
      </section>
      <div class="two">
        <section class="card g-sec reveal" aria-labelledby="g-concept"><h2 id="g-concept">Concept</h2><p class="concept">${s.concept || 'No concept yet.'}</p></section>
        <section class="card g-sec reveal" aria-label="Goal and format"><div class="facts">
          <div><span>Goal</span><b>${s.goal || '—'}</b></div>
          <div><span>Platform</span><b>${s.platform || '—'}</b></div>
          <div><span>Aspect ratio</span><b>${s.aspectRatio || '—'}</b></div>
          <div><span>Call / Wrap</span><b>${(s.callTime || '—') + ' – ' + (s.wrapTime || '—')}</b></div>
        </div></section>
      </div>
      <section class="card g-sec reveal" aria-labelledby="g-look">
        <h2 id="g-look">Look and feel</h2>
        <div class="two">
          <div style=${{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            <div><p class="sub">Mood</p>${s.mood.length ? html`<div class="mood">${s.mood.map(function (m) { return html`<span key=${m}>${m}</span>`; })}</div>` : html`<p class="muted">—</p>`}</div>
            <div><p class="sub">Palette</p>${s.palette.length ? html`<div class="swatches">${s.palette.map(function (h, i) { return html`<span class="sw" key=${i}><i style=${{ background: h }}></i>${h.toUpperCase()}</span>`; })}</div>` : html`<p class="muted">—</p>`}</div>
          </div>
          <div style=${{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            <div><p class="sub">Lighting</p><p>${s.lighting || 'No lighting notes yet.'}</p></div>
            <div><p class="sub">References</p>${s.references.length ? html`<ul class="refs">${s.references.map(function (r, i) {
              var u = safeUrl(r.url);
              return html`<li key=${i}>${u ? html`<a href=${u} target="_blank" rel="noopener">${r.label || hostOf(u)} ↗</a>` : html`<span style=${{ color: 'var(--ink)', fontSize: '15px' }}>${r.label}</span>`}<span>${u ? hostOf(u) : 'No link yet'}</span></li>`;
            })}</ul>` : html`<p class="muted">None yet.</p>`}</div>
          </div>
        </div>
      </section>
      <section class="card g-sec reveal" aria-labelledby="g-crew">
        <h2 id="g-crew">Talent and crew</h2>
        ${s.crew.length ? html`<div class="people">${s.crew.map(function (pp, i) {
          return html`<div class="person" key=${i}><span class="av" aria-hidden="true">${initials(pp.name)}</span><div><b>${pp.name || 'Unnamed'}</b><span>${pp.role}</span>${pp.phone ? html`<a href=${'tel:' + pp.phone.replace(/[^\d+]/g, '')}>${pp.phone}</a>` : null}</div></div>`;
        })}</div>` : html`<p class="muted">No one added yet.</p>`}
      </section>
      <div class="two">
        <${Checklist} id="g-ward" title="Wardrobe and props" word="ready" list=${s.wardrobe} toggle=${toggleList('wardrobe')} />
        <${Checklist} id="g-gear" title="Gear list" word="packed" list=${s.gear} toggle=${toggleList('gear')} />
      </div>
      <section class="card g-sec reveal" aria-labelledby="g-ros"><h2 id="g-ros">Run of show</h2><${RunOfShow} ros=${s.runOfShow} wrap=${s.wrapTime} /></section>
      <${ShotList} c=${c} shoot=${s} />
      <section class="card g-sec reveal" aria-labelledby="g-notes"><h2 id="g-notes">Notes</h2><p class="notes">${s.notes || 'No notes.'}</p></section>
    </div>
  </article>`;
}

/* ---------- day-of ---------- */
function DayOf(p) {
  var c = p.c, today = c.today;
  var upcoming = c.sorted.filter(function (x) { return x.date >= today; });
  var def = c.sorted.find(function (x) { return x.date === today; }) || upcoming[0] || c.sorted[c.sorted.length - 1];
  var st = useState(def ? def.id : null), pick = st[0], setPick = st[1];
  var s = c.shoots.find(function (x) { return x.id === pick; }) || def;
  var now = nowHM();
  if (!s) return html`<div class="dayof"><div class="wrap"><div class="top"><span>Day-of mode</span><button type="button" class="btn" onClick=${function () { go('calendar'); }}>Exit</button></div><h1>No shoots yet.</h1></div></div>`;
  var ros = s.runOfShow.slice().sort(byTime);
  var nowIdx = -1; if (s.date === today) ros.forEach(function (r, i) { if (r.time && r.time <= now) nowIdx = i; });
  var doneN = s.shots.filter(function (x) { return x.done; }).length;
  var options = c.sorted.filter(function (x) { return x.date >= today || x.id === s.id; });
  return html`<div class="dayof">
    <div class="wrap">
      <div class="top">
        <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dark-ink2)', fontSize: '15px' }}>Day-of mode ·
          <select class="inp" style=${{ minHeight: '36px', width: 'auto', padding: '4px 36px 4px 12px', fontSize: '15px' }} value=${s.id} onChange=${function (e) { setPick(e.target.value); }}>
            ${options.map(function (x) { return html`<option key=${x.id} value=${x.id}>${fmt(x.date, { day: 'numeric', month: 'short' })} · ${x.title}</option>`; })}
          </select></label>
        <button type="button" class="btn" onClick=${function () { go('calendar'); }}>Exit day-of</button>
      </div>
      <div class="eyebrow" style=${{ color: '#FF8591' }}>${s.date === today ? 'Today' : countdown(today, s.date)} · ${s.client}</div>
      <h1>${s.title}</h1>
      <div class="do-big">
        <div><span>Call</span><b>${s.callTime || '—'}</b></div>
        <div><span>Wrap</span><b>${s.wrapTime || '—'}</b></div>
        <div><span>Location</span><b class="sm">${s.location || '—'}</b>${s.location ? html`<a href=${'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.location)} target="_blank" rel="noopener">Open in Maps ↗</a>` : null}</div>
      </div>
      <div class="do-grid">
        <section class="do-panel" aria-labelledby="do-ros"><h2 id="do-ros">Run of show</h2>
          <div class="do-ros">${ros.map(function (r, i) { return html`<div key=${i} class=${i === nowIdx ? 'now' : ''}><b>${r.time}</b><span>${r.activity}${i === nowIdx ? ' · now' : ''}</span></div>`; })}</div>
        </section>
        <section class="do-panel" aria-labelledby="do-shots"><h2 id="do-shots">Shots · ${doneN}/${s.shots.length}</h2>
          <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax=${s.shots.length} aria-valuenow=${doneN} aria-label="Shots captured"><i style=${{ width: (s.shots.length ? doneN / s.shots.length * 100 : 0) + '%' }}></i></div>
          <ul class="checks">${s.shots.map(function (x, i) {
            return html`<li key=${x.id}><${Check} cls="do-shot" checked=${x.done} onChange=${function () { c.toggleShot(s.id, x.id); }}>${pad2(i + 1)} · ${x.description}<small>${[x.scene, x.shotType, x.movement, x.duration + 's', x.priority === 'Must-have' ? 'Must' : 'Extra'].filter(Boolean).join(' · ')}</small><//></li>`;
          })}</ul>
        </section>
      </div>
    </div>
  </div>`;
}

/* ---------- app ---------- */
function App() {
  var today = todayISO();
  var init = useMemo(loadInitial, []);
  var s1 = useState(init.shoots), shoots = s1[0], setShoots = s1[1];
  var s2 = useState(init.canSave), canSave = s2[0], setCanSave = s2[1];
  var s3 = useState(loadTheme), theme = s3[0], setTheme = s3[1];
  var s4 = useState(parseRoute), route = s4[0], setRoute = s4[1];
  var s5 = useState('month'), view = s5[0], setView = s5[1];
  var s6 = useState(today.slice(0, 7)), month = s6[0], setMonth = s6[1];
  var s7 = useState('All'), fClient = s7[0], setFClient = s7[1];
  var s8 = useState('All'), fType = s8[0], setFType = s8[1];
  var s9 = useState(null), edit = s9[0], setEdit = s9[1];
  var s10 = useState(null), toast = s10[0], setToast = s10[1];
  var s11 = useState(false), flash = s11[0], setFlash = s11[1];
  var s12 = useState(mq), isMobile = s12[0], setMobile = s12[1];
  var s13 = useState('All'), priF = s13[0], setPriF = s13[1];
  var s14 = useState('All'), doneF = s14[0], setDoneF = s14[1];
  var firstSave = useRef(true), toastT = useRef(null), flashT = useRef(null), prevRoute = useRef(route.name);

  useEffect(function () {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ v: 1, savedAt: new Date().toISOString(), shoots: shoots }));
      setCanSave(true);
      if (!firstSave.current) { setFlash(true); clearTimeout(flashT.current); flashT.current = setTimeout(function () { setFlash(false); }, 1200); }
    } catch (e) { setCanSave(false); }
    firstSave.current = false;
  }, [shoots]);

  useEffect(function () {
    var on = function () { setRoute(parseRoute()); };
    window.addEventListener('hashchange', on);
    var m = null; try { m = window.matchMedia('(max-width: 760px)'); } catch (e) {}
    var onM = function () { setMobile(mq()); };
    if (m) { if (m.addEventListener) m.addEventListener('change', onM); else m.addListener(onM); }
    return function () { window.removeEventListener('hashchange', on); if (m) { if (m.removeEventListener) m.removeEventListener('change', onM); else m.removeListener(onM); } };
  }, []);

  useEffect(function () {
    var page = route.name !== 'brief';
    document.body.setAttribute('data-view', page ? 'page' : 'brief');
    if (page) window.scrollTo(0, 0);
    else if (prevRoute.current !== 'brief') {
      var el = document.getElementById(route.anchor || 'calendar');
      if (el) requestAnimationFrame(function () { el.scrollIntoView({ block: 'start' }); });
    }
    prevRoute.current = route.name;
    var sel = route.name === 'shoot' ? shoots.find(function (x) { return x.id === route.id; }) : null;
    document.title = route.name === 'dayof' ? 'Day-of mode · ABiMPACT' : sel ? sel.title + ' · ABiMPACT' : 'ABiMPACT Shoot Calendar';
  }, [route.name, route.id, route.anchor]);

  useEffect(function () {
    var root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme);
    try { if (theme === 'auto') window.localStorage.removeItem(THEME_KEY); else window.localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }, [theme]);

  useEffect(function () { if (window.abReveal) window.abReveal(); });

  var notify = function (msg, undo) {
    clearTimeout(toastT.current);
    setToast({ msg: msg, undo: undo || null, k: Date.now() });
    toastT.current = setTimeout(function () { setToast(null); }, undo ? 6000 : 2500);
  };
  var patch = function (id, fn) { setShoots(function (list) { return list.map(function (x) { return x.id === id ? fn(x) : x; }); }); };
  var copy = function (text, msg) {
    var fallback = function () {
      try { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); notify(ok ? msg : 'Copy blocked here.'); }
      catch (e) { notify('Copy blocked here.'); }
    };
    try { navigator.clipboard.writeText(text).then(function () { notify(msg); }, fallback); } catch (e) { fallback(); }
  };
  var setDraft = function (fn) { setEdit(function (e) { return e ? Object.assign({}, e, { draft: fn(e.draft), error: '' }) : e; }); };
  var shootById = function (id) { return shoots.find(function (x) { return x.id === id; }); };

  var sorted = shoots.slice().sort(cmp);
  var clients = Array.from(new Set(shoots.map(function (x) { return x.client; }).filter(Boolean))).sort();
  var c = {
    today: today, shoots: shoots, sorted: sorted, clients: clients, theme: theme, canSave: canSave, flash: flash, isMobile: isMobile,
    view: view, setView: setView, month: month, setMonth: setMonth, fClient: clients.indexOf(fClient) >= 0 ? fClient : 'All', setFClient: setFClient, fType: fType, setFType: setFType,
    priF: priF, setPriF: setPriF, doneF: doneF, setDoneF: setDoneF, patch: patch, setDraft: setDraft,
    next: sorted.find(function (x) { return x.date >= today; }) || null,
    cycleTheme: function () { setTheme(theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'); },
    openNew: function (date) { setEdit({ kind: 'shoot', isNew: true, draft: newDraft(date), error: '' }); },
    editShoot: function (s) { setEdit({ kind: 'shoot', isNew: false, id: s.id, draft: toDraft(s), error: '' }); },
    duplicateShoot: function (s) {
      var d = toDraft(s); d.title = s.title + ' (copy)'; d.status = 'Planned'; if (d.date < today) d.date = today;
      d.wardrobe = d.wardrobe.map(function (w) { return { item: w.item, done: false }; }); d.gear = d.gear.map(function (w) { return { item: w.item, done: false }; });
      setEdit({ kind: 'shoot', isNew: true, draft: d, error: '', shotsFrom: s.shots });
    },
    closeEdit: function () { setEdit(null); },
    saveShoot: function () {
      var e = edit, d = cleanDraft(e.draft);
      if (!d.title) { setEdit(Object.assign({}, e, { error: 'Add a title.' })); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { setEdit(Object.assign({}, e, { error: 'Pick a date.' })); return; }
      if (e.isNew) {
        var shots = (e.shotsFrom || []).map(function (x) { return Object.assign({}, x, { id: uid('s'), done: false }); });
        var ns = norm(Object.assign({}, d, { id: uid('shoot'), example: false, shots: shots }));
        setShoots(function (l) { return l.concat([ns]); }); setEdit(null); setMonth(ns.date.slice(0, 7));
        notify(e.shotsFrom ? 'Shoot duplicated' : 'Shoot added'); go('shoot/' + ns.id);
      } else {
        patch(e.id, function (x) { return norm(Object.assign({}, x, d)); }); setEdit(null); notify('Shoot saved');
      }
    },
    deleteShoot: function (s) {
      var prev = shoots; setShoots(shoots.filter(function (x) { return x.id !== s.id; }));
      notify('“' + s.title + '” deleted', prev); go('calendar');
    },
    toggleShot: function (sid, id) { patch(sid, function (o) { return Object.assign({}, o, { shots: o.shots.map(function (y) { return y.id === id ? Object.assign({}, y, { done: !y.done }) : y; }) }); }); },
    moveShot: function (sid, i, k) { patch(sid, function (o) { var l = o.shots.slice(), j = i + k; if (j < 0 || j >= l.length) return o; var it = l.splice(i, 1)[0]; l.splice(j, 0, it); return Object.assign({}, o, { shots: l }); }); },
    deleteShot: function (sid, id, i) { var prev = shoots; patch(sid, function (o) { return Object.assign({}, o, { shots: o.shots.filter(function (y) { return y.id !== id; }) }); }); notify('Shot ' + pad2(i + 1) + ' deleted', prev); },
    newShot: function () { setEdit({ kind: 'shot', isNew: true, sid: route.id, error: '', draft: { scene: '', description: '', shotType: 'Medium', movement: 'Static', lens: '', duration: '5', audio: 'No', priority: 'Must-have' } }); },
    editShot: function (x) { setEdit({ kind: 'shot', isNew: false, sid: route.id, id: x.id, error: '', draft: { scene: x.scene, description: x.description, shotType: x.shotType, movement: x.movement, lens: x.lens, duration: String(x.duration), audio: x.audio ? 'Yes' : 'No', priority: x.priority } }); },
    saveShot: function () {
      var e = edit, d = e.draft;
      if (!d.description.trim()) { setEdit(Object.assign({}, e, { error: 'Add a description.' })); return; }
      var shot = { scene: d.scene.trim(), description: d.description.trim(), shotType: d.shotType, movement: d.movement, lens: d.lens.trim(), duration: Math.max(0, Math.round(Number(d.duration) || 0)), audio: d.audio === 'Yes', priority: d.priority };
      patch(e.sid, function (o) {
        var l = e.isNew ? o.shots.concat([Object.assign({ id: uid('s'), done: false }, shot)]) : o.shots.map(function (x) { return x.id === e.id ? Object.assign({}, x, shot) : x; });
        return Object.assign({}, o, { shots: l });
      });
      setEdit(null); notify(e.isNew ? 'Shot added' : 'Shot saved');
    },
    copyShots: function (s) {
      var dn = s.shots.filter(function (x) { return x.done; }).length;
      var out = ['SHOT LIST · ' + s.title, fmt(s.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + (s.callTime ? ' · Call ' + s.callTime : '') + (s.location ? ' · ' + s.location : ''), dn + ' of ' + s.shots.length + ' captured', ''];
      s.shots.forEach(function (x, i) {
        out.push(pad2(i + 1) + ' [' + (x.done ? 'x' : ' ') + '] ' + (x.scene ? x.scene + ': ' : '') + x.description);
        out.push('    ' + [x.shotType, x.movement, x.lens, x.duration + 's', x.audio ? 'audio' : 'no audio', x.priority === 'Must-have' ? 'MUST' : 'extra'].filter(Boolean).join(' · '));
      });
      copy(out.join('\n'), 'Shot list copied');
    },
    print: function () { try { window.print(); } catch (e) { notify('Printing is blocked here.'); } },
    exportJSON: function () {
      try {
        var blob = new Blob([JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), timezone: TZ, shoots: shoots }, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'abimpact-shoots-' + today + '.json';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000); notify('Export started');
      } catch (e) { notify('Download blocked here.'); }
    },
    importFile: function (ev) {
      var f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return;
      f.text().then(function (t) {
        var data; try { data = JSON.parse(t); } catch (e) { notify('That file is not valid JSON.'); return; }
        var arr = Array.isArray(data) ? data : (data && Array.isArray(data.shoots) ? data.shoots : (data && data.title ? [data] : null));
        if (!arr) { notify('No shoots found in that file.'); return; }
        var prev = shoots; setShoots(arr.map(norm)); notify('Imported ' + arr.length + ' shoot' + (arr.length === 1 ? '' : 's'), prev);
      });
    },
  };
  var cf = c.fClient;
  c.filtered = sorted.filter(function (x) { return (cf === 'All' || x.client === cf) && (fType === 'All' || x.type === fType); });

  var calRoot = document.getElementById('cal-root');
  var pageRoot = document.getElementById('page');
  var page = route.name === 'shoot' ? html`<${Guide} c=${c} shoot=${shootById(route.id)} />` : route.name === 'dayof' ? html`<${DayOf} c=${c} />` : null;

  return html`<${React.Fragment}>
    ${route.name === 'brief' ? ReactDOM.createPortal(html`<${Calendar} c=${c} />`, calRoot) : null}
    ${page ? ReactDOM.createPortal(page, pageRoot) : null}
    ${edit && edit.kind === 'shoot' ? html`<${ShootSheet} c=${c} edit=${edit} />` : null}
    ${edit && edit.kind === 'shot' ? html`<${ShotSheet} c=${c} edit=${edit} />` : null}
    ${toast ? html`<div class="toast no-print" role="status" aria-live="polite" key=${toast.k}><span>${toast.msg}</span>${toast.undo ? html`<button type="button" onClick=${function () { setShoots(toast.undo); setToast(null); }}>Undo</button>` : null}</div>` : null}
  <//>`;
}

document.getElementById('cal-root').innerHTML = '';
ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`);
})();

'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const norm = (s) =>
  String(s)
    .trim()
    .replace(/[\u064B-\u065F\u0670ـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^ال/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
const KEY = 'lamma-universe-v3';
let store = {
  players: ['أنا', 'صاحبي'],
  scores: Object.create(null),
  sound: false,
};
try {
  const s = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('lamma-v1') || 'null');
  if (
    s &&
    Array.isArray(s.players) &&
    s.players.length >= 1 &&
    s.players.length <= 12 &&
    s.players.every((n) => typeof n === 'string' && n.trim() && n.length <= 24) &&
    new Set(s.players).size === s.players.length
  ) {
    store.players = s.players;
    store.sound = s.sound === true;
    if (s.scores && typeof s.scores === 'object') {
      for (const [n, v] of Object.entries(s.scores)) {
        if (n.length > 24 || !n.trim()) continue;
        if (
          v &&
          Number.isFinite(v.points) &&
          v.points >= 0 &&
          Number.isInteger(v.rounds) &&
          v.rounds >= 0
        )
          store.scores[n] = { points: v.points, rounds: v.rounds };
      }
    }
  }
} catch (e) {}

function legacyAddScore(name, points) {
  const old = store.scores[name];
  store.scores[name] = {
    points: (old?.points || 0) + Math.max(0, Math.round(points)),
    rounds: (old?.rounds || 0) + 1,
  };
  save();
}
let audioCtx;
function tone(win = false) {
  if (!store.sound) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(win ? 660 : 430, audioCtx.currentTime);
    if (win) o.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
    g.gain.setValueAtTime(0.045, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.start();
    o.stop(audioCtx.currentTime + 0.26);
  } catch (e) {}
}
function toggleSound() {
  store.sound = !store.sound;
  save();
  soundUI();
  if (store.sound) tone();
}
function soundUI() {
  $('sound').textContent = store.sound ? '🔊' : '🔇';
  $('sound').setAttribute('aria-pressed', String(store.sound));
  $('sound').setAttribute('aria-label', store.sound ? 'إيقاف الصوت' : 'تشغيل الصوت');
}
let timers = [],
  screen = 'home',
  state = null,
  filter = 'all',
  previousFocus = null;
const later = (f, ms) => {
  const id = setTimeout(f, ms);
  timers.push(id);
  return id;
};
const repeat = (f, ms) => {
  const id = setInterval(f, ms);
  timers.push(id);
  return id;
};
function clearTimers() {
  timers.forEach((id) => {
    clearTimeout(id);
    clearInterval(id);
  });
  timers = [];
}
let toastTimer;
function toast(msg) {
  $('toast').textContent = latin(msg);
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('toast').hidden = true), 3800);
}
function setHTML(html) {
  $('app').innerHTML = latin(html);
}
function goTop() {
  window.scrollTo?.({ top: 0, behavior: 'instant' });
}
const games = [
  [
    'finder',
    '🎯',
    'أطلع رقمك',
    'فكّر بأي رقم… وبالأسئلة نوصله. حتى الأرقام السالبة والكبيرة.',
    'مع شخص',
    '#acebc7',
  ],
  [
    'solo',
    '🔢',
    'خمن رقمي',
    'أنا أختار رقم، وإنت تحاول توصله. أكبر، أصغر… أو صح!',
    'بروحك',
    '#b5ceff',
  ],
  [
    'mind',
    '🔮',
    'شنو في بالك؟',
    'حيوان، أكلة أو غرض؟ جاوب على الأسئلة ونحاول نعرفه.',
    'مع شخص',
    '#eab6e8',
  ],
  [
    'who',
    '🕵️',
    'منو أنا؟',
    'اكتشف الشي من تلميحات. كل ما عرفت أسرع زادت نقاطك.',
    'بروحك',
    '#ffc38e',
  ],
  [
    'mime',
    '🎭',
    'مثّلها',
    'بدون كلام! مثّل الكلمة وخَل أصحابك يخمنون قبل الوقت.',
    'جماعي',
    '#ffc38e',
  ],
  [
    'secret',
    '🤫',
    'كلمة السر',
    'شخص يعرف الكلمة والباقي يسألونه. ٢٠ سؤال قبل ينتهي الوقت.',
    'جماعي',
    '#eab6e8',
  ],
  [
    'memory',
    '🧩',
    'تحدي الذاكرة',
    'اقلب البطاقات وطابق الأزواج بأقل عدد من الحركات.',
    'بروحك',
    '#acebc7',
  ],
  [
    'reaction',
    '⚡',
    'أسرع واحد',
    'انتظر اللون الأخضر واضغط! بروحك أو تنافس مع أصحابك.',
    'بروحك وجماعي',
    '#b5ceff',
  ],
];

const player = () =>
  tourney?.active
    ? tourney.players[tourney.turn % tourney.players.length]
    : store.players[Number($('player')?.value || 0)] || store.players[0];

function boardHTML(names = store.players, results = null) {
  return `<div class="board">${names
    .map((n) => ({
      n,
      points: results ? results[n] || 0 : store.scores[n]?.points || 0,
      rounds: store.scores[n]?.rounds || 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map(
      (v, i) =>
        `<div class="boardrow"><span class="rank">${i === 0 ? '🥇' : i + 1}</span><div class="name"><b>${esc(v.n)}</b>${!results ? `<small>${v.rounds} جولة</small>` : ''}</div><span class="score">${v.points}</span></div>`,
    )
    .join('')}</div>`;
}

let oldScores = null;
function resetScores() {
  oldScores = JSON.parse(JSON.stringify(store.scores));
  store.scores = Object.create(null);
  save();
  openBoard();
  $('modal').insertAdjacentHTML(
    'beforeend',
    '<button class="quiet" style="width:100%;margin-top:10px" onclick="restoreScores()">تراجع عن التصفير</button>',
  );
}
function restoreScores() {
  if (oldScores) {
    store.scores = Object.assign(Object.create(null), oldScores);
    oldScores = null;
    save();
    openBoard();
  }
}
$('modalback').addEventListener('click', (e) => {
  if (e.target === $('modalback')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if ($('modalback').hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') {
    const a = [...$('modal').querySelectorAll('button,input,select')].filter((x) => !x.disabled);
    if (!a.length) return;
    const first = a[0],
      last = a[a.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
function integer(s) {
  let t = String(s)
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/−/g, '-')
    .replace(/٬/g, ',');
  if (t.includes(',')) {
    if (!/^[+-]?\d{1,3}(,\d{3})+$/.test(t)) throw Error('اكتب عدد صحيح. الفواصل تكون للآلاف فقط.');
    t = t.replace(/,/g, '');
  }
  if (!/^[+-]?\d+$/.test(t))
    throw Error('اكتب عدد صحيح بدون كسور. تقدر تستخدم الأرقام العربية أو الإنجليزية.');
  if (t.replace(/^[+-]?0*/, '').length > 60) throw Error('الحد ٦٠ خانة لكل رقم.');
  return BigInt(t);
}
function bounds() {
  const l = integer($('min').value),
    h = integer($('max').value);
  if (l > h) throw Error('أقل رقم لازم يكون أصغر من أو يساوي أعلى رقم.');
  return [l, h];
}
const limit = (l, h) => (h - l + 1n).toString(2).length;
function randomBigInt(n) {
  if (n <= 0n) throw Error('نطاق غير صالح');
  if (n === 1n) return 0n;
  const bits = (n - 1n).toString(2).length,
    bytes = Math.ceil(bits / 8),
    mask = (1n << BigInt(bits)) - 1n;
  let v;
  do {
    const a = new Uint8Array(bytes);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
    v = 0n;
    for (const b of a) v = (v << 8n) | BigInt(b);
    v &= mask;
  } while (v >= n);
  return v;
}
const randInt = (n) => Number(randomBigInt(BigInt(n)));
function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
function ranges(mode) {
  return `<div class="fields"><div class="field full"><label for="preset">حجم التحدي</label><select id="preset" onchange="presetRange()">${mode === 'finder' ? '<option value="million">١ إلى مليون · ٢٠ محاولة</option><option value="free">بدون نطاق ثابت · نبدأ من الصفر</option>' : '<option value="hundred">١ إلى ١٠٠ · ٧ محاولات</option><option value="million">١ إلى مليون · ٢٠ محاولة</option>'}<option value="trillion">١ إلى تريليون · ٤٠ محاولة</option><option value="negative">أرقام سالبة وموجبة</option><option value="custom">نطاق تختاره</option></select></div><div class="field" id="minfield"><label for="min">أقل رقم</label><input id="min" dir="ltr" type="text" inputmode="text" maxlength="90" value="1" oninput="updateRangeInfo()"></div><div class="field" id="maxfield"><label for="max">أعلى رقم</label><input id="max" dir="ltr" type="text" inputmode="text" maxlength="90" value="${mode === 'finder' ? '1000000' : '100'}" oninput="updateRangeInfo()"></div>${mode === 'solo' ? '<div class="field full"><label for="numberMode">طريقة اللعب</label><select id="numberMode"><option value="normal">بحث منظّم · العدد المضمون من المحاولات</option><option value="easy">تدريب · 3 محاولات إضافية</option><option value="hard">مغامرة · محاولتان أقل من العدد المضمون</option></select></div>' : ''}${playerField()}</div><p class="note" id="rangeinfo"></p>`;
}
const categories = [
  ['all', 'الكل'],
  ['animal', 'حيوانات'],
  ['food', 'أكل ومشروبات'],
  ['object', 'أغراض'],
  ['vehicle', 'مواصلات'],
  ['place', 'أماكن'],
  ['job', 'مهن'],
];
function catField() {
  return `<label for="category">نوع الأشياء</label><select id="category" onchange="refreshPoolList()">${categories.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select>`;
}
function refreshPoolList() {
  if (!$('poolList')) return;
  const a = selectedItems();
  $('poolList').innerHTML = a.map((i) => `<span>${esc(items[i].name)}</span>`).join('');
  $('poolSummary').textContent = `شوف الأشياء المتاحة (${a.length})`;
}
function selectedItems() {
  const c = $('category')?.value || 'all';
  return items.map((v, i) => i).filter((i) => c === 'all' || items[i].cat === c);
}
function coreBlocked() {
  return !!state?.pausedAt || !$('modalback').hidden || !!$('pausecover');
}
function legacySetup(id) {
  clearTimers();
  screen = 'setup';
  state = { id };
  let body = '';
  if (id === 'finder' || id === 'solo') {
    body = `<p class="muted">${id === 'finder' ? 'خل الشخص يختار رقم صحيح ولا يقوله لك. جاوب حسب موقع رقمه بالنسبة للتخمين.' : 'أنا باختار رقم سرّي. جرّب تخمنه بأقل محاولات، وبعطيك أكبر أو أصغر.'}</p>${ranges(id)}<div class="actions"><button class="primary" onclick="startNumber('${id}')">${id === 'finder' ? 'يلا، أطلع الرقم' : 'اختار رقم وابدأ'}</button></div><p class="note">تدعم أرقام سالبة وأعداد صحيحة حتى ٦٠ خانة. العدد المضمون من المحاولات يزيد مع حجم النطاق.</p>`;
  } else if (id === 'mind') {
    body = `<p class="muted">خل الشخص يفكر بشي من القائمة اللي اخترتها، ثم جاوب على الأسئلة. اللعبة تستبعد الخيارات لين توصل لتخمين.</p><div class="fields"><div class="field full">${catField()}</div>${playerField()}</div><details class="history"><summary id="poolSummary">شوف الأشياء المتاحة (${items.length})</summary><div class="listchips" id="poolList">${items.map((v) => `<span>${esc(v.name)}</span>`).join('')}</div></details><div class="actions"><button class="primary" onclick="startMind()">فكّروا بشي وابدأوا</button></div><p class="note">تعتمد على إجاباتكم والقائمة الداخلية؛ ما تقدر تعرف أي شي خارجها. «مو متأكد» يتجاوز السؤال.</p>`;
  } else if (id === 'who') {
    body = `<p class="muted">اكتشف الكلمة من 3 تلميحات متدرجة. اختر الفئة ومستوى التحدي، والكلمات لا تتكرر حتى تمر على أغلب القائمة.</p><div class="fields"><div class="field full">${catField()}</div><div class="field full"><label for="whoLevel">مستوى التخمين</label><select id="whoLevel"><option value="easy">خفيف · تلميحان و7 تخمينات</option><option value="normal" selected>متوسط · تلميح واحد و5 تخمينات</option><option value="hard">خبير · 3 تخمينات بدون قائمة كلمات</option></select></div>${playerField()}</div><div class="actions"><button class="primary" onclick="startWho()">أعطني أول تلميح</button></div>`;
  } else if (id === 'memory') {
    body = `<p class="muted">طابق الأزواج بأقل حركات. اختر من 8 إلى 48 بطاقة وثيمة البطاقات. عندك كشفتان قصيرتان، كل واحدة تخصم 12 نقطة.</p><div class="fields"><div class="field"><label for="difficulty">حجم اللوحة</label><select id="difficulty"><option value="4">بداية · 8 بطاقات</option><option value="6">خفيف · 12 بطاقة</option><option value="8" selected>متوسط · 16 بطاقة</option><option value="12">تحدي · 24 بطاقة</option><option value="16">قوي · 32 بطاقة</option><option value="20">خبير · 40 بطاقة</option><option value="24">أسطوري · 48 بطاقة</option></select></div><div class="field"><label for="memoryTheme">شكل البطاقات</label><select id="memoryTheme"><option value="mix">عالم متنوع</option><option value="animals">حيوانات</option><option value="food">أطعمة وفواكه</option><option value="travel">رحلات وأماكن</option></select></div>${playerField()}</div><div class="actions"><button class="primary" onclick="startMemory()">جهّز البطاقات</button></div>`;
  } else if (id === 'reaction') {
    body = `<p class="muted">انتظر الأخضر ثم اضغط أو استخدم المسافة. اختر 3 أو 5 أو 7 محاولات؛ الفوز لأقل متوسط وقت، والضغط المبكر يحسب 1500 ملّي ثانية.</p><div class="fields"><div class="field full"><label for="trials">المحاولات لكل لاعب</label><select id="trials"><option value="3">سريع · 3 محاولات</option><option value="5" selected>متوازن · 5 محاولات</option><option value="7">دقيق · 7 محاولات</option></select></div>${playerField('من يلعب وحده؟')}</div><div class="check" style="margin-top:15px"><input type="checkbox" id="group"><label for="group">نلعب جميعاً بالتناوب (${store.players.length} لاعبين)</label></div><div class="actions"><button class="primary" onclick="startReaction()">ابدأ تحدي السرعة</button></div><p class="note">تعرض النتيجة المتوسط والوسيط وأسرع ضغطة وعدد الضغطات المبكرة. جرّبوا نفس الجهاز للمقارنة.</p>`;
  } else if (id === 'mime') {
    body = `<p class="muted">شاهد الكلمة ومثّلها بدون كلام، والباقي يخمنون! الصحيح +10، والتجاوز −2. تقدر تخفي الكلمة مؤقتاً أو تتراجع عن ضغطة بالغلط.</p><div class="fields"><div class="field full">${catField()}</div><div class="field"><label for="duration">وقت كل دور</label><select id="duration"><option value="30">30 ثانية</option><option value="45">45 ثانية</option><option value="60" selected>60 ثانية</option><option value="90">90 ثانية</option><option value="120">دقيقتان</option></select></div><div class="field"><label for="rounds">الأدوار لكل لاعب</label><select id="rounds"><option value="1">دور واحد</option><option value="2" selected>دوران</option><option value="3">3 أدوار</option><option value="5">5 أدوار</option></select></div></div><p class="note">يلعبون: ${store.players.map(esc).join('، ')}. النقاط للممثّل، وفي نهاية الدور تشوفون الكلمات اللي لعبتوها.</p><div class="actions"><button class="primary" onclick="startMime()">نبدأ اللمّة</button><button onclick="openPeople()">عدّل اللاعبين</button></div>`;
  } else if (id === 'secret') {
    body = `<p class="muted">صاحب الدور يشاهد كلمة سر أو يكتب كلمة من عنده. الباقي يسألونه بنعم أو لا، ويسجلون الإجابات حتى يكتشفون السر.</p><div class="fields"><div class="field full">${catField()}</div><div class="field"><label for="duration">وقت التخمين</label><select id="duration"><option value="60">دقيقة</option><option value="120" selected>دقيقتان</option><option value="180">3 دقائق</option><option value="240">4 دقائق</option></select></div><div class="field"><label for="questionLimit">حد الأسئلة</label><select id="questionLimit"><option value="10">10 أسئلة · سريع</option><option value="20" selected>20 سؤالاً · عادي</option><option value="30">30 سؤالاً · طويل</option></select></div><div class="field full"><label for="rounds">الأدوار لكل لاعب</label><select id="rounds"><option value="1">دور واحد</option><option value="2">دوران</option><option value="3">3 أدوار</option></select></div></div><p class="note">صاحب الجواب الصحيح يكسب 10–30 نقطة، وصاحب الكلمة 10 نقاط. بعد آخر سؤال لكم تخمين أخير.</p><div class="actions"><button class="primary" onclick="startSecret()">نبدأ أول دور</button><button onclick="openPeople()">عدّل اللاعبين</button></div>`;
  }
  setHTML(wrap(id, `<section class="panel">${body}</section>`));
  if (id === 'finder' || id === 'solo') updateRangeInfo();
  goTop();
}
function presetRange() {
  const p = $('preset').value;
  const r = {
    hundred: ['1', '100'],
    million: ['1', '1000000'],
    trillion: ['1', '1000000000000'],
    negative: ['-1000000000000000000', '1000000000000000000'],
  };
  if (r[p]) {
    [$('min').value, $('max').value] = r[p];
  }
  updateRangeInfo();
}

function legacyResult(id, title, text, points = 0, detail = '') {
  tone(true);
  setHTML(
    wrap(
      id,
      `<section class="panel success center celebrate"><div class="resulticon">${points ? '🏆' : '✦'}</div><h2>${title}</h2>${detail ? `<div class="resultnum">${esc(detail)}</div>` : ''}<p class="muted" style="margin-top:12px">${text}</p>${points ? `<div class="chips" style="justify-content:center"><span class="chip">+${points} نقطة</span></div>` : ''}<div class="actions"><button class="primary" onclick="setup('${id}')">جولة يديدة</button><button onclick="home()">الألعاب</button></div></section>`,
    ),
  );
}
function startNumber(id) {
  try {
    const free = id === 'finder' && $('preset').value === 'free';
    const [l, h] = free ? [null, null] : bounds();
    const name = player();
    if (id === 'finder') {
      state = {
        id,
        free,
        l,
        h,
        guess: free ? 0n : l + (h - l) / 2n,
        phase: free ? 'explore' : 'binary',
        direction: 0,
        step: 1n,
        attempt: 1,
        max: free ? null : limit(l, h),
        history: [],
        name,
        done: false,
      };
      screen = 'finder';
      renderFinder();
    } else {
      const mode = $('numberMode')?.value || 'normal',
        adjust = { normal: 0, easy: 3, hard: -2 }[mode] || 0;
      state = {
        id,
        l,
        h,
        initialL: l,
        initialH: h,
        secret: l + randomBigInt(h - l + 1n),
        max: Math.max(1, limit(l, h) + adjust),
        attempt: 0,
        history: [],
        hints: 0,
        mode,
        name,
        done: false,
      };
      screen = 'solo';
      renderSolo();
    }
    goTop();
  } catch (e) {
    toast(e.message);
  }
}
function renderFinder(msg = '') {
  const s = state;
  const count = s.l !== null && s.h !== null ? s.h - s.l + 1n : null;
  setHTML(
    wrap(
      'finder',
      `<div class="stats"><div class="stat"><small>التخمين الحالي</small><b>${s.attempt}</b></div><div class="stat"><small>${s.max ? 'المحاولات المتبقية' : 'استكشاف النطاق'}</small><b>${s.max ? s.max - s.attempt + 1 : '∞'}</b></div><div class="stat"><small>الاحتمالات الباقية</small><b style="font-size:17px;overflow-wrap:anywhere">${count === null ? 'غير محددة' : fmt(count)}</b></div></div><section class="panel"><div class="spot"><small>هل الرقم اللي اخترته هو…</small><div class="huge">${fmt(s.guess)}</div><div class="range">${s.l === null ? '−∞' : fmt(s.l)} ≤ ? ≤ ${s.h === null ? '+∞' : fmt(s.h)}</div></div><div class="answerrow"><button class="warm" onclick="finderAnswer('higher')">⬆ أكبر<small>رقمه أكبر من التخمين</small></button><button class="primary" onclick="finderAnswer('correct')">✓ صح<small>هذا الرقم بالضبط</small></button><button class="rose" onclick="finderAnswer('lower')">⬇ أصغر<small>رقمه أصغر من التخمين</small></button></div><p class="note" role="status">${msg || (count === 1n ? 'باقي رقم واحد. اضغط «صح» إذا هو الرقم اللي اخترته.' : s.phase === 'explore' ? 'نحدد الاتجاه ونوسّع البحث، وبعدها نضيّق النطاق.' : 'كل إجابة تقرّبنا من الرقم. جاوب حسب الرقم السرّي.')}</p><div class="actions"><button onclick="undoFinder()" ${!s.history.length ? 'disabled' : ''}>↶ تراجع خطوة</button><button class="quiet" onclick="setup('finder')">نطاق يديد</button></div>${
        s.history.length
          ? `<details class="history"><summary>الإجابات السابقة (${s.history.length})</summary><ol>${s.history
              .slice(-10)
              .map(
                (v) =>
                  `<li><bdi>${fmt(v.guess)}</bdi> ← الرقم ${v.answer === 'higher' ? 'أكبر' : 'أصغر'}</li>`,
              )
              .join('')}</ol></details>`
          : ''
      }</section>`,
    ),
  );
}
function finderAnswer(a) {
  if (screen !== 'finder' || state.done || coreBlocked()) return;
  const s = state;
  if (a === 'correct') {
    s.done = true;
    const p = 30;
    addScore(s.name, p);
    result(
      'finder',
      'طلعنا الرقم! 🎯',
      `${esc(s.name)} وصل للرقم في ${s.attempt} محاولة.`,
      p,
      fmt(s.guess),
    );
    return;
  }
  if (!['higher', 'lower'].includes(a)) return;
  const snapshot = {
    l: s.l,
    h: s.h,
    guess: s.guess,
    phase: s.phase,
    direction: s.direction,
    step: s.step,
    attempt: s.attempt,
    answer: a,
  };
  let l = s.l,
    h = s.h,
    guess = s.guess,
    phase = s.phase,
    dir = s.direction,
    step = s.step;
  if (a === 'higher') l = s.guess + 1n;
  else h = s.guess - 1n;
  if (l !== null && h !== null) {
    if (l > h) {
      toast('هالإجابة تناقض النطاق. تقدر تتراجع وتصحح الرد السابق.');
      return;
    }
    phase = 'binary';
    guess = l + (h - l) / 2n;
  } else {
    if (dir === 0) {
      dir = a === 'higher' ? 1 : -1;
      step = 1n;
      guess = BigInt(dir);
    } else {
      step *= 2n;
      guess = s.guess + BigInt(dir) * step;
    }
  }
  s.history.push(snapshot);
  Object.assign(s, {
    l,
    h,
    guess,
    phase,
    direction: dir,
    step,
    attempt: s.attempt + 1,
  });
  tone();
  renderFinder();
}
function undoFinder() {
  if (screen !== 'finder' || state.done || coreBlocked() || !state.history.length) return;
  const v = state.history.pop();
  const { answer, ...snap } = v;
  Object.assign(state, snap);
  renderFinder('رجعنا خطوة. صحّح الإجابة اللي طافت.');
}
function renderSolo(msg = '') {
  const s = state,
    count = s.h - s.l + 1n,
    initial = s.initialH - s.initialL + 1n,
    progress = Number(100n - (count * 100n) / initial);
  setHTML(
    wrap(
      'solo',
      `<div class="stats"><div class="stat"><small>المحاولات الباقية</small><b>${s.max - s.attempt}</b></div><div class="stat"><small>محاولاتك</small><b>${s.attempt}</b></div><div class="stat"><small>احتمالات باقية</small><b style="font-size:16px;overflow-wrap:anywhere">${fmt(count)}</b></div></div><section class="panel"><div class="progressline" aria-label="تضييق النطاق ${progress}%"><span style="width:${progress}%"></span></div><div class="spot"><div style="font-size:42px">🔐</div><h2>رقمي عندي… خمنه!</h2><div class="range">${fmt(s.l)} ≤ ? ≤ ${fmt(s.h)}</div></div><form onsubmit="event.preventDefault();guessSolo()"><label for="guessInput">اكتب تخمينك</label><input id="guessInput" dir="ltr" type="text" inputmode="text" maxlength="90" autocomplete="off" placeholder="؟"><div class="actions"><button class="primary" type="submit">هذا رقمك؟</button><button type="button" onclick="hintSolo()" ${s.hints >= 2 || count <= 2n ? 'disabled' : ''}>ضيّق النطاق −8 (${2 - s.hints})</button><button type="button" onclick="revealSolo()">أستسلم</button></div></form><p class="note" role="status">${msg || 'ابدأ قريباً من منتصف النطاق. التلميح يحذف نصف الاحتمالات ويخصم 8 نقاط، ولا يستهلك محاولة.'}</p>${
        s.history.length
          ? `<div class="history"><ol>${s.history
              .slice(-12)
              .map(
                (v) =>
                  `<li><bdi>${fmt(v.n)}</bdi> · ${v.a === 'higher' ? 'رقمي أكبر ⬆' : 'رقمي أصغر ⬇'}</li>`,
              )
              .join('')}</ol></div>`
          : ''
      }</section>`,
    ),
  );
}
function hintSolo() {
  if (screen !== 'solo' || state.done || coreBlocked() || state.hints >= 2) return;
  const s = state;
  if (s.h - s.l + 1n <= 2n) return;
  const mid = s.l + (s.h - s.l) / 2n;
  if (s.secret <= mid) s.h = mid;
  else s.l = mid + 1n;
  s.hints++;
  renderSolo('حذفنا نصف الاحتمالات. باقي النطاق يحتوي الرقم السري.');
  $('guessInput').focus();
}
function guessSolo() {
  if (screen !== 'solo' || state.done || coreBlocked()) return;
  const s = state;
  let n;
  try {
    n = integer($('guessInput').value);
  } catch (e) {
    return toast(e.message);
  }
  if (n < s.l || n > s.h)
    return toast('هذا الرقم خارج النطاق الممكن. جرّب رقماً من النطاق المعروض.');
  s.attempt++;
  if (n === s.secret) {
    s.done = true;
    const p = Math.max(
      10,
      50 +
        (s.mode === 'hard' ? 15 : s.mode === 'easy' ? -10 : 0) -
        Math.floor(((s.attempt - 1) * 35) / s.max) -
        s.hints * 8,
    );
    addScore(s.name, p);
    result(
      'solo',
      'صح! عرفته 🎉',
      `وصلت في ${s.attempt} من ${s.max} محاولات، واستعملت ${s.hints} تلميحات.`,
      p,
      fmt(s.secret),
    );
    return;
  }
  const a = n < s.secret ? 'higher' : 'lower',
    distance = n < s.secret ? s.secret - n : n - s.secret,
    heat =
      s.lastDistance === undefined
        ? ''
        : distance < s.lastDistance
          ? ' اقتربت من الرقم 🔥'
          : distance > s.lastDistance
            ? ' ابتعدت عن الرقم ❄'
            : ' نفس المسافة من الرقم.';
  s.lastDistance = distance;
  s.history.push({ n, a });
  if (s.attempt >= s.max) {
    s.done = true;
    result(
      'solo',
      'خلصت المحاولات',
      `الرقم كان ${fmt(s.secret)}. تقسيم النطاق من المنتصف يعطيك أفضل فرصة.`,
    );
    return;
  }
  if (a === 'higher') s.l = n + 1n;
  else s.h = n - 1n;
  tone();
  renderSolo((a === 'higher' ? '⬆ رقمي أكبر من تخمينك.' : '⬇ رقمي أصغر من تخمينك.') + heat);
  $('guessInput').focus();
}
function revealSolo() {
  if (screen !== 'solo' || state.done || coreBlocked()) return;
  state.done = true;
  result('solo', 'انكشف السر 🔓', `استعملت ${state.attempt} محاولة.`, 0, fmt(state.secret));
}

// قاعدة محلية واضحة؛ كل شيء له صفات وتلميحات مستقلة عن الإنترنت.
const questions = [
  ['animal', 'هل هو حيوان؟'],
  ['food', 'هل ناكله أو نشربه؟'],
  ['object', 'هل هو غرض نستخدمه؟'],
  ['vehicle', 'هل نستخدمه للتنقّل؟'],
  ['place', 'هل هو مكان نروحه؟'],
  ['job', 'هل هو مهنة شخص؟'],
  ['pet', 'هل يُربّى غالباً بالبيت؟'],
  ['wild', 'هل يعيش غالباً في البر أو الطبيعة؟'],
  ['fly', 'هل يطير؟'],
  ['swim', 'هل يعيش أو يتحرّك في الماي؟'],
  ['large', 'هل حجمه أكبر من الإنسان عادةً؟'],
  ['desert', 'هل يرتبط بالصحراء؟'],
  ['insect', 'هل هو حشرة؟'],
  ['stripes', 'هل على جسمه خطوط؟'],
  ['trunk', 'هل عنده خرطوم؟'],
  ['longneck', 'هل رقبته طويلة جداً؟'],
  ['mane', 'هل ذكره له لبدة حول الرأس؟'],
  ['fruit', 'هل هو فاكهة؟'],
  ['sweet', 'هل طعمه حلو عادةً؟'],
  ['cold', 'هل يؤكل أو يُشرب بارداً غالباً؟'],
  ['drink', 'هل هو مشروب؟'],
  ['hot', 'هل يُقدّم ساخناً عادةً؟'],
  ['rice', 'هل فيه رز؟'],
  ['bread', 'هل يُصنع أساساً من عجين أو خبز؟'],
  ['cheese', 'هل الجبن من مكوناته المعتادة؟'],
  ['meat', 'هل اللحم من مكوناته المعتادة؟'],
  ['caffeine', 'هل يحتوي عادةً على كافيين؟'],
  ['leaves', 'هل يُحضّر من أوراق نبات؟'],
  ['aviation', 'هل يرتبط بالطيران؟'],
  ['red', 'هل لونه أحمر غالباً؟'],
  ['yellow', 'هل لونه أصفر غالباً؟'],
  ['dates', 'هل يطلع من النخلة؟'],
  ['electric', 'هل يحتاج كهرباء عادةً؟'],
  ['screen', 'هل فيه شاشة؟'],
  ['pocket', 'هل ينحط بالجيب عادةً؟'],
  ['call', 'هل نستعمله للاتصال؟'],
  ['keys', 'هل نكتب باستخدام أزراره؟'],
  ['clean', 'هل يساعد بالتنظيف؟'],
  ['cook', 'هل نستخدمه لطبخ الأكل؟'],
  ['keepcold', 'هل يبرّد ويحفظ الأكل؟'],
  ['wear', 'هل نلبسه؟'],
  ['feet', 'هل نلبسه بالقدم؟'],
  ['time', 'هل يبين لنا الوقت؟'],
  ['paper', 'هل يُصنع أساساً من ورق؟'],
  ['read', 'هل نقرؤه؟'],
  ['write', 'هل نكتب أو نرسم به؟'],
  ['rain', 'هل يُستخدم لحمايتنا من المطر؟'],
  ['music', 'هل نستخدمه للاستماع للصوت؟'],
  ['wheels', 'هل يتحرك على عجلات؟'],
  ['two', 'هل له عجلتان؟'],
  ['pedal', 'هل نحرّكه بالدواسات؟'],
  ['rail', 'هل يتحرك على سكة؟'],
  ['many', 'هل يحمل ركاباً كثيرين عادةً؟'],
  ['underground', 'هل يتحرّك غالباً تحت الأرض؟'],
  ['space', 'هل يسافر للفضاء؟'],
  ['sea', 'هل يرتبط بالبحر؟'],
  ['learn', 'هل يرتبط بالتعلّم؟'],
  ['health', 'هل يرتبط بالعلاج والصحة؟'],
  ['buy', 'هل نروح له للتسوّق؟'],
  ['foodplace', 'هل نروح له للأكل؟'],
  ['sport', 'هل يرتبط بالرياضة؟'],
  ['travel', 'هل يرتبط بالسفر؟'],
  ['books', 'هل نروح له للكتب؟'],
  ['plants', 'هل فيه أشجار ومساحات خضراء عادةً؟'],
  ['animals', 'هل نروح له لمشاهدة الحيوانات؟'],
  ['teach', 'هل يدرّس الناس؟'],
  ['care', 'هل يرعى المرضى؟'],
  ['fire', 'هل يطفئ الحرائق؟'],
  ['order', 'هل يحافظ على الأمن؟'],
  ['build', 'هل يصمّم مباني أو منشآت؟'],
  ['cut', 'هل يقصّ الشعر؟'],
];
const rawItems = [
  ['قط', 'animal', 'pet', 'أحب الأماكن الدافية', 'أتحرك بهدوء وعندي شوارب', 'صوتي مياو', 'قطة|قطو'],
  [
    'كلب',
    'animal',
    'pet order',
    'حاسة الشم عندي قوية',
    'ممكن أساعد في الحراسة',
    'صوتي نباح',
    'كلبة',
  ],
  [
    'أسد',
    'animal',
    'wild large mane',
    'أعيش مع مجموعة من نوعي',
    'لقبي ملك الغابة',
    'ذكر نوعي عنده لبدة',
    '',
  ],
  [
    'نمر',
    'animal',
    'wild large stripes',
    'أنا صيّاد من السنوريات',
    'على جسمي خطوط غامقة',
    'أشبه قط كبير مخطط',
    '',
  ],
  [
    'فيل',
    'animal',
    'wild large trunk',
    'أنا ثقيل وأذني كبيرة',
    'عندي أنياب وخرطوم',
    'أكبر حيوان بري حي',
    '',
  ],
  [
    'زرافة',
    'animal',
    'wild large longneck',
    'أقدر أوصل لأوراق عالية',
    'على جسمي بقع',
    'رقبتي طويلة جداً',
    '',
  ],
  ['جمل', 'animal', 'large desert', 'أتحمل العطش', 'أمشي في الصحراء', 'على ظهري سنام', 'ناقة|بعير'],
  [
    'سمكة',
    'animal',
    'swim sea',
    'أحتاج الماي عشان أعيش',
    'أتنفّس بالخياشيم',
    'جسمي له زعانف',
    'سمك',
  ],
  [
    'دلفين',
    'animal',
    'swim sea large',
    'أعيش بالبحر وأتنفس هواء',
    'أقفز فوق الماي',
    'ثديي بحري مشهور بذكائه',
    '',
  ],
  ['بطّة', 'animal', 'fly swim', 'أحب البرك', 'عندي منقار عريض', 'صوتي كواك كواك', 'بط|بطة'],
  ['عصفور', 'animal', 'fly pet', 'جسمي صغير وخفيف', 'أبني عش', 'عندي ريش وأغرّد', 'عصافير'],
  ['فراشة', 'animal', 'fly insect wild', 'أزور الأزهار', 'كنت يرقة قبل', 'عندي جناحان ملوّنان', ''],
  [
    'نحلة',
    'animal',
    'fly insect wild stripes',
    'أزور الأزهار وأعيش بخلية',
    'ممكن ألسع',
    'أنتج العسل',
    'نحل',
  ],
  ['أرنب', 'animal', 'pet wild', 'آكل النباتات', 'أتحرك بالقفز', 'أذني طويلة', ''],
  [
    'حصان',
    'animal',
    'large sport',
    'ممكن يركبني شخص',
    'عندي حوافر',
    'أشارك في سباقات الخيل',
    'خيل',
  ],
  ['سلحفاة', 'animal', 'pet swim', 'أتحرك ببطء', 'أحمل حماية على ظهري', 'عندي صدفة صلبة', ''],
  [
    'تفاح',
    'food',
    'fruit sweet red',
    'فاكهة تنمو على شجرة',
    'أجي بألوان منها الأحمر والأخضر',
    'اسمي يبدأ بتاء وينتهي بحاء',
    'تفاحة',
  ],
  [
    'موز',
    'food',
    'fruit sweet yellow',
    'فاكهة بقشر يتقشّر',
    'شكلي طويل ومنحني',
    'قشري أصفر غالباً',
    'موزة',
  ],
  [
    'تمر',
    'food',
    'fruit sweet dates desert',
    'مشهور بالخليج',
    'ناكل منه أنواع مختلفة',
    'أطلع من النخلة',
    'تمرة|رطب',
  ],
  [
    'بطيخ',
    'food',
    'fruit sweet cold red',
    'أحلى شي بالصيف',
    'قشري أخضر وداخلي أحمر غالباً',
    'فاكهة كبيرة فيها ماي وايد',
    'رقي|بطيخة',
  ],
  [
    'آيس كريم',
    'food',
    'sweet cold',
    'أجي بنكهات كثيرة',
    'أذوب إذا تركتني بالحر',
    'حلوى باردة في كوب أو مخروط',
    'ايس كريم|بوظة',
  ],
  [
    'شوكولاتة',
    'food',
    'sweet caffeine',
    'أقدر أكون سادة أو بالحليب',
    'تنباع كقطع وألواح',
    'مصنوعة من الكاكاو',
    'كاكاو|شوكولاته',
  ],
  [
    'كيك',
    'food',
    'sweet bread',
    'غالباً ينخبز بالفرن',
    'ينحط عليه كريم',
    'نحطه في أعياد الميلاد',
    'كيكة',
  ],
  [
    'بيتزا',
    'food',
    'bread cheese hot',
    'أجي مقطعة مثلثات',
    'عجين وعليه صلصة وإضافات',
    'أشتهر بالجبن وشكلي الدائري',
    '',
  ],
  [
    'برغر',
    'food',
    'bread meat hot',
    'أقدر تنمسكني باليد',
    'لحم بين قطعتين خبز',
    'ساندويتش غالباً فيه خس وصلصة',
    'همبرغر|برجر',
  ],
  [
    'مجبوس',
    'food',
    'rice meat hot',
    'أكلة خليجية',
    'فيه بهارات ودجاج أو لحم',
    'طبقي الرئيسي رز مبهّر',
    'مكبوس',
  ],
  [
    'قهوة',
    'food',
    'drink hot caffeine',
    'مشروب له رائحة واضحة',
    'تنطحن حبّاته قبل التحضير',
    'ممكن تكون عربية أو إسبرسو',
    '',
  ],
  [
    'شاي',
    'food',
    'drink hot caffeine leaves',
    'مشروب منتشر بكل مكان',
    'يتحضّر من أوراق',
    'ممكن يكون أحمر أو أخضر',
    '',
  ],
  [
    'عصير',
    'food',
    'drink cold sweet',
    'مشروب بنكهات كثيرة',
    'ينعصر من الفاكهة',
    'ممكن أكون برتقال أو مانجو',
    'عصير برتقال',
  ],
  [
    'ماي',
    'food',
    'drink cold',
    'ما لي لون ولا رائحة',
    'تحتاجني يومياً',
    'مشروب يروي العطش',
    'ماء|مياه',
  ],
  [
    'تلفون',
    'object',
    'electric screen pocket call',
    'ممكن أحمله بكل مكان',
    'أفتح تطبيقات وأصوّر',
    'أتصل منه على الناس',
    'هاتف|جوال|موبايل',
  ],
  [
    'لابتوب',
    'object',
    'electric screen keys',
    'أقدر آخذه بالشّنطة',
    'شاشة ولوحة مفاتيح في جهاز واحد',
    'كمبيوتر محمول',
    'حاسوب محمول',
  ],
  [
    'تلفزيون',
    'object',
    'electric screen large',
    'غالباً ثابت في الصالة',
    'نشوف عليه برامج ومباريات',
    'شاشة نتحكم فيها بريموت',
    'تلفاز',
  ],
  [
    'تابلت',
    'object',
    'electric screen',
    'شاشتي أكبر من التلفون عادةً',
    'أقدر أستخدم قلم على شاشتي',
    'جهاز لوحي',
    'جهاز لوحي|ايباد',
  ],
  [
    'ثلاجة',
    'object',
    'electric keepcold large',
    'أحتاج كهرباء',
    'أغلب مكاني بالمطبخ',
    'أحفظ الأكل بارد',
    '',
  ],
  [
    'فرن',
    'object',
    'electric cook hot large',
    'مكاني في المطبخ',
    'أطبخ بالحرارة',
    'أنخبز فيني الخبز والكيك',
    '',
  ],
  [
    'مكنسة كهربائية',
    'object',
    'electric clean',
    'أساعد في ترتيب البيت',
    'عندي خرطوم أو أنبوب',
    'أشفط الغبار',
    'مكنسة|مكنسه كهربائيه',
  ],
  [
    'غسالة',
    'object',
    'electric clean large',
    'أشتغل بالماي والكهرباء',
    'أدور وأنا أشتغل',
    'أنظّف الملابس',
    '',
  ],
  [
    'ساعة',
    'object',
    'wear time',
    'ممكن أكون على المعصم',
    'عندي عقارب أو أرقام',
    'أقول لك الوقت',
    'ساعه يد|ساعة يد',
  ],
  ['حذاء', 'object', 'wear feet', 'أجي كزوج', 'أحمي جزء من جسمك', 'تلبسني برجولك', 'جزمة|نعال'],
  [
    'نظارة',
    'object',
    'wear',
    'أنحط على الوجه',
    'عندي عدستان',
    'أساعدك تشوف أو أحميك من الشمس',
    'نظارات',
  ],
  [
    'كتاب',
    'object',
    'paper read books',
    'داخلي صفحات كثيرة',
    'فيّ كلام وصور',
    'تقراني من الغلاف للغلاف',
    '',
  ],
  [
    'قلم',
    'object',
    'write pocket',
    'ممكن يكون حبراً أو رصاص',
    'تمسكني بيدك',
    'تكتب وترسم فيني',
    '',
  ],
  ['مظلّة', 'object', 'rain', 'أفتح وأنسكر', 'أحميك من فوق', 'تستخدمني تحت المطر', 'مظلة|شمسية'],
  [
    'سماعة',
    'object',
    'electric music wear',
    'أحتاج إشارة صوت',
    'ممكن أكون صغيرة أو كبيرة',
    'تنحطني على الأذن للاستماع',
    'سماعات',
  ],
  [
    'سيارة',
    'vehicle',
    'wheels',
    'أتنقّل على الطرق',
    'غالباً لي أربع عجلات',
    'يقودني شخص بمقود',
    '',
  ],
  [
    'دراجة',
    'vehicle',
    'wheels two pedal sport',
    'أوازن على عجلتين',
    'ما أحتاج محركاً',
    'تدوس دواساتي برجولك',
    'دراجة هوائية|سيكل',
  ],
  [
    'دراجة نارية',
    'vehicle',
    'wheels two',
    'لي محرك وعجلتان',
    'راكبي يحتاج خوذة',
    'مركبة أسرع من الدراجة الهوائية',
    'دباب|موتوسيكل',
  ],
  [
    'باص',
    'vehicle',
    'wheels many',
    'أتنقّل على الشوارع',
    'أوقف بمحطات',
    'أنقل ركاباً كثيرين',
    'حافلة|أوتوبيس',
  ],
  ['قطار', 'vehicle', 'rail many', 'أنا طويل وعندي عربات', 'أوقف بمحطات', 'أمشي على سكة', ''],
  [
    'مترو',
    'vehicle',
    'rail many underground',
    'أنقل ركاباً داخل المدينة',
    'أمشي على سكة',
    'غالباً أمر بأنفاق تحت الأرض',
    '',
  ],
  [
    'طيارة',
    'vehicle',
    'fly many travel',
    'أنقل الناس لمسافات بعيدة',
    'أقلع من مطار',
    'عندي جناحان وأطير',
    'طائرة',
  ],
  [
    'سفينة',
    'vehicle',
    'swim sea many',
    'أنقل ناساً وبضائع',
    'أتحرك بالبحر',
    'مركبة بحرية كبيرة',
    'باخرة',
  ],
  [
    'صاروخ',
    'vehicle',
    'fly space',
    'أندفع بسرعة كبيرة',
    'ممكن أحمل مركبة فضائية',
    'أطلع للفضاء',
    '',
  ],
  [
    'مدرسة',
    'place',
    'learn teach',
    'تروح لي عشان تتعلم',
    'عندي صفوف وجرس',
    'يجتمع فيني الطلاب والمعلمين',
    '',
  ],
  [
    'مستشفى',
    'place',
    'health care large',
    'فيّ غرف وأجهزة كثيرة',
    'تروح لي إذا احتجت علاج',
    'يشتغل فيني أطباء وممرضون',
    'مشفى',
  ],
  [
    'مطعم',
    'place',
    'foodplace cook',
    'عندي قائمة خيارات',
    'تطلب منّي وجبة',
    'أقدّم الأكل للزبائن',
    '',
  ],
  [
    'جمعية',
    'place',
    'buy',
    'مكان تروح له للتسوّق',
    'فيه رفوف وعربات',
    'تشتري منه أغراض البيت والمواد الغذائية',
    'سوبرماركت|جمعية تعاونية',
  ],
  [
    'مكتبة',
    'place',
    'learn books',
    'مكان هادي عادةً',
    'فيه رفوف مليانة',
    'تلقى فيه كتباً تقراها أو تستعيرها',
    '',
  ],
  [
    'حديقة',
    'place',
    'plants sport',
    'مكان مناسب للمشي',
    'فيه مساحات خضراء',
    'فيه أشجار وألعاب خارجية غالباً',
    '',
  ],
  [
    'حديقة حيوانات',
    'place',
    'plants animals',
    'مكان يزوره الناس',
    'فيه أنواع كثيرة من الكائنات',
    'تروح له لمشاهدة الحيوانات',
    '',
  ],
  [
    'مطار',
    'place',
    'travel aviation large',
    'مكان فيه مسافرون وحقائب',
    'تمر فيه على بوابات سفر',
    'منه تقلع الطائرات',
    '',
  ],
  ['ملعب', 'place', 'sport large', 'تروح له للتشجيع', 'فيه مدرجات', 'تنلعب فيني مباريات', ''],
  ['شاطئ', 'place', 'sea swim', 'مكان خارج المباني', 'فيه رمل وماي', 'على طرف البحر', 'بحر'],
  [
    'طبيب',
    'job',
    'health care',
    'أساعد الناس',
    'أشخّص الأمراض',
    'أوصف علاجاً للمرضى',
    'دكتور|طبيبة',
  ],
  [
    'معلّم',
    'job',
    'learn teach',
    'أتعامل مع طلاب',
    'أشرح الدروس',
    'أدرّس في المدرسة',
    'معلم|مدرس|معلمة',
  ],
  [
    'طباخ',
    'job',
    'cook foodplace',
    'أستخدم أدوات كثيرة',
    'أشتغل غالباً بالمطبخ',
    'أحضّر الوجبات',
    'شيف',
  ],
  [
    'طيّار',
    'job',
    'aviation travel',
    'شغلي يحتاج تدريباً خاصاً',
    'أجلس في قمرة القيادة',
    'أقود الطائرة',
    'طيار',
  ],
  [
    'رجل إطفاء',
    'job',
    'fire',
    'أتدخل وقت الخطر',
    'أستخدم خراطيم ومعدات',
    'أطفئ الحرائق',
    'اطفائي|إطفائي',
  ],
  [
    'شرطي',
    'job',
    'order',
    'ألبس زياً رسمياً في عملي',
    'أساعد في حفظ الأمن',
    'أطبق القانون وأحافظ على النظام',
    'شرطة',
  ],
  [
    'مهندس',
    'job',
    'build',
    'أشتغل بالتصميم والحسابات',
    'أرسم مخططات',
    'ممكن أصمم مباني وجسوراً',
    '',
  ],
  ['حلّاق', 'job', 'cut', 'أشتغل بالمقص وآلات القص', 'تجلس على كرسي قدامي', 'أقصّ الشعر', 'حلاق'],
];
const items = rawItems.map((r) => ({
  name: r[0],
  cat: r[1],
  tags: new Set([r[1], ...r[2].split(' ')]),
  hints: r.slice(3, 6),
  aliases: [r[0], ...(r[6] || '').split('|')].filter(Boolean),
}));
function chooseQuestion(candidates, asked) {
  let best = null,
    quality = -1;
  for (let i = 0; i < questions.length; i++) {
    if (asked.includes(i)) continue;
    const y = candidates.filter((k) => items[k].tags.has(questions[i][0])).length;
    const q = Math.min(y, candidates.length - y);
    if (q > quality && q > 0) {
      quality = q;
      best = i;
    }
  }
  return best;
}
function startMind() {
  state = {
    id: 'mind',
    candidates: selectedItems(),
    asked: [],
    history: [],
    answers: 0,
    name: player(),
    done: false,
  };
  screen = 'mind';
  renderMind();
  goTop();
}

function mindAnswer(a) {
  if (
    screen !== 'mind' ||
    coreBlocked() ||
    state.done ||
    state.q === null ||
    !['yes', 'no', 'unknown'].includes(a)
  )
    return;
  const s = state;
  const snap = {
    candidates: [...s.candidates],
    asked: [...s.asked],
    answers: s.answers,
  };
  const q = s.q;
  let next = s.candidates;
  if (a !== 'unknown') {
    next = next.filter((i) => items[i].tags.has(questions[q][0]) === (a === 'yes'));
    if (!next.length) return toast('هالإجابة ما تطابق الخيارات. تراجع أو جرّب «مو متأكد».');
    s.answers++;
  }
  s.history.push(snap);
  s.asked.push(q);
  s.candidates = next;
  tone();
  renderMind();
}
function undoMind() {
  if (screen !== 'mind' || coreBlocked() || state.done || !state.history.length) return;
  Object.assign(state, state.history.pop());
  renderMind();
}
function pickMind(i) {
  if (screen !== 'mind' || !state || state.done || coreBlocked()) return;
  if (state.candidates.includes(i)) {
    state.candidates = [i];
    confirmMind(true);
  }
}

const recentWho = [];
function startWho() {
  const pool = selectedItems();
  if (!pool.length) return toast('لا توجد كلمات في هذه الفئة.');
  const fresh = pool.filter((i) => !recentWho.includes(i)),
    index = (fresh.length ? fresh : pool)[randInt((fresh.length ? fresh : pool).length)];
  recentWho.push(index);
  if (recentWho.length > Math.min(40, Math.max(1, pool.length - 1))) recentWho.shift();
  const level = $('whoLevel')?.value || 'normal',
    config = {
      easy: { hints: 2, max: 7, base: 40 },
      normal: { hints: 1, max: 5, base: 50 },
      hard: { hints: 1, max: 3, base: 70 },
    }[level] || { hints: 1, max: 5, base: 50 };
  state = {
    id: 'who',
    item: items[index],
    pool,
    level,
    ...config,
    initialHints: config.hints,
    attempt: 0,
    seen: [],
    wrong: [],
    listOpen: false,
    name: player(),
    done: false,
  };
  screen = 'who';
  renderWho();
  goTop();
}
function whoPoints() {
  const s = state;
  return Math.max(
    10,
    s.base -
      (s.hints - s.initialHints) * 10 -
      Math.max(0, s.attempt - 1) * 5 -
      (s.listOpen ? 5 : 0),
  );
}
function renderWho(msg = '') {
  const s = state;
  setHTML(
    wrap(
      'who',
      `<div class="stats"><div class="stat"><small>تخمينات باقية</small><b>${s.max - s.attempt}</b></div><div class="stat"><small>تلميحات مفتوحة</small><b>${s.hints} / 3</b></div><div class="stat"><small>نقاط الإجابة الآن</small><b>${Math.max(10, s.base - (s.hints - s.initialHints) * 10 - s.attempt * 5 - (s.listOpen ? 5 : 0))}</b></div></div><section class="panel"><h2>من أنا؟ 🕵️</h2>${s.item.hints
        .slice(0, s.hints)
        .map((h, i) => `<div class="hint"><b>التلميح ${i + 1}</b>${esc(h)}</div>`)
        .join(
          '',
        )}<form onsubmit="event.preventDefault();guessWho()"><label for="whoInput">ما هو الشيء؟</label><input id="whoInput" maxlength="50" autocomplete="off" placeholder="اكتب الاسم أو اسماً بديلاً له"><div class="actions"><button class="primary" type="submit">خمنت!</button><button type="button" onclick="whoHint()" ${s.hints === 3 ? 'disabled' : ''}>تلميح إضافي −10</button></div></form><p class="note" role="status">${msg || 'التخمين الغلط يخصم 5 نقاط؛ تكرار التخمين نفسه لا يستهلك محاولة.'}</p>${s.wrong.length ? `<div class="listchips" aria-label="التخمينات السابقة">${s.wrong.map((v) => `<span>✕ ${esc(v)}</span>`).join('')}</div>` : ''}${s.level === 'hard' ? '' : s.listOpen ? `<details class="history" open><summary>الكلمات في الفئة المختارة (${s.pool.length})</summary><div class="listchips">${s.pool.map((i) => `<span>${esc(items[i].name)}</span>`).join('')}</div></details>` : '<div class="actions"><button onclick="whoCandidates()">شاهد قائمة الكلمات −5</button></div>'}<div class="actions"><button class="quiet" onclick="revealWho()">اكشف الجواب</button></div></section>`,
    ),
  );
}
function whoCandidates() {
  if (screen !== 'who' || state.done || coreBlocked() || state.level === 'hard' || state.listOpen)
    return;
  state.listOpen = true;
  renderWho();
}
function guessWho() {
  if (screen !== 'who' || state.done || coreBlocked()) return;
  const s = state,
    raw = $('whoInput').value.trim(),
    n = norm(raw);
  if (!n) return toast('اكتب اسم الشيء.');
  if (s.seen.includes(n)) return toast('جرّبت هذه الكلمة. اختر شيئاً آخر.');
  s.seen.push(n);
  s.attempt++;
  if (s.item.aliases.some((a) => norm(a) === n)) {
    s.done = true;
    const p = whoPoints();
    addScore(s.name, p);
    result('who', 'صح! هذا أنا ✨', `${s.attempt} تخمينات و${s.hints} تلميحات.`, p, s.item.name);
  } else if (s.attempt >= s.max) {
    s.done = true;
    result(
      'who',
      'الجواب كان…',
      'خلصت التخمينات. التلميحات الثلاثة كانت: ' + s.item.hints.map(esc).join(' · '),
      0,
      s.item.name,
    );
  } else {
    s.wrong.push(raw);
    renderWho('الإجابة مختلفة. جرّب مرة أخرى أو افتح تلميحاً.');
    $('whoInput').focus();
  }
}
function whoHint() {
  if (screen !== 'who' || state.done || coreBlocked() || state.hints >= 3) return;
  state.hints++;
  renderWho();
  $('whoInput').focus();
}
function revealWho() {
  if (screen !== 'who' || state.done || coreBlocked()) return;
  state.done = true;
  result('who', 'انكشف الجواب', state.item.hints.map(esc).join(' · '), 0, state.item.name);
}
const symbols = [
  '🍉',
  '🚀',
  '🐱',
  '🍕',
  '⚽',
  '🎧',
  '🌴',
  '🦋',
  '🎲',
  '🐬',
  '🍓',
  '🚗',
  '⭐',
  '🦊',
  '🎈',
  '🌙',
  '🧭',
  '💎',
  '🎸',
  '🌈',
  '🎨',
  '🦉',
  '🍩',
  '⛵',
  '🌻',
  '🐙',
  '🛸',
  '🍄',
  '🦁',
  '🏆',
  '🪁',
  '🧩',
];
const memoryThemes = {
  mix: symbols,
  animals: [
    '🐱',
    '🐶',
    '🦊',
    '🦁',
    '🐯',
    '🐮',
    '🐷',
    '🐸',
    '🐵',
    '🐔',
    '🐧',
    '🦉',
    '🦆',
    '🐝',
    '🦋',
    '🐌',
    '🐢',
    '🐍',
    '🐙',
    '🦀',
    '🐬',
    '🐳',
    '🦈',
    '🦒',
    '🦓',
    '🐘',
    '🦔',
    '🐇',
    '🐿️',
    '🦎',
  ],
  food: [
    '🍎',
    '🍊',
    '🍋',
    '🍌',
    '🍉',
    '🍇',
    '🍓',
    '🫐',
    '🍒',
    '🍑',
    '🥭',
    '🍍',
    '🥝',
    '🥑',
    '🥕',
    '🌽',
    '🍞',
    '🥐',
    '🥞',
    '🧀',
    '🍔',
    '🍕',
    '🌮',
    '🍿',
    '🍩',
    '🍪',
    '🎂',
    '🍫',
    '🍯',
    '🍦',
  ],
  travel: [
    '🚗',
    '🚕',
    '🚌',
    '🚎',
    '🚓',
    '🚑',
    '🚒',
    '🚚',
    '🚜',
    '🏎️',
    '🚲',
    '🛵',
    '🏍️',
    '🚆',
    '🚇',
    '🚊',
    '✈️',
    '🚁',
    '🚀',
    '🛸',
    '⛵',
    '🛶',
    '🚢',
    '⚓',
    '🏰',
    '⛺',
    '🗼',
    '🗽',
    '🎡',
    '🏝️',
  ],
};
function memoryElapsed(s = state) {
  return s.started ? Math.max(0, Math.floor(((s.pausedAt || Date.now()) - s.started) / 1000)) : 0;
}
function startMemory() {
  clearTimers();
  const value = Number($('difficulty').value),
    pairs = [4, 6, 8, 12, 16, 20, 24].includes(value) ? value : 8,
    theme = $('memoryTheme')?.value || 'mix',
    picked = shuffle(memoryThemes[theme] || symbols).slice(0, pairs);
  state = {
    id: 'memory',
    deck: shuffle([...picked, ...picked]),
    pairs,
    theme,
    up: [],
    matched: [],
    moves: 0,
    hintsUsed: 0,
    peek: false,
    locked: false,
    started: null,
    name: player(),
    done: false,
  };
  screen = 'memory';
  renderMemory();
  repeat(() => {
    if (screen === 'memory' && !state.done && state.started && $('memtime'))
      $('memtime').textContent = memoryElapsed() + ' ث';
  }, 500);
  goTop();
}
function renderMemory() {
  const s = state,
    columns = s.pairs <= 6 ? 4 : s.pairs <= 16 ? 4 : s.pairs <= 20 ? 5 : 6;
  setHTML(
    wrap(
      'memory',
      `<div class="stats"><div class="stat"><small>الحركات</small><b>${s.moves}</b></div><div class="stat"><small>الأزواج</small><b>${s.matched.length / 2} / ${s.pairs}</b></div><div class="stat"><small>الوقت</small><b id="memtime">${memoryElapsed(s)} ث</b></div></div><div class="progressline"><span style="width:${(s.matched.length / s.deck.length) * 100}%"></span></div><div class="memory" style="grid-template-columns:repeat(${columns},minmax(0,1fr))">${s.deck
        .map((v, i) => {
          const m = s.matched.includes(i),
            up = m || s.up.includes(i) || s.peek;
          return `<button class="memcard ${m ? 'matched' : up ? 'up' : ''}" onclick="flipCard(${i})" ${m || s.locked || s.done ? 'disabled' : ''} aria-label="${up ? esc(v) : 'بطاقة مقلوبة ' + (i + 1)}" aria-pressed="${up}">${up ? v : '✦'}</button>`;
        })
        .join(
          '',
        )}</div><p class="note center" role="status">${s.peek ? 'تذكر الأماكن! الكشف يختفي بعد ثانيتين.' : s.locked ? 'تذكر أماكن البطاقات…' : 'اختر بطاقتين وابحث عن الأزواج.'}</p><div class="actions"><button onclick="memoryHint()" ${s.done || s.locked || s.up.length || s.hintsUsed >= 2 ? 'disabled' : ''}>كشف قصير −12 (${2 - s.hintsUsed})</button><button class="quiet" onclick="setup('memory')">لوحة جديدة</button></div>`,
    ),
  );
}
function hideMemoryCards(s) {
  if (screen !== 'memory' || state !== s || s.done) return;
  if (coreBlocked()) {
    later(() => hideMemoryCards(s), 150);
    return;
  }
  const remaining = (s.endAt || 0) - Date.now();
  if (remaining > 0) {
    later(() => hideMemoryCards(s), remaining);
    return;
  }
  delete s.endAt;
  s.up = [];
  s.peek = false;
  s.locked = false;
  renderMemory();
}
function memoryHint() {
  if (
    screen !== 'memory' ||
    state.done ||
    coreBlocked() ||
    state.locked ||
    state.up.length ||
    state.hintsUsed >= 2
  )
    return;
  const s = state;
  s.started ??= Date.now();
  s.hintsUsed++;
  s.peek = true;
  s.locked = true;
  s.endAt = Date.now() + 2000;
  renderMemory();
  later(() => hideMemoryCards(s), 2000);
}
function flipCard(i) {
  if (
    screen !== 'memory' ||
    state.done ||
    coreBlocked() ||
    state.locked ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= state.deck.length
  )
    return;
  const s = state;
  if (s.up.includes(i) || s.matched.includes(i)) return;
  s.started ??= Date.now();
  s.up.push(i);
  tone();
  if (s.up.length === 2) {
    s.moves++;
    const [a, b] = s.up;
    if (s.deck[a] === s.deck[b]) {
      s.matched.push(a, b);
      s.up = [];
      if (s.matched.length === s.deck.length) {
        s.done = true;
        clearTimers();
        const secs = memoryElapsed(s),
          accuracy = Math.round((s.pairs / s.moves) * 100),
          p = Math.max(
            10,
            Math.min(100, 50 + s.pairs * 3 - (s.moves - s.pairs) * 2 - s.hintsUsed * 12),
          );
        addScore(s.name, p);
        renderMemory();
        later(() => {
          if (screen === 'memory' && state === s)
            result(
              'memory',
              'ذاكرتك قوية! 🧩',
              `${s.moves} حركة خلال ${secs} ثانية · كفاءة ${accuracy}% · ${s.hintsUsed} كشوف مساعدة.`,
              p,
            );
        }, 450);
        return;
      }
    } else {
      s.locked = true;
      s.endAt = Date.now() + 850;
      later(() => hideMemoryCards(s), 850);
    }
  }
  renderMemory();
}
function startMime() {
  const queue = shuffle(selectedItems());
  if (!queue.length) return toast('لا توجد كلمات في هذه الفئة.');
  state = {
    id: 'mime',
    players: [...store.players],
    duration: Number($('duration').value),
    rounds: Number($('rounds').value),
    turn: 0,
    queue,
    index: 0,
    results: Object.create(null),
    score: 0,
    stage: 'handoff',
    done: false,
  };
  screen = 'mime';
  mimeHandoff();
  goTop();
}
function mimeHandoff() {
  const s = state;
  clearTimers();
  s.stage = 'handoff';
  if (s.turn >= s.players.length * s.rounds) {
    s.done = true;
    return partyResult('mime', s);
  }
  const name = s.players[s.turn % s.players.length];
  setHTML(
    wrap(
      'mime',
      `<section class="panel center"><div class="resulticon">🎭</div><h2>الدور على ${esc(name)}</h2><p class="muted">الجولة ${Math.floor(s.turn / s.players.length) + 1} من ${s.rounds}</p><div class="spot"><p>خل الجهاز مع الممثّل.<br>الباقي لا يشوفون الكلمة!</p><p class="note">${s.duration} ثانية · بدون كلام</p></div><div class="actions"><button class="primary" onclick="mimeReady()">الجهاز عندي، جاهز!</button></div></section>`,
    ),
  );
}
function nextMimeWord() {
  const s = state,
    previous = s.word;
  if (s.index >= s.queue.length) {
    s.queue = shuffle(s.queue);
    s.index = 0;
    if (s.queue.length > 1 && items[s.queue[0]].name === previous)
      [s.queue[0], s.queue[1]] = [s.queue[1], s.queue[0]];
  }
  s.word = items[s.queue[s.index++]].name;
  s.hiddenWord = false;
}
function mimeReady() {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'handoff' || state.done) return;
  const s = state;
  s.score = 0;
  s.correct = 0;
  s.skips = 0;
  s.log = [];
  s.stage = 'active';
  s.endAt = Date.now() + s.duration * 1000;
  nextMimeWord();
  renderMime();
  repeat(() => tickParty('mime'), 200);
}
function renderMime() {
  const s = state;
  setHTML(
    wrap(
      'mime',
      `<section class="panel"><div class="timerline"><span class="pill">🎭 ${esc(s.players[s.turn % s.players.length])}</span><b class="countdown" id="partytime">${Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000))}</b><span class="pill">${s.score} نقطة</span></div><div class="spot"><small>مثّل بدون كلام</small><div class="huge word" style="color:var(--orange)">${s.hiddenWord ? '🔒 الكلمة مخفية' : esc(s.word)}</div></div><div class="actions"><button class="primary" onclick="mimeAnswer(true)">عرفوها! +10</button><button onclick="mimeAnswer(false)">تجاوز −2</button></div><p class="note">صح: ${s.correct} · تجاوز: ${s.skips}. نقاط الدور ما تنزل عن صفر.</p><div class="actions"><button onclick="toggleMimeWord()">${s.hiddenWord ? 'إظهار الكلمة' : 'إخفاء الكلمة'}</button><button onclick="undoMime()" ${!s.log.length ? 'disabled' : ''}>↶ تراجع عن آخر ضغطة</button><button class="quiet" onclick="endMime()">أنهِ الدور</button></div><p class="tiny center">إخفاء الكلمة يحافظ على السر؛ الوقت يظل شغالاً.</p></section>`,
    ),
  );
}
function toggleMimeWord() {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'active') return;
  if (Date.now() >= state.endAt) return endMime();
  state.hiddenWord = !state.hiddenWord;
  renderMime();
}
function undoMime() {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'active' || !state.log.length) return;
  if (Date.now() >= state.endAt) return endMime();
  const previous = state.log.pop();
  Object.assign(state, {
    word: previous.word,
    index: previous.index,
    queue: previous.queue,
    score: previous.score,
    correct: previous.correct,
    skips: previous.skips,
    hiddenWord: false,
  });
  renderMime();
}
function mimeAnswer(ok) {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'active' || state.done) return;
  if (Date.now() >= state.endAt) return endMime();
  const s = state;
  s.log.push({
    word: s.word,
    ok: !!ok,
    index: s.index,
    queue: [...s.queue],
    score: s.score,
    correct: s.correct,
    skips: s.skips,
  });
  if (ok) {
    s.score += 10;
    s.correct++;
    tone();
  } else {
    s.score = Math.max(0, s.score - 2);
    s.skips++;
  }
  nextMimeWord();
  renderMime();
}
function endMime() {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'active') return;
  clearTimers();
  const s = state,
    name = s.players[s.turn % s.players.length];
  s.stage = 'result';
  s.results[name] = (s.results[name] || 0) + s.score;
  addScore(name, s.score);
  tone(true);
  setHTML(
    wrap(
      'mime',
      `<section class="panel center"><div class="resulticon">⏱</div><h2>خلص دور ${esc(name)}</h2><div class="resultnum">${s.score} نقطة</div><p class="note">${s.correct} كلمات صحيحة · ${s.skips} تجاوزات</p>${s.log.length ? `<details class="history"><summary>الكلمات في هذا الدور (${s.log.length})</summary><div class="listchips">${s.log.map((v) => `<span>${v.ok ? '✓' : '↷'} ${esc(v.word)}</span>`).join('')}</div></details>` : ''}<div class="actions"><button class="primary" onclick="advanceMime()">الدور التالي ←</button></div></section>`,
    ),
  );
}
function advanceMime() {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'result') return;
  state.turn++;
  mimeHandoff();
}
function partyResult(id, s) {
  clearTimers();
  tone(true);
  setHTML(
    wrap(
      id,
      `<section class="panel success celebrate"><h2 class="center">نتيجة اللمّة 🏆</h2><p class="note center" style="margin-bottom:18px">هذي نقاط الجلسة. انضافت للوحة النقاط العامة.</p>${boardHTML(s.players, s.results)}<div class="actions"><button class="primary" onclick="setup('${id}')">جلسة يديدة</button><button onclick="home()">نغيّر اللعبة</button></div></section>`,
    ),
  );
}
function tickParty(id) {
  if (screen !== id || state.stage !== 'active' || state.pausedAt) return;
  const t = Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000));
  if ($('partytime')) $('partytime').textContent = t;
  if (t === 0) {
    if (id === 'mime') endMime();
    else secretEnd(false);
  }
}
function startSecret() {
  const pool = shuffle(selectedItems());
  if (!pool.length) return toast('لا توجد كلمات في هذه الفئة.');
  state = {
    id: 'secret',
    players: [...store.players],
    duration: Number($('duration').value),
    questionLimit: Number($('questionLimit')?.value || 20),
    rounds: Number($('rounds')?.value || 1),
    pool,
    index: 0,
    turn: 0,
    results: Object.create(null),
    stage: 'handoff',
    done: false,
  };
  screen = 'secret';
  secretHandoff();
  goTop();
}
function secretTurnIndex() {
  return state.turn % state.players.length;
}
function secretHandoff() {
  const s = state;
  clearTimers();
  if (s.turn >= s.players.length * s.rounds) {
    s.done = true;
    return partyResult('secret', s);
  }
  s.stage = 'handoff';
  s.questions = 0;
  s.questionLog = [];
  s.word = '';
  const name = s.players[secretTurnIndex()];
  setHTML(
    wrap(
      'secret',
      `<section class="panel center"><div class="resulticon">🤫</div><h2>${esc(name)} يختار الكلمة</h2><p class="note">الجولة ${Math.floor(s.turn / s.players.length) + 1} من ${s.rounds} · الدور ${secretTurnIndex() + 1} من ${s.players.length}. خل الجهاز مع صاحب الدور وحده.</p><div class="actions"><button class="primary" onclick="revealSecret()">أنا ${esc(name)}، أرني الكلمة</button></div></section>`,
    ),
  );
}
function revealSecret() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'handoff') return;
  const s = state;
  s.stage = 'revealed';
  if (s.index >= s.pool.length) {
    s.pool = shuffle(s.pool);
    s.index = 0;
  }
  s.word = items[s.pool[s.index++]].name;
  setHTML(
    wrap(
      'secret',
      `<section class="panel"><div class="spot"><small>كلمة السر · لا تعرضها لأحد</small><div class="secret">${esc(s.word)}</div></div><label for="customword">أو اكتب كلمة من عندك (اختياري)</label><input id="customword" maxlength="40" autocomplete="off" placeholder="اتركها فارغة لاستعمال الكلمة المعروضة"><div class="actions"><button class="primary" onclick="hideSecret()">إخفاء وتمرير الجهاز</button></div></section>`,
    ),
  );
}
function hideSecret() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'revealed') return;
  const custom = $('customword').value.trim();
  if (custom) state.word = custom;
  state.stage = 'hidden';
  setHTML(
    wrap(
      'secret',
      `<section class="panel center"><div class="resulticon">🔒</div><h2>اختفت كلمة السر</h2><p class="note">مرّر الجهاز للباقين. اسألوا ${esc(state.players[secretTurnIndex()])} أسئلة جوابها نعم أو لا، وخمنوا بالكلام.</p><div class="actions"><button class="primary" onclick="secretReady()">كلنا جاهزون، شغّل الوقت</button></div></section>`,
    ),
  );
}
function secretReady() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'hidden') return;
  state.stage = 'active';
  state.endAt = Date.now() + state.duration * 1000;
  renderSecret();
  repeat(() => tickParty('secret'), 200);
}
function renderSecret() {
  const s = state,
    remaining = s.questionLimit - s.questions;
  setHTML(
    wrap(
      'secret',
      `<section class="panel"><div class="timerline"><span class="pill">${esc(s.players[secretTurnIndex()])} يعرف السر</span><b class="countdown" id="partytime">${Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000))}</b></div><div class="spot"><div style="font-size:40px">🔐</div><h2>${remaining ? 'اسألوا… وخمنوا' : 'آخر تخمين!'}</h2><p class="note">الأسئلة ${s.questions} / ${s.questionLimit} · باقي ${remaining}</p><div class="progressline"><span style="width:${(s.questions / s.questionLimit) * 100}%"></span></div></div><p class="note">بعد كل سؤال سجّلوا إجابة صاحب الكلمة:</p><div class="actions"><button onclick="secretQuestion('yes')" ${!remaining ? 'disabled' : ''}>نعم ✓</button><button onclick="secretQuestion('no')" ${!remaining ? 'disabled' : ''}>لا ✕</button><button onclick="secretQuestion('unknown')" ${!remaining ? 'disabled' : ''}>مو متأكد / غير ذلك</button></div>${s.questionLog.length ? `<div class="listchips" aria-label="سجل إجابات الأسئلة">${s.questionLog.map((v, i) => `<span>${i + 1}: ${v === 'yes' ? 'نعم' : v === 'no' ? 'لا' : 'غير محدد'}</span>`).join('')}</div>` : ''}<div class="actions"><button onclick="undoSecretQuestion()" ${!s.questions ? 'disabled' : ''}>↶ تراجع عن سؤال</button><button class="primary" onclick="secretEnd(true)">عرفناها! ✓</button></div><p class="note">بعد السؤال الأخير يبقى تخمين أخير بالكلام قبل كشف الكلمة. الأسئلة والتخمينات تحصل بينكم، والجهاز يسجل العدد.</p><div class="actions"><button class="quiet" onclick="secretEnd(false)">ما عرفناها، اكشف السر</button></div></section>`,
    ),
  );
}
function secretQuestion(answer = 'unknown') {
  if (
    screen !== 'secret' ||
    coreBlocked() ||
    state.stage !== 'active' ||
    state.questions >= state.questionLimit
  )
    return;
  if (Date.now() >= state.endAt) return secretEnd(false);
  state.questionLog.push(['yes', 'no'].includes(answer) ? answer : 'unknown');
  state.questions++;
  renderSecret();
}
function undoSecretQuestion() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'active' || !state.questions) return;
  if (Date.now() >= state.endAt) return secretEnd(false);
  state.questionLog.pop();
  state.questions--;
  renderSecret();
}
function secretEnd(won) {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'active') return;
  if (won && Date.now() >= state.endAt) won = false;
  clearTimers();
  const s = state;
  s.stage = won ? 'award' : 'result';
  setHTML(
    wrap(
      'secret',
      `<section class="panel center"><div class="resulticon">${won ? '🎉' : '⏱'}</div><h2>${won ? 'عرفتوا السر!' : 'انكشف السر'}</h2><div class="secret">${esc(s.word)}</div><p class="note">${s.questions} أسئلة من ${s.questionLimit}</p>${won ? `<div class="fields"><div class="field full"><label for="winner">من قال الجواب الصحيح أولاً؟</label><select id="winner">${s.players.map((n, i) => (i === secretTurnIndex() ? '' : `<option value="${i}">${esc(n)}</option>`)).join('')}</select></div></div><div class="actions"><button class="primary" onclick="awardSecret()">احسب النقاط ونكمل</button></div>` : `<div class="actions"><button class="primary" onclick="advanceSecret()">الدور التالي ←</button></div>`}</section>`,
    ),
  );
}
function awardSecret() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'award') return;
  const s = state,
    i = Number($('winner').value);
  if (i === secretTurnIndex() || !s.players[i]) return;
  const winner = s.players[i],
    thinker = s.players[secretTurnIndex()],
    p = Math.max(10, 30 - Math.round((s.questions * 20) / s.questionLimit));
  s.results[winner] = (s.results[winner] || 0) + p;
  s.results[thinker] = (s.results[thinker] || 0) + 10;
  addScore(winner, p);
  addScore(thinker, 10);
  s.stage = 'result';
  tone(true);
  advanceSecret();
}
function advanceSecret() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'result') return;
  state.turn++;
  secretHandoff();
}
function startReaction() {
  const players = $('group').checked ? [...store.players] : [player()],
    value = Number($('trials')?.value || 3),
    trials = [3, 5, 7].includes(value) ? value : 3;
  state = {
    id: 'reaction',
    players,
    trials,
    turn: 0,
    results: Object.create(null),
    records: Object.create(null),
    stage: 'idle',
    done: false,
  };
  for (const n of players) {
    state.results[n] = [];
    state.records[n] = [];
  }
  screen = 'reaction';
  renderReaction();
  goTop();
}
function reactionName() {
  return state.players[state.turn % state.players.length];
}
function renderReaction() {
  const s = state,
    name = reactionName(),
    times = s.results[name],
    texts = {
      idle: ['جاهز؟ اضغط للبدء', 'بعدها انتظر اللون الأخضر'],
      waiting: ['انتظر…', 'لا تضغط قبل الأخضر'],
      ready: ['الآن! ⚡', 'اضغط بسرعة'],
      result: [
        `${s.last} ملّي ثانية`,
        s.falseStart ? 'ضغط مبكر! احتُسبت 1500 ملّي ثانية' : 'وقت استجابتك في هذه المحاولة',
      ],
    },
    t = texts[s.stage];
  setHTML(
    wrap(
      'reaction',
      `<div class="stats"><div class="stat"><small>الدور على</small><b style="font-size:19px">${esc(name)}</b></div><div class="stat"><small>المحاولة</small><b>${Math.floor(s.turn / s.players.length) + 1} / ${s.trials}</b></div><div class="stat"><small>متوسطك الحالي</small><b>${times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) + ' ms' : '—'}</b></div></div><button class="reaction ${s.stage}" onpointerdown="event.preventDefault();reactionTap()" onclick="if(event.detail===0)reactionTap()" aria-label="${t[0]}"><span>${t[0]}</span><small>${t[1]}</small></button>${s.stage === 'result' ? '<div class="actions"><button class="primary" onclick="advanceReaction()">المحاولة التالية ←</button></div>' : ''}<p class="note center">${s.trials} محاولات لكل لاعب · لمس أو ضغط المسافة · نفس الجهاز يعطي مقارنة أفضل.</p>${times.length ? `<div class="listchips" style="justify-content:center">${s.records[name].map((v, i) => `<span>${i + 1}: ${v.falseStart ? '⚠ ' : ''}${v.time} ms</span>`).join('')}</div>` : ''}`,
    ),
  );
}
function reactionTap() {
  if (screen !== 'reaction' || state.done || coreBlocked()) return;
  const s = state;
  if (s.stage === 'idle') {
    s.stage = 'waiting';
    s.falseStart = false;
    renderReaction();
    s.waitTimer = later(
      () => {
        if (screen === 'reaction' && state === s && s.stage === 'waiting' && !coreBlocked()) {
          s.stage = 'ready';
          renderReaction();
          s.readyAt = performance.now();
        }
      },
      1000 + randInt(3501),
    );
  } else if (s.stage === 'waiting') {
    clearTimeout(s.waitTimer);
    s.falseStart = true;
    s.last = 1500;
    recordReaction();
  } else if (s.stage === 'ready') {
    s.last = Math.max(1, Math.round(performance.now() - s.readyAt));
    s.falseStart = false;
    recordReaction();
  }
}
function recordReaction() {
  if (screen !== 'reaction' || state.done || !['waiting', 'ready'].includes(state.stage)) return;
  state.results[reactionName()].push(state.last);
  state.records[reactionName()].push({
    time: state.last,
    falseStart: state.falseStart,
  });
  state.stage = 'result';
  renderReaction();
  tone();
}
function reactionStats(name) {
  const s = state,
    a = [...s.results[name]].sort((x, y) => x - y),
    valid = s.records[name].filter((v) => !v.falseStart).map((v) => v.time);
  return {
    n: name,
    avg: Math.round(a.reduce((x, y) => x + y, 0) / a.length),
    median: a[Math.floor(a.length / 2)],
    best: valid.length ? Math.min(...valid) : null,
    falseStarts: s.records[name].filter((v) => v.falseStart).length,
  };
}
function advanceReaction() {
  if (screen !== 'reaction' || coreBlocked() || state.stage !== 'result') return;
  const s = state;
  s.turn++;
  if (s.turn >= s.players.length * s.trials) {
    s.done = true;
    clearTimers();
    const ranked = s.players.map(reactionStats).sort((a, b) => a.avg - b.avg);
    let lastAvg = null,
      rank = -1;
    for (let i = 0; i < ranked.length; i++) {
      const v = ranked[i];
      if (v.avg !== lastAvg) rank = i;
      lastAvg = v.avg;
      const points =
        s.players.length === 1
          ? Math.min(50, Math.max(5, Math.round(15000 / v.avg)))
          : Math.max(5, 30 - rank * 5);
      v.points = points;
      addScore(v.n, points);
    }
    tone(true);
    setHTML(
      wrap(
        'reaction',
        `<section class="panel success"><h2 class="center">نتيجة السرعة ⚡</h2><p class="note center" style="margin-bottom:18px">الأقل بالمتوسط يفوز · ${s.trials} محاولات لكل لاعب · المتساوون بالمتوسط متعادلون.</p><div class="board">${ranked.map((v) => `<div class="boardrow"><span>${v.avg === ranked[0].avg ? '🥇' : '⚡'}</span><div class="name"><b>${esc(v.n)}</b><small>+${v.points} نقطة · أسرع ضغطة: ${v.best === null ? 'لا توجد ضغطة صحيحة' : v.best + ' ms'}</small><small>الوسيط: ${v.median} ms · ضغط مبكر: ${v.falseStarts}</small></div><div class="score">${v.avg}<small>متوسط ms</small></div></div>`).join('')}</div><p class="note">الضغط المبكر مشمول بالمتوسط والوسيط بعقوبة 1500 ms، ويُستبعد من أسرع ضغطة.</p><div class="actions"><button class="primary" onclick="setup('reaction')">تحدي جديد</button><button onclick="home()">الألعاب</button></div></section>`,
      ),
    );
  } else {
    s.stage = 'idle';
    renderReaction();
  }
}

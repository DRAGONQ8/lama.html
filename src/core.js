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
// Keep display names stable across typed input, backup imports, and reloads.
function normalizePlayerName(value) {
  return typeof value === 'string'
    ? value
        .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660))
        .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
        .trim()
        .replace(/\s+/g, ' ')
    : '';
}
function safeCounter(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function sumCounter(a, b) {
  return Math.min(Number.MAX_SAFE_INTEGER, a + b);
}
function normalizeProgressBase(raw, strict = false) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid progress');
  if (!Array.isArray(raw.players) || raw.players.length < 1 || raw.players.length > 12)
    throw Error('Invalid players');
  const players = [],
    used = new Set();
  for (const value of raw.players) {
    let name = normalizePlayerName(value);
    if (!name || name.length > 24) throw Error('Invalid player name');
    if (used.has(norm(name))) {
      if (strict) throw Error('Duplicate player');
      const original = name;
      let suffix = 2;
      do {
        const ending = ' ' + suffix++;
        name = original.slice(0, 24 - ending.length).trimEnd() + ending;
      } while (used.has(norm(name)));
    }
    used.add(norm(name));
    players.push(name);
  }
  const scores = Object.create(null);
  if (
    raw.scores !== undefined &&
    (!raw.scores || typeof raw.scores !== 'object' || Array.isArray(raw.scores))
  ) {
    if (strict) throw Error('Invalid scores');
  } else {
    for (const [key, value] of Object.entries(raw.scores || {})) {
      const name = normalizePlayerName(key);
      if (
        !name ||
        name.length > 24 ||
        !value ||
        !safeCounter(value.points) ||
        !safeCounter(value.rounds)
      ) {
        if (strict) throw Error('Invalid score');
        continue;
      }
      const old = scores[name];
      scores[name] = {
        points: sumCounter(old?.points || 0, value.points),
        rounds: sumCounter(old?.rounds || 0, value.rounds),
      };
    }
  }
  return { players, scores, sound: raw.sound === true };
}
let store = {
  players: ['أنا', 'صاحبي'],
  scores: Object.create(null),
  sound: false,
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('lamma-v1') || 'null');
  if (saved) store = normalizeProgressBase(saved);
} catch (e) {}

function legacyAddScore(name, points) {
  name = normalizePlayerName(name);
  if (!name || name.length > 24 || !Number.isFinite(points)) return false;
  const earned = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(points))),
    old = store.scores[name];
  store.scores[name] = {
    points: sumCounter(old?.points || 0, earned),
    rounds: sumCounter(old?.rounds || 0, 1),
  };
  save();
  return true;
}
let audioCtx;
function tone(win = false) {
  const volume = store.extra?.volume ?? 70;
  if (!store.sound || !volume) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(win ? 660 : 430, audioCtx.currentTime);
    if (win) o.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
    const peak = 0.045 * (volume / 100);
    g.gain.setValueAtTime(peak, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(Math.max(0.000001, peak / 80), audioCtx.currentTime + 0.25);
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
  const id = setTimeout(() => {
    const index = timers.indexOf(id);
    if (index >= 0) timers.splice(index, 1);
    f();
  }, ms);
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
  if (!state?.done) $('celebration')?.remove();
  $('app').innerHTML = latin(html);
  captureSoloSession();
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
    'طابق الصور أو أسماءها، وتنافس في مواجهة ذاكرة للشخصين.',
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
    : normalizePlayerName($('player')?.selectedOptions?.[0]?.textContent) ||
      store.players[Number($('player')?.value || 0)] ||
      store.players[0];

function boardHTML(names = store.players, results = null) {
  let previous = null,
    rank = 0;
  return `<div class="board">${names
    .map((n) => ({
      n,
      points: results ? results[n] || 0 : store.scores[n]?.points || 0,
      rounds: store.scores[n]?.rounds || 0,
    }))
    .sort((a, b) => b.points - a.points)
    .map((v, i) => {
      if (v.points !== previous) rank = i + 1;
      previous = v.points;
      return `<div class="boardrow"><span class="rank">${rank === 1 ? '🥇' : rank}</span><div class="name"><b>${esc(v.n)}</b>${!results ? `<small>${v.rounds} جولة</small>` : ''}</div><span class="score">${v.points}</span></div>`;
    })
    .join('')}</div>`;
}

let oldScores = null;
function resetScores() {
  oldScores = JSON.parse(JSON.stringify(store.scores));
  store.scores = Object.create(null);
  save({ replace: true });
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
    save({ replace: true });
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
  const pool = selectedItems(),
    query = norm($('poolSearch')?.value || ''),
    a = pool.filter((i) => !query || items[i].aliases.some((name) => norm(name).includes(query)));
  $('poolList').innerHTML = a.map((i) => `<span>${esc(items[i].name)}</span>`).join('');
  $('poolSummary').textContent = `شوف الأشياء المتاحة (${pool.length})`;
  if ($('poolSearchCount'))
    $('poolSearchCount').textContent = a.length
      ? `${a.length} أسماء تطابق البحث من ${pool.length}. البحث لمراجعة القائمة؛ لا يغيّر كلمات الجولة.`
      : 'ما لقينا الاسم. جرّب اسمًا آخر أو أضفه من «قاعدة التخمين».';
}
function selectedItems() {
  const c = $('category')?.value || 'all';
  return items.map((v, i) => i).filter((i) => c === 'all' || items[i].cat === c);
}
function coreBlocked() {
  return !!state?.pausedAt || !$('modalback').hidden || !!$('pausecover');
}
// A removed control can still dispatch its inline handler (for example after
// a rapid second tap). Bind controls to the state and DOM view that created them.
const guardedCoreControls = new WeakSet();
function guardCoreView() {
  const owner = state,
    view = screen,
    root = $('app');
  for (const control of root.querySelectorAll(
    '[onclick],[onpointerdown],[oninput],[onchange],[onsubmit]',
  )) {
    if (guardedCoreControls.has(control)) continue;
    guardedCoreControls.add(control);
    for (const type of ['click', 'pointerdown', 'input', 'change', 'submit']) {
      if (!control.hasAttribute('on' + type)) continue;
      control.addEventListener(
        type,
        (event) => {
          if (state === owner && screen === view && control.isConnected && root.contains(control))
            return;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true,
      );
    }
  }
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
    body = `<p class="muted">طابق الأزواج بأقل حركات. اختر من 8 إلى 48 بطاقة وثيمة البطاقات. عندك كشفتان قصيرتان، كل واحدة تخصم 12 نقطة.</p><div class="fields"><div class="field"><label for="difficulty">حجم اللوحة</label><select id="difficulty"><option value="4">بداية · 8 بطاقات</option><option value="6">خفيف · 12 بطاقة</option><option value="8" selected>متوسط · 16 بطاقة</option><option value="12">تحدي · 24 بطاقة</option><option value="16">قوي · 32 بطاقة</option><option value="20">خبير · 40 بطاقة</option><option value="24">أسطوري · 48 بطاقة</option></select></div><div class="field"><label for="memoryTheme">شكل البطاقات</label><select id="memoryTheme"><option value="mix">عالم متنوع</option><option value="animals">حيوانات</option><option value="food">أطعمة وفواكه</option><option value="travel">رحلات وأماكن</option></select></div><div class="field full"><label for="memorymode">طريقة المطابقة</label><select id="memorymode"><option value="pictures">صورتان متطابقتان</option><option value="meaning">صورة واسمها · ذاكرة ومعنى</option></select></div>${playerField()}</div><div class="actions"><button class="primary" onclick="startMemory()">جهّز البطاقات</button></div>`;
  } else if (id === 'reaction') {
    body = `<p class="muted">انتظر الأخضر ثم اضغط أو استخدم المسافة. اختر 3 أو 5 أو 7 محاولات؛ الفوز لأقل متوسط وقت، والضغط المبكر يحسب 1500 ملّي ثانية.</p><div class="fields"><div class="field full"><label for="trials">المحاولات لكل لاعب</label><select id="trials"><option value="3">سريع · 3 محاولات</option><option value="5" selected>متوازن · 5 محاولات</option><option value="7">دقيق · 7 محاولات</option></select></div><div class="field full"><label for="reactionmode">نوع الإشارة</label><select id="reactionmode"><option value="classic">الأخضر · سرعة الاستجابة</option><option value="focus">تمييز الإشارة · تجاهل البرتقالي</option></select></div>${playerField('من يلعب وحده؟')}</div><div class="check" style="margin-top:15px"><input type="checkbox" id="group"><label for="group">نلعب جميعاً بالتناوب (${store.players.length} لاعبين)</label></div><div class="actions"><button class="primary" onclick="startReaction()">ابدأ تحدي السرعة</button></div><p class="note">تعرض النتيجة المتوسط والوسيط وأسرع ضغطة وعدد الضغطات المبكرة. جرّبوا نفس الجهاز للمقارنة.</p>`;
  } else if (id === 'mime') {
    body = `<p class="muted">شاهد الكلمة ومثّلها بدون كلام، والباقي يخمنون! الصحيح +10، والتجاوز −2. تقدر تخفي الكلمة مؤقتاً أو تتراجع عن ضغطة بالغلط.</p><div class="fields"><div class="field full">${catField()}</div><div class="field"><label for="duration">وقت كل دور</label><select id="duration"><option value="30">30 ثانية</option><option value="45">45 ثانية</option><option value="60" selected>60 ثانية</option><option value="90">90 ثانية</option><option value="120">دقيقتان</option></select></div><div class="field"><label for="rounds">الأدوار لكل لاعب</label><select id="rounds"><option value="1">دور واحد</option><option value="2" selected>دوران</option><option value="3">3 أدوار</option><option value="5">5 أدوار</option></select></div></div><div class="field"><label for="mimerule">طريقة التمثيل</label><select id="mimerule"><option value="classic">التمثيل الحر</option><option value="scene">تحدي المشهد · قيد لكل كلمة</option></select></div><p class="note">يلعبون: ${store.players.map(esc).join('، ')}. النقاط للممثّل، وفي نهاية الدور تشوفون الكلمات اللي لعبتوها.</p><div class="actions"><button class="primary" onclick="startMime()">نبدأ اللمّة</button><button onclick="openPeople()">عدّل اللاعبين</button></div>`;
  } else if (id === 'secret') {
    body = `<p class="muted">صاحب الدور يشاهد كلمة سر أو يكتب كلمة من عنده. الباقي يسألونه بنعم أو لا، ويسجلون الإجابات حتى يكتشفون السر.</p><div class="fields"><div class="field full">${catField()}</div><div class="field"><label for="duration">وقت التخمين</label><select id="duration"><option value="60">دقيقة</option><option value="120" selected>دقيقتان</option><option value="180">3 دقائق</option><option value="240">4 دقائق</option></select></div><div class="field"><label for="questionLimit">حد الأسئلة</label><select id="questionLimit"><option value="10">10 أسئلة · سريع</option><option value="20" selected>20 سؤالاً · عادي</option><option value="30">30 سؤالاً · طويل</option></select></div><div class="field full"><label for="rounds">الأدوار لكل لاعب</label><select id="rounds"><option value="1">دور واحد</option><option value="2">دوران</option><option value="3">3 أدوار</option></select></div></div><p class="note">صاحب الجواب الصحيح يكسب 10–30 نقطة، وصاحب الكلمة 10 نقاط. بعد آخر سؤال لكم تخمين أخير.</p><div class="actions"><button class="primary" onclick="startSecret()">نبدأ أول دور</button><button onclick="openPeople()">عدّل اللاعبين</button></div>`;
  }
  setHTML(wrap(id, `<section class="panel">${body}</section>`));
  addCoreRules(id);
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

function coreChoice(id, label, options) {
  return `<div class="field full"><label for="${id}">${label}</label><select id="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></div>`;
}
function addCoreRules(id) {
  const fields = $('app').querySelector('.fields');
  const choices = {
    finder: coreChoice('finderRule', 'طريقة الاتفاق على الرقم', [
      ['classic', 'رقم تفكر فيه · إجابات على الثقة'],
      ['sealed', 'الصندوق السري · سجّل الرقم قبل الأسئلة'],
    ]),
    solo: coreChoice('numberQuest', 'شكل التحدي', [
      ['classic', 'قفل واحد'],
      ['locks', 'مهمة فتح 3 أقفال · نتيجة واحدة من 100'],
    ]),
    mind: coreChoice('mindStyle', 'طريقة التحقيق', [
      ['auto', 'الأسئلة المقترحة تلقائيًا'],
      ['investigate', 'أنت تختار السؤال الأكثر فائدة'],
    ]),
    memory: `${coreChoice('memoryplay', 'تلعب مع من؟', [
      ['solo', 'بمفردك'],
      ['duo', 'مواجهة ذاكرة · شخصان'],
    ])}<div class="field full" id="memorySecondField" hidden><label for="memorysecond">اللاعب الثاني</label><select id="memorysecond">${store.players.map((name, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></div>`,
    reaction: coreChoice('reactionrule', 'نوع الاستجابة', [
      ['standard', 'اضغط عند الإشارة'],
      ['choice', 'قرار سريع · اختر اتجاه السهم'],
    ]),
    secret: coreChoice('secretRule', 'طريقة السؤال', [
      ['classic', 'أسئلة حرة بالتعاون'],
      ['relay', 'تحقيق بالتناوب · اكتب السؤال أولًا'],
    ]),
  };
  if (choices[id]) fields?.insertAdjacentHTML('beforeend', choices[id]);
  if (id === 'mind') {
    $('poolList')?.insertAdjacentHTML(
      'beforebegin',
      '<label for="poolSearch">ابحث عن الشيء قبل اللعب</label><input id="poolSearch" maxlength="50" autocomplete="off" placeholder="اكتب الاسم أو اسمه البديل…" oninput="refreshPoolList()"><p class="tiny" id="poolSearchCount" role="status">البحث لمراجعة القائمة؛ لا يغيّر كلمات الجولة.</p>',
    );
  }
  if (id === 'memory') {
    fields?.insertAdjacentHTML(
      'beforeend',
      `${coreChoice('memoryPreview', 'نظرة أولى على اللوحة', [
        ['0', 'بدون كشف · تحدي كامل'],
        ['3', 'احفظها 3 ثوانٍ · تستعمل مساعدة واحدة (−12)'],
        ['5', 'احفظها 5 ثوانٍ · تستعمل مساعدة واحدة (−12)'],
      ])}${coreChoice('memoryPace', 'وقت تذكّر البطاقتين بعد الخطأ', [
        ['850', 'عادي · أقل من ثانية'],
        ['1500', 'هادئ · ثانية ونصف'],
        ['600', 'سريع · جزء من الثانية'],
      ])}`,
    );
    $('memoryplay').setAttribute('onchange', 'memoryPlayChanged()');
    memoryPlayChanged();
  }
  if (id === 'mime')
    $('mimerule')?.insertAdjacentHTML(
      'beforeend',
      '<option value="story">حكاية بثلاث كلمات · 3 تجاوزات فقط</option>',
    );
}
function memoryPlayChanged() {
  if (screen !== 'setup' || state?.id !== 'memory') return;
  const duo = $('memoryplay')?.value === 'duo';
  $('memorySecondField').hidden = !duo;
  if ($('memoryPreview')) {
    $('memoryPreview').disabled = duo;
    if (duo) $('memoryPreview').value = '0';
  }
}
function startNumber(id) {
  if (screen !== 'setup' || state?.id !== id || coreBlocked()) return;
  try {
    const free = id === 'finder' && $('preset').value === 'free';
    const [l, h] = free ? [null, null] : bounds();
    const name = player();
    if (id === 'finder') {
      const sealed = $('finderRule')?.value === 'sealed';
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
        initialCount: free ? null : h - l + 1n,
        history: [],
        name,
        done: false,
        sealed,
        stage: sealed ? 'choose-number' : 'active',
        privateToken: storageToken(),
      };
      screen = 'finder';
      if (sealed) renderFinderLock();
      else renderFinder();
    } else {
      const mode = $('numberMode')?.value || 'normal',
        adjust = { normal: 0, easy: 3, hard: -2 }[mode] || 0;
      const quest =
        $('numberQuest')?.value === 'locks' && !dailyRun && !tourney?.active && !activeRoute;
      if (quest && h - l + 1n < 3n) throw Error('مهمة الأقفال تحتاج نطاقًا فيه 3 أرقام على الأقل.');
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
        soloPad: matchMedia('(pointer: coarse)').matches && innerWidth <= 720,
        mode,
        name,
        done: false,
        quest,
        lockResults: [],
        lockStage: 'active',
        lockVersion: 0,
      };
      screen = 'solo';
      renderSolo();
    }
    goTop();
  } catch (e) {
    toast(e.message);
  }
}
function renderFinderLock() {
  const s = state;
  setHTML(
    wrap(
      'finder',
      `<section class="panel private-vault center"><div class="resulticon">🔐</div><h2>صاحب الرقم يسجّل السر وحده</h2><p class="note">${s.free ? 'اختر عددًا صحيحًا حتى 60 خانة.' : `اختر رقمًا من ${fmt(s.l)} إلى ${fmt(s.h)}.`} بعد الإخفاء لن يظهر الرقم في شاشة الأسئلة؛ الإجابات المتناقضة مع الرقم تُرفض.</p><form onsubmit="event.preventDefault();sealFinder('${s.privateToken}')"><label for="finderPrivateInput">الرقم السري</label><input id="finderPrivateInput" dir="ltr" inputmode="numeric" type="password" maxlength="90" autocomplete="off"><div class="actions"><button class="primary" type="submit">اقفل الرقم ومرّر الجهاز</button></div></form></section>`,
    ),
  );
  guardCoreView();
}
function sealFinder(token = state?.privateToken) {
  if (
    screen !== 'finder' ||
    state.done ||
    coreBlocked() ||
    state.stage !== 'choose-number' ||
    state.privateToken !== token
  )
    return;
  let value;
  try {
    value = integer($('finderPrivateInput').value);
  } catch (error) {
    return toast(error.message);
  }
  if (!state.free && (value < state.l || value > state.h))
    return toast('الرقم خارج النطاق المتفق عليه.');
  state.sealedSecret = value;
  state.stage = 'active';
  renderFinder('الرقم مقفل. جاوب بحسب السر؛ الإجابة غير المطابقة لا تستهلك محاولة.');
}
function renderFinder(msg = '') {
  const s = state;
  s.finderVersion = (s.finderVersion || 0) + 1;
  const count = s.l !== null && s.h !== null ? s.h - s.l + 1n : null;
  setHTML(
    wrap(
      'finder',
      `<div class="stats"><div class="stat"><small>التخمين الحالي</small><b>${s.attempt}</b></div><div class="stat"><small>${s.max ? 'معيار تخمينات المنتصف' : 'استكشاف النطاق'}</small><b>${s.max || '∞'}</b></div><div class="stat"><small>الاحتمالات الباقية</small><b style="font-size:17px;overflow-wrap:anywhere">${count === null ? 'غير محددة' : fmt(count)}</b></div></div><section class="panel"><div class="spot"><small>هل الرقم اللي اخترته هو…</small><div class="huge">${fmt(s.guess)}</div><div class="range">${s.l === null ? '−∞' : fmt(s.l)} ≤ ? ≤ ${s.h === null ? '+∞' : fmt(s.h)}</div></div><div class="answerrow"><button class="warm" onclick="finderAnswer('higher')">⬆ أكبر<small>رقمه أكبر من التخمين</small></button><button class="primary" onclick="finderAnswer('correct')">✓ صح<small>هذا الرقم بالضبط</small></button><button class="rose" onclick="finderAnswer('lower')">⬇ أصغر<small>رقمه أصغر من التخمين</small></button></div><p class="note" role="status">${msg || (count === 1n ? 'باقي رقم واحد. اضغط «صح» إذا هو الرقم اللي اخترته.' : s.phase === 'explore' ? 'نحدد الاتجاه ونوسّع البحث، وبعدها نضيّق النطاق.' : 'كل إجابة تقرّبنا من الرقم. جاوب حسب الرقم السرّي.')}</p><div class="actions"><button onclick="undoFinder()" ${!s.history.length ? 'disabled' : ''}>↶ تراجع خطوة</button><button class="quiet" onclick="setup('finder')">نطاق يديد</button></div>${
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
  if (count !== null) {
    const split = splitNumberRange(s.l, s.h, s.guess),
      guaranteed = split.worst ? 1 + limit(0n, split.worst - 1n) : 1,
      progress = s.initialCount ? Number(100n - (count * 100n) / s.initialCount) : null,
      panel = $('app').querySelector('.panel'),
      coaching = `<p class="note center" role="status">${count === 1n ? 'بقي رقم واحد مؤكد داخل النطاق.' : `بهذا السؤال ثم العودة للمنتصف نحتاج إلى ${guaranteed} تخمينات إضافية كحد أقصى، منها التخمين المعروض.`}${progress !== null ? ` استبعدنا ${progress}% من الاحتمالات.` : ''}</p>`;
    panel?.insertAdjacentHTML(
      'afterbegin',
      `${progress !== null ? `<div class="progressline" role="progressbar" aria-label="استبعاد الاحتمالات" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>` : ''}${coaching}`,
    );
    if (s.guess === s.h)
      $('app').querySelector('button[onclick="finderAnswer(\'higher\')"]').disabled = true;
    if (s.guess === s.l)
      $('app').querySelector('button[onclick="finderAnswer(\'lower\')"]').disabled = true;
    panel?.insertAdjacentHTML(
      'beforeend',
      `<details class="strategy-lens"><summary>⚖ سؤال جاهز، أو اختر تخمينك</summary><div class="split-legend"><span>↓ أصغر: <bdi>${fmt(split.lower)}</bdi></span><span>✓ نفس الرقم: 1</span><span>↑ أكبر: <bdi>${fmt(split.higher)}</bdi></span></div><p class="tiny">الأعداد حسب النطاق الذي اتفقتوا عليه وإجابات صاحب الرقم. المنتصف يعطي تقسيمًا متوازنًا؛ تقدر تجرب سؤالًا من اختيارك.</p>${count > 1n ? `<form onsubmit="event.preventDefault();planFinderGuess(${s.finderVersion})"><label for="finderGuessInput">بدّل التخمين المعروض دون احتساب جواب</label><div class="guess-entry"><input id="finderGuessInput" inputmode="numeric" dir="ltr" maxlength="90" value="${s.guess}"><button type="submit">اعرض السؤال</button></div>${!split.balanced ? `<div class="actions"><button type="button" onclick="balanceFinderGuess(${s.finderVersion})">ارجع لأفضل تقسيم · ${fmt(s.l + (s.h - s.l) / 2n)}</button></div>` : '<p class="tiny">✓ السؤال الحالي يعطي أفضل تقسيم للنطاق.</p>'}</form>` : ''}</details>`,
    );
  }
  guardCoreView();
}
function balanceFinderGuess(version = state?.finderVersion) {
  if (
    screen !== 'finder' ||
    state.done ||
    coreBlocked() ||
    state.finderVersion !== version ||
    state.l === null ||
    state.h === null
  )
    return;
  state.guess = state.l + (state.h - state.l) / 2n;
  renderFinder('رجعنا للمنتصف. السؤال يقسم الاحتمالات بالتساوي قدر الإمكان.');
}
function planFinderGuess(version = state?.finderVersion) {
  if (
    screen !== 'finder' ||
    state.done ||
    coreBlocked() ||
    state.finderVersion !== version ||
    state.l === null ||
    state.h === null
  )
    return;
  let guess;
  try {
    guess = integer($('finderGuessInput').value);
  } catch (error) {
    return toast(error.message);
  }
  if (guess < state.l || guess > state.h) return toast('اختار تخمينًا داخل النطاق المتفق عليه.');
  state.guess = guess;
  renderFinder('غيّرنا السؤال؛ عدد المحاولات لا يزيد حتى تسجلوا الإجابة.');
}
function finderAnswer(a) {
  if (screen !== 'finder' || state.done || coreBlocked()) return;
  const s = state;
  if (s.stage === 'choose-number') return;
  if (s.sealed) {
    const actual =
      s.sealedSecret === s.guess ? 'correct' : s.sealedSecret > s.guess ? 'higher' : 'lower';
    if (a !== actual)
      return toast('الإجابة لا تطابق الرقم المقفل. لم نغيّر النطاق أو نستهلك محاولة.');
  }
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
    draft = $('guessInput')?.value ?? s.soloDraft ?? '',
    count = s.h - s.l + 1n,
    initial = s.initialH - s.initialL + 1n,
    progress = Number(100n - (count * 100n) / initial),
    left = Number(((s.l - s.initialL) * 10000n) / initial) / 100,
    width = Number((count * 10000n) / initial) / 100,
    last = s.history.at(-1),
    direction = last?.a === 'higher' ? 'higher' : last ? 'lower' : 'start';
  s.soloMessage =
    msg || s.soloMessage || 'اختر رقماً من النطاق. كل إجابة تستبعد جزءاً من الاحتمالات.';
  setHTML(
    wrap(
      'solo',
      `<div class="stats solo-stats"><div class="stat"><small>محاولات باقية</small><b>${s.max - s.attempt}</b></div><div class="stat"><small>محاولاتك</small><b>${s.attempt}</b></div><div class="stat"><small>احتمالات باقية</small><b>${fmt(count)}</b></div></div><section class="panel solo-panel"><div class="solo-heading"><span aria-hidden="true">🔐</span><div><h3>قرّب، وضيّق النطاق</h3><p class="tiny">استبعدت ${progress}% من الاحتمالات</p></div></div><div class="number-range" role="group" aria-label="النطاق المتبقي من ${fmt(s.l)} إلى ${fmt(s.h)}"><div class="range" dir="ltr"><bdi>${fmt(s.l)}</bdi><span>≤ ? ≤</span><bdi>${fmt(s.h)}</bdi></div><div class="number-track" dir="ltr" aria-hidden="true"><span style="left:${left}%;width:${width}%"></span></div><div class="range-original" dir="ltr"><bdi>${fmt(s.initialL)}</bdi><bdi>${fmt(s.initialH)}</bdi></div></div><div id="soloFeedback" class="guess-feedback ${direction}" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"><span class="feedback-arrow" aria-hidden="true">${direction === 'higher' ? '↑' : direction === 'lower' ? '↓' : '✦'}</span><div><b>${esc(s.soloMessage)}</b><small>النطاق الآن: <bdi dir="ltr">${fmt(s.l)} – ${fmt(s.h)}</bdi>${count === 1n ? ' · بقي رقم واحد!' : ''}</small></div></div><form class="solo-form" onsubmit="event.preventDefault();guessSolo()"><label for="guessInput">تخمينك</label><div class="guess-entry"><input id="guessInput" dir="ltr" type="text" inputmode="${s.soloPad ? 'none' : 'numeric'}" enterkeyhint="go" maxlength="90" autocomplete="off" aria-describedby="soloFeedback" placeholder="اكتب الرقم" ${s.soloPad ? 'readonly' : ''}><button class="primary" type="submit">جرّب الرقم ←</button></div><div class="input-options"><button type="button" class="linkbtn" onclick="toggleSoloPad()" aria-pressed="${!!s.soloPad}">${s.soloPad ? 'استخدم كيبورد الجهاز' : 'لوحة أرقام اللعبة'}</button>${s.l < 0n ? '<button type="button" class="smallbtn quiet" onclick="soloKey(\'sign\')" aria-label="تبديل إشارة الرقم">±</button>' : ''}${s.mode === 'easy' && count > 1n ? '<button type="button" class="linkbtn" onclick="soloMidpoint()">جرّب المنتصف</button>' : ''}</div>${s.soloPad ? soloKeypadHTML() : ''}<div class="solo-assists"><button type="button" onclick="hintSolo()" ${s.hints >= 2 || count <= 2n ? 'disabled' : ''}>✧ تلميح <small>−8 نقاط · باقي ${2 - s.hints}</small></button><button type="button" class="quiet" onclick="revealSolo()">اكشف الرقم</button></div><p class="tiny">التلميح يحذف نصف الاحتمالات دون استهلاك محاولة.</p></form>${
        s.history.length
          ? `<details class="history solo-history"><summary>تتبّع تخميناتك (${s.history.length})</summary><ol>${s.history
              .slice(-12)
              .reverse()
              .map(
                (v) =>
                  `<li><bdi>${fmt(v.n)}</bdi><span>${v.a === 'higher' ? '↑ الرقم أكبر' : '↓ الرقم أصغر'}</span></li>`,
              )
              .join('')}</ol></details>`
          : ''
      }</section>`,
    ),
  );
  if (count === 1n) {
    $('guessInput').value = s.l.toString();
    $('guessInput').setAttribute('aria-label', 'بقي رقم واحد؛ أكّد هذا التخمين');
  } else if (s.mode === 'easy') {
    $('guessInput').placeholder = (s.l + (s.h - s.l) / 2n).toString();
    $('guessInput').setAttribute('aria-label', 'اكتب تخمينك؛ التلميح المعروض هو منتصف النطاق');
  }
  if (count > 1n) $('guessInput').value = draft;
  s.soloDraft = $('guessInput').value;
  $('app')
    .querySelector('.solo-assists')
    ?.insertAdjacentHTML(
      'beforebegin',
      `<details class="strategy-lens"><summary>⚖ جرّب تقسيم النطاق قبل التخمين</summary><p class="tiny">المعاينة تحسب الاحتمالات من النطاق الظاهر فقط؛ لا تعرف الرقم السري ولا تستهلك محاولة.</p><div id="soloSplit" role="status" aria-live="polite"></div></details>`,
    );
  updateSoloSplit();
  if (s.quest)
    $('app').querySelector('.solo-stats')?.insertAdjacentHTML('beforebegin', soloQuestBanner(s));
  guardCoreView();
}
function soloQuestBanner(s) {
  return `<div class="mission-ribbon"><b>🔐 مهمة الأقفال</b><span>${[0, 1, 2].map((i) => `<i class="${i < s.lockResults.length ? 'complete' : i === s.lockResults.length ? 'current' : ''}">${i < s.lockResults.length ? '✓' : i + 1}</i>`).join('')}</span><small>القفل ${s.lockResults.length + 1} من 3 · نتيجة نهائية واحدة، حتى 100 نقطة</small></div>`;
}
function soloSearchReviewHTML(s) {
  const entries = [
    ...s.history.map((entry) => ({
      n: entry.n,
      text: entry.a === 'higher' ? 'الرقم أكبر ↑' : 'الرقم أصغر ↓',
    })),
    ...(s.finalGuess === s.secret ? [{ n: s.finalGuess, text: 'الجواب الصحيح ✓' }] : []),
  ];
  return `<details class="round-review"><summary>كيف ضيّقت النطاق؟</summary><p class="note">بدأت بـ ${fmt(s.initialH - s.initialL + 1n)} احتمال، واستخدمت ${s.attempt} محاولة و${s.hints} تلميحات. اختيار المنتصف يستبعد أكبر عدد مضمون من الاحتمالات.</p>${entries.length ? `<ol>${entries.map((entry, i) => `<li><span>المحاولة ${i + 1}</span><bdi>${fmt(entry.n)}</bdi><b>${entry.text}</b></li>`).join('')}</ol>` : '<p class="note">لم تسجّل أي تخمين.</p>'}<p class="note">الرقم الصحيح: <bdi>${fmt(s.secret)}</bdi></p></details>`;
}
function finishSoloStage(won, title, text, points = 0, detail = '') {
  const s = state;
  if (!s.quest) {
    if (points) addScore(s.name, points);
    return result('solo', title, text, points, detail);
  }
  if (s.lockStage !== 'active') return;
  s.lockResults.push({ won, points, attempt: s.attempt, hints: s.hints, secret: s.secret });
  s.lockVersion++;
  if (!won || s.lockResults.length === 3) {
    const earned = Math.min(
      100,
      Math.round((s.lockResults.reduce((sum, round) => sum + round.points, 0) * 2) / 3),
    );
    s.done = true;
    s.lockStage = 'finished';
    if (earned) addScore(s.name, earned);
    result(
      'solo',
      won ? 'فتحت الأقفال الثلاثة! 🔓' : 'توقفت مهمة الأقفال',
      `${s.lockResults.filter((round) => round.won).length} أقفال مفتوحة من 3. نقاطك من مجموع أداء الأقفال، وتُسجل مرة واحدة.`,
      earned,
    );
    $('app')
      .querySelector('.success')
      ?.insertAdjacentHTML(
        'beforeend',
        `<div class="mission-results">${s.lockResults.map((round, i) => `<div><b>${round.won ? '🔓' : '🔒'} القفل ${i + 1}</b><bdi>${fmt(round.secret)}</bdi><small>${round.attempt} محاولات · ${round.hints} مساعدات</small></div>`).join('')}</div>`,
      );
    return;
  }
  s.done = false;
  s.lockStage = 'review';
  setHTML(
    wrap(
      'solo',
      `${soloQuestBanner(s)}<section class="panel success center"><div class="resulticon">🔓</div><h2>القفل ${s.lockResults.length} انفتح</h2><div class="resultnum">${fmt(s.secret)}</div><p class="note">${s.attempt} محاولات و${s.hints} مساعدات. النتيجة تُحفظ عند انتهاء المهمة؛ باقي ${3 - s.lockResults.length} أقفال.</p><div class="actions"><button class="primary" onclick="nextSoloLock(${s.lockVersion})">القفل التالي ←</button><button onclick="home()">العودة للألعاب</button></div></section>`,
    ),
  );
}
function nextSoloLock(version = state?.lockVersion) {
  const s = state;
  if (
    screen !== 'solo' ||
    s.done ||
    coreBlocked() ||
    !s.quest ||
    s.lockStage !== 'review' ||
    version !== s.lockVersion
  )
    return;
  const used = [...new Set(s.lockResults.map((round) => round.secret))]
    .filter((secret) => secret >= s.initialL && secret <= s.initialH)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  let secret = s.initialL + randomBigInt(s.initialH - s.initialL + 1n - BigInt(used.length));
  for (const previous of used) {
    if (secret >= previous) secret++;
    else break;
  }
  Object.assign(s, {
    l: s.initialL,
    h: s.initialH,
    secret,
    attempt: 0,
    history: [],
    hints: 0,
    soloMessage: '',
    soloDraft: '',
    lockStage: 'active',
    lastDistance: undefined,
    finalGuess: undefined,
  });
  renderSolo();
}
function splitNumberRange(low, high, guess) {
  if (guess < low || guess > high) return null;
  const lower = guess - low,
    higher = high - guess,
    total = high - low + 1n;
  return {
    lower,
    higher,
    total,
    worst: lower > higher ? lower : higher,
    balanced: lower - higher <= 1n && higher - lower <= 1n,
  };
}
function updateSoloSplit() {
  if (screen !== 'solo' || state?.done || !$('soloSplit')) return;
  const s = state;
  s.soloDraft = $('guessInput').value;
  let guess;
  try {
    guess = integer($('guessInput').value);
  } catch {
    $('soloSplit').textContent = 'اكتب رقماً لترى كيف يقسم الاحتمالات.';
    return;
  }
  const split = splitNumberRange(s.l, s.h, guess);
  if (!split) {
    $('soloSplit').textContent = 'اختر رقماً داخل النطاق المتبقي.';
    return;
  }
  const percent = (n) => Number((n * 10000n) / split.total) / 100;
  $('soloSplit').innerHTML =
    `<div class="split-legend"><span>↓ أصغر: <bdi>${fmt(split.lower)}</bdi></span><span>✓ هو نفسه: 1</span><span>↑ أكبر: <bdi>${fmt(split.higher)}</bdi></span></div><div class="split-track" dir="ltr" aria-hidden="true"><i style="width:${percent(split.lower)}%"></i><i style="width:${Math.max(0.4, percent(1n))}%"></i><i style="width:${percent(split.higher)}%"></i></div><p class="note">${split.balanced ? 'تقسيم متوازن: هذا التخمين يترك أقل عدد ممكن في أسوأ حالة.' : `في أسوأ حالة يبقى ${fmt(split.worst)} احتمال. المنتصف يوازن فرعي البحث.`}</p>`;
}
function soloKeypadHTML() {
  return `<div class="solo-keypad" dir="ltr" role="group" aria-label="لوحة أرقام التخمين">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => `<button type="button" onclick="soloKey('${key}')" aria-label="${key === 'clear' ? 'مسح الرقم' : key === 'back' ? 'حذف آخر خانة' : key}">${key === 'clear' ? 'مسح' : key === 'back' ? '⌫' : key}</button>`).join('')}</div>`;
}
function soloKey(key) {
  if (screen !== 'solo' || state.done || coreBlocked() || !$('guessInput')) return;
  const input = $('guessInput');
  if (key === 'clear') input.value = '';
  else if (key === 'back') input.value = input.value.slice(0, -1);
  else if (key === 'sign') {
    if (state.l < 0n)
      input.value = input.value.startsWith('-') ? input.value.slice(1) : '-' + input.value;
  } else if (/^\d$/.test(key) && input.value.length < 61) input.value += key;
  else return;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function toggleSoloPad() {
  if (screen !== 'solo' || state.done || coreBlocked() || !$('guessInput')) return;
  const draft = $('guessInput').value;
  $('guessInput').blur();
  state.soloPad = !state.soloPad;
  renderSolo();
  $('guessInput').value = draft;
  updateSoloSplit();
  if (!state.soloPad) $('guessInput').focus({ preventScroll: true });
}
function soloMidpoint() {
  if (screen !== 'solo' || state.done || coreBlocked() || state.mode !== 'easy' || !$('guessInput'))
    return;
  $('guessInput').value = (state.l + (state.h - state.l) / 2n).toString();
  $('guessInput').dispatchEvent(new Event('input', { bubbles: true }));
}
function soloInputError(message) {
  const input = $('guessInput'),
    feedback = $('soloFeedback');
  input.setAttribute('aria-invalid', 'true');
  feedback.classList.add('invalid');
  feedback.querySelector('b').textContent = latin(message);
  feedback.scrollIntoView({ block: 'nearest' });
}
function afterSoloResponse() {
  if (matchMedia('(pointer: coarse)').matches || state?.soloPad) {
    requestAnimationFrame(() =>
      $('soloFeedback')?.scrollIntoView({ block: 'nearest', behavior: 'instant' }),
    );
  } else $('guessInput')?.focus({ preventScroll: true });
}
function hintSolo() {
  if (screen !== 'solo' || state.done || coreBlocked() || state.hints >= 2) return;
  if (state.lockStage === 'review') return;
  const s = state;
  if (s.h - s.l + 1n <= 2n) return;
  const mid = s.l + (s.h - s.l) / 2n;
  if (s.secret <= mid) s.h = mid;
  else s.l = mid + 1n;
  s.hints++;
  $('guessInput').blur();
  renderSolo('حذفنا نصف الاحتمالات. باقي النطاق يحتوي الرقم السري.');
  afterSoloResponse();
}
function guessSolo() {
  if (screen !== 'solo' || state.done || coreBlocked()) return;
  if (state.lockStage === 'review') return;
  const s = state;
  let n;
  try {
    n = integer($('guessInput').value);
  } catch (e) {
    return soloInputError(e.message);
  }
  if (n < s.l || n > s.h) return soloInputError('هذا الرقم خارج النطاق الممكن. لم تُخصم محاولة.');
  $('guessInput').blur();
  $('guessInput').value = '';
  s.soloDraft = '';
  s.attempt++;
  s.finalGuess = n;
  if (n === s.secret) {
    s.done = true;
    const p = Math.max(
      10,
      50 +
        (s.mode === 'hard' ? 15 : s.mode === 'easy' ? -10 : 0) -
        Math.floor(((s.attempt - 1) * 35) / s.max) -
        s.hints * 8,
    );
    finishSoloStage(
      true,
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
  s.history.push({ n, a, low: s.l, high: s.h });
  if (s.attempt >= s.max) {
    s.done = true;
    finishSoloStage(
      false,
      'خلصت المحاولات',
      `الرقم كان ${fmt(s.secret)}. تقسيم النطاق من المنتصف يعطيك أفضل فرصة.`,
    );
    return;
  }
  if (a === 'higher') s.l = n + 1n;
  else s.h = n - 1n;
  tone();
  renderSolo((a === 'higher' ? '⬆ رقمي أكبر من تخمينك.' : '⬇ رقمي أصغر من تخمينك.') + heat);
  afterSoloResponse();
}
function revealSolo() {
  if (screen !== 'solo' || state.done || coreBlocked()) return;
  if (state.lockStage === 'review') return;
  state.done = true;
  finishSoloStage(false, 'انكشف السر 🔓', `استعملت ${state.attempt} محاولة.`, 0, fmt(state.secret));
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
  if (screen !== 'setup' || state?.id !== 'mind' || coreBlocked()) return;
  const pool = selectedItems();
  if (!pool.length) return toast('لا توجد كلمات في هذه الفئة. اختر فئة أخرى أو أضف كلمة.');
  state = {
    id: 'mind',
    candidates: [...pool],
    asked: [],
    history: [],
    evidence: [],
    initialCount: pool.length,
    initialPool: pool,
    answers: 0,
    name: player(),
    done: false,
    mindStyle: $('mindStyle')?.value === 'investigate' ? 'investigate' : 'auto',
  };
  screen = 'mind';
  renderMind();
  renderMindEvidence();
  goTop();
}

function mindAnswer(a, q = state?.q, version = state?.notebookVersion) {
  if (
    screen !== 'mind' ||
    coreBlocked() ||
    state.done ||
    state.q === null ||
    q !== state.q ||
    version !== state.notebookVersion ||
    !['yes', 'no', 'unknown'].includes(a)
  )
    return;
  const s = state;
  const snap = {
    candidates: [...s.candidates],
    asked: [...s.asked],
    answers: s.answers,
    evidence: [...s.evidence],
    selectedQuestion: s.selectedQuestion,
  };
  let next = s.candidates;
  if (a !== 'unknown') {
    next = next.filter((i) => items[i].tags.has(questions[q][0]) === (a === 'yes'));
    if (!next.length) return toast('هالإجابة ما تطابق الخيارات. تراجع أو جرّب «مو متأكد».');
    s.answers++;
  }
  s.history.push(snap);
  s.asked.push(q);
  s.candidates = next;
  s.evidence.push({ q, answer: a, before: snap.candidates.length, after: next.length });
  s.selectedQuestion = null;
  tone();
  renderMind();
  renderMindEvidence();
}
function undoMind() {
  if (screen !== 'mind' || coreBlocked() || state.done || !state.history.length) return;
  Object.assign(state, state.history.pop());
  renderMind();
  renderMindEvidence();
}
function renderMindEvidence() {
  if (screen !== 'mind' || state.done) return;
  const s = state,
    progress = Math.round((1 - s.candidates.length / Math.max(1, s.initialCount)) * 100),
    yes =
      s.q === null ? 0 : s.candidates.filter((i) => items[i].tags.has(questions[s.q][0])).length;
  $('app')
    .querySelector('.panel')
    ?.insertAdjacentHTML(
      'beforeend',
      `<div class="progressline" role="progressbar" aria-label="تضييق الخيارات" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><p class="note">${s.candidates.length === 1 ? 'كل الإجابات الواضحة تقود إلى هذا الخيار؛ أكّد الاسم أو تراجع لتصحيح الأدلة.' : s.q === null ? 'الخيارات الباقية تتشابه في الصفات المتاحة؛ اختر الاسم أو أضف صفة تميز الشيء في قاعدة التخمين.' : `اخترنا هذا السؤال لأنه يقسم الخيارات إلى ${yes} جوابها نعم و${s.candidates.length - yes} جوابها لا. «مو متأكد» يحفظ كل الخيارات.`}</p>${s.evidence.length ? `<details class="history"><summary>الأدلة التي ضيّقت الخيارات (${s.evidence.length})</summary><ol>${s.evidence.map((v) => `<li>${esc(questions[v.q][1])} — <b>${v.answer === 'yes' ? 'نعم' : v.answer === 'no' ? 'لا' : 'مو متأكد'}</b><small> · استبعدنا ${v.before - v.after} وبقي ${v.after}</small></li>`).join('')}</ol></details>` : ''}`,
    );
  s.notebookVersion = (s.notebookVersion || 0) + 1;
  const version = s.notebookVersion;
  if (s.q !== null) {
    ['yes', 'no', 'unknown'].forEach((answer, i) => {
      $('app')
        .querySelectorAll('.answerrow button')
        [i]?.setAttribute('onclick', `mindAnswer('${answer}',${s.q},${version})`);
    });
  }
  if (s.mindStyle === 'investigate' && s.q !== null) {
    const options = mindQuestionOptions(s);
    $('app')
      .querySelector('.panel')
      ?.insertAdjacentHTML(
        'afterbegin',
        `<div class="investigator-tools"><label for="mindQuestionChoice">اختر زاوية السؤال</label><select id="mindQuestionChoice" onchange="selectMindQuestion(this.value,${version})">${options.map(({ q, yes }) => `<option value="${q}" ${q === s.q ? 'selected' : ''}>${esc(questions[q][1])} · نعم ${yes} / لا ${s.candidates.length - yes}</option>`).join('')}</select><p class="tiny">السؤال يقسم الاحتمالات من الصفات الظاهرة في القاموس. اختيار سؤال لا يستهلك جوابًا.</p></div>`,
      );
  }
  $('app')
    .querySelector('.panel')
    ?.insertAdjacentHTML(
      'beforeend',
      `<details class="strategy-lens" id="mindNotebook"><summary>📒 دفتر الاحتمالات وتصحيح الأدلة</summary><p class="tiny">تعديل إجابة قديمة يعيد فحص كل الأدلة. الإجابة المتناقضة تُرفض؛ التراجع يعيد التصحيح السابق.</p>${s.evidence
        .map(
          (entry) =>
            `<div class="evidence-edit"><b>${esc(questions[entry.q][1])}</b><div class="actions">${[
              ['yes', 'نعم'],
              ['no', 'لا'],
              ['unknown', 'مو متأكد'],
            ]
              .map(
                ([value, label]) =>
                  `<button class="smallbtn ${entry.answer === value ? 'primary' : ''}" aria-pressed="${entry.answer === value}" onclick="mindRevisit(${entry.q},'${value}',${version})" ${entry.answer === value ? 'disabled' : ''}>${label}</button>`,
              )
              .join('')}</div></div>`,
        )
        .join(
          '',
        )}<label for="mindCandidateSearch">ابحث بين الاحتمالات الباقية</label><input id="mindCandidateSearch" maxlength="50" value="${esc(s.mindCandidateQuery || '')}" autocomplete="off" oninput="searchMindCandidates(this.value)"><div id="mindCandidateMatches">${mindCandidateMatchesHTML(s)}</div></details>`,
    );
  guardCoreView();
}
function mindCandidateMatchesHTML(s) {
  const query = norm(s.mindCandidateQuery || ''),
    matching = s.candidates.filter(
      (i) => !query || items[i].aliases.some((name) => norm(name).includes(query)),
    );
  return `<p class="note" role="status">${matching.length} نتائج بحث · الاحتمالات المتوافقة: ${s.candidates.length}</p><div class="listchips">${matching
    .slice(0, 80)
    .map((i) => `<span>${esc(items[i].name)}</span>`)
    .join(
      '',
    )}</div>${matching.length > 80 ? '<p class="tiny">نعرض أول 80 اسماً؛ اكتب الاسم لتضييق البحث.</p>' : !matching.length ? '<p class="tiny">الاسم غير موجود ضمن الإجابات الحالية. راجع الأدلة أو أضف الاسم إلى قاعدة التخمين.</p>' : ''}`;
}
function searchMindCandidates(value) {
  if (screen !== 'mind' || state.done || coreBlocked() || !$('mindCandidateMatches')) return;
  state.mindCandidateQuery = String(value).slice(0, 50);
  $('mindCandidateMatches').innerHTML = mindCandidateMatchesHTML(state);
}
function mindQuestionOptions(s = state) {
  return questions
    .map((_, q) => ({
      q,
      yes: s.candidates.filter((i) => items[i].tags.has(questions[q][0])).length,
    }))
    .filter(({ q, yes }) => !s.asked.includes(q) && yes > 0 && yes < s.candidates.length)
    .sort(
      (a, b) =>
        Math.abs(s.candidates.length / 2 - a.yes) - Math.abs(s.candidates.length / 2 - b.yes),
    );
}
function selectMindQuestion(value, version = state?.notebookVersion) {
  if (
    screen !== 'mind' ||
    state.done ||
    coreBlocked() ||
    state.mindStyle !== 'investigate' ||
    state.notebookVersion !== version
  )
    return;
  const q = Number(value);
  if (!mindQuestionOptions().some((entry) => entry.q === q)) return;
  state.selectedQuestion = q;
  renderMind();
  renderMindEvidence();
}
function mindRevisit(q, answer, version = state?.notebookVersion) {
  if (
    screen !== 'mind' ||
    state.done ||
    coreBlocked() ||
    state.notebookVersion !== version ||
    !['yes', 'no', 'unknown'].includes(answer)
  )
    return;
  const s = state,
    old = s.evidence.find((entry) => entry.q === q);
  if (!old || old.answer === answer) return;
  let remaining = [...(s.initialPool || s.history[0]?.candidates || s.candidates)];
  const evidence = [];
  for (const entry of s.evidence) {
    const value = entry.q === q ? answer : entry.answer,
      before = remaining.length;
    if (value !== 'unknown')
      remaining = remaining.filter(
        (i) => items[i].tags.has(questions[entry.q][0]) === (value === 'yes'),
      );
    evidence.push({ q: entry.q, answer: value, before, after: remaining.length });
  }
  if (!remaining.length) return toast('التعديل يناقض أدلة أخرى. لم نغيّر إجاباتك.');
  s.history.push({
    candidates: [...s.candidates],
    asked: [...s.asked],
    answers: s.answers,
    evidence: [...s.evidence],
    selectedQuestion: s.selectedQuestion,
  });
  s.candidates = remaining;
  s.evidence = evidence;
  s.answers = evidence.filter((entry) => entry.answer !== 'unknown').length;
  s.selectedQuestion = null;
  renderMind();
  renderMindEvidence();
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
  if (screen !== 'setup' || state?.id !== 'who' || coreBlocked()) return;
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
    inquiries: [],
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
      (s.listOpen ? 5 : 0) -
      (s.inquiries?.length || 0) * 6,
  );
}
function renderWho(msg = '') {
  const s = state;
  if ($('whoInput')) s.whoDraft = $('whoInput').value;
  setHTML(
    wrap(
      'who',
      `<div class="stats"><div class="stat"><small>تخمينات باقية</small><b>${s.max - s.attempt}</b></div><div class="stat"><small>تلميحات مفتوحة</small><b dir="ltr">${s.hints} / 3</b></div><div class="stat"><small>نقاط الإجابة الآن</small><b>${Math.max(10, s.base - (s.hints - s.initialHints) * 10 - s.attempt * 5 - (s.listOpen ? 5 : 0) - (s.inquiries?.length || 0) * 6)}</b></div></div><section class="panel"><h2>من أنا؟ 🕵️</h2>${s.item.hints
        .slice(0, s.hints)
        .map((h, i) => `<div class="hint"><b>التلميح ${i + 1}</b>${esc(h)}</div>`)
        .join(
          '',
        )}<form onsubmit="event.preventDefault();guessWho()"><label for="whoInput">ما هو الشيء؟</label><input id="whoInput" maxlength="50" autocomplete="off" placeholder="اكتب الاسم أو اسماً بديلاً له"><div class="actions"><button class="primary" type="submit">خمنت!</button><button type="button" onclick="whoHint()" ${s.hints === 3 ? 'disabled' : ''}>تلميح إضافي −10</button></div></form><p class="note" role="status">${msg || 'التخمين الغلط يخصم 5 نقاط؛ تكرار التخمين نفسه لا يستهلك محاولة.'}</p>${s.wrong.length ? `<div class="listchips" role="group" aria-label="التخمينات السابقة">${s.wrong.map((v) => `<span>✕ ${esc(v)}</span>`).join('')}</div>` : ''}${s.level === 'hard' ? '' : s.listOpen ? whoCandidateNotebookHTML(s) : '<div class="actions"><button onclick="whoCandidates()">شاهد قائمة الكلمات −5</button></div>'}<div class="actions"><button class="quiet" onclick="revealWho()">اكشف الجواب</button></div></section>`,
    ),
  );
  $('whoInput').value = s.whoDraft || '';
  renderWhoInquiries();
  guardCoreView();
}
function whoEvidenceCandidates(s = state) {
  return s.pool.filter(
    (i) =>
      (s.inquiries || []).every(
        (entry) => items[i].tags.has(questions[entry.q][0]) === entry.yes,
      ) &&
      !(s.wrong || []).some((guess) =>
        items[i].aliases.some((alias) => norm(alias) === norm(guess)),
      ),
  );
}
function whoInquiryOptions(s = state) {
  // Paid questions should split the possibilities still supported by the public
  // evidence; neither the hidden answer nor handwritten exclusions are consulted.
  const pool = whoEvidenceCandidates(s);
  return questions
    .map((q, i) => ({ i, count: pool.filter((item) => items[item].tags.has(q[0])).length }))
    .filter(
      (entry) =>
        entry.count > 0 && entry.count < pool.length && !s.inquiries?.some((q) => q.q === entry.i),
    )
    .sort((a, b) => Math.abs(pool.length / 2 - a.count) - Math.abs(pool.length / 2 - b.count))
    .slice(0, 8)
    .map((entry) => entry.i);
}
function renderWhoInquiries() {
  const s = state,
    options = whoInquiryOptions(s);
  $('app')
    .querySelector('.panel')
    ?.insertAdjacentHTML(
      'beforeend',
      `<details class="strategy-lens" ${s.inquiries?.length ? 'open' : ''}><summary>🔎 اسأل عن صفة · −6 نقاط للسؤال</summary><p class="tiny">سؤالان كحد أقصى؛ نعرض الصفات التي تميّز الاحتمالات بعد إجاباتك السابقة. الجواب عن الصفة المعتادة في قاموس اللعبة، ولا يستهلك تخميناً.</p>${s.inquiries?.map((v) => `<div class="hint"><b>${esc(questions[v.q][1])}</b>${v.yes ? 'نعم ✓' : 'لا ✕'}</div>`).join('') || ''}${(s.inquiries?.length || 0) < 2 && options.length ? `<label for="whoQuestion">اختر صفة لفحصها</label><select id="whoQuestion">${options.map((q) => `<option value="${q}">${esc(questions[q][1])}</option>`).join('')}</select><div class="actions"><button onclick="askWhoInquiry(${s.inquiries?.length || 0})">اسأل عن الصفة −6</button></div>` : '<p class="note">انتهت أسئلة الصفات المتاحة؛ استعمل أدلتك للتخمين.</p>'}</details>`,
    );
}
function askWhoInquiry(count = state?.inquiries?.length || 0) {
  if (
    screen !== 'who' ||
    state.done ||
    coreBlocked() ||
    (state.inquiries?.length || 0) >= 2 ||
    count !== (state.inquiries?.length || 0)
  )
    return;
  const q = Number($('whoQuestion')?.value);
  if (!whoInquiryOptions().includes(q)) return;
  state.inquiries ||= [];
  state.inquiries.push({ q, yes: state.item.tags.has(questions[q][0]) });
  renderWho('أضفنا جواب الصفة لدفتر الأدلة. طابقه مع التلميحات.');
  $('whoInput')?.focus({ preventScroll: true });
}
function whoCandidates() {
  if (screen !== 'who' || state.done || coreBlocked() || state.level === 'hard' || state.listOpen)
    return;
  state.listOpen = true;
  renderWho();
}
function whoCandidateNotebookHTML(s) {
  return `<details class="history suspect-notebook" open><summary>📒 ملف المشتبهين · ${s.pool.length} أسماء</summary><label for="whoSuspectSearch">ابحث وقارن بتلميحاتك</label><input id="whoSuspectSearch" maxlength="40" value="${esc(s.suspectQuery || '')}" autocomplete="off" oninput="searchWhoSuspects(this.value)"><div id="whoSuspects">${whoSuspectsHTML(s)}</div><p class="tiny">الاستبعاد من اختيارك؛ الدفتر لا يعرف صحة فرضيتك. يعرض أول 40 نتيجة بحث. فتح القائمة يكلف 5 نقاط كما هو موضح.</p></details>`;
}
function whoSuspectsHTML(s) {
  const list = s.pool.filter(
    (i) =>
      !s.suspectQuery || items[i].aliases.some((name) => norm(name).includes(norm(s.suspectQuery))),
  );
  return `<div class="suspect-count">${list.length} نتائج · ${s.whoRejected?.length || 0} أسماء استبعدتها</div><div class="suspect-grid">${list
    .slice(0, 40)
    .map(
      (i) =>
        `<div class="suspect-card ${s.whoRejected?.includes(i) ? 'excluded' : ''}"><b>${esc(items[i].name)}</b><button class="smallbtn" onclick="toggleWhoSuspect(${i})" aria-pressed="${!!s.whoRejected?.includes(i)}">${s.whoRejected?.includes(i) ? 'أعده للملف' : 'استبعده'}</button><button class="smallbtn quiet" onclick="useWhoSuspect(${i})" ${s.whoRejected?.includes(i) ? 'disabled' : ''}>استخدم الاسم</button></div>`,
    )
    .join(
      '',
    )}</div>${!list.length ? '<p class="note">ما لقينا كلمة مطابقة. جرّب الاسم بدون «الـ» أو ابحث باسمه البديل.</p>' : ''}`;
}
function searchWhoSuspects(value) {
  if (screen !== 'who' || state.done || coreBlocked() || !state.listOpen || state.level === 'hard')
    return;
  state.suspectQuery = String(value).slice(0, 40);
  $('whoSuspects').innerHTML = whoSuspectsHTML(state);
  guardCoreView();
}
function toggleWhoSuspect(i) {
  if (
    screen !== 'who' ||
    state.done ||
    coreBlocked() ||
    !state.listOpen ||
    state.level === 'hard' ||
    !state.pool.includes(i)
  )
    return;
  state.whoRejected ||= [];
  state.whoRejected = state.whoRejected.includes(i)
    ? state.whoRejected.filter((index) => index !== i)
    : [...state.whoRejected, i];
  $('whoSuspects').innerHTML = whoSuspectsHTML(state);
  guardCoreView();
}
function useWhoSuspect(i) {
  if (
    screen !== 'who' ||
    state.done ||
    coreBlocked() ||
    !state.listOpen ||
    state.level === 'hard' ||
    !state.pool.includes(i) ||
    state.whoRejected?.includes(i)
  )
    return;
  $('whoInput').value = items[i].name;
  $('whoInput').focus({ preventScroll: true });
}
function guessWho() {
  if (screen !== 'who' || state.done || coreBlocked()) return;
  const s = state,
    raw = $('whoInput').value.trim(),
    n = norm(raw);
  if (!n) return toast('اكتب اسم الشيء.');
  if (s.seen.includes(n)) return toast('جرّبت هذه الكلمة. اختر شيئاً آخر.');
  s.whoDraft = '';
  $('whoInput').value = '';
  s.seen.push(n);
  s.attempt++;
  if (s.item.aliases.some((a) => norm(a) === n)) {
    s.done = true;
    const p = whoPoints();
    addScore(s.name, p);
    result('who', 'صح! هذا أنا ✨', `${s.attempt} تخمينات و${s.hints} تلميحات.`, p, s.item.name);
    renderWhoReview();
  } else {
    s.wrong.push(raw);
    if (s.attempt >= s.max) {
      s.done = true;
      result(
        'who',
        'الجواب كان…',
        'خلصت التخمينات. التلميحات الثلاثة كانت: ' + s.item.hints.map(esc).join(' · '),
        0,
        s.item.name,
      );
      renderWhoReview();
      return;
    }
    const known = s.pool.find((i) => items[i].aliases.some((a) => norm(a) === n)),
      feedback =
        known !== undefined && items[known].cat !== s.item.cat
          ? `هذا تخمين من فئة مختلفة؛ الجواب من فئة ${categories.find((c) => c[0] === s.item.cat)?.[1] || s.item.cat}.`
          : s.hints < 3
            ? 'راجع الصفات في التلميحات قبل التخمين التالي، أو افتح تلميحاً أوضح.'
            : 'التلميحات الثلاثة تصف شيئاً آخر. طابق كل صفة قبل التخمين.';
    renderWho(`الإجابة مختلفة. بقيت ${s.max - s.attempt} تخمينات. ${feedback}`);
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
  renderWhoReview();
}
function renderWhoReview() {
  const s = state;
  $('app')
    .querySelector('.success')
    ?.insertAdjacentHTML(
      'beforeend',
      `<details class="history"><summary>راجع أدلة القضية</summary>${s.item.hints.map((hint, i) => `<p class="note"><b>التلميح ${i + 1}:</b> ${esc(hint)}</p>`).join('')}${s.inquiries.map((entry) => `<p class="note">${esc(questions[entry.q][1])} — ${entry.yes ? 'نعم ✓' : 'لا ✕'}</p>`).join('')}${s.wrong.length ? `<p class="tiny">كل التخمينات غير الصحيحة (${s.wrong.length}):</p><div class="listchips">${s.wrong.map((guess) => `<span>✕ ${esc(guess)}</span>`).join('')}</div>` : '<p class="note">لم تسجّل أي تخمين خاطئ.</p>'}</details>`,
    );
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
const memoryNames = Object.fromEntries([
  ['🍉', 'بطيخ'],
  ['🚀', 'صاروخ'],
  ['🐱', 'قط'],
  ['🍕', 'بيتزا'],
  ['⚽', 'كرة قدم'],
  ['🎧', 'سماعة'],
  ['🌴', 'نخلة'],
  ['🦋', 'فراشة'],
  ['🎲', 'نرد'],
  ['🐬', 'دلفين'],
  ['🍓', 'فراولة'],
  ['🚗', 'سيارة'],
  ['⭐', 'نجمة'],
  ['🦊', 'ثعلب'],
  ['🎈', 'بالون'],
  ['🌙', 'قمر'],
  ['🧭', 'بوصلة'],
  ['💎', 'ألماس'],
  ['🎸', 'غيتار'],
  ['🌈', 'قوس قزح'],
  ['🎨', 'ألوان'],
  ['🦉', 'بومة'],
  ['🍩', 'دونات'],
  ['⛵', 'شراع'],
  ['🌻', 'دوار الشمس'],
  ['🐙', 'أخطبوط'],
  ['🛸', 'صحن طائر'],
  ['🍄', 'فطر'],
  ['🦁', 'أسد'],
  ['🏆', 'كأس'],
  ['🪁', 'طائرة ورقية'],
  ['🧩', 'أحجية'],
  ['🐶', 'كلب'],
  ['🐯', 'نمر'],
  ['🐮', 'بقرة'],
  ['🐷', 'خنزير'],
  ['🐸', 'ضفدع'],
  ['🐵', 'قرد'],
  ['🐔', 'دجاجة'],
  ['🐧', 'بطريق'],
  ['🦆', 'بطة'],
  ['🐝', 'نحلة'],
  ['🐌', 'حلزون'],
  ['🐢', 'سلحفاة'],
  ['🐍', 'ثعبان'],
  ['🦀', 'سلطعون'],
  ['🐳', 'حوت'],
  ['🦈', 'قرش'],
  ['🦒', 'زرافة'],
  ['🦓', 'حمار وحشي'],
  ['🐘', 'فيل'],
  ['🦔', 'قنفذ'],
  ['🐇', 'أرنب'],
  ['🐿️', 'سنجاب'],
  ['🦎', 'سحلية'],
  ['🍎', 'تفاح'],
  ['🍊', 'برتقال'],
  ['🍋', 'ليمون'],
  ['🍌', 'موز'],
  ['🍇', 'عنب'],
  ['🫐', 'توت'],
  ['🍒', 'كرز'],
  ['🍑', 'خوخ'],
  ['🥭', 'مانجو'],
  ['🍍', 'أناناس'],
  ['🥝', 'كيوي'],
  ['🥑', 'أفوكادو'],
  ['🥕', 'جزر'],
  ['🌽', 'ذرة'],
  ['🍞', 'خبز'],
  ['🥐', 'كرواسون'],
  ['🥞', 'بانكيك'],
  ['🧀', 'جبن'],
  ['🍔', 'برغر'],
  ['🌮', 'تاكو'],
  ['🍿', 'فشار'],
  ['🍪', 'بسكويت'],
  ['🎂', 'كيك'],
  ['🍫', 'شوكولاتة'],
  ['🍯', 'عسل'],
  ['🍦', 'آيس كريم'],
  ['🚕', 'تاكسي'],
  ['🚌', 'حافلة'],
  ['🚎', 'باص كهربائي'],
  ['🚓', 'شرطة'],
  ['🚑', 'إسعاف'],
  ['🚒', 'إطفاء'],
  ['🚚', 'شاحنة'],
  ['🚜', 'جرار'],
  ['🏎️', 'سيارة سباق'],
  ['🚲', 'دراجة'],
  ['🛵', 'سكوتر'],
  ['🏍️', 'دراجة نارية'],
  ['🚆', 'قطار'],
  ['🚇', 'مترو'],
  ['🚊', 'ترام'],
  ['✈️', 'طائرة'],
  ['🚁', 'مروحية'],
  ['🛶', 'زورق'],
  ['🚢', 'سفينة'],
  ['⚓', 'مرساة'],
  ['🏰', 'قلعة'],
  ['⛺', 'خيمة'],
  ['🗼', 'برج'],
  ['🗽', 'تمثال الحرية'],
  ['🎡', 'عجلة ملاهي'],
  ['🏝️', 'جزيرة'],
]);
function memoryFaces(s) {
  const seen = new Set();
  return s.deck.map((symbol) => {
    const repeated = seen.has(symbol);
    seen.add(symbol);
    return s.memoryMode === 'meaning' && repeated ? memoryNames[symbol] || symbol : symbol;
  });
}
function memoryElapsed(s = state) {
  return s.started ? Math.max(0, Math.floor(((s.pausedAt || Date.now()) - s.started) / 1000)) : 0;
}
function startMemory() {
  if (screen !== 'setup' || state?.id !== 'memory' || coreBlocked()) return;
  if (!requirePlayers('memory')) return;
  const duo = $('memoryplay')?.value === 'duo';
  const names = [
    player(),
    normalizePlayerName($('memorysecond')?.selectedOptions?.[0]?.textContent) || store.players[1],
  ];
  if (duo && (!names[1] || names[0] === names[1])) return toast('اختر اسمين مختلفين للمواجهة.');
  clearTimers();
  const value = Number($('difficulty').value),
    pairs = [4, 6, 8, 12, 16, 20, 24].includes(value) ? value : 8,
    theme = $('memoryTheme')?.value || 'mix',
    picked = shuffle([...new Set(memoryThemes[theme] || symbols)]).slice(0, pairs),
    previewValue = Number($('memoryPreview')?.value || 0),
    preview = !duo && [3, 5].includes(previewValue) ? previewValue : 0,
    paceValue = Number($('memoryPace')?.value || 850);
  state = {
    id: 'memory',
    deck: shuffle([...picked, ...picked]),
    pairs,
    theme,
    memoryMode: $('memorymode')?.value === 'meaning' ? 'meaning' : 'pictures',
    up: [],
    matched: [],
    moves: 0,
    hintsUsed: 0,
    streak: 0,
    bestStreak: 0,
    memoryFocus: 0,
    notice: '',
    peek: false,
    locked: false,
    started: null,
    name: player(),
    done: false,
    duo,
    memoryPlayers: duo ? names : [player()],
    memoryTurn: 0,
    matchCounts: [0, 0],
    passAfterHide: false,
    mismatchDelay: [600, 850, 1500].includes(paceValue) ? paceValue : 850,
  };
  if (preview) {
    state.hintsUsed = 1;
    state.peek = true;
    state.locked = true;
    state.started = Date.now();
    state.endAt = Date.now() + preview * 1000;
    const memoryState = state;
    later(() => hideMemoryCards(memoryState), preview * 1000);
  }
  state.faces = memoryFaces(state);
  screen = 'memory';
  renderMemory();
  repeat(() => {
    if (screen === 'memory' && !state.done && state.started && $('memtime'))
      $('memtime').textContent = memoryElapsed() + ' ث';
  }, 500);
  goTop();
}
function renderMemory() {
  const hadFocus = document.activeElement?.matches('.memcard'),
    restoreFocus =
      hadFocus || (state.memoryRestoreFocus && document.activeElement === document.body),
    s = state,
    columns = s.pairs <= 6 ? 4 : s.pairs <= 16 ? 4 : s.pairs <= 20 ? 5 : 6;
  s.memoryVersion = (s.memoryVersion || 0) + 1;
  if (s.matched.includes(s.memoryFocus))
    s.memoryFocus = s.deck.findIndex((_, i) => !s.matched.includes(i));
  setHTML(
    wrap(
      'memory',
      `<div class="stats"><div class="stat"><small>الحركات</small><b>${s.moves}</b></div><div class="stat"><small>الأزواج</small><b dir="ltr">${s.matched.length / 2} / ${s.pairs}</b></div><div class="stat"><small>الوقت</small><b id="memtime">${memoryElapsed(s)} ث</b></div></div><div class="progressline" role="progressbar" aria-label="الأزواج المكتملة" aria-valuemin="0" aria-valuemax="${s.pairs}" aria-valuenow="${s.matched.length / 2}"><span style="width:${(s.matched.length / s.deck.length) * 100}%"></span></div><div class="memory" role="group" aria-label="لوحة الذاكرة، ${s.deck.length} بطاقة، ${s.matched.length / 2} أزواج مكتملة من ${s.pairs}" style="grid-template-columns:repeat(${columns},minmax(0,1fr))">${s.deck
        .map((v, i) => {
          const m = s.matched.includes(i),
            up = m || s.up.includes(i) || s.peek,
            face = s.faces?.[i] || v;
          return `<button class="memcard ${m ? 'matched' : up ? 'up' : ''} ${s.memoryMode === 'meaning' && face !== v ? 'meaning-card' : ''}" data-memory-index="${i}" tabindex="${i === s.memoryFocus ? 0 : -1}" onclick="flipCard(${i},${s.memoryVersion},${s.memoryTurn})" ${m || s.locked || s.done ? 'disabled' : ''} aria-label="بطاقة ${i + 1}، ${m ? 'زوج مكتمل ' : ''}${up ? esc(face) : 'مقلوبة'}" aria-pressed="${up}">${up ? esc(face) : '✦'}</button>`;
        })
        .join(
          '',
        )}</div><p class="note center" role="status">${s.peek ? 'تذكر الأماكن! الكشف مؤقت، والبطاقات ترجع مقلوبة بعده.' : s.locked ? 'غير متطابقتين؛ تذكر أماكنهما للمحاولة التالية.' : s.notice || 'اختر بطاقتين وابحث عن الأزواج.'}</p><p class="tiny center">سلسلة الأزواج: ${s.streak} · أفضل سلسلة: ${s.bestStreak} · كفاءة ${s.moves ? Math.round((s.matched.length / 2 / s.moves) * 100) : 0}%</p><div class="actions"><button onclick="memoryHint()" ${s.done || s.locked || s.up.length || s.hintsUsed >= 2 ? 'disabled' : ''}>كشف قصير −12 (${2 - s.hintsUsed})</button><button class="quiet" onclick="setup('memory')">لوحة جديدة</button></div>`,
    ),
  );
  if (s.memoryMode === 'meaning')
    $('app')
      .querySelector('.memory')
      ?.insertAdjacentHTML(
        'beforebegin',
        '<p class="note center">طابق الصورة مع اسمها العربي؛ لكل رمز بطاقة صورة وبطاقة اسم.</p>',
      );
  if (s.duo)
    $('app')
      .querySelector('.stats')
      ?.insertAdjacentHTML(
        'beforebegin',
        `<div class="turn-ribbon memory-duel"><b>الدور على ${esc(s.memoryPlayers[s.memoryTurn])}</b>${s.memoryPlayers.map((name, i) => `<span>${esc(name)}: ${s.matchCounts[i]} أزواج</span>`).join('')}<small>الزوج الصحيح يبقي الدور؛ بعد الخطأ ينتقل الدور. المساعدات مغلقة في المواجهة.</small></div>`,
      );
  if (s.duo) $('app').querySelector('button[onclick="memoryHint()"]')?.setAttribute('disabled', '');
  if (hadFocus && s.locked) s.memoryRestoreFocus = true;
  if (restoreFocus && !s.done && !s.locked) {
    document
      .querySelector(`[data-memory-index="${s.memoryFocus}"]:not(:disabled)`)
      ?.focus({ preventScroll: true });
    s.memoryRestoreFocus = false;
  }
  guardCoreView();
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
  if (s.passAfterHide) {
    s.memoryTurn = 1 - s.memoryTurn;
    s.passAfterHide = false;
    s.notice = `الدور انتقل إلى ${s.memoryPlayers[s.memoryTurn]}.`;
  }
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
  if (state.duo) return;
  const s = state;
  s.started ??= Date.now();
  s.hintsUsed++;
  s.peek = true;
  s.locked = true;
  s.endAt = Date.now() + 2000;
  renderMemory();
  later(() => hideMemoryCards(s), 2000);
}
function flipCard(i, version = state?.memoryVersion, turn = state?.memoryTurn) {
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
  if (version !== s.memoryVersion || turn !== s.memoryTurn) return;
  if (s.up.includes(i) || s.matched.includes(i)) return;
  s.memoryFocus = i;
  s.started ??= Date.now();
  s.up.push(i);
  tone();
  if (s.up.length === 2) {
    s.moves++;
    const [a, b] = s.up;
    if (s.deck[a] === s.deck[b]) {
      if (s.duo) s.matchCounts[s.memoryTurn]++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.notice =
        s.streak > 1
          ? `ممتاز! ${s.streak} أزواج متتالية دون خطأ.`
          : 'زوج صحيح! ابحث عن الزوج التالي.';
      s.matched.push(a, b);
      s.up = [];
      if (s.matched.length === s.deck.length) {
        s.done = true;
        clearTimers();
        if (s.duo) {
          s.players = [...s.memoryPlayers];
          s.results = Object.create(null);
          const best = Math.max(...s.matchCounts),
            tied = s.matchCounts[0] === s.matchCounts[1];
          s.players.forEach((name, index) => {
            const points = Math.min(
              100,
              Math.round((s.matchCounts[index] * 90) / s.pairs) +
                (s.matchCounts[index] === best ? (tied ? 5 : 10) : 0),
            );
            s.results[name] = points;
            addScore(name, points);
          });
          partyResult('memory', s);
          $('app')
            .querySelector('.success')
            ?.insertAdjacentHTML(
              'beforeend',
              `<p class="note center">${s.matchCounts[0]} مقابل ${s.matchCounts[1]} أزواج · ${s.moves} محاولات. النقاط من نصيب كل لاعب في الأزواج ومكافأة الفائز.</p>`,
            );
          return;
        }
        const secs = memoryElapsed(s),
          accuracy = Math.round((s.pairs / s.moves) * 100),
          ceiling = Math.min(100, 60 + s.pairs * 2),
          p = Math.max(
            10,
            Math.min(
              100,
              Math.round(ceiling * (0.6 + (0.4 * s.pairs) / s.moves)) +
                Math.min(10, Math.max(0, s.bestStreak - 1) * 2) -
                s.hintsUsed * 12,
            ),
          );
        addScore(s.name, p);
        renderMemory();
        later(() => {
          if (screen === 'memory' && state === s)
            result(
              'memory',
              'ذاكرتك قوية! 🧩',
              `${s.moves} حركة خلال ${secs} ثانية · كفاءة ${accuracy}% · أفضل سلسلة ${s.bestStreak} · ${s.hintsUsed} كشوف مساعدة. النقاط تعتمد على حجم اللوحة والكفاءة والسلسلة.`,
              p,
            );
        }, 450);
        return;
      }
    } else {
      s.streak = 0;
      s.notice = '';
      s.locked = true;
      s.passAfterHide = s.duo;
      const delay = s.mismatchDelay || 850;
      s.endAt = Date.now() + delay;
      later(() => hideMemoryCards(s), delay);
    }
  }
  renderMemory();
}
function startMime() {
  if (screen !== 'setup' || state?.id !== 'mime' || coreBlocked()) return;
  if (!requirePlayers('mime')) return;
  const queue = shuffle(selectedItems());
  if (!queue.length) return toast('لا توجد كلمات في هذه الفئة.');
  state = {
    id: 'mime',
    players: gameParticipants('mime'),
    duration: Number($('duration').value),
    rounds: Number($('rounds').value),
    ruleMode: ['scene', 'story'].includes($('mimerule')?.value) ? $('mimerule').value : 'classic',
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
const mimeSceneRules = [
  'مثّل بحركة بطيئة',
  'استخدم يديك فقط',
  'ابدأ بتوضيح الحجم',
  'مثّل كأنك تحت الماء',
  'مثّل وأنت جالس',
  'ابدأ بفعل يرتبط بالكلمة',
  'استخدم تعابير الوجه والجسم',
  'كرر حركة واحدة حتى يفهمون',
];
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
  guardCoreView();
}
function nextMimeWord(keepHidden = false) {
  const s = state,
    previous = s.word;
  if (s.index >= s.queue.length) {
    s.queue = shuffle(s.queue);
    s.index = 0;
    if (s.queue.length > 1 && items[s.queue[0]].name === previous)
      [s.queue[0], s.queue[1]] = [s.queue[1], s.queue[0]];
  }
  s.word = items[s.queue[s.index++]].name;
  s.cardSerial = (s.cardSerial || 0) + 1;
  s.sceneRule =
    s.ruleMode === 'story'
      ? [
          'قدّم شخصية الحكاية بالكلمة',
          'مثّل مشكلة تواجه الشخصية بالكلمة',
          'اختم الحكاية بحل مرتبط بالكلمة',
        ][Math.min(2, s.correct || 0)]
      : s.ruleMode === 'scene'
        ? mimeSceneRules[(s.cardSerial - 1) % mimeSceneRules.length]
        : '';
  s.hiddenWord = keepHidden;
}
function mimeReady() {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'handoff' || state.done) return;
  const s = state;
  s.score = 0;
  s.correct = 0;
  s.skips = 0;
  s.streak = 0;
  s.bestStreak = 0;
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
      `<section class="panel"><div class="timerline"><span class="pill">🎭 ${esc(s.players[s.turn % s.players.length])}</span><b class="countdown" id="partytime">${Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000))}</b><span class="pill">${s.score} نقطة</span></div><div class="spot"><small>مثّل بدون كلام</small><div class="huge word" style="color:var(--orange)">${s.hiddenWord ? '🔒 الكلمة مخفية' : esc(s.word)}</div></div><div class="actions"><button class="primary" onclick="mimeAnswer(true,${s.turn},${s.cardSerial})">عرفوها! +10</button><button onclick="mimeAnswer(false,${s.turn},${s.cardSerial})">تجاوز −2</button></div><p class="note">صح: ${s.correct} · تجاوز: ${s.skips} · سلسلة ${s.streak}. ${s.ruleMode === 'story' ? 'إكمال مراحل الحكاية الثلاث يمنح +10 إضافية؛ التجاوز لا يلغي المراحل المكتملة.' : 'كل 3 كلمات صحيحة متتالية تمنح +5 إضافية؛ التجاوز يقطع السلسلة.'}</p><div class="actions"><button onclick="toggleMimeWord(${s.turn},${s.cardSerial})">${s.hiddenWord ? 'إظهار الكلمة' : 'إخفاء الكلمة'}</button><button onclick="undoMime(${s.turn},${s.cardSerial})" ${!s.log.length ? 'disabled' : ''}>↶ تراجع عن آخر ضغطة</button><button class="quiet" onclick="endMime(${s.turn},${s.cardSerial})">أنهِ الدور</button></div><p class="tiny center">إخفاء الكلمة يحافظ على السر؛ الوقت يظل شغالاً. نقاط الدور لا تنزل عن صفر.</p></section>`,
    ),
  );
  if (s.ruleMode === 'story')
    $('app')
      .querySelector('.panel')
      ?.insertAdjacentHTML(
        'afterbegin',
        `<div class="mission-ribbon"><b>🎬 حكاية من 3 كلمات</b><small>مقدمة ← مشكلة ← حل · ${s.correct}/3 مكتملة · ${3 - s.skips} تجاوزات باقية. إكمالها ينهي الدور ويمنح +10 بدل مكافأة السلسلة +5.</small></div>`,
      );
  $('app')
    .querySelector('.spot')
    ?.insertAdjacentHTML(
      'beforeend',
      `${s.sceneRule && !s.hiddenWord ? `<div class="scene-rule">🎬 ${esc(s.sceneRule)}</div>` : ''}<p class="tiny">المراقب لهذا الدور: ${esc(s.players[(s.turn + 1) % s.players.length])} · يراجع صحة التخمين والالتزام بعدم الكلام.</p>`,
    );
  if (s.ruleMode === 'story' && s.skips >= 3)
    $('app').querySelector(
      `button[onclick="mimeAnswer(false,${s.turn},${s.cardSerial})"]`,
    ).disabled = true;
  guardCoreView();
}
function toggleMimeWord(turn = state?.turn, serial = state?.cardSerial) {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'active') return;
  if (state.turn !== turn || state.cardSerial !== serial) return;
  if (Date.now() >= state.endAt) return endMime();
  state.hiddenWord = !state.hiddenWord;
  renderMime();
}
function undoMime(turn = state?.turn, serial = state?.cardSerial) {
  if (
    screen !== 'mime' ||
    coreBlocked() ||
    state.stage !== 'active' ||
    !state.log.length ||
    state.turn !== turn ||
    state.cardSerial !== serial
  )
    return;
  if (Date.now() >= state.endAt) return endMime();
  const previous = state.log.pop();
  Object.assign(state, {
    word: previous.word,
    index: previous.index,
    queue: previous.queue,
    score: previous.score,
    correct: previous.correct,
    skips: previous.skips,
    streak: previous.streak,
    bestStreak: previous.bestStreak,
    hiddenWord: state.hiddenWord || previous.hiddenWord,
    sceneRule: previous.sceneRule,
    cardSerial: (state.cardSerial || 0) + 1,
  });
  renderMime();
}
function mimeAnswer(ok, turn = state?.turn, serial = state?.cardSerial) {
  if (
    screen !== 'mime' ||
    coreBlocked() ||
    state.stage !== 'active' ||
    state.done ||
    typeof ok !== 'boolean' ||
    state.turn !== turn ||
    state.cardSerial !== serial
  )
    return;
  if (Date.now() >= state.endAt) return endMime();
  const s = state;
  if (!ok && s.ruleMode === 'story' && s.skips >= 3)
    return toast('انتهت التجاوزات الثلاثة؛ أكمل المشهد أو أنهِ الدور.');
  s.log.push({
    word: s.word,
    ok: !!ok,
    sceneRule: s.sceneRule,
    hiddenWord: s.hiddenWord,
    index: s.index,
    queue: [...s.queue],
    score: s.score,
    correct: s.correct,
    skips: s.skips,
    streak: s.streak,
    bestStreak: s.bestStreak,
  });
  if (ok) {
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.score += 10 + (s.ruleMode !== 'story' && s.streak % 3 === 0 ? 5 : 0);
    s.correct++;
    tone();
  } else {
    s.score = Math.max(0, s.score - 2);
    s.skips++;
    s.streak = 0;
  }
  if (s.ruleMode === 'story' && s.correct >= 3) {
    s.score += 10;
    return endMime();
  }
  nextMimeWord(s.hiddenWord);
  renderMime();
}
function endMime(turn = state?.turn, serial = state?.cardSerial) {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'active') return;
  if (state.turn !== turn || state.cardSerial !== serial) return;
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
      `<section class="panel center"><div class="resulticon">⏱</div><h2>خلص دور ${esc(name)}</h2><div class="resultnum">${s.score} نقطة</div><p class="note">${s.correct} كلمات صحيحة · ${s.skips} تجاوزات · أفضل سلسلة ${s.bestStreak}</p>${s.log.length ? `<details class="history"><summary>الكلمات في هذا الدور (${s.log.length})</summary><div class="listchips">${s.log.map((v) => `<span>${v.ok ? '✓' : '↷'} ${esc(v.word)}</span>`).join('')}</div></details>` : ''}<div class="actions"><button class="primary" onclick="advanceMime(${s.turn})">الدور التالي ←</button></div></section>`,
    ),
  );
  if (s.ruleMode !== 'story' || s.correct < 3)
    $('app')
      .querySelector('.panel')
      ?.insertAdjacentHTML(
        'beforeend',
        `<p class="note center">الكلمة الأخيرة غير المحتسبة: <b>${esc(s.word)}</b>. لم نضف نقاطاً لها.</p>`,
      );
  guardCoreView();
}
function advanceMime(turn = state?.turn) {
  if (screen !== 'mime' || coreBlocked() || state.stage !== 'result') return;
  if (state.turn !== turn) return;
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
  if (screen !== 'setup' || state?.id !== 'secret' || coreBlocked()) return;
  if (!requirePlayers('secret')) return;
  const pool = shuffle(selectedItems());
  if (!pool.length) return toast('لا توجد كلمات في هذه الفئة.');
  state = {
    id: 'secret',
    players: gameParticipants('secret'),
    duration: Number($('duration').value),
    secretRule: $('secretRule')?.value === 'relay' ? 'relay' : 'classic',
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
  s.questionTexts = [];
  s.questionAuthors = [];
  s.questionDraft = '';
  s.guessDraft = '';
  s.guessAuthor = null;
  s.askerChoice = null;
  s.textGuesses = [];
  s.questionSerial = 0;
  s.textWinner = null;
  s.finalGuessUsed = false;
  s.word = '';
  const name = s.players[secretTurnIndex()];
  setHTML(
    wrap(
      'secret',
      `<section class="panel center"><div class="resulticon">🤫</div><h2>${esc(name)} يختار الكلمة</h2><p class="note">الجولة ${Math.floor(s.turn / s.players.length) + 1} من ${s.rounds} · الدور ${secretTurnIndex() + 1} من ${s.players.length}. خل الجهاز مع صاحب الدور وحده.</p><div class="actions"><button class="primary" onclick="revealSecret()">أنا ${esc(name)}، أرني الكلمة</button></div></section>`,
    ),
  );
  guardCoreView();
}
function revealSecret() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'handoff') return;
  const s = state;
  s.stage = 'revealed';
  if (s.index >= s.pool.length) {
    s.pool = shuffle(s.pool);
    s.index = 0;
    if (s.pool.length > 1 && items[s.pool[0]].name === s.previousSecretWord)
      [s.pool[0], s.pool[1]] = [s.pool[1], s.pool[0]];
  }
  s.word = items[s.pool[s.index++]].name;
  s.wordAliases = [...items[s.pool[s.index - 1]].aliases];
  setHTML(
    wrap(
      'secret',
      `<section class="panel"><div class="spot"><small>كلمة السر · لا تعرضها لأحد</small><div class="secret" id="secretChosenWord">${esc(s.word)}</div></div><details class="history private-word-picker"><summary>اختَر كلمة ثانية من الفئة</summary><label for="secretWordSearch">ابحث بالاسم أو الاسم البديل</label><input id="secretWordSearch" maxlength="50" autocomplete="off" placeholder="اكتب الكلمة لتظهر بسرعة…" oninput="searchSecretWords(this.value)"><div id="secretWordMatches"></div></details><label for="customword">أو اكتب كلمة من عندك (اختياري)</label><input id="customword" maxlength="40" autocomplete="off" placeholder="اتركها فارغة لاستعمال الكلمة المعروضة"><div class="actions"><button class="primary" onclick="hideSecret()">إخفاء وتمرير الجهاز</button></div></section>`,
    ),
  );
  searchSecretWords('');
  guardCoreView();
}
function searchSecretWords(value) {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'revealed') return;
  const query = norm(String(value).slice(0, 50)),
    matches = state.pool.filter(
      (i) => !query || items[i].aliases.some((name) => norm(name).includes(query)),
    );
  $('secretWordMatches').innerHTML =
    `<p class="tiny" role="status">${matches.length} كلمات${matches.length > 12 ? ' · اكتب الاسم لتضييق البحث؛ نعرض أول 12' : ''}</p><div class="word-search-results">${matches
      .slice(0, 12)
      .map(
        (i) =>
          `<button class="smallbtn" onclick="selectSecretWord(${i},${state.turn})">${esc(items[i].name)}</button>`,
      )
      .join('')}</div>`;
  guardCoreView();
}
function selectSecretWord(i, turn = state?.turn) {
  if (
    screen !== 'secret' ||
    coreBlocked() ||
    state.stage !== 'revealed' ||
    state.turn !== turn ||
    !state.pool.includes(i)
  )
    return;
  state.word = items[i].name;
  state.wordAliases = [...items[i].aliases];
  $('secretChosenWord').textContent = state.word;
  $('customword').value = '';
}
function hideSecret() {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'revealed') return;
  const custom = $('customword').value.trim();
  if (custom) {
    state.word = custom;
    const known = items.find((item) => item.aliases.some((name) => norm(name) === norm(custom)));
    state.wordAliases = [...new Set([custom, ...(known?.aliases || [])])];
  }
  state.previousSecretWord = state.word;
  state.stage = 'hidden';
  setHTML(
    wrap(
      'secret',
      `<section class="panel center"><div class="resulticon">🔒</div><h2>اختفت كلمة السر</h2><p class="note">مرّر الجهاز للباقين. اسألوا ${esc(state.players[secretTurnIndex()])} أسئلة جوابها نعم أو لا، وخمنوا بالكلام.</p><div class="actions"><button class="primary" onclick="secretReady()">كلنا جاهزون، شغّل الوقت</button></div></section>`,
    ),
  );
  guardCoreView();
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
  if ($('secretGuessInput')) {
    s.guessDraft = $('secretGuessInput').value;
    s.guessAuthor = Number($('secretGuesser')?.value);
  }
  setHTML(
    wrap(
      'secret',
      `<section class="panel"><div class="timerline"><span class="pill">${esc(s.players[secretTurnIndex()])} يعرف السر</span><b class="countdown" id="partytime">${Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000))}</b></div><div class="spot"><div style="font-size:40px">🔐</div><h2>${remaining ? 'اسألوا… وخمنوا' : 'آخر تخمين!'}</h2><p class="note">الأسئلة <bdi dir="ltr">${s.questions} / ${s.questionLimit}</bdi> · باقي ${remaining}</p><div class="progressline"><span style="width:${(s.questions / s.questionLimit) * 100}%"></span></div></div><label for="secretQuestionText">${s.secretRule === 'relay' ? 'اكتب سؤال صاحب الدور (مطلوب، 3 أحرف على الأقل)' : 'دوّن السؤال حتى تراجعوا الأدلة (اختياري)'}</label><input id="secretQuestionText" maxlength="100" autocomplete="off" value="${esc(s.questionDraft || '')}" ${!remaining ? 'disabled' : ''} oninput="secretDraft(this.value,${s.turn},${s.questionSerial})" placeholder="مثلاً: هل نستخدمه داخل البيت؟"><p class="note">بعد كل سؤال سجّلوا إجابة صاحب الكلمة:</p><div class="actions"><button onclick="secretQuestion('yes',${s.turn},${s.questionSerial})" ${!remaining ? 'disabled' : ''}>نعم ✓</button><button onclick="secretQuestion('no',${s.turn},${s.questionSerial})" ${!remaining ? 'disabled' : ''}>لا ✕</button><button onclick="secretQuestion('unknown',${s.turn},${s.questionSerial})" ${!remaining ? 'disabled' : ''}>مو متأكد / غير ذلك</button></div>${s.questionLog.length ? `<ol class="history" aria-label="سجل الأسئلة والأدلة">${s.questionLog.map((v, i) => `<li>${esc(s.players[s.questionAuthors?.[i]] || '')}${s.questionAuthors?.[i] !== undefined ? ': ' : ''}${esc(s.questionTexts?.[i] || 'سؤال ' + (i + 1))} — <b>${v === 'yes' ? 'نعم ✓' : v === 'no' ? 'لا ✕' : v === 'wrong' ? 'تخمين خاطئ ✕' : 'غير محدد'}</b></li>`).join('')}</ol>` : ''}<div class="actions"><button onclick="undoSecretQuestion(${s.turn},${s.questionSerial})" ${!s.questions ? 'disabled' : ''}>↶ تراجع عن سؤال</button><button class="primary" onclick="secretEnd(true,${s.turn},${s.questionSerial})">عرفناها! ✓</button></div><p class="note">بعد السؤال الأخير يبقى تخمين أخير بالكلام قبل كشف الكلمة. الأسئلة والتخمينات تحصل بينكم، والجهاز يسجل العدد والأدلة.</p><div class="actions"><button class="quiet" onclick="secretEnd(false,${s.turn},${s.questionSerial})">ما عرفناها، اكشف السر</button></div></section>`,
    ),
  );
  const panel = $('app').querySelector('.panel'),
    asker = secretAskerIndex();
  panel?.insertAdjacentHTML(
    'afterbegin',
    `<div class="turn-ribbon"><span>السائل المقترح: <b>${esc(s.players[asker])}</b></span><small>${s.secretRule === 'relay' ? 'الكتابة والتخمين للسائل صاحب الدور؛ بعد آخر سؤال تتعاونون في التخمين الأخير.' : 'الدور يتبدّل بعد كل سؤال؛ تقدرون تسألون بالتعاون.'}</small></div>`,
  );
  panel?.insertAdjacentHTML(
    'beforeend',
    `<form class="secret-guess" onsubmit="event.preventDefault();guessSecret(${s.turn},${s.questionSerial})"><label for="secretGuessInput">خمن الكلمة كتابةً</label><div class="guess-entry"><input id="secretGuessInput" maxlength="40" autocomplete="off" placeholder="الكلمة أو اسمها البديل" ${s.finalGuessUsed ? 'disabled' : ''}><button type="submit" class="primary" ${s.finalGuessUsed ? 'disabled' : ''}>تحقق</button></div><label for="secretGuesser">من صاحب هذا التخمين؟</label><select id="secretGuesser">${s.players.map((name, i) => (i === secretTurnIndex() ? '' : `<option value="${i}" ${i === asker ? 'selected' : ''}>${esc(name)}</option>`)).join('')}</select><p class="tiny">الخطأ المكتوب يستهلك سؤالاً؛ تكرار نفس التخمين لا يخصم. عند نفاد الأسئلة بقي تخمين مكتوب أخير. زر «عرفناها» يبقى للتحقق بينكم بالكلام.</p>${s.textGuesses.length ? `<div class="listchips">${s.textGuesses.map((v) => `<span>✕ ${esc(v.raw)}</span>`).join('')}</div>` : ''}</form>`,
  );
  $('secretGuessInput').value = s.guessDraft || '';
  if (s.secretRule === 'classic' && s.players[s.guessAuthor] && s.guessAuthor !== secretTurnIndex())
    $('secretGuesser').value = String(s.guessAuthor);
  if (s.secretRule === 'classic')
    panel
      ?.querySelector('label[for="secretQuestionText"]')
      ?.insertAdjacentHTML(
        'beforebegin',
        `<label for="secretActualAsker">من يسأل الآن؟</label><select id="secretActualAsker" onchange="chooseSecretAsker(this.value,${s.turn},${s.questionSerial})">${s.players
          .map((name, i) =>
            i === secretTurnIndex()
              ? ''
              : `<option value="${i}" ${i === asker ? 'selected' : ''}>${esc(name)}</option>`,
          )
          .join(
            '',
          )}</select><p class="tiny">اقترحنا اسمًا بالتناوب؛ تقدر تختار السائل الفعلي بحرية.</p>`,
      );
  if (s.secretRule === 'relay')
    panel?.insertAdjacentHTML(
      'afterbegin',
      `<div class="mission-ribbon"><b>📒 تحقيق بالتناوب</b><small>صاحب الدور يكتب السؤال ويسجّل الجواب أو يخمن. يتحول الدور بعد كل سؤال؛ التراجع يعيد السؤال والسائل.</small></div><div class="question-starters" role="group" aria-label="اقتراحات سؤال">${['هل نستخدمه يوميًا؟', 'هل يوجد عادة داخل البيت؟', 'هل يمكن حمله باليد؟', 'هل يرتبط بالطبيعة؟'].map((question, index) => `<button class="smallbtn" onclick="secretStarter(${index},${s.turn},${s.questionSerial})">${question}</button>`).join('')}</div>`,
    );
  const progress = $('app').querySelector('.progressline');
  progress?.setAttribute('role', 'progressbar');
  progress?.setAttribute('aria-label', 'الأسئلة المستعملة');
  progress?.setAttribute('aria-valuemin', '0');
  progress?.setAttribute('aria-valuemax', String(s.questionLimit));
  progress?.setAttribute('aria-valuenow', String(s.questions));
  guardCoreView();
}
function secretStarter(index, turn, serial) {
  if (
    screen !== 'secret' ||
    coreBlocked() ||
    state.stage !== 'active' ||
    state.turn !== turn ||
    state.questionSerial !== serial ||
    state.questions >= state.questionLimit
  )
    return;
  const value = [
    'هل نستخدمه يوميًا؟',
    'هل يوجد عادة داخل البيت؟',
    'هل يمكن حمله باليد؟',
    'هل يرتبط بالطبيعة؟',
  ][index];
  if (!value) return;
  $('secretQuestionText').value = value;
  state.questionDraft = value;
}
function secretAskerIndex() {
  const s = state,
    owner = secretTurnIndex(),
    askers = s.players.map((_, i) => i).filter((i) => i !== owner);
  return s.secretRule === 'classic' && askers.includes(s.askerChoice)
    ? s.askerChoice
    : askers[s.questions % askers.length];
}
function chooseSecretAsker(value, turn = state?.turn, serial = state?.questionSerial) {
  if (
    screen !== 'secret' ||
    state.stage !== 'active' ||
    coreBlocked() ||
    state.secretRule !== 'classic' ||
    state.turn !== turn ||
    state.questionSerial !== serial
  )
    return;
  const index = Number(value);
  if (!Number.isInteger(index) || !state.players[index] || index === secretTurnIndex()) return;
  state.askerChoice = index;
  const label = $('app').querySelector('.turn-ribbon b');
  if (label) label.textContent = state.players[index];
}
function secretDraft(value, turn, serial) {
  if (
    screen === 'secret' &&
    !state.done &&
    !coreBlocked() &&
    state.stage === 'active' &&
    state.turn === turn &&
    state.questionSerial === serial
  )
    state.questionDraft = String(value).slice(0, 100);
}
function guessSecret(turn = state?.turn, serial = state?.questionSerial) {
  if (
    screen !== 'secret' ||
    coreBlocked() ||
    state.stage !== 'active' ||
    state.turn !== turn ||
    state.questionSerial !== serial ||
    state.finalGuessUsed
  )
    return;
  if (Date.now() >= state.endAt) return secretEnd(false);
  const s = state,
    raw = $('secretGuessInput')?.value.trim(),
    value = norm(raw || ''),
    winner = Number($('secretGuesser')?.value);
  if (!value) return toast('اكتب تخمين الكلمة أولاً.');
  if (!s.players[winner] || winner === secretTurnIndex()) return;
  if (s.secretRule === 'relay' && s.questions < s.questionLimit && winner !== secretAskerIndex())
    return toast('التخمين الآن للسائل صاحب الدور. بعد نهاية الأسئلة لكم تخمين أخير بالتعاون.');
  if (s.textGuesses.some((v) => v.value === value))
    return toast('هذا التخمين جربتوه؛ لم نخصم سؤالاً.');
  const correct = (s.wordAliases || [s.word]).some((alias) => norm(alias) === value),
    final = s.questions >= s.questionLimit;
  if (final) s.finalGuessUsed = true;
  if (correct) {
    s.textWinner = winner;
    return secretEnd(true);
  }
  s.textGuesses.push({ raw, value });
  if (final) return secretEnd(false);
  $('secretGuessInput').value = '';
  s.questionAuthors.push(winner);
  s.questionTexts.push('تخمين: ' + raw);
  s.questionLog.push('wrong');
  s.questions++;
  s.questionSerial++;
  s.askerChoice = null;
  renderSecret();
  toast('الكلمة مختلفة؛ استُهلك سؤال واحد. راجعوا الأدلة.');
}
function secretQuestion(answer = 'unknown', turn = state?.turn, serial = state?.questionSerial) {
  if (
    screen !== 'secret' ||
    coreBlocked() ||
    state.stage !== 'active' ||
    state.questions >= state.questionLimit ||
    state.turn !== turn ||
    state.questionSerial !== serial
  )
    return;
  if (Date.now() >= state.endAt) return secretEnd(false);
  if (state.secretRule === 'relay' && ($('secretQuestionText')?.value || '').trim().length < 3)
    return toast('في التحقيق بالتناوب اكتب السؤال قبل تسجيل الإجابة.');
  state.questionAuthors.push(secretAskerIndex());
  state.questionLog.push(['yes', 'no'].includes(answer) ? answer : 'unknown');
  state.questionTexts.push(
    ($('secretQuestionText')?.value ?? state.questionDraft ?? '').trim().slice(0, 100),
  );
  state.questionDraft = '';
  state.questions++;
  state.questionSerial++;
  state.askerChoice = null;
  renderSecret();
}
function undoSecretQuestion(turn = state?.turn, serial = state?.questionSerial) {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'active' || !state.questions) return;
  if (state.turn !== turn || state.questionSerial !== serial) return;
  if (Date.now() >= state.endAt) return secretEnd(false);
  const author = state.questionAuthors.pop(),
    text = state.questionTexts.pop() || '',
    wrong = state.questionLog.at(-1) === 'wrong';
  if (wrong) {
    const guess = state.textGuesses.pop();
    $('secretGuessInput').value = guess?.raw || '';
    $('secretGuesser').value = String(author);
  }
  state.questionLog.pop();
  state.questionDraft = wrong ? '' : text;
  state.askerChoice = author;
  state.questions--;
  state.questionSerial++;
  renderSecret();
}
function secretEnd(won, turn = state?.turn, serial = state?.questionSerial) {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'active') return;
  if (state.turn !== turn || state.questionSerial !== serial) return;
  if (won && Date.now() >= state.endAt) won = false;
  clearTimers();
  const s = state;
  s.stage = won ? 'award' : 'result';
  setHTML(
    wrap(
      'secret',
      `<section class="panel center"><div class="resulticon">${won ? '🎉' : '⏱'}</div><h2>${won ? 'عرفتوا السر!' : 'انكشف السر'}</h2><div class="secret">${esc(s.word)}</div><p class="note">${s.questions} أسئلة من ${s.questionLimit}</p>${won ? `<div class="fields"><div class="field full"><label for="winner">من قال الجواب الصحيح أولاً؟</label><select id="winner">${s.players.map((n, i) => (i === secretTurnIndex() ? '' : `<option value="${i}" ${s.textWinner === i ? 'selected' : ''}>${esc(n)}</option>`)).join('')}</select></div></div><div class="actions"><button class="primary" onclick="awardSecret(${s.turn})">احسب النقاط ونكمل</button></div>` : `<div class="actions"><button class="primary" onclick="advanceSecret(${s.turn})">الدور التالي ←</button></div>`}</section>`,
    ),
  );
  if (s.questionLog.length)
    $('app')
      .querySelector('.panel')
      ?.insertAdjacentHTML(
        'beforeend',
        `<details class="history"><summary>راجع سجل التحقيق (${s.questions})</summary><ol>${s.questionLog.map((answer, i) => `<li>${esc(s.players[s.questionAuthors[i]] || '')}: ${esc(s.questionTexts[i] || 'سؤال ' + (i + 1))} — <b>${answer === 'yes' ? 'نعم ✓' : answer === 'no' ? 'لا ✕' : answer === 'wrong' ? 'تخمين خاطئ ✕' : 'غير محدد'}</b></li>`).join('')}</ol></details>`,
      );
  guardCoreView();
}
function awardSecret(turn = state?.turn) {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'award') return;
  if (state.turn !== turn) return;
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
function advanceSecret(turn = state?.turn) {
  if (screen !== 'secret' || coreBlocked() || state.stage !== 'result') return;
  if (state.turn !== turn) return;
  state.turn++;
  secretHandoff();
}
function startReaction() {
  if (screen !== 'setup' || state?.id !== 'reaction' || coreBlocked()) return;
  const players = $('group').checked ? gameParticipants('reaction') : [player()],
    value = Number($('trials')?.value || 3),
    trials = [3, 5, 7].includes(value) ? value : 3;
  if ($('group').checked && players.length < 2) {
    toast('اختر لاعبين مختلفين للمنافسة.');
    return;
  }
  state = {
    id: 'reaction',
    players,
    trials,
    mode: $('reactionmode')?.value === 'focus' ? 'focus' : 'classic',
    noGoPassed: 0,
    reactionRule: $('reactionrule')?.value === 'choice' ? 'choice' : 'standard',
    requiredSide: 0,
    wrongDirection: false,
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
      decoy: ['توقف ✋', 'برتقالي: لا تضغط؛ انتظر الأخضر'],
      result: [
        `${s.last} ملّي ثانية`,
        s.wrongDirection
          ? 'اتجاه خاطئ! احتُسبت 1500 ملّي ثانية'
          : s.anticipated
            ? 'ضغطة متوقعة أسرع من 70 ms! احتُسبت 1500 ms'
            : s.noGoError
              ? 'ضغطت إشارة التوقف البرتقالية! احتُسبت 1500 ms'
              : s.falseStart
                ? 'ضغط مبكر! احتُسبت 1500 ملّي ثانية'
                : 'وقت استجابتك في هذه المحاولة',
      ],
    },
    t = texts[s.stage];
  setHTML(
    wrap(
      'reaction',
      `<div class="stats"><div class="stat"><small>الدور على</small><b style="font-size:19px">${esc(name)}</b></div><div class="stat"><small>المحاولة</small><b dir="ltr">${Math.floor(s.turn / s.players.length) + 1} / ${s.trials}</b></div><div class="stat"><small>متوسطك الحالي</small><b>${times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) + ' ms' : '—'}</b></div></div>${s.reactionRule === 'choice' ? `<div class="reaction reaction-display ${s.stage}" role="status" aria-live="polite"><span>${s.stage === 'ready' ? (s.requiredSide === 0 ? '← يسار' : 'يمين →') : t[0]}</span><small>${s.stage === 'idle' ? 'اضغط أحد الاتجاهين للبدء' : s.stage === 'ready' ? 'اختر اتجاه السهم' : t[1]}</small></div><div class="reaction-directions" dir="ltr">${[0, 1].map((side) => `<button onpointerdown="if(event.isPrimary&&event.button===0){event.preventDefault();reactionChoice(${side},${s.turn},'${s.stage}')}" onclick="if(event.detail===0)reactionChoice(${side},${s.turn},'${s.stage}')" ${s.stage === 'result' ? 'disabled' : ''}>${side === 0 ? '← يسار' : 'يمين →'}</button>`).join('')}</div>` : `<button class="reaction ${s.stage}" onpointerdown="if(event.isPrimary&&event.button===0){event.preventDefault();reactionTap()}" onclick="if(event.detail===0)reactionTap()" aria-label="${t[0]}"><span>${t[0]}</span><small>${t[1]}</small></button>`}${s.stage === 'result' ? `<div class="actions"><button class="primary" onclick="advanceReaction(${s.turn})">المحاولة التالية ←</button></div>` : ''}<p class="note center">${s.reactionRule === 'choice' ? 'قرار سريع: الاتجاه الخاطئ بعقوبة 1500 ms؛ استخدم ← أو →. ' : ''}${s.mode === 'focus' ? 'وضع التمييز: اضغط الأخضر فقط؛ تجاهل البرتقالي. ' : ''}${s.trials} محاولات لكل لاعب · ${s.reactionRule === 'choice' ? 'أزرار الاتجاه أو الأسهم' : 'لمس أو ضغط المسافة'} · نفس الجهاز يعطي مقارنة أفضل.</p>${times.length ? `<div class="listchips" style="justify-content:center">${s.records[name].map((v, i) => `<span>${i + 1}: ${v.falseStart ? '⚠ ' : ''}${v.time} ms</span>`).join('')}</div>` : ''}`,
    ),
  );
  if (times.length)
    $('app').insertAdjacentHTML(
      'beforeend',
      `<details class="strategy-lens reaction-analysis"><summary>📊 تفاصيل محاولات ${esc(name)}</summary>${reactionTrialHistoryHTML(s.records[name])}</details>`,
    );
  guardCoreView();
}
function reactionTrialHistoryHTML(records) {
  const maximum = Math.max(1500, ...records.map((record) => record.time));
  return `<div class="reaction-trial-history">${records
    .map(
      (record, i) =>
        `<div class="${record.falseStart ? 'penalty' : ''}"><span>${i + 1}</span><meter min="0" max="${maximum}" value="${record.time}" aria-label="المحاولة ${i + 1}: ${record.time} ملّي ثانية"></meter><bdi>${record.time} ms</bdi><small>${record.wrongDirection ? 'اتجاه خاطئ' : record.anticipated ? 'ضغط متوقع' : record.noGoError ? 'ضغط إشارة التوقف' : record.falseStart ? 'قبل الإشارة' : record.time < 300 ? 'استجابة سريعة ✓' : 'استجابة صحيحة ✓'}</small></div>`,
    )
    .join('')}</div>`;
}
function reactionTap(side = null) {
  if (screen !== 'reaction' || state.done || coreBlocked()) return;
  const s = state;
  if (s.stage === 'idle') {
    s.stage = 'waiting';
    s.falseStart = false;
    s.anticipated = false;
    s.wrongDirection = false;
    s.noGoError = false;
    s.readyAt = null;
    renderReaction();
    scheduleReactionSignal(s);
  } else if (s.stage === 'waiting' || s.stage === 'decoy') {
    clearTimeout(s.waitTimer);
    s.noGoError = s.stage === 'decoy';
    s.falseStart = true;
    s.last = 1500;
    recordReaction();
  } else if (s.stage === 'ready') {
    if (!Number.isFinite(s.readyAt)) return;
    if (s.reactionRule === 'choice' && ![0, 1].includes(side))
      return toast('اختر اتجاه السهم من الزرين أو الأسهم.');
    const elapsed = performance.now() - s.readyAt;
    s.anticipated = elapsed < 70;
    s.wrongDirection = s.reactionRule === 'choice' && side !== s.requiredSide;
    s.last = s.anticipated || s.wrongDirection ? 1500 : Math.max(1, Math.round(elapsed));
    s.falseStart = s.anticipated || s.wrongDirection;
    recordReaction();
  }
}
function reactionChoice(side, turn = state?.turn, stage = state?.stage) {
  if (
    screen !== 'reaction' ||
    state.done ||
    coreBlocked() ||
    state.reactionRule !== 'choice' ||
    state.turn !== turn ||
    state.stage !== stage ||
    ![0, 1].includes(side)
  )
    return;
  reactionTap(side);
}
function scheduleReactionSignal(s, afterDecoy = false) {
  const turn = s.turn;
  s.waitTimer = later(
    () => {
      if (
        screen === 'reaction' &&
        state === s &&
        s.turn === turn &&
        s.stage === 'waiting' &&
        !coreBlocked()
      ) {
        if (s.mode === 'focus' && !afterDecoy && randInt(2) === 0) {
          s.stage = 'decoy';
          renderReaction();
          s.waitTimer = later(() => {
            if (
              screen !== 'reaction' ||
              state !== s ||
              s.turn !== turn ||
              s.stage !== 'decoy' ||
              coreBlocked()
            )
              return;
            s.noGoPassed++;
            s.stage = 'waiting';
            renderReaction();
            scheduleReactionSignal(s, true);
          }, 900);
          return;
        }
        s.stage = 'ready';
        if (s.reactionRule === 'choice') s.requiredSide = randInt(2);
        renderReaction();
        s.readyAt = performance.now();
      }
    },
    1000 + randInt(3501),
  );
}
function recordReaction() {
  if (screen !== 'reaction' || state.done || !['waiting', 'ready', 'decoy'].includes(state.stage))
    return;
  state.results[reactionName()].push(state.last);
  state.records[reactionName()].push({
    time: state.last,
    falseStart: state.falseStart,
    anticipated: !!state.anticipated,
    wrongDirection: !!state.wrongDirection,
    noGoError: !!state.noGoError,
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
    median:
      a.length % 2
        ? a[Math.floor(a.length / 2)]
        : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2),
    best: valid.length ? Math.min(...valid) : null,
    spread: valid.length > 1 ? Math.max(...valid) - Math.min(...valid) : 0,
    validTrials: valid.length,
    falseStarts: s.records[name].filter((v) => v.falseStart).length,
  };
}
function advanceReaction(turn = state?.turn) {
  if (screen !== 'reaction' || coreBlocked() || state.stage !== 'result') return;
  const s = state;
  if (s.turn !== turn) return;
  s.turn++;
  if (s.turn >= s.players.length * s.trials) {
    s.done = true;
    clearTimers();
    const ranked = s.players
      .map(reactionStats)
      .sort((a, b) => Number(b.validTrials > 0) - Number(a.validTrials > 0) || a.avg - b.avg);
    let lastAvg = null,
      rank = -1;
    for (let i = 0; i < ranked.length; i++) {
      const v = ranked[i];
      if (v.avg !== lastAvg) rank = i;
      lastAvg = v.avg;
      const points = !v.validTrials
        ? 0
        : s.players.length === 1
          ? Math.min(50, Math.max(5, Math.round(15000 / v.avg)))
          : Math.max(5, 30 - rank * 5);
      v.points = points;
      addScore(v.n, points);
    }
    tone(true);
    setHTML(
      wrap(
        'reaction',
        `<section class="panel success"><h2 class="center">نتيجة السرعة ⚡</h2><p class="note center" style="margin-bottom:18px">الأقل بالمتوسط يفوز · ${s.trials} محاولات لكل لاعب · المتساوون بالمتوسط متعادلون.</p><div class="board">${ranked.map((v) => `<div class="boardrow"><span>${v.validTrials && v.avg === ranked[0].avg ? '🥇' : '⚡'}</span><div class="name"><b>${esc(v.n)}</b><small>+${v.points} نقطة · أسرع ضغطة: ${v.best === null ? 'لا توجد ضغطة صحيحة' : v.best + ' ms'}</small><small>الوسيط: ${v.median} ms · ضغط مبكر: ${v.falseStarts}</small></div><div class="score">${v.avg}<small>متوسط ms</small></div></div>`).join('')}</div><p class="note">الضغط المبكر مشمول بالمتوسط والوسيط بعقوبة 1500 ms، ويُستبعد من أسرع ضغطة. تحتاج استجابة صحيحة واحدة على الأقل لكسب النقاط.${s.mode === 'focus' ? ' تجاهلتم ' + s.noGoPassed + ' إشارات برتقالية بنجاح.' : ''}</p><div class="actions"><button class="primary" onclick="setup('reaction')">تحدي جديد</button><button onclick="home()">الألعاب</button></div></section>`,
      ),
    );
    $('app')
      .querySelector('.success')
      ?.insertAdjacentHTML(
        'beforeend',
        `<details class="strategy-lens reaction-analysis"><summary>📊 راجع أداء كل لاعب</summary>${ranked
          .map(
            (entry) =>
              `<section><h3>${esc(entry.n)}</h3><p class="tiny">${entry.validTrials} استجابات صحيحة من ${s.trials}${entry.validTrials > 1 ? ` · فرق أسرع وأبطأ استجابة صحيحة: ${entry.spread} ms` : ''}</p>${reactionTrialHistoryHTML(s.records[entry.n])}</section>`,
          )
          .join(
            '',
          )}<p class="tiny">قارن المحاولات الصحيحة مع بعضها. قلّة الفارق بينها تعني ثباتًا أكبر؛ العقوبات تدخل في المتوسط ولا تدخل في أسرع استجابة.</p></details>`,
      );
  } else {
    s.stage = 'idle';
    renderReaction();
  }
}

document.addEventListener(
  'keydown',
  (event) => {
    if (
      screen !== 'reaction' ||
      state.done ||
      coreBlocked() ||
      state.reactionRule !== 'choice' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      event.isComposing ||
      advancedEditableTarget(event.target)
    )
      return;
    if (event.key === ' ' && event.target.closest?.('button,a,summary,[role="button"]')) return;
    if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === ' ') {
        if (state.stage === 'idle') reactionTap();
        else toast('في وضع القرار اختر سهم اليمين أو اليسار.');
      } else reactionChoice(event.key === 'ArrowLeft' ? 0 : 1);
    }
  },
  true,
);

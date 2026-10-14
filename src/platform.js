// Lamma Universe: standalone, local inference and local multiplayer.
const latin = (s) =>
  String(s)
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x6f0));
let tourney = null,
  dailyRun = null,
  world = 'all',
  searchQuery = '',
  onlyFavorites = false,
  storageAvailable = true,
  homeRenderedDate = '';
const extraDefaults = {
  favorites: [],
  played: {},
  best: {},
  earned: [],
  learned: [],
  daily: {},
  recent: [],
  theme: 'dark',
  motion: true,
  focus: false,
  textScale: 100,
  contrast: false,
  volume: 70,
  rememberDefaults: true,
  savedSession: null,
  preferences: {},
  history: [],
};
let rawExtra = {};
try {
  rawExtra = JSON.parse(localStorage.getItem(KEY) || 'null')?.extra || {};
} catch (e) {}
function normalizeExtra(raw, strict = false) {
  const e = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (strict && raw !== undefined && e !== raw) throw Error('Invalid extra');
  const extra = { ...extraDefaults };
  for (const key of ['played', 'best', 'daily']) {
    extra[key] = Object.create(null);
    if (e[key] !== undefined && (!e[key] || typeof e[key] !== 'object' || Array.isArray(e[key]))) {
      if (strict) throw Error('Invalid counters');
      continue;
    }
    for (const [id, value] of Object.entries(e[key] || {})) {
      if (!id || id.length >= 80 || !safeCounter(value)) {
        if (strict) throw Error('Invalid counter');
        continue;
      }
      extra[key][id] = value;
    }
  }
  for (const key of ['favorites', 'earned']) {
    if (strict && e[key] !== undefined && !Array.isArray(e[key])) throw Error('Invalid list');
    extra[key] = Array.isArray(e[key])
      ? [...new Set(e[key].filter((v) => typeof v === 'string' && v.length < 80))].slice(0, 100)
      : [];
  }
  const learned = e.learned ?? [];
  if (strict && (!Array.isArray(learned) || learned.length > 200)) throw Error('Invalid learned');
  const seen = new Set();
  extra.learned = [];
  for (const value of (Array.isArray(learned) ? learned : []).slice(0, 200)) {
    const valid =
      value &&
      typeof value.name === 'string' &&
      value.name.trim() &&
      value.name.length <= 40 &&
      categories.some((c) => c[0] === value.cat && c[0] !== 'all') &&
      Array.isArray(value.tags) &&
      value.tags.length <= 100 &&
      value.tags.every((t) => questions.some((q) => q[0] === t)) &&
      Array.isArray(value.hints) &&
      value.hints.length === 3 &&
      value.hints.every((h) => typeof h === 'string' && h.trim() && h.length <= 100);
    if (!valid || seen.has(norm(latin(value.name)))) {
      if (strict) throw Error('Invalid learned item');
      continue;
    }
    const name = latin(value.name.trim());
    seen.add(norm(name));
    extra.learned.push({
      name,
      cat: value.cat,
      tags: [...new Set(value.tags)],
      hints: value.hints.map((h) => latin(h.trim())),
      aliases: Array.isArray(value.aliases)
        ? [
            ...new Set(
              value.aliases
                .filter((v) => typeof v === 'string' && v.trim() && v.length <= 50)
                .map((v) => latin(v.trim())),
            ),
          ].slice(0, 10)
        : [],
    });
  }
  extra.theme = ['dark', 'light', 'system'].includes(e.theme) ? e.theme : 'dark';
  extra.motion = e.motion !== false;
  extra.focus = e.focus === true;
  for (const [key, valid] of [
    ['textScale', (value) => [100, 115, 130].includes(value)],
    ['contrast', (value) => typeof value === 'boolean'],
    ['volume', (value) => Number.isInteger(value) && value >= 0 && value <= 100],
    ['rememberDefaults', (value) => typeof value === 'boolean'],
  ]) {
    if (e[key] === undefined) continue;
    if (valid(e[key])) extra[key] = e[key];
    else if (strict) throw Error('Invalid setting: ' + key);
  }
  extra.recent = Array.isArray(e.recent)
    ? e.recent
        .filter(
          (v) =>
            v &&
            typeof v.id === 'string' &&
            v.id.length < 80 &&
            Number.isSafeInteger(v.at) &&
            v.at > 0,
        )
        .slice(0, 6)
    : [];
  extra.savedSession = normalizeSavedSession(e.savedSession);
  extra.preferences = normalizeGamePreferences(e.preferences);
  extra.history = normalizeGameHistory(e.history);
  extra.solo = normalizeSoloProgress(e.solo, strict);
  if (e.experience && typeof e.experience === 'object' && !Array.isArray(e.experience))
    extra.experience = e.experience;
  return extra;
}
store.extra = normalizeExtra(rawExtra);
// Each open document keeps its own cumulative contribution. A concurrent write
// can temporarily replace another tab's snapshot; the storage event repairs the
// missing contribution once, using this ledger rather than guessing from totals.
// Transport metadata stays outside `store`, so backups retain their v3 format.
const storageClone = (value) => JSON.parse(JSON.stringify(value));
const storageEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const storageToken = () =>
  globalThis.crypto?.randomUUID?.() ||
  Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
function storageTabWriter() {
  let writer = storageToken();
  try {
    const previous = sessionStorage.getItem(KEY + ':writer'),
      navigation = performance.getEntriesByType?.('navigation')[0];
    // Reloads retain this tab's actor. A newly opened or duplicated tab gets a
    // fresh actor even when the browser copies its opener's sessionStorage.
    if (navigation?.type === 'reload' && /^[a-zA-Z0-9-]{8,100}$/.test(previous || ''))
      writer = previous;
    sessionStorage.setItem(KEY + ':writer', writer);
  } catch (e) {}
  return writer;
}
const storageWriter = storageTabWriter();
let storageGeneration = 'legacy',
  storageHadRecord = false,
  storageBaseline = storageClone(store),
  storageLedger = { scores: Object.create(null), played: Object.create(null) };
try {
  const raw = localStorage.getItem(KEY);
  storageHadRecord = !!raw;
  const metadata = storageMetadata(JSON.parse(raw || 'null')?._sync);
  storageGeneration = metadata.epoch;
  if (metadata.writers[storageWriter]) storageLedger = metadata.writers[storageWriter];
} catch (e) {}
function storageMetadata(raw) {
  const metadata = { version: 1, epoch: 'legacy', writers: Object.create(null) };
  if (!raw || raw.version !== 1) return metadata;
  if (typeof raw.epoch === 'string' && raw.epoch.length <= 100) metadata.epoch = raw.epoch;
  if (!raw.writers || typeof raw.writers !== 'object' || Array.isArray(raw.writers))
    return metadata;
  for (const [id, writer] of Object.entries(raw.writers)) {
    if (!/^[a-zA-Z0-9-]{8,100}$/.test(id) || !writer || typeof writer !== 'object') continue;
    const entry = { scores: Object.create(null), played: Object.create(null) };
    for (const [name, score] of Object.entries(writer.scores || {})) {
      if (
        normalizePlayerName(name) !== name ||
        !name ||
        name.length > 24 ||
        !safeCounter(score?.points) ||
        !safeCounter(score?.rounds)
      )
        continue;
      entry.scores[name] = { points: score.points, rounds: score.rounds };
    }
    for (const [game, count] of Object.entries(writer.played || {}))
      if (/^[a-z]{2,24}$/.test(game) && safeCounter(count)) entry.played[game] = count;
    metadata.writers[id] = entry;
  }
  return metadata;
}
function readStoredProgress() {
  const text = localStorage.getItem(KEY);
  if (!text) return null;
  try {
    const raw = JSON.parse(text),
      data = { ...normalizeProgressBase(raw), extra: normalizeExtra(raw.extra) };
    data.extra.experience = normalizeExperience(data.extra.experience);
    return { data, metadata: storageMetadata(raw._sync), text };
  } catch (e) {
    return null;
  }
}
function storageMergeTree(local, baseline, remote) {
  if (storageEqual(local, baseline)) return remote;
  if (!local || typeof local !== 'object' || Array.isArray(local)) return local;
  const merged = Object.assign(Object.create(null), remote || {});
  for (const key of new Set([...Object.keys(baseline || {}), ...Object.keys(local)])) {
    if (!Object.hasOwn(local, key)) delete merged[key];
    else merged[key] = storageMergeTree(local[key], baseline?.[key], remote?.[key]);
  }
  return merged;
}
function storageMergeList(local, baseline, remote) {
  const removed = new Set(baseline.filter((value) => !local.includes(value)));
  const added = local.filter((value) => !baseline.includes(value));
  return [...new Set([...remote.filter((value) => !removed.has(value)), ...added])];
}
function storageMergeLearned(local, baseline, remote) {
  const merged = new Map(remote.map((value) => [norm(value.name), value])),
    old = new Map(baseline.map((value) => [norm(value.name), value]));
  for (const [name] of old)
    if (!local.some((value) => norm(value.name) === name)) merged.delete(name);
  for (const value of local)
    if (!storageEqual(value, old.get(norm(value.name)))) merged.set(norm(value.name), value);
  return [...merged.values()].slice(0, 200);
}
function storageMergeRecent(local, remote) {
  const rows = new Map();
  for (const row of [...remote, ...local])
    if (!rows.has(row.id) || row.at > rows.get(row.id).at) rows.set(row.id, row);
  return [...rows.values()].sort((a, b) => b.at - a.at).slice(0, 6);
}
function storageMergeHistory(local, remote) {
  const rows = new Map();
  for (const row of [...remote, ...local]) rows.set(row.rid || JSON.stringify(row), row);
  return [...rows.values()].sort((a, b) => b.at - a.at).slice(0, 80);
}
function storageMergeProgress(local, baseline, incoming) {
  const remote = incoming.data,
    metadata = incoming.metadata,
    merged = storageMergeTree(local, baseline, remote),
    oldWriter = metadata.writers[storageWriter] || {
      scores: Object.create(null),
      played: Object.create(null),
    };
  merged.scores = Object.assign(Object.create(null), remote.scores);
  for (const [name, score] of Object.entries(local.scores)) {
    const old = Object.hasOwn(baseline.scores, name)
        ? baseline.scores[name]
        : { points: 0, rounds: 0 },
      points = Math.max(0, score.points - old.points),
      rounds = Math.max(0, score.rounds - old.rounds);
    if (!points && !rounds) continue;
    const ledger = (storageLedger.scores[name] ||= { points: 0, rounds: 0 });
    ledger.points = sumCounter(ledger.points, points);
    ledger.rounds = sumCounter(ledger.rounds, rounds);
  }
  for (const [name, ledger] of Object.entries(storageLedger.scores)) {
    const accounted = oldWriter.scores[name] || { points: 0, rounds: 0 },
      score = (merged.scores[name] ||= { points: 0, rounds: 0 });
    score.points = sumCounter(score.points, Math.max(0, ledger.points - accounted.points));
    score.rounds = sumCounter(score.rounds, Math.max(0, ledger.rounds - accounted.rounds));
  }
  const extra = merged.extra,
    current = local.extra,
    previous = baseline.extra,
    latest = remote.extra;
  extra.played = Object.assign(Object.create(null), latest.played);
  for (const [id, count] of Object.entries(current.played)) {
    const added = Math.max(0, count - (previous.played[id] || 0));
    if (added) storageLedger.played[id] = sumCounter(storageLedger.played[id] || 0, added);
  }
  for (const [id, count] of Object.entries(storageLedger.played))
    extra.played[id] = sumCounter(
      extra.played[id] || 0,
      Math.max(0, count - (oldWriter.played[id] || 0)),
    );
  for (const key of ['best', 'daily']) {
    extra[key] = Object.assign(Object.create(null), latest[key]);
    for (const [id, value] of Object.entries(current[key]))
      extra[key][id] = Math.max(extra[key][id] || 0, value);
  }
  for (const key of ['favorites', 'earned'])
    extra[key] = storageMergeList(current[key], previous[key], latest[key]);
  extra.learned = storageMergeLearned(current.learned, previous.learned, latest.learned);
  extra.recent = storageMergeRecent(current.recent, latest.recent);
  extra.history = storageMergeHistory(current.history, latest.history);
  extra.solo = mergeSoloProgress(current.solo, previous.solo, latest.solo);
  if (extra.experience) {
    extra.experience.completed = Object.assign({}, latest.experience?.completed);
    for (const [id, value] of Object.entries(current.experience?.completed || {}))
      extra.experience.completed[id] = Math.max(extra.experience.completed[id] || 0, value);
    extra.experience = normalizeExperience(extra.experience);
  }
  if (Object.keys(storageLedger.scores).length || Object.keys(storageLedger.played).length)
    metadata.writers[storageWriter] = storageClone(storageLedger);
  return { data: merged, metadata };
}
function save(options = {}) {
  const before = store,
    ledgerBefore = storageClone(storageLedger),
    generationBefore = storageGeneration;
  try {
    const incoming = readStoredProgress();
    let metadata;
    if (options.replace) {
      storageGeneration = storageToken();
      storageLedger = { scores: Object.create(null), played: Object.create(null) };
      metadata = { version: 1, epoch: storageGeneration, writers: Object.create(null) };
    } else if (incoming && incoming.metadata.epoch !== storageGeneration) {
      // A reset/import is an authoritative new generation. Never add a stale
      // document's old counters or settings back into that replacement.
      store = incoming.data;
      storageGeneration = incoming.metadata.epoch;
      storageLedger = { scores: Object.create(null), played: Object.create(null) };
      metadata = incoming.metadata;
      oldScores = null;
    } else if (incoming) {
      const merged = storageMergeProgress(storageClone(store), storageBaseline, incoming);
      store = merged.data;
      metadata = merged.metadata;
    } else if (storageHadRecord) {
      store = {
        players: ['أنا', 'صاحبي'],
        scores: Object.create(null),
        sound: false,
        extra: normalizeExtra({}),
      };
      store.extra.experience = normalizeExperience(null);
      storageGeneration = storageToken();
      storageLedger = { scores: Object.create(null), played: Object.create(null) };
      metadata = { version: 1, epoch: storageGeneration, writers: Object.create(null) };
      oldScores = null;
    } else metadata = { version: 1, epoch: storageGeneration, writers: Object.create(null) };
    const text = JSON.stringify({ ...store, _sync: metadata });
    if (text !== incoming?.text) localStorage.setItem(KEY, text);
    storageBaseline = storageClone(store);
    storageHadRecord = true;
    storageAvailable = true;
  } catch (e) {
    store = before;
    storageGeneration = generationBefore;
    storageLedger = {
      scores: Object.assign(Object.create(null), ledgerBefore.scores),
      played: Object.assign(Object.create(null), ledgerBefore.played),
    };
    storageAvailable = false;
  }
}
window.addEventListener('storage', (event) => {
  if (event.storageArea !== localStorage || (event.key !== KEY && event.key !== null)) return;
  const before = storageClone(store);
  save();
  if (!storageAvailable || storageEqual(before, store)) return;
  // Updating progress never restarts a board, reveals a role or replaces the
  // contents of a live modal. Names and secret rounds already have snapshots.
  syncLearned();
  applySettings();
  soundUI();
  updateDock();
  if (screen === 'home' && $('modalback').hidden && !$('pausecover')) renderHome();
});
const worlds = [
  ['all', '🌌', 'العالم كله'],
  ['guess', '🔮', 'التخمين'],
  ['brain', '🧩', 'الذكاء'],
  ['party', '🎭', 'اللمّة'],
  ['duel', '⚔️', 'المنافسة'],
];
const gameWorld = {
  finder: 'guess',
  solo: 'guess',
  mind: 'guess',
  who: 'guess',
  mime: 'party',
  secret: 'party',
  memory: 'brain',
  reaction: 'duel',
  ttt: 'duel',
  connect: 'duel',
  code: 'guess',
  simon: 'brain',
  slide: 'brain',
  sudoku: 'brain',
  word: 'brain',
  math: 'brain',
  color: 'brain',
  pattern: 'brain',
  spy: 'party',
  taboo: 'party',
};
games.push(
  [
    'ttt',
    '⭕',
    'إكس أو',
    'خطط لثلاث علامات متصلة. ضد خصم ذكي أو شخص يمك.',
    'بروحك ومع شخص',
    '#7de8ce',
  ],
  [
    'connect',
    '🔴',
    'وصّل 4',
    'وصّل أربع قطع بأي اتجاه. خصم يفكر قبل كل حركة!',
    'بروحك ومع شخص',
    '#ffae9c',
  ],
  [
    'code',
    '🔐',
    'فك الشفرة',
    'شفرة من 3–5 أرقام. التلميحات تكشف الرقم والمكان.',
    'بروحك',
    '#d3b8ff',
  ],
  [
    'simon',
    '🎵',
    'تسلسل الألوان',
    'راقب الأضواء وكررها بالترتيب. السلسلة تكبر كل مرة.',
    'بروحك',
    '#a8cfff',
  ],
  [
    'slide',
    '🔲',
    'رتّب الأرقام',
    'حرّك القطع ورتّب لوحة من 3×3 إلى 5×5. كل لغز له حل.',
    'بروحك',
    '#8ee6cb',
  ],
  [
    'sudoku',
    '✏️',
    'سودوكو',
    'شبكة أصلية بحل واحد. املأ الصفوف والأعمدة والمربعات.',
    'بروحك',
    '#ffc985',
  ],
  [
    'word',
    '🔤',
    'حروف مبعثرة',
    'رتّب الحروف وطلع الكلمة، مع تلميحات ومراحل متعددة.',
    'بروحك',
    '#d7b5fa',
  ],
  [
    'math',
    '🧮',
    'سباق الحساب',
    'عمليات متنوعة وجولات تختار طولها. دقة وسرعة ومستويات.',
    'بروحك',
    '#a7d6ff',
  ],
  [
    'color',
    '🎨',
    'لونها شنو؟',
    'شوف لون الكتابة، مو معنى الكلمة. اختبار التركيز الحقيقي.',
    'بروحك',
    '#ffb7c8',
  ],
  [
    'pattern',
    '🌀',
    'كمّل النمط',
    'اكتشف القاعدة واختر الرقم الناقص في ألغاز متدرجة.',
    'بروحك',
    '#aadfd6',
  ],
  [
    'spy',
    '🕶️',
    'منو الجاسوس؟',
    'الكل يعرف المكان إلا واحد. اسألوا، ناقشوا ثم صوّتوا.',
    'جماعي',
    '#c2baff',
  ],
  [
    'taboo',
    '🚫',
    'لا تقولها',
    'اشرح الكلمة بدون 4 كلمات ممنوعة، وخل الربع يخمنون.',
    'جماعي',
    '#ffc08c',
  ],
);
const extraRows = [
  [
    'بطريق',
    'animal',
    'swim wild cold',
    'أعيش في مناطق باردة',
    'أنا طائر ما يطير',
    'أمشي متمايلاً وريشي أبيض وأسود',
  ],
  [
    'حوت',
    'animal',
    'swim sea large',
    'أعيش في المحيط',
    'أتنفس بالهواء مو بالخياشيم',
    'من أكبر الحيوانات على الأرض',
  ],
  [
    'قرش',
    'animal',
    'swim sea wild',
    'أتحرك تحت الماي',
    'أسناني تتبدل باستمرار',
    'سمكة مفترسة مشهورة',
  ],
  [
    'تمساح',
    'animal',
    'swim wild large',
    'أعيش قرب الأنهار',
    'جلدي قاسي وذيل طويل',
    'زاحف عنده فك قوي',
  ],
  ['ذئب', 'animal', 'wild order', 'أعيش في مجموعات', 'صوتي عواء', 'أشبه الكلب وأعيش بالبر'],
  [
    'ثعلب',
    'animal',
    'wild desert',
    'عندي ذيل كثيف',
    'مشهور بالحيلة في القصص',
    'يشبه كلباً صغيراً وله آذان مدببة',
  ],
  ['قرد', 'animal', 'wild plants', 'أتسلق الأشجار', 'أمسك الأشياء بيدي', 'يشتهر بحبه للموز'],
  [
    'دب',
    'animal',
    'wild large',
    'عندي فراء كثيف',
    'من أنواعي القطبي والبني',
    'أقف أحياناً على رجلي الخلفيتين',
  ],
  [
    'بومة',
    'animal',
    'fly wild',
    'نشطة غالباً بالليل',
    'عندي عينان كبيرتان',
    'طائر معروف بصوت هوهو',
  ],
  [
    'نسر',
    'animal',
    'fly wild large',
    'أبني عشي في أماكن عالية',
    'نظري قوي',
    'طائر جارح بأجنحة عريضة',
  ],
  ['ديك', 'animal', 'pet', 'أعيش قرب الدجاج', 'على رأسي عرف', 'أصيح في الصباح'],
  ['خروف', 'animal', 'pet meat', 'حيوان يعيش مع قطيع', 'لي صوف ناعم', 'صوتي ثغاء'],
  ['بقرة', 'animal', 'pet large', 'أعيش في المزارع', 'آكل العشب', 'يستخرج مني الحليب'],
  ['ثعبان', 'animal', 'wild desert', 'أتحرك على الأرض', 'لا أملك أرجل', 'زاحف طويل يبدل جلده'],
  ['أخطبوط', 'animal', 'swim sea', 'أعيش في البحر', 'أطلق حبراً للدفاع', 'عندي ثمانية أذرع'],
  ['برتقال', 'food', 'fruit sweet drink', 'ينمو على شجرة', 'قشري برتقالي', 'فاكهة حمضية يعصرونها'],
  [
    'فراولة',
    'food',
    'fruit sweet red',
    'فاكهة صغيرة',
    'بذوري ظاهرة على السطح',
    'حمراء وقمتي خضراء',
  ],
  [
    'مانجو',
    'food',
    'fruit sweet yellow',
    'فاكهة استوائية',
    'في داخلي نواة كبيرة',
    'لبّي أصفر وطعمي حلو',
  ],
  [
    'ليمون',
    'food',
    'fruit yellow drink',
    'فاكهة حمضية',
    'ممكن ينضاف للعصير والسلطة',
    'طعمي حامض وقشري أصفر',
  ],
  [
    'عنب',
    'food',
    'fruit sweet',
    'أنمو في عناقيد',
    'أكون أخضر أو أحمر أو أسود',
    'إذا جففتني أصير زبيباً',
  ],
  [
    'رمان',
    'food',
    'fruit sweet red',
    'قشري سميك',
    'داخلي حبات كثيرة',
    'حباتي حمراء حول بذور صغيرة',
  ],
  ['خبز', 'food', 'bread hot', 'مصنوع من الطحين', 'ينخبز في الفرن', 'نسوي فيه ساندويتشات'],
  [
    'جبن',
    'food',
    'cheese cold',
    'مصنوع من الحليب',
    'من أنواعي الشيدر',
    'ينحط على البيتزا والساندويتش',
  ],
  ['حليب', 'food', 'drink cold', 'مشروب أبيض', 'يدخل في صنع الجبن', 'نستخرجه من البقرة'],
  ['لبن', 'food', 'drink cold', 'يجي من الحليب', 'طعمه فيه حموضة خفيفة', 'نشربه مع المجبوس'],
  ['عسل', 'food', 'sweet', 'قوامي لزج', 'لوني غالباً ذهبي', 'تنتجني النحلة'],
  ['بطاطس', 'food', 'hot', 'أنمو تحت الأرض', 'أقدر أكون مهروسة', 'تتقلى أصابعي وتقدم مع البرغر'],
  ['بوشار', 'food', 'hot', 'يتحضّر بالحرارة', 'ناكلني في السينما', 'حبوب ذرة تنفجر وتصير خفيفة'],
  [
    'دونات',
    'food',
    'sweet bread',
    'حلوى من عجين',
    'أغلب أنواعي مقلية',
    'غالباً دائري وفي وسطي فتحة',
  ],
  ['كرواسون', 'food', 'bread hot', 'معجنات فيها زبدة', 'طبقاتي هشة', 'شكلي مثل الهلال'],
  [
    'شاورما',
    'food',
    'bread meat hot',
    'ممكن أكون دجاجاً أو لحماً',
    'اللحم يدور قرب النار',
    'تقدم في خبز مع الصلصة',
  ],
  [
    'كمبيوتر',
    'object',
    'electric screen keys',
    'أستخدم للبرامج والألعاب',
    'غالباً له شاشة ولوحة مفاتيح',
    'حاسوب مكتبي',
  ],
  ['كاميرا', 'object', 'electric pocket', 'أحفظ الذكريات', 'عندي عدسة', 'ألتقط الصور والفيديو'],
  [
    'ريموت',
    'object',
    'electric keys pocket',
    'تمسكني بيدك',
    'عندي أزرار كثيرة',
    'أغير قنوات التلفزيون',
  ],
  ['مصباح', 'object', 'electric', 'أحتاج طاقة', 'أفيد في الظلام', 'أضيء المكان'],
  ['مروحة', 'object', 'electric', 'أدور بسرعة', 'عندي شفرات', 'أحرك الهواء في الغرفة'],
  ['مكيف', 'object', 'electric keepcold', 'أركب في الغرفة', 'أستخدم بالصيف', 'أبرد هواء المكان'],
  [
    'طابعة',
    'object',
    'electric paper',
    'تحتاج حبراً أو مسحوقاً',
    'تتصل بالحاسوب',
    'أطلع صوراً وكلاماً على الورق',
  ],
  [
    'بلايستيشن',
    'object',
    'electric screen keys',
    'مكاني عادة قرب التلفزيون',
    'أستخدم مع يد تحكم',
    'جهاز لتشغيل ألعاب الفيديو',
  ],
  ['شنطة', 'object', 'wear travel', 'أحمل أغراضك', 'لي يد أو حزام', 'تحط أغراضك داخلي وقت السفر'],
  ['مفتاح', 'object', 'pocket', 'صغير ويحمل في الجيب', 'لي أسنان أو شريحة إلكترونية', 'أفتح القفل'],
  ['مرآة', 'object', 'wear', 'سطحي لامع', 'تلقاني في الحمام', 'تشوف صورتك فيني'],
  ['كرسي', 'object', 'large', 'لي أرجل عادةً', 'موجود حول الطاولة', 'تجلس علي'],
  ['سرير', 'object', 'large', 'مكاني في غرفة النوم', 'علي مرتبة ومخدة', 'تنام علي بالليل'],
  ['طاولة', 'object', 'large', 'لي سطح مستوٍ', 'أحمل الأشياء', 'تجلسون حولي للأكل'],
  ['فرشاة أسنان', 'object', 'clean pocket', 'أستخدم يومياً', 'أستخدم مع المعجون', 'أنظف الأسنان'],
  ['عطر', 'object', 'pocket', 'يأتي في قنينة', 'ترش منه قليلاً', 'يعطي رائحة جميلة'],
  ['كرة', 'object', 'sport', 'شكلي كروي', 'تتحرك بالدفع أو الركل', 'تلعبون فيني مباريات'],
  ['مقص', 'object', 'cut pocket', 'عندي شفرتان', 'يفتح وينغلق', 'أقص الورق والقماش'],
  ['خوذة', 'object', 'wear order', 'تلبس على الرأس', 'تستخدم في الدراجات', 'تحمي الرأس من الصدمات'],
  [
    'شاحنة',
    'vehicle',
    'wheels large',
    'أتنقل على الطرق',
    'غالباً عندي صندوق خلفي كبير',
    'أنقل بضائع ثقيلة',
  ],
  [
    'تاكسي',
    'vehicle',
    'wheels travel',
    'تطلبني عشان تتنقل',
    'السائق يعرف الطرق',
    'تدفع أجرة مقابل المشوار',
  ],
  ['هليكوبتر', 'vehicle', 'fly travel', 'أطير بالمراوح', 'أقدر أثبت في الهواء', 'أقلع عمودياً'],
  ['غواصة', 'vehicle', 'swim sea large', 'أتنقل في البحر', 'محكمة الإغلاق', 'أسافر تحت سطح الماي'],
  [
    'قارب',
    'vehicle',
    'swim sea',
    'أتنقل على الماي',
    'أصغر من السفينة عادةً',
    'أستخدم للصيد أو النزهة',
  ],
  ['سكوتر', 'vehicle', 'wheels two', 'أقف عليه أحياناً', 'له مقود', 'مركبة صغيرة بعجلتين'],
  [
    'سينما',
    'place',
    'electric screen',
    'تشتري تذكرة للدخول',
    'فيها كراسي وشاشة كبيرة',
    'نشاهد فيها الأفلام',
  ],
  [
    'متحف',
    'place',
    'learn',
    'مكان للزيارة',
    'يعرض أشياء قديمة أو فنية',
    'نتعرف فيه على التاريخ والتحف',
  ],
  [
    'فندق',
    'place',
    'travel large',
    'تدفع مقابل الإقامة',
    'فيه استقبال وغرف',
    'تسكن فيه أثناء السفر',
  ],
  [
    'بنك',
    'place',
    'buy order',
    'مكان يقدم خدمات مالية',
    'تلقى فيه حسابات وبطاقات',
    'تحفظ فيه فلوسك',
  ],
  [
    'مخبز',
    'place',
    'cook bread foodplace',
    'الرائحة فيه حلوة',
    'فيه أفران كبيرة',
    'يبيع الخبز والمعجنات',
  ],
  [
    'صيدلية',
    'place',
    'health buy',
    'تبيع منتجات للصحة',
    'قد تحتاج وصفة لبعض أغراضها',
    'تشتري منها الأدوية',
  ],
  [
    'محطة بنزين',
    'place',
    'travel wheels',
    'توقف فيها السيارة',
    'فيها مضخات',
    'تعبي منها وقود السيارة',
  ],
  [
    'نادي رياضي',
    'place',
    'sport health',
    'مكان للتدريب',
    'فيه أوزان وأجهزة',
    'تتمرن فيه وتقوي عضلاتك',
  ],
  ['مسبح', 'place', 'swim sport', 'مكان فيه ماي', 'تحتاج ملابس مناسبة', 'تسبح فيه'],
  ['مسجد', 'place', 'large', 'مكان نجتمع فيه', 'غالباً له مئذنة', 'مكان أداء الصلاة'],
  [
    'ممرّض',
    'job',
    'health care',
    'أعمل في القطاع الصحي',
    'أتابع حالة المرضى',
    'أقدم الرعاية وأساعد الطبيب',
  ],
  ['نجّار', 'job', 'build cut', 'أستخدم أدوات ومناشير', 'أتعامل مع الخشب', 'أصنع الأثاث الخشبي'],
  [
    'كهربائي',
    'job',
    'electric build',
    'أحتاج أدوات عازلة',
    'أتعامل مع الأسلاك',
    'أصلح تمديدات الكهرباء',
  ],
  ['مصور', 'job', 'electric', 'شغلي يحتاج إضاءة وزوايا', 'أستخدم عدسات', 'ألتقط الصور بالكاميرا'],
  ['صياد', 'job', 'sea swim', 'شغلي في البحر أحياناً', 'أستخدم شبكة أو صنارة', 'أصطاد السمك'],
  ['سائق', 'job', 'travel wheels', 'أتحكم بالمقود', 'أتنقل على الشوارع', 'أقود المركبات'],
  ['مزارع', 'job', 'plants foodplace', 'أعمل بالأرض', 'أعتني بالنباتات', 'أزرع وأحصد المحاصيل'],
  ['كاتب', 'job', 'write books', 'أرتب الأفكار بالكلمات', 'أكتب قصصاً ومقالات', 'ممكن أؤلف كتاباً'],
  [
    'مبرمج',
    'job',
    'electric keys',
    'أحل المشكلات بالأوامر',
    'أستخدم لغات مثل JavaScript',
    'أكتب برامج وتطبيقات',
  ],
  ['لاعب كرة', 'job', 'sport', 'أتدرب مع فريق', 'ألعب في الملعب', 'أحاول تسجيل أهداف بالكرة'],
];
const makeItem = (r) => ({
  name: r[0],
  cat: r[1],
  tags: new Set([r[1], ...r[2].split(' ')]),
  hints: r.slice(3, 6),
  aliases: [r[0], ...(r[6] || '').split('|')].filter(Boolean),
});
items.push(...extraRows.map(makeItem));
const builtInCount = items.length;
let pendingKnowledgeSync = false;
function syncLearned(force = false) {
  if (!force && state && !state.done && !['home', 'setup', 'tour-handoff'].includes(screen)) {
    pendingKnowledgeSync = true;
    return false;
  }
  items.splice(builtInCount);
  const builtInNames = new Set(items.map((v) => norm(v.name)));
  store.extra.learned = store.extra.learned.filter((v) => !builtInNames.has(norm(v.name)));
  items.push(
    ...store.extra.learned.map((v) => ({
      name: v.name,
      cat: v.cat,
      tags: new Set([v.cat, ...v.tags]),
      hints: v.hints,
      aliases: [
        v.name,
        ...(Array.isArray(v.aliases)
          ? v.aliases.filter((a) => typeof a === 'string' && a.length <= 50)
          : []),
      ],
    })),
  );
  pendingKnowledgeSync = false;
  return true;
}
syncLearned();
const soloGameIds = new Set([
  'solo',
  'mind',
  'who',
  'memory',
  'reaction',
  'ttt',
  'connect',
  'code',
  'simon',
  'slide',
  'sudoku',
  'word',
  'math',
  'color',
  'pattern',
  'snake',
  'merge',
  'mines',
  'maze',
  'trivia',
  'hangman',
  'wordguess',
  'target',
]);
const groupGameIds = new Set([
  'finder',
  'mind',
  'mime',
  'secret',
  'reaction',
  'ttt',
  'connect',
  'spy',
  'taboo',
]);
const duoGameIds = new Set([
  'memory',
  'finder',
  'mind',
  'mime',
  'secret',
  'reaction',
  'ttt',
  'connect',
  'taboo',
]);
function isSolo(g) {
  return soloGameIds.has(g[0]);
}
function isGroup(g) {
  return groupGameIds.has(g[0]) && !['finder', 'mind', 'ttt', 'connect'].includes(g[0]);
}
function filteredGames() {
  return games.filter(
    (g) =>
      (world === 'all' || gameWorld[g[0]] === world) &&
      (filter === 'all' ||
        (filter === 'solo' ? isSolo(g) : filter === 'duo' ? duoGameIds.has(g[0]) : isGroup(g))) &&
      (!onlyFavorites || store.extra.favorites.includes(g[0])) &&
      (!searchQuery || norm(g[2] + ' ' + g[3] + ' ' + g[4]).includes(norm(searchQuery))),
  );
}
function recordRecent(id) {
  store.extra.recent = [
    { id, at: Date.now() },
    ...store.extra.recent.filter((v) => v.id !== id),
  ].slice(0, 6);
  save();
}
function totalPoints() {
  return Object.values(store.scores).reduce((a, v) => sumCounter(a, v.points), 0);
}
function totalRounds() {
  return Object.values(store.scores).reduce((a, v) => sumCounter(a, v.rounds), 0);
}
function level() {
  return Math.floor(totalPoints() / 250) + 1;
}
function home() {
  captureSoloSession();
  clearTimers();
  removePause();
  screen = 'home';
  state = null;
  tourney = null;
  dailyRun = null;
  syncLearned(true);
  closeModal();
  renderHome();
  goTop();
}
// The catalogue and home screen have one renderer in lobby.js.
function clearFilters() {
  world = 'all';
  filter = 'all';
  onlyFavorites = false;
  searchQuery = '';
  renderHome();
}

function modeLabel(id) {
  if (duoGameIds.has(id) && !isGroup([id])) return soloGameIds.has(id) ? 'فردي وشخصان' : 'شخصان';
  return soloGameIds.has(id) && groupGameIds.has(id)
    ? 'فردي ومع الأصدقاء'
    : groupGameIds.has(id)
      ? 'مع الأصدقاء'
      : 'فردي';
}
function searchGames(q) {
  searchQuery = latin(q);
  renderCatalog();
}
function setWorld(w) {
  world = w;
  renderHome();
}
function setFilter(f) {
  filter = f;
  renderHome();
}
function toggleFavorites() {
  onlyFavorites = !onlyFavorites;
  renderHome();
}
function favorite(id) {
  if (!games.some((g) => g[0] === id)) return;
  const a = store.extra.favorites;
  store.extra.favorites = a.includes(id) ? a.filter((v) => v !== id) : [...a, id];
  save();
  renderCatalog();
}
function randomGame() {
  const list = filteredGames();
  if (!list.length) return toast('غيّر الفلاتر عشان نلقى لعبة.');
  setup(list[randInt(list.length)][0]);
}
function wrap(id, body) {
  const g = games.find((g) => g[0] === id);
  const active = state && !state.done && screen !== 'setup' && screen !== 'tour-handoff';
  return `<div class="play" data-game="${id}"><div class="playhead"><span class="tileicon" style="--tile:${g[5]}">${g[1]}</span><div><h2>${g[2]}</h2><p>${modeLabel(id)}</p></div><div class="playtools"><button class="quiet" onclick="openGuide('${id}')" aria-label="طريقة لعب ${esc(g[2])}">؟</button>${active ? '<button class="quiet" onclick="showPause()" aria-label="إيقاف اللعبة مؤقتاً">⏸</button>' : ''}<button class="quiet" onclick="home()" aria-label="العودة لعالم الألعاب">←</button></div></div>${tourney?.active ? `<div class="sessionbanner">🏆 البطولة · ${esc(player())} · التحدّي ${Math.floor(tourney.turn / tourney.players.length) + 1} / ${tourney.queue.length}</div>` : dailyRun ? `<div class="sessionbanner">☀ تحدّي اليوم · أفضل نتيجة محفوظة · ${dayKey()}</div>` : ''}${body}</div>`;
}
function playerField(label = 'النقاط تنحسب حق منو؟') {
  if (tourney?.active)
    return `<div class="field full"><label>الدور على</label><div class="turnmark">${esc(player())}</div></div>`;
  return `<div class="field full"><label for="player">${label}</label><select id="player">${store.players.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('')}</select></div>`;
}
function openPeople() {
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">👥 لاعبين اللمّة</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">من 1 إلى 12 لاعب. للجماعي اكتب اسمين على الأقل، وللجاسوس تحتاجون 3.</p><div class="names">${Array.from({ length: 12 }, (_, i) => `<div><label for="name${i}">اللاعب ${i + 1}${i === 0 ? ' *' : ''}</label><input id="name${i}" maxlength="24" value="${esc(store.players[i] || '')}" autocomplete="off"></div>`).join('')}</div><div class="actions"><button class="primary" onclick="savePeople()">حفظ اللاعبين</button></div><p class="note">الأسماء الجديدة تتطبق بالجولة القادمة. النقاط القديمة محفوظة لكل اسم.</p>`,
  );
}
function savePeople() {
  const a = Array.from({ length: 12 }, (_, i) => normalizePlayerName($('name' + i).value)).filter(
    Boolean,
  );
  if (!$('name0').value.trim()) return toast('اكتب أول اسم.');
  if (a.some((name) => name.length > 24)) return toast('الاسم يجب أن يكون 24 حرفاً أو أقل.');
  if (new Set(a.map(norm)).size !== a.length) return toast('اختار اسم مختلف لكل لاعب.');
  store.players = a;
  save();
  closeModal();
  if (screen === 'setup') setup(state.id, true);
  else if (screen === 'home') renderHome();
  toast('تم حفظ اللاعبين.');
}
const timedGames = new Set(['math', 'color', 'pattern', 'word', 'mime', 'secret', 'spy', 'taboo']);
function pauseClock() {
  if (
    !state ||
    state.done ||
    state.pausedAt ||
    screen === 'home' ||
    screen === 'setup' ||
    screen === 'tour-handoff'
  )
    return;
  // Remove private roles before any overlay is opened; preserve the custom word.
  if (screen === 'secret' && state.stage === 'revealed') hideSecret();
  if (screen === 'spy' && state.stage === 'view') spyHandoff();
  if (screen === 'mime' && state.stage === 'active' && !state.hiddenWord) {
    state.hiddenWord = true;
    renderMime();
  }
  state.pausedAt = Date.now();
  state.onPause?.();
}
function resumeClock() {
  if (state?.pausedAt && !$('pausecover') && $('modalback').hidden) {
    const d = Date.now() - state.pausedAt;
    if (state.endAt) state.endAt += d;
    if (state.started) state.started += d;
    if (state.lastAt) state.lastAt += d;
    state.pausedAt = 0;
    state.onResume?.();
    if (state.pendingAdvance) {
      state.pendingAdvance = false;
      nextQuiz();
    }
  }
}
function openModal(html) {
  if ($('modalback').hidden) previousFocus = document.activeElement;
  if (
    screen === 'reaction' &&
    state &&
    !state.done &&
    ['waiting', 'ready', 'decoy'].includes(state.stage)
  ) {
    clearTimers();
    state.stage = 'idle';
    renderReaction();
  }
  pauseClock();
  $('modal').innerHTML = latin(html);
  $('modalback').hidden = false;
  updateOverlayLock();
  $('modal').scrollTop = 0;
  $('modal')
    .querySelector('button:not(:disabled),input:not([hidden]),select,textarea,[tabindex="0"]')
    ?.focus();
}
function closeModal(discard = false) {
  if (!$('modalback').hidden) {
    $('modalback').hidden = true;
    updateOverlayLock();
    if (!discard) {
      resumeClock();
      if (!$('pausecover')) restorePlayFocus(previousFocus);
    }
  }
}
function restorePlayFocus(element) {
  let target = element;
  if (!target?.isConnected || target.disabled || !target.getClientRects().length) {
    const action = element?.getAttribute?.('onclick'),
      label = element?.getAttribute?.('aria-label');
    target = element?.id ? $(element.id) : null;
    target ||= [...document.querySelectorAll('.shell button')].find(
      (button) =>
        !button.disabled &&
        button.getClientRects().length &&
        (action
          ? button.getAttribute('onclick') === action
          : label && button.getAttribute('aria-label') === label),
    );
  }
  if (!target || target.disabled || !target.getClientRects().length) target = $('app');
  target.focus({ preventScroll: true });
}
function updateOverlayLock() {
  const locked = !$('modalback').hidden || !!$('pausecover');
  document.querySelector('.shell').inert = locked;
  document.body.classList.toggle('overlay-open', locked);
}
let pauseFocus = null;
document.addEventListener(
  'keydown',
  (e) => {
    const container = $('pausecover') || (!$('modalback').hidden ? $('modal') : null);
    if (!container) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if ($('pausecover')) resumeGame();
      else closeModal();
      return;
    }
    if (e.key === 'Tab') {
      e.stopImmediatePropagation();
      const controls = [
        ...container.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]'),
      ].filter((v) => !v.disabled && v.getClientRects().length && v.tabIndex >= 0);
      if (!controls.length) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = controls[0],
        last = controls.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first || !container.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || !container.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    }
  },
  true,
);
function removePause() {
  document.getElementById('pausecover')?.remove();
  updateOverlayLock();
}
function showPause() {
  if (!state || state.done || screen === 'setup' || screen === 'tour-handoff') return;
  if (!$('pausecover')) pauseFocus = document.activeElement;
  if (screen === 'reaction' && ['waiting', 'ready', 'decoy'].includes(state.stage)) {
    clearTimers();
    state.stage = 'idle';
    renderReaction();
  }
  pauseClock();
  if ($('pausecover')) return;
  const div = document.createElement('div');
  div.id = 'pausecover';
  div.className = 'pausecover';
  div.setAttribute('role', 'dialog');
  div.setAttribute('aria-modal', 'true');
  div.setAttribute('aria-labelledby', 'pausetitle');
  div.innerHTML =
    '<div class="pausebox"><span style="font-size:45px">⏸</span><h2 id="pausetitle">اللعبة متوقفة مؤقتاً</h2><p class="muted">خذ راحتك، ونكمل لما تكون جاهز.</p><button class="primary" onclick="resumeGame()">نكمل اللعب</button><button onclick="home()">العودة للعالم</button></div>';
  document.body.append(div);
  updateOverlayLock();
  div.querySelector('button').focus();
}
function resumeGame() {
  removePause();
  resumeClock();
  if (!$('modalback').hidden)
    $('modal')
      .querySelector('button:not(:disabled),input:not([hidden]),select,textarea,[tabindex="0"]')
      ?.focus();
  else restorePlayFocus(pauseFocus);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state && !state.done && screen !== 'setup' && screen !== 'home') {
    if (screen === 'simon' && state.phase === 'show') {
      clearTimers();
      state.phase = 'idle';
      renderSimon();
    }
    showPause();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.matches('input,textarea') && /[\u0660-\u0669\u06f0-\u06f9]/.test(e.target.value)) {
    const a = e.target.selectionStart,
      b = e.target.selectionEnd;
    e.target.value = latin(e.target.value);
    try {
      e.target.setSelectionRange(a, b);
    } catch (e) {}
  }
});
function addScore(name, points) {
  if (!Number.isFinite(points)) return;
  points = Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(points)));
  if (!legacyAddScore(name, points)) return;
  const id = state?.id;
  if (id) {
    recordRecent(id);
    store.extra.played[id] = sumCounter(store.extra.played[id] || 0, 1);
    store.extra.best[id] = Math.max(store.extra.best[id] || 0, points);
  }
  if (tourney?.active && name === player())
    tourney.current = Math.max(tourney.current, Math.min(100, Math.max(0, points)));
  updateBadges();
  save();
}
const badges = [
  ['first', '🚀', 'أول انطلاقة', 'سجّل أول نتيجة', () => totalRounds() >= 1],
  ['explore', '🧭', 'مستكشف', 'جرّب 5 ألعاب', () => Object.keys(store.extra.played).length >= 5],
  [
    'worlds',
    '🌌',
    'رحّالة العوالم',
    'جرّب 10 ألعاب',
    () => Object.keys(store.extra.played).length >= 10,
  ],
  [
    'all',
    '👑',
    'سيد اللمّة',
    'جرّب كل الألعاب',
    () => games.every((g) => (store.extra.played[g[0]] || 0) > 0),
  ],
  ['points', '💎', 'جامع النقاط', 'وصل إلى 500 نقطة', () => totalPoints() >= 500],
  ['expert', '🏆', 'خبير التحديات', 'وصل إلى 2000 نقطة', () => totalPoints() >= 2000],
  ['rounds', '🔥', 'شغف اللعب', 'سجّل 25 نتيجة', () => totalRounds() >= 25],
  ['learn', '🧠', 'علّمها', 'أضف شي لقاعدة التخمين', () => store.extra.learned.length > 0],
  ['daily', '☀', 'تحدّي اليوم', 'كمّل 3 تحديات في يوم', () => dailyCompleted() >= 3],
  ['champion', '🥇', 'بطل الجلسة', 'كمّل بطولة', () => !!store.extra.best.tournament],
];
badges.push(
  [
    'arcade',
    '🕹️',
    'نجم الأركيد',
    'جرّب 4 ألعاب أركيد',
    () =>
      ['snake', 'merge', 'mines', 'maze', 'target'].filter((id) => store.extra.played[id] > 0)
        .length >= 4,
  ],
  [
    'duelist',
    '⚔️',
    'خصم عنيد',
    'سجّل جولة في إكس أو ووصّل 4',
    () => store.extra.played.ttt > 0 && store.extra.played.connect > 0,
  ],
  [
    'perfect',
    '✨',
    'جولة ذهبية',
    'حقق 100 نقطة في لعبة',
    () => games.some((g) => (store.extra.best[g[0]] || 0) >= 100),
  ],
  [
    'favorites',
    '⭐',
    'ذوقك الخاص',
    'احفظ 5 ألعاب في المفضّلة',
    () => store.extra.favorites.length >= 5,
  ],
  [
    'teacher',
    '📚',
    'موسوعة اللمّة',
    'علّم اللعبة 5 أشياء جديدة',
    () => store.extra.learned.length >= 5,
  ],
  ['veteran', '🎮', 'مئة تحدٍّ', 'سجّل 100 جولة', () => totalRounds() >= 100],
);
function updateBadges() {
  store.extra.earned = [...new Set(store.extra.earned)].filter(
    (id) =>
      badges.some((b) => b[0] === id) &&
      (id !== 'all' || games.every((g) => (store.extra.played[g[0]] || 0) > 0)),
  );
  for (const b of badges)
    if (!store.extra.earned.includes(b[0]) && b[4]()) store.extra.earned.push(b[0]);
}
function openProfile() {
  updateBadges();
  const played = games.filter((g) => (store.extra.played[g[0]] || 0) > 0);
  const top = [...played]
    .sort((a, b) => (store.extra.played[b[0]] || 0) - (store.extra.played[a[0]] || 0))
    .slice(0, 4);
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">✦ رحلتك في اللمّة</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><div class="profile-summary"><div class="profile-level"><small>مستواك الحالي</small><strong>${level()}</strong></div><div><h3>${level() < 3 ? 'كل رحلة تبدأ بتحدٍّ' : level() < 8 ? 'مستكشف التحديات' : 'نجم اللمّة'}</h3><p class="muted">${fmt(totalPoints())} نقطة · ${totalRounds()} جولة مسجّلة</p><div class="progressline" role="progressbar" aria-label="التقدم للمستوى التالي" aria-valuenow="${totalPoints() % 250}" aria-valuemin="0" aria-valuemax="250"><span style="width:${(totalPoints() % 250) / 2.5}%"></span></div><p class="tiny">باقي ${250 - (totalPoints() % 250)} نقطة للمستوى ${level() + 1}</p></div></div><div class="profile-stats"><div><b>${played.length}/${games.length}</b><small>ألعاب اكتشفتها</small></div><div><b>${store.extra.earned.length}/${badges.length}</b><small>إنجازات فتحتها</small></div><div><b>${store.extra.favorites.length}</b><small>ألعاب مفضّلة</small></div></div>${top.length ? `<h3 class="modal-subtitle">الأكثر لعباً</h3><div class="profile-games">${top.map((g) => `<button onclick="closeModal();setup('${g[0]}')"><span>${g[1]}</span><b>${g[2]}</b><small>${store.extra.played[g[0]]} جولة · أفضل نتيجة ${store.extra.best[g[0]] || 0}</small></button>`).join('')}</div>` : ''}<h3 class="modal-subtitle">خزانة الإنجازات</h3><div class="badgegrid">${badges.map((b) => `<div class="badge ${store.extra.earned.includes(b[0]) ? 'earned' : ''}"><span>${b[1]}</span><b>${b[2]} ${store.extra.earned.includes(b[0]) ? '✓' : '🔒'}</b><small>${b[3]}</small></div>`).join('')}</div><div class="actions"><button onclick="openBoard()">لوحة النقاط</button><button class="primary" onclick="closeModal()">نكمل</button></div>`,
  );
}
function openBoard() {
  const names = [...new Set([...store.players, ...Object.keys(store.scores)])];
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">🏆 لوحة النقاط</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div>${boardHTML(names)}<p class="note">نقاط للتنافس بينكم؛ مستويات الألعاب تختلف. البطولة تقارن نفس الألعاب بين كل اللاعبين.</p><div class="actions"><button onclick="openProfile()">إنجازاتي</button><button class="quiet" onclick="resetScores()">تصفير النقاط</button></div>`,
  );
}
function applySettings() {
  fullscreenUI();
  document.body.dataset.theme =
    store.extra.theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : store.extra.theme;
  document.body.dataset.themeChoice = store.extra.theme;
  document.body.dataset.textScale = String(store.extra.textScale);
  document.body.style.setProperty('--text-scale', String(store.extra.textScale / 100));
  document.body.classList.toggle('high-contrast', store.extra.contrast);
  const reduceMotion =
    !store.extra.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.toggle('reduced-motion', reduceMotion);
  let st = $('motionstyle');
  if (!st) {
    st = document.createElement('style');
    st.id = 'motionstyle';
    document.head.append(st);
  }
  st.textContent = !reduceMotion
    ? ''
    : 'html, .reduced-motion *, .reduced-motion *:before, .reduced-motion *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
}
function toggleTheme() {
  store.extra.theme = store.extra.theme === 'dark' ? 'light' : 'dark';
  applySettings();
  save();
  openSettings();
}
function toggleMotion() {
  store.extra.motion = !store.extra.motion;
  applySettings();
  save();
  openSettings();
}
function exportProgress() {
  const b = new Blob(
      [JSON.stringify({ format: 'lamma-universe', version: 3, data: store }, null, 2)],
      { type: 'application/json' },
    ),
    u = URL.createObjectURL(b),
    a = document.createElement('a');
  a.href = u;
  a.download = 'lamma-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 3000);
  toast('تم تجهيز نسختك الاحتياطية.');
}
async function importProgress(file) {
  if (!file) return;
  pendingImport = null;
  if (file.size > 1500000) return toast('الملف أكبر من الحد المسموح.');
  try {
    const obj = JSON.parse(await file.text());
    if (obj?.format !== 'lamma-universe' || obj.version !== 3 || !obj.data) throw Error();
    const base = normalizeProgressBase(obj.data, true),
      extra = normalizeExtra(obj.data.extra, true);
    if (
      extra.learned.some((v) =>
        items.slice(0, builtInCount).some((i) => norm(i.name) === norm(v.name)),
      )
    )
      throw Error('Duplicate learned item');
    pendingImport = { ...base, extra };
    openModal(
      '<div class="modalhead"><h2 id="modaltitle">استيراد النسخة</h2><button onclick="closeModal()">✕</button></div><p>النسخة صالحة. الاستيراد يستبدل الأسماء والنقاط والإضافات المحفوظة حالياً.</p><div class="actions"><button onclick="closeModal()">إلغاء</button><button class="primary" onclick="confirmImport()">استيراد</button></div>',
    );
  } catch (e) {
    toast('هذي مو نسخة صالحة من اللمّة.');
  }
}
let pendingImport = null;
function confirmImport() {
  if (!pendingImport) return;
  const imported = pendingImport;
  pendingImport = null;
  clearTimers();
  removePause();
  closeModal(true);
  state = null;
  screen = 'home';
  tourney = null;
  dailyRun = null;
  store = imported;
  if (typeof normalizeExperience === 'function')
    store.extra.experience = normalizeExperience(store.extra.experience);
  oldScores = null;
  syncLearned(true);
  save({ replace: true });
  applySettings();
  soundUI();
  home();
  toast('تم استيراد نسختك.');
}
function gameParticipants(id) {
  const selected =
    typeof selectedGameParticipants === 'function' ? selectedGameParticipants(id) : null;
  return Array.isArray(selected) ? [...selected] : [...store.players];
}
function requirePlayers(id) {
  const friendBoard =
    (['ttt', 'connect'].includes(id) &&
      screen === 'setup' &&
      state?.id === id &&
      $('opponent')?.value === 'friend') ||
    (id === 'memory' && screen === 'setup' && state?.id === id && $('memoryplay')?.value === 'duo');
  const required = ['spy', 'undercover', 'improv'].includes(id)
    ? 3
    : id === 'teamcup'
      ? 4
      : friendBoard || ['mime', 'secret', 'taboo'].includes(id)
        ? 2
        : 1;
  if (gameParticipants(id).length < required) {
    toast(`هاللعبة تحتاج ${required} لاعبين على الأقل. أضف الأسماء ونكمل.`);
    openPeople();
    return false;
  }
  return true;
}
function setup(id, internal = false) {
  if (!games.some((g) => g[0] === id)) return;
  if (!requirePlayers(id)) return;
  if (!internal) {
    tourney = null;
    dailyRun = null;
  }
  captureSoloSession();
  recordRecent(id);
  clearTimers();
  removePause();
  closeModal(true);
  syncLearned(true);
  if (
    ![
      'ttt',
      'connect',
      'code',
      'simon',
      'slide',
      'sudoku',
      'word',
      'math',
      'color',
      'pattern',
      'spy',
      'taboo',
    ].includes(id)
  ) {
    legacySetup(id);
    if (id === 'mind')
      $('app')
        .querySelector('.panel')
        .insertAdjacentHTML(
          'beforeend',
          '<div class="actions"><button onclick="openKnowledge()">🧠 علّم اللعبة شي جديد</button></div>',
        );
    return;
  }
  screen = 'setup';
  state = { id };
  let body = '';
  const diff = `<div class="field full"><label for="level">المستوى</label><select id="level"><option value="easy">خفيف</option><option value="normal" selected>متوسط</option><option value="hard">تحدّي</option></select></div>`;
  if (id === 'ttt' || id === 'connect')
    body = `<p class="muted">${id === 'ttt' ? 'كوّن خطاً من 3 علامات أفقياً أو عمودياً أو قطرياً.' : 'وصّل 4 قطع أفقياً أو عمودياً أو قطرياً. القطعة تنزل لآخر خانة فاضية.'}</p><div class="fields"><div class="field full"><label for="opponent">تلعب مع منو؟</label><select id="opponent" onchange="opponentChanged()"><option value="bot">الخصم الذكي</option><option value="friend">شخص على نفس الجهاز</option></select></div>${playerField('اللاعب الأول')}<div class="field full" id="secondfield" hidden><label for="second">اللاعب الثاني</label><select id="second">${store.players.map((n, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div><div class="field full" id="botfield"><label for="level">قوة الخصم</label><select id="level"><option value="easy">خفيف</option><option value="normal">متوسط</option><option value="hard" selected>قوي</option></select></div><div class="field full">${id === 'ttt' ? '<label for="tttrule">قاعدة الفوز</label><select id="tttrule"><option value="classic">كوّن خطًا للفوز</option><option value="misere">تجنب الخط · من يكمله يخسر</option></select></div><div class="field full">' : ''}<label for="boardseries">طول المواجهة</label><select id="boardseries"><option value="1">جولة واحدة</option><option value="3">3 جولات · البداية بالتناوب</option><option value="5">5 جولات · البداية بالتناوب</option></select></div><div class="field full"><label for="first">منو يبدأ؟</label><select id="first"><option value="0">اللاعب الأول</option><option value="1">الخصم</option><option value="random">قرعة</option></select></div></div><p class="note">${id === 'ttt' ? 'المستوى القوي يفحص كل المسارات ويتجنب الخسارة.' : 'المستوى القوي يبحث عدة حركات للأمام ويصد فرص الفوز.'}</p>`;
  else if (id === 'code')
    body = `<p class="muted">اكتشف الشفرة من 0 إلى 9. الأخضر يعني رقم ومكان صحيحين؛ الأصفر رقم صحيح في مكان آخر. المحاولات: خفيف 12، متوسط 10، تحدّي 8.</p><div class="fields">${diff}<div class="field full"><label for="codelength">طول الشفرة</label><select id="codelength"><option value="3">3 أرقام</option><option value="4" selected>4 أرقام</option><option value="5">5 أرقام</option></select></div><div class="field full"><label for="repeatdigits">طريقة الشفرة</label><select id="repeatdigits"><option value="no">الأرقام مختلفة</option><option value="yes">ممكن الرقم يتكرر</option></select></div>${playerField()}</div>`;
  else if (id === 'simon')
    body = `<p class="muted">راقب تسلسل الألوان وكرر نفس الترتيب. لكل لون رمز ونغمة. كل نجاح يضيف خطوة.</p><div class="fields">${diff}<div class="field full"><label for="simonmode">أسلوب التذكر</label><select id="simonmode"><option value="forward">نفس الترتيب</option><option value="reverse">من الأخير للأول</option></select></div><div class="field full"><label for="simoncue">طريقة الإشارة</label><select id="simoncue"><option value="both">لون وصوت</option><option value="audio">تحدي الاستماع · صوت فقط</option></select></div>${playerField()}</div><p class="note">الهدف 15 مرحلة. تقدر تستخدم أرقام لوحة المفاتيح 1–4.</p>`;
  else if (id === 'slide')
    body = `<p class="muted">حرّك القطعة المجاورة للمكان الفاضي ورتّب الأرقام من 1 إلى الأخير. كل لوحة تنتج من حركات قانونية، لذلك لها حل.</p><div class="fields"><div class="field full"><label for="size">حجم اللوحة</label><select id="size"><option value="3">3×3 · 8 قطع</option><option value="4">4×4 · 15 قطعة</option><option value="5">5×5 · 24 قطعة</option></select></div>${diff}${playerField()}</div>`;
  else if (id === 'sudoku')
    body = `<p class="muted">املأ الخانات بالأرقام 1–9 بدون تكرار في أي صف أو عمود أو مربع 3×3. كل لغز له حل واحد.</p><div class="fields">${diff}${playerField()}</div><p class="note">حدد خانة ثم اختر رقم. التلميح يملأ خانة صحيحة ويخصم من النقاط.</p>`;
  else if (id === 'word')
    body = `<p class="muted">كلمات بحروف مبعثرة. اكتشفها من الحروف أو افتح تلميحاً. المستوى يغيّر طول الكلمات ووقت الجولة.</p><div class="fields">${diff}<div class="field full">${catField()}</div><div class="field full"><label for="wordcount">عدد الكلمات</label><select id="wordcount"><option value="5">5 كلمات</option><option value="7" selected>7 كلمات</option><option value="10">10 كلمات</option></select></div>${playerField()}</div>`;
  else if (id === 'math')
    body = `<p class="muted">اختَر الناتج الصحيح لكل عملية. اضبط عدد الأسئلة ووقت التحدّي، ثم اختبر دقتك وسرعتك.</p><div class="fields">${diff}<div class="field full"><label for="mathmode">نوع العملية</label><select id="mathmode"><option value="result">ابحث عن الناتج</option><option value="missing">اكتشف العدد الناقص</option></select></div>${quizFields('math')}${playerField()}</div>`;
  else if (id === 'color')
    body = `<p class="muted">اختَر لون الحروف نفسها، حتى لو الكلمة تقول لوناً آخر. اضبط الوقت وعدد الأسئلة لتحدٍّ يناسبك.</p><div class="fields">${diff}<div class="field full"><label for="colormode">قاعدة الإجابة</label><select id="colormode"><option value="ink">لون الحروف دائماً</option><option value="mixed">قاعدة متغيرة · لون أو معنى</option></select></div><div class="field full"><label for="colorrule">نوع التمييز</label><select id="colorrule"><option value="standard">ألوان وكلمات</option><option value="shape">ألوان وأشكال · اتبع البطاقة</option></select></div>${quizFields('color')}${playerField()}</div><div class="hintpanel">مثال: كلمة «أحمر» مكتوبة بالأزرق، جوابك «أزرق».</div>`;
  else if (id === 'pattern')
    body = `<p class="muted">اكتشف قاعدة كل سلسلة واختر الرقم الناقص. شرح الحل يظهر بعد إجابتك. اضبط الوقت وطول الجولة.</p><div class="fields">${diff}<div class="field full"><label for="patternmode">مكان العدد الناقص</label><select id="patternmode"><option value="next">العدد التالي</option><option value="missing">خانة داخل السلسلة</option></select></div>${quizFields('pattern')}${playerField()}</div>`;
  else if (id === 'spy')
    body = `<p class="muted">الكل يشوف نفس المكان إلا الجاسوس. كل لاعب يشوف دوره بروحه، وبعدها اسألوا بعض بدون ما تفضحون المكان. في النهاية كل واحد يصوّت.</p><div class="fields"><div class="field full"><label for="spytheme">عالم الأماكن</label><select id="spytheme"><option value="all">كل الأماكن</option><option value="everyday">الحياة اليومية</option><option value="travel">السفر والمغامرات</option><option value="fantasy">عوالم خيالية</option></select></div><div class="field full"><label for="duration">وقت النقاش</label><select id="duration"><option value="180">3 دقائق</option><option value="300" selected>5 دقائق</option><option value="480">8 دقائق</option></select></div></div><p class="note">${store.players.length} لاعبين: ${store.players.map(esc).join('، ')}. تصويت بدون أغلبية واضحة = فوز الجاسوس.</p><div class="actions"><button onclick="openPeople()">عدّل اللاعبين</button></div>`;
  else if (id === 'taboo')
    body = `<p class="muted">اشرح الكلمة بدون ما تقولها أو تقول أي كلمة من الممنوعات. جواب صحيح +10، مخالفة −5، تجاوز −2. الباقين يحكمون على الشرح.</p><div class="fields"><div class="field full"><label for="taboocategory">فئة الكلمات</label><select id="taboocategory"><option value="all">كل الفئات</option><option value="everyday">الحياة اليومية</option><option value="science">العلوم والتقنية</option><option value="travel">السفر والأماكن</option><option value="sport">الرياضة</option><option value="food">الأكل والمشروبات</option></select></div><div class="field"><label for="duration">وقت الدور</label><select id="duration"><option value="45">45 ثانية</option><option value="60" selected>60 ثانية</option><option value="90">90 ثانية</option></select></div><div class="field"><label for="rounds">الأدوار لكل لاعب</label><select id="rounds"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div></div><div class="field"><label for="tabooskips">تجاوزات الدور</label><select id="tabooskips"><option value="unlimited">مفتوحة · −2 لكل تجاوز</option><option value="3">3 تجاوزات · اختر بعناية</option></select></div><p class="note">يلعبون: ${store.players.map(esc).join('، ')}.</p>`;
  setHTML(
    wrap(
      id,
      `<section class="panel">${body}<div class="actions"><button class="primary" onclick="startExtra('${id}')">${id === 'spy' || id === 'taboo' ? 'نبدأ اللمّة' : 'يلا نلعب'} ←</button></div></section>`,
    ),
  );
  goTop();
}
function opponentChanged() {
  const friend = $('opponent').value === 'friend';
  $('secondfield').hidden = !friend;
  $('botfield').hidden = friend;
}
function result(id, title, text, points = 0, detail = '') {
  if (state?.resultShown) return;
  if (state) state.resultShown = true;
  points = Number.isFinite(points)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(points)))
    : 0;
  clearTimers();
  if (state) state.done = true;
  removePause();
  if (points === 0 && !state?.roundRecorded) addScore(state?.name || player(), 0);
  if (dailyRun && dailyRun.id === id) {
    const k = dailyRun.date + ':' + id;
    store.extra.daily[k] = Math.max(store.extra.daily[k] || 0, points);
    store.extra.daily[dailyRun.date + ':done:' + id] = 1;
  }
  updateBadges();
  save();
  tone(points > 0);
  if (points > 0 && store.extra.motion) confetti();
  setHTML(
    wrap(
      id,
      `<section class="panel success center celebrate"><div class="resulticon">${points ? '🏆' : '✦'}</div><h2>${title}</h2>${detail ? `<div class="resultnum">${esc(detail)}</div>` : ''}<p class="muted" style="margin-top:12px">${text}</p><div class="chips" style="justify-content:center"><span class="chip">+${Math.round(points)} نقطة</span>${dailyRun ? '<span class="chip">انحفظت نتيجة اليوم ✓</span>' : ''}</div><div class="actions">${tourney?.active ? '<button class="primary" onclick="nextTournament()">الدور اللي بعده ←</button>' : `<button class="primary" onclick="setup('${id}')">جولة جديدة</button>${dailyRun ? '<button onclick="openDaily()">تحدّيات اليوم</button>' : ''}`}<button onclick="home()">العالم</button></div></section>`,
    ),
  );
}
function finishExtra(title, text, points = 0, detail = '') {
  if (!state || state.done) return;
  const s = state;
  if (points > 0) addScore(s.name || player(), points);
  result(s.id, title, esc(text), points, detail);
}
function confetti() {
  const old = $('celebration');
  old?.remove();
  if (!store.extra.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const div = document.createElement('div');
  div.id = 'celebration';
  div.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:12';
  div.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 35; i++) {
    const p = document.createElement('i');
    p.style.cssText = `position:absolute;top:-12px;left:${randInt(100)}%;width:7px;height:12px;background:${['#77ecd1', '#ffc985', '#c6b5ff', '#95c8ff'][i % 4]};border-radius:2px;transform:rotate(${randInt(180)}deg)`;
    div.append(p);
    p.animate(
      [
        { transform: 'translateY(-20px) rotate(0deg)', opacity: 1 },
        { transform: `translateY(100vh) rotate(${360 + randInt(500)}deg)`, opacity: 0 },
      ],
      { duration: 1500 + randInt(1500), delay: randInt(400), easing: 'ease-in' },
    );
  }
  document.body.append(div);
  setTimeout(() => div.remove(), 3500);
}
function dayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
function dayGames() {
  const ids = ['code', 'math', 'pattern', 'color', 'word'];
  const rng = makeSeed('daily-selection:' + dayKey());
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 3);
}
function dailyCompleted() {
  return dayGames().filter((id) => store.extra.daily[dayKey() + ':done:' + id] === 1).length;
}
function openDaily() {
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">☀ تحدّي اليوم</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">${dayKey()} · 3 تحديات ثابتة لليوم. تقدر تعيدها وتحسّن نتيجتك؛ أفضل نتيجة تبقى محفوظة.</p>${dayGames()
      .map((id) => {
        const g = games.find((v) => v[0] === id),
          k = dayKey() + ':' + id;
        return `<div class="roundrow"><span class="tileicon" style="--tile:${g[5]};width:43px;height:43px;font-size:24px">${g[1]}</span><b>${g[2]}<small style="display:block;font-size:12px">${store.extra.daily[dayKey() + ':done:' + id] ? '✓ مكتمل · أفضل نتيجة ' + (store.extra.daily[k] || 0) : 'بعده ينتظرك'}</small></b><button onclick="startDaily('${id}')">العب</button></div>`;
      })
      .join(
        '',
      )}<div class="hintpanel">الألعاب والأسئلة تتغير كل يوم بتوقيت الكويت. التحديات قابلة للإعادة، وما تحتاج تسجيل دخول.</div>`,
  );
}
let seededRandom = null;
function makeSeed(seed) {
  let x = 2166136261;
  for (const c of seed) {
    x ^= c.charCodeAt(0);
    x = Math.imul(x, 16777619);
  }
  return () => {
    x += 0x6d2b79f5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gameRand = (n) => (seededRandom ? Math.floor(seededRandom() * n) : randInt(n));
function gShuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = gameRand(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
function startDaily(id) {
  if (!['code', 'math', 'pattern', 'color', 'word'].includes(id)) return;
  closeModal();
  setup(id);
  dailyRun = { id, date: dayKey() };
  if ($('level')) $('level').value = 'normal';
  if ($('repeatdigits')) $('repeatdigits').value = 'no';
  startExtra(id);
}
function openTournament() {
  const queue = ['code', 'math', 'pattern', 'color', 'word'];
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">🏆 بطولة اللمّة</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">نفس التحديات لكل لاعب وبنفس ترتيب الأسئلة. بعد كل دور مرّر الجهاز. أعلى مجموع نقاط يفوز.</p><div class="fields"><div class="field full"><label for="toursize">طول البطولة</label><select id="toursize"><option value="3">سريعة · 3 ألعاب</option><option value="5">كاملة · 5 ألعاب</option><option value="custom">ألعاب تختارها</option></select></div></div><fieldset class="tournament-choice"><legend>اختر ألعاب البطولة المخصصة</legend>${queue
      .map((id) => {
        const g = games.find((v) => v[0] === id);
        return `<label class="inlinecheck"><input type="checkbox" name="tourgame" value="${id}" checked><span>${g[1]} ${g[2]}</span></label>`;
      })
      .join(
        '',
      )}</fieldset><div class="hintpanel">النتيجة القصوى لكل لعبة 100 نقطة. نفس المستوى والإعدادات والأسئلة لجميع اللاعبين؛ المحاولات مستقلة.</div><p class="note">اللاعبون: ${store.players.map(esc).join('، ')}</p><div class="actions"><button onclick="openPeople()">عدّل اللاعبين</button><button class="primary" onclick="startTournament()">ابدأ البطولة</button></div>`,
  );
}
function startTournament() {
  if (store.players.length < 2) {
    toast('البطولة تحتاج لاعبين على الأقل.');
    return openPeople();
  }
  const size = $('toursize').value;
  const queue =
    size === 'custom'
      ? [...$('modal').querySelectorAll('input[name="tourgame"]:checked')].map((v) => v.value)
      : ['code', 'math', 'pattern', 'color', 'word'].slice(0, Number(size));
  if (!queue.length) return toast('اختر لعبة واحدة على الأقل للبطولة.');
  closeModal();
  tourney = {
    active: true,
    players: [...store.players],
    queue,
    turn: 0,
    current: 0,
    results: Object.fromEntries(store.players.map((n) => [n, 0])),
    seed: 'tour-' + Date.now(),
    wordItems: items.map((v) => ({
      name: v.name,
      cat: v.cat,
      hints: [...v.hints],
      aliases: [...v.aliases],
    })),
  };
  dailyRun = null;
  tourHandoff();
}
function tourHandoff() {
  clearTimers();
  const id = tourney.queue[Math.floor(tourney.turn / tourney.players.length)],
    g = games.find((v) => v[0] === id);
  screen = 'tour-handoff';
  state = null;
  setHTML(
    wrap(
      id,
      `<section class="panel center"><div class="resulticon">🏆</div><h2>الدور على ${esc(player())}</h2><p class="note">${g[2]} · مرّر الجهاز وخله يستعد بروحه.</p><div class="actions"><button class="primary" onclick="startTourRound()">أنا جاهز، نبدأ</button></div></section>`,
    ),
  );
  goTop();
}
function startTourRound() {
  if (!tourney?.active || screen !== 'tour-handoff') return;
  const id = tourney.queue[Math.floor(tourney.turn / tourney.players.length)];
  tourney.current = 0;
  setup(id, true);
  if ($('level')) $('level').value = 'normal';
  startExtra(id);
}
function nextTournament() {
  if (!tourney?.active || !state?.done) return;
  const name = player();
  tourney.results[name] += tourney.current;
  tourney.turn++;
  if (tourney.turn >= tourney.queue.length * tourney.players.length) {
    store.extra.best.tournament = (store.extra.best.tournament || 0) + 1;
    updateBadges();
    save();
    const names = tourney.players,
      r = tourney.results;
    tourney.active = false;
    screen = 'tour-result';
    state = null;
    setHTML(
      `<div class="play"><section class="panel success"><div class="resulticon center">🏆</div><h2 class="center">أبطال اللمّة</h2><p class="note center">أعلى مجموع يفوز. أصحاب نفس النتيجة متعادلين.</p><div style="margin-top:20px">${boardHTML(names, r)}</div><div class="actions"><button class="primary" onclick="openTournament()">بطولة جديدة</button><button onclick="home()">العالم</button></div></section></div>`,
    );
    confetti();
  } else tourHandoff();
}
function openKnowledge() {
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">🧠 قاعدة التخمين</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">${builtInCount} شي جاهز + ${store.extra.learned.length} إضافة منك. تضيف الاسم والصفات والتلميحات، واللعبة تستعملها بالجولات القادمة. التغييرات أثناء اللعب تُطبّق عند بدء جولة جديدة.</p><div class="actions"><button class="primary" onclick="teachItem()">+ أضف شي جديد</button></div>${store.extra.learned.map((v, i) => `<div class="listword"><b>${esc(v.name)}</b><button onclick="teachItem(${i})">تعديل</button><button onclick="deleteLearned(${i})" aria-label="حذف ${esc(v.name)}">✕</button></div>`).join('')}<div class="hintpanel">التخمين يعتمد على الصفات والقائمة المحلية، ما يقرأ الأفكار. «مو متأكد» يتجاوز السؤال، وتقدر تتراجع إذا جاوبت بالغلط.</div>`,
  );
}
function teachItem(index = -1) {
  const v = store.extra.learned[index] || {
    name: '',
    cat: 'object',
    tags: [],
    hints: ['', '', ''],
    aliases: [],
  };
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">${index < 0 ? 'علّم اللعبة' : 'عدّل الشي'}</h2><button onclick="openKnowledge()" aria-label="العودة">←</button></div><div class="fields"><div class="field"><label for="learnname">اسم الشي</label><input id="learnname" maxlength="40" value="${esc(v.name)}"></div><div class="field"><label for="learncat">الفئة</label><select id="learncat">${categories
      .filter((c) => c[0] !== 'all')
      .map((c) => `<option value="${c[0]}" ${v.cat === c[0] ? 'selected' : ''}>${c[1]}</option>`)
      .join(
        '',
      )}</select></div><div class="field full"><label for="learnaliases">أسماء ثانية، تفصلها بفاصلة (اختياري)</label><input id="learnaliases" maxlength="140" value="${esc(v.aliases.join('، '))}"></div>${v.hints.map((h, i) => `<div class="field full"><label for="learnhint${i}">التلميح ${i + 1} · ${['خفيف', 'أوضح', 'واضح جداً'][i]}</label><input id="learnhint${i}" maxlength="100" value="${esc(h)}"></div>`).join('')}</div><p class="note">حدد الصفات اللي جوابها «نعم». الفئة تنضاف تلقائياً.</p><div class="knowledge">${questions
      .slice(6)
      .map(
        (q, i) =>
          `<div class="check"><input type="checkbox" id="tag${i}" ${v.tags.includes(q[0]) ? 'checked' : ''}><label for="tag${i}">${q[1]}</label></div>`,
      )
      .join(
        '',
      )}</div><div class="actions"><button class="primary" onclick="saveLearned(${index})">حفظ الشي</button></div>`,
  );
}
function saveLearned(index) {
  const name = latin($('learnname').value.trim()),
    hints = [0, 1, 2].map((i) => latin($('learnhint' + i).value.trim()));
  if (!name || hints.some((h) => !h)) return toast('اكتب الاسم والتلميحات الثلاثة.');
  if (
    items.slice(0, builtInCount).some((v) => norm(v.name) === norm(name)) ||
    store.extra.learned.some((v, i) => i !== index && norm(v.name) === norm(name))
  )
    return toast('هالاسم موجود. اختار اسم ثاني.');
  if (index < 0 && store.extra.learned.length >= 200) return toast('وصلت الحد: 200 إضافة.');
  const cat = $('learncat').value,
    tags = questions
      .slice(6)
      .filter((q, i) => $('tag' + i).checked)
      .map((q) => q[0]),
    aliases = $('learnaliases')
      .value.split(/[,،]/)
      .map((v) => latin(v.trim()))
      .filter(Boolean);
  if (
    name.length > 40 ||
    hints.some((hint) => hint.length > 100) ||
    aliases.length > 10 ||
    aliases.some((alias) => alias.length > 50)
  )
    return toast('الاسم حتى 40 حرفًا، والتلميح حتى 100، وحتى 10 أسماء بديلة طول كل منها 50 حرفًا.');
  const v = { name, cat, tags, hints, aliases };
  if (index < 0) store.extra.learned.push(v);
  else store.extra.learned[index] = v;
  syncLearned();
  updateBadges();
  save();
  openKnowledge();
  toast(
    pendingKnowledgeSync
      ? 'تم الحفظ. التغيير يظهر في الجولة القادمة.'
      : 'تم الحفظ في قاعدة التخمين.',
  );
}
function deleteLearned(index) {
  if (!Number.isInteger(index) || index < 0 || index >= store.extra.learned.length) return;
  store.extra.learned.splice(index, 1);
  syncLearned();
  save();
  openKnowledge();
  if (pendingKnowledgeSync) toast('تم الحذف. الجولة الحالية تحتفظ بقائمتها حتى تنتهي.');
}
function renderMind() {
  const s = state;
  s.q =
    s.mindStyle === 'investigate' &&
    mindQuestionOptions(s).some((entry) => entry.q === s.selectedQuestion)
      ? s.selectedQuestion
      : chooseQuestion(s.candidates, s.asked);
  const one = s.candidates.length === 1;
  setHTML(
    wrap(
      'mind',
      `<div class="stats"><div class="stat"><small>خيارات باقية</small><b>${s.candidates.length}</b></div><div class="stat"><small>أسئلة مرّت</small><b>${s.asked.length}</b></div></div><section class="panel"><div class="spot"><small>${one ? 'بناءً على إجاباتك…' : s.q === null ? 'وصلنا للخيارات الأخيرة' : 'جاوب عن الشي اللي في بالك'}</small><div class="huge word">${one ? esc(items[s.candidates[0]].name) : s.q === null ? 'أي واحد؟' : questions[s.q][1]}</div></div>${one ? `<div class="actions"><button class="primary" onclick="confirmMind(true)">إي، هذا هو! ✓</button><button onclick="confirmMind(false)">لا، مو هو</button></div>` : s.q === null ? `<div class="actions">${s.candidates.map((i) => `<button onclick="pickMind(${i})">${esc(items[i].name)}</button>`).join('')}</div><button class="quiet" style="width:100%;margin-top:12px" onclick="confirmMind(false)">ولا واحد منهم</button>` : `<div class="answerrow"><button class="primary" onclick="mindAnswer('yes')">إي ✓</button><button class="rose" onclick="mindAnswer('no')">لا ✕</button><button onclick="mindAnswer('unknown')">مو متأكد</button></div>`}<div class="actions"><button onclick="undoMind()" ${!s.history.length ? 'disabled' : ''}>↶ تراجع عن سؤال</button><button onclick="openKnowledge()">علّمها شي جديد</button></div><p class="note">القائمة فيها ${items.length} شي. الصفات تقصد الوصف المعتاد. إذا مو متأكد تجاوز السؤال.</p></section>`,
    ),
  );
}
function confirmMind(ok) {
  if (screen !== 'mind' || state.done || coreBlocked()) return;
  if (!ok) {
    openModal(
      '<div class="modalhead"><h2 id="modaltitle">نقدر نعلّمها</h2><button onclick="closeModal()">✕</button></div><p class="muted">إذا الشي خارج القائمة، أضفه مع صفاته. وإذا جاوبت بالغلط، ارجع وصحّح الإجابة.</p><div class="actions"><button onclick="closeModal();undoMind()">تراجع عن سؤال</button><button class="primary" onclick="teachItem()">أضف الشي</button></div>',
    );
    return;
  }
  addScore(state.name, 30);
  result(
    'mind',
    'عرفنا اللي في بالك 🔮',
    `بعد ${state.asked.length} سؤال.`,
    30,
    items[state.candidates[0]].name,
  );
}

// Fullscreen is requested only by an explicit button click.
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
    } else {
      const enter =
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen;
      if (!enter) {
        toast('اللعبة تملأ مساحة المتصفح بالفعل. للشاشة الكاملة جرّب F11 من لوحة المفاتيح.');
        return;
      }
      await enter.call(document.documentElement);
    }
    fullscreenUI();
  } catch (e) {
    toast('المتصفح لم يسمح بالشاشة الكاملة. تقدر تستخدم F11 من لوحة المفاتيح.');
  }
}
function fullscreenUI() {
  const b = $('fullscreen');
  if (!b) return;
  const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
  b.setAttribute('aria-pressed', String(active));
  b.setAttribute('aria-label', active ? 'الخروج من الشاشة الكاملة' : 'تشغيل الشاشة الكاملة');
  b.title = active ? 'الخروج من الشاشة الكاملة' : 'الشاشة الكاملة';
  b.innerHTML = `${active ? '⛶' : '⛶'}<span>${active ? 'خروج' : 'شاشة كاملة'}</span>`;
}
document.addEventListener('fullscreenchange', fullscreenUI);
document.addEventListener('webkitfullscreenchange', fullscreenUI);
const gameGuides = {
  finder: [
    'خل صاحبك يختار عدداً صحيحاً، ثم جاوب إذا كان أكبر أو أصغر من تخمين اللعبة.',
    'جاوب عن موقع رقمك بالنسبة للتخمين. تقدر تتراجع إذا جاوبت بالغلط.',
  ],
  solo: [
    'حاول اكتشاف الرقم السري بأقل عدد من المحاولات. التلميح يقول لك أكبر أو أصغر.',
    'ابدأ من منتصف النطاق، وقلّصه بعد كل إجابة.',
  ],
  mind: [
    'فكّر بشيء من الفئة المختارة، وأجب عن صفاته حتى تستبعد اللعبة بقية الخيارات.',
    'إذا ما تعرف الجواب اختر «مو متأكد». تقدر تضيف أشياء جديدة من قاعدة التخمين.',
  ],
  who: [
    'اكتشف الشيء السري من التلميحات واكتب اسمه.',
    'التلميحات الإضافية تساعدك وتقلل النقاط؛ أسماء الأشياء كلها في القائمة المحلية.',
  ],
  memory: [
    'افتح بطاقتين كل مرة. إذا تطابقتا يبقى الزوج ظاهراً.',
    'تذكّر موقع الرمز قبل ما تفتح البطاقة التالية. اللوحات الكبيرة تعطي تحدياً أطول.',
  ],
  reaction: [
    'انتظر الإشارة الخضراء ثم اضغط بأسرع وقت.',
    'الضغط المبكر يضيف عقوبة. استخدم المسافة من لوحة المفاتيح، أو اضغط منطقة اللعب.',
  ],
  mime: [
    'يشاهد صاحب الدور كلمة ويمثلها دون كلام حتى يخمنها الباقون.',
    'أخفوا الشاشة عن بقية اللاعبين. الصحيح يضيف نقاطاً والتجاوز يخصم منها.',
  ],
  secret: [
    'شخص واحد يعرف كلمة السر، والباقون يسألونه أسئلة بنعم أو لا.',
    'مرّر الجهاز بعد إخفاء الكلمة. اختر أسئلة تقلل الخيارات بسرعة.',
  ],
  ttt: [
    'ضع علاماتك لتكوين خط من 3 علامات أفقياً، عمودياً أو قطرياً.',
    'احتل الوسط، وامنع الخصم إذا صار عنده علامتان في خط واحد.',
  ],
  connect: [
    'أسقط قطعة في عمود. أول لاعب يربط 4 قطع بأي اتجاه يفوز.',
    'راقب الخطوط القطرية، وحاول بناء فرصتين للفوز في نفس الوقت.',
  ],
  code: [
    'اكتشف الشفرة من الملاحظات بعد كل محاولة. الأخضر: رقم ومكان صحيحان. الأصفر: رقم صحيح في مكان آخر.',
    'ابدأ بأرقام متنوعة. تستطيع اختيار 3–5 خانات، والسماح بتكرار الرقم.',
  ],
  simon: [
    'راقب الأضواء والنغمات، ثم كرر التسلسل وفق الوضع المختار: بنفس الترتيب أو من الأخير للأول.',
    'تستطيع استخدام الأرقام 1–4. كل مرحلة تزيد خطوة؛ ركز على مجموعات قصيرة.',
  ],
  slide: [
    'حرّك قطعة مجاورة للفراغ ورتّب الأرقام من 1 إلى الأخير.',
    'ابدأ بالصف العلوي ثم العمود الأول. اللوحات دائماً قابلة للحل.',
  ],
  sudoku: [
    'اكتب 1–9 دون تكرار في الصف أو العمود أو مربع 3×3.',
    'حدد خانة ثم رقم. استخدم الملاحظات لتسجيل الاحتمالات، والتراجع لتصحيح حركة.',
  ],
  word: [
    'رتّب الحروف المبعثرة واكتب الكلمة الصحيحة.',
    'الفئة وعدد الحروف يساعدانك. التلميح يكشف وصفاً ويخصم من النقاط.',
  ],
  math: [
    'اختر الناتج الصحيح لكل عملية قبل انتهاء الوقت.',
    'في الضرب والقسمة جرّب استبعاد الإجابات البعيدة قبل الحساب النهائي.',
  ],
  color: [
    'اتبع قاعدة السؤال: لون الحروف في الوضع الأساسي، أو اللون ومعنى الكلمة بالتناوب في الوضع المتغير.',
    'اقرأ بطاقة القاعدة الظاهرة قبل اختيار الجواب. البرهان والشرح يبقيان حتى الجولة التالية.',
  ],
  pattern: [
    'اكتشف قاعدة سلسلة الأرقام واختر العدد الناقص.',
    'افحص الفرق، ثم النسبة، ثم القواعد المتناوبة. شرح الحل يظهر بعد الإجابة.',
  ],
  spy: [
    'الجميع يعرف المكان إلا الجاسوس. اسألوا بعضاً ثم صوّتوا.',
    'لا تقولوا اسم المكان صراحة. الجاسوس يحاول استنتاجه من أجوبتكم.',
  ],
  taboo: [
    'اشرح الكلمة دون نطقها أو نطق الكلمات الممنوعة، والباقون يخمنون.',
    'الصحيح +10، المخالفة −5 والتجاوز −2. اختر الفئة والوقت المناسبين للّمة.',
  ],
  snake: [
    'حرّك الثعبان واجمع الطعام حتى يكبر، مع تجنب الاصطدام.',
    'استخدم أزرار الاتجاه أو الأسهم. اختر سرعة مريحة قبل بدء الجولة.',
  ],
  merge: [
    'حرّك البلاطات لدمج الأرقام المتساوية والوصول إلى أرقام أكبر.',
    'حافظ على أكبر رقم في زاوية، وتجنب ملء اللوحة بلا حركات ممكنة.',
  ],
  mines: [
    'اكشف المربعات الآمنة واستخدم الأرقام لمعرفة أماكن الألغام.',
    'الرقم يوضح عدد الألغام حوله. ضع الأعلام على الأماكن التي تشك فيها.',
  ],
  maze: [
    'ابحث عن مسار من البداية إلى الهدف عبر المتاهة.',
    'استخدم الأسهم أو أزرار الاتجاه. تتغير المتاهات مع كل جولة جديدة.',
  ],
  trivia: [
    'اختر الإجابة الصحيحة في مجموعة أسئلة ثقافية من فئات مختلفة.',
    'ابدأ بالفئة المفضّلة، ثم جرّب مزيجاً من الفئات لتوسيع معرفتك.',
  ],
  hangman: [
    'اكتشف الكلمة المخفية بتجربة الحروف قبل نفاد المحاولات.',
    'ابدأ بالحروف الشائعة، واستفد من الفئة والتلميح.',
  ],
  wordguess: [
    'خمن كلمة عربية واستفد من لون كل حرف لتصل إلى الحل.',
    'الأخضر يعني الحرف في مكانه، والأصفر في مكان آخر؛ راقب أيضاً الحروف المكررة.',
  ],
  target: [
    'اضغط الأهداف الظاهرة بسرعة ودقة قبل انتهاء الجولة.',
    'ركز على الدقة أولاً، ثم زد السرعة. اختيار مستوى أصعب يزيد التحدّي.',
  ],
};
function openGuide(id = '') {
  const g = games.find((v) => v[0] === id),
    tips = gameGuides[id];
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">${g ? g[1] + ' ' + esc(g[2]) : '🌌 دليل عالم اللمّة'}</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div>${g ? `<div class="guide-step"><span>1</span><div><h3>هدف اللعبة</h3><p>${tips ? tips[0] : esc(g[3])}</p></div></div><div class="guide-step"><span>2</span><div><h3>نصيحة للبداية</h3><p>${tips ? tips[1] : 'اختر الإعدادات المناسبة، واتبع التعليمات الظاهرة أثناء الجولة.'}</p></div></div>` : `<div class="guide-step"><span>1</span><div><h3>اكتشف ألعابك</h3><p>تصفح العوالم أو استخدم البحث. فلتر «بمفردك» للألعاب الفردية و«مع الربع» للألعاب التي تدعم الأصدقاء. النجمة تحفظ اللعبة في مفضّلتك.</p></div></div><div class="guide-step"><span>2</span><div><h3>اضبط التحدّي</h3><p>كل لعبة تبدأ بشاشة إعدادات. اختر اللاعب والمستوى، وحجم اللوحة أو وقت الجولة عندما تكون متاحة.</p></div></div><div class="guide-step"><span>3</span><div><h3>العب براحتك</h3><p>استخدم زر الإيقاف لأخذ استراحة. الشاشة الكاملة توسع مساحة اللعب، ودليل كل لعبة موجود بجانب عنوانها.</p></div></div><div class="guide-step"><span>4</span><div><h3>نافس وطور مستواك</h3><p>تحديات اليوم تتجدد بتوقيت الكويت. في البطولة كل اللاعبين يواجهون نفس الأسئلة؛ النقاط والإنجازات تنحفظ تلقائياً على هذا المتصفح.</p></div></div>`}<div class="hintpanel">⌨ لوحة المفاتيح: الأسهم للحركة في الألعاب التي تدعمها، والأرقام للسودوكو وتسلسل الألوان. زر Escape يغلق نافذة الدليل.</div><div class="actions"><button class="primary" onclick="closeModal()">جاهز، نكمل</button></div>`,
  );
}

function quizFields(id) {
  const count = id === 'math' ? 10 : id === 'color' ? 15 : 8,
    seconds = id === 'math' ? 60 : id === 'color' ? 45 : 180;
  return `<div class="field"><label for="quizcount">عدد الأسئلة</label><select id="quizcount">${[5, 8, 10, 15, 20].map((n) => `<option value="${n}" ${n === count ? 'selected' : ''}>${n} أسئلة</option>`).join('')}</select></div><div class="field"><label for="quizduration">وقت الجولة</label><select id="quizduration">${[30, 45, 60, 90, 120, 180, 300].map((n) => `<option value="${n}" ${n === seconds ? 'selected' : ''}>${n} ثانية</option>`).join('')}</select></div>`;
}

window.addEventListener('focus', () => {
  if (screen === 'home' && $('modalback').hidden && homeRenderedDate !== dayKey()) renderHome();
});
document.addEventListener('visibilitychange', () => {
  if (
    !document.hidden &&
    screen === 'home' &&
    $('modalback').hidden &&
    homeRenderedDate !== dayKey()
  )
    renderHome();
});

// A compact, versioned checkpoint for the longer solo puzzles. Secret party roles
// and timed daily/tournament rounds are deliberately never persisted here.
function validSlideCheckpoint(board, empty, path, size) {
  if (
    !Array.isArray(board) ||
    board.length !== size * size ||
    new Set(board).size !== board.length ||
    board.some((n) => !Number.isInteger(n) || n < 0 || n >= board.length) ||
    board[empty] !== 0 ||
    !Array.isArray(path) ||
    path.length > 4000
  )
    return false;
  const test = [...board];
  let hole = empty;
  for (let step = path.length - 1; step >= 0; step--) {
    const index = path[step];
    if (!Number.isInteger(index) || !slideNeighbors(hole, size).includes(index)) return false;
    [test[index], test[hole]] = [test[hole], test[index]];
    hole = index;
  }
  return slideSolved(test);
}
function normalizeSavedSession(raw) {
  try {
    if (
      !raw ||
      raw.version !== 1 ||
      !['code', 'slide', 'sudoku'].includes(raw.id) ||
      !['easy', 'normal', 'hard'].includes(raw.level) ||
      !safeCounter(raw.at) ||
      !safeCounter(raw.elapsed) ||
      raw.elapsed > 31536000 ||
      typeof raw.name !== 'string' ||
      !normalizePlayerName(raw.name) ||
      raw.name.length > 24 ||
      !raw.data ||
      typeof raw.data !== 'object' ||
      Array.isArray(raw.data)
    )
      return null;
    const d = raw.data,
      data = {};
    if (raw.id === 'code') {
      if (
        ![3, 4, 5].includes(d.length) ||
        typeof d.duplicates !== 'boolean' ||
        !Array.isArray(d.secret) ||
        d.secret.length !== d.length ||
        d.secret.some((n) => !Number.isInteger(n) || n < 0 || n > 9) ||
        (!d.duplicates && new Set(d.secret).size !== d.length) ||
        ![8, 10, 12].includes(d.max) ||
        !Array.isArray(d.attempts) ||
        d.attempts.length >= d.max ||
        !safeCounter(d.hints) ||
        d.hints >= d.length ||
        !d.revealed ||
        typeof d.revealed !== 'object' ||
        Array.isArray(d.revealed) ||
        Object.keys(d.revealed).length !== d.hints ||
        Object.entries(d.revealed).some(
          ([key, value]) =>
            !/^\d$/.test(key) || Number(key) >= d.length || value !== d.secret[Number(key)],
        ) ||
        !Array.isArray(d.draft) ||
        d.draft.length !== d.length ||
        d.draft.some((n) => !Number.isInteger(n) || n < 0 || n > 9)
      )
        return null;
      for (const attempt of d.attempts) {
        if (
          !attempt ||
          !Array.isArray(attempt.guess) ||
          attempt.guess.length !== d.length ||
          attempt.guess.some((n) => !Number.isInteger(n) || n < 0 || n > 9) ||
          (!d.duplicates && new Set(attempt.guess).size !== d.length)
        )
          return null;
        const feedback = codeFeedback(d.secret, attempt.guess);
        if (
          feedback.exact === d.length ||
          feedback.exact !== attempt.exact ||
          feedback.misplaced !== attempt.misplaced
        )
          return null;
      }
      Object.assign(data, {
        length: d.length,
        duplicates: d.duplicates,
        secret: [...d.secret],
        max: d.max,
        attempts: d.attempts.map((a) => ({
          guess: [...a.guess],
          exact: a.exact,
          misplaced: a.misplaced,
        })),
        hints: d.hints,
        revealed: { ...d.revealed },
        draft: [...d.draft],
        analysis: null,
        digitNotes:
          Array.isArray(d.digitNotes) &&
          d.digitNotes.length === 10 &&
          d.digitNotes.every((n) => [0, 1, 2].includes(n))
            ? [...d.digitNotes]
            : Array(10).fill(0),
        slotExclusions:
          Array.isArray(d.slotExclusions) &&
          d.slotExclusions.length === d.length &&
          d.slotExclusions.every(
            (list) =>
              Array.isArray(list) &&
              list.length <= 10 &&
              new Set(list).size === list.length &&
              list.every((n) => Number.isInteger(n) && n >= 0 && n <= 9),
          )
            ? d.slotExclusions.map((list) => [...list])
            : Array.from({ length: d.length }, () => []),
        codeSlot:
          Number.isInteger(d.codeSlot) && d.codeSlot >= 0 && d.codeSlot < d.length ? d.codeSlot : 0,
      });
      for (const [key, value] of Object.entries(data.revealed)) data.draft[Number(key)] = value;
    } else if (raw.id === 'slide') {
      if (
        ![3, 4, 5].includes(d.size) ||
        !safeCounter(d.moves) ||
        !safeCounter(d.hints) ||
        typeof d.assisted !== 'boolean' ||
        !validSlideCheckpoint(d.board, d.empty, d.path, d.size) ||
        slideSolved(d.board) ||
        !d.initial ||
        !validSlideCheckpoint(d.initial.board, d.initial.empty, d.initial.path, d.size)
      )
        return null;
      Object.assign(data, {
        size: d.size,
        board: [...d.board],
        empty: d.empty,
        path: [...d.path],
        moves: d.moves,
        hints: d.hints,
        assisted: d.assisted,
        lineMode: d.lineMode === true,
        lockedRows:
          Number.isInteger(d.lockedRows) &&
          d.lockedRows >= 0 &&
          d.lockedRows <= d.size - 2 &&
          d.board.slice(0, d.lockedRows * d.size).every((n, i) => n === i + 1)
            ? d.lockedRows
            : 0,
        initial: { board: [...d.initial.board], empty: d.initial.empty, path: [...d.initial.path] },
        history: [],
      });
    } else {
      if (
        !Array.isArray(d.solution) ||
        d.solution.length !== 81 ||
        d.solution.some(
          (n, i) => !Number.isInteger(n) || n < 1 || n > 9 || sudokuConflicts(d.solution, i),
        ) ||
        !Array.isArray(d.board) ||
        d.board.length !== 81 ||
        d.board.some((n) => !Number.isInteger(n) || n < 0 || n > 9) ||
        d.board.every((n, i) => n === d.solution[i]) ||
        !Array.isArray(d.given) ||
        d.given.length !== 81 ||
        d.given.some(
          (given, i) => typeof given !== 'boolean' || (given && d.board[i] !== d.solution[i]),
        ) ||
        !Number.isInteger(d.selected) ||
        d.selected < 0 ||
        d.selected > 80 ||
        !safeCounter(d.hints) ||
        !safeCounter(d.checks) ||
        !Array.isArray(d.notes) ||
        d.notes.length !== 81 ||
        d.notes.some(
          (a) =>
            !Array.isArray(a) ||
            a.length > 9 ||
            new Set(a).size !== a.length ||
            a.some((n) => !Number.isInteger(n) || n < 1 || n > 9),
        )
      )
        return null;
      Object.assign(data, {
        solution: [...d.solution],
        board: [...d.board],
        given: [...d.given],
        selected: d.selected,
        hints: d.hints,
        checks: d.checks,
        notes: d.notes.map((a) => [...a]),
        noteMode: d.noteMode === true,
        showCandidates: d.showCandidates === true,
        checked: [],
        history: [],
        lastCheckedBoard:
          typeof d.lastCheckedBoard === 'string' && /^[0-9]{81}$/.test(d.lastCheckedBoard)
            ? d.lastCheckedBoard
            : '',
        lastExplainedBoard:
          typeof d.lastExplainedBoard === 'string' && /^[0-9]{81}$/.test(d.lastExplainedBoard)
            ? d.lastExplainedBoard
            : '',
      });
    }
    return {
      version: 1,
      id: raw.id,
      level: raw.level,
      name: normalizePlayerName(raw.name),
      at: raw.at,
      elapsed: raw.elapsed,
      data,
    };
  } catch (e) {
    return null;
  }
}
function captureSoloSession() {
  const s = state;
  if (
    !s ||
    screen !== s.id ||
    s.fixed ||
    dailyRun ||
    tourney?.active ||
    !['code', 'slide', 'sudoku'].includes(s.id)
  )
    return;
  if (s.done) {
    if (store.extra.savedSession?.id === s.id && store.extra.savedSession.name === s.name) {
      store.extra.savedSession = null;
      save();
    }
    return;
  }
  const keys =
    s.id === 'code'
      ? [
          'length',
          'duplicates',
          'secret',
          'max',
          'attempts',
          'hints',
          'revealed',
          'draft',
          'digitNotes',
          'slotExclusions',
          'codeSlot',
        ]
      : s.id === 'slide'
        ? [
            'size',
            'board',
            'empty',
            'path',
            'moves',
            'hints',
            'assisted',
            'initial',
            'lineMode',
            'lockedRows',
          ]
        : [
            'solution',
            'board',
            'given',
            'selected',
            'hints',
            'checks',
            'notes',
            'noteMode',
            'showCandidates',
            'lastCheckedBoard',
            'lastExplainedBoard',
          ];
  const data = Object.fromEntries(keys.map((key) => [key, s[key]]));
  const snapshot = normalizeSavedSession({
    version: 1,
    id: s.id,
    name: s.name,
    level: s.level,
    at: Date.now(),
    elapsed: s.started ? extraElapsed(s) : 0,
    data,
  });
  if (snapshot) {
    store.extra.savedSession = snapshot;
    save();
  }
}
function snapshotHTML() {
  const snapshot = store.extra.savedSession,
    game = snapshot && games.find((g) => g[0] === snapshot.id);
  return game
    ? `<section class="panel"><div class="sectionhead"><div><span class="world-label">💾 لغز محفوظ</span><h3>كمّل ${esc(game[2])}</h3><p class="note">${esc(snapshot.name)} · اللوحة والمحاولات والمساعدات محفوظة.</p></div><button class="primary" onclick="resumeSavedGame()">نكمل اللعب ←</button></div></section>`
    : '';
}
function resumeSavedGame() {
  const snapshot = normalizeSavedSession(store.extra.savedSession);
  if (!snapshot) {
    store.extra.savedSession = null;
    save();
    return toast('اللوحة المحفوظة غير متاحة. ابدأ لغزاً جديداً.');
  }
  if (
    snapshot.id === 'sudoku' &&
    sudokuCount(snapshot.data.solution.map((n, i) => (snapshot.data.given[i] ? n : 0))) !== 1
  ) {
    store.extra.savedSession = null;
    save();
    return toast('اللغز المحفوظ غير صالح. ابدأ لوحة جديدة.');
  }
  captureSoloSession();
  clearTimers();
  removePause();
  closeModal(true);
  tourney = null;
  dailyRun = null;
  screen = snapshot.id;
  state = {
    id: snapshot.id,
    name: snapshot.name,
    level: snapshot.level,
    fixed: false,
    done: false,
    ...snapshot.data,
    started: Date.now() - snapshot.elapsed * 1000,
  };
  if (snapshot.id === 'code') renderCode('رجعنا إلى نفس الشفرة؛ محاولاتك ومساعداتك محفوظة.');
  else if (snapshot.id === 'slide') renderSlide('نكمل اللوحة المحفوظة من آخر حركة.');
  else renderSudoku('نكمل اللغز؛ الأرقام والملاحظات والمساعدات محفوظة.');
  goTop();
}
window.addEventListener('pagehide', captureSoloSession);

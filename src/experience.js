// Lamma 5: discovery, curated solo journeys and a local group lounge.
const freshGameIds = new Set(['teamcup', 'undercover', 'improv', 'nonogram', 'lights', 'pipes']);
const experienceRoutes = [
  {
    id: 'focus',
    icon: '✦',
    name: 'صفاء الذهن',
    tag: 'ابدأ بخطوة خفيفة',
    color: '#a9ecd8',
    games: ['memory', 'word', 'lights'],
    desc: 'ذاكرة، كلمات، ثم شبكة من الأضواء. ثلاث طرق لتختبر تركيزك.',
  },
  {
    id: 'explore',
    icon: '◈',
    name: 'روح المستكشف',
    tag: 'فكّر خارج الطريق',
    color: '#d3bdff',
    games: ['maze', 'pipes', 'hangman'],
    desc: 'اعثر على الطريق، أوصل الشبكة، واكشف الكلمة الأخيرة.',
  },
  {
    id: 'master',
    icon: '♜',
    name: 'تحدّي المحترف',
    tag: 'خطة قبل كل حركة',
    color: '#ffcb9f',
    games: ['code', 'math', 'nonogram'],
    desc: 'اكسر الشفرة، سابق الأرقام، ثم ارسم بالمنطق.',
  },
];
function normalizeExperience(raw) {
  const clean = { sort: 'recommended', completed: {}, route: null };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  if (['recommended', 'name', 'recent', 'popular'].includes(raw.sort)) clean.sort = raw.sort;
  for (const r of experienceRoutes) {
    const value = raw.completed?.[r.id];
    if (Number.isSafeInteger(value) && value >= 0 && value <= 300) clean.completed[r.id] = value;
  }
  const r = raw.route;
  const config = experienceRoutes.find((v) => v.id === r?.id);
  if (
    config &&
    Number.isInteger(r.at) &&
    r.at >= 0 &&
    r.at < config.games.length &&
    Array.isArray(r.results) &&
    r.results.length === r.at &&
    r.results.every(
      (v, i) =>
        v?.id === config.games[i] &&
        Number.isSafeInteger(v.points) &&
        v.points >= 0 &&
        v.points <= 100,
    )
  ) {
    clean.route = {
      id: r.id,
      at: r.at,
      results: r.results.map((v) => ({ id: v.id, points: v.points })),
    };
  }
  return clean;
}
store.extra.experience = normalizeExperience(store.extra.experience || rawExtra.experience);
let activeRoute = null;
worlds.push(['arcade', '🕹️', 'الأركيد']);
for (const id of ['snake', 'merge', 'mines', 'target']) gameWorld[id] = 'arcade';
for (const id of ['nonogram', 'lights', 'pipes']) soloGameIds.add(id);
for (const id of ['teamcup', 'undercover', 'improv']) groupGameIds.add(id);
badges.push(
  [
    'architect',
    '💡',
    'مهندس الألغاز',
    'أكمل جولة في الألغاز الجديدة الثلاثة',
    () => ['lights', 'pipes', 'nonogram'].every((id) => store.extra.played[id] > 0),
  ],
  [
    'host',
    '🎉',
    'روح اللمّة',
    'جرّب ثلاث ألعاب جماعية جديدة',
    () => ['teamcup', 'undercover', 'improv'].every((id) => store.extra.played[id] > 0),
  ],
  [
    'traveler',
    '🗺️',
    'نهاية الطريق',
    'أكمل مساراً فردياً من ثلاث محطات',
    () => Object.keys(store.extra.experience?.completed || {}).length > 0,
  ],
);

function experience() {
  store.extra.experience ??= normalizeExperience(null);
  return store.extra.experience;
}
function gameLength(id) {
  if (['sudoku', 'nonogram', 'mines', 'slide'].includes(id)) return '10–20 دقيقة';
  if (['teamcup', 'undercover', 'improv', 'spy', 'taboo', 'mime', 'secret'].includes(id))
    return 'وقت اللمّة';
  if (['reaction', 'target', 'color', 'solo', 'finder'].includes(id)) return '1–3 دقائق';
  return '3–8 دقائق';
}
function gameMinimum(id) {
  return ['undercover', 'improv', 'spy'].includes(id) ? 3 : id === 'teamcup' ? 4 : 2;
}
const previousFilteredGames = filteredGames;
filteredGames = function () {
  const selectedFilter = filter;
  // The old predicate treats every non-solo value as group.
  if (selectedFilter === 'new') filter = 'all';
  let list;
  try {
    list = previousFilteredGames();
  } finally {
    filter = selectedFilter;
  }
  if (selectedFilter === 'new') list = list.filter((g) => freshGameIds.has(g[0]));
  const sorting = experience().sort;
  if (sorting === 'name') list.sort((a, b) => a[2].localeCompare(b[2], 'ar'));
  if (sorting === 'popular')
    list.sort((a, b) => (store.extra.played[b[0]] || 0) - (store.extra.played[a[0]] || 0));
  if (sorting === 'recent')
    list.sort(
      (a, b) =>
        (store.extra.recent.find((v) => v.id === b[0])?.at || 0) -
        (store.extra.recent.find((v) => v.id === a[0])?.at || 0),
    );
  if (sorting === 'recommended')
    list.sort((a, b) => Number(freshGameIds.has(b[0])) - Number(freshGameIds.has(a[0])));
  return list;
};
function setCatalogSort(value) {
  if (!['recommended', 'name', 'recent', 'popular'].includes(value)) return;
  experience().sort = value;
  save();
  renderCatalog();
}
function renderCatalog() {
  if (!$('catalog')) return;
  const focusedFavorite = document.activeElement?.matches('#catalog .fav')
    ? document.activeElement.dataset.game
    : null;
  const list = filteredGames();
  if ($('favcount')) $('favcount').textContent = store.extra.favorites.length;
  $('gamecount').textContent =
    `${list.length} من ${games.length} لعبة${onlyFavorites ? ' · مفضّلتك' : ''}`;
  $('catalog').innerHTML =
    list
      .map((g) => {
        const favorite = store.extra.favorites.includes(g[0]);
        return `<article class="gamecard" style="--tile:${g[5]}"><button class="fav ${favorite ? 'on' : ''}" data-game="${g[0]}" onclick="favorite('${g[0]}')" aria-label="${favorite ? 'إزالة' : 'إضافة'} ${esc(g[2])} ${favorite ? 'من' : 'إلى'} المفضّلة" aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button><button class="cardstart" onclick="setup('${g[0]}')"><div class="card-topline"><span class="tileicon" style="--tile:${g[5]}">${g[1]}</span>${freshGameIds.has(g[0]) ? '<span class="new-chip">جديد</span>' : ''}</div><h3>${esc(g[2])}</h3><p>${esc(g[3])}</p><div class="cardmeta"><span>${modeLabel(g[0])}</span>${store.extra.best[g[0]] ? `<small>★ ${fmt(store.extra.best[g[0]])}</small>` : ''}</div><div class="cardtime">◷ ${gameLength(g[0])}</div><span class="tagline">${store.extra.played[g[0]] ? store.extra.played[g[0]] + ' جولة' : 'اكتشف تحدّيك'}<b>العب الآن ←</b></span></button></article>`;
      })
      .join('') ||
    '<div class="emptylist"><span>🔎</span><h3>ما لقينا لعبة بهالاختيارات</h3><p>غيّر البحث أو العالم، ويمكن تلقى مفضّلتك الجديدة.</p><button class="primary" onclick="clearFilters()">كل الألعاب</button></div>';
  if (focusedFavorite) {
    const focus =
      $('catalog').querySelector(`.fav[data-game="${focusedFavorite}"]`) ||
      $('catalog').querySelector('.fav') ||
      $('search');
    focus?.focus({ preventScroll: true });
  }
}

function routeCardsHTML() {
  return `<section class="routes-section" aria-labelledby="routes-heading"><div class="sectionhead"><div><span class="world-label">بمفردك · 3 محطات لكل مسار</span><h2 id="routes-heading">تحدّيك ما يوقف عند لعبة.</h2></div><span class="routes-note">نتيجة واحدة، رحلة كاملة</span></div><div class="route-grid">${experienceRoutes.map((r) => `<button class="route-card" style="--route:${r.color}" onclick="openRoute('${r.id}')"><span class="route-icon">${r.icon}</span><div><small>${r.tag}</small><h3>${r.name}</h3><p>${r.desc}</p><div class="route-stops">${r.games.map((id) => `<span title="${esc(games.find((g) => g[0] === id)?.[2] || id)}">${games.find((g) => g[0] === id)?.[1] || '✦'}</span>`).join('<i>·</i>')}<b>${experience().completed[r.id] != null ? 'أفضل نتيجة ' + experience().completed[r.id] + ' / 300' : 'ابدأ الرحلة ←'}</b></div></div></button>`).join('')}</div></section>`;
}
function routeResumeHTML() {
  const saved = experience().route;
  const r = experienceRoutes.find((v) => v.id === saved?.id);
  return r
    ? `<div class="continue-route"><span>🗺️</span><div><b>مسار ${r.name} ينتظرك</b><small>أكملت ${saved.at} من 3 محطات · المحطة ${saved.at ? 'التالية' : 'الأولى'} تبدأ بجولة جديدة</small></div><button class="primary" onclick="continueRoute()">نكمل ←</button></div>`
    : '';
}
function chooseSoloLobby() {
  if (screen !== 'home') home();
  world = 'all';
  onlyFavorites = false;
  searchQuery = '';
  setFilter('solo');
  scrollCatalog();
}
function scrollCatalog() {
  $('gamesheading')?.scrollIntoView({
    behavior: store.extra.motion ? 'smooth' : 'instant',
    block: 'start',
  });
}
function openLounge() {
  const ids = [
    'teamcup',
    'undercover',
    'improv',
    'spy',
    'taboo',
    'mime',
    'secret',
    'reaction',
    'ttt',
    'connect',
    'memory',
  ];
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">👥 صالة اللمّة</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">العبوا على جهاز واحد، بالتناوب. ${store.players.length} لاعب جاهز: ${store.players.map(esc).join('، ')}.</p><div class="actions"><button onclick="openPeople()">إدارة اللاعبين</button><button class="primary" onclick="openTournament()">🏆 بطولة فردية بالتناوب</button></div><div class="lounge-random"><button onclick="closeModal();home();chooseRandomGame('duo')">🎲 اختار لنا لعبة شخصين</button><button onclick="closeModal();home();chooseRandomGame('group')">🎲 اختار لنا لعبة مجموعة</button></div><div class="lounge-games">${ids
      .map((id) => {
        const g = games.find((v) => v[0] === id);
        return g
          ? `<button onclick="setup('${id}')"><span>${g[1]}</span><div><b>${esc(g[2])}${freshGameIds.has(id) ? ' <small class="new-chip">جديد</small>' : ''}</b><small>${esc(g[3])}</small><em>${['ttt', 'connect', 'memory'].includes(id) ? 'شخصان · مواجهة على نفس الجهاز' : gameMinimum(id) + '–12 لاعب'}</em></div><span>←</span></button>`
          : '';
      })
      .join('')}</div>`,
  );
}
function openRoute(id) {
  const r = experienceRoutes.find((v) => v.id === id);
  if (!r) return;
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">${r.icon} ${r.name}</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">${r.desc} أكمل الألعاب الثلاث بالترتيب. نتيجة المسار حتى 300 نقطة، وتُحفظ أفضل نتيجة لك.</p><div class="route-map">${r.games
      .map((gid, i) => {
        const g = games.find((v) => v[0] === gid);
        return `<div><span>${i + 1}</span><b>${g[1]} ${g[2]}</b><small>${gameLength(gid)}</small></div>`;
      })
      .join(
        '',
      )}</div><div class="hintpanel">يمكنك تعديل إعدادات كل محطة قبل البدء. الرجوع للعالم يحفظ المحطات المكتملة؛ الجولة غير المكتملة تبدأ من جديد عند استكمال المسار.${experience().route ? ' بدء مسار جديد يستبدل المسار الجاري.' : ''}</div><div class="actions"><button class="primary" onclick="startRoute('${id}')">ابدأ المسار ←</button>${experience().route?.id === id ? '<button onclick="continueRoute()">استكمال المسار الجاري</button>' : ''}</div>`,
  );
}
function startRoute(id) {
  if (!experienceRoutes.some((v) => v.id === id)) return;
  experience().route = { id, at: 0, results: [] };
  save();
  continueRoute();
}
function continueRoute() {
  const saved = experience().route;
  const config = experienceRoutes.find((v) => v.id === saved?.id);
  if (!config) return;
  closeModal(true);
  activeRoute = { config, id: config.games[saved.at], at: saved.at, finished: false };
  setup(activeRoute.id, true);
  // Curated starting settings; players can still choose their own challenge.
  if ($('difficulty')) $('difficulty').value = '6';
  if ($('wordcount')) $('wordcount').value = '5';
  if ($('arcadeSize')) $('arcadeSize').value = '7';
  if ($('hangCount')) $('hangCount').value = '1';
  if ($('quizcount')) $('quizcount').value = '5';
}
const experienceSetup = setup;
setup = function (id, internal = false) {
  captureSoloSession();
  const previousState = state;
  const outcome = experienceSetup(id, internal);
  if (!internal && state !== previousState && screen === 'setup' && state?.id === id)
    activeRoute = null;
  return outcome;
};
const experienceHome = home;
home = function () {
  const outcome = experienceHome();
  activeRoute = null;
  return outcome;
};
const experienceCapture = captureSoloSession;
captureSoloSession = function () {
  if (activeRoute) return;
  return experienceCapture();
};
const experienceResume = resumeSavedGame;
resumeSavedGame = function () {
  activeRoute = null;
  return experienceResume();
};
const experienceWrap = wrap;
wrap = function (id, body) {
  if (activeRoute?.id === id && !activeRoute.finished) {
    const { config, at } = activeRoute;
    body = `<div class="journey-banner"><span>${config.icon} ${config.name}</span><div>${config.games.map((gid, i) => `<span class="${i < at ? 'complete' : i === at ? 'current' : ''}">${i < at ? '✓' : i + 1}</span>`).join('<i>—</i>')}</div><small>المحطة ${at + 1} / 3</small></div>${body}`;
  }
  return experienceWrap(id, body);
};
const experienceResult = result;
result = function (id, title, text, points = 0, detail = '') {
  if (state?.resultShown) return;
  const route = activeRoute;
  const linked = route && route.id === id && !route.finished && experience().route?.at === route.at;
  experienceResult(id, title, text, points, detail);
  if (!linked) return;
  route.finished = true;
  const saved = experience().route;
  saved.results.push({
    id,
    points: Number.isFinite(points) ? Math.max(0, Math.min(100, Math.round(points))) : 0,
  });
  saved.at++;
  const total = saved.results.reduce((n, v) => n + v.points, 0);
  const complete = saved.at === route.config.games.length;
  if (complete) {
    experience().completed[route.config.id] = Math.max(
      experience().completed[route.config.id] || 0,
      total,
    );
    experience().route = null;
    updateBadges();
  }
  save();
  $('app')
    .querySelector('.play')
    ?.insertAdjacentHTML(
      'beforeend',
      `<section class="route-result panel center"><span class="world-label">${complete ? '✦ وصلت لنهاية الطريق' : '✓ محطة مكتملة'}</span><h2>${complete ? 'أكملت ' + route.config.name : 'تحدّيك التالي ينتظرك'}</h2><p class="muted">${total} نقطة ${complete ? 'من 300 · أفضل نتيجة ' + experience().completed[route.config.id] : 'حتى الآن · باقي ' + (3 - saved.at) + ' محطات'}</p><div class="actions">${complete ? `<button class="primary" onclick="openRoute('${route.config.id}')">جرّب تحسين نتيجتك</button><button onclick="home()">اختر مساراً آخر</button>` : '<button class="primary" onclick="continueRoute()">المحطة التالية ←</button><button onclick="home()">نكمل لاحقاً</button>'}</div></section>`,
    );
};

document.addEventListener('keydown', (event) => {
  if (
    screen !== 'home' ||
    !$('modalback').hidden ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.repeat ||
    /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
  )
    return;
  if (event.key === '/') {
    event.preventDefault();
    $('search')?.focus();
  }
});

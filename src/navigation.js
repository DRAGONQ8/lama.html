// Keep a place in the catalogue, and choose games for the people actually playing.
let navigationHomePoint = null,
  navigationRestoreToken = 0,
  navigationHistoryHandling = false,
  navigationRandomOpening = false,
  navigationRandomMode = null,
  navigationPair = null;
const navigationRandomBags = new Map();
const navigationHasHome = () => !!$('catalog') && !!$('gamesheading');
function navigationDescribe(element) {
  if (!element?.isConnected || !document.querySelector('.shell')?.contains(element)) return null;
  return {
    id: element.id || '',
    scope: element.closest('#catalog') ? 'catalog' : 'shell',
    action: element.getAttribute('onclick') || '',
    label: element.getAttribute('aria-label') || '',
    selection: typeof element.selectionStart === 'number' ? element.selectionStart : null,
  };
}
function navigationFind(description) {
  if (!description) return null;
  if (description.id && $(description.id)) return $(description.id);
  const container =
    description.scope === 'catalog' ? $('catalog') : document.querySelector('.shell');
  return (
    [...(container?.querySelectorAll('button,a,input,select') || [])].find((element) =>
      description.action
        ? element.getAttribute('onclick') === description.action
        : description.label && element.getAttribute('aria-label') === description.label,
    ) || null
  );
}
function navigationCaptureHome() {
  if (!navigationHasHome()) return navigationHomePoint;
  const focused = document.querySelector('.shell')?.contains(document.activeElement)
      ? document.activeElement
      : previousFocus,
    cards = [...$('catalog').querySelectorAll('.cardstart')],
    selectedCard = focused?.closest?.('.gamecard')?.querySelector('.cardstart'),
    visible = cards.find((card) => {
      const box = card.getBoundingClientRect();
      return box.bottom > 90 && box.top < innerHeight - 80;
    }),
    focusedBox = focused?.getBoundingClientRect?.(),
    homeControl =
      focused?.closest?.('#app') && focusedBox?.bottom > 0 && focusedBox?.top < innerHeight
        ? focused
        : null,
    anchor = selectedCard?.getClientRects().length ? selectedCard : homeControl || visible;
  navigationHomePoint = {
    x: scrollX,
    y: scrollY,
    world,
    filter,
    searchQuery,
    onlyFavorites,
    sort: experience().sort,
    discoverOpen: document.querySelector('.discover-drawer')?.open === true,
    focus: navigationDescribe(focused),
    anchor: anchor ? navigationDescribe(anchor) : null,
    anchorTop: anchor?.getBoundingClientRect().top ?? null,
  };
  return navigationHomePoint;
}
function navigationCleanPoint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    x: Number.isFinite(raw.x) ? Math.max(0, raw.x) : 0,
    y: Number.isFinite(raw.y) ? Math.max(0, raw.y) : 0,
    world: worlds.some((entry) => entry[0] === raw.world) ? raw.world : 'all',
    filter: ['all', 'solo', 'duo', 'group', 'new'].includes(raw.filter) ? raw.filter : 'all',
    searchQuery: typeof raw.searchQuery === 'string' ? raw.searchQuery.slice(0, 2000) : '',
    onlyFavorites: raw.onlyFavorites === true,
    sort: ['recommended', 'name', 'recent', 'popular'].includes(raw.sort)
      ? raw.sort
      : 'recommended',
    discoverOpen: raw.discoverOpen === true,
    focus: raw.focus && typeof raw.focus === 'object' ? raw.focus : null,
    anchor: raw.anchor && typeof raw.anchor === 'object' ? raw.anchor : null,
    anchorTop: Number.isFinite(raw.anchorTop) ? raw.anchorTop : null,
  };
}
function navigationApplyFilters(point) {
  world = point.world;
  filter = point.filter;
  searchQuery = point.searchQuery;
  onlyFavorites = point.onlyFavorites;
  experience().sort = point.sort;
}
function navigationRestoreHome(point) {
  if (!point || screen !== 'home' || !navigationHasHome()) return;
  const discovery = document.querySelector('.discover-drawer');
  if (discovery) discovery.open = point.discoverOpen === true;
  const token = ++navigationRestoreToken,
    content = $('catalog');
  const restore = () => {
    if (token !== navigationRestoreToken || screen !== 'home' || $('catalog') !== content) return;
    const anchor = navigationFind(point.anchor),
      top =
        anchor?.getClientRects().length && point.anchorTop !== null
          ? scrollY + anchor.getBoundingClientRect().top - point.anchorTop
          : point.y;
    window.scrollTo({ left: point.x, top: Math.max(0, top), behavior: 'instant' });
  };
  restore();
  const focused =
    navigationFind(point.focus) || navigationFind(point.anchor) || $('search') || $('app');
  if (!focused.disabled && focused.getClientRects().length) {
    focused.focus({ preventScroll: true });
    if (
      typeof point.focus?.selection === 'number' &&
      typeof focused.setSelectionRange === 'function'
    ) {
      try {
        focused.setSelectionRange(point.focus.selection, point.focus.selection);
      } catch (e) {}
    }
  }
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}
function navigationHistory(view, id = null, push = false) {
  if (navigationHistoryHandling) return;
  try {
    const data = {
      ...(history.state && typeof history.state === 'object' ? history.state : {}),
      lammaView: { version: 1, view, id, mode: navigationRandomMode, home: navigationHomePoint },
    };
    history[push ? 'pushState' : 'replaceState'](data, '', location.href);
  } catch (e) {}
}
function navigationRecordPlay(id, departed) {
  if (!games.some((game) => game[0] === id)) return;
  const push = departed && history.state?.lammaView?.view !== 'play';
  navigationHistory('play', id, push);
}
const navigationSetHTML = setHTML;
setHTML = function (html) {
  const departed = navigationHasHome() && screen !== 'home';
  if (departed && !navigationHistoryHandling) {
    navigationCaptureHome();
    navigationHistory('home');
  }
  navigationRestoreToken++;
  const outcome = navigationSetHTML(html);
  if (screen !== 'home')
    navigationRecordPlay(
      state?.id || document.querySelector('.play[data-game]')?.dataset.game,
      departed,
    );
  return outcome;
};
const navigationSetup = setup;
setup = function (id, internal = false) {
  if (!navigationRandomOpening) {
    navigationRandomMode = null;
    navigationPair = null;
  }
  if (screen === 'home' && !navigationHistoryHandling) navigationCaptureHome();
  return navigationSetup(id, internal);
};
const navigationHome = home;
home = function (options = {}) {
  const top = options === 'top' || options?.top === true;
  if (navigationHasHome() && !navigationHistoryHandling) navigationCaptureHome();
  const point = top ? null : navigationHomePoint;
  navigationRestoreToken++;
  navigationRandomMode = null;
  navigationPair = null;
  if (point) navigationApplyFilters(point);
  const outcome = navigationHome();
  if (point) navigationRestoreHome(point);
  if (top) navigationHomePoint = null;
  navigationHistory('home');
  return outcome;
};
try {
  history.scrollRestoration = 'manual';
} catch (e) {}
window.addEventListener('popstate', (event) => {
  const target = event.state?.lammaView;
  if (target?.version !== 1 || !['home', 'play'].includes(target.view)) return;
  navigationRestoreToken++;
  navigationHomePoint = navigationCleanPoint(target.home);
  navigationHistoryHandling = true;
  try {
    if (target.view === 'home') home();
    else if (games.some((game) => game[0] === target.id)) {
      closeModal(true);
      setup(target.id);
      if (
        screen === 'setup' &&
        state?.id === target.id &&
        ['solo', 'duo', 'group'].includes(target.mode)
      )
        navigationConfigureRandom(target.id, target.mode);
    }
  } finally {
    navigationHistoryHandling = false;
  }
});
for (const type of ['wheel', 'touchstart', 'pointerdown'])
  document.addEventListener(
    type,
    () => {
      if (screen === 'home') navigationRestoreToken++;
    },
    { passive: true, capture: true },
  );

function randomGameChoices(mode) {
  const count = store.players.length;
  if (
    !['solo', 'duo', 'group'].includes(mode) ||
    (mode === 'duo' && count < 2) ||
    (mode === 'group' && count < 3)
  )
    return [];
  return games
    .filter((game) => {
      const id = game[0];
      if (mode === 'solo') return soloGameIds.has(id);
      if (mode === 'duo') return duoGameIds.has(id);
      return (
        ['mime', 'secret', 'taboo', 'reaction', 'spy', 'teamcup', 'undercover', 'improv'].includes(
          id,
        ) && count >= (id === 'teamcup' ? 4 : ['spy', 'undercover', 'improv'].includes(id) ? 3 : 2)
      );
    })
    .map((game) => game[0]);
}
function navigationRandomCandidate(mode, eligible) {
  let bag = navigationRandomBags.get(mode);
  if (!bag) {
    bag = { seen: new Set(), remaining: [], last: null };
    navigationRandomBags.set(mode, bag);
  }
  bag.seen = new Set([...bag.seen].filter((id) => eligible.includes(id)));
  bag.remaining = bag.remaining.filter((id) => eligible.includes(id) && !bag.seen.has(id));
  const additions = eligible.filter((id) => !bag.seen.has(id) && !bag.remaining.includes(id));
  if (additions.length) bag.remaining.push(...shuffle(additions));
  if (!bag.remaining.length) {
    bag.seen.clear();
    bag.remaining = shuffle(eligible);
  }
  if (bag.remaining.length > 1 && bag.remaining.at(-1) === bag.last)
    [bag.remaining[0], bag.remaining[bag.remaining.length - 1]] = [
      bag.remaining.at(-1),
      bag.remaining[0],
    ];
  return { bag, id: bag.remaining.at(-1) };
}
function navigationPairHTML() {
  if (!navigationPair) return '';
  const options = (selected) =>
    store.players
      .map(
        (name) =>
          `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`,
      )
      .join('');
  return `<section class="random-pair panel" aria-labelledby="randomPairHeading"><h3 id="randomPairHeading">⚔ اللاعبان لهذه الجولة</h3><p class="note">اختاروا شخصين من الأسماء المسجّلة. بقية اللاعبين ما يدخلون هذه الجولة.</p><div class="fields"><div class="field"><label for="randomPairFirst">اللاعب الأول</label><select id="randomPairFirst" onchange="updateRandomDuoPlayers()">${options(navigationPair.names[0])}</select></div><div class="field"><label for="randomPairSecond">اللاعب الثاني</label><select id="randomPairSecond" onchange="updateRandomDuoPlayers()">${options(navigationPair.names[1])}</select></div></div><p id="randomPairStatus" class="note" role="status"></p><button class="linkbtn" onclick="refreshRandomDuoPlayers()">حدّث الأسماء المسجّلة ↺</button></section>`;
}
function navigationShowPair() {
  const play = $('app').querySelector('.play'),
    firstPanel = play?.querySelector('.panel');
  if (firstPanel) firstPanel.insertAdjacentHTML('beforebegin', navigationPairHTML());
  else play?.insertAdjacentHTML('beforeend', navigationPairHTML());
}
function updateRandomDuoPlayers() {
  if (screen !== 'setup' || !navigationPair || state?.id !== navigationPair.id || coreBlocked())
    return;
  navigationPair.names = [$('randomPairFirst')?.value || '', $('randomPairSecond')?.value || ''];
  const valid = selectedGameParticipants(navigationPair.id)?.length === 2;
  if ($('randomPairStatus'))
    $('randomPairStatus').textContent = valid
      ? `${navigationPair.names.join(' و ')} · جولة لشخصين`
      : 'اختاروا اسمين مختلفين من القائمة الحالية.';
}
function refreshRandomDuoPlayers() {
  if (screen !== 'setup' || !navigationPair || state?.id !== navigationPair.id || coreBlocked())
    return;
  const old = navigationPair.names;
  navigationPair.names = [old[0], old[1]].filter((name) => store.players.includes(name));
  for (const name of store.players)
    if (navigationPair.names.length < 2 && !navigationPair.names.includes(name))
      navigationPair.names.push(name);
  document.querySelector('.random-pair')?.remove();
  navigationShowPair();
  updateRandomDuoPlayers();
}
function selectedGameParticipants(id) {
  if (!navigationPair || navigationPair.id !== id || state?.id !== id) return null;
  const names =
    $('randomPairFirst') && $('randomPairSecond')
      ? [$('randomPairFirst').value, $('randomPairSecond').value]
      : navigationPair.names;
  if (
    names.length !== 2 ||
    names[0] === names[1] ||
    names.some((name) => !store.players.includes(name))
  )
    return [];
  navigationPair.names = [...names];
  return [...names];
}
function navigationConfigureRandom(id, mode) {
  navigationRandomMode = mode;
  navigationPair = null;
  if (['ttt', 'connect'].includes(id) && $('opponent')) {
    $('opponent').value = mode === 'solo' ? 'bot' : 'friend';
    opponentChanged();
    if (mode === 'duo' && $('second') && $('player') && $('second').value === $('player').value)
      $('second').value =
        [...$('second').options].find((option) => option.value !== $('player').value)?.value || '';
  }
  if (id === 'memory' && $('memoryplay')) {
    $('memoryplay').value = mode === 'duo' ? 'duo' : 'solo';
    memoryPlayChanged();
    if (
      mode === 'duo' &&
      $('memorysecond') &&
      $('player') &&
      $('memorysecond').value === $('player').value
    )
      $('memorysecond').value =
        [...$('memorysecond').options].find((option) => option.value !== $('player').value)
          ?.value || '';
  }
  if (id === 'reaction' && $('group')) $('group').checked = mode !== 'solo';
  if (mode === 'duo' && ['mime', 'secret', 'taboo', 'reaction'].includes(id)) {
    navigationPair = { id, names: store.players.slice(0, 2) };
    navigationShowPair();
    updateRandomDuoPlayers();
  }
  navigationRecordPlay(id, false);
}
function chooseRandomGame(mode) {
  const origin = window.event?.currentTarget;
  if (screen !== 'home' || coreBlocked() || (origin instanceof Element && !origin.isConnected))
    return null;
  if (!['solo', 'duo', 'group'].includes(mode)) return null;
  const eligible = randomGameChoices(mode);
  if (!eligible.length) {
    toast(
      mode === 'duo'
        ? 'أضيفوا لاعبين على الأقل للاختيار العشوائي.'
        : 'أضيفوا 3 لاعبين على الأقل للاختيار الجماعي.',
    );
    if (mode !== 'solo') openPeople();
    return null;
  }
  const { bag, id } = navigationRandomCandidate(mode, eligible);
  navigationRandomOpening = true;
  navigationRandomMode = mode;
  navigationPair = null;
  try {
    setup(id);
  } finally {
    navigationRandomOpening = false;
  }
  if (screen !== 'setup' || state?.id !== id) return null;
  navigationConfigureRandom(id, mode);
  bag.remaining = bag.remaining.filter((value) => value !== id);
  bag.seen.add(id);
  bag.last = id;
  const heading = $('app').querySelector('.playhead h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  return id;
}
function randomPickButtonsHTML() {
  return `<section class="random-launches" aria-label="اختيار لعبة عشوائية"><button onclick="chooseRandomGame('solo')"><span aria-hidden="true">🎲</span><b>عشوائي بمفردك</b><small>تحدٍّ مناسب لك</small></button><button onclick="chooseRandomGame('duo')"><span aria-hidden="true">⚔</span><b>عشوائي لشخصين</b><small>نختار لكم مواجهة</small></button><button onclick="chooseRandomGame('group')"><span aria-hidden="true">🎭</span><b>عشوائي للمجموعة</b><small>3 لاعبين أو أكثر</small></button></section>`;
}

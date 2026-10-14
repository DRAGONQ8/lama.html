// Four offline arcade games. Each round owns its state and tracked timers.
const arcadeIDs = new Set(['snake', 'merge', 'mines', 'maze']);
games.push(
  [
    'snake',
    '🐍',
    'الثعبان',
    'اندفاع وتدريب آمن أو طلبات بستان: اجمع الفاكهة المطلوبة وأوصلها.',
    'بروحك',
    '#a7edbf',
  ],
  [
    'merge',
    '🧱',
    'دمج 2048',
    'خطط للدمج أو اكسر صناديق الورشة. لوحات 4×4 و5×5 مع تراجع عادل.',
    'بروحك',
    '#ffd59c',
  ],
  [
    'mines',
    '💣',
    'كاسحة الألغام',
    'نظّف الحقل أو انطلق في بعثة آثار مع جهاز مسح. أول ضغطة وجيرانها آمنون.',
    'بروحك',
    '#c8bcff',
  ],
  [
    'maze',
    '🧭',
    'المتاهة',
    'رحلات نجوم ومفاتيح أو توصيل طرود. اكتشف الممرات وعد إلى القاعدة.',
    'بروحك',
    '#9fe1f5',
  ],
);
for (const id of arcadeIDs) gameWorld[id] = 'brain';
const arcadePreviousSetup = setup;
setup = function (id, internal = false) {
  if (!arcadeIDs.has(id)) return arcadePreviousSetup(id, internal);
  if (!internal) {
    tourney = null;
    dailyRun = null;
  }
  clearTimers();
  removePause();
  closeModal(true);
  recordRecent(id);
  screen = 'setup';
  state = { id };
  let body = '';
  if (id === 'snake')
    body = `<p class="muted">حرّك الثعبان واجمع الفاكهة بدون الاصطدام بنفسك. في الوضع الكلاسيكي يجب أيضاً تجنّب الحواف. تقدر تتحكم بالأسهم أو WASD أو السحب على اللوحة.</p><div class="fields"><div class="field"><label for="arcadeSpeed">سرعة اللعب المباشر</label><select id="arcadeSpeed"><option value="240">هادئة</option><option value="150" selected>متوسطة</option><option value="90">سريعة</option></select></div><div class="field"><label for="arcadeMode">العالم</label><select id="arcadeMode"><option value="classic">كلاسيكي · تجنّب الحواف</option><option value="wrap">بوابات · اعبر الحواف</option><option value="rocks">تحدّي الصخور</option></select></div><div class="field full"><label for="arcadePace">تطور التحدّي</label><select id="arcadePace"><option value="progressive">تصاعدي · تزيد السرعة كل 5 فواكه</option><option value="steady">ثابت · نفس السرعة طوال الجولة</option></select></div>${playerField()}</div><div class="hintpanel">كل فاكهة تزيد طولك ونقاطك. تقدر تختار منعطفين متتاليين بسرعة؛ الثعبان ينفّذهما بالترتيب. تبدأ الحركة لما تكون جاهز، وزر الإيقاف يحفظ الجولة أثناء الاستراحة.</div>`;
  if (id === 'merge')
    body = `<p class="muted">حرّك جميع القطع في اتجاه واحد. كل قطعتين متساويتين تندمجان مرة واحدة في الحركة. اختر هدفك، ثم واصل إلى أرقام أكبر إذا أردت.</p><div class="fields"><div class="field full"><label for="arcadeGoal">هدف الجولة</label><select id="arcadeGoal"><option value="1024">بداية سهلة · 1024</option><option value="2048" selected>التحدّي الكلاسيكي · 2048</option><option value="4096">تحدّي الخبراء · 4096</option></select></div>${playerField()}</div><div class="hintpanel">لوحة المفاتيح، أزرار الاتجاهات، أو السحب. تستطيع التراجع حتى 5 حركات، حتى لو امتلأت اللوحة. الحركة التي لا تغيّر اللوحة لا تضيف قطعة. حاول إبقاء أكبر قطعة في زاوية.</div>`;
  if (id === 'mines')
    body = `<p class="muted">الأرقام تبيّن عدد الألغام في الخانات الثماني المحيطة. اكشف جميع الخانات الآمنة لتفوز. أول خانة وجميع الخانات المحيطة بها خالية من الألغام.</p><div class="fields"><div class="field full"><label for="arcadeSize">حجم الحقل</label><select id="arcadeSize"><option value="8">صغير · 8×8 · 10 ألغام</option><option value="12">متوسط · 12×12 · 24 لغماً</option><option value="16">كبير · 16×16 · 48 لغماً</option></select></div>${playerField()}</div><div class="hintpanel">في الهاتف بدّل بين وضع الكشف والأعلام. بزر الفأرة الأيمن تضع علماً. اضغط الرقم المكشوف لفتح جيرانه إذا وضعت العدد الصحيح من الأعلام.</div>`;
  if (id === 'maze')
    body = `<p class="muted">متاهة عشوائية متصلة ولها حل دائماً. تحرك بالأسهم أو WASD أو السحب أو أزرار الاتجاهات. اجمع النجوم ثم ادخل البوابة الخضراء.</p><div class="fields"><div class="field"><label for="arcadeSize">حجم المتاهة</label><select id="arcadeSize"><option value="7">صغيرة · 15×15</option><option value="10" selected>متوسطة · 21×21</option><option value="15">كبيرة · 31×31</option></select></div><div class="field"><label for="arcadeMode">نوع الرحلة</label><select id="arcadeMode"><option value="stars">استكشاف وجمع النجوم</option><option value="exit">الوصول إلى المخرج فقط</option></select></div><div class="field full"><label for="arcadeTravel">طريقة التحرك</label><select id="arcadeTravel"><option value="step">خطوة بخطوة</option><option value="corridor">حتى التقاطع · أسهل للمس</option></select></div>${playerField()}</div><div class="hintpanel">في وضع التقاطع تكمل الممر تلقائياً وتتوقف عند النجوم والمنعطفات التي تحتاج اختيارك. Shift مع الاتجاه يفعل ذلك أيضاً. المسار الأقصر يعطيك نقاطاً أكثر؛ لديك 3 تلميحات، وكل تلميح يخصم 8 نقاط.</div>`;
  if (id === 'snake')
    body +=
      '<div class="hintpanel">اندفاع جديد: اضغط باستمرار على زر الاندفاع أو Shift لزيادة السرعة. الطاقة محدودة وتتجدد أثناء الحركة العادية. في التدريب تستطيع إظهار اتجاهات الخطوة الآمنة.</div>';
  if (id === 'merge')
    body +=
      '<div class="field arcade-extra-field"><label for="arcadeBoardSize">مساحة اللعب</label><select id="arcadeBoardSize"><option value="4">الكلاسيكية · 4×4</option><option value="5">لوحة واسعة · 5×5</option></select><p class="note">اللوحة الواسعة تتيح تخطيطاً أطول، ونتيجتها حتى 75 نقطة. التراجع يعيد تسلسل القطع نفسه؛ لا يغيّر الحظ.</p></div>';
  if (id === 'mines')
    body +=
      '<div class="field arcade-extra-field"><label for="arcadeSafety">فتح جيران الرقم</label><select id="arcadeSafety"><option value="direct">مباشر بعد وضع عدد الأعلام المطلوب</option><option value="confirm">معاينة ثم تأكيد · يساعد على تجنّب اللمسات العارضة</option></select><p class="note">علامة ؟ لتدوين الشك، ولا تحمي الخانة من الكشف. كبّر الحقل على الهاتف ثم مرّره داخل اللوحة.</p></div>';
  if (id === 'maze') {
    body = body.replace(
      '<option value="exit">',
      '<option value="keys">رحلة المفاتيح والبوابات</option><option value="exit">',
    );
    body +=
      '<div class="field arcade-extra-field"><label for="arcadeVision">رؤية المتاهة</label><select id="arcadeVision"><option value="map">الخريطة كاملة</option><option value="lantern">رحلة المصباح · اكتشف الخريطة تدريجياً</option></select><p class="note">ضع علامات عند التقاطعات لتتذكر طريقك. رحلة المفاتيح تضيف بوابتين: لكل بوابة مفتاح يمكن الوصول إليه قبل فتحها.</p></div>';
    body = body.replace(
      '<option value="exit">',
      '<option value="courier">ساعي المتاهة · 3 طرود والعودة للقاعدة</option><option value="exit">',
    );
  }
  const missionSetup = {
    snake: [
      'courier',
      'طلبات البستان · 3 توصيلات',
      'خذ الفاكهة المطلوبة من بين ثلاثة أنواع، ثم أوصلها للمستودع. حمل الطلب يضاعف استهلاك طاقة الاندفاع. كل اختيار زائد يخصم 5 نقاط؛ الجولة حتى 80 نقطة، والتدريب حتى 50.',
    ],
    merge: [
      'workshop',
      'ورشة الدمج · صناديق وهدف 256',
      'الصناديق ثابتة وتفصل الصفوف. كل دمج بجوار صندوق يكسر طبقة منه؛ للصندوق طبقتان. اكسرها كلها وابنِ 256 خلال 60 حركة (80 للوحة الواسعة). المهمة حتى 80 نقطة، والواسعة حتى 75؛ التراجع يعيد الصناديق والقطع.',
    ],
    mines: [
      'survey',
      'بعثة التنقيب · 4 قطع أثرية',
      'ابحث عن قطعة أثرية في كل ربع من الحقل؛ تظهر بعد كشف خانتها الآمنة. لديك 3 مسحات للمكان المحدد تكشف عدد القطع القريبة ولا تكشف الألغام، وكل مسحة تخصم 6 نقاط. بعد جمع الأربع اختر الانسحاب حتى 60/80/90 نقطة حسب الحجم، أو نظّف الحقل كله لتحصل على نتيجته المعتادة.',
    ],
  };
  if (missionSetup[id]) {
    const [value, label, description] = missionSetup[id];
    body += `<div class="field arcade-extra-field"><label for="arcadeMission">نوع التحدّي</label><select id="arcadeMission"><option value="classic">الجولة الكلاسيكية</option><option value="${value}">${label}</option></select><p class="note">${description}</p></div>`;
  }
  setHTML(
    wrap(
      id,
      `<section class="panel">${body}${id === 'snake' ? '<div class="field arcade-extra-field"><label for="arcadeDrive">أسلوب اللعب</label><select id="arcadeDrive"><option value="live">مباشر · الثعبان يتحرك باستمرار</option><option value="step">تدريب · خطوة مع كل ضغطة</option></select><p class="note">التدريب يتيح التفكير قبل كل خطوة: نقطتان لكل فاكهة، حتى 50 نقطة. السرعة تؤثر في اللعب المباشر فقط.</p></div>' : id === 'merge' ? '<div class="hintpanel">جديد: عاين أثر أي اتجاه قبل تحريكه. المعاينة لا تولّد قطعة ولا تستهلك تراجعاً.</div>' : id === 'mines' ? '<div class="hintpanel">المساعد المنطقي يشرح خانة مضمونة باستخدام الأرقام المكشوفة فقط. لديك 3 مساعدات؛ كل استنتاج ناجح يخصم 8 نقاط.</div>' : '<div class="hintpanel">المس خانة مجاورة للتحرك إليها، أو اختر نجمة على اللوحة لتوجيه أحد تلميحاتك إليها.</div>'}<div class="actions"><button class="primary" onclick="startArcade('${id}')">ابدأ التحدّي ←</button></div></section>`,
    ),
  );
  goTop();
};
function arcadeReady(id) {
  return (
    screen === id &&
    state?.id === id &&
    !state.done &&
    !state.ending &&
    !state.pausedAt &&
    $('modalback').hidden &&
    !$('pausecover')
  );
}
function arcadeSeconds(s = state) {
  return Math.max(0, Math.floor(((s.pausedAt || Date.now()) - s.started) / 1000));
}
function arcadeTimeText(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
// A round owns its random stream so timers and other games cannot alter its field.
function arcadeRand(n, s = state) {
  return s?.arcadeRandom ? Math.floor(s.arcadeRandom() * n) : randInt(n);
}
function arcadeShuffle(values, s = state) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = arcadeRand(i + 1, s);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function arcadeClock(s) {
  repeat(() => {
    if (state !== s || s.done || s.pausedAt) return;
    const el = $('arcadeTime');
    if (el)
      el.textContent = arcadeTimeText(
        (s.id === 'mines' && !s.clockRunning) || (s.id === 'snake' && !s.running)
          ? 0
          : arcadeSeconds(s),
      );
  }, 250);
}
function arcadeDirections(fn) {
  return `<div class="arcade-directions" aria-label="أزرار الاتجاهات"><button class="dir-up" onclick="${fn}('up')" aria-label="أعلى">↑</button><button class="dir-left" onclick="${fn}('left')" aria-label="يسار">←</button><button class="dir-down" onclick="${fn}('down')" aria-label="أسفل">↓</button><button class="dir-right" onclick="${fn}('right')" aria-label="يمين">→</button></div>`;
}
function arcadeToolbar(id) {
  return `<div class="actions"><button onclick="showPause()">⏸ استراحة</button><button class="quiet" onclick="setup('${id}')">جولة جديدة</button></div>`;
}
function arcadeReview(title, body) {
  $('app')
    .querySelector('.play')
    ?.insertAdjacentHTML(
      'beforeend',
      `<section class="panel arcade-panel arcade-review"><h3>${title}</h3>${body}</section>`,
    );
}
function arcadeCanvasSnapshot(id, label) {
  const canvas = $(id);
  return canvas ? `<img class="arcade-snapshot" src="${canvas.toDataURL()}" alt="${label}">` : '';
}
function arcadeSwipe(el, move, { single = false, tap = null } = {}) {
  let point = null;
  el.addEventListener('pointerdown', (e) => {
    if (point || !e.isPrimary || e.button !== 0) return;
    point = { x: e.clientX, y: e.clientY, id: e.pointerId };
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!point || e.pointerId !== point.id || point.moved) return;
    const dx = e.clientX - point.x,
      dy = e.clientY - point.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    point = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: single, swiped: true };
  });
  const stop = (e) => {
    if (e.pointerId !== point?.id) return;
    const swiped = point.swiped;
    point = null;
    if (!swiped && e.type === 'pointerup') tap?.(e);
  };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('lostpointercapture', stop);
}
function startArcade(id) {
  if (screen !== 'setup' || state?.id !== id || !arcadeIDs.has(id) || coreBlocked()) return;
  const options = {
    speed: Number($('arcadeSpeed')?.value || 150),
    size: Number($('arcadeSize')?.value || 7),
    mode: $('arcadeMode')?.value || 'classic',
    pace: $('arcadePace')?.value || 'progressive',
    goal: Number($('arcadeGoal')?.value || 2048),
    travel: $('arcadeTravel')?.value || 'step',
    drive: $('arcadeDrive')?.value || 'live',
    boardSize: Number($('arcadeBoardSize')?.value || 4),
    safety: $('arcadeSafety')?.value || 'direct',
    vision: $('arcadeVision')?.value || 'map',
    mission: $('arcadeMission')?.value || 'classic',
  };
  const fixed = !!(dailyRun || tourney?.active);
  if (fixed)
    Object.assign(options, {
      speed: 150,
      size: id === 'mines' ? 8 : id === 'maze' ? 10 : 7,
      mode: id === 'maze' ? 'stars' : 'classic',
      pace: 'progressive',
      goal: 2048,
      travel: 'step',
      drive: 'live',
      boardSize: 4,
      safety: 'direct',
      vision: 'map',
      mission: 'classic',
    });
  const name = player();
  clearTimers();
  screen = id;
  state = {
    id,
    name,
    done: false,
    started: Date.now(),
    ...options,
    fixed,
    arcadeRandom: dailyRun
      ? makeSeed(dailyRun.date + ':' + id)
      : tourney?.active
        ? makeSeed(tourney.seed + ':' + id)
        : null,
  };
  if (id === 'snake') startSnake();
  else if (id === 'merge') startMerge();
  else if (id === 'mines') startMines();
  else startMaze();
  goTop();
}

// Snake buffers two deliberate turns, validating each against the preceding direction.
const arcadeDelta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function startSnake() {
  const s = state;
  s.width = 20;
  s.snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  s.direction = 'right';
  s.nextDirection = 'right';
  s.turnQueue = [];
  s.queued = false;
  s.level = 1;
  s.stepMs = s.speed;
  s.fruitCount = 0;
  s.steps = 0;
  s.turns = 0;
  s.energy = 100;
  s.boosting = false;
  s.boostSteps = 0;
  s.safePreview = false;
  s.deliveryDepot = { x: 2, y: 2 };
  s.deliveryOrders = s.mission === 'courier' ? arcadeShuffle([0, 1, 2]) : [];
  s.deliveries = 0;
  s.cargoKind = null;
  s.wrongPickups = 0;
  s.foods = [];
  s.drive = s.drive === 'step' ? 'step' : 'live';
  s.running = false;
  s.rocks = [];
  if (s.mode === 'rocks')
    for (const p of arcadeShuffle(
      Array.from({ length: 400 }, (_, i) => ({ x: i % 20, y: Math.floor(i / 20) })),
    ).filter(
      (p) =>
        p.x > 0 &&
        p.y > 0 &&
        p.x < 19 &&
        p.y < 19 &&
        Math.abs(p.x - 5) + Math.abs(p.y - 10) > 5 &&
        (s.mission !== 'courier' || p.x !== s.deliveryDepot.x || p.y !== s.deliveryDepot.y),
    )) {
      if (s.rocks.length === 18) break;
      if (s.rocks.every((q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) > 2)) s.rocks.push(p);
    }
  snakeFruit();
  renderSnake();
  arcadeClock(s);
  repeat(() => {
    if (state !== s || s.done) return;
    if (s.pausedAt || !s.running || s.drive === 'step') {
      if (s.boosting && s.pausedAt) snakeBoost(false);
      s.nextStep = Date.now() + s.stepMs;
      return;
    }
    if (Date.now() >= s.nextStep) {
      snakeStep();
      s.lastStepAt = Date.now();
      s.nextStep = s.lastStepAt + snakeInterval(s);
    }
  }, 20);
}
function snakeFruit() {
  const s = state,
    used = new Set([...s.snake, ...s.rocks].map((p) => p.y * s.width + p.x)),
    rocks = new Set(s.rocks.map((p) => p.y * s.width + p.x)),
    reachable = new Set([s.snake[0].y * s.width + s.snake[0].x]),
    queue = [...reachable],
    free = [];
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    for (const [dx, dy] of Object.values(arcadeDelta)) {
      let x = (i % s.width) + dx,
        y = Math.floor(i / s.width) + dy;
      if (s.mode === 'wrap') {
        x = (x + s.width) % s.width;
        y = (y + s.width) % s.width;
      }
      const next = y * s.width + x;
      if (x < 0 || y < 0 || x >= s.width || y >= s.width || rocks.has(next) || reachable.has(next))
        continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  for (let i = 0; i < s.width * s.width; i++) if (!used.has(i) && reachable.has(i)) free.push(i);
  if (s.mission === 'courier') {
    const choices = arcadeShuffle(
      free.filter((i) => i !== s.deliveryDepot.y * s.width + s.deliveryDepot.x),
    );
    if (choices.length < 3) return false;
    s.foods = [0, 1, 2].map((kind, k) => ({
      kind,
      x: choices[k] % s.width,
      y: Math.floor(choices[k] / s.width),
    }));
    s.fruit = s.foods.find((food) => food.kind === s.deliveryOrders[s.deliveries]);
    return true;
  }
  if (!free.length) {
    s.fruit = null;
    return false;
  }
  const i = free[arcadeRand(free.length)];
  s.fruit = { x: i % s.width, y: Math.floor(i / s.width) };
  return true;
}
function renderSnake() {
  const s = state;
  setHTML(
    wrap(
      'snake',
      smallStats([
        ['الفاكهة', s.fruitCount, 'snakeFruitCount'],
        ['الطول', s.snake.length, 'snakeLength'],
        ['الوقت', '0:00', 'arcadeTime'],
      ]) +
        `<section class="panel arcade-panel"><div class="arcade-stage"><canvas id="snakeCanvas" width="600" height="600" role="img" aria-label="لوحة الثعبان. استخدم الأسهم أو الأزرار للتحرك."></canvas>${!s.running ? `<div class="arcade-overlay" id="snakeStart"><div><span class="arcade-big-icon">🐍</span><h3>${s.drive === 'step' ? 'خطط قبل كل خطوة' : 'جاهز للانطلاق؟'}</h3><p>${s.drive === 'step' ? 'الثعبان ينتظر ضغطتك. اختر اتجاهاً لتتحرك خانة واحدة.' : 'اتجه نحو الفاكهة وابتعد عن جسمك.'}</p><button class="primary" onclick="snakeBegin()">${s.drive === 'step' ? 'ابدأ التدريب' : 'ابدأ الحركة'}</button></div></div>` : ''}</div><div class="arcade-status" id="snakeStatus" role="status">${s.drive === 'step' ? 'تدريب خطوة بخطوة · نقطتان لكل فاكهة · يمكنك تكرار الاتجاه نفسه.' : s.pace === 'steady' ? 'سرعة ثابتة طوال الجولة.' : 'المستوى 1 · تزيد السرعة بعد 5 فواكه.'}</div>${arcadeDirections('snakeTurn')}<p class="note center">${s.mode === 'wrap' ? 'البوابات مفتوحة: تعبر إلى الجهة المقابلة.' : s.mode === 'rocks' ? 'احذر الصخور والحواف.' : 'احذر الحواف.'} · الأسهم أو WASD · Space للإيقاف</p><div class="actions"><button onclick="showPause()">⏸ استراحة</button><button onclick="snakeEnd('حفظت جولتك 🐍')">احفظ نتيجتي</button><button class="quiet" onclick="setup('snake')">جولة جديدة</button></div></section>`,
    ),
  );
  snakeDraw();
  arcadeSwipe($('snakeCanvas'), snakeTurn);
  if (s.mission === 'courier') {
    document
      .querySelector('.arcade-panel')
      .insertAdjacentHTML(
        'afterbegin',
        '<div id="snakeMissionPanel" class="arcade-mission" role="status"></div>',
      );
    snakeCourierUI();
    $('snakeCanvas').setAttribute(
      'aria-label',
      'طلبات البستان: أنت الثعبان. التفاح رقم 1 والتوت رقم 2 والبرتقال رقم 3. المستودع الأزرق في أعلى اليسار. اختر النوع المطلوب ثم أوصله للمستودع.',
    );
  }
  $('snakeStatus').insertAdjacentHTML(
    'afterend',
    s.drive === 'step'
      ? '<div class="actions"><button id="snakePreviewButton" onclick="snakePreview()" aria-pressed="false">◉ اتجاهات الخطوة الآمنة</button></div><p id="snakeForecast" class="note center" role="status"></p>'
      : '<div class="snake-engine"><label for="snakeEnergy">طاقة الاندفاع <span id="snakeEnergyLabel">100٪</span></label><progress id="snakeEnergy" max="100" value="100"></progress><button id="snakeBoostButton" onpointerdown="snakeBoost(true,event)" onpointerup="snakeBoost(false,event)" onpointercancel="snakeBoost(false,event)" onlostpointercapture="snakeBoost(false,event)" onclick="if(event.detail===0)snakeBoost(!state.boosting)" aria-pressed="false" aria-describedby="snakeBoostNote">⚡ اضغط باستمرار للاندفاع</button><p id="snakeBoostNote" class="note">Shift أو ضغط مستمر · سرعة أعلى مقابل الطاقة · تتجدد بالحركة العادية</p></div>',
  );
}
const snakeFoodNames = ['تفاح', 'توت', 'برتقال'];
const snakeFoodIcons = ['🍎', '🫐', '🍊'];
function snakeFoodAt(head, s = state) {
  return s.mission === 'courier'
    ? s.foods.find((food) => food.x === head.x && food.y === head.y)
    : s.fruit && head.x === s.fruit.x && head.y === s.fruit.y
      ? s.fruit
      : null;
}
function snakeCourierUI() {
  const s = state,
    panel = $('snakeMissionPanel');
  if (!panel) return;
  const kind = s.deliveryOrders[s.deliveries];
  const signature = `${s.deliveries}:${s.cargoKind}:${s.wrongPickups}`;
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;
  $('snakeStatus').textContent =
    s.cargoKind !== null
      ? 'الطلب معك؛ عد للمستودع الأزرق لتسليمه.'
      : `اجمع النوع ${kind + 1} المطلوب ثم أوصله للمستودع. التوصيل هو هدف الجولة.`;
  panel.innerHTML = `<div class="arcade-mission-head"><b>طلبات البستان · ${s.deliveries}/3 توصيلات</b><span>${s.cargoKind !== null ? '📦 الطلب معك' : snakeFoodIcons[kind] || '✓'}</span></div><progress max="3" value="${s.deliveries}" aria-label="الطلبات المسلّمة"></progress><p>${s.cargoKind !== null ? `أوصل ${snakeFoodNames[s.cargoKind]} للمستودع الأزرق في أعلى يسار اللوحة. الاندفاع يستهلك 16٪ طاقة لكل خطوة أثناء الحمل.` : s.deliveries < 3 ? `الطلب ${s.deliveries + 1}: اجمع ${snakeFoodNames[kind]} ثم عد إلى المستودع. الفاكهة الأخرى تزيد طولك وتخصم 5 نقاط.` : 'سلّمت الطلبات الثلاثة!'} · اختيارات زائدة: ${s.wrongPickups}</p><div class="arcade-mission-stamps">${s.deliveryOrders.map((food, i) => `<span class="${i < s.deliveries ? 'complete' : i === s.deliveries ? 'current' : ''}">${snakeFoodIcons[food]} ${food + 1} · ${i < s.deliveries ? 'تم التسليم' : `طلب ${i + 1}`}</span>`).join('')}</div>`;
}
function snakeInterval(s = state) {
  return Math.max(35, Math.round(s.stepMs * (s.boosting && s.energy > 0 ? 0.55 : 1)));
}
function snakeBoost(active, event = null) {
  if (screen !== 'snake' || !state || state.drive === 'step') return;
  const s = state;
  if (active && (!arcadeReady('snake') || s.energy < 20)) return;
  s.boosting = !!active;
  if (event && active) event.currentTarget?.setPointerCapture?.(event.pointerId);
  if (active && !s.running) snakeBegin();
  s.nextStep = (s.lastStepAt || Date.now()) + snakeInterval(s);
  snakeEngineUI();
}
function snakeEngineUI() {
  if ($('snakeEnergy')) $('snakeEnergy').value = state.energy;
  if ($('snakeEnergyLabel')) $('snakeEnergyLabel').textContent = `${state.energy}٪`;
  const button = $('snakeBoostButton');
  if (!button) return;
  button.setAttribute('aria-pressed', String(state.boosting));
  button.classList.toggle('warm', state.boosting);
  button.textContent = state.boosting
    ? '⚡ الاندفاع يعمل · اترك الزر للتوقف'
    : state.energy < 20
      ? '⚡ الطاقة تتجدد · انتظر 20٪'
      : '⚡ اضغط باستمرار للاندفاع';
}
function snakeNext(dir, s = state) {
  const [dx, dy] = arcadeDelta[dir],
    head = { x: s.snake[0].x + dx, y: s.snake[0].y + dy };
  if (s.mode === 'wrap') {
    head.x = (head.x + s.width) % s.width;
    head.y = (head.y + s.width) % s.width;
  }
  const eats = snakeFoodAt(head, s);
  return {
    ...head,
    safe:
      head.x >= 0 &&
      head.y >= 0 &&
      head.x < s.width &&
      head.y < s.width &&
      ![...(eats ? s.snake : s.snake.slice(0, -1)), ...s.rocks].some(
        (p) => p.x === head.x && p.y === head.y,
      ),
  };
}
function snakePreview() {
  if (!arcadeReady('snake') || state.drive !== 'step') return;
  state.safePreview = !state.safePreview;
  $('snakePreviewButton').setAttribute('aria-pressed', String(state.safePreview));
  snakeDraw();
}
function snakeBegin() {
  if (!arcadeReady('snake') || state.running) return;
  state.running = true;
  state.started = Date.now();
  state.lastStepAt = state.started;
  state.nextStep = Date.now() + state.stepMs;
  $('snakeStart')?.remove();
}
function snakeTurn(dir) {
  if (!arcadeReady('snake') || !arcadeDelta[dir]) return;
  const s = state,
    a = arcadeDelta[dir],
    previous = s.turnQueue.at(-1) || s.direction,
    b = arcadeDelta[previous];
  if (s.drive === 'step') {
    if (a[0] + b[0] === 0 && a[1] + b[1] === 0) return;
    s.turnQueue = dir === s.direction ? [] : [dir];
    if (!s.running) snakeBegin();
    snakeStep();
    return;
  }
  if (dir !== previous) {
    if (s.turnQueue.length >= 2 || (a[0] + b[0] === 0 && a[1] + b[1] === 0)) return;
    s.turnQueue.push(dir);
  }
  s.nextDirection = s.turnQueue[0] || s.direction;
  s.queued = s.turnQueue.length > 0;
  if (!s.running) snakeBegin();
}
function snakeStep() {
  if (!arcadeReady('snake')) return;
  const s = state;
  const previousDirection = s.direction;
  s.direction = s.turnQueue.shift() || s.direction;
  if (s.direction !== previousDirection) s.turns++;
  s.steps++;
  s.nextDirection = s.turnQueue[0] || s.direction;
  s.queued = s.turnQueue.length > 0;
  const [dx, dy] = arcadeDelta[s.direction],
    head = { x: s.snake[0].x + dx, y: s.snake[0].y + dy };
  if (s.mode === 'wrap') {
    head.x = (head.x + s.width) % s.width;
    head.y = (head.y + s.width) % s.width;
  } else if (head.x < 0 || head.y < 0 || head.x >= s.width || head.y >= s.width) {
    s.crash = { ...head, kind: 'edge' };
    return snakeEnd('اصطدمت بالحافة 🐍');
  }
  const eat = snakeFoodAt(head, s),
    body = eat ? s.snake : s.snake.slice(0, -1);
  if ([...body, ...s.rocks].some((p) => p.x === head.x && p.y === head.y)) {
    s.crash = {
      ...head,
      kind: s.rocks.some((p) => p.x === head.x && p.y === head.y) ? 'rock' : 'body',
    };
    return snakeEnd(
      s.rocks.some((p) => p.x === head.x && p.y === head.y)
        ? 'اصطدمت بصخرة 🪨'
        : 'اصطدمت بجسم الثعبان 🐍',
    );
  }
  s.snake.unshift(head);
  if (s.drive === 'live') {
    if (s.boosting) {
      s.boostSteps++;
      s.energy = Math.max(0, s.energy - (s.mission === 'courier' && s.cargoKind !== null ? 16 : 8));
      if (!s.energy) s.boosting = false;
    } else s.energy = Math.min(100, s.energy + 3);
    snakeEngineUI();
  }
  if (!eat) s.snake.pop();
  else {
    s.fruitCount++;
    s.level = Math.floor(s.fruitCount / 5) + 1;
    if (s.pace !== 'steady')
      s.stepMs = Math.max(60, Math.round(s.speed * Math.pow(0.9, s.level - 1)));
    tone();
    if (s.mission === 'courier') {
      s.foods = s.foods.filter((food) => food !== eat);
      if (s.cargoKind === null && eat.kind === s.deliveryOrders[s.deliveries])
        s.cargoKind = eat.kind;
      else s.wrongPickups++;
      s.fruit = s.foods.find((food) => food.kind === s.deliveryOrders[s.deliveries]) || null;
    } else if (!snakeFruit()) return snakeEnd('ملأت العالم كله! 🏆', true);
    $('snakeFruitCount').textContent = s.fruitCount;
    $('snakeLength').textContent = s.snake.length;
    $('snakeStatus').textContent =
      s.drive === 'step'
        ? `تدريب · ${s.steps} خطوة · ${s.mission === 'courier' ? 'سلّم الطلبات لتجمع النقاط' : 'نقطتان لكل فاكهة'}. اختر الاتجاه التالي على راحتك.`
        : s.pace === 'steady'
          ? 'سرعة ثابتة · فاكهة أخرى تزيد طولك!'
          : `المستوى ${s.level} · ${5 - (s.fruitCount % 5)} فواكه للمستوى التالي.`;
  }
  if (s.mission === 'courier') {
    if (s.cargoKind !== null && head.x === s.deliveryDepot.x && head.y === s.deliveryDepot.y) {
      s.deliveries++;
      s.cargoKind = null;
      tone();
      if (s.deliveries === 3) return snakeEnd('سلّمت طلبات البستان الثلاثة! 📦', true);
      if (!snakeFruit()) return snakeEnd('امتلأ البستان قبل إكمال التوصيل');
    }
    snakeCourierUI();
  }
  snakeDraw();
}
function snakeDraw() {
  const canvas = $('snakeCanvas');
  if (!canvas) return;
  const s = state,
    c = canvas.getContext('2d'),
    u = canvas.width / s.width;
  c.fillStyle = '#111c2b';
  c.fillRect(0, 0, 600, 600);
  c.strokeStyle = '#1b2c40';
  c.lineWidth = 1;
  for (let i = 0; i <= s.width; i++) {
    c.beginPath();
    c.moveTo(i * u, 0);
    c.lineTo(i * u, 600);
    c.moveTo(0, i * u);
    c.lineTo(600, i * u);
    c.stroke();
  }
  for (const p of s.rocks) {
    c.fillStyle = '#66798e';
    c.fillRect(p.x * u + 3, p.y * u + 3, u - 6, u - 6);
    c.fillStyle = '#91a2b3';
    c.fillRect(p.x * u + 5, p.y * u + 5, u - 14, 5);
  }
  if (s.mission === 'courier') {
    const p = s.deliveryDepot;
    c.fillStyle = '#8ad7ff';
    c.fillRect(p.x * u + 3, p.y * u + 3, u - 6, u - 6);
    c.strokeStyle = '#113b55';
    c.lineWidth = 2;
    c.strokeRect(p.x * u + u * 0.3, p.y * u + u * 0.45, u * 0.4, u * 0.35);
    c.beginPath();
    c.moveTo(p.x * u + u * 0.2, p.y * u + u * 0.45);
    c.lineTo(p.x * u + u * 0.5, p.y * u + u * 0.2);
    c.lineTo(p.x * u + u * 0.8, p.y * u + u * 0.45);
    c.stroke();
  }
  for (const fruit of s.mission === 'courier' ? s.foods : s.fruit ? [s.fruit] : []) {
    c.fillStyle =
      s.mission === 'courier' ? ['#ff8d94', '#b7a0f9', '#ffc275'][fruit.kind] : '#ffac8b';
    c.beginPath();
    c.arc((fruit.x + 0.5) * u, (fruit.y + 0.5) * u, u * 0.34, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#bcf7b5';
    c.fillRect((fruit.x + 0.52) * u, (fruit.y + 0.08) * u, 6, 9);
    if (
      s.mission === 'courier' &&
      fruit.kind === s.deliveryOrders[s.deliveries] &&
      s.cargoKind === null
    ) {
      c.strokeStyle = '#fff2c7';
      c.lineWidth = 2;
      c.strokeRect(fruit.x * u + 2, fruit.y * u + 2, u - 4, u - 4);
    }
    if (s.mission === 'courier') {
      c.fillStyle = '#1f2030';
      c.font = `bold ${u * 0.42}px Arial`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(fruit.kind + 1, (fruit.x + 0.5) * u, (fruit.y + 0.5) * u);
    }
  }
  s.snake.forEach((p, i) => {
    c.fillStyle =
      i === 0
        ? s.mission === 'courier' && s.cargoKind !== null
          ? '#ffd194'
          : '#d8ffd4'
        : '#73d7a5';
    c.fillRect(p.x * u + 2, p.y * u + 2, u - 4, u - 4);
  });
  if (s.safePreview && !s.done && !s.crash) {
    const labels = { up: 'أعلى', down: 'أسفل', left: 'يسار', right: 'يمين' },
      available = [];
    for (const dir of Object.keys(arcadeDelta)) {
      const a = arcadeDelta[dir],
        b = arcadeDelta[s.direction];
      if (a[0] + b[0] === 0 && a[1] + b[1] === 0) continue;
      const next = snakeNext(dir, s);
      if (next.safe) available.push(labels[dir]);
      c.strokeStyle = next.safe ? '#b6f3cf' : '#ff958d';
      c.lineWidth = 3;
      c.strokeRect(
        Math.max(0, Math.min(s.width - 1, next.x)) * u + 5,
        Math.max(0, Math.min(s.width - 1, next.y)) * u + 5,
        u - 10,
        u - 10,
      );
    }
    if ($('snakeForecast'))
      $('snakeForecast').textContent = available.length
        ? `آمن للخطوة التالية: ${available.join('، ')}. هذا فحص خطوة واحدة؛ خطط لمساحة الالتفاف بعدها.`
        : 'كل الاتجاهات المسموحة تصطدم. لا توجد خطوة آمنة.';
  } else if ($('snakeForecast')) $('snakeForecast').textContent = '';
  const h = s.snake[0],
    [dx, dy] = arcadeDelta[s.direction];
  c.fillStyle = '#173d2c';
  for (const offset of [-0.17, 0.17]) {
    c.beginPath();
    c.arc(
      (h.x + 0.5 + dx * 0.22 + (dy ? offset : 0)) * u,
      (h.y + 0.5 + dy * 0.22 + (dx ? offset : 0)) * u,
      2.8,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  if (s.crash) {
    const x = Math.max(0.5, Math.min(s.width - 0.5, s.crash.x + 0.5)) * u,
      y = Math.max(0.5, Math.min(s.width - 0.5, s.crash.y + 0.5)) * u;
    c.strokeStyle = '#ff8c89';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(x, y, u * 0.43, 0, Math.PI * 2);
    c.moveTo(x - u * 0.2, y - u * 0.2);
    c.lineTo(x + u * 0.2, y + u * 0.2);
    c.moveTo(x + u * 0.2, y - u * 0.2);
    c.lineTo(x - u * 0.2, y + u * 0.2);
    c.stroke();
  }
}
function snakeEnd(title, full = false) {
  if (screen !== 'snake' || !state || state.done) return;
  const s = state,
    points =
      s.mission === 'courier'
        ? Math.max(
            0,
            (s.deliveries === 3
              ? s.drive === 'step'
                ? 50
                : 80
              : s.deliveries * (s.drive === 'step' ? 15 : 25)) -
              s.wrongPickups * 5,
          )
        : s.drive === 'step'
          ? Math.min(50, s.fruitCount * 2)
          : full
            ? 100
            : Math.min(100, s.fruitCount * ({ 240: 3, 150: 5, 90: 7 }[s.speed] || 5));
  snakeDraw();
  const snapshot = arcadeCanvasSnapshot(
      'snakeCanvas',
      s.crash ? 'اللوحة الأخيرة. العلامة الحمراء تحدد موضع الاصطدام.' : 'اللوحة الأخيرة للثعبان.',
    ),
    advice =
      s.crash?.kind === 'edge'
        ? 'ابدأ المنعطف قبل الحافة بخانة على الأقل. جرّب عالم البوابات لتتدرّب على جمع الفاكهة.'
        : s.crash?.kind === 'rock'
          ? 'اترك خانة بين رأسك والصخور، وخطط لاتجاه الخروج قبل الاقتراب.'
          : s.crash?.kind === 'body'
            ? 'اترك مساحة للالتفاف؛ الرجوع إلى اتجاه معاكس مباشرة ممنوع، لكن الالتفاف السريع قد يقودك إلى جسمك.'
            : 'حافظ على مسار واسع يسمح لجسمك بالتحرك بعيداً عن الفاكهة القادمة.';
  finishExtra(
    title,
    `جمعت ${s.fruitCount} فاكهة، ووصل طولك إلى ${s.snake.length} خلال ${arcadeTimeText(s.running ? arcadeSeconds(s) : 0)}.${s.mission === 'courier' ? ` سلّمت ${s.deliveries}/3 طلبات؛ خصم الاختيارات الزائدة ${s.wrongPickups * 5} نقاط.` : s.drive === 'step' ? ' جولة تدريب: نقطتان لكل فاكهة، حتى 50 نقطة.' : ''}`,
    points,
  );
  arcadeReview(
    'راجع مسارك 🐍',
    `<div class="arcade-review-facts"><span>${s.steps} خطوة</span><span>${s.turns} منعطف</span><span>المستوى ${s.level}</span>${s.mission === 'courier' ? `<span>${s.deliveries}/3 طلبات مسلّمة</span><span>${s.wrongPickups} اختيارات زائدة · −${s.wrongPickups * 5}</span>` : ''}${s.drive === 'live' ? `<span>${s.boostSteps || 0} خطوات اندفاع</span>` : ''}</div><p class="muted">${advice}</p>${snapshot}`,
  );
}

// 2048: pure slide/merge, one snapshot per effective move, and no spawn on no-op moves.
function mergeSlide(board, dir) {
  const next = [...board],
    size = Math.sqrt(board.length),
    merged = [];
  let gained = 0;
  if (!arcadeDelta[dir] || !Number.isInteger(size))
    return { board: next, gained, merged, changed: false };
  const slideSegment = (indices) => {
    const values = indices.map((i) => board[i]).filter((v) => v > 0),
      out = [];
    for (let k = 0; k < values.length; k++) {
      if (values[k] === values[k + 1]) {
        out.push(values[k] * 2);
        gained += values[k] * 2;
        merged.push(indices[out.length - 1]);
        k++;
      } else out.push(values[k]);
    }
    indices.forEach((i, k) => (next[i] = out[k] || 0));
  };
  for (let line = 0; line < size; line++) {
    let segment = [];
    for (let k = 0; k < size; k++) {
      const index =
        dir === 'left'
          ? line * size + k
          : dir === 'right'
            ? line * size + size - 1 - k
            : dir === 'up'
              ? k * size + line
              : (size - 1 - k) * size + line;
      if (board[index] < 0) {
        slideSegment(segment);
        segment = [];
      } else segment.push(index);
    }
    slideSegment(segment);
  }
  return { board: next, gained, merged, changed: next.some((v, i) => v !== board[i]) };
}
function mergeWorkshopDamage(move, s = state) {
  const crateHP = { ...(s?.crateHP || {}) },
    board = [...move.board],
    size = Math.sqrt(board.length);
  let broken = 0,
    hits = 0;
  if (s?.mission === 'workshop')
    for (const key of Object.keys(crateHP)) {
      const index = Number(key),
        neighbours = [];
      if (index % size) neighbours.push(index - 1);
      if (index % size < size - 1) neighbours.push(index + 1);
      if (index >= size) neighbours.push(index - size);
      if (index + size < board.length) neighbours.push(index + size);
      const damage = move.merged.filter((i) => neighbours.includes(i)).length;
      if (!damage) continue;
      hits += Math.min(crateHP[index], damage);
      crateHP[index] -= damage;
      if (crateHP[index] <= 0) {
        delete crateHP[index];
        board[index] = 0;
        broken++;
      }
    }
  return { ...move, board, crateHP, broken, hits };
}
function mergeMissionUI() {
  const s = state,
    panel = $('mergeMissionPanel');
  if (!panel) return;
  panel.innerHTML = `<div class="arcade-mission-head"><b>ورشة الدمج · اكسر الصناديق وابنِ 256</b><span>${Math.max(0, s.moveLimit - s.moves)} حركة</span></div><progress max="${s.crateTotal}" value="${s.cratesBroken}" aria-label="الصناديق المكسورة"></progress><p>${s.cratesBroken}/${s.crateTotal} صناديق مكسورة · أكبر قطعة ${Math.max(...s.board)}/256. الدمج بجوار الصندوق يكسر طبقة؛ الخانات لا تعبر خلاله. كل حركة فعالة تُحسب والتراجع يعيد حالتها.</p>`;
}
function mergeSpawnToken(s = state) {
  s.spawnTape ||= [];
  s.spawnCursor ||= 0;
  if (!s.spawnTape[s.spawnCursor])
    s.spawnTape[s.spawnCursor] = {
      position: arcadeRand(1000000000, s),
      value: arcadeRand(10, s) === 0 ? 4 : 2,
    };
  return s.spawnTape[s.spawnCursor];
}
function mergeSpawn(s = state) {
  const free = s.board.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (!free.length) return -1;
  const token = mergeSpawnToken(s),
    i = free[Math.floor((token.position / 1000000000) * free.length)];
  s.board[i] = token.value;
  s.spawnCursor++;
  mergeSpawnToken(s);
  return i;
}
function mergePossible(board) {
  return ['left', 'right', 'up', 'down'].some((d) => mergeSlide(board, d).changed);
}
function startMerge() {
  const s = state;
  s.boardSize = s.boardSize === 5 ? 5 : 4;
  s.board = Array(s.boardSize * s.boardSize).fill(0);
  const crates = s.mission === 'workshop' ? (s.boardSize === 5 ? [6, 8, 16, 18] : [5, 10]) : [];
  s.crateHP = Object.fromEntries(crates.map((index) => [index, 2]));
  s.crateTotal = crates.length;
  s.cratesBroken = 0;
  s.crateHits = 0;
  s.moveLimit = s.boardSize === 5 ? 80 : 60;
  for (const index of crates) s.board[index] = -1;
  s.spawnTape = [];
  s.spawnCursor = 0;
  s.score = 0;
  s.moves = 0;
  s.history = null;
  s.undoStack = [];
  s.goal = s.mission === 'workshop' ? 256 : [1024, 2048, 4096].includes(s.goal) ? s.goal : 2048;
  s.won = false;
  s.continuing = false;
  s.over = false;
  s.newTile = -1;
  s.merged = [];
  s.forecast = null;
  s.bestGain = 0;
  s.feedback = `هدفك ${s.goal}. حافظ على مساحة للحركات القادمة.`;
  mergeSpawn(s);
  mergeSpawn(s);
  renderMerge();
  arcadeClock(s);
}
function mergeBoardHTML(s = state, id = 'mergeBoard') {
  const cells = s.board
    .map(
      (v, i) =>
        `<div class="merge-cell ${v > 0 ? 'has-number' : v < 0 ? 'merge-crate' : ''} ${i === s.newTile ? 'tile-new' : ''} ${s.merged.includes(i) ? 'tile-merged' : ''}" data-value="${v}" style="--tile-level:${v > 0 ? Math.min(11, Math.log2(v)) : 0}" ${v < 0 ? `aria-label="صندوق، ${s.crateHP?.[i] || 0} طبقات"` : ''}>${v > 0 ? `<b class="${v >= 1024 ? 'compact' : ''}">${v}</b>` : v < 0 ? `<span aria-hidden="true">▣</span><small>${s.crateHP?.[i] || 0}</small>` : ''}</div>`,
    )
    .join('');
  return `<div id="${id}" class="merge-board" data-size="${Math.sqrt(s.board.length)}" style="--merge-size:${Math.sqrt(s.board.length)}" role="img" aria-label="لوحة 2048: ${s.board.map((v) => (v < 0 ? 'صندوق' : v || 'فارغة')).join('، ')}">${cells}</div>`;
}
function renderMerge() {
  const s = state;
  const blocked = s.over || (s.won && !s.continuing);
  if (!$('mergeLivePanel')) {
    setHTML(
      wrap(
        'merge',
        smallStats([
          ['نقاط الدمج', fmt(s.score), 'mergeScore'],
          ['أكبر قطعة', Math.max(...s.board), 'mergeTop'],
          ['الحركات', s.moves, 'mergeMoves'],
        ]) +
          `<section id="mergeLivePanel" class="panel arcade-panel"><div class="arcade-stage">${mergeBoardHTML(s)}<div id="mergeOverlay"></div></div><div class="merge-dashboard"><div><small>القطعة القادمة</small><b id="mergeNextTile"></b></div><div><small>تقدم الهدف</small><progress id="mergeGoalProgress" max="100" value="0"></progress><span id="mergeGoalLabel"></span></div><div><small>المساحة المتاحة</small><b id="mergeSpace"></b></div></div><div class="arcade-status" id="mergeStatus" role="status"></div>${arcadeDirections('mergeMove')}<details class="arcade-coach"><summary>🔎 خطط لحركتك · عاين الاتجاهات</summary><p class="note">المعاينة توضّح الدمج قبل ظهور القطعة العشوائية الجديدة. اللوحة الأصلية تنتظرك.</p><button class="merge-coach-button" onclick="mergeRecommend()">✦ ساعدني أختار اتجاهي</button><p id="mergeAdvice" class="note" role="status"></p><div id="mergeForecastChoices" class="merge-forecast-choices"></div><div id="mergeForecast" aria-live="polite"></div></details><div class="actions"><button id="mergeUndoButton" onclick="mergeUndo()">↶ تراجع عن الحركة</button><button onclick="mergeEnd()">احفظ نتيجتي</button></div>${arcadeToolbar('merge')}<p class="note center">السحب أو الأسهم أو WASD · Z للتراجع · كل حركة صحيحة تضيف قطعة واحدة فقط.</p></section>`,
      ),
    );
    // The board remains mounted so a swipe keeps pointer capture and controls keep focus.
    arcadeSwipe($('mergeBoard'), mergeMove, { single: true });
    if (s.mission === 'workshop')
      $('mergeLivePanel').insertAdjacentHTML(
        'afterbegin',
        '<div id="mergeMissionPanel" class="arcade-mission" role="status"></div>',
      );
  }
  const template = document.createElement('template');
  template.innerHTML = mergeBoardHTML(s);
  const board = $('mergeBoard'),
    replacement = template.content.firstElementChild;
  board.innerHTML = replacement.innerHTML;
  board.style.setProperty('--merge-size', Math.sqrt(s.board.length));
  board.dataset.size = Math.sqrt(s.board.length);
  board.setAttribute('aria-label', replacement.getAttribute('aria-label'));
  $('mergeScore').textContent = fmt(s.score);
  $('mergeTop').textContent = Math.max(...s.board);
  $('mergeMoves').textContent = s.moves;
  $('mergeStatus').textContent = s.feedback;
  mergeMissionUI();
  const top = Math.max(...s.board),
    progress = Math.min(
      100,
      Math.round(((Math.log2(Math.max(2, top)) - 1) / (Math.log2(s.goal) - 1)) * 100),
    );
  $('mergeNextTile').textContent = mergeSpawnToken(s).value;
  $('mergeGoalProgress').value = progress;
  $('mergeGoalLabel').textContent = `${top} / ${s.goal}`;
  $('mergeSpace').textContent = `${s.board.filter((v) => !v).length}/${s.board.length}`;
  $('mergeAdvice').textContent = '';
  $('mergeForecastChoices').innerHTML = ['left', 'up', 'down', 'right']
    .map((dir) => {
      const label = { left: '← يسار', up: '↑ أعلى', down: '↓ أسفل', right: '→ يمين' }[dir];
      return `<button onclick="mergeForecast('${dir}')" ${blocked || !mergeSlide(s.board, dir).changed ? 'disabled' : ''} aria-pressed="${s.forecast?.dir === dir}">${label}</button>`;
    })
    .join('');
  if (!s.forecast)
    $('mergeForecast').innerHTML =
      '<p class="note center">اختر اتجاهاً لترى نقاطه ومساحته. الاتجاهات التي لا تحرك اللوحة غير متاحة.</p>';
  const availableUndos = s.undoStack?.length || (s.history ? 1 : 0);
  $('mergeUndoButton').disabled = !s.history;
  $('mergeUndoButton').textContent = `↶ تراجع (${availableUndos} متاحة)`;
  for (const button of $('mergeLivePanel').querySelectorAll('.arcade-directions button'))
    button.disabled = blocked;
  $('mergeOverlay').innerHTML = blocked
    ? `<div class="arcade-overlay"><div><span class="arcade-big-icon">${s.over ? '🧱' : '🏆'}</span><h3>${s.over ? (s.mission === 'workshop' && s.moves >= s.moveLimit ? 'انتهى رصيد الحركات' : 'لا توجد حركة متاحة') : s.mission === 'workshop' ? 'اكتملت ورشة الدمج!' : `وصلت إلى ${s.goal}!`}</h3><p>${s.over ? 'تراجع عن الحركة الأخيرة أو احفظ نتيجتك.' : s.mission === 'workshop' ? 'كسرت الصناديق وبنيت 256 ضمن رصيد الحركات.' : 'واصل اللعب للوصول إلى أرقام أكبر.'}</p><div class="actions">${s.over ? `<button onclick="mergeUndo()" ${!s.history ? 'disabled' : ''}>↶ تراجع</button>` : s.mission === 'workshop' ? '' : '<button class="primary" onclick="mergeContinue()">واصل اللعب</button>'}<button onclick="mergeEnd()">احفظ النتيجة</button></div></div></div>`
    : '';
}
function mergeForecast(dir) {
  if (!arcadeReady('merge') || state.over || (state.won && !state.continuing) || !arcadeDelta[dir])
    return;
  const s = state,
    move = mergeWorkshopDamage(mergeSlide(s.board, dir), s);
  if (!move.changed) return;
  s.forecast = { dir };
  for (const button of $('mergeForecastChoices').querySelectorAll('button'))
    button.setAttribute('aria-pressed', button.getAttribute('onclick').includes(`'${dir}'`));
  const preview = mergeBoardHTML(
    { ...s, board: move.board, crateHP: move.crateHP, newTile: -1, merged: move.merged },
    'mergePreviewBoard',
  );
  $('mergeForecast').innerHTML =
    `<div class="arcade-review-facts"><span>+${fmt(move.gained)} نقطة دمج</span><span>${move.board.filter((v) => !v).length} خانات قبل القطعة الجديدة</span>${s.mission === 'workshop' ? `<span>${move.hits} طبقات و${move.broken} صناديق تكسرها هذه الحركة</span>` : ''}</div>${preview}<button class="primary merge-apply" onclick="mergeApplyForecast()">نفّذ الحركة المعاينة</button>`;
}
// This coach evaluates only the visible board, without advancing the spawn stream.
function mergeRecommend() {
  if (!arcadeReady('merge') || state.over || (state.won && !state.continuing)) return;
  const size = Math.sqrt(state.board.length),
    corners = [0, size - 1, size * (size - 1), size * size - 1];
  const ranked = Object.keys(arcadeDelta)
    .map((dir) => {
      const move = mergeWorkshopDamage(mergeSlide(state.board, dir)),
        empty = move.board.filter((v) => !v).length,
        top = Math.max(...move.board);
      let pairs = 0;
      for (let i = 0; i < move.board.length; i++)
        if (move.board[i] > 0) {
          if (i % size < size - 1 && move.board[i] === move.board[i + 1]) pairs++;
          if (i + size < move.board.length && move.board[i] === move.board[i + size]) pairs++;
        }
      return {
        dir,
        move,
        empty,
        pairs,
        anchored: corners.some((i) => move.board[i] === top),
        rank:
          empty * 30 +
          move.hits * 20 +
          move.broken * 35 +
          pairs * 8 +
          Math.log2(Math.max(1, move.gained)) * 4 +
          (corners.some((i) => move.board[i] === top) ? 12 : 0),
      };
    })
    .filter((item) => item.move.changed)
    .sort((a, b) => b.rank - a.rank);
  if (!ranked.length) return;
  const best = ranked[0];
  mergeForecast(best.dir);
  $('mergeAdvice').textContent =
    `اقتراح ${{ up: 'أعلى', down: 'أسفل', left: 'يسار', right: 'يمين' }[best.dir]}: ${best.empty} خانات فارغة قبل ظهور ${mergeSpawnToken().value}، و${best.pairs} أزواج جاهزة للدمج${best.anchored ? '، وأكبر قطعة في زاوية' : ''}. المعاينة تساعدك تقرر؛ الاقتراح لا يضمن الفوز.`;
}
function mergeApplyForecast() {
  if (!arcadeReady('merge') || !state.forecast) return;
  mergeMove(state.forecast.dir);
}
function mergeMove(dir) {
  if (!arcadeReady('merge') || !arcadeDelta[dir] || state.over || (state.won && !state.continuing))
    return;
  const s = state,
    move = mergeWorkshopDamage(mergeSlide(s.board, dir), s);
  if (!move.changed) {
    s.feedback = 'هذا الاتجاه لا يغيّر اللوحة. جرّب اتجاهاً آخر.';
    $('mergeStatus').textContent = s.feedback;
    return;
  }
  const snapshot = {
    board: [...s.board],
    score: s.score,
    moves: s.moves,
    won: s.won,
    continuing: s.continuing,
    bestGain: s.bestGain,
    spawnCursor: s.spawnCursor,
    crateHP: { ...s.crateHP },
    cratesBroken: s.cratesBroken,
    crateHits: s.crateHits,
  };
  s.undoStack.push(snapshot);
  if (s.undoStack.length > 5) s.undoStack.shift();
  s.history = snapshot;
  s.board = move.board;
  s.crateHP = move.crateHP;
  s.cratesBroken += move.broken;
  s.crateHits += move.hits;
  s.score += move.gained;
  s.bestGain = Math.max(s.bestGain, move.gained);
  s.forecast = null;
  s.moves++;
  s.merged = move.merged;
  s.newTile = mergeSpawn(s);
  if (
    s.board.some((v) => v >= s.goal) &&
    (s.mission !== 'workshop' || !Object.keys(s.crateHP).length)
  )
    s.won = true;
  s.over =
    !mergePossible(s.board) || (s.mission === 'workshop' && !s.won && s.moves >= s.moveLimit);
  const free = s.board.filter((v) => !v).length;
  s.feedback = `${move.gained ? `+${fmt(move.gained)} نقطة دمج · ` : ''}هدف ${s.goal} · ${free} خانات فارغة${free < 3 ? '؛ انتبه، المساحة ضيقة.' : '.'}`;
  if (move.gained) tone();
  renderMerge();
}
function mergeUndo() {
  if (!arcadeReady('merge') || !state.history) return;
  const s = state,
    h = s.undoStack?.pop() || s.history;
  Object.assign(s, h);
  s.history = s.undoStack?.at(-1) || null;
  s.over = false;
  s.newTile = -1;
  s.merged = [];
  s.forecast = null;
  s.feedback = 'تراجعت عن الحركة. اختر اتجاهاً آخر.';
  renderMerge();
}
function mergeContinue() {
  if (!arcadeReady('merge') || !state.won || state.over || state.mission === 'workshop') return;
  state.continuing = true;
  state.forecast = null;
  state.feedback = `حققت هدف ${state.goal}! أكمل لبناء قطعة أكبر.`;
  renderMerge();
}
function mergeEnd() {
  if (!arcadeReady('merge')) return;
  const s = state,
    rawPoints =
      s.mission === 'workshop'
        ? s.won
          ? 80
          : Math.min(
              60,
              Math.round(
                (s.cratesBroken / s.crateTotal) * 40 + Math.min(1, Math.max(...s.board) / 256) * 20,
              ),
            )
        : s.won
          ? { 1024: 75, 2048: 100, 4096: 100 }[s.goal]
          : Math.min(s.goal === 1024 ? 70 : 95, Math.floor(s.score / 20)),
    points = s.boardSize === 5 ? Math.min(75, rawPoints) : rawPoints,
    snapshot = mergeBoardHTML(s);
  finishExtra(
    s.won ? 'بطل الدمج 🏆' : 'انتهت جولة الدمج',
    `جمعت ${fmt(s.score)} نقطة دمج خلال ${s.moves} حركة. أكبر قطعة: ${Math.max(...s.board)}. هدف الجولة: ${s.goal}.${s.mission === 'workshop' ? ` كسرت ${s.cratesBroken}/${s.crateTotal} صناديق خلال ${s.moves}/${s.moveLimit} حركة؛ المهمة حتى 80 نقطة.` : ''}${s.boardSize === 5 ? ' لوحة واسعة: النتيجة العامة حتى 75 نقطة.' : ''}`,
    points,
  );
  $('app')
    .querySelector('.play')
    .insertAdjacentHTML(
      'beforeend',
      `<section class="panel arcade-panel arcade-review"><h3 class="center">لوحتك الأخيرة</h3><div class="arcade-review-facts"><span>أفضل حركة: +${fmt(s.bestGain)}</span><span>${s.board.filter((v) => !v).length} خانات فارغة</span>${s.mission === 'workshop' ? `<span>${s.cratesBroken}/${s.crateTotal} صناديق مكسورة</span><span>${s.crateHits} طبقات أزلتها</span>` : ''}</div><p class="muted">${s.mission === 'workshop' ? (s.won ? 'أنجزت الهدفين قبل نفاد الحركات. توزيع الدمج حول الصناديق فتح المساحة لبناء القطعة المطلوبة.' : s.moves >= s.moveLimit ? 'نفد رصيد الحركات قبل إكمال الهدفين. وجّه الدمج نحو الصناديق أولاً، واحفظ مساحة لبناء 256.' : 'الصناديق تفصل الصفوف والأعمدة. اختر دمجاً بجوارها لتزيل طبقاتها وتفتح ممرات ومساحة جديدة.') : s.over ? 'امتلأت اللوحة بدون قطعتين متساويتين متجاورتين. حاول إبقاء أكبر قطعة في زاوية وفتح مساحة في الصف المقابل.' : 'راقب الخانات الفارغة مع نقاط الدمج. دمج أكثر من زوج في الحركة نفسها يفتح مساحة للقطع القادمة.'}</p>${snapshot}</section>`,
    );
}

// Minesweeper: mines are placed after the first reveal, outside its 3×3 neighbourhood.
function mineNeighbours(i, n = state.size) {
  const x = i % n,
    y = Math.floor(i / n),
    out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if ((dx || dy) && x + dx >= 0 && x + dx < n && y + dy >= 0 && y + dy < n)
        out.push((y + dy) * n + x + dx);
  return out;
}
function startMines() {
  const s = state;
  s.size = [8, 12, 16].includes(s.size) ? s.size : 8;
  s.mineCount = { 8: 10, 12: 24, 16: 48 }[s.size];
  s.board = Array(s.size * s.size).fill(0);
  s.mines = new Set();
  s.revealed = new Set();
  s.flags = new Set();
  s.questions = new Set();
  s.questionMode = false;
  s.pendingChord = null;
  s.mineScale = 1;
  s.relics = new Set();
  s.foundRelics = new Set();
  s.scans = 0;
  s.scanReports = new Map();
  s.extracted = false;
  s.flagMode = false;
  s.generated = false;
  s.clockRunning = false;
  s.selected = 0;
  s.exploded = -1;
  s.highlight = new Set();
  s.hints = 0;
  s.deduction = null;
  s.feedback = 'أول كشف آمن مع جميع جيرانه. اضغط مطولاً في الهاتف لوضع علم.';
  renderMines();
  arcadeClock(s);
}
function mineGenerate(first) {
  const s = state,
    avoid = new Set([first, ...mineNeighbours(first, s.size)]),
    free = arcadeShuffle(s.board.map((_, i) => i).filter((i) => !avoid.has(i)));
  s.mines = new Set(free.slice(0, s.mineCount));
  s.board = s.board.map((_, i) =>
    s.mines.has(i) ? -1 : mineNeighbours(i, s.size).filter((j) => s.mines.has(j)).length,
  );
  s.generated = true;
  if (s.mission === 'survey') mineSurveyGenerate(first, s);
  s.clockRunning = true;
  s.started = Date.now();
}
function mineSurveyGenerate(first, s = state) {
  const avoid = new Set([first, ...mineNeighbours(first, s.size)]),
    half = s.size / 2;
  s.relics = new Set();
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    const safe = s.board
      .map((v, i) =>
        v >= 0 &&
        (Math.floor(i / s.size) >= half ? 2 : 0) + (i % s.size >= half ? 1 : 0) === quadrant
          ? i
          : null,
      )
      .filter((i) => i !== null);
    const preferred = safe.filter((i) => !avoid.has(i)),
      choices = preferred.length ? preferred : safe;
    s.relics.add(choices[arcadeRand(choices.length, s)]);
  }
}
// A detector reports artifacts only; it never reads hidden mine positions or counts.
function mineSurveyReading(index, s = state) {
  const cells = [index, ...mineNeighbours(index, s.size)];
  return { cells, count: cells.filter((i) => s.relics.has(i) && !s.foundRelics.has(i)).length };
}
function mineScan() {
  if (!arcadeReady('mines') || state.mission !== 'survey' || state.scans >= 3) return;
  const s = state;
  if (!s.generated) {
    s.feedback = 'ابدأ بالكشف الآمن أولاً، ثم حدد مكان المسحة بالأسهم أو بلمس خانة.';
    $('mineStatus').textContent = s.feedback;
    return;
  }
  const reading = mineSurveyReading(s.selected),
    signature = `${s.selected}:${[...s.foundRelics].sort((a, b) => a - b).join(',')}`;
  if (s.scanReports.has(signature)) {
    s.feedback = 'مسحت هذا المكان بالفعل ولم تجمع قطعة جديدة منذ ذلك. لا نخصم مسحة أخرى.';
    $('mineStatus').textContent = s.feedback;
    return;
  }
  s.scans++;
  s.scanReports.set(signature, reading.count);
  s.highlight = new Set(reading.cells);
  s.pendingChord = null;
  s.deduction = null;
  s.feedback = `المسحة في الصف ${Math.floor(s.selected / s.size) + 1}، العمود ${(s.selected % s.size) + 1}: ${reading.count} قطع غير مكتشفة في الخانة وجيرانها المميزة. هذا لا يدل على أماكن الألغام. خصم المسحة: 6 نقاط.`;
  renderMines();
}
function mineExtract() {
  if (!arcadeReady('mines') || state.mission !== 'survey' || state.foundRelics.size !== 4) return;
  state.extracted = true;
  mineFinish(true);
}
function mineSurveyHTML(s = state) {
  if (s.mission !== 'survey') return '';
  const half = s.size / 2,
    found = new Set(
      [...s.foundRelics].map(
        (i) => (Math.floor(i / s.size) >= half ? 2 : 0) + (i % s.size >= half ? 1 : 0),
      ),
    );
  return `<div class="arcade-mission" role="status"><div class="arcade-mission-head"><b>بعثة التنقيب · ${s.foundRelics.size}/4 آثار</b><span>مسحات ${3 - s.scans}</span></div><progress max="4" value="${s.foundRelics.size}" aria-label="القطع الأثرية المجموعة"></progress><div class="arcade-mission-stamps">${['شمال غرب', 'شمال شرق', 'جنوب غرب', 'جنوب شرق'].map((label, i) => `<span class="${found.has(i) ? 'complete' : ''}">${found.has(i) ? '◆' : '◇'} ${label}</span>`).join('')}</div><p>قطعة واحدة في كل ربع. المسحة تقرأ الخانة المحددة وجيرانها؛ اختر وضع تحديد المسحة ثم اضغط المكان دون كشفه، أو تنقل بالأسهم. كشف كل الخانات الآمنة يفوز أيضاً.</p><div class="actions"><button class="${s.scanMode ? 'warm' : ''}" onclick="mineMode('scan')" aria-pressed="${!!s.scanMode}">◉ حدّد المكان</button><button aria-label="امسح المكان المحدد مقابل 6 نقاط" onclick="mineScan()" ${s.scans >= 3 ? 'disabled' : ''}>◉ مسحة (−6)</button><button class="primary" onclick="mineExtract()" ${s.foundRelics.size !== 4 ? 'disabled' : ''}>📦 انسحاب بالآثار</button></div></div>`;
}
function minesBoardHTML(s = state, final = false) {
  return `<div class="mines-scroll"><div class="mines-board ${s.size === 16 ? 'mines-large' : s.size === 12 ? 'mines-medium' : ''}" style="--mine-size:${s.size};--mine-scale:${s.mineScale || 1}" role="group" aria-label="حقل الألغام">${s.board
    .map((v, i) => {
      const open = s.revealed.has(i),
        flag = s.flags.has(i),
        question = s.questions?.has(i),
        relic = s.mission === 'survey' && s.relics?.has(i) && (open || final),
        bomb = final && s.mines.has(i),
        wrong = final && flag && !s.mines.has(i);
      return `<button class="mine-cell ${open ? 'revealed' : ''} ${bomb ? 'mine-bomb' : ''} ${i === s.exploded ? 'exploded' : ''} ${flag ? 'flagged' : ''} ${question ? 'questioned' : ''} ${relic ? 'mine-relic' : ''} ${!final && s.scanMode && s.selected === i ? 'mine-scan-selected' : ''} ${!final && s.highlight?.has(i) ? 'mine-neighbour' : ''} ${!final && s.deduction?.index === i ? 'mine-deduction-' + s.deduction.kind : ''} ${!final && s.deduction?.clues.includes(i) ? 'mine-clue' : ''}" ${final ? 'disabled' : `onclick="mineTap(${i})" oncontextmenu="mineContext(${i},event)"`} tabindex="${!final && s.selected === i ? '0' : '-1'}" data-index="${i}" data-count="${open || final ? v : ''}" aria-label="صف ${Math.floor(i / s.size) + 1}، عمود ${(i % s.size) + 1}: ${bomb ? 'لغم' : wrong ? 'علم غير صحيح' : flag ? 'علم' : question ? 'علامة شك، قابلة للكشف' : open ? (v ? 'مكشوفة، ' + v + ' ألغام مجاورة' : 'خانة خالية') : 'مغلقة'}${!final && s.deduction?.index === i ? (s.deduction.kind === 'safe' ? '، آمنة بالاستنتاج' : '، لغم بالاستنتاج') : ''}${relic ? '، قطعة أثرية' : ''}">${bomb ? '✹' : wrong ? '✕' : relic ? `<span aria-hidden="true">◆</span>${open && v > 0 ? `<small>${v}</small>` : ''}` : flag ? '⚑' : question && !open ? '?' : open && v > 0 ? v : !final && s.deduction?.index === i ? (s.deduction.kind === 'safe' ? '✓' : '!') : ''}</button>`;
    })
    .join('')}</div></div>`;
}
function renderMines() {
  const s = state,
    previousBoard = document.querySelector('.mines-scroll'),
    scrollLeft = previousBoard?.scrollLeft || 0,
    scrollTop = previousBoard?.scrollTop || 0,
    restoreFocus = !!document.activeElement?.closest('.mine-cell');
  setHTML(
    wrap(
      'mines',
      smallStats([
        ['أعلام متبقية', s.mineCount - s.flags.size],
        ['خانات آمنة', s.revealed.size + ' / ' + (s.board.length - s.mineCount), 'mineProgress'],
        ['الوقت', arcadeTimeText(s.clockRunning ? arcadeSeconds(s) : 0), 'arcadeTime'],
      ]) +
        `<section class="panel arcade-panel">${mineSurveyHTML(s)}<div class="mine-mode"><button class="${!s.flagMode && !s.questionMode && !s.scanMode ? 'primary' : ''}" onclick="mineMode(false)" aria-pressed="${!s.flagMode && !s.questionMode && !s.scanMode}">🔍 كشف الخانات</button><button class="${s.flagMode ? 'warm' : ''}" onclick="mineMode(true)" aria-pressed="${s.flagMode}">⚑ وضع الأعلام</button><button class="${s.questionMode ? 'warm' : ''}" onclick="mineMode('question')" aria-pressed="${!!s.questionMode}">؟ علامة شك</button></div><div class="mine-zoom"><label for="mineZoom">حجم الخانات</label><select id="mineZoom" onchange="mineZoom(this.value)"><option value="1" ${s.mineScale === 1 ? 'selected' : ''}>عادي</option><option value="1.25" ${s.mineScale === 1.25 ? 'selected' : ''}>تكبير 125٪</option><option value="1.5" ${s.mineScale === 1.5 ? 'selected' : ''}>تكبير 150٪</option></select></div>${minesBoardHTML(s)}<div class="arcade-status" id="mineStatus" role="status">${s.feedback}</div><div class="actions">${s.pendingChord ? `<button class="warm" onclick="mineConfirmChord()">افتح ${s.pendingChord.cells.length} جيران بعد التأكد</button>` : ''}<button id="mineHintButton" onclick="mineHint()" ${s.hints >= 3 ? 'disabled' : ''}>✦ استنتاج منطقي (${3 - s.hints})</button>${s.deduction ? '<button class="primary" onclick="mineApplyHint()">نفّذ الاستنتاج</button>' : ''}</div><p class="note center">${s.questionMode ? 'وضع الشك: اضغط خانة مغلقة لتدوين ؟ أو إزالتها؛ لا تحمي الخانة من الكشف.' : s.flagMode ? 'وضع الأعلام: اضغط خانة مغلقة لوضع علم أو إزالته.' : 'اضغط للكشف. اضغط رقماً مكشوفاً لفتح الجيران بعد وضع أعلامه.'}<br>ضغط مطول أو الفأرة اليمنى أو F للأعلام · Q للشك · الأسهم للتنقل · Enter للكشف.<br>المساعد يستخدم الأرقام المكشوفة، وكل استنتاج ناجح يخصم 8 نقاط.</p>${arcadeToolbar('mines')}</section>`,
    ),
  );
  const board = document.querySelector('.mines-scroll');
  board.scrollLeft = scrollLeft;
  board.scrollTop = scrollTop;
  mineTouchControls(board, s);
  if (restoreFocus)
    document
      .querySelector(`.mine-cell[data-index="${s.selected}"]`)
      ?.focus({ preventScroll: true });
}
function mineTouchControls(board, round) {
  let press = null;
  const cancel = () => {
    if (press) {
      clearTimeout(press.timer);
      const index = timers.indexOf(press.timer);
      if (index >= 0) timers.splice(index, 1);
    }
    press = null;
  };
  board.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.mine-cell[data-index]');
    if (!cell || !e.isPrimary || !['touch', 'pen'].includes(e.pointerType)) return;
    cancel();
    const i = Number(cell.dataset.index);
    if (round.revealed.has(i)) return;
    press = { x: e.clientX, y: e.clientY, id: e.pointerId };
    press.timer = later(() => {
      if (state !== round || !board.isConnected || !arcadeReady('mines') || !press) return cancel();
      round.suppressMineTap = { index: i, until: Date.now() + 700 };
      cancel();
      mineFlag(i);
    }, 450);
  });
  board.addEventListener('pointermove', (e) => {
    if (
      press &&
      e.pointerId === press.id &&
      (Math.abs(e.clientX - press.x) > 10 || Math.abs(e.clientY - press.y) > 10)
    )
      cancel();
  });
  const stop = (e) => {
    if (e.pointerId === press?.id) cancel();
  };
  board.addEventListener('pointerup', stop);
  board.addEventListener('pointercancel', stop);
}
function mineMode(flag) {
  if (!arcadeReady('mines')) return;
  state.flagMode = flag === true;
  state.questionMode = flag === 'question';
  state.scanMode = flag === 'scan' && state.mission === 'survey';
  state.pendingChord = null;
  renderMines();
}
function mineQuestion(i) {
  if (
    !arcadeReady('mines') ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= state.board.length ||
    state.revealed.has(i)
  )
    return;
  const s = state;
  s.questions ||= new Set();
  s.flags.delete(i);
  if (s.questions.has(i)) s.questions.delete(i);
  else s.questions.add(i);
  s.selected = i;
  s.pendingChord = null;
  s.highlight = new Set();
  s.deduction = null;
  s.feedback = s.questions.has(i)
    ? 'سجلت علامة شك ؟. هذه ليست علماً؛ الخانة تبقى قابلة للكشف ولا تؤكد وجود لغم.'
    : 'أزلت علامة الشك.';
  renderMines();
}
function mineZoom(value) {
  if (!arcadeReady('mines')) return;
  state.mineScale = [1, 1.25, 1.5].includes(Number(value)) ? Number(value) : 1;
  if ($('mineZoom')) $('mineZoom').value = String(state.mineScale);
  document.querySelector('.mines-board')?.style.setProperty('--mine-scale', state.mineScale);
}
function mineConfirmChord() {
  if (!arcadeReady('mines') || !state.pendingChord) return;
  mineTap(state.pendingChord.index, true);
}
function mineFlag(i) {
  if (
    !arcadeReady('mines') ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= state.board.length ||
    state.revealed.has(i)
  )
    return;
  const s = state;
  if (!s.flags.has(i) && s.flags.size >= s.mineCount)
    return toast('استخدمت كل الأعلام. أزل علماً لوضعه هنا.');
  s.selected = i;
  s.questions?.delete(i);
  s.pendingChord = null;
  s.highlight = new Set();
  s.deduction = null;
  if (s.flags.has(i)) s.flags.delete(i);
  else s.flags.add(i);
  s.feedback = s.flags.has(i)
    ? `وضعت علماً. بقيت ${s.mineCount - s.flags.size} أعلام.`
    : 'أزلت العلم. الخانة جاهزة للكشف.';
  renderMines();
}
function mineContext(i, event) {
  event.preventDefault();
  if (state?.suppressMineTap?.index === i && Date.now() < state.suppressMineTap.until) return;
  mineFlag(i);
}
function mineTap(i, forceReveal = false) {
  if (!arcadeReady('mines') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  const s = state;
  if (s.suppressMineTap?.index === i && Date.now() < s.suppressMineTap.until) {
    s.suppressMineTap = null;
    return;
  }
  s.selected = i;
  if (s.scanMode && !forceReveal) {
    s.pendingChord = null;
    s.highlight = new Set();
    s.feedback = `حددت الصف ${Math.floor(i / s.size) + 1}، العمود ${(i % s.size) + 1} للمسحة بدون كشفه. اضغط زر المسح؛ لم تُستهلك مسحة بعد.`;
    return renderMines();
  }
  if (s.pendingChord?.index !== i) s.pendingChord = null;
  if (s.questionMode && !forceReveal && !s.revealed.has(i)) return mineQuestion(i);
  if (s.flagMode && !forceReveal && !s.revealed.has(i)) return mineFlag(i);
  if (s.flags.has(i)) {
    s.feedback = 'هذه الخانة محمية بعلم. أزل العلم أولاً إذا أردت كشفها.';
    $('mineStatus').textContent = s.feedback;
    return;
  }
  if (!s.generated) mineGenerate(i);
  s.deduction = null;
  s.highlight = new Set();
  const before = s.revealed.size;
  if (s.revealed.has(i)) {
    const neighbours = mineNeighbours(i, s.size),
      flags = neighbours.filter((j) => s.flags.has(j)).length;
    if (s.board[i] > 0 && flags === s.board[i]) {
      const cells = neighbours.filter((j) => !s.flags.has(j) && !s.revealed.has(j));
      if (s.safety === 'confirm' && cells.length && s.pendingChord?.index !== i) {
        s.pendingChord = { index: i, cells };
        s.highlight = new Set(cells);
        s.feedback = `ستفتح ${cells.length} خانات حول الرقم ${s.board[i]}. تأكد من أماكن الأعلام؛ تطابق عددها وحده لا يضمن السلامة. اضغط الرقم مرة ثانية أو زر التأكيد.`;
        return renderMines();
      }
      s.pendingChord = null;
      for (const j of neighbours)
        if (!s.flags.has(j) && !s.revealed.has(j)) {
          if (!mineReveal(j)) return;
        }
    } else if (s.board[i] > 0) {
      s.highlight = new Set(neighbours.filter((j) => !s.revealed.has(j) && !s.flags.has(j)));
      s.feedback = `الرقم ${s.board[i]} يحتاج ${s.board[i]} أعلام حوله؛ وضعت ${flags}. الخانات المحيطة مميزة.`;
    }
  } else if (!mineReveal(i)) return;
  if (s.revealed.size > before)
    s.feedback = `كشفت ${s.revealed.size - before} خانات آمنة. بقيت ${s.board.length - s.mineCount - s.revealed.size} خانة.`;
  if (s.revealed.size === s.board.length - s.mineCount) return mineFinish(true);
  renderMines();
}
function mineReveal(i) {
  const s = state;
  s.questions?.delete(i);
  if (s.mines.has(i)) {
    s.exploded = i;
    mineFinish(false);
    return false;
  }
  const queue = [i];
  for (let k = 0; k < queue.length; k++) {
    const j = queue[k];
    if (s.revealed.has(j) || s.flags.has(j) || s.mines.has(j)) continue;
    s.questions?.delete(j);
    s.revealed.add(j);
    if (s.relics?.has(j)) s.foundRelics.add(j);
    if (s.board[j] === 0)
      for (const v of mineNeighbours(j, s.size))
        if (!s.revealed.has(v) && !s.flags.has(v) && !s.mines.has(v)) queue.push(v);
  }
  return true;
}
// Deductions ignore player flags and never inspect hidden mine positions.
function mineDeduction(s = state) {
  const safe = new Map(),
    mines = new Map(),
    originals = [];
  for (const i of s.revealed) {
    if (s.board[i] < 0) continue;
    const cells = mineNeighbours(i, s.size).filter((j) => !s.revealed.has(j));
    if (s.board[i] > cells.length) return null;
    if (cells.length) originals.push({ cells, count: s.board[i], clues: [i] });
  }
  const infer = (rule) => {
    if (!rule.cells.length || (rule.count !== 0 && rule.count !== rule.cells.length)) return false;
    const target = rule.count === 0 ? safe : mines;
    let changed = false;
    for (const i of rule.cells)
      if (!target.has(i)) {
        target.set(i, rule.clues);
        changed = true;
      }
    return changed;
  };
  for (let pass = 0; pass < s.board.length; pass++) {
    const rules = originals.map((rule) => ({
      cells: rule.cells.filter((i) => !safe.has(i) && !mines.has(i)),
      count: rule.count - rule.cells.filter((i) => mines.has(i)).length,
      clues: [
        ...new Set([
          ...rule.clues,
          ...rule.cells.flatMap((i) => safe.get(i) || mines.get(i) || []),
        ]),
      ],
    }));
    if (rules.some((rule) => rule.count < 0 || rule.count > rule.cells.length)) return null;
    let changed = false;
    for (const rule of rules) changed = infer(rule) || changed;
    for (const a of rules)
      for (const b of rules) {
        if (a.cells.length >= b.cells.length || !a.cells.every((i) => b.cells.includes(i)))
          continue;
        const difference = {
          cells: b.cells.filter((i) => !a.cells.includes(i)),
          count: b.count - a.count,
          clues: [...new Set([...a.clues, ...b.clues])],
        };
        if (difference.count < 0 || difference.count > difference.cells.length) return null;
        changed = infer(difference) || changed;
      }
    const candidate =
      [...safe].find(([i]) => !s.revealed.has(i)) || [...mines].find(([i]) => !s.flags.has(i));
    if (candidate) {
      const [index, clues] = candidate,
        kind = safe.has(index) ? 'safe' : 'mine',
        location = `الصف ${Math.floor(index / s.size) + 1}، العمود ${(index % s.size) + 1}`,
        evidence = clues
          .map((i) => `(${Math.floor(i / s.size) + 1}، ${(i % s.size) + 1})`)
          .join(' و');
      return {
        index,
        kind,
        clues,
        explanation: `${location}: ${kind === 'safe' ? 'خانة آمنة مضمونة' : 'لغم مؤكد'}. ${clues.length > 1 ? 'مقارنة الأرقام' : 'الرقم'} في ${evidence} ${kind === 'safe' ? 'يستبعد وجود لغم هنا' : 'يفرض وجود لغم هنا'}. الأرقام الداعمة مميزة بالبنفسجي.`,
      };
    }
    if (!changed) break;
  }
  return null;
}
function mineHint() {
  if (!arcadeReady('mines') || state.hints >= 3) return;
  const s = state;
  if (s.deduction) return;
  const deduction = s.generated ? mineDeduction(s) : null;
  if (!deduction) {
    s.feedback = s.generated
      ? 'لا يوجد استنتاج مضمون من الأرقام المكشوفة الآن. لم نستهلك مساعدة؛ جرّب كشف منطقة أخرى.'
      : 'اكشف خانتك الأولى الآمنة، ثم اطلب استنتاجاً من الأرقام.';
    $('mineStatus').textContent = s.feedback;
    return;
  }
  s.hints++;
  s.deduction = deduction;
  s.selected = deduction.index;
  s.highlight = new Set();
  s.feedback = `${deduction.explanation} خصم هذه المساعدة: 8 نقاط.`;
  renderMines();
  const cell = document.querySelector(`.mine-cell[data-index="${deduction.index}"]`);
  cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function mineApplyHint() {
  if (!arcadeReady('mines') || !state.deduction) return;
  const s = state,
    { index, kind } = s.deduction;
  if (kind === 'mine') mineFlag(index);
  else {
    s.flags.delete(index);
    mineTap(index, true);
  }
}
function mineFinish(win) {
  if (screen !== 'mines' || !state || state.done) return;
  const s = state,
    snapshot = minesBoardHTML(s, true),
    basePoints = win
      ? s.extracted
        ? { 8: 60, 12: 80, 16: 90 }[s.size]
        : { 8: 70, 12: 90, 16: 100 }[s.size]
      : Math.min(20, Math.floor((s.revealed.size / (s.board.length - s.mineCount)) * 20)),
    points = Math.max(0, basePoints - s.hints * 8 - s.scans * 6),
    wrongFlags = [...s.flags].filter((i) => !s.mines.has(i)).length;
  finishExtra(
    win ? (s.extracted ? 'رجعت بالآثار الأربع! 📦' : 'نظّفت الحقل كله! 🏆') : 'عثرت على لغم 💣',
    win
      ? `${s.extracted ? 'جمعت الآثار الأربع وانسحبت' : 'كشفت جميع الخانات الآمنة'} خلال ${arcadeTimeText(arcadeSeconds(s))}. استخدمت ${s.hints} مساعدات منطقية (−${s.hints * 8} نقاط).`
      : `كشفت ${s.revealed.size} خانة آمنة. لديك ${wrongFlags} أعلام خاطئة، وتظهر بعلامة × في الحقل. استخدمت ${s.hints} مساعدات منطقية (−${s.hints * 8} نقاط).`,
    points,
  );
  $('app')
    .querySelector('.play')
    .insertAdjacentHTML(
      'beforeend',
      `<section class="panel arcade-panel arcade-review"><h3 class="center">الحقل بعد الجولة</h3>${s.mission === 'survey' ? `<div class="arcade-review-facts"><span>${s.foundRelics.size}/4 آثار</span><span>${s.scans} مسحات · −${s.scans * 6}</span><span>${s.extracted ? 'انسحاب ناجح' : 'تنقيب وكشف'}</span></div>` : ''}<p class="muted">${win ? (s.extracted ? 'اخترت الانسحاب بعد جمع الآثار الأربع. بقيت خانات لم تُكشف، وتظهر مواقع الألغام والآثار في المراجعة.' : 'كشفت كل الخانات الآمنة؛ لا يلزم وضع علم على كل لغم للفوز.') : wrongFlags ? 'العلم اختيار منك، وليس ضماناً. فتح جيران رقم يعتمد على أماكن أعلامك؛ العدد الصحيح وحده لا يكفي إذا كان علم في المكان الخطأ.' : 'عندما لا يوجد استنتاج مضمون، ابحث عن أرقام أخرى تساعدك قبل المخاطرة بخانة مغلقة.'}</p>${snapshot}</section>`,
    );
}
function mineNavigate(dir) {
  if (!arcadeReady('mines') || !arcadeDelta[dir]) return;
  const s = state,
    [dx, dy] = arcadeDelta[dir],
    x = (s.selected % s.size) + dx,
    y = Math.floor(s.selected / s.size) + dy;
  if (x < 0 || y < 0 || x >= s.size || y >= s.size) return;
  s.selected = y * s.size + x;
  for (const el of document.querySelectorAll('.mine-cell[data-index]'))
    el.tabIndex = Number(el.dataset.index) === s.selected ? 0 : -1;
  const cell = document.querySelector(`.mine-cell[data-index="${s.selected}"]`);
  cell?.focus({ preventScroll: true });
  cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// Maze: iterative depth-first carving gives one connected path system.
function mazeGenerate(cells) {
  const width = cells * 2 + 1,
    grid = Array(width * width).fill(1),
    visited = new Set([0]),
    stack = [{ x: 0, y: 0 }];
  grid[width + 1] = 0;
  while (stack.length) {
    const p = stack[stack.length - 1],
      options = arcadeShuffle(Object.values(arcadeDelta))
        .map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy, dx, dy }))
        .filter(
          (q) =>
            q.x >= 0 && q.y >= 0 && q.x < cells && q.y < cells && !visited.has(q.y * cells + q.x),
        );
    if (!options.length) {
      stack.pop();
      continue;
    }
    const q = options[0];
    visited.add(q.y * cells + q.x);
    grid[(p.y * 2 + 1 + q.dy) * width + p.x * 2 + 1 + q.dx] = 0;
    grid[(q.y * 2 + 1) * width + q.x * 2 + 1] = 0;
    stack.push(q);
  }
  return { width, grid };
}
function mazePath(grid, width, from, to, blocked = null) {
  const queue = [from],
    parents = new Map([[from, -1]]);
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    if (i === to) break;
    const x = i % width,
      y = Math.floor(i / width);
    for (const [dx, dy] of Object.values(arcadeDelta)) {
      const xx = x + dx,
        yy = y + dy,
        j = yy * width + xx;
      if (
        xx >= 0 &&
        yy >= 0 &&
        xx < width &&
        yy < width &&
        !grid[j] &&
        !blocked?.has(j) &&
        !parents.has(j)
      ) {
        parents.set(j, i);
        queue.push(j);
      }
    }
  }
  if (!parents.has(to)) return [];
  const path = [];
  for (let i = to; i !== -1; i = parents.get(i)) path.push(i);
  return path.reverse();
}
// With at most seven stars, dynamic programming measures the shortest complete trip.
function mazeBestRoute(grid, width, from, stars, exit) {
  if (!stars.length) return Math.max(0, mazePath(grid, width, from, exit).length - 1);
  const points = [from, ...stars, exit],
    distances = points.map((a) => points.map((b) => mazePath(grid, width, a, b).length - 1)),
    count = stars.length,
    dp = Array.from({ length: 1 << count }, () => Array(count).fill(Infinity));
  for (let i = 0; i < count; i++) dp[1 << i][i] = distances[0][i + 1];
  for (let mask = 1; mask < 1 << count; mask++)
    for (let last = 0; last < count; last++) {
      if (!(mask & (1 << last))) continue;
      for (let next = 0; next < count; next++)
        if (!(mask & (1 << next))) {
          const nextMask = mask | (1 << next);
          dp[nextMask][next] = Math.min(
            dp[nextMask][next],
            dp[mask][last] + distances[last + 1][next + 1],
          );
        }
    }
  return Math.min(...dp[(1 << count) - 1].map((cost, i) => cost + distances[i + 1][count + 1]));
}
function mazeReachable(grid, width, from, blocked = new Set()) {
  const distance = new Map([[from, 0]]),
    queue = [from];
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    for (const next of mazeNeighbours(i, grid, width)) {
      if (blocked.has(next) || distance.has(next)) continue;
      distance.set(next, distance.get(i) + 1);
      queue.push(next);
    }
  }
  return distance;
}
// In a tree maze each gate splits the route: its key lives on the accessible side.
function mazeBuildKeys(s = state) {
  const path = mazePath(s.grid, s.width, s.position, s.exit),
    at = [Math.floor(path.length / 3), Math.floor((path.length * 2) / 3)],
    gateCells = at.map((i) => path[i]);
  const pairs = gateCells.map((gate, index) => {
    const from = index ? path[at[index - 1] + 1] : s.position;
    const reachable = mazeReachable(s.grid, s.width, from, new Set(gateCells));
    const choices = arcadeShuffle(
      [...reachable].filter(([i]) => i !== s.position && i !== s.exit && !gateCells.includes(i)),
      s,
    ).sort((a, b) => b[1] - a[1]);
    const key = choices[arcadeRand(Math.max(1, Math.ceil(choices.length / 4)), s)][0];
    return { gate, key, number: index + 1 };
  });
  s.gates = new Map(pairs.map((pair) => [pair.gate, pair]));
  s.originalGates = pairs;
  s.stars = new Set(pairs.map((pair) => pair.key));
  let from = s.position;
  s.parMoves = [...s.stars, s.exit].reduce((sum, next) => {
    const steps = mazePath(s.grid, s.width, from, next).length - 1;
    from = next;
    return sum + steps;
  }, 0);
}
function mazeBuildCourier(s = state) {
  s.base = s.position;
  const distances = mazeReachable(s.grid, s.width, s.base),
    farthest = Math.max(...distances.values());
  const choices = arcadeShuffle(
    [...distances]
      .filter(([i, distance]) => i !== s.base && distance >= farthest * 0.35)
      .map(([i]) => i),
    s,
  );
  s.courierStations = [];
  for (const index of choices) {
    if (s.courierStations.length === 3) break;
    if (
      s.courierStations.every(
        (other) => mazePath(s.grid, s.width, index, other).length - 1 >= s.size,
      )
    )
      s.courierStations.push(index);
  }
  for (const index of choices)
    if (s.courierStations.length < 3 && !s.courierStations.includes(index))
      s.courierStations.push(index);
  s.stars = new Set(s.courierStations);
  s.exit = s.base;
  s.delivered = 0;
  s.parcel = null;
  s.courierEvents = [];
  s.parMoves = s.courierStations.reduce((sum, index) => sum + distances.get(index) * 2, 0);
}
function mazeCourierTarget(s = state) {
  return s.parcel !== null ? s.base : s.courierStations[s.delivered];
}
function mazeCourierUI() {
  const s = state,
    panel = $('mazeMissionPanel');
  if (!panel) return;
  const signature = `${s.delivered}:${s.parcel}`;
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;
  const target = mazeCourierTarget(s);
  panel.innerHTML = `<div class="arcade-mission-head"><b>ساعي المتاهة · ${s.delivered}/3 طرود مسلّمة</b><span>${s.parcel !== null ? '📦 معك طرد' : 'انطلق للمحطة'}</span></div><progress max="3" value="${s.delivered}" aria-label="الطرود المسلّمة"></progress><p>${s.parcel !== null ? `الطرد ${s.parcel + 1} معك. عد إلى القاعدة الخضراء لتسليمه قبل استلام غيره.` : s.delivered < 3 ? `اذهب للمحطة ${s.delivered + 1} الصفراء، خذ طردها ثم ارجع إلى القاعدة الخضراء.` : 'سلّمت الطرود الثلاثة وعدت إلى القاعدة.'}${target !== undefined ? ` الهدف في الصف ${Math.floor(target / s.width) + 1}، العمود ${(target % s.width) + 1}.` : ''}</p><div class="arcade-mission-stamps">${s.courierStations.map((_, i) => `<span class="${i < s.delivered ? 'complete' : i === s.delivered ? 'current' : ''}">📦 ${i + 1} · ${i < s.delivered ? 'تم التسليم' : s.parcel === i ? 'في الطريق' : 'ينتظر'}</span>`).join('')}</div>`;
}
function mazeCourierVisit(index, s = state) {
  let stop = s.stars.has(index);
  if (index === s.courierStations[s.delivered] && s.parcel === null) {
    s.stars.delete(index);
    s.parcel = s.delivered;
    s.courierEvents.push({ step: s.moves, type: 'pickup', parcel: s.parcel, index });
    s.hintPath = [];
    s.hintTarget = null;
    tone();
  }
  if (index === s.base && s.parcel !== null) {
    s.courierEvents.push({ step: s.moves, type: 'deliver', parcel: s.parcel, index });
    s.delivered++;
    s.parcel = null;
    stop = true;
    s.hintPath = [];
    s.hintTarget = null;
    tone();
  }
  return stop;
}
function mazeCourierReview(at, s = state) {
  const events = s.courierEvents.filter((event) => event.step <= at),
    picked = new Set(events.filter((event) => event.type === 'pickup').map((event) => event.index)),
    last = events.at(-1);
  return {
    stars: new Set(s.courierStations.filter((index) => !picked.has(index))),
    delivered: events.filter((event) => event.type === 'deliver').length,
    parcel: last?.type === 'pickup' ? last.parcel : null,
  };
}
function mazeDiscover(s = state) {
  s.seen ||= new Set();
  if (s.vision !== 'lantern') {
    for (let i = 0; i < s.grid.length; i++) s.seen.add(i);
    return;
  }
  const queue = [[s.position, 0]],
    visited = new Set([s.position]);
  for (let k = 0; k < queue.length; k++) {
    const [i, distance] = queue[k];
    s.seen.add(i);
    if (distance >= 3) continue;
    const x = i % s.width,
      y = Math.floor(i / s.width);
    for (const [dx, dy] of Object.values(arcadeDelta)) {
      const xx = x + dx,
        yy = y + dy,
        next = yy * s.width + xx;
      if (xx < 0 || yy < 0 || xx >= s.width || yy >= s.width) continue;
      s.seen.add(next);
      if (s.grid[next] || s.gates?.has(next) || visited.has(next)) continue;
      visited.add(next);
      queue.push([next, distance + 1]);
    }
  }
}
function mazeMark() {
  if (!arcadeReady('maze')) return;
  state.markers ||= new Map();
  if (state.markers.has(state.position)) state.markers.delete(state.position);
  else {
    if (state.markers.size >= 12) return toast('لديك 12 علامة. أزل علامة قبل وضع غيرها.');
    const used = new Set(state.markers.values());
    state.markers.set(
      state.position,
      Array.from({ length: 12 }, (_, i) => i + 1).find((number) => !used.has(number)),
    );
  }
  mazeExplorationUI();
  mazeDraw();
}
function mazeExplorationUI() {
  const s = state,
    button = $('mazeMarkButton');
  if (button) {
    button.textContent = s.markers?.has(s.position)
      ? '⚑ أزل علامة هذا المكان'
      : '⚑ علّم هذا المكان';
    button.setAttribute('aria-pressed', String(!!s.markers?.has(s.position)));
  }
  if ($('mazeExplored')) {
    const floors = s.grid.filter((v) => !v).length,
      discovered = [...(s.seen || [])].filter((i) => !s.grid[i]).length;
    $('mazeExplored').textContent =
      `${s.vision === 'lantern' ? `اكتشفت ${Math.round((discovered / floors) * 100)}٪ من الممرات · ` : ''}${s.markers?.size || 0} / 12 علامات${s.mode === 'keys' ? ` · ${s.gates?.size || 0} بوابات مغلقة` : ''}`;
  }
}
function startMaze() {
  const s = state;
  s.size = [7, 10, 15].includes(s.size) ? s.size : 10;
  Object.assign(s, mazeGenerate(s.size));
  s.position = s.width + 1;
  s.exit = (s.width - 2) * s.width + s.width - 2;
  s.moves = 0;
  s.hints = 0;
  s.hintPath = [];
  s.hintTarget = null;
  s.trail = new Set([s.position]);
  s.markers = new Map();
  s.seen = new Set();
  s.gates = new Map();
  s.originalGates = [];
  const options = arcadeShuffle(
    s.grid
      .map((v, i) => (v ? null : i))
      .filter((i) => i !== null && i !== s.position && i !== s.exit),
  );
  s.stars = new Set(s.mode === 'stars' ? options.slice(0, { 7: 3, 10: 5, 15: 7 }[s.size]) : []);
  if (s.mode === 'keys') mazeBuildKeys(s);
  if (s.mode === 'courier') mazeBuildCourier(s);
  s.starTotal = s.stars.size;
  s.originalStars = [...s.stars];
  s.route = [s.position];
  if (!['keys', 'courier'].includes(s.mode))
    s.parMoves = mazeBestRoute(s.grid, s.width, s.position, [...s.stars], s.exit);
  mazeDiscover(s);
  renderMaze();
  arcadeClock(s);
}
function renderMaze() {
  const s = state;
  setHTML(
    wrap(
      'maze',
      smallStats([
        [
          s.mode === 'courier' ? 'الطرود المسلّمة' : s.mode === 'keys' ? 'المفاتيح' : 'النجوم',
          (s.mode === 'courier' ? s.delivered : s.starTotal - s.stars.size) + ' / ' + s.starTotal,
          'mazeStars',
        ],
        ['الخطوات', s.moves, 'mazeMoves'],
        ['الوقت', arcadeTimeText(arcadeSeconds(s)), 'arcadeTime'],
      ]) +
        `<section class="panel arcade-panel"><canvas id="mazeCanvas" width="620" height="620" role="img" aria-label="متاهة. موقعك هو الدائرة الزرقاء. اجمع النجوم الصفراء ثم اتجه إلى المخرج الأخضر. يمكنك لمس خانة مجاورة للتحرك أو نجمة لتحديد هدف التلميح."></canvas><div class="arcade-status" id="mazeStatus" role="status">${s.mode === 'keys' ? 'ابحث عن المفتاح 1 لفتح بوابته ثم تابع للمفتاح 2.' : s.stars.size ? 'اجمع النجوم قبل الوصول إلى المخرج.' : 'البوابة مفتوحة. اتجه إلى المخرج الأخضر!'}</div>${arcadeDirections('mazeMove')}<p class="note center" id="mazeExplored" role="status"></p><div class="actions"><button id="mazeMarkButton" onclick="mazeMark()" aria-pressed="false">⚑ علّم هذا المكان</button></div><div class="actions"><button id="mazeHintButton" onclick="mazeHint()" ${s.hints >= 3 ? 'disabled' : ''}>✦ تلميح (${3 - s.hints} متبقية)</button><button id="mazeTravelButton" onclick="mazeToggleTravel()" aria-pressed="${s.travel === 'corridor'}">${s.travel === 'corridor' ? 'حتى التقاطع' : 'خطوة بخطوة'}</button><button onclick="mazeClearTrail()">امسح آثار خطواتي</button></div>${arcadeToolbar('maze')}<p class="note center">الأزرق: أنت · الأصفر: ${s.mode === 'courier' ? 'محطة طرد مرقمة' : s.mode === 'keys' ? 'مفتاح' : 'نجمة'} · الأخضر: ${s.mode === 'courier' ? 'القاعدة' : 'المخرج'}<br>${s.vision === 'lantern' ? 'المصباح يكشف الممرات القريبة؛ الخريطة المكتشفة تبقى ظاهرة. التلميح يضيء الطريق المطلوب. <br>' : ''}المس خانة مجاورة للحركة، أو ${s.mode === 'courier' ? 'محطة الطرد الحالية' : s.mode === 'keys' ? 'مفتاحاً' : 'نجمة'} لتوجيه التلميح إليه · M لوضع علامة · الأسهم أو WASD · Shift مع الاتجاه للمشي حتى التقاطع.<br>المسار المثالي لهذه الجولة: ${s.parMoves} خطوة. كل خانة تتحركها تُحسب، حتى مع التحرك التلقائي. كل تلميح يخصم 8 نقاط.</p></section>`,
    ),
  );
  mazeDraw();
  mazeExplorationUI();
  if (s.mode === 'courier') {
    document
      .querySelector('.arcade-panel')
      .insertAdjacentHTML(
        'afterbegin',
        '<div id="mazeMissionPanel" class="arcade-mission" role="status"></div>',
      );
    mazeCourierUI();
    $('mazeCanvas').setAttribute(
      'aria-label',
      'ساعي المتاهة: تحرك إلى المحطات المرقمة 1 ثم 2 ثم 3. عد إلى القاعدة الخضراء بعد كل طرد. لونك برتقالي عندما تحمل طرداً.',
    );
    $('mazeStatus').textContent = 'اذهب للمحطة 1 ثم ارجع للقاعدة. الطرود تُستلم وتُسلّم بالترتيب.';
  }
  arcadeSwipe($('mazeCanvas'), mazeMove, { tap: mazeTap });
}
function mazeTap(event) {
  if (!arcadeReady('maze')) return;
  const s = state,
    bounds = $('mazeCanvas').getBoundingClientRect(),
    x = Math.floor(((event.clientX - bounds.left) / bounds.width) * s.width),
    y = Math.floor(((event.clientY - bounds.top) / bounds.height) * s.width),
    target = y * s.width + x;
  if (x < 0 || y < 0 || x >= s.width || y >= s.width || s.grid[target] || target === s.position)
    return;
  if (s.vision === 'lantern' && !s.seen.has(target)) {
    $('mazeStatus').textContent =
      'هذا المكان لم يُكتشف بعد. تحرك بالممرات القريبة ليضيء المصباح طريقك.';
    return;
  }
  const px = s.position % s.width,
    py = Math.floor(s.position / s.width);
  if (Math.abs(x - px) + Math.abs(y - py) === 1)
    return mazeMove(x > px ? 'right' : x < px ? 'left' : y > py ? 'down' : 'up', false, true);
  if (
    s.stars.has(target) ||
    (target === s.exit && (!s.stars.size || (s.mode === 'courier' && s.parcel !== null)))
  ) {
    if (s.mode === 'courier' && target !== mazeCourierTarget(s)) {
      $('mazeStatus').textContent =
        'وجّه التلميح إلى هدفك الحالي؛ سلّم الطرد المحمول قبل استلام التالي.';
      return;
    }
    if (s.hints >= 3) {
      $('mazeStatus').textContent =
        'استخدمت التلميحات الثلاثة. اتبع الممرات للوصول إلى هدفك؛ لا توجد مساعدة إضافية.';
      return;
    }
    s.hintTarget = target;
    $('mazeStatus').textContent =
      `اخترت ${s.stars.has(target) ? (s.mode === 'courier' ? 'محطة الطرد' : s.mode === 'keys' ? 'هذا المفتاح' : 'هذه النجمة') : s.mode === 'courier' ? 'القاعدة' : 'المخرج'} هدفاً. اضغط التلميح لإظهار الطريق مقابل 8 نقاط؛ اختيار الهدف مجاني.`;
    $('mazeHintButton').textContent =
      `✦ الطريق إلى ${s.stars.has(target) ? (s.mode === 'courier' ? 'الطرد' : s.mode === 'keys' ? 'المفتاح' : 'النجمة') : s.mode === 'courier' ? 'القاعدة' : 'المخرج'} (${3 - s.hints})`;
    mazeDraw();
  } else
    $('mazeStatus').textContent =
      target === s.exit
        ? `البوابة مغلقة؛ اجمع ${s.stars.size} نجوم أولاً.`
        : 'للحركة المباشرة المس خانة مجاورة. لتخطيط الطريق اختر نجمة ثم اطلب التلميح.';
}
function mazeMove(dir, corridor = false, single = false) {
  if (!arcadeReady('maze') || !arcadeDelta[dir]) return;
  const s = state,
    [dx, dy] = arcadeDelta[dir],
    x = (s.position % s.width) + dx,
    y = Math.floor(s.position / s.width) + dy;
  if (x < 0 || y < 0 || x >= s.width || y >= s.width) return;
  const i = y * s.width + x;
  if (s.gates?.has(i)) {
    $('mazeStatus').textContent =
      `البوابة ${s.gates.get(i).number} مغلقة. ابحث عن المفتاح الذي يحمل الرقم نفسه؛ يمكنك الوصول إليه من هذه الجهة.`;
    return;
  }
  if (s.grid[i]) {
    $('mazeStatus').textContent = 'هذا الاتجاه فيه جدار. جرّب أحد الممرات المفتوحة بجوارك.';
    return;
  }
  let previous = s.position,
    next = i,
    foundStar = false,
    travelled = 0;
  do {
    s.position = next;
    s.moves++;
    travelled++;
    s.trail.add(next);
    s.route?.push(next);
    // A hint remains visible when following it and clears when leaving its route.
    s.hintPath = s.hintPath[1] === next ? s.hintPath.slice(1) : [];
    if (s.mode === 'courier') foundStar = mazeCourierVisit(next, s);
    else if (s.stars.delete(next)) {
      foundStar = true;
      if (s.mode === 'keys')
        for (const [cell, gate] of s.gates) if (gate.key === next) s.gates.delete(cell);
      if (s.hintTarget === next) {
        s.hintTarget = null;
        $('mazeHintButton').textContent = `✦ تلميح (${3 - s.hints} متبقية)`;
      }
      tone();
    }
    mazeDiscover(s);
    if (foundStar || next === s.exit || !(corridor || (!single && s.travel === 'corridor'))) break;
    const onward = mazeNeighbours(next, s.grid, s.width).filter(
      (v) => v !== previous && !s.gates?.has(v),
    );
    if (onward.length !== 1) break;
    previous = next;
    next = onward[0];
  } while (travelled < s.grid.length);
  $('mazeStars').textContent =
    (s.mode === 'courier' ? s.delivered : s.starTotal - s.stars.size) + ' / ' + s.starTotal;
  $('mazeMoves').textContent = s.moves;
  mazeExplorationUI();
  if (s.mode === 'courier') mazeCourierUI();
  if (s.position === s.exit && s.stars.size === 0) return mazeFinish();
  $('mazeStatus').textContent =
    s.mode === 'courier'
      ? s.parcel !== null
        ? 'الطرد معك؛ ارجع للقاعدة الخضراء لتسليمه.'
        : `اتجه إلى المحطة ${s.delivered + 1}. المرور بمحطة أخرى لا يستلم طردها.`
      : s.position === s.exit && s.stars.size
        ? `البوابة تنتظرك. بقيت ${s.stars.size} نجوم.`
        : s.stars.size
          ? s.mode === 'keys'
            ? `بقي ${s.stars.size} مفاتيح. افتح البوابات بالترتيب واستكشف الممرات.`
            : 'اجمع النجوم قبل الوصول إلى المخرج.'
          : 'البوابة مفتوحة. اتجه إلى المخرج الأخضر!';
  mazeDraw();
}
function mazeNeighbours(i, grid = state.grid, width = state.width) {
  const x = i % width,
    y = Math.floor(i / width);
  return Object.values(arcadeDelta)
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter((p) => p.x >= 0 && p.y >= 0 && p.x < width && p.y < width && !grid[p.y * width + p.x])
    .map((p) => p.y * width + p.x);
}
function mazeToggleTravel() {
  if (!arcadeReady('maze')) return;
  state.travel = state.travel === 'corridor' ? 'step' : 'corridor';
  const button = $('mazeTravelButton');
  button.textContent = state.travel === 'corridor' ? 'حتى التقاطع' : 'خطوة بخطوة';
  button.setAttribute('aria-pressed', state.travel === 'corridor');
  $('mazeStatus').textContent =
    state.travel === 'corridor'
      ? 'اختر اتجاهاً؛ نتوقف عند التقاطع أو النجمة أو المخرج.'
      : 'كل ضغطة تحركك خانة واحدة.';
}
function mazeDraw(canvasID = 'mazeCanvas', reviewAt = null) {
  const canvas = $(canvasID);
  if (!canvas) return;
  const visited = reviewAt === null ? null : new Set(state.route.slice(0, reviewAt + 1)),
    s =
      reviewAt === null
        ? state
        : {
            ...state,
            position: state.route[reviewAt],
            stars: new Set(state.originalStars.filter((i) => !visited.has(i))),
            trail: visited,
            hintPath: [],
            hintTarget: null,
            vision: 'map',
            gates: new Map(
              (state.originalGates || [])
                .filter((gate) => !visited.has(gate.key))
                .map((gate) => [gate.gate, gate]),
            ),
            ...(state.mode === 'courier' ? mazeCourierReview(reviewAt, state) : {}),
          },
    c = canvas.getContext('2d'),
    u = canvas.width / s.width;
  c.fillStyle = '#101c2b';
  c.fillRect(0, 0, 620, 620);
  for (let i = 0; i < s.grid.length; i++) {
    const x = (i % s.width) * u,
      y = Math.floor(i / s.width) * u;
    if (s.vision === 'lantern' && !s.seen?.has(i) && !s.hintPath.includes(i)) {
      c.fillStyle = '#060d19';
      c.fillRect(x, y, u + 0.3, u + 0.3);
      continue;
    }
    if (s.grid[i]) {
      c.fillStyle = '#3a5266';
      c.fillRect(x, y, u + 0.3, u + 0.3);
    } else if (s.trail.has(i)) {
      c.fillStyle = '#263b4f';
      c.beginPath();
      c.arc(x + u / 2, y + u / 2, u * 0.12, 0, Math.PI * 2);
      c.fill();
    }
  }
  for (const i of s.hintPath) {
    c.fillStyle = '#bfb5ff';
    c.fillRect(
      (i % s.width) * u + u * 0.33,
      Math.floor(i / s.width) * u + u * 0.33,
      u * 0.34,
      u * 0.34,
    );
  }
  c.fillStyle = s.mode === 'courier' || !s.stars.size ? '#a7f1a6' : '#496553';
  if (s.vision !== 'lantern' || s.seen?.has(s.exit) || s.hintPath.includes(s.exit))
    c.fillRect(
      (s.exit % s.width) * u + u * 0.13,
      Math.floor(s.exit / s.width) * u + u * 0.13,
      u * 0.74,
      u * 0.74,
    );
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffd179';
  c.font = `bold ${Math.max(14, u * 0.83)}px Arial`;
  for (const i of s.stars) {
    if (s.vision === 'lantern' && !s.seen?.has(i) && !s.hintPath.includes(i)) continue;
    if (s.mode === 'courier')
      c.fillStyle =
        i === s.courierStations[s.delivered] && s.parcel === null ? '#ffdc8b' : '#9d9278';
    c.fillText(
      s.mode === 'courier'
        ? String(s.courierStations.indexOf(i) + 1)
        : s.mode === 'keys'
          ? '⚿'
          : '★',
      ((i % s.width) + 0.5) * u,
      (Math.floor(i / s.width) + 0.5) * u,
    );
    if (s.mode === 'keys') {
      c.font = `bold ${Math.max(9, u * 0.45)}px Arial`;
      c.fillText(
        (s.originalGates || []).find((gate) => gate.key === i)?.number || '',
        ((i % s.width) + 0.8) * u,
        (Math.floor(i / s.width) + 0.2) * u,
      );
      c.font = `bold ${Math.max(14, u * 0.83)}px Arial`;
    }
  }
  for (const [i, gate] of s.gates || []) {
    if (s.vision === 'lantern' && !s.seen?.has(i)) continue;
    c.fillStyle = '#dfab65';
    c.fillRect((i % s.width) * u + 1, Math.floor(i / s.width) * u + 1, u - 2, u - 2);
    c.fillStyle = '#2b1e12';
    c.font = `bold ${Math.max(11, u * 0.6)}px Arial`;
    c.fillText(gate.number, ((i % s.width) + 0.5) * u, (Math.floor(i / s.width) + 0.5) * u);
  }
  for (const [i, number] of s.markers || []) {
    if (s.vision === 'lantern' && !s.seen?.has(i)) continue;
    c.strokeStyle = '#f1a8d5';
    c.lineWidth = Math.max(1.5, u * 0.05);
    c.strokeRect(
      (i % s.width) * u + u * 0.15,
      Math.floor(i / s.width) * u + u * 0.15,
      u * 0.7,
      u * 0.7,
    );
    c.fillStyle = '#f1a8d5';
    c.font = `bold ${Math.max(9, u * 0.38)}px Arial`;
    c.fillText(number, ((i % s.width) + 0.5) * u, (Math.floor(i / s.width) + 0.5) * u);
  }
  c.fillStyle = s.mode === 'courier' && s.parcel !== null ? '#ffd194' : '#90dbff';
  c.beginPath();
  c.arc(
    ((s.position % s.width) + 0.5) * u,
    (Math.floor(s.position / s.width) + 0.5) * u,
    u * 0.34,
    0,
    Math.PI * 2,
  );
  c.fill();
  c.fillStyle = '#133b50';
  c.beginPath();
  c.arc(
    ((s.position % s.width) + 0.5) * u,
    (Math.floor(s.position / s.width) + 0.5) * u,
    u * 0.12,
    0,
    Math.PI * 2,
  );
  c.fill();
  if (s.hintTarget !== null && s.hintTarget !== undefined) {
    c.strokeStyle = '#c9b4ff';
    c.lineWidth = Math.max(2, u * 0.08);
    c.beginPath();
    c.arc(
      ((s.hintTarget % s.width) + 0.5) * u,
      (Math.floor(s.hintTarget / s.width) + 0.5) * u,
      u * 0.47,
      0,
      Math.PI * 2,
    );
    c.stroke();
  }
}
function mazeHint() {
  if (!arcadeReady('maze') || state.hints >= 3) return;
  const s = state,
    targets =
      s.mode === 'courier'
        ? [mazeCourierTarget(s)]
        : s.hintTarget !== null &&
            (s.stars.has(s.hintTarget) || (s.hintTarget === s.exit && !s.stars.size))
          ? [s.hintTarget]
          : s.stars.size
            ? [...s.stars]
            : [s.exit],
    paths = targets
      .map((t) => mazePath(s.grid, s.width, s.position, t, s.gates))
      .filter((p) => p.length)
      .sort((a, b) => a.length - b.length);
  if (!paths.length) {
    $('mazeStatus').textContent =
      'هذا الهدف خلف بوابة مغلقة. ابحث عن المفتاح المتاح أولاً؛ لم يُخصم أي تلميح.';
    return;
  }
  if (
    s.hintPath.length &&
    paths[0].length === s.hintPath.length &&
    paths[0].every((cell, i) => cell === s.hintPath[i])
  ) {
    $('mazeStatus').textContent = 'هذا الطريق ظاهر بالفعل. اتبعه؛ لم يُخصم تلميح إضافي.';
    return;
  }
  s.hints++;
  s.hintPath = paths[0];
  const b = $('mazeHintButton');
  b.textContent = `✦ تلميح (${3 - s.hints} متبقية)`;
  b.disabled = s.hints >= 3;
  $('mazeStatus').textContent = s.stars.size
    ? s.hintTarget !== null
      ? `المسار البنفسجي يصل إلى ${s.mode === 'keys' ? 'المفتاح الذي اخترته' : 'النجمة التي اخترتها'}. خصم التلميح: 8 نقاط.`
      : `المسار البنفسجي يصل إلى أقرب ${s.mode === 'keys' ? 'مفتاح يمكنك الوصول إليه' : 'نجمة'}. خصم التلميح: 8 نقاط.`
    : 'المسار البنفسجي يصل إلى المخرج.';
  if (s.mode === 'courier')
    $('mazeStatus').textContent =
      `المسار البنفسجي يصل إلى ${s.parcel !== null ? 'القاعدة لتسليم الطرد' : `المحطة ${s.delivered + 1}`}. خصم التلميح: 8 نقاط.`;
  mazeDraw();
}
function mazeClearTrail() {
  if (!arcadeReady('maze')) return;
  state.trail = new Set([state.position]);
  mazeDraw();
}
function mazeFinish() {
  if (screen !== 'maze' || !state || state.done) return;
  if (
    state.mode === 'courier' &&
    (state.delivered !== 3 || state.parcel !== null || state.position !== state.base)
  )
    return;
  const s = state,
    efficiency = Math.min(1, s.parMoves / Math.max(1, s.moves)),
    base = { 7: 70, 10: 85, 15: 100 }[s.size];
  finishExtra(
    s.mode === 'courier' ? 'سلّمت الطرود الثلاثة وعدت للقاعدة! 📦' : 'وصلت إلى المخرج! 🧭',
    `${s.mode === 'courier' ? 'سلّمت 3 طرود بعد 3 رحلات ذهاب وعودة' : `جمعت ${s.starTotal} ${s.mode === 'keys' ? 'مفاتيح' : 'نجوم'}، وخرجت`} خلال ${s.moves} خطوة و${arcadeTimeText(arcadeSeconds(s))}. المسار المثالي ${s.parMoves} خطوة؛ كفاءتك ${Math.round(efficiency * 100)}٪. استخدمت ${s.hints} تلميحات.`,
    Math.max(10, Math.round(base * (0.65 + efficiency * 0.35)) - s.hints * 8),
  );
  const last = s.route.length - 1;
  arcadeReview(
    'أعد استكشاف رحلتك 🧭',
    `<div class="arcade-review-facts"><span>زيادة عن المثالي: ${Math.max(0, s.moves - s.parMoves)} خطوة</span><span>كفاءة ${Math.round(efficiency * 100)}٪</span></div><p class="muted">حرّك الشريط لترى موقعك و${s.mode === 'courier' ? 'استلام الطرود وتسليمها' : s.mode === 'keys' ? 'المفاتيح والبوابات' : 'النجوم التي جمعتها'} في كل خطوة. مراجعة الرحلة لا تغيّر النتيجة.</p><canvas id="mazeReplayCanvas" width="620" height="620" role="img" aria-label="مراجعة رحلة المتاهة"></canvas><div class="arcade-replay-controls"><label for="mazeReplayRange" id="mazeReplayLabel">الخطوة ${last} من ${last}</label><input type="range" id="mazeReplayRange" min="0" max="${last}" value="${last}" oninput="mazeReplay(this.value)"><div class="actions"><button onclick="mazeReplay(0)">بداية الرحلة</button><button onclick="mazeReplay(-1)">الوصول للمخرج</button></div></div>`,
  );
  mazeReplay(last);
}
function mazeReplay(value) {
  if (screen !== 'maze' || !state?.done || !$('mazeReplayRange')) return;
  const last = state.route.length - 1,
    at = Number(value) === -1 ? last : Math.max(0, Math.min(last, Math.round(Number(value) || 0)));
  $('mazeReplayRange').value = at;
  $('mazeReplayLabel').textContent = `الخطوة ${at} من ${last}`;
  mazeDraw('mazeReplayCanvas', at);
}

document.addEventListener('keydown', (e) => {
  if (
    !arcadeIDs.has(screen) ||
    !arcadeReady(screen) ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.isComposing ||
    advancedEditableTarget(e.target)
  )
    return;
  const dirs = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
    },
    dir = dirs[e.key] || dirs[e.key.toLowerCase()];
  if (screen === 'snake' && e.key === 'Shift' && !e.repeat) snakeBoost(true);
  if (screen === 'maze' && e.key.toLowerCase() === 'm' && !e.repeat) {
    e.preventDefault();
    mazeMark();
  }
  if (e.key === ' ' && screen !== 'mines' && !e.repeat && !e.target.closest('button')) {
    e.preventDefault();
    showPause();
    return;
  }
  if (screen === 'mines') {
    if (dir) {
      e.preventDefault();
      mineNavigate(dir);
    } else if (e.key.toLowerCase() === 'f' && !e.repeat) {
      e.preventDefault();
      mineFlag(state.selected);
    } else if (e.key.toLowerCase() === 'q' && !e.repeat) {
      e.preventDefault();
      mineQuestion(state.selected);
    } else if (
      (e.key === 'Enter' || e.key === ' ') &&
      !e.repeat &&
      (!e.target.closest('button') || e.target.closest('.mine-cell'))
    ) {
      e.preventDefault();
      mineTap(state.selected);
    }
    return;
  }
  if (dir) {
    e.preventDefault();
    if (screen === 'snake') {
      if (!e.repeat) snakeTurn(dir);
    } else if (screen === 'merge') {
      if (!e.repeat) mergeMove(dir);
    } else mazeMove(dir, e.shiftKey);
  }
  if (screen === 'merge' && e.key.toLowerCase() === 'z' && !e.repeat) {
    e.preventDefault();
    mergeUndo();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') snakeBoost(false);
});
window.addEventListener('blur', () => snakeBoost(false));

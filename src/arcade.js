// Four offline arcade games. Each round owns its state and tracked timers.
const arcadeIDs = new Set(['snake', 'merge', 'mines', 'maze']);
games.push(
  [
    'snake',
    '🐍',
    'الثعبان',
    'اجمع الفاكهة، كبّر الثعبان، وجرّب السرعات والعوائق.',
    'بروحك',
    '#a7edbf',
  ],
  [
    'merge',
    '🧱',
    'دمج 2048',
    'ادمج الأرقام المتساوية. تراجع عن حركة وتحدَّ أفضل نتيجة.',
    'بروحك',
    '#ffd59c',
  ],
  [
    'mines',
    '💣',
    'كاسحة الألغام',
    'اكشف الخانات الآمنة وضع الأعلام. أول ضغطة آمنة دائماً.',
    'بروحك',
    '#c8bcff',
  ],
  [
    'maze',
    '🧭',
    'المتاهة',
    'متاهة جديدة لها حل كل مرة. اجمع النجوم واعثر على المخرج.',
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
    body = `<p class="muted">حرّك الثعبان واجمع الفاكهة بدون الاصطدام بنفسك. في الوضع الكلاسيكي يجب أيضاً تجنّب الحواف. تقدر تتحكم بالأسهم أو WASD أو السحب على اللوحة.</p><div class="fields"><div class="field"><label for="arcadeSpeed">السرعة</label><select id="arcadeSpeed"><option value="240">هادئة</option><option value="150" selected>متوسطة</option><option value="90">سريعة</option></select></div><div class="field"><label for="arcadeMode">العالم</label><select id="arcadeMode"><option value="classic">كلاسيكي · تجنّب الحواف</option><option value="wrap">بوابات · اعبر الحواف</option><option value="rocks">تحدّي الصخور</option></select></div>${playerField()}</div><div class="hintpanel">كل فاكهة تزيد طولك ونقاطك. تبدأ الحركة لما تكون جاهز. زر الإيقاف يحفظ الجولة أثناء الاستراحة.</div>`;
  if (id === 'merge')
    body = `<p class="muted">حرّك جميع القطع في اتجاه واحد. كل قطعتين متساويتين تندمجان مرة واحدة في الحركة. حاول الوصول إلى 2048، ثم واصل إذا أردت.</p><div class="fields">${playerField()}</div><div class="hintpanel">لوحة المفاتيح، أزرار الاتجاهات، أو السحب. تستطيع التراجع عن آخر حركة، حتى لو امتلأت اللوحة. الحركة التي لا تغيّر اللوحة لا تضيف قطعة.</div>`;
  if (id === 'mines')
    body = `<p class="muted">الأرقام تبيّن عدد الألغام في الخانات الثماني المحيطة. اكشف جميع الخانات الآمنة لتفوز. أول خانة وجميع الخانات المحيطة بها خالية من الألغام.</p><div class="fields"><div class="field full"><label for="arcadeSize">حجم الحقل</label><select id="arcadeSize"><option value="8">صغير · 8×8 · 10 ألغام</option><option value="12">متوسط · 12×12 · 24 لغماً</option><option value="16">كبير · 16×16 · 48 لغماً</option></select></div>${playerField()}</div><div class="hintpanel">في الهاتف بدّل بين وضع الكشف والأعلام. بزر الفأرة الأيمن تضع علماً. اضغط الرقم المكشوف لفتح جيرانه إذا وضعت العدد الصحيح من الأعلام.</div>`;
  if (id === 'maze')
    body = `<p class="muted">متاهة عشوائية متصلة ولها حل دائماً. تحرك بالأسهم أو WASD أو السحب أو أزرار الاتجاهات. اجمع النجوم ثم ادخل البوابة الخضراء.</p><div class="fields"><div class="field"><label for="arcadeSize">حجم المتاهة</label><select id="arcadeSize"><option value="7">صغيرة · 15×15</option><option value="10" selected>متوسطة · 21×21</option><option value="15">كبيرة · 31×31</option></select></div><div class="field"><label for="arcadeMode">نوع الرحلة</label><select id="arcadeMode"><option value="stars">استكشاف وجمع النجوم</option><option value="exit">الوصول إلى المخرج فقط</option></select></div>${playerField()}</div><div class="hintpanel">التلميح يرسم أقصر طريق إلى نجمة قريبة أو المخرج. لديك 3 تلميحات، وكل تلميح يخصم 8 نقاط من النتيجة.</div>`;
  setHTML(
    wrap(
      id,
      `<section class="panel">${body}<div class="actions"><button class="primary" onclick="startArcade('${id}')">ابدأ التحدّي ←</button></div></section>`,
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
function arcadeSwipe(el, move) {
  let point = null;
  el.addEventListener('pointerdown', (e) => {
    if (point || !e.isPrimary || e.button !== 0) return;
    point = { x: e.clientX, y: e.clientY, id: e.pointerId };
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!point || e.pointerId !== point.id) return;
    const dx = e.clientX - point.x,
      dy = e.clientY - point.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    point = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  const stop = (e) => {
    if (e.pointerId === point?.id) point = null;
  };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
  el.addEventListener('lostpointercapture', stop);
}
function startArcade(id) {
  if (screen !== 'setup' || state?.id !== id || !arcadeIDs.has(id)) return;
  const options = {
    speed: Number($('arcadeSpeed')?.value || 150),
    size: Number($('arcadeSize')?.value || 7),
    mode: $('arcadeMode')?.value || 'classic',
  };
  const name = player();
  clearTimers();
  screen = id;
  state = { id, name, done: false, started: Date.now(), ...options };
  if (id === 'snake') startSnake();
  else if (id === 'merge') startMerge();
  else if (id === 'mines') startMines();
  else startMaze();
  goTop();
}

// Snake: directions are queued once per step so quick input cannot reverse into the neck.
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
  s.queued = false;
  s.fruitCount = 0;
  s.running = false;
  s.rocks = [];
  if (s.mode === 'rocks')
    for (const p of shuffle(
      Array.from({ length: 400 }, (_, i) => ({ x: i % 20, y: Math.floor(i / 20) })),
    ).filter(
      (p) =>
        p.x > 0 && p.y > 0 && p.x < 19 && p.y < 19 && Math.abs(p.x - 5) + Math.abs(p.y - 10) > 5,
    )) {
      if (s.rocks.length === 18) break;
      if (s.rocks.every((q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) > 2)) s.rocks.push(p);
    }
  snakeFruit();
  renderSnake();
  arcadeClock(s);
  repeat(() => {
    if (state !== s || s.done) return;
    if (s.pausedAt || !s.running) {
      s.nextStep = Date.now() + s.speed;
      return;
    }
    if (Date.now() >= s.nextStep) {
      s.nextStep = Date.now() + s.speed;
      snakeStep();
    }
  }, 20);
}
function snakeFruit() {
  const s = state,
    used = new Set([...s.snake, ...s.rocks].map((p) => p.y * s.width + p.x)),
    free = [];
  for (let i = 0; i < s.width * s.width; i++) if (!used.has(i)) free.push(i);
  if (!free.length) {
    s.fruit = null;
    return false;
  }
  const i = free[randInt(free.length)];
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
        `<section class="panel arcade-panel"><div class="arcade-stage"><canvas id="snakeCanvas" width="600" height="600" role="img" aria-label="لوحة الثعبان. استخدم الأسهم أو الأزرار للتحرك."></canvas>${!s.running ? '<div class="arcade-overlay" id="snakeStart"><div><span class="arcade-big-icon">🐍</span><h3>جاهز للانطلاق؟</h3><p>اتجه نحو الفاكهة وابتعد عن جسمك.</p><button class="primary" onclick="snakeBegin()">ابدأ الحركة</button></div></div>' : ''}</div>${arcadeDirections('snakeTurn')}<p class="note center">${s.mode === 'wrap' ? 'البوابات مفتوحة: تعبر إلى الجهة المقابلة.' : s.mode === 'rocks' ? 'احذر الصخور والحواف.' : 'احذر الحواف.'} · الأسهم أو WASD · Space للإيقاف</p><div class="actions"><button onclick="showPause()">⏸ استراحة</button><button onclick="snakeEnd('حفظت جولتك 🐍')">احفظ نتيجتي</button><button class="quiet" onclick="setup('snake')">جولة جديدة</button></div></section>`,
    ),
  );
  snakeDraw();
  arcadeSwipe($('snakeCanvas'), snakeTurn);
}
function snakeBegin() {
  if (!arcadeReady('snake') || state.running) return;
  state.running = true;
  state.started = Date.now();
  state.nextStep = Date.now() + state.speed;
  $('snakeStart')?.remove();
}
function snakeTurn(dir) {
  if (!arcadeReady('snake') || !arcadeDelta[dir]) return;
  const s = state,
    a = arcadeDelta[dir],
    b = arcadeDelta[s.direction];
  if (s.queued || (a[0] + b[0] === 0 && a[1] + b[1] === 0)) return;
  s.nextDirection = dir;
  s.queued = true;
  if (!s.running) snakeBegin();
}
function snakeStep() {
  if (!arcadeReady('snake')) return;
  const s = state;
  s.direction = s.nextDirection;
  s.queued = false;
  const [dx, dy] = arcadeDelta[s.direction],
    head = { x: s.snake[0].x + dx, y: s.snake[0].y + dy };
  if (s.mode === 'wrap') {
    head.x = (head.x + s.width) % s.width;
    head.y = (head.y + s.width) % s.width;
  } else if (head.x < 0 || head.y < 0 || head.x >= s.width || head.y >= s.width)
    return snakeEnd('اصطدمت بالحافة 🐍');
  const eat = s.fruit && head.x === s.fruit.x && head.y === s.fruit.y,
    body = eat ? s.snake : s.snake.slice(0, -1);
  if ([...body, ...s.rocks].some((p) => p.x === head.x && p.y === head.y))
    return snakeEnd(
      s.rocks.some((p) => p.x === head.x && p.y === head.y)
        ? 'اصطدمت بصخرة 🪨'
        : 'اصطدمت بجسم الثعبان 🐍',
    );
  s.snake.unshift(head);
  if (!eat) s.snake.pop();
  else {
    s.fruitCount++;
    tone();
    if (!snakeFruit()) return snakeEnd('ملأت العالم كله! 🏆', true);
    $('snakeFruitCount').textContent = s.fruitCount;
    $('snakeLength').textContent = s.snake.length;
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
  if (s.fruit) {
    c.fillStyle = '#ffac8b';
    c.beginPath();
    c.arc((s.fruit.x + 0.5) * u, (s.fruit.y + 0.5) * u, u * 0.34, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#bcf7b5';
    c.fillRect((s.fruit.x + 0.52) * u, (s.fruit.y + 0.08) * u, 6, 9);
  }
  s.snake.forEach((p, i) => {
    c.fillStyle = i === 0 ? '#d8ffd4' : '#73d7a5';
    c.fillRect(p.x * u + 2, p.y * u + 2, u - 4, u - 4);
  });
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
}
function snakeEnd(title, full = false) {
  if (screen !== 'snake' || !state || state.done) return;
  const s = state,
    points = full ? 100 : Math.min(100, s.fruitCount * ({ 240: 3, 150: 5, 90: 7 }[s.speed] || 5));
  finishExtra(
    title,
    `جمعت ${s.fruitCount} فاكهة، ووصل طولك إلى ${s.snake.length} خلال ${arcadeTimeText(s.running ? arcadeSeconds(s) : 0)}.`,
    points,
  );
}

// 2048: pure slide/merge, one snapshot per effective move, and no spawn on no-op moves.
function mergeSlide(board, dir) {
  const next = [...board];
  let gained = 0;
  const merged = [];
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, k) =>
        dir === 'left'
          ? line * 4 + k
          : dir === 'right'
            ? line * 4 + 3 - k
            : dir === 'up'
              ? k * 4 + line
              : (3 - k) * 4 + line,
      ),
      values = indices.map((i) => board[i]).filter(Boolean),
      out = [];
    for (let k = 0; k < values.length; k++) {
      if (values[k] === values[k + 1]) {
        const v = values[k] * 2;
        out.push(v);
        gained += v;
        merged.push(indices[out.length - 1]);
        k++;
      } else out.push(values[k]);
    }
    indices.forEach((i, k) => (next[i] = out[k] || 0));
  }
  return { board: next, gained, merged, changed: next.some((v, i) => v !== board[i]) };
}
function mergeSpawn(s = state) {
  const free = s.board.map((v, i) => (v ? null : i)).filter((i) => i !== null);
  if (!free.length) return -1;
  const i = free[randInt(free.length)];
  s.board[i] = randInt(10) === 0 ? 4 : 2;
  return i;
}
function mergePossible(board) {
  return ['left', 'right', 'up', 'down'].some((d) => mergeSlide(board, d).changed);
}
function startMerge() {
  const s = state;
  s.board = Array(16).fill(0);
  s.score = 0;
  s.moves = 0;
  s.history = null;
  s.won = false;
  s.continuing = false;
  s.over = false;
  s.newTile = -1;
  s.merged = [];
  mergeSpawn(s);
  mergeSpawn(s);
  renderMerge();
  arcadeClock(s);
}
function mergeBoardHTML(s = state) {
  return `<div id="mergeBoard" class="merge-board" role="img" aria-label="لوحة 2048: ${s.board.map((v) => v || 'فارغة').join('، ')}">${s.board.map((v, i) => `<div class="merge-cell ${v ? 'has-number' : ''} ${i === s.newTile ? 'tile-new' : ''} ${s.merged.includes(i) ? 'tile-merged' : ''}" data-value="${v}" style="--tile-level:${v ? Math.min(11, Math.log2(v)) : 0}">${v ? `<b class="${v >= 1024 ? 'compact' : ''}">${v}</b>` : ''}</div>`).join('')}</div>`;
}
function renderMerge() {
  const s = state;
  setHTML(
    wrap(
      'merge',
      smallStats([
        ['نقاط الدمج', fmt(s.score)],
        ['أكبر قطعة', Math.max(...s.board)],
        ['الحركات', s.moves],
      ]) +
        `<section class="panel arcade-panel"><div class="arcade-stage">${mergeBoardHTML(s)}${s.over || (s.won && !s.continuing) ? `<div class="arcade-overlay"><div><span class="arcade-big-icon">${s.over ? '🧱' : '🏆'}</span><h3>${s.over ? 'لا توجد حركة متاحة' : 'وصلت إلى 2048!'}</h3><p>${s.over ? 'تراجع عن الحركة الأخيرة أو احفظ نتيجتك.' : 'واصل اللعب للوصول إلى 4096 وما بعده.'}</p><div class="actions">${s.over ? `<button onclick="mergeUndo()" ${!s.history ? 'disabled' : ''}>↶ تراجع</button>` : '<button class="primary" onclick="mergeContinue()">واصل اللعب</button>'}<button onclick="mergeEnd()">احفظ النتيجة</button></div></div></div>` : ''}</div>${arcadeDirections('mergeMove')}<div class="actions"><button onclick="mergeUndo()" ${!s.history ? 'disabled' : ''}>↶ تراجع عن الحركة</button><button onclick="mergeEnd()">احفظ نتيجتي</button></div>${arcadeToolbar('merge')}<p class="note center">السحب أو الأسهم أو WASD · كل حركة تضيف قطعة واحدة فقط.</p></section>`,
    ),
  );
  arcadeSwipe($('mergeBoard'), mergeMove);
}
function mergeMove(dir) {
  if (!arcadeReady('merge') || !arcadeDelta[dir] || state.over || (state.won && !state.continuing))
    return;
  const s = state,
    move = mergeSlide(s.board, dir);
  if (!move.changed) return;
  s.history = {
    board: [...s.board],
    score: s.score,
    moves: s.moves,
    won: s.won,
    continuing: s.continuing,
  };
  s.board = move.board;
  s.score += move.gained;
  s.moves++;
  s.merged = move.merged;
  s.newTile = mergeSpawn(s);
  if (s.board.some((v) => v >= 2048)) s.won = true;
  s.over = !mergePossible(s.board);
  if (move.gained) tone();
  renderMerge();
}
function mergeUndo() {
  if (!arcadeReady('merge') || !state.history) return;
  const s = state,
    h = s.history;
  Object.assign(s, h);
  s.history = null;
  s.over = false;
  s.newTile = -1;
  s.merged = [];
  renderMerge();
}
function mergeContinue() {
  if (!arcadeReady('merge') || !state.won || state.over) return;
  state.continuing = true;
  renderMerge();
}
function mergeEnd() {
  if (!arcadeReady('merge')) return;
  const s = state,
    points = s.won ? 100 : Math.min(95, Math.floor(s.score / 20)),
    snapshot = mergeBoardHTML(s);
  finishExtra(
    s.won ? 'بطل الدمج 🏆' : 'انتهت جولة الدمج',
    `جمعت ${fmt(s.score)} نقطة دمج خلال ${s.moves} حركة. أكبر قطعة: ${Math.max(...s.board)}.`,
    points,
  );
  $('app')
    .querySelector('.play')
    .insertAdjacentHTML(
      'beforeend',
      `<section class="panel arcade-panel"><h3 class="center">لوحتك الأخيرة</h3>${snapshot}</section>`,
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
  s.flagMode = false;
  s.generated = false;
  s.clockRunning = false;
  s.selected = 0;
  s.exploded = -1;
  renderMines();
  arcadeClock(s);
}
function mineGenerate(first) {
  const s = state,
    avoid = new Set([first, ...mineNeighbours(first, s.size)]),
    free = shuffle(s.board.map((_, i) => i).filter((i) => !avoid.has(i)));
  s.mines = new Set(free.slice(0, s.mineCount));
  s.board = s.board.map((_, i) =>
    s.mines.has(i) ? -1 : mineNeighbours(i, s.size).filter((j) => s.mines.has(j)).length,
  );
  s.generated = true;
  s.clockRunning = true;
  s.started = Date.now();
}
function minesBoardHTML(s = state, final = false) {
  return `<div class="mines-scroll"><div class="mines-board ${s.size === 16 ? 'mines-large' : s.size === 12 ? 'mines-medium' : ''}" style="--mine-size:${s.size}" role="group" aria-label="حقل الألغام">${s.board
    .map((v, i) => {
      const open = s.revealed.has(i),
        flag = s.flags.has(i),
        bomb = final && s.mines.has(i),
        wrong = final && flag && !s.mines.has(i);
      return `<button class="mine-cell ${open ? 'revealed' : ''} ${bomb ? 'mine-bomb' : ''} ${i === s.exploded ? 'exploded' : ''} ${flag ? 'flagged' : ''}" ${final ? 'disabled' : `onclick="mineTap(${i})" oncontextmenu="event.preventDefault();mineFlag(${i})"`} tabindex="${!final && s.selected === i ? '0' : '-1'}" data-index="${i}" data-count="${v}" aria-label="صف ${Math.floor(i / s.size) + 1}، عمود ${(i % s.size) + 1}: ${bomb ? 'لغم' : wrong ? 'علم غير صحيح' : flag ? 'علم' : open ? (v ? 'مكشوفة، ' + v + ' ألغام مجاورة' : 'خانة خالية') : 'مغلقة'}">${bomb ? '✹' : wrong ? '✕' : flag ? '⚑' : open && v > 0 ? v : ''}</button>`;
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
        `<section class="panel arcade-panel"><div class="mine-mode"><button class="${!s.flagMode ? 'primary' : ''}" onclick="mineMode(false)" aria-pressed="${!s.flagMode}">🔍 كشف الخانات</button><button class="${s.flagMode ? 'warm' : ''}" onclick="mineMode(true)" aria-pressed="${s.flagMode}">⚑ وضع الأعلام</button></div>${minesBoardHTML(s)}<p class="note center">${s.flagMode ? 'وضع الأعلام: اضغط خانة مغلقة لوضع علم أو إزالته.' : 'اضغط للكشف. اضغط رقماً مكشوفاً لفتح الجيران بعد وضع أعلامه.'}<br>الفأرة اليمنى أو F للأعلام · الأسهم للتنقل · Enter للكشف.</p>${arcadeToolbar('mines')}</section>`,
    ),
  );
  const board = document.querySelector('.mines-scroll');
  board.scrollLeft = scrollLeft;
  board.scrollTop = scrollTop;
  if (restoreFocus)
    document
      .querySelector(`.mine-cell[data-index="${s.selected}"]`)
      ?.focus({ preventScroll: true });
}
function mineMode(flag) {
  if (!arcadeReady('mines')) return;
  state.flagMode = flag;
  renderMines();
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
  s.selected = i;
  if (s.flags.has(i)) s.flags.delete(i);
  else if (s.flags.size < s.mineCount) s.flags.add(i);
  else return toast('استخدمت كل الأعلام. أزل علماً لوضعه هنا.');
  renderMines();
}
function mineTap(i) {
  if (!arcadeReady('mines') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  const s = state;
  s.selected = i;
  if (s.flagMode && !s.revealed.has(i)) return mineFlag(i);
  if (s.flags.has(i)) return;
  if (!s.generated) mineGenerate(i);
  if (s.revealed.has(i)) {
    const neighbours = mineNeighbours(i, s.size);
    if (s.board[i] > 0 && neighbours.filter((j) => s.flags.has(j)).length === s.board[i]) {
      for (const j of neighbours)
        if (!s.flags.has(j) && !s.revealed.has(j)) {
          if (!mineReveal(j)) return;
        }
    }
  } else if (!mineReveal(i)) return;
  if (s.revealed.size === s.board.length - s.mineCount) return mineFinish(true);
  renderMines();
}
function mineReveal(i) {
  const s = state;
  if (s.mines.has(i)) {
    s.exploded = i;
    mineFinish(false);
    return false;
  }
  const queue = [i];
  for (let k = 0; k < queue.length; k++) {
    const j = queue[k];
    if (s.revealed.has(j) || s.flags.has(j) || s.mines.has(j)) continue;
    s.revealed.add(j);
    if (s.board[j] === 0)
      for (const v of mineNeighbours(j, s.size))
        if (!s.revealed.has(v) && !s.flags.has(v) && !s.mines.has(v)) queue.push(v);
  }
  return true;
}
function mineFinish(win) {
  if (screen !== 'mines' || !state || state.done) return;
  const s = state,
    snapshot = minesBoardHTML(s, true),
    points = win
      ? { 8: 70, 12: 90, 16: 100 }[s.size]
      : Math.min(20, Math.floor((s.revealed.size / (s.board.length - s.mineCount)) * 20));
  finishExtra(
    win ? 'نظّفت الحقل كله! 🏆' : 'عثرت على لغم 💣',
    win
      ? `كشفت جميع الخانات الآمنة خلال ${arcadeTimeText(arcadeSeconds(s))}.`
      : `كشفت ${s.revealed.size} خانة آمنة. الأعلام الخاطئة تظهر بعلامة × في الحقل.`,
    points,
  );
  $('app')
    .querySelector('.play')
    .insertAdjacentHTML(
      'beforeend',
      `<section class="panel arcade-panel"><h3 class="center">الحقل بعد الجولة</h3>${snapshot}</section>`,
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
      options = shuffle(Object.values(arcadeDelta))
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
function mazePath(grid, width, from, to) {
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
      if (xx >= 0 && yy >= 0 && xx < width && yy < width && !grid[j] && !parents.has(j)) {
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
function startMaze() {
  const s = state;
  s.size = [7, 10, 15].includes(s.size) ? s.size : 10;
  Object.assign(s, mazeGenerate(s.size));
  s.position = s.width + 1;
  s.exit = (s.width - 2) * s.width + s.width - 2;
  s.moves = 0;
  s.hints = 0;
  s.hintPath = [];
  s.trail = new Set([s.position]);
  const options = shuffle(
    s.grid
      .map((v, i) => (v ? null : i))
      .filter((i) => i !== null && i !== s.position && i !== s.exit),
  );
  s.stars = new Set(s.mode === 'stars' ? options.slice(0, { 7: 3, 10: 5, 15: 7 }[s.size]) : []);
  s.starTotal = s.stars.size;
  renderMaze();
  arcadeClock(s);
}
function renderMaze() {
  const s = state;
  setHTML(
    wrap(
      'maze',
      smallStats([
        ['النجوم', s.starTotal - s.stars.size + ' / ' + s.starTotal, 'mazeStars'],
        ['الخطوات', s.moves, 'mazeMoves'],
        ['الوقت', '0:00', 'arcadeTime'],
      ]) +
        `<section class="panel arcade-panel"><canvas id="mazeCanvas" width="620" height="620" role="img" aria-label="متاهة. موقعك هو الدائرة الزرقاء. اجمع النجوم الصفراء ثم اتجه إلى المخرج الأخضر."></canvas><div class="arcade-status" id="mazeStatus" role="status">${s.stars.size ? 'اجمع النجوم قبل الوصول إلى المخرج.' : 'البوابة مفتوحة. اتجه إلى المخرج الأخضر!'}</div>${arcadeDirections('mazeMove')}<div class="actions"><button id="mazeHintButton" onclick="mazeHint()">✦ تلميح (${3 - s.hints} متبقية)</button><button onclick="mazeClearTrail()">امسح آثار خطواتي</button></div>${arcadeToolbar('maze')}<p class="note center">الأزرق: أنت · الأصفر: نجمة · الأخضر: المخرج<br>السحب أو الأسهم أو WASD · الآثار تساعدك تعرف الأماكن التي زرتها.</p></section>`,
    ),
  );
  mazeDraw();
  arcadeSwipe($('mazeCanvas'), mazeMove);
}
function mazeMove(dir) {
  if (!arcadeReady('maze') || !arcadeDelta[dir]) return;
  const s = state,
    [dx, dy] = arcadeDelta[dir],
    x = (s.position % s.width) + dx,
    y = Math.floor(s.position / s.width) + dy;
  if (x < 0 || y < 0 || x >= s.width || y >= s.width) return;
  const i = y * s.width + x;
  if (s.grid[i]) return;
  s.position = i;
  s.moves++;
  s.trail.add(i);
  // Keep the remaining route visible while following it; leaving the route clears it.
  s.hintPath = s.hintPath[1] === i ? s.hintPath.slice(1) : [];
  if (s.stars.delete(i)) {
    tone();
    $('mazeStars').textContent = s.starTotal - s.stars.size + ' / ' + s.starTotal;
  }
  $('mazeMoves').textContent = s.moves;
  if (i === s.exit && s.stars.size === 0) return mazeFinish();
  $('mazeStatus').textContent =
    i === s.exit && s.stars.size
      ? `البوابة تنتظرك. بقيت ${s.stars.size} نجوم.`
      : s.stars.size
        ? 'اجمع النجوم قبل الوصول إلى المخرج.'
        : 'البوابة مفتوحة. اتجه إلى المخرج الأخضر!';
  mazeDraw();
}
function mazeDraw() {
  const canvas = $('mazeCanvas');
  if (!canvas) return;
  const s = state,
    c = canvas.getContext('2d'),
    u = canvas.width / s.width;
  c.fillStyle = '#101c2b';
  c.fillRect(0, 0, 620, 620);
  for (let i = 0; i < s.grid.length; i++) {
    const x = (i % s.width) * u,
      y = Math.floor(i / s.width) * u;
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
  c.fillStyle = s.stars.size ? '#496553' : '#a7f1a6';
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
  for (const i of s.stars)
    c.fillText('★', ((i % s.width) + 0.5) * u, (Math.floor(i / s.width) + 0.5) * u);
  c.fillStyle = '#90dbff';
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
}
function mazeHint() {
  if (!arcadeReady('maze') || state.hints >= 3) return;
  const s = state,
    targets = s.stars.size ? [...s.stars] : [s.exit],
    paths = targets
      .map((t) => mazePath(s.grid, s.width, s.position, t))
      .filter((p) => p.length)
      .sort((a, b) => a.length - b.length);
  if (!paths.length) return;
  s.hints++;
  s.hintPath = paths[0];
  const b = $('mazeHintButton');
  b.textContent = `✦ تلميح (${3 - s.hints} متبقية)`;
  b.disabled = s.hints >= 3;
  $('mazeStatus').textContent = s.stars.size
    ? 'المسار البنفسجي يصل إلى أقرب نجمة.'
    : 'المسار البنفسجي يصل إلى المخرج.';
  mazeDraw();
}
function mazeClearTrail() {
  if (!arcadeReady('maze')) return;
  state.trail = new Set([state.position]);
  mazeDraw();
}
function mazeFinish() {
  const s = state;
  finishExtra(
    'وصلت إلى المخرج! 🧭',
    `جمعت ${s.starTotal} نجوم، وخرجت خلال ${s.moves} خطوة و${arcadeTimeText(arcadeSeconds(s))}. استخدمت ${s.hints} تلميحات.`,
    Math.max(10, { 7: 70, 10: 85, 15: 100 }[s.size] - s.hints * 8),
  );
}

document.addEventListener('keydown', (e) => {
  if (
    !arcadeIDs.has(screen) ||
    !arcadeReady(screen) ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.isComposing ||
    e.target.closest?.('input,select,textarea,[contenteditable="true"]')
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
    if (screen === 'snake') snakeTurn(dir);
    else if (screen === 'merge') {
      if (!e.repeat) mergeMove(dir);
    } else mazeMove(dir);
  }
  if (screen === 'merge' && e.key.toLowerCase() === 'z' && !e.repeat) {
    e.preventDefault();
    mergeUndo();
  }
});

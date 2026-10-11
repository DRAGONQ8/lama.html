// Procedural logic laboratory. Every puzzle is generated locally and checked.
const labIDs = new Set(['nonogram', 'lights', 'pipes']);
games.push(
  [
    'nonogram',
    '▦',
    'لوحة المنطق',
    'حوّل أرقام الصفوف والأعمدة إلى صورة، في ألغاز جديدة بحل واحد.',
    'بروحك',
    '#bcaeff',
  ],
  [
    'lights',
    '💡',
    'طفّي الأنوار',
    'كل ضغطة تغيّر خمسة أضواء. فكّر بخطوتك واطفئ اللوحة كاملة.',
    'بروحك',
    '#ffdb8c',
  ],
  [
    'pipes',
    '🔧',
    'مهندس الأنابيب',
    'دوّر القطع، وصّل الشبكة بالمصدر وأغلق جميع الفتحات.',
    'بروحك',
    '#97e3ed',
  ],
);
for (const id of labIDs) gameWorld[id] = 'brain';
Object.assign(gameGuides, {
  nonogram: [
    'الأرقام فوق الأعمدة وعلى يسار الصفوف تصف مجموعات الخانات المعبأة بالترتيب. بين كل مجموعتين خانة فارغة على الأقل.',
    'ابدأ بالصفوف الطويلة. بدّل بين التعبئة والشطب والمسح، أو استخدم F وX وC. الخانات المعلّمة بـ ◆ معطاة لتضمن حلاً واحداً. التلميح يكشف خانة ويخصم 8 نقاط.',
  ],
  lights: [
    'اطفئ جميع الأنوار. الضغط يغيّر حالة الخانة والخانات المجاورة لها أعلى وأسفل ويمين ويسار.',
    'ترتيب الضغطات لا يغيّر النتيجة، والضغط مرتين يلغي نفسه. كل لوحة قابلة للحل. التلميح يحدد ضغطة ضمن أقصر حل من وضعك الحالي ويخصم 8 نقاط.',
  ],
  pipes: [
    'دوّر كل قطعة حتى تصل جميع الخانات بالمصدر دون أي فتحة إلى الحافة أو إلى جانب مغلق.',
    'ابدأ بالزوايا وقطع النهاية. اللمس يدور حسب الوضع المختار؛ الفأرة اليمنى تدور بالعكس. الأزرق والنقطة المضيئة يعنيان الاتصال بالمصدر. التلميح يضبط قطعة واحدة ويخصم 8 نقاط.',
  ],
});
const labPreviousSetup = setup;
setup = function (id, internal = false) {
  if (!labIDs.has(id)) return labPreviousSetup(id, internal);
  clearTimers();
  removePause();
  closeModal(true);
  if (!internal) {
    tourney = null;
    dailyRun = null;
  }
  recordRecent(id);
  screen = 'setup';
  state = { id };
  const introduction = {
    nonogram:
      'لغز الصورة المنطقية: كل رقم يمثل طول مجموعة متصلة من الخانات المعبّأة. اكتشف أماكن المجموعات باستخدام الصفوف والأعمدة معاً.',
    lights:
      'تحدّي بسيط في شكله وعميق في حلّه: اضغط مصباحاً فيتغيّر هو وجيرانه الأربعة. هدفك أن تصبح جميع الأنوار مطفأة.',
    pipes:
      'شبكة كاملة فقدت اتجاهاتها! دوّر الأنابيب حتى تتصل جميع القطع بالمصدر، دون تسريب أو أي فتحة غير موصولة.',
  }[id];
  const levels = {
    nonogram: ['5×5 · بداية', '7×7 · تفكير', '9×9 · خبير'],
    lights: ['4×4 · بداية', '5×5 · تركيز', '6×6 · خبير'],
    pipes: ['4×4 · بداية', '5×5 · شبكة كبيرة', '6×6 · مهندس'],
  }[id];
  const note = {
    nonogram:
      'يفحص المولّد الحلول قبل اللعب، ويضيف خانات معطاة عند الحاجة لضمان حل واحد. تستطيع ترك الخانات الفارغة بلا شطب؛ يكفي أن تتطابق التعبئة مع جميع الأرقام.',
    lights:
      'تُبنى اللوحة من ضغطات قانونية على لوحة مطفأة، لذلك لها حل دائماً. يمكنك التراجع دون حد عملي؛ التراجع لا يلغي خصم التلميحات.',
    pipes:
      'تُبنى شبكة متصلة أولاً ثم تختلط اتجاهاتها. أي شبكة متصلة بلا فتحات تقبل كحل، حتى لو اختلفت عن ترتيب المولّد.',
  }[id];
  const fixed = dailyRun || tourney?.active;
  setHTML(
    wrap(
      id,
      `<section class="panel"><p class="muted">${introduction}</p><div class="fields"><div class="field full"><label for="labLevel">المستوى وحجم اللوحة</label><select id="labLevel" ${fixed ? 'disabled' : ''}>${['easy', 'normal', 'hard'].map((value, i) => `<option value="${value}" ${i === 1 ? 'selected' : ''}>${levels[i]}</option>`).join('')}</select></div>${playerField()}</div><div class="hintpanel">${note}</div><div class="actions"><button class="primary" onclick="startLab('${id}')">ابدأ لغزاً جديداً ←</button></div><p class="note">الوقت يتوقف أثناء الاستراحة. الأسهم للتنقل وEnter للعب. النقاط تحفظ مرة واحدة عند إكمال اللغز.</p></section>`,
    ),
  );
  goTop();
};
function labReady(id = state?.id) {
  return labIDs.has(id) && screen === id && state?.id === id && !state.done && !advancedBlocked();
}
function labRand(n, s = state) {
  return s.rng ? Math.floor(s.rng() * n) : randInt(n);
}
function labShuffle(values, s = state) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = labRand(i + 1, s);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function labTime(s = state) {
  const seconds = Math.max(0, Math.floor(((s.pausedAt || Date.now()) - s.started) / 1000));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function startLab(id) {
  if (screen !== 'setup' || state?.id !== id || !labIDs.has(id) || !$('modalback').hidden) return;
  const name = player(),
    fixed = !!(dailyRun || tourney?.active);
  const requestedLevel = fixed ? 'normal' : $('labLevel')?.value;
  const level = ['easy', 'normal', 'hard'].includes(requestedLevel) ? requestedLevel : 'normal';
  clearTimers();
  state = {
    id,
    name,
    level,
    done: false,
    moves: 0,
    hints: 0,
    selected: 0,
    history: [],
    message: '',
    mode: id === 'nonogram' ? 'fill' : 'clockwise',
    rng: dailyRun
      ? makeSeed(dailyRun.date + ':' + id)
      : tourney?.active
        ? makeSeed(tourney.seed + ':' + id)
        : null,
  };
  screen = id;
  if (id === 'nonogram') labNewNonogram();
  else if (id === 'lights') labNewLights();
  else labNewPipes();
  state.started = Date.now();
  renderLab();
  const s = state;
  repeat(() => {
    if (state === s && !s.done && $('labTime')) $('labTime').textContent = labTime(s);
  }, 500);
  goTop();
}
function labRemember() {
  state.history.push([...state.board]);
  if (state.history.length > 200) state.history.shift();
}
function labUndo() {
  if (!labReady() || !state.history.length) return;
  state.board = state.history.pop();
  state.hintCell = -1;
  state.message = 'تم التراجع. عدد الحركات وخصم التلميحات يبقيان للمقارنة العادلة.';
  renderLab();
}
function labReset() {
  if (!labReady() || state.board.every((v, i) => v === state.initial[i])) return;
  labRemember();
  state.board = [...state.initial];
  state.hintCell = -1;
  state.message = 'عادت اللوحة إلى البداية. تستطيع التراجع عن إعادة الضبط.';
  renderLab();
}
function labFinish(title, text) {
  if (!labReady()) return;
  const s = state,
    elapsed = Math.max(0, Math.floor((Date.now() - s.started) / 1000));
  const baseline =
    s.id === 'lights'
      ? s.parMoves
      : s.id === 'pipes'
        ? s.parMoves
        : s.answer.filter(Boolean).length;
  const efficiencyPenalty = Math.floor(Math.max(0, s.moves - baseline) / 4);
  const points = Math.max(
    20,
    { easy: 85, normal: 115, hard: 145 }[s.level] -
      s.hints * 8 -
      efficiencyPenalty -
      Math.floor(elapsed / 45),
  );
  s.done = true;
  s.points = points;
  clearTimers();
  addScore(s.name, points);
  result(
    s.id,
    title,
    esc(
      `${text} ${s.moves} حركة · ${labTime(s)} · ${s.hints} تلميح. ${s.id === 'lights' ? 'أقصر حل البداية: ' + s.parMoves + ' ضغطات.' : ''}`,
    ),
    points,
  );
}
function labToolbar() {
  return `<div class="lab-tools"><button id="labUndo" onclick="labUndo()" ${state.history.length ? '' : 'disabled'}>↶ تراجع</button><button id="labHint" onclick="labHint()">✦ تلميح <small>−8</small></button><button id="labReset" onclick="labReset()">↺ البداية</button></div><div id="labMessage" class="lab-message" role="status" aria-live="polite">${esc(state.message || 'فكّر براحتك؛ لا يوجد حد للوقت.')}</div>`;
}
function renderLab() {
  const s = state;
  if (!s || s.done || !labIDs.has(s.id) || screen !== s.id) return;
  const oldFocus = document.activeElement;
  const focusCell = oldFocus?.classList?.contains('lab-cell');
  const focusID =
    oldFocus?.id && oldFocus.closest?.('[data-game="' + s.id + '"]') ? oldFocus.id : null;
  let body = '',
    progress;
  if (s.id === 'nonogram') {
    const filled = s.board.filter((v) => v === 1).length;
    progress = ['التعبئة', `<span dir="ltr">${filled} / ${s.answer.filter(Boolean).length}</span>`];
    body = labNonogramHTML();
  } else if (s.id === 'lights') {
    progress = [
      'أنوار مضاءة',
      `<span dir="ltr">${s.board.filter(Boolean).length} / ${s.board.length}</span>`,
    ];
    body = labLightsHTML();
  } else {
    const analysis = labPipeAnalysis(s.board, s.size, s.source);
    progress = [
      'متصل بالمصدر',
      `<span dir="ltr">${analysis.connected.size} / ${s.board.length}</span>`,
    ];
    body = labPipesHTML(analysis);
  }
  setHTML(
    wrap(
      s.id,
      smallStats([progress, ['الحركات', s.moves], ['الوقت', labTime(s), 'labTime']]) +
        `<section class="panel lab-panel">${body}${labToolbar()}</section>`,
    ),
  );
  if (focusCell)
    $('labBoard')?.querySelector(`[data-index="${s.selected}"]`)?.focus({ preventScroll: true });
  else if (focusID) $(focusID)?.focus({ preventScroll: true });
}
function labSelect(i, focus = false) {
  if (!labReady() || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  state.selected = i;
  $('labBoard')
    ?.querySelectorAll('.lab-cell')
    .forEach((cell) => {
      const selected = Number(cell.dataset.index) === i;
      cell.tabIndex = selected ? 0 : -1;
      cell.classList.toggle('lab-selected', selected);
    });
  if (focus) $('labBoard')?.querySelector(`[data-index="${i}"]`)?.focus({ preventScroll: true });
}
function labMode(mode) {
  if (
    !labReady() ||
    !(state.id === 'nonogram' ? ['fill', 'cross', 'clear'] : ['clockwise', 'counter']).includes(
      mode,
    )
  )
    return;
  state.mode = mode;
  renderLab();
}
function labCellAttributes(i, description) {
  const s = state;
  return `type="button" data-index="${i}" tabindex="${s.selected === i ? '0' : '-1'}" onfocus="labSelect(${i})" aria-label="صف ${Math.floor(i / s.size) + 1}، عمود ${(i % s.size) + 1}: ${esc(description)}"`;
}
// Nonogram constraint solver: line domains, fixed-point deductions, bounded search.
function labRuns(values) {
  const runs = [];
  let count = 0;
  for (const value of [...values, 0]) {
    if (value) count++;
    else if (count) {
      runs.push(count);
      count = 0;
    }
  }
  return runs.length ? runs : [0];
}
function labLinePatterns(size, clues) {
  if (clues.length === 1 && clues[0] === 0) return [Array(size).fill(0)];
  const out = [];
  function place(k, start, cells) {
    if (k === clues.length) {
      out.push(cells);
      return;
    }
    const required = clues.slice(k).reduce((a, b) => a + b, 0) + clues.length - k - 1;
    for (let at = start; at <= size - required; at++) {
      const next = [...cells];
      for (let j = at; j < at + clues[k]; j++) next[j] = 1;
      place(k + 1, at + clues[k] + 1, next);
    }
  }
  place(0, 0, Array(size).fill(0));
  return out;
}
function labNonogramSolve(rows, columns, givens, maxNodes = 5000) {
  const n = rows.length,
    solutions = [];
  let nodes = 0,
    exhausted = false;
  const rowDomains = rows.map((r) => labLinePatterns(n, r));
  const colDomains = columns.map((c) => labLinePatterns(n, c));
  function visit(grid, rDomains, cDomains) {
    if (solutions.length >= 2 || exhausted) return;
    if (++nodes > maxNodes) {
      exhausted = true;
      return;
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (let axis = 0; axis < 2; axis++) {
        const domains = axis ? cDomains : rDomains;
        for (let line = 0; line < n; line++) {
          const indices = Array.from({ length: n }, (_, k) => (axis ? k * n + line : line * n + k));
          const options = domains[line].filter((pattern) =>
            indices.every((i, k) => grid[i] === -1 || grid[i] === pattern[k]),
          );
          if (!options.length) return;
          domains[line] = options;
          for (let k = 0; k < n; k++) {
            const first = options[0][k],
              i = indices[k];
            if (grid[i] === -1 && options.every((p) => p[k] === first)) {
              grid[i] = first;
              changed = true;
            }
          }
        }
      }
    }
    if (!grid.includes(-1)) {
      solutions.push(grid);
      return;
    }
    let bestAxis = 0,
      bestLine = -1,
      bestSize = Infinity;
    for (let axis = 0; axis < 2; axis++) {
      const domains = axis ? cDomains : rDomains;
      for (let line = 0; line < n; line++)
        if (domains[line].length > 1 && domains[line].length < bestSize) {
          bestSize = domains[line].length;
          bestLine = line;
          bestAxis = axis;
        }
    }
    if (bestLine < 0) return;
    for (const pattern of (bestAxis ? cDomains : rDomains)[bestLine]) {
      const copy = [...grid];
      for (let k = 0; k < n; k++) copy[bestAxis ? k * n + bestLine : bestLine * n + k] = pattern[k];
      visit(
        copy,
        rDomains.map((d) => [...d]),
        cDomains.map((d) => [...d]),
      );
      if (solutions.length >= 2 || exhausted) return;
    }
  }
  visit([...givens], rowDomains, colDomains);
  return { solutions, exhausted, nodes };
}
function labNewNonogram() {
  const s = state,
    n = { easy: 5, normal: 7, hard: 9 }[s.level];
  s.size = n;
  // Symmetric motifs with small variations give a different drawing every round.
  s.answer = Array(n * n).fill(0);
  const motif = labRand(4, s);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const mid = (n - 1) / 2;
      const base =
        motif === 0
          ? Math.abs(r - mid) + Math.abs(c - mid) <= mid
          : motif === 1
            ? Math.abs(c - mid) <= 1 || r === mid
            : motif === 2
              ? r === c || r + c === n - 1 || r === 0 || r === n - 1
              : labRand(100, s) < 52;
      s.answer[r * n + c] = Number(labRand(100, s) < 18 ? !base : base);
    }
  if (!s.answer.includes(1)) s.answer[Math.floor((n * n) / 2)] = 1;
  s.rowClues = Array.from({ length: n }, (_, r) => labRuns(s.answer.slice(r * n, (r + 1) * n)));
  s.colClues = Array.from({ length: n }, (_, c) =>
    labRuns(Array.from({ length: n }, (_, r) => s.answer[r * n + c])),
  );
  const givens = Array(n * n).fill(-1);
  const filledCells = s.answer.map((v, i) => i).filter((i) => s.answer[i]);
  const reserved = filledCells[labRand(filledCells.length, s)];
  // If more than one solution exists, reveal a distinguishing square and retry.
  // A capped search falls back to an additional correct given, never a false claim.
  for (let attempt = 0; attempt < n * n; attempt++) {
    const check = labNonogramSolve(s.rowClues, s.colClues, givens);
    if (!check.exhausted && check.solutions.length === 1) break;
    const candidates = givens
      .map((v, i) => i)
      .filter(
        (i) =>
          givens[i] === -1 &&
          i !== reserved &&
          (check.solutions.length < 2 || check.solutions[0][i] !== check.solutions[1][i]),
      );
    const remaining = candidates.length
      ? candidates
      : givens.map((v, i) => i).filter((i) => givens[i] === -1 && i !== reserved);
    const i = remaining[labRand(remaining.length, s)];
    givens[i] = s.answer[i];
  }
  s.fixed = givens.map((v) => v !== -1);
  s.board = givens.map((v) => (v === -1 ? 0 : v === 1 ? 1 : 2));
  s.initial = [...s.board];
  s.selected = s.fixed.findIndex((v) => !v);
  if (s.selected < 0) s.selected = 0;
  s.message = s.fixed.some(Boolean)
    ? `${s.fixed.filter(Boolean).length} خانات معطاة بعلامة ◆ لضمان حل واحد. الأرقام تُقرأ من اليسار لليمين ومن الأعلى للأسفل.`
    : 'حل واحد تم التحقق منه. ابدأ بالأرقام الطويلة، واترك خانة بين كل مجموعتين.';
}
function labClueDone(values, clues) {
  return JSON.stringify(labRuns(values.map((v) => Number(v === 1)))) === JSON.stringify(clues);
}
function labNonogramHTML() {
  const s = state,
    n = s.size;
  return `<div class="lab-mode" aria-label="أداة الرسم">${[
    ['fill', '■ تعبئة'],
    ['cross', '× شطب'],
    ['clear', '○ مسح'],
  ]
    .map(
      ([mode, label]) =>
        `<button id="labMode-${mode}" class="${s.mode === mode ? 'primary' : ''}" aria-pressed="${s.mode === mode}" onclick="labMode('${mode}')">${label}</button>`,
    )
    .join(
      '',
    )}</div><div class="lab-scroll"><div id="labBoard" class="lab-nonogram" style="--lab-n:${n}" role="group" aria-label="لوحة المنطق"><div class="lab-clue-corner" aria-hidden="true">▦</div>${s.colClues
    .map(
      (clues, c) =>
        `<div class="lab-clue lab-col-clue ${
          labClueDone(
            Array.from({ length: n }, (_, r) => s.board[r * n + c]),
            clues,
          )
            ? 'lab-clue-done'
            : ''
        }" aria-label="عمود ${c + 1}: ${clues.join('، ')}">${clues.map((v) => `<span>${v}</span>`).join('')}</div>`,
    )
    .join('')}${s.rowClues
    .map(
      (clues, r) =>
        `<div class="lab-clue lab-row-clue ${clues.length >= 4 ? 'lab-clue-tight' : ''} ${labClueDone(s.board.slice(r * n, (r + 1) * n), clues) ? 'lab-clue-done' : ''}" aria-label="صف ${r + 1}: ${clues.join('، ')}">${clues.join(' ')}</div>${Array.from(
          { length: n },
          (_, c) => {
            const i = r * n + c,
              v = s.board[i],
              fixed = s.fixed[i];
            return `<button class="lab-cell lab-pixel ${v === 1 ? 'lab-filled' : v === 2 ? 'lab-crossed' : ''} ${fixed ? 'lab-fixed' : ''} ${s.selected === i ? 'lab-selected' : ''}" ${labCellAttributes(i, (v === 1 ? 'معبأة' : v === 2 ? 'فارغة مؤكدة' : 'غير محددة') + (fixed ? '، معطاة ثابتة' : ''))} ${fixed ? 'aria-disabled="true"' : ''} aria-pressed="${v === 1}" onclick="labNonogramTap(${i})" oncontextmenu="event.preventDefault();labNonogramTap(${i},'cross')"><span aria-hidden="true">${v === 2 ? '×' : ''}</span>${fixed ? '<small aria-hidden="true">◆</small>' : ''}</button>`;
          },
        ).join('')}`,
    )
    .join(
      '',
    )}</div></div><p class="note center">${n}×${n} · ◆ خانة معطاة · الشطب اختياري للفوز<br>F تعبئة · X شطب · C مسح · الفأرة اليمنى للشطب${n === 9 ? '<br>على الهاتف، اسحب اللوحة أفقياً لرؤية جميع الأعمدة.' : ''}</p>`;
}
function labNonogramTap(i, override = null) {
  if (
    !labReady('nonogram') ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= state.board.length ||
    state.fixed[i]
  )
    return;
  const s = state,
    mode = override || s.mode,
    value = mode === 'fill' ? 1 : mode === 'cross' ? 2 : 0;
  const next = mode === 'clear' ? 0 : s.board[i] === value ? 0 : value;
  if (s.board[i] === next) return;
  labRemember();
  s.board[i] = next;
  s.moves++;
  s.selected = i;
  s.message = '';
  if (labNonogramWon(s)) return labFinish('اكتملت لوحة المنطق!', 'تطابقت جميع الصفوف والأعمدة.');
  renderLab();
}
function labNonogramWon(s = state) {
  return (
    s.rowClues.every((clue, r) => labClueDone(s.board.slice(r * s.size, (r + 1) * s.size), clue)) &&
    s.colClues.every((clue, c) =>
      labClueDone(
        Array.from({ length: s.size }, (_, r) => s.board[r * s.size + c]),
        clue,
      ),
    )
  );
}
// Lights Out is solved over GF(2). Nullspace enumeration finds the minimum presses.
function labNeighbours(i, n) {
  const r = Math.floor(i / n),
    c = i % n,
    out = [i];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}
function labToggleLights(board, i, n) {
  for (const j of labNeighbours(i, n)) board[j] ^= 1;
}
function labBitCount(value) {
  let count = 0;
  while (value) {
    value &= value - 1n;
    count++;
  }
  return count;
}
function labLightsSolve(board, n) {
  const count = n * n,
    rhs = 1n << BigInt(count);
  const rows = Array.from({ length: count }, (_, i) =>
    labNeighbours(i, n).reduce((mask, j) => mask | (1n << BigInt(j)), board[i] ? rhs : 0n),
  );
  const pivots = [];
  let rank = 0;
  for (let c = 0; c < count; c++) {
    const bit = 1n << BigInt(c),
      found = rows.findIndex((row, r) => r >= rank && !!(row & bit));
    if (found < 0) continue;
    [rows[rank], rows[found]] = [rows[found], rows[rank]];
    for (let r = 0; r < count; r++) if (r !== rank && rows[r] & bit) rows[r] ^= rows[rank];
    pivots.push(c);
    rank++;
  }
  if (rows.slice(rank).some((row) => row === rhs)) return null;
  let solution = 0n;
  for (let r = 0; r < rank; r++) if (rows[r] & rhs) solution |= 1n << BigInt(pivots[r]);
  const free = Array.from({ length: count }, (_, i) => i).filter((i) => !pivots.includes(i));
  const basis = free.map((c) => {
    const bit = 1n << BigInt(c);
    let vector = bit;
    for (let r = 0; r < rank; r++) if (rows[r] & bit) vector |= 1n << BigInt(pivots[r]);
    return vector;
  });
  let best = solution,
    bestCount = labBitCount(best);
  // Supported boards 4×4, 5×5 and 6×6 have at most four free variables.
  for (let combination = 1; combination < 2 ** basis.length; combination++) {
    let candidate = solution;
    for (let k = 0; k < basis.length; k++) if (combination & (2 ** k)) candidate ^= basis[k];
    const presses = labBitCount(candidate);
    if (presses < bestCount) {
      best = candidate;
      bestCount = presses;
    }
  }
  return Array.from({ length: count }, (_, i) => i).filter((i) => !!(best & (1n << BigInt(i))));
}
function labNewLights() {
  const s = state;
  s.size = { easy: 4, normal: 5, hard: 6 }[s.level];
  s.board = Array(s.size * s.size).fill(0);
  const candidates = labShuffle(
    s.board.map((_, i) => i),
    s,
  );
  const scrambleCount = { easy: 7, normal: 13, hard: 19 }[s.level];
  for (const i of candidates.slice(0, scrambleCount)) labToggleLights(s.board, i, s.size);
  if (!s.board.some(Boolean)) labToggleLights(s.board, labRand(s.board.length, s), s.size);
  s.initial = [...s.board];
  s.parMoves = labLightsSolve(s.board, s.size).length;
  s.hintCell = -1;
  s.message = 'اطفئ جميع الأنوار. كل ضغطة تؤثر في الخانة وجيرانها الأربعة.';
}
function labLightsHTML() {
  const s = state;
  return `<div class="lab-lights-caption"><span>☀ مضاء</span><span>· مطفأ</span><span>✦ ضغطة مقترحة</span></div><div id="labBoard" class="lab-square lab-lights" style="--lab-n:${s.size}" role="group" aria-label="لوحة الأنوار">${s.board.map((value, i) => `<button class="lab-cell lab-light ${value ? 'lab-lit' : ''} ${s.selected === i ? 'lab-selected' : ''} ${s.hintCell === i ? 'lab-hinted' : ''}" ${labCellAttributes(i, (value ? 'مصباح مضاء' : 'مصباح مطفأ') + (s.hintCell === i ? '، ضغطة مقترحة' : ''))} aria-pressed="${!!value}" onclick="labLightsTap(${i})"><span aria-hidden="true">${value ? '☀' : '·'}</span>${s.hintCell === i ? '<small aria-hidden="true">✦</small>' : ''}</button>`).join('')}</div><p class="note center">${s.size}×${s.size} · الضغط يغيّر الخانة وأعلى وأسفل ويمين ويسار<br>الضغط مرتين يلغي نفسه. اطفئ كل مصباح للفوز.</p>`;
}
function labLightsTap(i) {
  if (!labReady('lights') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  const s = state;
  labRemember();
  labToggleLights(s.board, i, s.size);
  s.moves++;
  s.selected = i;
  s.hintCell = -1;
  s.message = '';
  if (!s.board.some(Boolean)) return labFinish('انطفأت جميع الأنوار!', 'فككت شبكة الأضواء بنجاح.');
  renderLab();
}
// Pipe ports: north=1, east=2, south=4, west=8. Rotation preserves the tile.
const labPipeDirections = [
  [-1, 0, 1, 4, 'أعلى'],
  [0, 1, 2, 8, 'يمين'],
  [1, 0, 4, 1, 'أسفل'],
  [0, -1, 8, 2, 'يسار'],
];
function labRotatePipe(mask, direction = 1) {
  return direction === 1 ? ((mask << 1) & 15) | (mask >> 3) : (mask >> 1) | ((mask & 1) << 3);
}
function labPipeAnalysis(board, n, source) {
  const connected = new Set([source]),
    queue = [source];
  let leaks = 0;
  for (let i = 0; i < board.length; i++) {
    const r = Math.floor(i / n),
      c = i % n;
    for (const [dr, dc, bit, opposite] of labPipeDirections)
      if (board[i] & bit) {
        const rr = r + dr,
          cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || !(board[rr * n + cc] & opposite)) leaks++;
      }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const i = queue[cursor],
      r = Math.floor(i / n),
      c = i % n;
    for (const [dr, dc, bit, opposite] of labPipeDirections)
      if (board[i] & bit) {
        const rr = r + dr,
          cc = c + dc,
          j = rr * n + cc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && board[j] & opposite && !connected.has(j)) {
          connected.add(j);
          queue.push(j);
        }
      }
  }
  return { connected, leaks, solved: leaks === 0 && connected.size === board.length };
}
function labNewPipes() {
  const s = state;
  s.size = { easy: 4, normal: 5, hard: 6 }[s.level];
  const n = s.size;
  s.source = Math.floor(n / 2) * n + Math.floor(n / 2);
  s.answer = Array(n * n).fill(0);
  const visited = new Set([s.source]),
    stack = [s.source];
  while (stack.length) {
    const i = stack[stack.length - 1],
      r = Math.floor(i / n),
      c = i % n;
    const possible = labPipeDirections.filter(
      ([dr, dc]) =>
        r + dr >= 0 &&
        r + dr < n &&
        c + dc >= 0 &&
        c + dc < n &&
        !visited.has((r + dr) * n + c + dc),
    );
    if (!possible.length) {
      stack.pop();
      continue;
    }
    const [dr, dc, bit, opposite] = possible[labRand(possible.length, s)],
      j = (r + dr) * n + c + dc;
    s.answer[i] |= bit;
    s.answer[j] |= opposite;
    visited.add(j);
    stack.push(j);
  }
  s.board = s.answer.map((mask) => {
    const turns = labRand(4, s);
    for (let k = 0; k < turns; k++) mask = labRotatePipe(mask);
    return mask;
  });
  if (labPipeAnalysis(s.board, n, s.source).solved) {
    const i = s.board.findIndex((mask) => mask !== 15);
    s.board[i] = labRotatePipe(s.board[i]);
  }
  s.parMoves = s.board.reduce((count, mask, i) => {
    let rotations = 0;
    while (mask !== s.answer[i] && rotations < 4) {
      mask = labRotatePipe(mask);
      rotations++;
    }
    return count + Math.min(rotations, 4 - rotations);
  }, 0);
  s.initial = [...s.board];
  s.hintCell = -1;
  s.message = 'المصدر في الخانة المعلّمة بقطرة. وصّل جميع القطع وأغلق كل فتحة.';
}
function labPipeSVG(mask, live, source) {
  const ends = [
    [1, 50, 0],
    [2, 100, 50],
    [4, 50, 100],
    [8, 0, 50],
  ];
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g class="lab-pipe-track">${ends
    .filter(([bit]) => mask & bit)
    .map(([, x, y]) => `<path d="M50 50 L${x} ${y}"/>`)
    .join('')}</g><g class="lab-pipe-water ${live ? 'lab-water-on' : ''}">${ends
    .filter(([bit]) => mask & bit)
    .map(([, x, y]) => `<path d="M50 50 L${x} ${y}"/>`)
    .join(
      '',
    )}</g><circle cx="50" cy="50" r="${source ? 18 : 10}" class="lab-pipe-hub"/>${source ? '<path class="lab-source-drop" d="M50 36 C46 43 42 48 42 52 A8 8 0 0 0 58 52 C58 48 54 43 50 36Z"/>' : live ? '<circle cx="50" cy="50" r="4" class="lab-live-dot"/>' : ''}</svg>`;
}
function labPipesHTML(analysis) {
  const s = state;
  return `<div class="lab-mode" aria-label="اتجاه التدوير">${[
    ['clockwise', '↻ مع الساعة'],
    ['counter', '↺ عكس الساعة'],
  ]
    .map(
      ([mode, label]) =>
        `<button id="labMode-${mode}" class="${s.mode === mode ? 'primary' : ''}" onclick="labMode('${mode}')" aria-pressed="${s.mode === mode}">${label}</button>`,
    )
    .join(
      '',
    )}</div><div class="lab-pipe-status"><span>💧 المصدر</span><span>${analysis.leaks} فتحة غير موصولة</span><span>● متصل بالمصدر</span></div><div id="labBoard" class="lab-square lab-pipes" style="--lab-n:${s.size}" role="group" aria-label="شبكة الأنابيب">${s.board
    .map(
      (mask, i) =>
        `<button class="lab-cell lab-pipe ${analysis.connected.has(i) ? 'lab-connected' : ''} ${i === s.source ? 'lab-source' : ''} ${s.selected === i ? 'lab-selected' : ''} ${s.hintCell === i ? 'lab-hinted' : ''}" ${labCellAttributes(
          i,
          (i === s.source ? 'المصدر، ' : '') +
            'فتحات: ' +
            labPipeDirections
              .filter(([, , bit]) => mask & bit)
              .map(([, , , , name]) => name)
              .join('، ') +
            (analysis.connected.has(i) ? '، متصلة بالمصدر' : '، غير متصلة'),
        )} onclick="labPipesTap(${i})" oncontextmenu="event.preventDefault();labPipesTap(${i},-1)">${labPipeSVG(mask, analysis.connected.has(i), i === s.source)}${s.hintCell === i ? '<small class="lab-pipe-hint" aria-hidden="true">✦</small>' : ''}</button>`,
    )
    .join(
      '',
    )}</div><p class="note center">أي ترتيب يربط جميع القطع بلا فتحات يعتبر حلاً<br>R للتدوير · Shift+R للعكس · الفأرة اليمنى للعكس</p>`;
}
function labPipesTap(i, override = null) {
  if (!labReady('pipes') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  const s = state,
    direction = override || (s.mode === 'counter' ? -1 : 1),
    next = labRotatePipe(s.board[i], direction);
  if (s.board[i] === next) return;
  labRemember();
  s.board[i] = next;
  s.moves++;
  s.selected = i;
  s.hintCell = -1;
  s.message = '';
  if (labPipeAnalysis(s.board, s.size, s.source).solved)
    return labFinish('شبكة بلا تسريب!', 'اتصلت كل الأنابيب بالمصدر وأُغلقت جميع الفتحات.');
  renderLab();
}
function labHint() {
  if (!labReady()) return;
  const s = state;
  if (s.id === 'nonogram') {
    const candidates = s.board
      .map((v, i) => i)
      .filter((i) => !s.fixed[i] && s.board[i] !== (s.answer[i] ? 1 : 2));
    if (!candidates.length) return;
    const i = candidates.includes(s.selected) ? s.selected : candidates[0];
    labRemember();
    s.board[i] = s.answer[i] ? 1 : 2;
    s.selected = i;
    s.hints++;
    s.hintCell = i;
    s.message = `كشف التلميح الصف ${Math.floor(i / s.size) + 1}، العمود ${(i % s.size) + 1}: ${s.answer[i] ? 'تعبئة' : 'خانة فارغة'}. خصم 8 نقاط.`;
    if (labNonogramWon(s)) return labFinish('اكتملت لوحة المنطق!', 'تطابقت جميع الصفوف والأعمدة.');
  } else if (s.id === 'lights') {
    const solution = labLightsSolve(s.board, s.size);
    if (!solution?.length) return;
    const signature = s.board.join('');
    if (s.hintSignature !== signature) {
      s.hints++;
      s.hintSignature = signature;
    }
    s.hintCell = solution[0];
    s.selected = solution[0];
    s.message = `اضغط الخانة المعلّمة ✦: الصف ${Math.floor(solution[0] / s.size) + 1}، العمود ${(solution[0] % s.size) + 1}. أقصر حل الآن ${solution.length} ضغطات. إعادة هذا التلميح قبل تغيير اللوحة لا تخصم مجدداً.`;
  } else {
    const candidates = s.board.map((v, i) => i).filter((i) => s.board[i] !== s.answer[i]);
    if (!candidates.length) return;
    const i = candidates.includes(s.selected) ? s.selected : candidates[0];
    labRemember();
    s.board[i] = s.answer[i];
    s.hints++;
    s.selected = i;
    s.hintCell = i;
    s.message = `ضُبطت قطعة الصف ${Math.floor(i / s.size) + 1}، العمود ${(i % s.size) + 1} حسب الشبكة الأصلية. خصم 8 نقاط.`;
    if (labPipeAnalysis(s.board, s.size, s.source).solved)
      return labFinish('شبكة بلا تسريب!', 'اتصلت كل الأنابيب بالمصدر وأُغلقت جميع الفتحات.');
  }
  renderLab();
}
document.addEventListener('keydown', (event) => {
  if (
    !labReady() ||
    event.repeat ||
    event.target?.matches?.('input,textarea,select,[contenteditable="true"]')
  )
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    labUndo();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const onBoard = !!event.target?.closest?.('#labBoard');
  if (!onBoard) return;
  const s = state,
    r = Math.floor(s.selected / s.size),
    c = s.selected % s.size;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const next =
      event.key === 'ArrowUp' && r > 0
        ? s.selected - s.size
        : event.key === 'ArrowDown' && r < s.size - 1
          ? s.selected + s.size
          : event.key === 'ArrowLeft' && c > 0
            ? s.selected - 1
            : event.key === 'ArrowRight' && c < s.size - 1
              ? s.selected + 1
              : s.selected;
    labSelect(next, true);
  } else if (s.id === 'nonogram' && ['f', 'x', 'c'].includes(event.key.toLowerCase())) {
    event.preventDefault();
    labNonogramTap(s.selected, { f: 'fill', x: 'cross', c: 'clear' }[event.key.toLowerCase()]);
  } else if (s.id === 'pipes' && event.key.toLowerCase() === 'r') {
    event.preventDefault();
    labPipesTap(s.selected, event.shiftKey ? -1 : 1);
  }
});

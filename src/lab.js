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
    'ابدأ بالصفوف الطويلة. بدّل بين التعبئة والشطب والمسح، أو استخدم F وX وC. عدسة الحركة تقارن ترتيبات الصف والعمود قبل التنفيذ. الأخضر يعني اكتمال الأرقام؛ علامة ! تعني تعارضاً مع علاماتك. التلميح يشرح استنتاج خانة ويخصم 8 نقاط عند تطبيقه.',
  ],
  lights: [
    'اطفئ جميع الأنوار. الضغط يغيّر حالة الخانة والخانات المجاورة لها أعلى وأسفل ويمين ويسار.',
    'ترتيب الضغطات لا يغيّر النتيجة، والضغط مرتين يلغي نفسه. وضع التخطيط يسمح بتجربة مجموعة ضغطات قبل تنفيذها؛ اعرض نتيجة الخطة لتراها على اللوحة. عدسة الحركة تفصل الأنوار التي تنطفئ والتي تضيء. التلميح يحدد ضغطة ضمن أقصر حل ويخصم 8 نقاط.',
  ],
  pipes: [
    'دوّر كل قطعة حتى تصل جميع الخانات بالمصدر دون أي فتحة إلى الحافة أو إلى جانب مغلق.',
    'ابدأ بالزوايا وقطع النهاية. اللمس يدور حسب الوضع المختار؛ الفأرة اليمنى تدور بالعكس. عدسة الحركة تقارن التسريب والاتصال قبل التدوير. ثبّت القطع التي تأكدت منها بزر التثبيت أو L؛ يمكنك التراجع عن التثبيت. التلميح يبدأ باستنتاجات الشبكة ويخصم 8 نقاط عند ضبط قطعة.',
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
      'تُبنى اللوحة من ضغطات قانونية على لوحة مطفأة، لذلك لها حل دائماً. جرّب الضغطات في وضع التخطيط ثم نفّذها معاً. التراجع والإعادة يحفظان عدد الحركات وخصم التلميحات.',
    pipes:
      'تُبنى شبكة متصلة أولاً ثم تختلط اتجاهاتها. تظهر الفتحات غير الموصولة على كل قطعة؛ ويمكنك تثبيت اختياراتك. أي شبكة متصلة بلا فتحات تقبل كحل، حتى لو اختلفت عن ترتيب المولّد.',
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
  const seconds = labSeconds(s);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
function labSeconds(s = state) {
  return Math.max(0, Math.floor(((s.pausedAt || s.finishedAt || Date.now()) - s.started) / 1000));
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
    future: [],
    message: '',
    lensOpen: false,
    planPreview: false,
    mode: id === 'nonogram' ? 'fill' : id === 'lights' ? 'play' : 'clockwise',
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
  state.history.push(labSnapshot());
  if (state.history.length > 200) state.history.shift();
  state.future = [];
}
function labSnapshot() {
  const board = [...state.board];
  if (state.pipeLocked) board.pipeLocked = [...state.pipeLocked];
  return board;
}
function labRestore(snapshot) {
  state.board = [...snapshot];
  if (snapshot.pipeLocked) state.pipeLocked = [...snapshot.pipeLocked];
}
function labUndo() {
  if (!labReady() || !state.history.length) return;
  state.future ||= [];
  state.future.push(labSnapshot());
  labRestore(state.history.pop());
  if (state.plan) state.plan.fill(false);
  state.hintCell = -1;
  state.message = 'تم التراجع. عدد الحركات وخصم التلميحات يبقيان للمقارنة العادلة.';
  renderLab();
}
function labRedo() {
  if (!labReady() || !state.future?.length) return;
  state.history.push(labSnapshot());
  labRestore(state.future.pop());
  if (state.plan) state.plan.fill(false);
  state.hintCell = -1;
  state.message = 'تمت إعادة الحركة بدون احتسابها مرة ثانية.';
  if (labCheckWin()) return;
  renderLab();
}
function labCheckWin() {
  const s = state;
  if (s.id === 'nonogram' && labNonogramWon(s)) {
    labFinish('اكتملت لوحة المنطق!', 'تطابقت جميع الصفوف والأعمدة.');
    return true;
  }
  if (s.id === 'lights' && !s.board.some(Boolean)) {
    labFinish('انطفأت جميع الأنوار!', 'فككت شبكة الأضواء بنجاح.');
    return true;
  }
  if (s.id === 'pipes' && labPipeAnalysis(s.board, s.size, s.source).solved) {
    labFinish('شبكة بلا تسريب!', 'اتصلت كل الأنابيب بالمصدر وأُغلقت جميع الفتحات.');
    return true;
  }
  return false;
}
function labReset() {
  if (!labReady()) return;
  const unchanged = state.board.every((v, i) => v === state.initial[i]);
  if (unchanged && !state.pipeLocked?.some(Boolean)) {
    if (state.plan?.some(Boolean)) labClearPlan();
    return;
  }
  labRemember();
  state.board = [...state.initial];
  if (state.plan) state.plan.fill(false);
  if (state.pipeLocked) state.pipeLocked.fill(false);
  state.hintCell = -1;
  state.message = 'عادت اللوحة إلى البداية. تستطيع التراجع عن إعادة الضبط.';
  renderLab();
}
function labFinish(title, text) {
  if (!labReady()) return;
  const s = state,
    elapsed = labSeconds(s);
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
  s.finishedAt = Date.now();
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
  return `<div class="lab-tools"><button id="labUndo" onclick="labUndo()" ${state.history.length ? '' : 'disabled'}>↶ تراجع</button><button id="labRedo" onclick="labRedo()" ${state.future?.length ? '' : 'disabled'}>↷ إعادة</button><button id="labHint" onclick="labHint()">✦ تلميح <small>−8</small></button><button id="labReset" onclick="labReset()">↺ البداية</button></div><div id="labMessage" class="lab-message" role="status" aria-live="polite">${esc(state.message || 'فكّر براحتك؛ لا يوجد حد للوقت.')}</div>`;
}
// The optional lens compares legal moves using visible board data only.
// It never reads generated answers, spends hints, or changes the live board.
function labToggleLens() {
  if (!labReady()) return;
  state.lensOpen = !state.lensOpen;
  renderLab();
}
function labMoveLensData(s = state) {
  const i = s.selected,
    row = Math.floor(i / s.size),
    column = i % s.size;
  if (s.id === 'nonogram') {
    const value = { fill: 1, cross: 2, clear: 0 }[s.mode],
      next = s.fixed[i] ? s.board[i] : s.mode === 'clear' ? 0 : s.board[i] === value ? 0 : value,
      before = [
        labLineAnalysis(s.board.slice(row * s.size, (row + 1) * s.size), s.rowClues[row]),
        labLineAnalysis(
          Array.from({ length: s.size }, (_, r) => s.board[r * s.size + column]),
          s.colClues[column],
        ),
      ],
      board = [...s.board];
    board[i] = next;
    const after = [
      labLineAnalysis(board.slice(row * s.size, (row + 1) * s.size), s.rowClues[row]),
      labLineAnalysis(
        Array.from({ length: s.size }, (_, r) => board[r * s.size + column]),
        s.colClues[column],
      ),
    ];
    return {
      kind: 'nonogram',
      label: s.fixed[i] ? 'خانة معطاة ثابتة' : ['مسح العلامة', 'تعبئة الخانة', 'شطب الخانة'][next],
      blocked: !!s.fixed[i] || next === s.board[i],
      before: before.map((line) => line.options.length),
      after: after.map((line) => line.options.length),
      clues: [s.rowClues[row], s.colClues[column]],
      conflict: after.some((line) => line.conflict),
    };
  }
  if (s.id === 'lights') {
    const before = s.mode === 'plan' ? labLightsProjected(s) : [...s.board],
      after = [...before],
      neighbours = labNeighbours(i, s.size);
    labToggleLights(after, i, s.size);
    return {
      kind: 'lights',
      label: s.mode === 'plan' ? (s.plan[i] ? 'احذف من الخطة' : 'أضف للخطة') : 'اضغط المصباح',
      before: before.filter(Boolean).length,
      after: after.filter(Boolean).length,
      off: neighbours.filter((j) => before[j]).length,
      on: neighbours.filter((j) => !before[j]).length,
      blocked: false,
    };
  }
  const direction = s.mode === 'counter' ? -1 : 1,
    board = [...s.board],
    before = labPipeAnalysis(board, s.size, s.source);
  board[i] = labRotatePipe(board[i], direction);
  const after = labPipeAnalysis(board, s.size, s.source);
  return {
    kind: 'pipes',
    label: direction === 1 ? 'دوّر مع الساعة' : 'دوّر عكس الساعة',
    blocked: !!s.pipeLocked[i] || board[i] === s.board[i],
    locked: !!s.pipeLocked[i],
    before: { leaks: before.leaks, connected: before.connected.size },
    after: { leaks: after.leaks, connected: after.connected.size },
    mask: board[i],
    leaking: after.leaking[i],
    connected: after.connected.has(i),
  };
}
function labMoveLensHTML() {
  const s = state;
  if (!s.lensOpen) return '';
  const data = labMoveLensData(s),
    coordinate = `الصف ${Math.floor(s.selected / s.size) + 1} · العمود ${(s.selected % s.size) + 1}`;
  let details;
  if (data.kind === 'nonogram') {
    details = `<div class="lab-lens-comparison">${['الصف', 'العمود'].map((axis, k) => `<div><span>${axis} <b dir="ltr">${data.clues[k].join('، ')}</b></span><strong dir="ltr">${data.before[k]} → ${data.after[k]}</strong><small>ترتيبات تسمح بها العلامات</small></div>`).join('')}</div><p>${data.conflict ? '! هذه الحركة تترك خطاً بلا ترتيب ممكن. تستطيع تنفيذها كمحاولة ثم التراجع.' : 'هذه المقارنة تختبر الخطين فقط؛ وجود ترتيبات ممكنة لا يثبت أن الخانة صحيحة.'}</p>`;
  } else if (data.kind === 'lights') {
    details = `<div class="lab-lens-comparison"><div><span>أنوار مضاءة</span><strong dir="ltr">${data.before} → ${data.after}</strong></div><div><span>أثر الضغطة</span><strong>${data.off} تنطفئ · ${data.on} تضيء</strong></div></div><p>${s.mode === 'plan' ? 'المقارنة تبدأ من نتيجة خطتك الحالية؛ الإضافة أو الحذف لا يغيّران اللوحة حتى التنفيذ.' : 'قلة الأنوار لا تعني دائماً قرب الحل. جرّب التخطيط لرؤية أثر أكثر من ضغطة معاً.'}</p>`;
  } else {
    details = `<div class="lab-lens-comparison"><div><span>فتحات غير موصولة</span><strong dir="ltr">${data.before.leaks} → ${data.after.leaks}</strong></div><div><span>قطع متصلة بالمصدر</span><strong dir="ltr">${data.before.connected} → ${data.after.connected}</strong></div></div><div class="lab-lens-pipe ${data.connected ? 'lab-connected' : ''} ${s.selected === s.source ? 'lab-source' : ''}" role="img" aria-label="اتجاه القطعة بعد الدوران: ${labPipeDirections
      .filter(([, , bit]) => data.mask & bit)
      .map(([, , , , name]) => name)
      .join(
        '، ',
      )}، ${labBitCount(BigInt(data.leaking))} فتحات غير موصولة">${labPipeSVG(data.mask, data.connected, s.selected === s.source, data.leaking)}</div><p>${data.locked ? 'القطعة مثبتة. فك التثبيت لمتابعة تجربة اتجاهها.' : 'المعاينة تخص دوراناً واحداً. قد تحتاج زيادة مؤقتة في التسريب لبناء الشبكة الصحيحة.'}</p>`;
  }
  return `<div class="lab-lens-content"><p>اضغط أي خانة لاختيارها للمعاينة، ثم نفّذ الحركة من الزر أدناه. أغلق العدسة للعودة للعب مباشرة.</p><b>${coordinate}</b><span class="lab-lens-action">${data.label}</span>${details}<button id="labLensApply" onclick="labApplyLensMove()" ${data.blocked ? 'disabled' : ''}>${data.kind === 'lights' && s.mode === 'plan' ? data.label : 'نفّذ الحركة المعاينة'}</button><small class="lab-lens-note">المعاينة لا تغيّر اللوحة ولا تستهلك تلميحاً.</small></div>`;
}
function labLensHTML() {
  return `<aside class="lab-lens"><button id="labLensToggle" class="lab-lens-toggle" aria-expanded="${!!state.lensOpen}" aria-controls="labLensContent" onclick="labToggleLens()">⌕ عدسة الحركة <span>${state.lensOpen ? 'إخفاء المعاينة' : 'جرّب قبل القرار'}</span></button><div id="labLensContent" ${state.lensOpen ? '' : 'hidden'}>${labMoveLensHTML()}</div></aside>`;
}
function labRefreshLens() {
  if (state.lensOpen && $('labLensContent')) $('labLensContent').innerHTML = labMoveLensHTML();
}
function labApplyLensMove() {
  if (!labReady() || !state.lensOpen || labMoveLensData().blocked) return;
  if (state.id === 'nonogram') labNonogramTap(state.selected, null, true);
  else if (state.id === 'lights') labLightsTap(state.selected, true);
  else labPipesTap(state.selected, null, true);
}
function labPreviewTap(i, mode = null) {
  if (!state.lensOpen) return false;
  state.selected = i;
  if (mode) state.mode = mode;
  state.message = 'الخانة محددة للمعاينة فقط. نفّذ من عدسة الحركة أو أغلقها للعب مباشرة.';
  renderLab();
  return true;
}
function renderLab() {
  const s = state;
  if (!s || s.done || !labIDs.has(s.id) || screen !== s.id) return;
  const oldFocus = document.activeElement;
  const horizontalScroll = $('labBoard')?.closest('.lab-scroll')?.scrollLeft;
  const focusCell = oldFocus?.classList?.contains('lab-cell');
  const focusID =
    oldFocus?.id && oldFocus.closest?.('[data-game="' + s.id + '"]') ? oldFocus.id : null;
  let body = '',
    progress;
  if (s.id === 'nonogram') {
    const analysis = labNonogramAnalysis(s);
    progress = ['خطوط مكتملة', `<span dir="ltr">${analysis.complete} / ${s.size * 2}</span>`];
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
        `<section class="panel lab-panel">${body}${labLensHTML()}${labToolbar()}</section>`,
    ),
  );
  const scroll = $('labBoard')?.closest('.lab-scroll');
  if (scroll && horizontalScroll !== undefined) scroll.scrollLeft = horizontalScroll;
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
  if (focus) {
    const cell = $('labBoard')?.querySelector(`[data-index="${i}"]`);
    cell?.focus({ preventScroll: true });
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
  if (state.id === 'nonogram')
    $('labBoard')
      ?.querySelectorAll('[data-lab-line]')
      .forEach((clue) => {
        const line = clue.dataset.labAxis === 'row' ? Math.floor(i / state.size) : i % state.size;
        clue.classList.toggle('lab-clue-selected', Number(clue.dataset.labLine) === line);
      });
  if (state.id === 'lights') labLightsPreview(i);
  if (state.id === 'pipes' && $('labLock')) {
    $('labLock').textContent = state.pipeLocked?.[i]
      ? '🔓 فك تثبيت القطعة'
      : '🔒 ثبّت القطعة المحددة';
    $('labLock').setAttribute('aria-pressed', String(!!state.pipeLocked?.[i]));
  }
  labRefreshLens();
}
function labMode(mode) {
  if (
    !labReady() ||
    !(
      state.id === 'nonogram'
        ? ['fill', 'cross', 'clear']
        : state.id === 'lights'
          ? ['play', 'plan']
          : ['clockwise', 'counter']
    ).includes(mode)
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
function labLineAnalysis(values, clues, patterns = labLinePatterns(values.length, clues)) {
  const options = patterns.filter((pattern) =>
    values.every((v, k) => v === 0 || Number(v === 1) === pattern[k]),
  );
  return {
    options,
    conflict: !options.length,
    complete: labClueDone(values, clues),
    forced: options.length
      ? values.flatMap((v, k) =>
          v === 0 && options.every((p) => p[k] === options[0][k])
            ? [{ position: k, value: options[0][k] }]
            : [],
        )
      : [],
  };
}
function labNonogramAnalysis(s = state) {
  s.linePatterns ||= {
    rows: s.rowClues.map((clues) => labLinePatterns(s.size, clues)),
    columns: s.colClues.map((clues) => labLinePatterns(s.size, clues)),
  };
  const rows = s.rowClues.map((clues, r) =>
    labLineAnalysis(s.board.slice(r * s.size, (r + 1) * s.size), clues, s.linePatterns.rows[r]),
  );
  const columns = s.colClues.map((clues, c) =>
    labLineAnalysis(
      Array.from({ length: s.size }, (_, r) => s.board[r * s.size + c]),
      clues,
      s.linePatterns.columns[c],
    ),
  );
  return {
    rows,
    columns,
    complete: [...rows, ...columns].filter((line) => line.complete).length,
    conflicts: [...rows, ...columns].filter((line) => line.conflict).length,
  };
}
function labCompleteLine(axis) {
  if (!labReady('nonogram') || !['row', 'column'].includes(axis)) return;
  const s = state,
    line = axis === 'row' ? Math.floor(s.selected / s.size) : s.selected % s.size,
    indices = Array.from({ length: s.size }, (_, k) =>
      axis === 'row' ? line * s.size + k : k * s.size + line,
    ),
    clues = axis === 'row' ? s.rowClues[line] : s.colClues[line];
  if (
    !labClueDone(
      indices.map((i) => s.board[i]),
      clues,
    )
  ) {
    s.message =
      'أكمل مجموعات التعبئة في الخط المحدد أولاً؛ هذه الأداة تشطب الباقي فقط ولا تكشف الحل.';
    return renderLab();
  }
  const empty = indices.filter((i) => s.board[i] === 0 && !s.fixed[i]);
  if (!empty.length) return;
  labRemember();
  for (const i of empty) s.board[i] = 2;
  s.moves++;
  s.hintCell = -1;
  s.message = `شُطبت ${empty.length} خانات في ${axis === 'row' ? 'الصف' : 'العمود'} ${line + 1} لأن مجموعات التعبئة اكتملت. تستطيع التراجع بخطوة واحدة.`;
  renderLab();
}
function labNonogramHTML() {
  const s = state,
    n = s.size,
    analysis = labNonogramAnalysis(s);
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
    )}</div><div class="lab-line-tools"><button onclick="labCompleteLine('row')">× شطب بقية الصف</button><button onclick="labCompleteLine('column')">× شطب بقية العمود</button></div><p class="lab-board-status" role="status">${analysis.conflicts ? `! ${analysis.conflicts} خطوط تتعارض مع علاماتك؛ راجع الأرقام الحمراء.` : '✓ الأرقام الخضراء مكتملة · ! الأرقام الحمراء تتعارض مع علاماتك'}</p><div class="lab-scroll"><div id="labBoard" class="lab-nonogram" style="--lab-n:${n}" role="group" aria-label="لوحة المنطق"><div class="lab-clue-corner" aria-hidden="true">▦</div>${s.colClues
    .map(
      (clues, c) =>
        `<div data-lab-axis="column" data-lab-line="${c}" class="lab-clue lab-col-clue ${s.selected % n === c ? 'lab-clue-selected' : ''} ${analysis.columns[c].conflict ? 'lab-clue-conflict' : ''} ${
          analysis.columns[c].complete ? 'lab-clue-done' : ''
        }" aria-label="عمود ${c + 1}: ${clues.join('، ')}${analysis.columns[c].conflict ? '، متعارض مع العلامات' : analysis.columns[c].complete ? '، مكتمل' : ''}">${analysis.columns[c].conflict ? '<small aria-hidden="true">!</small>' : ''}${clues.map((v) => `<span>${v}</span>`).join('')}</div>`,
    )
    .join('')}${s.rowClues
    .map(
      (clues, r) =>
        `<div data-lab-axis="row" data-lab-line="${r}" class="lab-clue lab-row-clue ${Math.floor(s.selected / n) === r ? 'lab-clue-selected' : ''} ${clues.length >= 4 ? 'lab-clue-tight' : ''} ${analysis.rows[r].conflict ? 'lab-clue-conflict' : ''} ${analysis.rows[r].complete ? 'lab-clue-done' : ''}" aria-label="صف ${r + 1}: ${clues.join('، ')}${analysis.rows[r].conflict ? '، متعارض مع العلامات' : analysis.rows[r].complete ? '، مكتمل' : ''}">${analysis.rows[r].conflict ? '<small aria-hidden="true">! </small>' : ''}${clues.join(' ')}</div>${Array.from(
          { length: n },
          (_, c) => {
            const i = r * n + c,
              v = s.board[i],
              fixed = s.fixed[i];
            return `<button class="lab-cell lab-pixel ${v === 1 ? 'lab-filled' : v === 2 ? 'lab-crossed' : ''} ${fixed ? 'lab-fixed' : ''} ${s.selected === i ? 'lab-selected' : ''} ${s.hintCell === i ? 'lab-hinted' : ''}" ${labCellAttributes(i, (v === 1 ? 'معبأة' : v === 2 ? 'فارغة مؤكدة' : 'غير محددة') + (fixed ? '، معطاة ثابتة' : ''))} ${fixed ? 'aria-disabled="true"' : ''} aria-pressed="${v === 1}" onclick="labNonogramTap(${i})" oncontextmenu="event.preventDefault();labNonogramTap(${i},'cross')"><span aria-hidden="true">${v === 2 ? '×' : ''}</span>${fixed ? '<small aria-hidden="true">◆</small>' : ''}</button>`;
          },
        ).join('')}`,
    )
    .join(
      '',
    )}</div></div><p class="note center">${n}×${n} · ◆ خانة معطاة · الشطب اختياري للفوز<br>F تعبئة · X شطب · C مسح · الفأرة اليمنى للشطب${n === 9 ? '<br>على الهاتف، اسحب اللوحة أفقياً لرؤية جميع الأعمدة.' : ''}</p>`;
}
function labNonogramTap(i, override = null, commit = false) {
  if (
    !labReady('nonogram') ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= state.board.length ||
    state.fixed[i]
  )
    return;
  if (!commit && labPreviewTap(i, override)) return;
  const s = state,
    mode = override || s.mode,
    value = mode === 'fill' ? 1 : mode === 'cross' ? 2 : 0;
  const next = mode === 'clear' ? 0 : s.board[i] === value ? 0 : value;
  if (s.board[i] === next) return;
  labRemember();
  s.board[i] = next;
  s.moves++;
  s.selected = i;
  s.hintCell = -1;
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
  const count = s.size * s.size,
    scrambleCount = { easy: 7, normal: 13, hard: 19 }[s.level],
    minimum = { easy: 4, normal: 8, hard: 12 }[s.level];
  let bestLength = -1;
  for (let attempt = 0; attempt < 24; attempt++) {
    const board = Array(count).fill(0),
      candidates = labShuffle(
        Array.from({ length: count }, (_, i) => i),
        s,
      );
    for (const i of candidates.slice(0, scrambleCount)) labToggleLights(board, i, s.size);
    const length = labLightsSolve(board, s.size).length;
    if (length > bestLength) {
      s.board = board;
      bestLength = length;
    }
    if (length >= minimum) break;
  }
  s.initial = [...s.board];
  s.parMoves = bestLength;
  s.plan = Array(count).fill(false);
  s.hintCell = -1;
  s.message = 'اطفئ جميع الأنوار. الإطار يوضح أثر الضغطة المحددة؛ جرّب وضع التخطيط قبل التنفيذ.';
}
function labLightsProjected(s = state) {
  const board = [...s.board];
  for (let i = 0; i < board.length; i++) if (s.plan?.[i]) labToggleLights(board, i, s.size);
  return board;
}
function labLightsPreview(i) {
  if (!labReady('lights') || i < 0 || i >= state.board.length) return;
  const s = state,
    affected = labNeighbours(i, s.size),
    board = s.mode === 'plan' ? labLightsProjected(s) : [...s.board];
  labToggleLights(board, i, s.size);
  $('labBoard')
    ?.querySelectorAll('.lab-cell')
    .forEach((cell) =>
      cell.classList.toggle('lab-affected', affected.includes(Number(cell.dataset.index))),
    );
  if ($('labPreviewMessage'))
    $('labPreviewMessage').textContent =
      `${s.mode === 'plan' ? (s.plan[i] ? 'إزالة' : 'إضافة') + ' هذا الاختيار من الخطة' : 'بعد الضغط على الخانة المحددة'}: ${board.filter(Boolean).length} أنوار مضاءة. قلة الأنوار لا تعني دائماً قرب الحل.`;
}
function labClearPlan() {
  if (!labReady('lights')) return;
  state.plan.fill(false);
  state.message = 'مُسحت الخطة؛ اللوحة الأصلية لم تتغير.';
  renderLab();
}
function labTogglePlanPreview() {
  if (!labReady('lights') || state.mode !== 'plan') return;
  state.planPreview = !state.planPreview;
  renderLab();
}
function labApplyPlan() {
  if (!labReady('lights')) return;
  const s = state,
    presses = s.plan.map((value, i) => (value ? i : -1)).filter((i) => i >= 0);
  if (!presses.length) return;
  labRemember();
  for (const i of presses) labToggleLights(s.board, i, s.size);
  s.moves += presses.length;
  s.selected = presses[presses.length - 1];
  s.plan.fill(false);
  s.mode = 'play';
  s.hintCell = -1;
  s.message = `نُفذت ${presses.length} ضغطات من خطتك. التراجع يعيد المجموعة كاملة.`;
  if (labCheckWin()) return;
  renderLab();
}
function labLightsHTML() {
  const s = state,
    planning = s.mode === 'plan',
    planned = s.plan.filter(Boolean).length,
    affected = labNeighbours(s.selected, s.size),
    preview = planning ? labLightsProjected(s) : [...s.board],
    showingPreview = planning && s.planPreview,
    displayBoard = showingPreview ? preview : s.board;
  const after = [...preview];
  labToggleLights(after, s.selected, s.size);
  return `<div class="lab-mode" aria-label="طريقة اللعب">${[
    ['play', '☀ اللعب'],
    ['plan', '✎ التخطيط'],
  ]
    .map(
      ([mode, label]) =>
        `<button id="labMode-${mode}" class="${s.mode === mode ? 'primary' : ''}" aria-pressed="${s.mode === mode}" onclick="labMode('${mode}')">${label}</button>`,
    )
    .join(
      '',
    )}</div>${planning ? `<div class="lab-plan-summary"><b>${planned} ضغطات مخططة · بعد الخطة ${preview.filter(Boolean).length} أنوار مضاءة</b><p>اختر الخانات التي تريد ضغطها. تكرار الاختيار يزيلها من الخطة؛ لا تُحسب حركة حتى التنفيذ.</p><div class="actions"><button id="labApplyPlan" class="primary" onclick="labApplyPlan()" ${planned ? '' : 'disabled'}>نفّذ الخطة</button><button id="labClearPlan" onclick="labClearPlan()" ${planned ? '' : 'disabled'}>امسح الخطة</button><button id="labPlanPreview" onclick="labTogglePlanPreview()" aria-pressed="${!!s.planPreview}" aria-controls="labBoard">${showingPreview ? 'اعرض اللوحة الحالية' : 'اعرض نتيجة الخطة'}</button></div></div>` : ''}<div class="lab-lights-caption"><span>☀ مضاء</span><span>· مطفأ</span><span>✦ ضغطة مقترحة</span>${planning ? '<span>↻ ضغطة في الخطة</span>' : ''}${showingPreview ? '<span>↑ يضيء · ↓ ينطفئ بعد الخطة</span>' : ''}</div>${showingPreview ? '<p class="lab-preview-banner" role="status">معاينة نتيجة الخطة — اللوحة الحالية محفوظة حتى تضغط «نفّذ الخطة».</p>' : ''}<div id="labBoard" class="lab-square lab-lights" style="--lab-n:${s.size}" role="group" aria-label="لوحة الأنوار${showingPreview ? '، معاينة نتيجة الخطة' : planning ? '، وضع التخطيط' : ''}">${displayBoard.map((value, i) => `<button class="lab-cell lab-light ${value ? 'lab-lit' : ''} ${s.selected === i ? 'lab-selected' : ''} ${affected.includes(i) ? 'lab-affected' : ''} ${s.hintCell === i ? 'lab-hinted' : ''} ${planning && s.plan[i] ? 'lab-planned' : ''} ${showingPreview && value !== s.board[i] ? 'lab-projected-change' : ''}" ${labCellAttributes(i, (value ? 'مصباح مضاء' : 'مصباح مطفأ') + (showingPreview ? ' بعد الخطة، حالياً ' + (s.board[i] ? 'مضاء' : 'مطفأ') : '') + (s.hintCell === i ? '، ضغطة مقترحة' : '') + (planning && s.plan[i] ? '، ضغطة في الخطة' : ''))} aria-pressed="${planning ? s.plan[i] : !!value}" onclick="labLightsTap(${i})" onpointerenter="labLightsPreview(${i})"><span aria-hidden="true">${value ? '☀' : '·'}</span>${showingPreview && value !== s.board[i] ? `<b class="lab-projected-mark" aria-hidden="true">${value ? '↑' : '↓'}</b>` : ''}${planning && s.plan[i] ? '<b class="lab-plan-mark" aria-hidden="true">↻</b>' : s.hintCell === i ? '<small aria-hidden="true">✦</small>' : ''}</button>`).join('')}</div><p id="labPreviewMessage" class="lab-board-status">${planning ? (s.plan[s.selected] ? 'إزالة' : 'إضافة') + ' هذا الاختيار من الخطة' : 'بعد الضغط على الخانة المحددة'}: ${after.filter(Boolean).length} أنوار مضاءة. قلة الأنوار لا تعني دائماً قرب الحل.</p><p class="note center">${s.size}×${s.size} · الضغط يغيّر الخانة وأعلى وأسفل ويمين ويسار<br>الضغط مرتين يلغي نفسه. اطفئ كل مصباح للفوز.</p>`;
}
function labLightsTap(i, commit = false) {
  if (!labReady('lights') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  if (!commit && labPreviewTap(i)) return;
  const s = state;
  if (s.mode === 'plan') {
    s.plan[i] = !s.plan[i];
    s.selected = i;
    s.message = 'هذه خطة تجريبية؛ نفّذها عندما تكون جاهزاً أو عدّل اختياراتك.';
    return renderLab();
  }
  labRemember();
  s.plan.fill(false);
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
    queue = [source],
    leaking = Array(board.length).fill(0);
  let leaks = 0;
  for (let i = 0; i < board.length; i++) {
    const r = Math.floor(i / n),
      c = i % n;
    for (const [dr, dc, bit, opposite] of labPipeDirections)
      if (board[i] & bit) {
        const rr = r + dr,
          cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || !(board[rr * n + cc] & opposite)) {
          leaks++;
          leaking[i] |= bit;
        }
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
  return { connected, leaks, leaking, solved: leaks === 0 && connected.size === board.length };
}
// Keep only orientations that agree with borders and neighboring orientations.
// User locks are hypotheses, not extra clues from the generated answer.
function labPipeDomains(board, n, locked = []) {
  const domains = board.map((mask, i) => {
    const orientations = [];
    for (let turn = 0; turn < 4; turn++) {
      if (!orientations.includes(mask)) orientations.push(mask);
      mask = labRotatePipe(mask);
    }
    return orientations.filter((value) => {
      if (locked[i] && value !== board[i]) return false;
      const r = Math.floor(i / n),
        c = i % n;
      return labPipeDirections.every(
        ([dr, dc, bit]) =>
          !(value & bit) || (r + dr >= 0 && r + dr < n && c + dc >= 0 && c + dc < n),
      );
    });
  });
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < board.length; i++) {
      const r = Math.floor(i / n),
        c = i % n;
      const options = domains[i].filter((mask) =>
        labPipeDirections.every(([dr, dc, bit, opposite]) => {
          const rr = r + dr,
            cc = c + dc;
          return (
            rr < 0 ||
            rr >= n ||
            cc < 0 ||
            cc >= n ||
            domains[rr * n + cc].some((neighbor) => !!(mask & bit) === !!(neighbor & opposite))
          );
        }),
      );
      if (options.length !== domains[i].length) {
        domains[i] = options;
        changed = true;
      }
    }
  }
  return domains;
}
function labTogglePipeLock(i = state?.selected) {
  if (!labReady('pipes') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  labRemember();
  state.pipeLocked[i] = !state.pipeLocked[i];
  state.selected = i;
  state.message = state.pipeLocked[i]
    ? 'ثُبّتت القطعة كاختيار منك، ويمكن فكها بأي وقت. التثبيت لا يؤكد صحة اتجاهها.'
    : 'فُك تثبيت القطعة؛ تستطيع تدويرها من جديد.';
  renderLab();
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
  s.pipeLocked = Array(s.board.length).fill(false);
  s.hintCell = -1;
  s.message = 'المصدر في الخانة المعلّمة بقطرة. وصّل جميع القطع وأغلق كل فتحة.';
}
function labPipeSVG(mask, live, source, leaking = 0) {
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
    )}</g><circle cx="50" cy="50" r="${source ? 18 : 10}" class="lab-pipe-hub"/>${source ? '<path class="lab-source-drop" d="M50 36 C46 43 42 48 42 52 A8 8 0 0 0 58 52 C58 48 54 43 50 36Z"/>' : live ? '<circle cx="50" cy="50" r="4" class="lab-live-dot"/>' : ''}${ends
    .filter(([bit]) => leaking & bit)
    .map(
      ([, x, y]) =>
        `<circle class="lab-leak-tip" cx="${Math.max(7, Math.min(93, x))}" cy="${Math.max(7, Math.min(93, y))}" r="6"/>`,
    )
    .join('')}</svg>`;
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
    )}</div><div class="lab-line-tools"><button id="labLock" onclick="labTogglePipeLock()" aria-pressed="${s.pipeLocked[s.selected]}">${s.pipeLocked[s.selected] ? '🔓 فك تثبيت القطعة' : '🔒 ثبّت القطعة المحددة'}</button></div><div class="lab-pipe-status"><span>💧 المصدر</span><span>! ${analysis.leaks} فتحة غير موصولة</span><span>● متصل بالمصدر</span><span>🔒 ${s.pipeLocked.filter(Boolean).length} قطع مثبتة</span></div><div id="labBoard" class="lab-square lab-pipes" style="--lab-n:${s.size}" role="group" aria-label="شبكة الأنابيب">${s.board
    .map(
      (mask, i) =>
        `<button class="lab-cell lab-pipe ${analysis.connected.has(i) ? 'lab-connected' : ''} ${i === s.source ? 'lab-source' : ''} ${s.selected === i ? 'lab-selected' : ''} ${s.hintCell === i ? 'lab-hinted' : ''} ${s.pipeLocked[i] ? 'lab-locked' : ''}" ${labCellAttributes(
          i,
          (i === s.source ? 'المصدر، ' : '') +
            'فتحات: ' +
            labPipeDirections
              .filter(([, , bit]) => mask & bit)
              .map(([, , , , name]) => name)
              .join('، ') +
            (analysis.connected.has(i) ? '، متصلة بالمصدر' : '، غير متصلة') +
            `، ${labBitCount(BigInt(analysis.leaking[i]))} فتحات غير موصولة` +
            (s.pipeLocked[i] ? '، مثبتة باختيارك' : ''),
        )} onclick="labPipesTap(${i})" oncontextmenu="event.preventDefault();labPipesTap(${i},-1)">${labPipeSVG(mask, analysis.connected.has(i), i === s.source, analysis.leaking[i])}${s.pipeLocked[i] ? '<small class="lab-lock-mark" aria-hidden="true">🔒</small>' : ''}${s.hintCell === i ? '<small class="lab-pipe-hint" aria-hidden="true">✦</small>' : ''}</button>`,
    )
    .join(
      '',
    )}</div><p class="note center">أي ترتيب يربط جميع القطع بلا فتحات يعتبر حلاً<br>R للتدوير · Shift+R للعكس · L للتثبيت · الفأرة اليمنى للعكس</p>`;
}
function labPipesTap(i, override = null, commit = false) {
  if (!labReady('pipes') || !Number.isInteger(i) || i < 0 || i >= state.board.length) return;
  if (!commit && labPreviewTap(i, override ? (override === -1 ? 'counter' : 'clockwise') : null))
    return;
  const s = state,
    direction = override || (s.mode === 'counter' ? -1 : 1),
    next = labRotatePipe(s.board[i], direction);
  if (s.pipeLocked[i]) {
    s.selected = i;
    s.message = 'هذه القطعة مثبتة باختيارك. فك التثبيت بالزر أو L حتى تدوّرها.';
    return renderLab();
  }
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
    const analysis = labNonogramAnalysis(s),
      current = s.board.map((v) => (v === 0 ? -1 : Number(v === 1))),
      check = labNonogramSolve(s.rowClues, s.colClues, current);
    if (!check.solutions.length && !check.exhausted) {
      s.message = analysis.conflicts
        ? 'علاماتك تتعارض مع الأرقام الحمراء. راجعها أو تراجع عن آخر حركة؛ لم يُخصم تلميح.'
        : 'الصفوف والأعمدة لا تقبل حلاً مع كل علاماتك الحالية. راجع آخر اختياراتك؛ لم يُخصم تلميح.';
      return renderLab();
    }
    const deductions = [analysis.rows, analysis.columns]
      .flatMap((lines, axis) =>
        lines.flatMap((line, index) =>
          line.forced.map((cell) => ({
            i: axis ? cell.position * s.size + index : index * s.size + cell.position,
            value: cell.value,
            reason: `كل احتمالات ${axis ? 'العمود' : 'الصف'} ${index + 1} (${line.options.length}) تتفق على هذه الخانة`,
            options: line.options.length,
          })),
        ),
      )
      .filter((cell) => !s.fixed[cell.i]);
    deductions.sort((a, b) => a.options - b.options);
    let deduction = deductions.find((cell) => cell.i === s.selected) || deductions[0];
    if (!deduction && !check.exhausted && check.solutions.length === 1) {
      const unknown = current.map((v, i) => (v === -1 ? i : -1)).filter((i) => i >= 0),
        i = unknown.includes(s.selected) ? s.selected : unknown[0];
      if (i !== undefined)
        deduction = {
          i,
          value: check.solutions[0][i],
          reason: 'جمع قيود الصفوف والأعمدة يترك حلاً واحداً لهذه الخانة',
        };
    }
    if (!deduction || check.exhausted) {
      s.message =
        'لم يصل الفحص إلى استنتاج مضمون الآن. جرّب الصفوف الطويلة أو راجع الشطب؛ لم يُخصم تلميح.';
      return renderLab();
    }
    const { i, value, reason } = deduction;
    labRemember();
    s.board[i] = value ? 1 : 2;
    s.selected = i;
    s.hints++;
    s.hintCell = i;
    s.message = `${reason}: الصف ${Math.floor(i / s.size) + 1}، العمود ${(i % s.size) + 1} ${value ? 'معبأ' : 'فارغ'}. طُبق الاستنتاج وخصمت 8 نقاط.`;
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
    s.plan.fill(false);
    s.mode = 'play';
    s.message = `اضغط الخانة المعلّمة ✦: الصف ${Math.floor(solution[0] / s.size) + 1}، العمود ${(solution[0] % s.size) + 1}. أقصر حل الآن ${solution.length} ضغطات. إعادة هذا التلميح قبل تغيير اللوحة لا تخصم مجدداً.`;
  } else {
    const domains = labPipeDomains(s.board, s.size, s.pipeLocked);
    if (domains.some((options) => !options.length)) {
      s.message =
        'اتجاهات القطع المثبتة تتعارض مع الحواف أو توصيل الشبكة. فك بعض التثبيتات وراجعها؛ لم يُخصم تلميح.';
      return renderLab();
    }
    const forced = domains
        .map((options, i) =>
          options.length === 1 && options[0] !== s.board[i] && !s.pipeLocked[i] ? i : -1,
        )
        .filter((i) => i >= 0),
      candidates = forced.length
        ? forced
        : s.board.map((v, i) => i).filter((i) => !s.pipeLocked[i] && s.board[i] !== s.answer[i]);
    if (!forced.length && s.pipeLocked.some((locked, i) => locked && s.board[i] !== s.answer[i])) {
      s.message =
        'التثبيتات تسمح بعدة اتجاهات ولا يوجد استنتاج محلي مضمون الآن. راجع الحواف أو فك تثبيت بعض القطع لمواصلة التلميح؛ لم يُخصم شيء.';
      return renderLab();
    }
    if (!candidates.length) {
      s.message = 'فك تثبيت قطعة غير موصولة للحصول على مساعدة؛ لم يُخصم تلميح.';
      return renderLab();
    }
    const i = candidates.includes(s.selected) ? s.selected : candidates[0],
      logical = forced.includes(i);
    labRemember();
    s.board[i] = logical ? domains[i][0] : s.answer[i];
    s.hints++;
    s.selected = i;
    s.hintCell = i;
    s.message = `ضُبطت قطعة الصف ${Math.floor(i / s.size) + 1}، العمود ${(i % s.size) + 1}: ${logical ? 'الحواف واتجاهات الجيران تترك اتجاهاً واحداً' : 'كشف اتجاه من الشبكة الأصلية لأن الاستنتاج المحلي يسمح بعدة اتجاهات'}. خصم 8 نقاط.`;
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
    if (event.shiftKey) labRedo();
    else labUndo();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    labRedo();
    return;
  }
  if (
    (event.ctrlKey || event.metaKey || event.altKey) &&
    !(!event.altKey && ['Home', 'End'].includes(event.key))
  )
    return;
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
  } else if (['Home', 'End'].includes(event.key)) {
    event.preventDefault();
    labSelect(
      event.ctrlKey || event.metaKey
        ? event.key === 'Home'
          ? 0
          : s.board.length - 1
        : r * s.size + (event.key === 'Home' ? 0 : s.size - 1),
      true,
    );
  } else if (s.id === 'pipes' && event.key.toLowerCase() === 'l') {
    event.preventDefault();
    labTogglePipeLock();
  } else if (s.id === 'nonogram' && ['f', 'x', 'c'].includes(event.key.toLowerCase())) {
    event.preventDefault();
    labNonogramTap(s.selected, { f: 'fill', x: 'cross', c: 'clear' }[event.key.toLowerCase()]);
  } else if (s.id === 'pipes' && event.key.toLowerCase() === 'r') {
    event.preventDefault();
    labPipesTap(s.selected, event.shiftKey ? -1 : 1);
  }
});

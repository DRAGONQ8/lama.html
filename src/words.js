// Arabic knowledge, vocabulary and precision challenges. No network assets.
games.push(
  [
    'trivia',
    '🧠',
    'كنز المعلومات',
    'أسئلة متنوعة، شروحات لكل جواب، ومراجعة تفاعلية تثبّت معلوماتك.',
    'بروحك',
    '#b7d3ff',
  ],
  [
    'hangman',
    '🔤',
    'اكشف الكلمة',
    'اكشف الحروف أو خمن الكلمة كاملة، مع تلميحات وفئات ومستويات مختلفة.',
    'بروحك',
    '#ffd394',
  ],
  [
    'wordguess',
    '🟩',
    'كلمة في ست',
    'خمن كلمة من 4 أو 5 حروف؛ الألوان تكشف الحروف وأماكنها.',
    'بروحك',
    '#a6ebc7',
  ],
  [
    'target',
    '🎯',
    'صياد الأهداف',
    'سرعة، قنابل خادعة، أو مسارات مرتبة؛ اختبر دقتك وسلسلة نجاحك.',
    'بروحك',
    '#f5b8d6',
  ],
);
Object.assign(gameWorld, { trivia: 'brain', hangman: 'guess', wordguess: 'brain', target: 'duel' });
timedGames.add('trivia');
timedGames.add('target');
const wordsGameIds = new Set(['trivia', 'hangman', 'wordguess', 'target']);
const wordsPreviousSetup = setup;
setup = function (id, internal = false) {
  if (!wordsGameIds.has(id)) return wordsPreviousSetup(id, internal);
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
  let body = '';
  if (id === 'trivia')
    body = `<p class="muted">اختبر معلوماتك، واقرأ سبب الإجابة بعد كل سؤال. الأسئلة لا تتكرر في الجولة.</p><div class="fields"><div class="field"><label for="triviaCategory">الموضوع</label><select id="triviaCategory" onchange="updateTriviaAvailability()"><option value="all">كل المواضيع</option>${triviaCategories.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></div><div class="field"><label for="triviaLevel">المستوى</label><select id="triviaLevel" onchange="updateTriviaAvailability()"><option value="all">كل المستويات</option><option value="easy">سهل</option><option value="normal">متوسط</option><option value="hard">صعب</option></select></div><div class="field"><label for="triviaCount">عدد الأسئلة</label><select id="triviaCount"><option value="10">10 أسئلة</option><option value="20">20 سؤالاً</option></select></div><div class="field"><label for="triviaTimer">وقت كل سؤال</label><select id="triviaTimer"><option value="30">30 ثانية</option><option value="15">15 ثانية · تحدي سريع</option><option value="0">بدون مؤقت</option></select></div>${playerField('سجّل النتيجة باسم')}</div><p class="note" id="triviaAvailable"></p><div class="hintpanel">المؤقت يتوقف أثناء قراءة الشرح. استخدم الأرقام 1–4 للاختيار، وEnter للسؤال التالي.</div>`;
  if (id === 'hangman')
    body = `<p class="muted">اكشف الحروف، واستفد من الفئة والوصف. الكلمات لا تتكرر، وكل خطأ أو تلميح يقلل مكافأة الكلمة.</p><div class="fields"><div class="field"><label for="hangCategory">فئة الكلمات</label><select id="hangCategory"><option value="all">كل الفئات</option>${wordsCategories.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></div><div class="field"><label for="hangLevel">المستوى</label><select id="hangLevel"><option value="easy">مريح · 8 أخطاء و3 تلميحات</option><option value="normal" selected>متوسط · 6 أخطاء وتلميحان</option><option value="hard">خبير · 5 أخطاء وتلميح واحد، بلا وصف</option></select></div><div class="field"><label for="hangCount">طول الجولة</label><select id="hangCount"><option value="1">كلمة واحدة</option><option value="5" selected>5 كلمات</option><option value="10">10 كلمات</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">أ، إ، آ تُحسب مثل ا. ة تختلف عن ه، وى تختلف عن ي. كل كلمة مكتملة تمنح حتى 20 نقطة؛ الخطأ −2 والتلميح −3. تقدر تستخدم لوحة المفاتيح العربية أو تخمّن الكلمة كاملة؛ التخمين الكامل الخاطئ يستهلك خطأين.</div>`;
  if (id === 'wordguess')
    body = `<p class="muted">لديك 6 محاولات للوصول إلى كلمة عربية. الأخضر: حرف في مكانه. الأصفر: حرف موجود في مكان آخر. الرمادي: الحرف غير موجود، أو تكراره زائد.</p><div class="fields"><div class="field"><label for="wordguessLength">طول الكلمة</label><select id="wordguessLength"><option value="4">4 حروف · بداية خفيفة</option><option value="5" selected>5 حروف · التحدي الكامل</option></select></div><div class="field"><label for="wordguessMode">طريقة التخمين</label><select id="wordguessMode"><option value="classic">حر · جرّب أي كلمة</option><option value="focus">استنتاج · التزم بالحروف المكتشفة</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">تُقبل الكلمات الموجودة في القاموس المحلي. أ، إ، آ تُحسب مثل ا؛ ة وه حرفان مختلفان. في الاستنتاج حافظ على الأخضر، وانقل الأصفر إلى موضع جديد، واستبعد الرمادي والتكرارات الزائدة. التلميح يكشف الفئة ويخصم 10 نقاط.</div>`;
  if (id === 'target')
    body = `<p class="muted">اضغط الهدف الملون فور ظهوره، وتجنب الخانات الفارغة. النجاح المتتابع يزيد المكافأة، والسرعة ترتفع أثناء اللعب.</p><div class="fields"><div class="field"><label for="targetLevel">المستوى</label><select id="targetLevel"><option value="easy">سهل · 9 خانات وأهداف أطول</option><option value="normal" selected>متوسط · 9 خانات</option><option value="hard">صعب · 16 خانة</option></select></div><div class="field"><label for="targetMode">التحدي</label><select id="targetMode"><option value="speed">سرعة · أهداف فقط</option><option value="precision">تركيز · هدف مع قنبلة خادعة</option><option value="sequence">مسار · الأهداف 1 ثم 2 ثم 3</option></select></div><div class="field"><label for="targetDuration">وقت الجولة</label><select id="targetDuration"><option value="30">30 ثانية</option><option value="60">60 ثانية</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">الخانة الفارغة −3، والقنبلة −8 في تحدي التركيز؛ كل خطأ يقطع السلسلة. كل هدف يُحسب مرة واحدة. على لوحة المفاتيح: Tab ثم Enter، أو الأرقام 1–9 للشبكة الصغيرة، والأسهم للتنقل في كل المستويات. في المسار أصب الهدف 1 ثم 2 ثم 3؛ لا تتخطى الترتيب.</div>`;
  setHTML(
    wrap(
      id,
      `<section class="panel">${body}<div class="actions"><button class="primary" onclick="startWordsGame('${id}')">ابدأ اللعبة ←</button></div></section>`,
    ),
  );
  if (id === 'trivia') updateTriviaAvailability();
  goTop();
};
function wordsBlocked(id) {
  return (
    screen !== id ||
    !state ||
    state.id !== id ||
    state.done ||
    state.pausedAt ||
    !$('modalback').hidden ||
    !!$('pausecover')
  );
}
function finishWords(title, description, points, detail = '') {
  if (!state || state.done) return;
  const s = state;
  s.done = true;
  clearTimers();
  const earned = Math.max(0, Math.round(points));
  if (earned > 0) addScore(s.name, earned);
  result(s.id, esc(title), esc(description), earned, detail);
}
function startWordsGame(id) {
  if (screen !== 'setup' || state?.id !== id || !wordsGameIds.has(id)) return;
  const name = player();
  clearTimers();
  if (id === 'trivia') startTrivia(name);
  if (id === 'hangman') startHangman(name);
  if (id === 'wordguess') startWordguess(name);
  if (id === 'target') startTarget(name);
}
function wordsSeconds(s) {
  return Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000));
}
function wordsReadOption(id, options, fallback) {
  const value = Number($(id)?.value);
  return options.includes(value) ? value : fallback;
}
function triviaPool() {
  const cat = $('triviaCategory')?.value || 'all',
    level = $('triviaLevel')?.value || 'all';
  return triviaBank.filter(
    (q) => (cat === 'all' || q.cat === cat) && (level === 'all' || q.level === level),
  );
}
function updateTriviaAvailability() {
  const count = triviaPool().length;
  if ($('triviaAvailable'))
    $('triviaAvailable').textContent =
      `${count} سؤالاً متاحاً. إذا اخترت عدداً أكبر، تشمل الجولة جميع الأسئلة المتاحة.`;
}
function startTrivia(name) {
  const pool = triviaPool(),
    wanted = wordsReadOption('triviaCount', [10, 20], 10),
    duration = wordsReadOption('triviaTimer', [0, 15, 30], 30);
  if (!pool.length) return toast('اختر موضوعاً أو مستوى آخر.');
  state = {
    id: 'trivia',
    name,
    questions: shuffle(pool)
      .slice(0, wanted)
      .map((q) => ({ ...q, choices: shuffle(q.choices) })),
    index: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    answers: [],
    duration,
    done: false,
    locked: false,
    started: Date.now(),
  };
  screen = 'trivia';
  triviaPrepare();
  renderTrivia();
  const s = state;
  repeat(() => {
    if (state !== s || s.done || s.pausedAt || s.locked || !s.duration) return;
    const remaining = wordsSeconds(s);
    if ($('triviaClock')) $('triviaClock').textContent = remaining + ' ث';
    if ($('triviaTimebar')) $('triviaTimebar').style.width = (100 * remaining) / s.duration + '%';
    if (!remaining) answerTrivia(-1);
  }, 100);
  goTop();
}
function triviaPrepare() {
  state.locked = false;
  state.choice = null;
  state.endAt = state.duration ? Date.now() + state.duration * 1000 : 0;
  state.questionStarted = Date.now() - state.started;
}
function renderTrivia() {
  const s = state,
    q = s.questions[s.index],
    cat = triviaCategories.find((c) => c[0] === q.cat)[1];
  setHTML(
    wrap(
      'trivia',
      `<section class="panel"><div class="words-status"><span class="pill">${s.index + 1} / ${s.questions.length}</span><span class="pill">${esc(cat)}</span><span class="pill">✓ ${s.correct}</span><span class="pill">🔥 ${s.streak || 0}</span>${s.duration ? `<b id="triviaClock" class="countdown">${s.locked ? 'شرح الإجابة' : wordsSeconds(s) + ' ث'}</b>` : '<span class="pill">بدون مؤقت</span>'}</div><div class="progressline"><span style="width:${(100 * (s.index + (s.locked ? 1 : 0))) / s.questions.length}%"></span></div>${s.duration ? `<div class="words-clock-track"><span id="triviaTimebar" style="width:${s.locked ? 0 : (100 * wordsSeconds(s)) / s.duration}%"></span></div>` : ''}<h3 class="trivia-question">${esc(q.question)}</h3><div class="trivia-choices">${q.choices.map((c, i) => `<button class="trivia-choice ${s.locked ? (c === q.answer ? 'correct' : i === s.choice ? 'incorrect' : 'faded') : ''}" onclick="answerTrivia(${i})" ${s.locked ? 'disabled' : ''}><span class="choice-number">${i + 1}</span><span>${esc(c)}</span>${s.locked && c === q.answer ? '<b>✓</b>' : s.locked && i === s.choice ? '<b>✕</b>' : ''}</button>`).join('')}</div>${s.locked ? `<div class="trivia-explanation" role="status"><b>${s.choice === -1 ? 'انتهى الوقت' : q.choices[s.choice] === q.answer ? 'إجابة صحيحة!' : 'تعلمنا معلومة جديدة'}</b><p>${esc(q.explanation)}</p></div><div class="actions"><button class="primary" onclick="nextTrivia()">${s.index + 1 === s.questions.length ? 'اعرض النتيجة' : 'السؤال التالي'} ←</button></div>` : '<p class="note center">اختر الجواب أو اضغط رقمه على لوحة المفاتيح.</p>'}</section>`,
    ),
  );
}
function answerTrivia(choice) {
  if (
    wordsBlocked('trivia') ||
    state.locked ||
    !Number.isInteger(choice) ||
    choice < -1 ||
    choice > 3
  )
    return;
  const s = state;
  if (s.duration && !wordsSeconds(s)) choice = -1;
  s.locked = true;
  s.choice = choice;
  const q = s.questions[s.index],
    correct = choice >= 0 && q.choices[choice] === q.answer;
  if (correct) {
    s.correct++;
    s.streak = (s.streak || 0) + 1;
    s.bestStreak = Math.max(s.bestStreak || 0, s.streak);
    tone();
  } else s.streak = 0;
  s.answers.push({
    ...q,
    correct,
    selected: choice >= 0 ? q.choices[choice] : null,
    milliseconds: Math.max(0, Date.now() - s.started - s.questionStarted),
  });
  renderTrivia();
}
function nextTrivia() {
  if (wordsBlocked('trivia') || !state.locked) return;
  const s = state;
  s.index++;
  if (s.index === s.questions.length) {
    finishWords(
      s.correct === s.questions.length ? 'معرفة كاملة!' : 'انتهى اختبار المعلومات',
      `أجبت بشكل صحيح عن ${s.correct} من ${s.questions.length} سؤالاً.`,
      (100 * s.correct) / s.questions.length,
      `${s.correct} / ${s.questions.length}`,
    );
    return renderTriviaReview(s);
  }
  triviaPrepare();
  renderTrivia();
}
function renderTriviaReview(s) {
  const missed = s.answers.filter((a) => !a.correct),
    topics = triviaCategories
      .map(([key, label]) => {
        const answers = s.answers.filter((a) => a.cat === key);
        return answers.length
          ? `<div class="trivia-mastery"><span>${esc(label)}</span><b>${answers.filter((a) => a.correct).length} / ${answers.length}</b><meter min="0" max="${answers.length}" value="${answers.filter((a) => a.correct).length}" aria-label="الإجابات الصحيحة في ${esc(label)}"></meter></div>`
          : '';
      })
      .join('');
  document
    .querySelector('#app .play')
    ?.insertAdjacentHTML(
      'beforeend',
      `<section class="panel trivia-review"><h3>خريطة معرفتك</h3><div class="trivia-topic-grid">${topics}</div><div class="chips"><span class="chip">أفضل سلسلة: ${s.bestStreak || 0}</span><span class="chip">متوسط الإجابة: ${(s.answers.reduce((sum, answer) => sum + (answer.milliseconds || 0), 0) / s.answers.length / 1000).toFixed(1)} ث</span></div>${missed.length ? `<p class="note">${missed.length} أسئلة تستحق مراجعة. الإجابة والتفسير محفوظان هنا حتى تبدأ جولة جديدة.</p><div class="actions"><button class="primary" onclick="startTriviaPractice()">🧠 اختبر ما تعلمته</button></div><section id="triviaPractice" class="trivia-practice" hidden aria-label="مراجعة تفاعلية للأسئلة"></section><details class="history"><summary>راجع الأسئلة التي فاتتك</summary>${missed.map((a) => `<article class="trivia-review-item"><h4>${esc(a.question)}</h4><p>إجابتك: ${a.selected === null ? 'انتهى الوقت' : esc(a.selected)}</p><p class="words-positive">الصحيح: ${esc(a.answer)}</p><p class="note">${esc(a.explanation)}</p></article>`).join('')}</details>` : '<p class="note">أجبت عن كل الأسئلة. جرّب مستوى أصعب في الجولة القادمة.</p>'}</section>`,
    );
}
function triviaPracticeBlocked() {
  return (
    screen !== 'trivia' ||
    state?.id !== 'trivia' ||
    !state.done ||
    !state.resultShown ||
    !$('modalback').hidden ||
    !!$('pausecover')
  );
}
function startTriviaPractice() {
  if (triviaPracticeBlocked()) return;
  const questions = state.answers.filter((answer) => !answer.correct);
  if (!questions.length) return;
  state.practice = {
    questions: shuffle(questions).map((question) => ({
      ...question,
      choices: shuffle(question.choices),
    })),
    index: 0,
    correct: 0,
    choice: null,
  };
  renderTriviaPractice();
  $('triviaPracticeTitle')?.focus({ preventScroll: true });
  wordsRevealFeedback('triviaPracticeTitle');
}
function renderTriviaPractice() {
  const practice = state.practice,
    container = $('triviaPractice');
  if (!container || !practice) return;
  container.hidden = false;
  if (practice.index >= practice.questions.length) {
    container.innerHTML = `<h3 id="triviaPracticeTitle" tabindex="-1">✓ اكتملت المراجعة</h3><p role="status">استرجعت ${practice.correct} من ${practice.questions.length} إجابات. ${practice.correct === practice.questions.length ? 'ثبتنا المعلومات!' : 'راجع الشرح، ثم اختبر نفسك مرة ثانية.'}</p><p class="note">هذه مراجعة للتعلم؛ نتيجة الجولة المسجلة تبقى كما هي.</p><button onclick="startTriviaPractice()">↻ راجع مرة ثانية</button>`;
    return;
  }
  const q = practice.questions[practice.index],
    locked = practice.choice !== null;
  container.innerHTML = `<div class="words-status"><h3 id="triviaPracticeTitle" tabindex="-1">🧠 اختبر ما تعلمته</h3><span class="pill">${practice.index + 1} / ${practice.questions.length}</span><span class="pill">مراجعة بدون نقاط أو مؤقت</span></div><p class="trivia-question">${esc(q.question)}</p><div class="trivia-choices">${q.choices.map((choice, i) => `<button class="trivia-choice ${locked ? (choice === q.answer ? 'correct' : i === practice.choice ? 'incorrect' : 'faded') : ''}" onclick="answerTriviaPractice(${i})" ${locked ? 'disabled' : ''}><span class="choice-number">${i + 1}</span><span>${esc(choice)}</span></button>`).join('')}</div>${locked ? `<div class="trivia-explanation" role="status"><b>${q.choices[practice.choice] === q.answer ? 'تذكرتها! ✓' : 'الصحيح: ' + esc(q.answer)}</b><p>${esc(q.explanation)}</p></div><div class="actions"><button class="primary" onclick="nextTriviaPractice()">${practice.index + 1 === practice.questions.length ? 'أنهِ المراجعة' : 'التالي'} ←</button></div>` : '<p class="note center">حاول تتذكر الإجابة قبل الرجوع إلى الشرح.</p>'}`;
}
function answerTriviaPractice(choice) {
  if (triviaPracticeBlocked() || !state.practice || !Number.isInteger(choice)) return;
  const practice = state.practice,
    q = practice.questions[practice.index];
  if (!q || practice.choice !== null || choice < 0 || choice >= q.choices.length) return;
  practice.choice = choice;
  if (q.choices[choice] === q.answer) practice.correct++;
  renderTriviaPractice();
}
function nextTriviaPractice() {
  if (triviaPracticeBlocked() || !state.practice || state.practice.choice === null) return;
  state.practice.index++;
  state.practice.choice = null;
  renderTriviaPractice();
  $('triviaPracticeTitle')?.focus({ preventScroll: true });
}

function wordsNormalizeKey(value) {
  return String(value)
    .normalize('NFC')
    .trim()
    .replace(/[\u064B-\u065F\u0670ـ\s]/g, '')
    .replace(/[أإآٱ]/g, 'ا');
}
const arabicKeyboard = [
  'ض',
  'ص',
  'ث',
  'ق',
  'ف',
  'غ',
  'ع',
  'ه',
  'خ',
  'ح',
  'ج',
  'د',
  'ش',
  'س',
  'ي',
  'ب',
  'ل',
  'ا',
  'ت',
  'ن',
  'م',
  'ك',
  'ط',
  'ئ',
  'ء',
  'ؤ',
  'ر',
  'ى',
  'ة',
  'و',
  'ز',
  'ظ',
  'ذ',
];
function wordsKeyboard(handler, disabled = [], statuses = null) {
  return `<div class="arabic-keyboard" aria-label="لوحة الحروف العربية">${arabicKeyboard.map((letter) => `<button class="letter-key ${statuses?.[letter] || ''}" onclick="${handler}('${letter}')" ${disabled.includes(letter) ? 'disabled' : ''} aria-label="الحرف ${letter}">${letter}</button>`).join('')}</div>`;
}
function startHangman(name) {
  const cat = $('hangCategory').value,
    count = wordsReadOption('hangCount', [1, 5, 10], 5),
    level = ['easy', 'normal', 'hard'].includes($('hangLevel')?.value)
      ? $('hangLevel').value
      : 'normal',
    matching = wordsLexicon.filter((w) => cat === 'all' || w.cat === cat),
    pool = matching.filter((w) =>
      level === 'easy' ? w.key.length <= 5 : level === 'hard' ? w.key.length >= 5 : true,
    );
  if (!pool.length) return toast('لا توجد كلمات في هذه الفئة. اختر فئة أخرى.');
  state = {
    id: 'hangman',
    name,
    level,
    maxMisses: { easy: 8, normal: 6, hard: 5 }[level],
    maxHints: { easy: 3, normal: 2, hard: 1 }[level],
    queue: shuffle(pool).slice(0, count),
    index: 0,
    wins: 0,
    total: 0,
    wordResults: [],
    done: false,
  };
  screen = 'hangman';
  prepareHangman();
  renderHangman();
  goTop();
}
function prepareHangman() {
  Object.assign(state, {
    item: state.queue[state.index],
    guessed: [],
    misses: 0,
    hints: 0,
    over: false,
    won: false,
    feedback: 'ابدأ بحرف شائع، ثم استفد من الحروف المكتشفة.',
    wordDraft: '',
    wordGuesses: [],
  });
}
function hangmanSolved(s) {
  return Array.from(s.item.key).every((letter) => s.guessed.includes(letter));
}
function hangmanDrawing(misses, limit = 6) {
  const body = [
    '<circle cx="146" cy="64" r="17"/>',
    '<path d="M146 81v54"/>',
    '<path d="m146 93-28 22"/>',
    '<path d="m146 93 28 22"/>',
    '<path d="m146 135-25 33"/>',
    '<path d="m146 135 25 33"/>',
  ];
  return `<svg class="hangman-drawing" viewBox="0 0 220 190" role="img" aria-label="${misses} أخطاء من ${limit}"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path class="hangman-frame" d="M24 178h80M62 178V20h84v26"/>${body.slice(0, Math.ceil((misses / limit) * body.length)).join('')}</g></svg>`;
}
function renderHangman() {
  const s = state,
    item = s.item,
    category = wordsCategories.find((c) => c[0] === item.cat)[1],
    maxMisses = s.maxMisses || 6,
    maxHints = s.maxHints || 2,
    statuses = Object.fromEntries(
      s.guessed.map((letter) => [letter, item.key.includes(letter) ? 'correct' : 'absent']),
    );
  setHTML(
    wrap(
      'hangman',
      `<section class="panel hangman-panel"><div class="words-status"><span class="pill">الكلمة ${s.index + 1} / ${s.queue.length}</span><span class="pill">${esc(category)}</span><span class="pill">✓ ${s.wins} كلمات</span><span class="pill">💎 ${s.total} نقطة</span><b class="${maxMisses - s.misses <= 2 ? 'danger-text' : ''}">${maxMisses - s.misses} أخطاء متبقية</b><span class="pill">${Array.from(item.key).filter((l) => s.guessed.includes(l)).length} / ${item.key.length} حروف مكشوفة</span></div><div class="hangman-layout">${hangmanDrawing(s.misses, maxMisses)}<div><p class="hangman-clue">${s.level === 'hard' && !s.over ? `تحدي خبير · ${item.key.length} حروف، والفئة دليلك` : esc(item.hint)}</p><div class="hangman-word" aria-label="حروف الكلمة">${Array.from(
        item.key,
      )
        .map(
          (letter) =>
            `<span class="hangman-cell ${s.guessed.includes(letter) ? 'revealed' : s.over ? 'lost' : ''}">${s.guessed.includes(letter) || s.over ? esc(letter) : '<span aria-hidden="true">ـ</span><span class="sr">حرف مخفي</span>'}</span>`,
        )
        .join(
          '',
        )}</div>${s.over ? `<div class="trivia-explanation" id="hangmanOutcome" role="status"><b>${s.won ? 'أحسنت! الكلمة: ' + esc(item.word) : 'الكلمة هي: ' + esc(item.word)}</b><p>${s.won ? `+${s.wordPoints} نقطة · ${s.misses} أخطاء و${s.hints} تلميحات` : 'الكلمة التالية فرصة جديدة.'}</p>${s.level === 'hard' ? `<p>${esc(item.hint)}</p>` : ''}</div>` : `<p class="note">الحروف المجربة: ${s.guessed.length ? s.guessed.map(esc).join('، ') : 'لم تجرب أي حرف بعد'}</p><p class="hangman-feedback" id="hangmanFeedback" role="status">${esc(s.feedback || '')}</p>`}</div></div>${!s.over ? `<form class="words-native hangman-native" onsubmit="event.preventDefault();submitHangmanWord()"><label for="hangmanInput">عرفت الكلمة؟ اكتبها كاملة</label><div><input id="hangmanInput" maxlength="32" value="${esc(s.wordDraft || '')}" placeholder="${item.key.length} حروف…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="hangmanFeedback" onfocus="this.closest('.hangman-panel').classList.add('hangman-typing')" onblur="this.closest('.hangman-panel').classList.remove('hangman-typing')" oninput="if(!event.isComposing)readHangmanDraft(this.value)" oncompositionend="readHangmanDraft(this.value)"><button class="primary" type="submit">خمن الكلمة ↵</button></div><small class="note">اختياري · التخمين الخاطئ يستهلك خطأين</small></form>${wordsKeyboard('guessHangman', s.guessed, statuses)}` : ''}<div class="actions">${s.over ? `<button class="primary" onclick="nextHangman()">${s.index + 1 === s.queue.length ? 'اعرض النتيجة' : 'الكلمة التالية'} ←</button>` : `<button onclick="hintHangman()" ${s.hints >= maxHints ? 'disabled' : ''}>💡 اكشف حرفاً (${maxHints - s.hints} متبقي) · −3</button>`}</div></section>`,
    ),
  );
}
function finishHangmanWord() {
  const s = state;
  if (s.over) return;
  s.won = hangmanSolved(s);
  if (s.won || s.misses >= (s.maxMisses || 6)) {
    s.over = true;
    s.wordPoints = s.won ? Math.max(2, 20 - s.misses * 2 - s.hints * 3) : 0;
    s.wordResults?.push({
      word: s.item.word,
      won: s.won,
      misses: s.misses,
      hints: s.hints,
      points: s.wordPoints,
      hint: s.item.hint,
    });
    if (s.won) {
      s.wins++;
      s.total += s.wordPoints;
      tone(true);
    }
  }
}
function readHangmanDraft(raw) {
  if (wordsBlocked('hangman') || state.over) return;
  state.wordDraft = Array.from(wordsNormalizeKey(raw))
    .filter((letter) => arabicKeyboard.includes(letter))
    .slice(0, 32)
    .join('');
  if ($('hangmanInput')) $('hangmanInput').value = state.wordDraft;
}
function submitHangmanWord() {
  if (wordsBlocked('hangman') || state.over) return;
  const s = state,
    guess = s.wordDraft;
  if (guess.length !== s.item.key.length)
    return hangmanMessage(`اكتب الكلمة كاملة: ${s.item.key.length} حروف.`);
  if (s.wordGuesses.includes(guess))
    return hangmanMessage('جربت هذه الكلمة بالفعل. جرّب تخميناً جديداً.');
  $('hangmanInput')?.blur();
  s.wordGuesses.push(guess);
  s.wordDraft = '';
  if (guess === s.item.key) {
    s.guessed = [...new Set([...s.guessed, ...Array.from(s.item.key)])];
    s.feedback = 'وصلت إلى الكلمة كاملة!';
  } else {
    s.misses = Math.min(s.maxMisses, s.misses + 2);
    s.feedback = `الكلمة مختلفة. التخمين الكامل يستهلك خطأين؛ باقي ${s.maxMisses - s.misses}.`;
  }
  finishHangmanWord();
  renderHangman();
  wordsRevealFeedback(s.over ? 'hangmanOutcome' : 'hangmanFeedback');
}
function hangmanMessage(message) {
  state.feedback = message;
  if ($('hangmanFeedback')) $('hangmanFeedback').textContent = message;
  wordsRevealFeedback('hangmanFeedback');
}
function wordsRevealFeedback(id) {
  const element = $(id);
  if (!element) return;
  const rect = element.getBoundingClientRect(),
    viewport = window.visualViewport,
    top = viewport?.offsetTop || 0,
    bottom = top + (viewport?.height || window.innerHeight);
  if (rect.top < top + 12 || rect.bottom > bottom - 12)
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
}
function guessHangman(raw) {
  if (wordsBlocked('hangman') || state.over) return;
  const letter = wordsNormalizeKey(raw);
  if (!arabicKeyboard.includes(letter) || state.guessed.includes(letter)) return;
  state.guessed.push(letter);
  if (!state.item.key.includes(letter)) {
    state.misses++;
    state.feedback = `الحرف ${letter} غير موجود. باقي ${(state.maxMisses || 6) - state.misses} أخطاء.`;
  } else {
    const count = Array.from(state.item.key).filter((l) => l === letter).length;
    state.feedback = `الحرف ${letter} موجود${count > 1 ? ` في ${count} مواضع` : ''}!`;
    tone();
  }
  finishHangmanWord();
  renderHangman();
}
function hintHangman() {
  if (wordsBlocked('hangman') || state.over || state.hints >= (state.maxHints || 2)) return;
  const missing = [...new Set(Array.from(state.item.key))].filter(
    (l) => !state.guessed.includes(l),
  );
  if (!missing.length) return;
  state.hints++;
  const letter = missing[randInt(missing.length)];
  state.guessed.push(letter);
  state.feedback = `كشفنا الحرف ${letter}. التلميح يخصم 3 نقاط من مكافأة الكلمة.`;
  finishHangmanWord();
  renderHangman();
}
function nextHangman() {
  if (wordsBlocked('hangman') || !state.over) return;
  const s = state;
  s.index++;
  if (s.index === s.queue.length) {
    finishWords(
      s.wins === s.queue.length ? 'خبير الحروف!' : 'انتهت جولة الكلمات',
      `اكتشفت ${s.wins} من ${s.queue.length} كلمات. التلميحات والأخطاء تخصم من مكافأة الكلمة (20 نقطة كحد أقصى).`,
      s.total,
      `${s.wins} / ${s.queue.length}`,
    );
    document
      .querySelector('#app .play')
      ?.insertAdjacentHTML(
        'beforeend',
        `<section class="panel words-round-review"><h3>حصيلة الكلمات</h3>${(s.wordResults || []).map((item) => `<div><b>${item.won ? '✓' : '↷'} ${esc(item.word)}</b><span>${item.misses} أخطاء · ${item.hints} تلميحات</span><strong>+${item.points}</strong>${item.hint ? `<small class="words-review-clue">${esc(item.hint)}</small>` : ''}</div>`).join('')}</section>`,
      );
    return;
  }
  prepareHangman();
  renderHangman();
}

function startWordguess(name) {
  const size = wordsReadOption('wordguessLength', [4, 5], 5),
    pool = wordsLexicon.filter((w) => Array.from(w.key).length === size);
  if (!pool.length) return toast('اختر طول كلمة متاحاً.');
  state = {
    id: 'wordguess',
    name,
    size,
    mode: $('wordguessMode')?.value === 'focus' ? 'focus' : 'classic',
    item: pool[randInt(pool.length)],
    entry: '',
    attempts: [],
    keyStates: Object.create(null),
    hinted: false,
    over: false,
    won: false,
    done: false,
    feedback: '',
    notesOpen: false,
  };
  screen = 'wordguess';
  renderWordguess();
  goTop();
}
function wordguessFeedback(guess, answer) {
  const letters = Array.from(guess),
    target = Array.from(answer),
    marks = letters.map(() => 'absent'),
    remaining = Object.create(null);
  for (let i = 0; i < target.length; i++) {
    if (letters[i] === target[i]) marks[i] = 'correct';
    else remaining[target[i]] = (remaining[target[i]] || 0) + 1;
  }
  for (let i = 0; i < letters.length; i++)
    if (marks[i] !== 'correct' && remaining[letters[i]] > 0) {
      marks[i] = 'present';
      remaining[letters[i]]--;
    }
  return marks;
}
function wordguessConstraintViolation(guess, attempts) {
  const letters = Array.from(guess),
    counts = Object.create(null);
  letters.forEach((letter) => (counts[letter] = (counts[letter] || 0) + 1));
  for (const attempt of attempts) {
    const previous = Array.from(attempt.word),
      required = Object.create(null);
    for (let i = 0; i < previous.length; i++) {
      const letter = previous[i],
        mark = attempt.marks[i];
      if (mark === 'correct' && letters[i] !== letter)
        return `حافظ على الحرف ${letter} في الخانة ${i + 1} من اليمين.`;
      if (mark === 'present' && letters[i] === letter)
        return `الحرف ${letter} أصفر في الخانة ${i + 1}؛ جرّبه في مكان آخر.`;
      if (mark === 'absent' && letters[i] === letter)
        return `غيّر الحرف ${letter} في الخانة ${i + 1}؛ هذا الموضع كان رمادياً.`;
      if (mark !== 'absent') required[letter] = (required[letter] || 0) + 1;
    }
    for (const [letter, count] of Object.entries(required))
      if ((counts[letter] || 0) < count)
        return `استخدم الحرف ${letter}${count > 1 ? ` ${count} مرات على الأقل` : ' في تخمينك'}؛ اكتشفته في محاولة سابقة.`;
  }
  const evidence = wordguessEvidence(attempts, letters.length);
  for (const [letter, maximum] of Object.entries(evidence.maximum))
    if ((counts[letter] || 0) > maximum)
      return maximum === 0
        ? `الحرف ${letter} رمادي؛ استبعده من تخمينك.`
        : `الحرف ${letter} موجود ${maximum} ${maximum === 1 ? 'مرة فقط' : 'مرات فقط'}؛ تكراره الآخر كان رمادياً.`;
  return '';
}
function wordguessEvidence(attempts, size) {
  const positions = Array(size).fill(''),
    minimum = Object.create(null),
    maximum = Object.create(null);
  for (const attempt of attempts) {
    const counts = Object.create(null),
      absent = new Set();
    Array.from(attempt.word).forEach((letter, i) => {
      if (attempt.marks[i] === 'correct') positions[i] = letter;
      if (attempt.marks[i] === 'absent') absent.add(letter);
      else counts[letter] = (counts[letter] || 0) + 1;
    });
    for (const [letter, count] of Object.entries(counts))
      minimum[letter] = Math.max(minimum[letter] || 0, count);
    for (const letter of absent)
      maximum[letter] = Math.min(maximum[letter] ?? Infinity, counts[letter] || 0);
  }
  return { positions, minimum, maximum };
}
function wordguessNotebook(s) {
  if (!s.attempts.length) return '';
  const evidence = wordguessEvidence(s.attempts, s.size),
    discovered = Object.entries(evidence.minimum),
    eliminated = Object.entries(evidence.maximum)
      .filter(([, count]) => count === 0)
      .map(([letter]) => letter);
  return `<details class="wordguess-notebook" ${s.notesOpen ? 'open' : ''} ontoggle="rememberWordguessNotebook(this)"><summary>🧩 دفتر الأدلة · ${discovered.length} حروف مكتشفة</summary><p class="note">المواضع من اليمين؛ استنتجنا هذه الأدلة من محاولاتك فقط.</p><div class="wordguess-known" aria-label="المواضع المؤكدة من اليمين">${evidence.positions.map((letter, i) => `<span aria-label="الخانة ${i + 1}: ${letter || 'لم تُعرف بعد'}"><small>${i + 1}</small><b>${esc(letter || '؟')}</b></span>`).join('')}</div><div class="chips">${discovered.map(([letter, count]) => `<span class="chip">${letter}: ${evidence.maximum[letter] === count ? `${count} بالضبط` : `${count} على الأقل`}</span>`).join('')}</div>${eliminated.length ? `<p class="note">الحروف المستبعدة: <b>${eliminated.join('، ')}</b></p>` : ''}</details>`;
}
function rememberWordguessNotebook(notebook) {
  // Native toggle events are queued; a removed notebook belongs to its previous render or round.
  if (
    screen === 'wordguess' &&
    state?.id === 'wordguess' &&
    notebook.isConnected &&
    notebook === document.querySelector('.wordguess-notebook')
  )
    state.notesOpen = notebook.open;
}
function renderWordguess() {
  const s = state,
    restoreInput = document.activeElement?.id === 'wordguessInput',
    cat = wordsCategories.find((c) => c[0] === s.item.cat)[1],
    rows = Array.from({ length: 6 }, (_, row) => {
      const attempt = s.attempts[row],
        letters = Array.from(attempt?.word || (row === s.attempts.length ? s.entry : ''));
      return `<div class="wordguess-row ${row === s.attempts.length && !s.over ? 'current' : ''} ${row === s.attempts.length - 1 ? 'last-attempt' : ''}" ${row === s.attempts.length && !s.over ? 'aria-current="step"' : ''}>${Array.from({ length: s.size }, (_, i) => `<span class="wordguess-cell ${attempt ? attempt.marks[i] : letters[i] ? 'filled' : ''}" aria-label="${letters[i] ? esc(letters[i]) + ' ' + (attempt ? { correct: 'في مكانه', present: 'في مكان آخر', absent: 'غير موجود' }[attempt.marks[i]] : '') : 'خانة فارغة'}">${esc(letters[i] || '')}</span>`).join('')}</div>`;
    }).join('');
  setHTML(
    wrap(
      'wordguess',
      `<section class="panel wordguess-panel ${restoreInput ? 'wordguess-typing' : ''}"><div class="words-status"><span class="pill">${s.size} حروف</span><span class="pill">${s.attempts.length} / 6 محاولات</span>${s.mode === 'focus' ? '<span class="pill">🧩 وضع الاستنتاج</span>' : ''}${s.hinted ? `<span class="pill">الفئة: ${esc(cat)}</span>` : ''}</div><div class="wordguess-board" role="group" aria-label="محاولات تخمين الكلمة">${rows}</div>${wordguessNotebook(s)}<div class="wordguess-legend"><span><i class="correct"></i>حرف ومكان صحيح</span><span><i class="present"></i>موجود بمكان آخر</span><span><i class="absent"></i>غير موجود أو زائد</span></div>${s.over ? `<div class="trivia-explanation center" id="wordguessOutcome" role="status"><b>${s.won ? 'أحسنت! الكلمة هي' : 'الكلمة كانت'}: ${esc(s.item.word)}</b><p>${esc(s.item.hint)}</p></div><div class="actions"><button class="primary" onclick="finishWordguess()">اعرض النتيجة ←</button></div>` : `<p class="wordguess-feedback" id="wordguessMessage" role="status">${esc(s.feedback || `اكتب كلمة من ${s.size} حروف؛ تخمينك التالي يبدأ من اليمين.`)}</p><form class="wordguess-native" onsubmit="event.preventDefault();submitWordguess()"><label class="sr" for="wordguessInput">اكتب كلمة عربية من ${s.size} حروف</label><input id="wordguessInput" value="${esc(s.entry)}" placeholder="اكتب كلمة من ${s.size} حروف…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="wordguessMessage" onfocus="this.closest('.wordguess-panel').classList.add('wordguess-typing')" onblur="this.closest('.wordguess-panel').classList.remove('wordguess-typing')" oninput="if(!event.isComposing)readWordguessDraft(this.value)" oncompositionend="readWordguessDraft(this.value)"><button class="primary" type="button" onclick="submitWordguess()">تحقق ↵</button></form>${wordsKeyboard('typeWordguess', [], s.keyStates)}<div class="actions wordguess-controls"><button onclick="typeWordguess('backspace')" aria-label="حذف آخر حرف">⌫ حذف</button><button onclick="hintWordguess()" ${s.hinted ? 'disabled' : ''}>💡 الفئة · −10</button></div>`}</section>`,
    ),
  );
  if (restoreInput && !s.over) {
    $('wordguessInput')?.focus({ preventScroll: true });
    $('wordguessInput')?.setSelectionRange(s.entry.length, s.entry.length);
  }
}
function readWordguessDraft(raw) {
  if (wordsBlocked('wordguess') || state.over) return;
  const input = $('wordguessInput');
  if (!input || input.isComposing) return;
  state.entry = Array.from(wordsNormalizeKey(raw))
    .filter((l) => arabicKeyboard.includes(l))
    .slice(0, state.size)
    .join('');
  input.value = state.entry;
  const cells = document.querySelectorAll('.wordguess-row')[state.attempts.length]?.children || [];
  Array.from(cells).forEach((cell, i) => {
    cell.textContent = Array.from(state.entry)[i] || '';
    cell.classList.toggle('filled', !!cell.textContent);
    cell.setAttribute('aria-label', cell.textContent || 'خانة فارغة');
  });
}
function typeWordguess(letter) {
  if (wordsBlocked('wordguess') || state.over) return;
  const s = state;
  if (letter === 'backspace') {
    s.entry = Array.from(s.entry).slice(0, -1).join('');
    renderWordguess();
    return;
  }
  letter = wordsNormalizeKey(letter);
  if (!arabicKeyboard.includes(letter) || Array.from(s.entry).length >= s.size) return;
  s.entry += letter;
  renderWordguess();
}
function wordguessMessage(text) {
  state.feedback = text;
  if ($('wordguessMessage')) $('wordguessMessage').textContent = text;
  toast(text);
  wordsRevealFeedback('wordguessMessage');
}
function submitWordguess() {
  if (wordsBlocked('wordguess') || state.over) return;
  const s = state,
    guess = s.entry;
  if (Array.from(guess).length !== s.size)
    return wordguessMessage(`أكمل ${s.size} حروف قبل التحقق.`);
  if (!wordguessDictionary.has(guess))
    return wordguessMessage('الكلمة غير موجودة في القاموس المحلي. جرّب كلمة عربية شائعة.');
  if (s.attempts.some((a) => a.word === guess))
    return wordguessMessage('جربت هذه الكلمة بالفعل. اختر كلمة أخرى.');
  if (s.mode === 'focus') {
    const violation = wordguessConstraintViolation(guess, s.attempts);
    if (violation) return wordguessMessage(violation);
  }
  $('wordguessInput')?.blur();
  const marks = wordguessFeedback(guess, s.item.key),
    rank = { absent: 1, present: 2, correct: 3 };
  Array.from(guess).forEach((letter, i) => {
    if (rank[marks[i]] > (rank[s.keyStates[letter]] || 0)) s.keyStates[letter] = marks[i];
  });
  s.attempts.push({ word: guess, marks });
  s.entry = '';
  const correctCount = marks.filter((mark) => mark === 'correct').length,
    presentCount = marks.filter((mark) => mark === 'present').length;
  s.feedback = `✓ في مكانها: ${correctCount} · ↔ في مكان آخر: ${presentCount} · باقي ${6 - s.attempts.length} محاولات.`;
  if (guess === s.item.key) {
    s.won = true;
    s.over = true;
    tone(true);
  } else if (s.attempts.length === 6) s.over = true;
  else tone();
  renderWordguess();
  wordsRevealFeedback(s.over ? 'wordguessOutcome' : 'wordguessMessage');
}
function hintWordguess() {
  if (wordsBlocked('wordguess') || state.over || state.hinted) return;
  state.hinted = true;
  renderWordguess();
}
function finishWordguess() {
  if (wordsBlocked('wordguess') || !state.over) return;
  const s = state,
    points = s.won ? Math.max(10, 100 - (s.attempts.length - 1) * 14 - (s.hinted ? 10 : 0)) : 0;
  finishWords(
    s.won ? 'كلمة صحيحة!' : 'ست محاولات، ومعلومة جديدة',
    `الكلمة: ${s.item.word}. ${s.won ? 'وصلت إليها في ' + s.attempts.length + ' محاولات.' : 'جرّب كلمة جديدة واستفد من الألوان.'}`,
    points,
    s.item.word,
  );
}

function targetElapsed(s = state) {
  return s.duration * 1000 - Math.max(0, s.endAt - (s.pausedAt || Date.now()));
}
function startTarget(name) {
  const level = ['easy', 'normal', 'hard'].includes($('targetLevel')?.value)
      ? $('targetLevel').value
      : 'normal',
    duration = wordsReadOption('targetDuration', [30, 60], 30);
  state = {
    id: 'target',
    name,
    level,
    mode: ['speed', 'precision', 'sequence'].includes($('targetMode')?.value)
      ? $('targetMode').value
      : 'speed',
    duration,
    size: level === 'hard' ? 4 : 3,
    endAt: Date.now() + duration * 1000,
    points: 0,
    hits: 0,
    misses: 0,
    wrong: 0,
    bombHits: 0,
    reactions: [],
    combo: 0,
    bestCombo: 0,
    slot: -1,
    lastSlot: -1,
    token: 0,
    claimed: true,
    lastInput: 0,
    nextAt: 0,
    decoy: -1,
    sequence: [],
    sequenceStep: 0,
    completedPaths: 0,
    feedback: 'ابحث عن الهدف الملون!',
    done: false,
  };
  screen = 'target';
  spawnTarget();
  renderTarget();
  const s = state;
  repeat(() => {
    if (state !== s || s.done || s.pausedAt) return;
    if (!wordsSeconds(s)) return finishTarget();
    if ($('targetClock')) $('targetClock').textContent = wordsSeconds(s) + ' ث';
    if ($('targetTimebar'))
      $('targetTimebar').style.width = (100 * wordsSeconds(s)) / s.duration + '%';
    const elapsed = targetElapsed(s);
    const life = $('targetLife');
    if (life)
      life.style.width = Math.max(0, (100 * (s.targetExpires - elapsed)) / s.targetLifetime) + '%';
    if (s.slot >= 0 && elapsed >= s.targetExpires) {
      s.misses++;
      s.combo = 0;
      s.claimed = true;
      s.slot = -1;
      s.decoy = -1;
      s.sequence = [];
      s.feedback = 'فات الهدف! ركّز على الهدف التالي.';
      s.nextAt = elapsed + 90;
      renderTarget();
    }
    if (s.slot < 0 && elapsed >= s.nextAt) {
      spawnTarget();
      renderTarget();
    }
  }, 40);
  goTop();
}
function spawnTarget() {
  const s = state,
    total = s.size * s.size;
  let slot = randInt(total - 1);
  if (slot >= s.lastSlot && s.lastSlot >= 0) slot++;
  if (s.lastSlot < 0) slot = randInt(total);
  s.lastSlot = slot;
  s.slot = slot;
  s.token++;
  s.claimed = false;
  s.targetBorn = targetElapsed(s);
  s.targetLifetime = Math.max(
    s.level === 'hard' ? 320 : 400,
    { easy: 1400, normal: 950, hard: 720 }[s.level] - Math.floor(s.hits / 5) * 50,
  );
  s.targetExpires = s.targetBorn + s.targetLifetime;
  s.decoy = -1;
  s.sequence = [];
  s.sequenceStep = 0;
  if (s.mode === 'precision') {
    s.decoy = randInt(total - 1);
    if (s.decoy >= slot) s.decoy++;
  }
  if (s.mode === 'sequence')
    s.sequence = [
      slot,
      ...shuffle(Array.from({ length: total }, (_, i) => i).filter((i) => i !== slot)).slice(0, 2),
    ];
}
function targetStatusHTML(s) {
  return `<b class="countdown" id="targetClock">${wordsSeconds(s)} ث</b><span class="pill">💎 <b id="targetScore">${s.points}</b> نقطة</span><span class="pill">🔥 سلسلة ${s.combo}</span><span class="pill">✓ ${s.hits}</span>${s.mode === 'sequence' ? `<span class="pill">مسارات كاملة: ${s.completedPaths}</span>` : ''}`;
}
function targetArenaHTML(s) {
  return `${s.mode === 'sequence' ? `<p class="target-order" aria-label="ترتيب أهداف المسار">${[0, 1, 2].map((i) => `<span class="${i < s.sequenceStep ? 'complete' : i === s.sequenceStep && s.slot >= 0 ? 'current' : ''}">${i < s.sequenceStep ? '✓' : i + 1}</span>`).join('<i aria-hidden="true">←</i>')} <b>${s.slot >= 0 ? `اضغط الهدف ${s.sequenceStep + 1}` : 'المسار التالي…'}</b></p>` : ''}<div class="target-grid" style="--target-size:${s.size}" aria-label="خانات صيد الأهداف، مرتبة من اليسار">${Array.from(
    { length: s.size * s.size },
    (_, i) => {
      const active = i === s.slot && !s.claimed,
        decoy = i === s.decoy && !s.claimed,
        order = s.sequence.indexOf(i),
        queued = order > s.sequenceStep;
      return `<button class="target-cell ${active ? 'active' : decoy ? 'decoy' : queued ? 'queued' : ''}" data-index="${i}" onpointerdown="if(event.isPrimary&&event.button===0){event.preventDefault();hitTarget(${i},${s.token})}" onclick="if(event.detail===0)hitTarget(${i},${s.token})" aria-label="صف ${Math.floor(i / s.size) + 1}، عمود ${(i % s.size) + 1}: ${active ? (s.mode === 'sequence' ? `الهدف ${order + 1}، اضغط هنا` : 'هدف، اضغط هنا') : decoy ? 'قنبلة، تجنبها' : queued ? `الهدف ${order + 1}، انتظر دوره` : 'خانة فارغة'}">${active ? '<span aria-hidden="true">🎯</span>' : decoy ? '<span aria-hidden="true">💣</span>' : queued ? `<span aria-hidden="true">${order + 1}</span>` : '<span aria-hidden="true">·</span>'}${active && s.mode === 'sequence' ? `<strong class="target-order-badge" aria-hidden="true">${order + 1}</strong>` : ''}${s.size === 3 ? `<small class="target-key" aria-hidden="true">${i + 1}</small>` : ''}</button>`;
    },
  ).join(
    '',
  )}</div><div class="target-life-track" aria-hidden="true"><span id="targetLife" style="width:${s.slot >= 0 ? Math.max(0, (100 * (s.targetExpires - targetElapsed(s))) / s.targetLifetime) : 0}%"></span></div><p class="target-feedback" id="targetFeedback" role="status">${esc(s.feedback)}</p><div class="chips center"><span class="chip">أفضل سلسلة: ${s.bestCombo}</span><span class="chip">أهداف فاتت: ${s.misses}</span><span class="chip">ضغطات خاطئة: ${s.wrong}</span>${s.reactions?.length ? `<span class="chip">متوسط الاستجابة: ${Math.round(s.reactions.reduce((a, b) => a + b, 0) / s.reactions.length)} ملّي ثانية</span>` : ''}</div>`;
}
function renderTarget() {
  const s = state,
    focusedIndex = document.activeElement?.closest('.target-cell')?.dataset.index;
  // Preserve the surrounding page and its controls while targets change rapidly.
  if ($('targetArena')) {
    $('targetStatus').innerHTML = targetStatusHTML(s);
    $('targetArena').innerHTML = targetArenaHTML(s);
  } else {
    setHTML(
      wrap(
        'target',
        `<section class="panel target-panel"><div class="words-status" id="targetStatus">${targetStatusHTML(s)}</div><div class="words-clock-track"><span id="targetTimebar" style="width:${(100 * wordsSeconds(s)) / s.duration}%"></span></div><div id="targetArena">${targetArenaHTML(s)}</div><p class="note center">${s.mode === 'precision' ? '🎯 اصنع سلسلة نجاح، و💣 تجنب القنبلة. ' : s.mode === 'sequence' ? 'اصب 1 ثم 2 ثم 3؛ الضغط خارج الترتيب خطأ. ' : ''}النجاح المتتابع يزيد المكافأة حتى +20 للهدف. الأسهم للتنقل وEnter للإصابة.</p></section>`,
      ),
    );
  }
  if (focusedIndex !== undefined)
    document
      .querySelector(`.target-cell[data-index="${focusedIndex}"]`)
      ?.focus({ preventScroll: true });
}

function hitTarget(index, token) {
  if (wordsBlocked('target')) return;
  const s = state,
    now = Date.now();
  if (!wordsSeconds(s)) return finishTarget();
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= s.size * s.size ||
    token !== s.token ||
    s.slot < 0 ||
    s.claimed ||
    now - s.lastInput < 80
  )
    return;
  if (targetElapsed(s) >= s.targetExpires) return;
  s.lastInput = now;
  if (index !== s.slot) {
    s.wrong++;
    const bomb = index === s.decoy,
      penalty = bomb ? 8 : 3;
    if (bomb) s.bombHits++;
    s.combo = 0;
    s.points = Math.max(0, s.points - penalty);
    s.feedback = bomb
      ? 'قنبلة: −8. ركّز على الدائرة الملونة!'
      : s.mode === 'sequence' && s.sequence.includes(index)
        ? `خارج الترتيب: −3. اضغط الهدف ${s.sequenceStep + 1} أولاً.`
        : 'خانة فارغة: −3. استهدف الدائرة الملونة.';
    renderTarget();
    return;
  }
  s.claimed = true;
  s.slot = -1;
  s.decoy = -1;
  s.hits++;
  const reaction = Math.max(0, targetElapsed(s) - s.targetBorn);
  s.reactions?.push(reaction);
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const gain = 10 + Math.min(10, Math.floor((s.combo - 1) / 3) * 2);
  s.points += gain;
  s.feedback = `+${gain} نقطة · ${Math.round(reaction)} ملّي ثانية${s.combo >= 3 ? ' · سلسلة ممتازة!' : ''}`;
  if (s.mode === 'sequence') {
    s.sequenceStep++;
    if (s.sequenceStep < s.sequence.length) {
      s.slot = s.sequence[s.sequenceStep];
      s.lastSlot = s.slot;
      s.token++;
      s.claimed = false;
      s.targetBorn = targetElapsed(s);
      s.targetExpires = s.targetBorn + s.targetLifetime;
      s.feedback += ` · الآن الهدف ${s.sequenceStep + 1}`;
    } else {
      s.completedPaths++;
      s.feedback += ' · مسار كامل!';
    }
  }
  s.nextAt = targetElapsed(s) + 110;
  tone();
  renderTarget();
}
function finishTarget() {
  if (screen !== 'target' || !state || state.done) return;
  const s = state;
  // A delayed final timer tick must still count an already-expired, unclaimed target.
  if (s.slot >= 0 && !s.claimed && targetElapsed(s) >= s.targetExpires) {
    s.misses++;
    s.combo = 0;
    s.claimed = true;
    s.slot = -1;
  }
  const accuracy =
    s.hits + s.misses + s.wrong ? Math.round((100 * s.hits) / (s.hits + s.misses + s.wrong)) : 0;
  finishWords(
    'انتهت رحلة الصيد!',
    `${s.hits} هدفاً صحيحاً، ${s.misses} أهداف فاتت، و${s.wrong} ضغطات خاطئة. الدقة ${accuracy}%، وأفضل سلسلة ${s.bestCombo}.${s.reactions?.length ? ` متوسط الاستجابة ${Math.round(s.reactions.reduce((a, b) => a + b, 0) / s.reactions.length)} ملّي ثانية.` : ''}`,
    s.points,
    `${s.hits} هدفاً`,
  );
  const reactions = [...(s.reactions || [])].sort((a, b) => a - b),
    midpoint = Math.floor(reactions.length / 2),
    median = reactions.length
      ? reactions.length % 2
        ? reactions[midpoint]
        : (reactions[midpoint - 1] + reactions[midpoint]) / 2
      : 0,
    buckets = [
      ['أقل من 250', reactions.filter((time) => time < 250).length],
      ['250–500', reactions.filter((time) => time >= 250 && time < 500).length],
      ['500 فأكثر', reactions.filter((time) => time >= 500).length],
    ];
  document
    .querySelector('#app .play')
    ?.insertAdjacentHTML(
      'beforeend',
      `<section class="panel target-review"><h3>🎯 اقرأ أداءك</h3><div class="chips"><span class="chip">الدقة: ${accuracy}%</span>${reactions.length ? `<span class="chip">أسرع إصابة: ${Math.round(reactions[0])} ملّي ثانية</span><span class="chip">الاستجابة الوسطية: ${Math.round(median)} ملّي ثانية</span>` : ''}${s.mode === 'sequence' ? `<span class="chip">مسارات كاملة: ${s.completedPaths}</span>` : ''}</div>${reactions.length ? `<div class="target-reaction-bars" aria-label="توزيع أزمنة الاستجابة بالملّي ثانية">${buckets.map(([label, count]) => `<div><span>${label} ملّي ثانية</span><b>${count} إصابات</b><meter min="0" max="${reactions.length}" value="${count}" aria-label="${count} إصابات في ${label} ملّي ثانية"></meter></div>`).join('')}</div>` : ''}<p class="note">${s.wrong > s.misses ? 'خفف الضغطات العشوائية؛ إصابة مؤكدة أفضل من سلسلة أخطاء.' : s.misses > s.hits ? 'ابدأ بالمستوى المريح حتى تقل الأهداف التي تفوتك، ثم ارفع السرعة.' : 'ركز على استمرار السلسلة؛ السرعة تزيد مع كل خمس إصابات.'}</p></section>`,
    );
}
document.addEventListener('keydown', (event) => {
  if (
    !wordsGameIds.has(screen) ||
    wordsBlocked(screen) ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    event.repeat ||
    event.target.closest?.('input,select,textarea,[contenteditable="true"]')
  )
    return;
  if (
    ['Enter', ' '].includes(event.key) &&
    event.target.closest?.('button,a,summary,[role="button"]')
  )
    return;
  if (
    screen === 'target' &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  ) {
    const cell = event.target.closest?.('.target-cell');
    if (!cell && event.target.closest?.('button,a,summary')) return;
    event.preventDefault();
    const index = cell ? Number(cell.dataset.index) : 0,
      row = Math.floor(index / state.size),
      column = index % state.size,
      next =
        event.key === 'Home'
          ? row * state.size
          : event.key === 'End'
            ? (row + 1) * state.size - 1
            : event.key === 'ArrowUp'
              ? Math.max(0, row - 1) * state.size + column
              : event.key === 'ArrowDown'
                ? Math.min(state.size - 1, row + 1) * state.size + column
                : event.key === 'ArrowLeft'
                  ? row * state.size + Math.max(0, column - 1)
                  : row * state.size + Math.min(state.size - 1, column + 1);
    document.querySelector(`.target-cell[data-index="${next}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (screen === 'trivia') {
    if (state.locked && event.key === 'Enter') {
      event.preventDefault();
      nextTrivia();
    } else if (!state.locked && /^[1-4]$/.test(latin(event.key))) {
      event.preventDefault();
      answerTrivia(Number(latin(event.key)) - 1);
    }
    return;
  }
  if (screen === 'target' && state.size === 3 && /^[1-9]$/.test(latin(event.key))) {
    event.preventDefault();
    hitTarget(Number(latin(event.key)) - 1, state.token);
    return;
  }
  if (screen === 'hangman' && state.over && event.key === 'Enter') {
    event.preventDefault();
    nextHangman();
    return;
  }
  if (screen === 'hangman' && !state.over) {
    const letter = wordsNormalizeKey(event.key);
    if (arabicKeyboard.includes(letter)) {
      event.preventDefault();
      guessHangman(letter);
    }
    return;
  }
  if (screen === 'wordguess' && state.over && event.key === 'Enter') {
    event.preventDefault();
    finishWordguess();
    return;
  }
  if (screen === 'wordguess' && !state.over) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitWordguess();
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      typeWordguess('backspace');
    } else {
      const letter = wordsNormalizeKey(event.key);
      if (arabicKeyboard.includes(letter)) {
        event.preventDefault();
        typeWordguess(letter);
      }
    }
  }
});

// Curated local content follows.
const triviaCategories = [
  ['science', 'العلوم والطبيعة'],
  ['geo', 'الجغرافيا'],
  ['history', 'التاريخ'],
  ['sport', 'الرياضة'],
  ['culture', 'المعرفة العامة'],
];
// Rows: question | answer | three distractors | explanation. First 8 easy, next 8 normal, last 4 hard.
const triviaContent = {
  science: `أي كوكب يُعرف بالكوكب الأحمر؟|المريخ|الزهرة|زحل|نبتون|لون المريخ المحمر سببه أكاسيد الحديد في تربته.
ما الغاز الذي تحتاجه أجسامنا للتنفس؟|الأكسجين|الهليوم|الهيدروجين|النيون|تستخدم الخلايا الأكسجين لإطلاق الطاقة من الغذاء.
ما العضو الذي يضخ الدم في الجسم؟|القلب|الكبد|الرئة|المعدة|القلب عضلة تضخ الدم إلى الرئتين وإلى بقية الجسم.
كم عدد أرجل الحشرة البالغة عادةً؟|6|4|8|10|الحشرات لها ثلاثة أزواج من الأرجل، والعناكب لها ثماني أرجل.
أي جزء من النبات يمتص الماء من التربة؟|الجذور|الأزهار|الثمار|البذور|تمتص الجذور الماء والأملاح وتنقلها إلى باقي النبات.
أي حيوان من الثدييات؟|الدلفين|القرش|الأخطبوط|البطريق|الدلافين تتنفس الهواء وتلد صغاراً وترضعها.
ما الحالة المعتادة للماء عند تجمده؟|صلبة|غازية|بلازما|سائلة|يتحول الماء إلى جليد، وهي حالته الصلبة.
ما مصدر الطاقة الأساسي للأرض؟|الشمس|القمر|المريخ|الرياح فقط|الطاقة الشمسية تقود المناخ والتمثيل الضوئي.
ما الرمز الكيميائي للذهب؟|Au|Ag|Fe|Na|Au مأخوذ من الاسم اللاتيني للذهب: Aurum.
ما أكبر عضو في جسم الإنسان؟|الجلد|القلب|الدماغ|الكبد|الجلد يغطي الجسم ويعد أكبر أعضائه من حيث المساحة والكتلة.
أي طبقة جوية تحتوي معظم طبقة الأوزون؟|الستراتوسفير|التروبوسفير|الميزوسفير|الإكسوسفير|معظم الأوزون الجوي يقع في الستراتوسفير ويقلل الأشعة فوق البنفسجية.
كم عدد الكروموسومات في معظم خلايا جسم الإنسان؟|46|23|48|64|الخلايا الجسدية عادةً تحتوي 23 زوجاً، أما الأمشاج فتحتوي 23 كروموسوماً.
أي كوكب هو أكبر كواكب المجموعة الشمسية؟|المشتري|الأرض|زحل|أورانوس|المشتري أكبر الكواكب من حيث القطر والكتلة.
ما وحدة قياس المقاومة الكهربائية؟|الأوم|الفولت|الأمبير|الواط|الأوم يقيس المقاومة، والفولت فرق الجهد، والأمبير شدة التيار.
ما العملية التي تصنع بها النباتات غذاءها باستخدام الضوء؟|التمثيل الضوئي|التبخر|التخمر|التقطير|تستخدم النباتات الضوء لتحويل الماء وثاني أكسيد الكربون إلى مواد عضوية.
ما الجزء الذي يحمل معظم المادة الوراثية في الخلية البشرية؟|النواة|الغشاء|السيتوبلازم فقط|الريبوسوم|تحتوي النواة على الكروموسومات، ويوجد أيضاً قدر صغير من DNA في الميتوكوندريا.
ما العدد الذري للكربون؟|6|8|12|14|العدد الذري يساوي عدد البروتونات، وللكربون ستة بروتونات.
ما سرعة الضوء في الفراغ تقريباً؟|300 ألف كيلومتر في الثانية|30 ألف كيلومتر في الثانية|3 آلاف كيلومتر في الثانية|300 كيلومتر في الثانية|القيمة الدقيقة 299,792,458 متراً في الثانية.
من صاحب مبدأ عدم اليقين في الفيزياء؟|فيرنر هايزنبرغ|إسحاق نيوتن|مايكل فاراداي|نيكولا تسلا|وضع هايزنبرغ المبدأ في ميكانيكا الكم سنة 1927.
ما الناقل الرئيسي للأكسجين في الدم؟|الهيموغلوبين|الإنسولين|الكولاجين|الكيراتين|الهيموغلوبين بروتين في كريات الدم الحمراء يرتبط بالأكسجين.`,
  geo: `ما عاصمة الكويت؟|مدينة الكويت|الجهراء|السالمية|الأحمدي|مدينة الكويت هي عاصمة دولة الكويت ومركزها السياسي.
في أي قارة تقع معظم أراضي مصر؟|أفريقيا|أوروبا|أمريكا الجنوبية|أستراليا|معظم مصر في أفريقيا، وشبه جزيرة سيناء في آسيا.
ما أكبر محيط في العالم؟|المحيط الهادئ|المحيط الأطلسي|المحيط الهندي|المحيط المتجمد الشمالي|الهادئ أكبر المحيطات مساحةً وعمقاً.
ما عاصمة اليابان؟|طوكيو|كيوتو|أوساكا|سيول|طوكيو عاصمة اليابان، وسيول عاصمة كوريا الجنوبية.
في أي دولة يقع برج إيفل؟|فرنسا|إيطاليا|إسبانيا|ألمانيا|يقع برج إيفل في باريس، عاصمة فرنسا.
أي دولة عربية تُعرف بأرض الحرمين الشريفين؟|السعودية|الكويت|قطر|عُمان|تقع مكة المكرمة والمدينة المنورة في المملكة العربية السعودية.
ما عاصمة المملكة المتحدة؟|لندن|مانشستر|ليفربول|إدنبرة|لندن هي العاصمة، وإدنبرة عاصمة اسكتلندا داخل المملكة المتحدة.
في أي قارة تقع البرازيل؟|أمريكا الجنوبية|أمريكا الشمالية|أفريقيا|آسيا|البرازيل أكبر دول أمريكا الجنوبية من حيث المساحة.
ما أكبر دولة في العالم من حيث المساحة؟|روسيا|كندا|الصين|الولايات المتحدة|روسيا تمتد في أوروبا وآسيا وتتجاوز مساحتها 17 مليون كيلومتر مربع.
ما عاصمة أستراليا؟|كانبيرا|سيدني|ملبورن|بيرث|كانبيرا هي العاصمة الاتحادية، وسيدني أكبر المدن من حيث السكان.
ما البحر الذي يفصل أوروبا عن أفريقيا؟|البحر المتوسط|بحر البلطيق|البحر الأحمر|بحر قزوين|المتوسط يحد جنوب أوروبا وشمال أفريقيا.
ما عاصمة المغرب؟|الرباط|الدار البيضاء|فاس|مراكش|الرباط هي العاصمة السياسية للمغرب.
أي نهر يمر بمدينة بغداد؟|دجلة|الفرات|النيل|الأردن|تقع بغداد على ضفتي نهر دجلة.
في أي دولة تقع مدينة إسطنبول؟|تركيا|اليونان|بلغاريا|رومانيا|إسطنبول تمتد على جانبي مضيق البوسفور بين أوروبا وآسيا.
أي جبال تفصل عادةً بين أوروبا وآسيا في روسيا؟|الأورال|الألب|الأنديز|الأطلس|جبال الأورال جزء من الحد الجغرافي التقليدي بين القارتين.
ما أعلى قمة جبلية فوق مستوى سطح البحر؟|إيفرست|كيليمنجارو|مون بلان|أكونكاغوا|ارتفاع إيفرست يقارب 8,849 متراً فوق سطح البحر.
ما الدولة التي تحيط بالكامل بدولة ليسوتو؟|جنوب أفريقيا|كينيا|ناميبيا|بوتسوانا|ليسوتو دولة حبيسة تحيط بها جنوب أفريقيا من كل الجهات.
ما أعمق بحيرة في العالم؟|بايكال|فيكتوريا|سوبيريور|تيتيكاكا|تقع بايكال في سيبيريا ويبلغ أقصى عمق لها نحو 1,642 متراً.
أي مضيق يفصل المغرب عن إسبانيا؟|مضيق جبل طارق|مضيق هرمز|مضيق البوسفور|مضيق ملقا|مضيق جبل طارق يصل المحيط الأطلسي بالبحر المتوسط.
ما عاصمة كازاخستان؟|أستانا|ألماتي|طشقند|بيشكيك|عاد اسم العاصمة إلى أستانا سنة 2022، وألماتي هي العاصمة السابقة.`,
  history: `في أي دولة توجد أهرامات الجيزة؟|مصر|العراق|الأردن|المغرب|أهرامات الجيزة آثار من مصر القديمة قرب القاهرة.
في أي عام نالت الكويت استقلالها؟|1961|1951|1971|1981|نالت الكويت استقلالها في 19 يونيو 1961.
أي حضارة بنت الكولوسيوم في روما؟|الرومانية|الفرعونية|الفارسية|المايا|افتُتح المدرج الروماني المعروف بالكولوسيوم سنة 80 ميلادية.
من أول الخلفاء الراشدين؟|أبو بكر الصديق|عمر بن الخطاب|عثمان بن عفان|علي بن أبي طالب|تولى أبو بكر الخلافة بعد وفاة النبي محمد ﷺ.
ما المدينة التي هاجر إليها النبي محمد ﷺ؟|المدينة المنورة|الطائف|دمشق|القدس|كانت تُعرف بيثرب، ومنها يبدأ التقويم الهجري.
في أي قارة ظهرت حضارة المايا؟|أمريكا الشمالية|أوروبا|آسيا|أستراليا|انتشرت المايا في جنوب المكسيك وأجزاء من أمريكا الوسطى، وهي ضمن أمريكا الشمالية.
في أي دولة بُني سور الصين العظيم؟|الصين|اليابان|الهند|منغوليا|السور سلسلة تحصينات بُنيت في عصور مختلفة في الصين.
من القائد الذي اشتهر بتحرير القدس عام 1187؟|صلاح الدين الأيوبي|طارق بن زياد|محمد الفاتح|خالد بن الوليد|استعاد صلاح الدين القدس بعد انتصاره في معركة حطين.
في أي عام انتهت الحرب العالمية الثانية؟|1945|1939|1918|1950|انتهت الحرب العالمية الثانية سنة 1945.
في أي عام سقط جدار برلين؟|1989|1979|1999|1969|فُتحت المعابر في 9 نوفمبر 1989، ثم أُزيل الجدار تدريجياً.
من السلطان العثماني الذي فتح القسطنطينية؟|محمد الثاني|سليمان القانوني|سليم الأول|عثمان الأول|فتح محمد الثاني القسطنطينية سنة 1453 ولُقب بالفاتح.
في أي عام وصل أول إنسان إلى القمر؟|1969|1959|1979|1989|هبطت بعثة أبولو 11 على القمر في يوليو 1969.
من الرحالة المغربي صاحب كتاب «تحفة النظار»؟|ابن بطوطة|ابن خلدون|ابن رشد|الإدريسي|يروي الكتاب رحلات ابن بطوطة في مناطق واسعة من العالم.
ما المدينة التي كانت عاصمة الدولة العباسية في عصرها الذهبي؟|بغداد|دمشق|القاهرة|قرطبة|أسس الخليفة المنصور بغداد سنة 762 ميلادية.
في أي عام بدأت الثورة الفرنسية؟|1789|1689|1889|1815|بدأت أحداث الثورة الفرنسية الكبرى سنة 1789.
من مؤلف «المقدمة»؟|ابن خلدون|الخوارزمي|ابن سينا|الجاحظ|المقدمة لابن خلدون تناقش العمران والاجتماع والتاريخ.
في أي عام صدرت وثيقة الماغنا كارتا؟|1215|1066|1453|1492|أصدر الملك جون الوثيقة في إنجلترا سنة 1215.
أي حضارة قديمة استخدمت الكتابة المسمارية أولاً؟|السومرية|الإغريقية|الرومانية|الإنكا|ظهرت الكتابة المسمارية عند السومريين في بلاد الرافدين.
أي معركة وقعت عام 1815 وأنهت حكم نابليون؟|واترلو|حطين|القادسية|أوسترليتز|هُزم نابليون في واترلو في 18 يونيو 1815.
من ألّف «الكتاب المختصر في حساب الجبر والمقابلة»؟|الخوارزمي|الكندي|البيروني|ابن الهيثم|أرسى كتاب الخوارزمي مبادئ الجبر بصياغة منهجية في القرن التاسع.`,
  sport: `كم لاعباً يبدأون المباراة لكل فريق كرة قدم؟|11|7|9|12|يبدأ كل فريق بأحد عشر لاعباً، منهم حارس المرمى.
كم حلقة في شعار الألعاب الأولمبية؟|5|4|6|7|الحلقات الأولمبية الخمس ترمز إلى اتحاد القارات ومشاركة الرياضيين.
أي رياضة تستخدم المضرب والريشة؟|الريشة الطائرة|كرة السلة|السباحة|الرماية|تُلعب الريشة الطائرة بمضارب وريشة فوق شبكة.
كم مدة شوط كرة القدم الأساسي؟|45 دقيقة|30 دقيقة|40 دقيقة|60 دقيقة|المباراة الأساسية شوطان، كل منهما 45 دقيقة مع وقت بدل ضائع.
في أي رياضة يمكن تسجيل سلة؟|كرة السلة|كرة القدم|الهوكي|التنس|يحاول اللاعبون إدخال الكرة في سلة الفريق المنافس.
أي رياضة تتضمن سباقات حرة وظهر وفراشة؟|السباحة|الجري|التجديف|الملاكمة|هذه من طرق السباحة المستخدمة في المسابقات.
كم مرة يُقام كأس العالم لكرة القدم للرجال عادةً؟|كل 4 سنوات|كل سنة|كل سنتين|كل 6 سنوات|دورة البطولة المعتادة كل أربع سنوات.
ما لون البطاقة التي تعني طرد لاعب كرة القدم؟|الحمراء|الصفراء|الخضراء|الزرقاء|البطاقة الحمراء تعني إخراج اللاعب من المباراة.
كم لاعباً داخل الملعب لكل فريق كرة سلة؟|5|6|7|8|يلعب خمسة لاعبين لكل فريق في الوقت نفسه.
كم لاعباً داخل الملعب لكل فريق كرة طائرة داخل الصالة؟|6|5|7|9|يتكون كل فريق من ستة لاعبين في الملعب في الكرة الطائرة داخل الصالة.
كم طول سباق الماراثون الرسمي؟|42.195 كيلومتراً|40 كيلومتراً|21.1 كيلومتراً|50 كيلومتراً|المسافة الرسمية للماراثون هي 42.195 كيلومتراً.
أي منتخب فاز بكأس العالم للرجال 2022؟|الأرجنتين|فرنسا|البرازيل|كرواتيا|فازت الأرجنتين على فرنسا بركلات الترجيح في النهائي.
على أي أرضية تُلعب بطولة ويمبلدون؟|العشب|التراب|الجليد|الرمل|ويمبلدون بطولة تنس تشتهر بملاعبها العشبية.
كم قطعة يبدأ بها كل لاعب في الشطرنج؟|16|12|15|20|يبدأ اللاعب بثمانية بيادق وثماني قطع أخرى.
ما المسافة بين نقطة الجزاء وخط المرمى في كرة القدم؟|11 متراً|9 أمتار|12 متراً|15 متراً|تُوضع نقطة الجزاء على بُعد 11 متراً من منتصف خط المرمى.
كم نقطة للرمية الحرة الناجحة في كرة السلة؟|نقطة واحدة|نقطتان|3 نقاط|4 نقاط|الرمية الحرة الناجحة تساوي نقطة واحدة.
ما الدولة التي استضافت أول كأس عالم عام 1930؟|الأوروغواي|البرازيل|إيطاليا|فرنسا|استضافت الأوروغواي البطولة الأولى وفازت بها.
كم كرة حمراء في بداية مباراة السنوكر التقليدية؟|15|10|12|20|تبدأ الطاولة بخمس عشرة كرة حمراء وست كرات ملونة.
كم عدد الحواجز في سباق 110 أمتار حواجز للرجال؟|10|8|12|15|يمر العداء فوق عشرة حواجز خلال السباق.
ما اسم التعادل الذي يحدث عند انعدام الحركة القانونية دون كش في الشطرنج؟|الردب|كش مات|التبييت|الأخذ بالتجاوز|الردب يحدث عندما يكون اللاعب غير واقع في كش ولا يملك حركة قانونية.`,
  culture: `كم يوماً في السنة الكبيسة؟|366|365|364|360|تضيف السنة الكبيسة يوماً إلى فبراير في التقويم الميلادي.
كم ضلعاً للمثلث؟|3|4|5|6|المثلث له ثلاثة أضلاع وثلاث زوايا.
ما اللغة الرسمية في البرازيل؟|البرتغالية|الإسبانية|الفرنسية|الإيطالية|البرتغالية هي اللغة الرسمية والأكثر انتشاراً في البرازيل.
أي أداة تقيس درجة الحرارة؟|ميزان الحرارة|البوصلة|المسطرة|الساعة|يقيس ميزان الحرارة درجات الحرارة بمقاييس مثل سيلسيوس.
كم شهراً في السنة الميلادية؟|12|10|11|13|يتكون التقويم الميلادي من اثني عشر شهراً.
من مؤلف رواية «الأمير الصغير»؟|أنطوان دو سانت إكزوبيري|فيكتور هوغو|تشارلز ديكنز|نجيب محفوظ|نُشرت رواية الأمير الصغير سنة 1943.
ما الأداة التي تساعد على معرفة الاتجاهات؟|البوصلة|المجهر|الميزان|البارومتر|تشير البوصلة المغناطيسية تقريباً إلى الشمال المغناطيسي.
ما العملة الرسمية في الكويت؟|الدينار الكويتي|الريال|الدرهم|الجنيه|الدينار الكويتي مقسم إلى ألف فلس.
من كتب مسرحية «هاملت»؟|ويليام شكسبير|أوسكار وايلد|جان راسين|جورج برنارد شو|هاملت إحدى أشهر مآسي الكاتب الإنجليزي شكسبير.
ما مجموع زوايا المثلث في الهندسة الإقليدية؟|180 درجة|90 درجة|270 درجة|360 درجة|زوايا المثلث الداخلية مجموعها 180 درجة في المستوى الإقليدي.
ما الجهاز الذي يحول النص الرقمي إلى نسخة ورقية؟|الطابعة|الماسح الضوئي|الموجه|الميكروفون|الطابعة تخرج النصوص والصور على الورق.
ماذا تعني الأحرف CPU في الحاسوب؟|وحدة المعالجة المركزية|ذاكرة الوصول العشوائي|وحدة التخزين الخارجية|وحدة عرض الصور|CPU تعني Central Processing Unit، وتنفذ تعليمات البرامج.
من أول أديب عربي فاز بجائزة نوبل في الأدب؟|نجيب محفوظ|طه حسين|جبران خليل جبران|توفيق الحكيم|نال نجيب محفوظ جائزة نوبل في الأدب سنة 1988.
ما الخط العربي الشائع في كتابة الكتب المطبوعة؟|النسخ|الكوفي المربع|الديواني|الطغراء|خط النسخ واضح وسهل القراءة وشائع في الكتب والمصاحف.
أي لون ينتج عادةً من خلط الأزرق والأصفر في الأصباغ؟|الأخضر|البنفسجي|البرتقالي|الأحمر|خلط الصبغ الأزرق والأصفر يعطي عادةً درجات من الأخضر.
كم عدد مربعات رقعة الشطرنج؟|64|81|100|49|الرقعة تتكون من ثمانية صفوف وثمانية أعمدة: 8×8=64.
ما نظام الكتابة الملموسة المخصص للمكفوفين؟|برايل|مورس|المسمارية|الهيروغليفية|برايل يستخدم مجموعات من النقاط البارزة التي تُقرأ باللمس.
من رسم لوحة «ليلة النجوم»؟|فنسنت فان غوخ|بابلو بيكاسو|كلود مونيه|سلفادور دالي|رسم فان غوخ ليلة النجوم سنة 1889.
كم بتاً في البايت القياسي؟|8|4|16|32|البايت القياسي يتكون من ثمانية بِتّات.
أي عدد هو عدد أولي؟|29|21|27|33|29 لا يقبل القسمة إلا على 1 وعلى نفسه، والخيارات الأخرى مركبة.`,
};
const triviaBank = Object.entries(triviaContent).flatMap(([cat, text]) =>
  text.split('\n').map((line, i) => {
    const r = line.split('|');
    return {
      id: cat + '-' + i,
      cat,
      level: i < 8 ? 'easy' : i < 16 ? 'normal' : 'hard',
      question: r[0],
      answer: r[1],
      choices: r.slice(1, 5),
      explanation: r[5],
    };
  }),
);
const wordsCategories = [
  ['animals', 'الحيوانات'],
  ['food', 'الطعام'],
  ['home', 'البيت والأدوات'],
  ['nature', 'الطبيعة'],
  ['places', 'الأماكن'],
  ['general', 'كلمات متنوعة'],
];
// Every secret has its own category and clue. Hamza-on-alif variants compare as alif only.
const wordsContent = {
  animals: `حصان:حيوان يستخدم في الركوب والسباقات|حمار:حيوان يشتهر بتحمل الأثقال|أرنب:له أذنان طويلتان ويقفز بسرعة|غزال:حيوان رشيق له قرون عند كثير من أنواعه|ثعلب:حيوان بري له ذيل كثيف|زرافة:حيوان طويل الرقبة|فراشة:حشرة ذات أجنحة ملونة|نحلة:حشرة تجمع الرحيق وتصنع العسل|نملة:حشرة صغيرة تعيش في مستعمرات|سمكة:تتنفس غالباً بالخياشيم|دجاجة:طائر منزلي يضع البيض|حمامة:طائر يعيش كثيراً قرب الناس|عصفور:طائر صغير يغرد|بومة:طائر يشتهر بالنشاط ليلاً|غراب:طائر أسود ذكي|خروف:حيوان يُربى للصوف واللحم|بقرة:حيوان يُربى لإنتاج الحليب|جاموس:حيوان كبير قريب من الأبقار|بلبل:طائر مشهور بصوت تغريده|هدهد:طائر له تاج من الريش على رأسه|عقرب:له ذيل ينتهي بلسعة|ثعبان:زاحف طويل بلا أرجل|تمساح:زاحف كبير يعيش قرب الماء|طاووس:طائر له ذيل مروحي جميل|قنفذ:حيوان صغير يغطي ظهره الشوك|بطريق:طائر سباح لا يطير|خنفسة:حشرة لها غطاء صلب فوق الجناحين|صرصور:حشرة تنشط كثيراً في الليل|سنجاب:حيوان يتسلق الأشجار وذيله كثيف|دلفين:ثديي بحري يتنفس الهواء|سلحفاة:زاحف يحمي جسمه درع|أخطبوط:كائن بحري له ثمانية أذرع`,
  food: `تفاح:فاكهة تنمو على الأشجار وتأتي بألوان متعددة|ليمون:فاكهة حمضية تستخدم في العصير|بطيخ:فاكهة كبيرة كثيرة الماء|شمام:فاكهة حلوة تشبه البطيخ|رمان:فاكهة تحتوي كثيراً من الحبوب|خيار:خضار أخضر يستخدم في السلطة|طماطم:ثمرة حمراء شائعة في السلطات|بطاطا:درنات تؤكل مطبوخة أو مشوية|بطاطس:درنات تستخدم للقلي والسلق|ملفوف:خضار أوراقه متراكبة|فلفل:خضار قد يكون حلواً أو حاراً|شعير:حبوب تدخل في الغذاء والأعلاف|فطيرة:عجين مخبوز قد يحتوي حشوة|جبنة:طعام يصنع من الحليب|زبدة:مادة دهنية تصنع من الحليب|حليب:مشروب تنتجه إناث الثدييات|عصير:شراب يستخرج من الفاكهة أو الخضار|قهوة:مشروب يصنع من حبوب محمصة|سمسم:بذور صغيرة تستخدم في الطحينة|زعتر:نبات عطري يستخدم في الطعام|نعناع:نبات عطري يضاف للشاي|قرفة:بهار يصنع من لحاء شجرة|قرنفل:بهار يشبه المسمار الصغير|فاكهة:ثمار حلوة أو حامضة تؤكل عادةً طازجة|سلطة:طبق من الخضار أو مكونات أخرى|كعكة:حلوى مخبوزة تقدم في المناسبات|مربى:فاكهة مطبوخة مع السكر|زيتون:ثمار تعصر لإنتاج زيت معروف|برغل:قمح مسلوق ومجروش|بقدونس:نبات أخضر يستخدم في التبولة|برتقال:فاكهة حمضية ذات قشر برتقالي|فراولة:فاكهة حمراء تحمل بذورها على سطحها`,
  home: `كتاب:صفحات مجمعة تحتوي نصوصاً أو صوراً|مكتب:طاولة للكتابة أو مكان للعمل|ورقة:سطح رقيق نكتب عليه|نافذة:فتحة في الجدار يدخل منها الضوء|حقيبة:وعاء نحمل فيه أغراضنا|حاسوب:جهاز يعالج البيانات ويشغل البرامج|هاتف:جهاز يستخدم للاتصال|شاشة:سطح يعرض الصور والمعلومات|لوحة:سطح يمكن الرسم أو الكتابة عليه|ساعة:أداة لمعرفة الوقت|نظارة:أداة تُلبس أمام العينين|ملعقة:أداة تستخدم للأكل أو التقليب|شوكة:أداة أكل لها أسنان|زجاجة:وعاء ضيق العنق للسوائل|مطبخ:المكان المخصص لإعداد الطعام|غرفة:جزء مغلق من المنزل|كرسي:قطعة أثاث للجلوس|سرير:قطعة أثاث للنوم|سجادة:نسيج يوضع على الأرض|وسادة:قطعة لينة تسند الرأس|بطانية:غطاء يحفظ الدفء|مصباح:أداة تعطي الضوء|مفتاح:أداة لفتح قفل|مقص:أداة لقص الورق والقماش|مطرقة:أداة للطرق على المسامير|مسمار:قطعة معدنية لتثبيت الأشياء|فرشاة:أداة ذات شعيرات للتنظيف أو الرسم|مكنسة:أداة لتنظيف الأرض|مسطرة:أداة لقياس الأطوال ورسم الخطوط|ثلاجة:جهاز يحفظ الطعام بارداً|مرآة:سطح يعكس صورتك|شمعة:تضيء عند إشعال فتيلها|صابون:مادة تستخدم للغسل والتنظيف|منشفة:قماش يستخدم للتجفيف`,
  nature: `زهرة:جزء ملون من النبات|شجرة:نبات له ساق خشبية|غابة:مساحة كبيرة تكثر فيها الأشجار|رمال:حبيبات صغيرة تغطي الشواطئ والصحارى|صخرة:كتلة صلبة طبيعية|سحاب:قطرات ماء أو بلورات جليد معلقة في السماء|سماء:ما نراه فوق الأرض|نجمة:جرم مضيء في السماء|كوكب:جرم يدور حول نجم|بركان:فتحة في القشرة تخرج منها الصهارة|جزيرة:أرض يحيط بها الماء|صحراء:منطقة قليلة الهطول|واحة:منطقة خصبة في الصحراء|محيط:مسطح مائي هائل مالح|بحيرة:ماء تحيط به اليابسة|شلال:ماء يسقط من ارتفاع|شاطئ:الأرض المحاذية للبحر|جليد:ماء في الحالة الصلبة|نسيم:ريح خفيفة لطيفة|عاصفة:حالة جوية فيها رياح قوية|ربيع:فصل تزهر فيه النباتات|خريف:فصل يأتي بعد الصيف|شتاء:أبرد فصول السنة عادةً|تراب:مادة تغطي سطح الأرض|جذور:أجزاء النبات التي تمتد في التربة|بذرة:جزء يمكن أن ينمو إلى نبات|وردة:زهرة مشهورة بالعطر والجمال|نخلة:شجرة تنتج التمر|سنابل:أجزاء من النبات تحمل الحبوب|قوس:شكل منحني يشبه جزءاً من دائرة`,
  places: `منزل:مكان يسكن فيه الإنسان|مدينة:تجمع سكاني كبير|حديقة:مكان تكثر فيه النباتات والأشجار|مطار:مكان تقلع منه الطائرات وتهبط|طريق:مسار للتنقل من مكان إلى آخر|شارع:طريق داخل مدينة أو قرية|رصيف:جزء بجانب الشارع للمشاة|مدرسة:مكان للتعلم|مكتبة:مكان لحفظ الكتب أو استعارتها|متحف:مكان يعرض آثاراً أو أعمالاً فنية|مسجد:مكان عبادة للمسلمين|ملعب:مكان للتدريب والمباريات|مطعم:مكان يقدم وجبات للزبائن|مخبز:مكان يصنع ويبيع الخبز|مصنع:مكان لإنتاج السلع|مزرعة:أرض للزراعة أو تربية الحيوانات|محطة:مكان تتوقف فيه وسائل النقل|ميناء:مكان ترسو فيه السفن|فندق:مكان للإقامة المؤقتة|جسر:بناء يربط بين ضفتين أو مكانين|ساحة:مساحة مفتوحة واسعة|قرية:تجمع سكاني أصغر من المدينة|قلعة:بناء محصن للدفاع|برج:بناء مرتفع|مسرح:مكان يقدم عروضاً حية|جامعة:مؤسسة للتعليم العالي|سفارة:مقر التمثيل الدبلوماسي لدولة|مستشفى:مكان للعلاج والرعاية الصحية|سوق:مكان للبيع والشراء`,
  general: `سيارة:وسيلة نقل لها عادةً أربع عجلات|طائرة:وسيلة نقل تتحرك في الجو|سفينة:وسيلة نقل كبيرة في البحر|قطار:وسيلة نقل تسير على سكة|دراجة:وسيلة نقل يقودها الشخص بالدواسات|رسالة:كلام مكتوب يرسل إلى شخص|هدية:شيء يقدم لشخص دون مقابل|صديق:شخص تجمعك به علاقة مودة|عائلة:أشخاص تجمعهم صلة قرابة|طفولة:مرحلة الحياة قبل البلوغ|فكرة:معنى أو تصور في الذهن|حروف:رموز تتكون منها الكلمات|جملة:كلمات مرتبة تعطي معنى|قصة:حكاية لها أحداث|صورة:تمثيل بصري لشخص أو شيء|خريطة:رسم يوضح أماكن واتجاهات|علم:رمز يمثل دولة أو جهة|نجاح:تحقيق هدف مطلوب|سعادة:شعور بالسرور والرضا|أمانة:حفظ الحقوق وأداء ما اؤتمن عليه الشخص|شجاعة:التصرف بثبات أمام الخوف|سلام:حالة من الطمأنينة أو غياب الحرب|حرية:قدرة على الاختيار ضمن الحقوق|عدالة:إعطاء كل صاحب حق حقه|رياضة:نشاط بدني للتدريب أو المنافسة|سباحة:حركة في الماء باستخدام الجسم|قراءة:فهم الرموز المكتوبة|كتابة:تسجيل الكلمات والرموز|ذاكرة:القدرة على حفظ المعلومات واسترجاعها|مهارة:قدرة مكتسبة على أداء عمل|تعاون:عمل أشخاص معاً لتحقيق هدف|رحلة:انتقال إلى مكان بقصد محدد|مغامرة:تجربة فيها اكتشاف أو مخاطرة|لعبة:نشاط للتسلية أو التحدي|لغز:سؤال يحتاج إلى التفكير للوصول إلى حله`,
};
const wordsLexicon = Object.entries(wordsContent).flatMap(([cat, text]) =>
  text.split('|').map((line) => {
    const [word, hint] = line.split(':');
    return { word, key: wordsNormalizeKey(word), hint, cat };
  }),
);
const wordguessExtraWords =
  'أقلام ألوان أحلام أرقام أبواب أوقات أخلاق أوراق أصوات أضواء أجنحة أزهار ألعاب أعشاب أسواق أمطار أيام ألبوم أخبار أفعال أعضاء أجزاء أمتار أسنان آذان إيمان إبداع إنسان إتقان إنتاج أنغام بناء جمال سؤال جواب كلام نظام أمان ذكاء مكان زمان نهار صباح مساء ظلام علوم فنون دروس شروق غروب وقود نقود كنوز رجال نساء أطفال شباب طالب معلم مدير عامل طبيب ممرض نجار خباز لاعب بائع قاضي جندي ضابط رقيب قائد كاتب شاعر رسام زائر صاحب رفيق فريق عيون رموش وجوه قلوب دماغ عظام رقبة ذراع إصبع لسان حاسة علاج دواء لقاح حرارة برودة حركة سرعة طاقة ضحكة بسمة رائحة نكهة مذاق سائل معدن نحاس فضة حديد فولاذ حرير نسيج قميص بنطال حذاء جورب خاتم سوار بوصلة نظير مثال دليل نتيجة بداية نهاية خطوة مرحلة فرصة مهمة طريقة تجربة خبرة عادة معنى قيمة قرار اختيار حلول دورة جولة موعد تاريخ تقويم حساب نسبة مساحة محيط مربع مثلث دائرة نقطة محور زاوية واحد اثنان ثلاث أربع خمسة سبعة تسعة عشرة عشرون مليون خسارة تعادل سباق قفزة رمية شبكة مضرب قارب مركب مرساة شراع مجداف عجلة محرك بنزين مقود بطاقة تذكرة جواز حدود مسار سلالم مصعد حمام مخزن خزانة رفوف صحون أطباق فنجان إبريق مقلاة موقد طعام فطور غداء عشاء وجبة لقمة فستق كاجو دجاج مثلج حلوى كعكة كريمة شوربة حساء مشمش كوسة باذنجان سبانخ منقار مخلب جناح حافر فراء قشور ماعز ضفدع حبار مرجان لؤلؤ خليج ربوة تربة غبار بخار هلال خسوف كسوف مجرة مذنب عطارد الأرض مريخ نبتون'.split(
    /\s+/,
  );
const wordguessDictionary = new Set(
  [...wordsLexicon.map((w) => w.key), ...wordguessExtraWords.map(wordsNormalizeKey)].filter((w) =>
    [4, 5].includes(Array.from(w).length),
  ),
);

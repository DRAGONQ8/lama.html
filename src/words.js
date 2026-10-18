// Arabic knowledge, vocabulary and precision challenges. No network assets.
games.push(
  [
    'trivia',
    '🧠',
    'كنز المعلومات',
    'أسئلة أو تحقق من الأخبار باختيار حقيقتين، مع أسباب ومراجعة تثبّت معلوماتك.',
    'بروحك',
    '#b7d3ff',
  ],
  [
    'hangman',
    '🔤',
    'اكشف الكلمة',
    'اكشف كلمات أو عبارات من ألغاز دلالية، مع أدلة ومهمات ودروع إنقاذ.',
    'بروحك',
    '#ffd394',
  ],
  [
    'wordguess',
    '🟩',
    'كلمة في ست',
    'خمن كلمة بالألوان، أو قارن فرضيتين في مختبر استنتاج يحترم الأدلة.',
    'بروحك',
    '#a6ebc7',
  ],
  [
    'target',
    '🎯',
    'صياد الأهداف',
    'سرعة وذاكرة أو اعتراض هدف يتحرك فعلاً؛ اختبر دقتك واستمرار السلسلة.',
    'بروحك',
    '#f5b8d6',
  ],
);
Object.assign(gameWorld, { trivia: 'brain', hangman: 'guess', wordguess: 'brain', target: 'duel' });
timedGames.add('trivia');
timedGames.add('target');
const wordsGameIds = new Set(['trivia', 'hangman', 'wordguess', 'target']);
let wordsRunSerial = 0;
// Each rendered control belongs to one run and, where relevant, one question/word.
function wordsCurrentRun(run, phase) {
  return (
    (run === undefined || run === state?.run) && (phase === undefined || phase === state?.index)
  );
}
const wordsRandom = (n) => (typeof gameRand === 'function' ? gameRand(n) : randInt(n));
function wordsShuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = wordsRandom(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
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
    body = `<p class="muted">اختبر معلوماتك، واقرأ سبب الإجابة بعد كل سؤال. الأسئلة لا تتكرر في الجولة.</p><div class="fields"><div class="field"><label for="triviaCategory">الموضوع</label><select id="triviaCategory" onchange="updateTriviaAvailability()"><option value="all">كل المواضيع</option>${triviaCategories.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></div><div class="field"><label for="triviaLevel">المستوى</label><select id="triviaLevel" onchange="updateTriviaAvailability()"><option value="all">كل المستويات</option><option value="easy">سهل</option><option value="normal">متوسط</option><option value="hard">صعب</option></select></div><div class="field"><label for="triviaMode">طريقة اللعب</label><select id="triviaMode" onchange="updateTriviaAvailability()"><option value="classic">معرفة · الإجابات الصحيحة</option><option value="strategy">رهان المعرفة · اختر ثقتك قبل الجواب</option><option value="facts">تحقق من الخبر · حقيقتان بين أربع عبارات</option></select></div><div class="field"><label for="triviaCount">عدد الأسئلة</label><select id="triviaCount"><option value="10">10 أسئلة</option><option value="20">20 سؤالاً</option></select></div><div class="field"><label for="triviaTimer">وقت كل سؤال</label><select id="triviaTimer"><option value="30">30 ثانية</option><option value="15">15 ثانية · تحدي سريع</option><option value="0">بدون مؤقت</option></select></div>${playerField('سجّل النتيجة باسم')}</div><p class="note" id="triviaAvailable"></p><div class="hintpanel">في رهان المعرفة: جواب عادي صحيح +10، وواثق صحيح +15 أو خاطئ −5. مساعدتا نصف الخيارات لكل جولة؛ استخدام المساعدة يخفض مكافأة السؤال 3 نقاط. النتيجة من 100. المؤقت يتوقف أثناء قراءة الشرح. استخدم الأرقام 1–4 للاختيار، وEnter للسؤال التالي. في التحقق من الخبر اختر عبارتين ثم أكد؛ كل حقيقة صحيحة مختارة +5، ولا تُحسب إجابة كاملة إلا باختيار الحقيقتين. المؤقت ينهي السؤال دون نقاط إن لم تؤكد.</div>`;
  if (id === 'hangman')
    body = `<p class="muted">اكشف الحروف، واستفد من الفئة والوصف. الكلمات لا تتكرر، وكل خطأ أو تلميح يقلل مكافأة الكلمة.</p><div class="fields"><div class="field"><label for="hangCategory">فئة الكلمات</label><select id="hangCategory" onchange="updateHangmanAvailability()"><option value="all">كل الفئات</option>${wordsCategories.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></div><div class="field"><label for="hangLevel">المستوى</label><select id="hangLevel" onchange="updateHangmanAvailability()"><option value="easy">مريح · 8 أخطاء و3 تلميحات</option><option value="normal" selected>متوسط · 6 أخطاء وتلميحان</option><option value="hard">خبير · 5 أخطاء وتلميح واحد، بلا وصف</option></select></div><div class="field"><label for="hangMode">طريقة اللعب</label><select id="hangMode" onchange="updateHangmanAvailability()"><option value="classic">كلمات مستقلة · أكمل الجولة براحتك</option><option value="rescue">رحلة الإنقاذ · 3 دروع وسلاسل مكافأة</option><option value="mission">مهمات العبارة · حل لغز من كلمتين أو أكثر</option></select></div><div class="field"><label for="hangCount">طول الجولة</label><select id="hangCount" onchange="updateHangmanAvailability()"><option value="1">كلمة واحدة</option><option value="5" selected>5 كلمات</option><option value="10">10 كلمات</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">أ، إ، آ تُحسب مثل ا. ة تختلف عن ه، وى تختلف عن ي. كل كلمة مكتملة تمنح حتى 20 نقطة؛ الخطأ −2 والتلميح −3. تقدر تستخدم لوحة المفاتيح العربية أو تخمّن الكلمة كاملة؛ التخمين الكامل الخاطئ يستهلك خطأين. في رحلة الإنقاذ: خسارة كلمة تسحب درعاً؛ كلمة بلا أخطاء أو تلميحات تعيد درعاً حتى 3، وكل سلسلة نجاح تضيف مكافأة حتى 8 نقاط. دفتر المحقق يستبعد الكلمات اعتماداً على الحروف التي جربتها فقط. مهمة العبارة تبدأ بلغز دلالي، وتحافظ على حدود الكلمات؛ مكافأتها حتى 30 نقطة. دليلان إضافيان: −2 لكل دليل؛ كشف حرف: −3.</div>`;
  if (id === 'hangman')
    body += '<p class="note" id="hangAvailable" role="status" aria-live="polite"></p>';
  if (id === 'wordguess')
    body = `<p class="muted">لديك 6 محاولات للوصول إلى كلمة عربية. الأخضر: حرف في مكانه. الأصفر: حرف موجود في مكان آخر. الرمادي: الحرف غير موجود، أو تكراره زائد.</p><div class="fields"><div class="field"><label for="wordguessLength">طول الكلمة</label><select id="wordguessLength"><option value="4">4 حروف · بداية خفيفة</option><option value="5" selected>5 حروف · التحدي الكامل</option></select></div><div class="field"><label for="wordguessMode">طريقة التخمين</label><select id="wordguessMode"><option value="classic">حر · جرّب أي كلمة</option><option value="focus">استنتاج · التزم بالحروف المكتشفة</option><option value="lab">مختبر الفرضيات · قارن خطتين توافقان الأدلة</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">تُقبل الكلمات الموجودة في القاموس المحلي. أ، إ، آ تُحسب مثل ا؛ ة وه حرفان مختلفان. في الاستنتاج حافظ على الأخضر، وانقل الأصفر إلى موضع جديد، واستبعد الرمادي والتكرارات الزائدة. التلميح يكشف الفئة ويخصم 10 نقاط. اضغط حرفاً في صف التخمين لتعدّله. دفتر الاحتمالات يرشّح الكلمات من الأدلة فقط؛ عرضها يخصم 15 نقطة مرة واحدة. في المختبر قارن فرضيتين قانونيتين: محاكاة مجموعات الألوان الممكنة من الأدلة فقط، لا قراءة للحل؛ مقارنتان بحد أقصى، −8 لكل مقارنة، دون استهلاك محاولة.</div>`;
  if (id === 'target')
    body = `<p class="muted">اضغط الهدف الملون فور ظهوره، وتجنب الخانات الفارغة. النجاح المتتابع يزيد المكافأة، والسرعة ترتفع أثناء اللعب.</p><div class="fields"><div class="field"><label for="targetLevel">المستوى</label><select id="targetLevel"><option value="easy">سهل · 9 خانات وأهداف أطول</option><option value="normal" selected>متوسط · 9 خانات</option><option value="hard">صعب · 16 خانة</option></select></div><div class="field"><label for="targetMode">التحدي</label><select id="targetMode"><option value="speed">سرعة · أهداف فقط</option><option value="precision">تركيز · هدف مع قنبلة خادعة</option><option value="sequence">مسار · الأهداف 1 ثم 2 ثم 3</option><option value="memory">ذاكرة · احفظ 3 خانات ثم استرجع المسار</option><option value="intercept">اعتراض متحرك · صوّب على هدف يرتد داخل الساحة</option></select></div><div class="field"><label for="targetDuration">وقت الجولة</label><select id="targetDuration"><option value="30">30 ثانية</option><option value="60">60 ثانية</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">الخانة الفارغة −3، والقنبلة −8 في تحدي التركيز؛ كل خطأ يقطع السلسلة. كل هدف يُحسب مرة واحدة. على لوحة المفاتيح: Tab ثم Enter، أو الأرقام 1–9 للشبكة الصغيرة، والأسهم للتنقل في كل المستويات. في المسار أصب الهدف 1 ثم 2 ثم 3؛ لا تتخطى الترتيب. في الذاكرة تظهر 3 خانات مرقمة للحفظ ثم تختفي؛ اضغط مواقعها بالترتيب. الخطأ ينهي المسار، والمسار الكامل يمنح +5 إضافية. في الاعتراض يتحرك الهدف باستمرار؛ المس لمسافة داخل دائرته يسجل إصابة. الفارغ −3؛ لوحة المفاتيح تحرك مؤشر التصويب بالأسهم، وEnter أو Space يطلق الإصابة.</div>`;
  setHTML(
    wrap(
      id,
      `<section class="panel">${body}<div class="actions"><button id="wordsStart" class="primary" onclick="startWordsGame('${id}')">ابدأ اللعبة ←</button></div></section>`,
    ),
  );
  if (id === 'trivia') updateTriviaAvailability();
  if (id === 'hangman') updateHangmanAvailability();
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
  if (coreBlocked() || screen !== 'setup' || state?.id !== id || !wordsGameIds.has(id)) return;
  const name = player();
  clearTimers();
  if (id === 'trivia') startTrivia(name);
  if (id === 'hangman') startHangman(name);
  if (id === 'wordguess') startWordguess(name);
  if (id === 'target') startTarget(name);
}
function wordsFocus(id) {
  $(id)?.focus({ preventScroll: true });
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
  const bank = $('triviaMode')?.value === 'facts' ? triviaFactsBank : triviaBank;
  return bank.filter(
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
    run: ++wordsRunSerial,
    name,
    mode: ['strategy', 'facts'].includes($('triviaMode')?.value)
      ? $('triviaMode').value
      : 'classic',
    knowledgePoints: 0,
    aidsRemaining: 2,
    questions: wordsShuffle(pool)
      .slice(0, wanted)
      .map((q) => {
        if (q.statements) {
          const statements = wordsShuffle(q.statements);
          return { ...q, statements, choices: statements.map((item) => item.text) };
        }
        return { ...q, choices: wordsShuffle(q.choices) };
      }),
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
  wordsFocus('triviaQuestion');
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
  state.confidence = 'normal';
  state.hiddenChoices = [];
  state.usedAid = false;
  state.evidenceSelected = [];
  state.endAt = state.duration ? Date.now() + state.duration * 1000 : 0;
  state.questionStarted = Date.now() - state.started;
}
function triviaConfidence(value, run, index) {
  if (
    wordsBlocked('trivia') ||
    !wordsCurrentRun(run, index) ||
    state.locked ||
    state.mode !== 'strategy' ||
    !['normal', 'confident'].includes(value)
  )
    return;
  if (state.duration && !wordsSeconds(state)) return answerTrivia(-1);
  state.confidence = value;
  renderTrivia();
}
function triviaHalfChoices(run, index) {
  if (
    wordsBlocked('trivia') ||
    !wordsCurrentRun(run, index) ||
    state.locked ||
    state.usedAid ||
    state.aidsRemaining <= 0 ||
    state.mode === 'facts'
  )
    return;
  if (state.duration && !wordsSeconds(state)) return answerTrivia(-1);
  const q = state.questions[state.index];
  state.hiddenChoices = wordsShuffle(
    q.choices.map((choice, i) => (choice === q.answer ? -1 : i)).filter((i) => i >= 0),
  ).slice(0, 2);
  state.aidsRemaining--;
  state.usedAid = true;
  renderTrivia();
}
function triviaStrategyHTML(s) {
  if (s.locked) return '';
  return `<div class="words-strategy">${s.mode === 'strategy' ? `<fieldset class="trivia-confidence"><legend>حدد ثقتك قبل الإجابة</legend><button type="button" aria-pressed="${s.confidence === 'normal'}" onclick="triviaConfidence('normal',${s.run},${s.index})">عادي · الصحيح +10</button><button type="button" aria-pressed="${s.confidence === 'confident'}" onclick="triviaConfidence('confident',${s.run},${s.index})">واثق · الصحيح +15 / الخطأ −5</button></fieldset>` : ''}<button class="trivia-aid" onclick="triviaHalfChoices(${s.run},${s.index})" ${s.usedAid || !s.aidsRemaining ? 'disabled' : ''}>💡 نصف الخيارات · ${s.aidsRemaining} مساعدات · −3</button></div>`;
}
function triviaRememberFocus() {
  const active = document.activeElement;
  if (active?.matches('.trivia-choice'))
    return `.trivia-choice:nth-child(${[...active.parentElement.children].indexOf(active) + 1})`;
  if (active?.matches('.trivia-confidence button'))
    return `.trivia-confidence button:nth-of-type(${[...active.parentElement.querySelectorAll('button')].indexOf(active) + 1})`;
  if (active?.matches('.trivia-aid')) return '.trivia-aid';
  if (active?.id === 'triviaConfirm') return '#triviaConfirm';
  if (active?.id === 'triviaNext') return '.trivia-choice';
  return null;
}
function triviaRestoreFocus(selector) {
  if (!selector) return;
  let control = state.locked ? $('triviaNext') : document.querySelector(selector);
  if (control?.disabled || control?.hidden)
    control = document.querySelector('.trivia-choice:not(:disabled):not([hidden])');
  if (control && !control.disabled && !control.hidden) control.focus({ preventScroll: true });
}
function renderTrivia() {
  if (state.mode === 'facts') return renderTriviaFacts();
  const s = state,
    focus = triviaRememberFocus(),
    q = s.questions[s.index],
    cat = triviaCategories.find((c) => c[0] === q.cat)[1];
  setHTML(
    wrap(
      'trivia',
      `<section class="panel"><div class="words-status"><span class="pill"><bdi dir="ltr">${s.index + 1} / ${s.questions.length}</bdi></span><span class="pill">${esc(cat)}</span><span class="pill">✓ ${s.correct}</span><span class="pill">🔥 ${s.streak || 0}</span>${s.mode === 'strategy' ? `<span class="pill">رصيد المعرفة: ${s.knowledgePoints}</span>` : ''}${s.duration ? `<b id="triviaClock" class="countdown">${s.locked ? 'شرح الإجابة' : wordsSeconds(s) + ' ث'}</b>` : '<span class="pill">بدون مؤقت</span>'}</div><div class="progressline"><span style="width:${(100 * (s.index + (s.locked ? 1 : 0))) / s.questions.length}%"></span></div>${s.duration ? `<div class="words-clock-track"><span id="triviaTimebar" style="width:${s.locked ? 0 : (100 * wordsSeconds(s)) / s.duration}%"></span></div>` : ''}<h3 class="trivia-question" id="triviaQuestion" tabindex="-1">${esc(q.question)}</h3><div class="trivia-choices">${q.choices.map((c, i) => `<button class="trivia-choice ${s.locked ? (c === q.answer ? 'correct' : i === s.choice ? 'incorrect' : 'faded') : ''}" onclick="answerTrivia(${i},${s.run},${s.index})" ${s.locked || s.hiddenChoices.includes(i) ? 'disabled' : ''} ${!s.locked && s.hiddenChoices.includes(i) ? 'hidden' : ''}><span class="choice-number">${i + 1}</span><span>${esc(c)}</span>${s.locked && c === q.answer ? '<b>✓</b>' : s.locked && i === s.choice ? '<b>✕</b>' : ''}</button>`).join('')}</div>${triviaStrategyHTML(s)}${s.locked ? `<div class="trivia-explanation" role="status"><b>${s.choice === -1 ? 'انتهى الوقت' : q.choices[s.choice] === q.answer ? 'إجابة صحيحة!' : 'تعلمنا معلومة جديدة'}</b><p>${esc(q.explanation)}</p><p class="note">${s.answers.at(-1)?.gain >= 0 ? '+' : ''}${s.answers.at(-1)?.gain || 0} رصيد معرفة${s.usedAid ? ' · استخدمت نصف الخيارات' : ''}${s.mode === 'strategy' ? ` · ثقتك: ${s.confidence === 'confident' ? 'واثق' : 'عادي'}` : ''}</p></div><div class="actions"><button id="triviaNext" class="primary" onclick="nextTrivia(${s.run},${s.index})">${s.index + 1 === s.questions.length ? 'اعرض النتيجة' : 'السؤال التالي'} ←</button></div>` : '<p class="note center">اختر الجواب أو اضغط رقمه على لوحة المفاتيح.</p>'}</section>`,
    ),
  );
  triviaRestoreFocus(focus);
}
function answerTrivia(choice, run, index) {
  if (state?.mode === 'facts') {
    if (choice === -1) return submitTriviaFacts(run, index, true);
    return toggleTriviaFact(choice, run, index);
  }
  if (
    wordsBlocked('trivia') ||
    !wordsCurrentRun(run, index) ||
    state.locked ||
    !Number.isInteger(choice) ||
    choice < -1 ||
    choice > 3 ||
    state.hiddenChoices?.includes(choice)
  )
    return;
  const s = state;
  if (s.duration && !wordsSeconds(s)) choice = -1;
  s.locked = true;
  s.choice = choice;
  const q = s.questions[s.index],
    correct = choice >= 0 && q.choices[choice] === q.answer;
  const gain = correct
    ? (s.mode === 'strategy' && s.confidence === 'confident' ? 15 : 10) - (s.usedAid ? 3 : 0)
    : s.mode === 'strategy' && s.confidence === 'confident'
      ? -5
      : 0;
  s.knowledgePoints += gain;
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
    confidence: s.confidence,
    aided: s.usedAid,
    gain,
    milliseconds: Math.max(0, Date.now() - s.started - s.questionStarted),
  });
  renderTrivia();
  wordsFocus('triviaNext');
}
function triviaFactChoicesHTML(q, selected, locked, handler) {
  return `<div class="trivia-choices trivia-facts">${q.statements.map((item, i) => `<button class="trivia-choice ${locked ? (item.truth ? 'correct' : selected.includes(i) ? 'incorrect' : 'faded') : selected.includes(i) ? 'fact-selected' : ''}" aria-pressed="${selected.includes(i)}" onclick="${handler(i)}" ${locked ? 'disabled' : ''}><span class="choice-number">${i + 1}</span><span>${esc(item.text)}</span><b aria-hidden="true">${locked ? (item.truth ? '✓' : '✕') : selected.includes(i) ? '✓' : '○'}</b></button>`).join('')}</div>`;
}
function triviaFactExplanationHTML(q) {
  return `<ul class="trivia-fact-reasons">${q.statements.map((item) => `<li><b>${item.truth ? '✓ حقيقة' : '✕ تصحيح'}</b><span>${esc(item.reason)}</span></li>`).join('')}</ul>`;
}
function renderTriviaFacts() {
  const s = state,
    focus = triviaRememberFocus(),
    q = s.questions[s.index];
  setHTML(
    wrap(
      'trivia',
      `<section class="panel"><div class="words-status"><span class="pill">📰 تحقق من الخبر</span><span class="pill"><bdi dir="ltr">${s.index + 1} / ${s.questions.length}</bdi></span><span class="pill">✓ ${s.correct} كاملة</span><span class="pill">رصيد ${s.knowledgePoints}</span>${s.duration ? `<b class="countdown" id="triviaClock">${s.locked ? 'شرح العبارات' : wordsSeconds(s) + ' ث'}</b>` : '<span class="pill">بدون مؤقت</span>'}</div><div class="progressline"><span style="width:${(100 * (s.index + (s.locked ? 1 : 0))) / s.questions.length}%"></span></div>${s.duration ? `<div class="words-clock-track"><span id="triviaTimebar" style="width:${s.locked ? 0 : (100 * wordsSeconds(s)) / s.duration}%"></span></div>` : ''}<h3 class="trivia-question" id="triviaQuestion" tabindex="-1">${esc(q.question)}</h3><p class="note center">اختر عبارتين صحيحتين؛ تقدر تغيّر اختياراتك قبل التأكيد. <bdi dir="ltr">${s.evidenceSelected.length} / 2</bdi> مختارة</p>${triviaFactChoicesHTML(q, s.evidenceSelected, s.locked, (i) => `toggleTriviaFact(${i},${s.run},${s.index})`)}${s.locked ? `<div class="trivia-explanation" role="status"><b>${s.choice === -1 ? 'انتهى الوقت قبل التأكيد' : s.answers.at(-1).correct ? 'الحقيقتان صحيحتان!' : 'لنراجع العبارات معاً'}</b><p>+${s.answers.at(-1).gain} رصيد معرفة.</p>${triviaFactExplanationHTML(q)}</div><div class="actions"><button id="triviaNext" class="primary" onclick="nextTrivia(${s.run},${s.index})">${s.index + 1 === s.questions.length ? 'اعرض النتيجة' : 'الخبر التالي'} ←</button></div>` : `<div class="actions"><button id="triviaConfirm" class="primary" onclick="submitTriviaFacts(${s.run},${s.index})" ${s.evidenceSelected.length === 2 ? '' : 'disabled'}>أكد الحقيقتين ↵</button></div><p class="note center">الأرقام 1–4 تغيّر الاختيار؛ Enter يؤكد بعد اختيار عبارتين.</p>`}</section>`,
    ),
  );
  triviaRestoreFocus(focus);
}
function toggleTriviaFact(choice, run, index) {
  if (
    wordsBlocked('trivia') ||
    !wordsCurrentRun(run, index) ||
    state.mode !== 'facts' ||
    state.locked ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= 4
  )
    return;
  if (state.duration && !wordsSeconds(state)) return submitTriviaFacts(run, index, true);
  const selected = state.evidenceSelected;
  if (selected.includes(choice)) selected.splice(selected.indexOf(choice), 1);
  else if (selected.length < 2) selected.push(choice);
  else return toast('اختر عبارتين فقط؛ ألغِ واحدة قبل تغييرها.');
  renderTriviaFacts();
}
function submitTriviaFacts(run, index, timeout = false) {
  if (
    wordsBlocked('trivia') ||
    !wordsCurrentRun(run, index) ||
    state.mode !== 'facts' ||
    state.locked
  )
    return;
  const s = state,
    q = s.questions[s.index];
  timeout = timeout || (s.duration && !wordsSeconds(s));
  if (!timeout && s.evidenceSelected.length !== 2) return toast('اختر عبارتين قبل التأكيد.');
  const selected = timeout ? [] : [...s.evidenceSelected],
    good = selected.filter((i) => q.statements[i].truth).length;
  s.choice = timeout ? -1 : -2;
  s.locked = true;
  s.knowledgePoints += good * 5;
  s.correct += good === 2 ? 1 : 0;
  s.streak = good === 2 ? s.streak + 1 : 0;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.answers.push({
    ...q,
    selected: timeout ? null : selected.map((i) => q.statements[i].text).join(' · '),
    selectedIndexes: selected,
    correct: good === 2,
    confidence: 'normal',
    aided: false,
    gain: good * 5,
    milliseconds: Math.max(0, Date.now() - s.started - s.questionStarted),
  });
  if (good === 2) tone();
  renderTriviaFacts();
  wordsFocus('triviaNext');
}
function nextTrivia(run, index) {
  if (wordsBlocked('trivia') || !wordsCurrentRun(run, index) || !state.locked) return;
  const s = state;
  s.index++;
  if (s.index === s.questions.length) {
    finishWords(
      s.correct === s.questions.length ? 'معرفة كاملة!' : 'انتهى اختبار المعلومات',
      `أجبت بشكل صحيح عن ${s.correct} من ${s.questions.length} سؤالاً.`,
      (100 * s.knowledgePoints) / (s.questions.length * (s.mode === 'strategy' ? 15 : 10)),
      `${s.correct} / ${s.questions.length}`,
    );
    return renderTriviaReview(s);
  }
  triviaPrepare();
  renderTrivia();
  wordsFocus('triviaQuestion');
}
function renderTriviaReview(s) {
  const missed = s.answers.filter((a) => !a.correct),
    topics = triviaCategories
      .map(([key, label]) => {
        const answers = s.answers.filter((a) => a.cat === key);
        return answers.length
          ? `<div class="trivia-mastery"><span>${esc(label)}</span><b><bdi dir="ltr">${answers.filter((a) => a.correct).length} / ${answers.length}</bdi></b><meter min="0" max="${answers.length}" value="${answers.filter((a) => a.correct).length}" aria-label="الإجابات الصحيحة في ${esc(label)}"></meter></div>`
          : '';
      })
      .join('');
  document
    .querySelector('#app .play')
    ?.insertAdjacentHTML(
      'beforeend',
      `<section class="panel trivia-review"><h3>خريطة معرفتك</h3><div class="trivia-topic-grid">${topics}</div><div class="chips"><span class="chip">أفضل سلسلة: ${s.bestStreak || 0}</span>${s.mode === 'strategy' ? `<span class="chip">إجابات الثقة: <bdi dir="ltr">${s.answers.filter((answer) => answer.confidence === 'confident' && answer.correct).length} / ${s.answers.filter((answer) => answer.confidence === 'confident').length}</bdi></span>` : ''}<span class="chip">مساعدات مستخدمة: ${2 - s.aidsRemaining}</span><span class="chip">متوسط الإجابة: ${(s.answers.reduce((sum, answer) => sum + (answer.milliseconds || 0), 0) / s.answers.length / 1000).toFixed(1)} ث</span></div>${missed.length ? `<p class="note">${missed.length} أسئلة تستحق مراجعة. الإجابة والتفسير محفوظان هنا حتى تبدأ جولة جديدة.</p><div class="actions"><button class="primary" onclick="startTriviaPractice(${state.run})">🧠 اختبر ما تعلمته</button></div><section id="triviaPractice" class="trivia-practice" hidden aria-label="مراجعة تفاعلية للأسئلة"></section><details class="history"><summary>راجع الأسئلة التي فاتتك</summary>${missed.map((a) => `<article class="trivia-review-item"><h4>${esc(a.question)}</h4><p>إجابتك: ${a.selected === null ? 'انتهى الوقت' : esc(a.selected)}</p><p class="words-positive">الصحيح: ${esc(a.answer)}</p><p class="note">${esc(a.explanation)}</p></article>`).join('')}</details>` : '<p class="note">أجبت عن كل الأسئلة. جرّب مستوى أصعب في الجولة القادمة.</p>'}</section>`,
    );
}
function triviaPracticeBlocked(run, serial, index) {
  return (
    screen !== 'trivia' ||
    state?.id !== 'trivia' ||
    !state.done ||
    !state.resultShown ||
    !wordsCurrentRun(run) ||
    (serial !== undefined && serial !== state.practice?.serial) ||
    (index !== undefined && index !== state.practice?.index) ||
    !$('modalback').hidden ||
    !!$('pausecover')
  );
}
function startTriviaPractice(run) {
  if (triviaPracticeBlocked(run)) return;
  const questions = state.answers.filter((answer) => !answer.correct);
  if (!questions.length) return;
  state.practice = {
    serial: (state.practiceSerial = (state.practiceSerial || 0) + 1),
    questions: wordsShuffle(questions).map((question) => {
      if (question.statements) {
        const statements = wordsShuffle(question.statements);
        return { ...question, statements, choices: statements.map((item) => item.text) };
      }
      return { ...question, choices: wordsShuffle(question.choices) };
    }),
    index: 0,
    correct: 0,
    choice: null,
  };
  renderTriviaPractice();
  $('triviaPracticeTitle')?.focus({ preventScroll: true });
  wordsRevealFeedback('triviaPracticeTitle');
}
function wordsSetPracticeHTML(container, html) {
  const active = document.activeElement,
    inside = container.contains(active),
    id = inside ? active.id : '',
    letter = inside ? active.dataset.wordKey : '',
    choice =
      inside && active.matches('.trivia-choice')
        ? [...container.querySelectorAll('.trivia-choice')].indexOf(active)
        : -1,
    selection = inside && active.tagName === 'INPUT' ? active.selectionStart : null;
  container.innerHTML = html;
  if (!inside) return;
  let control = id
    ? $(id)
    : letter
      ? [...container.querySelectorAll('[data-word-key]')].find(
          (key) => key.dataset.wordKey === letter && !key.disabled,
        )
      : choice >= 0
        ? container.querySelectorAll('.trivia-choice')[choice]
        : null;
  if (!control || control.disabled)
    control =
      container.querySelector('[data-practice-next]') ||
      container.querySelector('.letter-key:not(:disabled)') ||
      container.querySelector('.primary:not(:disabled)') ||
      container.querySelector('h3');
  control?.focus({ preventScroll: true });
  if (selection !== null && control?.tagName === 'INPUT')
    control.setSelectionRange(
      Math.min(selection, control.value.length),
      Math.min(selection, control.value.length),
    );
}
function renderTriviaPractice() {
  const practice = state.practice,
    container = $('triviaPractice');
  if (!container || !practice) return;
  container.hidden = false;
  if (practice.index >= practice.questions.length) {
    wordsSetPracticeHTML(
      container,
      `<h3 id="triviaPracticeTitle" tabindex="-1">✓ اكتملت المراجعة</h3><p role="status">استرجعت ${practice.correct} من ${practice.questions.length} إجابات. ${practice.correct === practice.questions.length ? 'ثبتنا المعلومات!' : 'راجع الشرح، ثم اختبر نفسك مرة ثانية.'}</p><p class="note">هذه مراجعة للتعلم؛ نتيجة الجولة المسجلة تبقى كما هي.</p><button onclick="startTriviaPractice(${state.run})">↻ راجع مرة ثانية</button>`,
    );
    return;
  }
  const q = practice.questions[practice.index],
    locked = practice.choice !== null;
  if (q.statements) {
    const selected = practice.evidenceSelected || [];
    wordsSetPracticeHTML(
      container,
      `<div class="words-status"><h3 id="triviaPracticeTitle" tabindex="-1">📰 استرجع الحقيقتين</h3><span class="pill"><bdi dir="ltr">${practice.index + 1} / ${practice.questions.length}</bdi> · مراجعة بلا نقاط</span></div><p class="trivia-question">${esc(q.question)}</p>${triviaFactChoicesHTML(q, selected, locked, (i) => `toggleTriviaPracticeFact(${i},${state.run},${practice.serial},${practice.index})`)}${locked ? `<div class="trivia-explanation" role="status"><b>${practice.factCorrect ? 'تذكرتهما! ✓' : 'هذه أسباب الإجابات الصحيحة'}</b>${triviaFactExplanationHTML(q)}</div><button data-practice-next class="primary" onclick="nextTriviaPractice(${state.run},${practice.serial},${practice.index})">التالي ←</button>` : `<p class="note"><bdi dir="ltr">${selected.length} / 2</bdi> مختارة · الأرقام 1–4 للاختيار، وEnter للتأكيد.</p><button class="primary" onclick="submitTriviaPracticeFacts(${state.run},${practice.serial},${practice.index})" ${selected.length === 2 ? '' : 'disabled'}>أكد الاختيار</button>`}`,
    );
    return;
  }
  wordsSetPracticeHTML(
    container,
    `<div class="words-status"><h3 id="triviaPracticeTitle" tabindex="-1">🧠 اختبر ما تعلمته</h3><span class="pill"><bdi dir="ltr">${practice.index + 1} / ${practice.questions.length}</bdi></span><span class="pill">مراجعة بدون نقاط أو مؤقت</span></div><p class="trivia-question">${esc(q.question)}</p><div class="trivia-choices">${q.choices.map((choice, i) => `<button class="trivia-choice ${locked ? (choice === q.answer ? 'correct' : i === practice.choice ? 'incorrect' : 'faded') : ''}" onclick="answerTriviaPractice(${i},${state.run},${practice.serial},${practice.index})" ${locked ? 'disabled' : ''}><span class="choice-number">${i + 1}</span><span>${esc(choice)}</span></button>`).join('')}</div>${locked ? `<div class="trivia-explanation" role="status"><b>${q.choices[practice.choice] === q.answer ? 'تذكرتها! ✓' : 'الصحيح: ' + esc(q.answer)}</b><p>${esc(q.explanation)}</p></div><div class="actions"><button data-practice-next class="primary" onclick="nextTriviaPractice(${state.run},${practice.serial},${practice.index})">${practice.index + 1 === practice.questions.length ? 'أنهِ المراجعة' : 'التالي'} ←</button></div>` : '<p class="note center">الأرقام 1–4 للاختيار وEnter للمتابعة. حاول تتذكر الإجابة قبل الرجوع إلى الشرح.</p>'}`,
  );
}
function toggleTriviaPracticeFact(choice, run, serial, index) {
  if (triviaPracticeBlocked(run, serial, index)) return;
  const p = state.practice;
  if (
    !p ||
    p.choice !== null ||
    !p.questions[p.index]?.statements ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= 4
  )
    return;
  p.evidenceSelected ||= [];
  if (p.evidenceSelected.includes(choice))
    p.evidenceSelected.splice(p.evidenceSelected.indexOf(choice), 1);
  else if (p.evidenceSelected.length < 2) p.evidenceSelected.push(choice);
  renderTriviaPractice();
}
function submitTriviaPracticeFacts(run, serial, index) {
  if (triviaPracticeBlocked(run, serial, index)) return;
  const p = state.practice;
  if (
    !p ||
    p.choice !== null ||
    p.evidenceSelected?.length !== 2 ||
    !p.questions[p.index]?.statements
  )
    return;
  p.choice = -2;
  p.factCorrect = p.evidenceSelected.every((i) => p.questions[p.index].statements[i].truth);
  if (p.factCorrect) p.correct++;
  renderTriviaPractice();
}
function answerTriviaPractice(choice, run, serial, index) {
  if (triviaPracticeBlocked(run, serial, index) || !state.practice || !Number.isInteger(choice))
    return;
  const practice = state.practice,
    q = practice.questions[practice.index];
  if (!q || practice.choice !== null || choice < 0 || choice >= q.choices.length) return;
  practice.choice = choice;
  if (q.choices[choice] === q.answer) practice.correct++;
  renderTriviaPractice();
}
function nextTriviaPractice(run, serial, index) {
  if (
    triviaPracticeBlocked(run, serial, index) ||
    !state.practice ||
    state.practice.choice === null
  )
    return;
  state.practice.index++;
  state.practice.choice = null;
  state.practice.evidenceSelected = [];
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
  const phase =
    handler === 'guessHangman'
      ? `,${state.index}`
      : handler === 'typeWordguess'
        ? `,${state.attempts.length}`
        : '';
  return `<div class="arabic-keyboard" aria-label="لوحة الحروف العربية">${arabicKeyboard.map((letter) => `<button class="letter-key ${statuses?.[letter] || ''}" data-word-key="${letter}" onclick="${handler}('${letter}',${state.run}${phase})" ${disabled.includes(letter) ? 'disabled' : ''} aria-label="الحرف ${letter}${statuses?.[letter] ? ': ' + { correct: 'في مكانه الصحيح', present: 'موجود في مكان آخر', absent: 'غير موجود أو تكراره زائد' }[statuses[letter]] : ''}">${letter}</button>`).join('')}</div>`;
}
function wordsRememberLetterFocus() {
  return document.activeElement?.matches('.arabic-keyboard .letter-key')
    ? document.activeElement.dataset.wordKey
    : null;
}
function wordsRestoreLetterFocus(letter) {
  if (!letter) return;
  const keys = [...document.querySelectorAll('.arabic-keyboard [data-word-key]')],
    index = keys.findIndex((key) => key.dataset.wordKey === letter),
    next =
      keys.slice(Math.max(0, index)).find((key) => !key.disabled) ||
      keys.find((key) => !key.disabled);
  if (next) next.focus({ preventScroll: true });
  else
    document
      .querySelector('.hangman-panel .actions .primary, .wordguess-panel .actions .primary')
      ?.focus({ preventScroll: true });
}
function hangmanSetupOptions() {
  const cat = $('hangCategory')?.value || 'all',
    mode = ['rescue', 'mission'].includes($('hangMode')?.value) ? $('hangMode').value : 'classic',
    count = wordsReadOption('hangCount', [1, 5, 10], 5),
    level = ['easy', 'normal', 'hard'].includes($('hangLevel')?.value)
      ? $('hangLevel').value
      : 'normal',
    matching = (mode === 'mission' ? hangmanMissionBank : wordsLexicon).filter(
      (w) => cat === 'all' || w.cat === cat,
    ),
    pool = matching.filter((w) =>
      level === 'easy'
        ? w.key.length <= (mode === 'mission' ? 14 : 5)
        : level === 'hard'
          ? w.key.length >= (mode === 'mission' ? 12 : 5)
          : true,
    );
  return { cat, mode, count, level, pool };
}
function updateHangmanAvailability() {
  if (screen !== 'setup' || state?.id !== 'hangman') return;
  const { mode, count, pool } = hangmanSetupOptions(),
    actual = Math.min(count, pool.length),
    label = mode === 'mission' ? 'مهمات' : 'كلمات';
  if ($('hangAvailable'))
    $('hangAvailable').textContent = pool.length
      ? `${pool.length} ${label} متاحة. جولتك: ${actual} من ${count} مطلوبة، دون تكرار. ${mode === 'mission' ? 'كل مهمة حتى 30 نقطة.' : mode === 'rescue' ? 'كل كلمة حتى 20 نقطة، ومكافأة سلسلة حتى 8؛ تنتهي الرحلة عند نفاد الدروع.' : 'كل كلمة حتى 20 نقطة.'}`
      : 'لا توجد كلمات توافق الفئة والمستوى وطريقة اللعب. غيّر أحد الخيارات لبدء الجولة.';
  if ($('wordsStart')) $('wordsStart').disabled = !pool.length;
}
function startHangman(name) {
  const { mode, count, level, pool } = hangmanSetupOptions();
  if (!pool.length) return toast('لا توجد كلمات في هذه الفئة. اختر فئة أخرى.');
  state = {
    id: 'hangman',
    run: ++wordsRunSerial,
    name,
    mode,
    shields: 3,
    rescueStreak: 0,
    bestRescueStreak: 0,
    notesOpen: false,
    level,
    maxMisses: { easy: 8, normal: 6, hard: 5 }[level],
    maxHints: { easy: 3, normal: 2, hard: 1 }[level],
    queue: wordsShuffle(pool).slice(0, count),
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
  wordsFocus('hangmanClue');
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
    missionCueCount: 0,
    missionCueCost: 0,
  });
}
function hangmanSolved(s) {
  return Array.from(s.item.key).every((letter) => s.guessed.includes(letter));
}
function hangmanCandidates(s) {
  const mask = Array.from(s.item.key).map((letter) => (s.guessed.includes(letter) ? letter : '')),
    shape = (item) =>
      (item.display || item.word)
        .trim()
        .split(/\s+/)
        .map((word) => wordsNormalizeKey(word).length)
        .join(',');
  return (s.mode === 'mission' ? hangmanMissionBank : wordsLexicon).filter(
    (item) =>
      item.cat === s.item.cat &&
      item.key.length === mask.length &&
      (s.mode !== 'mission' || shape(item) === shape(s.item)) &&
      !s.wordGuesses.includes(item.key) &&
      Array.from(item.key).every((letter, i) =>
        mask[i] ? mask[i] === letter : !s.guessed.includes(letter),
      ),
  );
}
function hangmanWordHTML(s) {
  const groups = (s.item.display || s.item.key).split(' '),
    cell = (letter) =>
      `<span class="hangman-cell ${s.guessed.includes(wordsNormalizeKey(letter)) ? 'revealed' : s.over ? 'lost' : ''}">${s.guessed.includes(wordsNormalizeKey(letter)) || s.over ? esc(letter) : '<span aria-hidden="true">ـ</span><span class="sr">حرف مخفي</span>'}</span>`;
  return `<div class="hangman-word ${s.mode === 'mission' ? 'hangman-phrase' : ''}" aria-label="${groups.length} كلمات، حروف العبارة من اليمين">${groups.map((group) => (s.mode === 'mission' ? `<div class="hangman-phrase-word" aria-label="كلمة من ${Array.from(group).length} حروف">${Array.from(group).map(cell).join('')}</div>` : Array.from(group).map(cell).join(''))).join('')}</div>`;
}
function hangmanMissionCluesHTML(s) {
  if (s.mode !== 'mission' || s.over) return '';
  return `<section class="hangman-mission-clues"><div class="words-status"><b>🧭 مهمة من ${s.item.word.split(' ').length} كلمات</b><span class="pill">مكافأة حتى 30 نقطة</span></div><p class="note">اللغز دليلك الأول؛ كل حرف صحيح يظهر في جميع الكلمات. أدلة إضافية: <bdi dir="ltr">${s.missionCueCount} / ${s.item.cues.length}</bdi></p>${s.item.cues
    .slice(0, s.missionCueCount)
    .map((clue, i) => `<p class="hangman-semantic-clue">${i + 1}. ${esc(clue)}</p>`)
    .join(
      '',
    )}<button onclick="revealHangmanMissionClue(${s.run},${s.index})" ${s.missionCueCount >= s.item.cues.length ? 'disabled' : ''}>🧭 دليل دلالي آخر · −2</button></section>`;
}
function revealHangmanMissionClue(run, index) {
  if (
    wordsBlocked('hangman') ||
    !wordsCurrentRun(run, index) ||
    state.over ||
    state.mode !== 'mission' ||
    state.missionCueCount >= state.item.cues.length
  )
    return;
  state.missionCueCount++;
  state.missionCueCost += 2;
  state.feedback = 'فتحنا دليلاً دلالياً؛ بقيت الحروف والمحاولات كما هي.';
  renderHangman();
  wordsRevealFeedback('hangmanFeedback');
}
function hangmanNotebook(s) {
  if (s.over || !s.guessed.length) return '';
  const absent = s.guessed.filter((letter) => !s.item.key.includes(letter)),
    present = s.guessed.filter((letter) => s.item.key.includes(letter));
  return `<details class="hangman-notebook" ${s.notesOpen ? 'open' : ''} ontoggle="rememberHangmanNotebook(this,${s.run},${s.index})"><summary>🕵 دفتر المحقق · ${hangmanCandidates(s).length} احتمالاً في قاموس الفئة</summary><p class="note">${s.mode === 'mission' ? 'الاحتمالات تراعي الفئة وحدود الكلمات الظاهرة وعدد حروف كل كلمة، مع الحروف المكشوفة والمستبعدة.' : 'الاحتمالات مبنية على الفئة وطول الكلمة والحروف المكشوفة والمستبعدة فقط.'}</p>${present.length ? `<div class="chips">${present.map((letter) => `<span class="chip">${esc(letter)}: ${Array.from(s.item.key).filter((value) => value === letter).length} ${Array.from(s.item.key).filter((value) => value === letter).length === 1 ? 'مرة' : 'مرات'}</span>`).join('')}</div>` : ''}${absent.length ? `<p class="note">استبعد: ${absent.map(esc).join('، ')}</p>` : ''}${s.wordGuesses.length ? `<p class="note">كلمات جربتها: ${s.wordGuesses.map(esc).join('، ')}</p>` : ''}</details>`;
}
function rememberHangmanNotebook(element, run, index) {
  if (
    !wordsBlocked('hangman') &&
    wordsCurrentRun(run, index) &&
    element.isConnected &&
    element === document.querySelector('.hangman-notebook')
  )
    state.notesOpen = element.open;
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
    focusedLetter = wordsRememberLetterFocus(),
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
      `<section class="panel hangman-panel"><div class="words-status"><span class="pill">${s.mode === 'mission' ? 'المهمة' : 'الكلمة'} <bdi dir="ltr">${s.index + 1} / ${s.queue.length}</bdi></span><span class="pill">${esc(category)}</span><span class="pill">✓ ${s.wins} كلمات</span><span class="pill">💎 ${s.total} نقطة</span>${s.mode === 'rescue' ? `<span class="pill">🛡 <bdi dir="ltr">${s.shields} / 3</bdi> دروع</span><span class="pill">سلسلة الإنقاذ: ${s.rescueStreak}</span>` : ''}<b class="${maxMisses - s.misses <= 2 ? 'danger-text' : ''}">${maxMisses - s.misses} أخطاء متبقية</b><span class="pill"><bdi dir="ltr">${Array.from(item.key).filter((l) => s.guessed.includes(l)).length} / ${item.key.length}</bdi> حروف مكشوفة</span></div><div class="hangman-layout">${hangmanDrawing(s.misses, maxMisses)}<div><p class="hangman-clue" id="hangmanClue" tabindex="-1">${s.mode !== 'mission' && s.level === 'hard' && !s.over ? `تحدي خبير · ${item.key.length} حروف، والفئة دليلك` : esc(item.hint)}</p>${hangmanWordHTML(s)}${s.over ? `<div class="trivia-explanation" id="hangmanOutcome" role="status"><b>${s.won ? 'أحسنت! الكلمة: ' + esc(item.word) : 'الكلمة هي: ' + esc(item.word)}</b><p>${s.won ? `+${s.wordPoints} نقطة · ${s.misses} أخطاء و${s.hints} تلميحات${s.missionCueCost ? ` · أدلة دلالية −${s.missionCueCost}` : ''}${s.rescueBonus ? ` · مكافأة السلسلة +${s.rescueBonus}` : ''}` : 'الكلمة التالية فرصة جديدة.'}</p>${s.level === 'hard' ? `<p>${esc(item.hint)}</p>` : ''}</div>` : `<p class="note">الحروف المجربة: ${s.guessed.length ? s.guessed.map(esc).join('، ') : 'لم تجرب أي حرف بعد'}</p><p class="hangman-feedback" id="hangmanFeedback" role="status" tabindex="-1">${esc(s.feedback || '')}</p>`}</div></div>${hangmanMissionCluesHTML(s)}${!s.over ? `<form class="words-native hangman-native" onsubmit="event.preventDefault();submitHangmanWord(${s.run},${s.index})"><label for="hangmanInput">عرفت الكلمة؟ اكتبها كاملة</label><div><input id="hangmanInput" maxlength="${s.mode === 'mission' ? 64 : 32}" value="${esc(s.wordDraft || '')}" placeholder="${s.mode === 'mission' ? 'اكتب العبارة مع المسافات أو بدونها' : item.key.length + ' حروف…'}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="hangmanFeedback" onfocus="this.closest('.hangman-panel').classList.add('hangman-typing')" onblur="this.closest('.hangman-panel').classList.remove('hangman-typing')" oninput="if(!event.isComposing)readHangmanDraft(this.value,${s.run},${s.index})" oncompositionend="readHangmanDraft(this.value,${s.run},${s.index})"><button class="primary" type="submit" onpointerdown="if(event.isPrimary&&event.button===0)event.preventDefault()">خمن الكلمة ↵</button></div><small class="note">اختياري · التخمين الخاطئ يستهلك خطأين</small></form>${wordsKeyboard('guessHangman', s.guessed, statuses)}${hangmanNotebook(s)}` : ''}<div class="actions">${s.over ? `<button id="hangmanNext" class="primary" onclick="nextHangman(${s.run},${s.index})">${s.index + 1 === s.queue.length ? 'اعرض النتيجة' : 'الكلمة التالية'} ←</button>` : `<button onclick="hintHangman(${s.run},${s.index})" ${s.hints >= maxHints ? 'disabled' : ''}>💡 اكشف حرفاً (${maxHints - s.hints} متبقي) · −3</button>`}</div></section>`,
    ),
  );
  if (s.over) wordsFocus('hangmanNext');
  else wordsRestoreLetterFocus(focusedLetter);
}
function finishHangmanWord() {
  const s = state;
  if (s.over) return;
  s.won = hangmanSolved(s);
  if (s.won || s.misses >= (s.maxMisses || 6)) {
    s.over = true;
    const rescue = s.mode === 'rescue';
    if (rescue) {
      s.rescueStreak = s.won ? s.rescueStreak + 1 : 0;
      s.bestRescueStreak = Math.max(s.bestRescueStreak, s.rescueStreak);
      s.shields = Math.max(
        0,
        Math.min(3, s.shields + (s.won && !s.misses && !s.hints ? 1 : s.won ? 0 : -1)),
      );
    }
    s.rescueBonus = rescue && s.won ? Math.min(8, Math.max(0, (s.rescueStreak - 1) * 2)) : 0;
    s.wordPoints = s.won
      ? Math.max(
          2,
          (s.mode === 'mission' ? 30 : 20) - s.misses * 2 - s.hints * 3 - (s.missionCueCost || 0),
        ) + s.rescueBonus
      : 0;
    s.wordResults?.push({
      word: s.item.word,
      won: s.won,
      misses: s.misses,
      hints: s.hints,
      points: s.wordPoints,
      hint: s.item.hint,
      key: s.item.key,
      cat: s.item.cat,
      bonus: s.rescueBonus,
      clueCost: s.missionCueCost || 0,
      display: s.item.display,
    });
    if (s.won) {
      s.wins++;
      s.total += s.wordPoints;
      tone(true);
    }
  }
}
function readHangmanDraft(raw, run, index) {
  if (wordsBlocked('hangman') || !wordsCurrentRun(run, index) || state.over) return;
  const input =
    state.mode === 'mission'
      ? String(raw)
          .normalize('NFC')
          .replace(/[\u064B-\u065F\u0670ـ]/g, '')
          .replace(/[أإآٱ]/g, 'ا')
          .replace(/\s/g, ' ')
      : wordsNormalizeKey(raw);
  state.wordDraft = Array.from(input)
    .filter(
      (letter) => arabicKeyboard.includes(letter) || (state.mode === 'mission' && letter === ' '),
    )
    .slice(0, state.mode === 'mission' ? 64 : 32)
    .join('');
  if ($('hangmanInput')) $('hangmanInput').value = state.wordDraft;
}
function submitHangmanWord(run, index) {
  if (wordsBlocked('hangman') || !wordsCurrentRun(run, index) || state.over) return;
  const s = state,
    guess = wordsNormalizeKey(s.wordDraft);
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
  if (!s.over) wordsFocus('hangmanFeedback');
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
function guessHangman(raw, run, index) {
  // Keep the public helper usable as Array.forEach(guessHangman).
  if (Array.isArray(index)) run = index = undefined;
  if (wordsBlocked('hangman') || !wordsCurrentRun(run, index) || state.over) return;
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
function hintHangman(run, index) {
  if (
    wordsBlocked('hangman') ||
    !wordsCurrentRun(run, index) ||
    state.over ||
    state.hints >= (state.maxHints || 2)
  )
    return;
  const missing = [...new Set(Array.from(state.item.key))].filter(
    (l) => !state.guessed.includes(l),
  );
  if (!missing.length) return;
  state.hints++;
  const letter = missing[wordsRandom(missing.length)];
  state.guessed.push(letter);
  state.feedback = `كشفنا الحرف ${letter}. التلميح يخصم 3 نقاط من مكافأة الكلمة.`;
  finishHangmanWord();
  renderHangman();
}
function nextHangman(run, index) {
  if (wordsBlocked('hangman') || !wordsCurrentRun(run, index) || !state.over) return;
  const s = state;
  s.index++;
  if (s.index === s.queue.length || (s.mode === 'rescue' && !s.shields)) {
    finishWords(
      s.wins === s.queue.length ? 'خبير الحروف!' : 'انتهت جولة الكلمات',
      `اكتشفت ${s.wins} من ${s.wordResults.length} كلمات لعبتها. ${s.mode === 'rescue' ? `دروع متبقية: ${s.shields}؛ أفضل سلسلة ${s.bestRescueStreak}.` : s.mode === 'mission' ? 'حللت مهمات العبارة؛ الأدلة الدلالية والأحرف المساعدة محسوبة في المكافأة.' : 'التلميحات والأخطاء تخصم من مكافأة الكلمة (20 نقطة كحد أقصى).'}`,
      s.total,
      `${s.wins} / ${s.queue.length}`,
    );
    document
      .querySelector('#app .play')
      ?.insertAdjacentHTML(
        'beforeend',
        `<section class="panel words-round-review"><h3>حصيلة الكلمات</h3>${(s.wordResults || []).map((item) => `<div><b>${item.won ? '✓' : '↷'} ${esc(item.word)}</b><span>${item.misses} أخطاء · ${item.hints} تلميحات${item.clueCost ? ` · أدلة دلالية −${item.clueCost}` : ''}${item.bonus ? ` · مكافأة السلسلة +${item.bonus}` : ''}</span><strong>+${item.points}</strong>${item.hint ? `<small class="words-review-clue">${esc(item.hint)}</small>` : ''}</div>`).join('')}${s.wordResults.some((item) => !item.won) ? `<p class="note">أعد اكتشاف الكلمات التي فاتتك في تدريب بلا نقاط.</p><button class="primary" onclick="startHangmanPractice(${s.run})">🕵 تدريب كلمات الجولة</button><section id="hangmanPractice" hidden></section>` : ''}</section>`,
      );
    return;
  }
  prepareHangman();
  renderHangman();
  wordsFocus('hangmanClue');
}
function hangmanPracticeBlocked(run, serial, index) {
  return (
    screen !== 'hangman' ||
    state?.id !== 'hangman' ||
    !state.done ||
    !state.resultShown ||
    !wordsCurrentRun(run) ||
    (serial !== undefined && serial !== state.hangPractice?.serial) ||
    (index !== undefined && index !== state.hangPractice?.index) ||
    !$('modalback').hidden ||
    !!$('pausecover')
  );
}
function startHangmanPractice(run) {
  if (hangmanPracticeBlocked(run)) return;
  const items = state.wordResults.filter((item) => !item.won);
  if (!items.length) return;
  state.hangPractice = {
    items,
    index: 0,
    serial: (state.hangPracticeSerial = (state.hangPracticeSerial || 0) + 1),
    guessed: [],
    solved: false,
    feedback: '',
    draft: '',
  };
  renderHangmanPractice();
  $('hangmanPracticeTitle')?.focus({ preventScroll: true });
  wordsRevealFeedback('hangmanPracticeTitle');
}
function renderHangmanPractice() {
  const s = state,
    p = s.hangPractice,
    container = $('hangmanPractice');
  if (!p || !container) return;
  container.hidden = false;
  if (p.index === p.items.length) {
    wordsSetPracticeHTML(
      container,
      `<h3 id="hangmanPracticeTitle" tabindex="-1">✓ استرجعت كلمات الجولة</h3><p role="status">اكتشفت ${p.items.length} كلمات. نتيجة الجولة المسجلة بقيت كما هي.</p><button onclick="startHangmanPractice(${s.run})">↻ تمرن مرة أخرى</button>`,
    );
    return;
  }
  const item = p.items[p.index];
  wordsSetPracticeHTML(
    container,
    `<div class="words-status"><h3 id="hangmanPracticeTitle" tabindex="-1">🕵 تدريب <bdi dir="ltr">${p.index + 1} / ${p.items.length}</bdi></h3><span class="pill">بلا نقاط أو حد للأخطاء</span></div><p class="hangman-clue">${esc(item.hint)}</p>${hangmanWordHTML({ item, mode: item.display ? 'mission' : 'classic', guessed: p.guessed, over: p.solved })}<p role="status" class="hangman-feedback">${esc(p.feedback || 'استرجع الحروف بلوحة المفاتيح أو الأزرار، أو اكتب الكلمة كاملة. Enter يتابع بعد الحل.')}</p>${p.solved ? `<button data-practice-next class="primary" onclick="nextHangmanPractice(${s.run},${p.index},${p.serial})">${p.index + 1 === p.items.length ? 'أنهِ التدريب' : 'الكلمة التالية'} ←</button>` : `<form class="words-native" onsubmit="event.preventDefault();answerHangmanPracticeWord(document.getElementById('hangmanPracticeInput').value,${s.run},${p.index},${p.serial})"><label for="hangmanPracticeInput">الكلمة كاملة</label><div><input id="hangmanPracticeInput" maxlength="64" autocomplete="off" value="${esc(p.draft || '')}" oninput="if(!hangmanPracticeBlocked(${s.run},${p.serial},${p.index}))state.hangPractice.draft=this.value"><button class="primary">تحقق ↵</button></div></form><div class="arabic-keyboard">${arabicKeyboard.map((letter) => `<button data-word-key="${letter}" class="letter-key ${p.guessed.includes(letter) ? (item.key.includes(letter) ? 'correct' : 'absent') : ''}" onclick="guessHangmanPractice('${letter}',${s.run},${p.index},${p.serial})" ${p.guessed.includes(letter) ? 'disabled' : ''}>${letter}</button>`).join('')}</div>`}`,
  );
}
function guessHangmanPractice(raw, run, index, serial) {
  if (hangmanPracticeBlocked(run, serial, index)) return;
  const p = state.hangPractice,
    letter = wordsNormalizeKey(raw);
  if (
    !p ||
    p.index !== index ||
    p.solved ||
    !arabicKeyboard.includes(letter) ||
    p.guessed.includes(letter)
  )
    return;
  const item = p.items[p.index];
  p.guessed.push(letter);
  p.solved = Array.from(item.key).every((value) => p.guessed.includes(value));
  p.feedback = p.solved
    ? `✓ تذكرتها: ${item.word}`
    : item.key.includes(letter)
      ? `الحرف ${letter} موجود.`
      : `الحرف ${letter} غير موجود؛ جرّب غيره.`;
  renderHangmanPractice();
}
function answerHangmanPracticeWord(raw, run, index, serial) {
  if (hangmanPracticeBlocked(run, serial, index)) return;
  const p = state.hangPractice;
  if (!p || p.index !== index || p.solved) return;
  const item = p.items[p.index];
  p.solved = wordsNormalizeKey(raw) === item.key;
  if (p.solved) p.guessed = [...new Set(Array.from(item.key))];
  p.feedback = p.solved
    ? `✓ تذكرتها: ${item.word}`
    : 'الكلمة مختلفة؛ ركّز على الوصف والحروف المكشوفة.';
  renderHangmanPractice();
}
function nextHangmanPractice(run, index, serial) {
  if (hangmanPracticeBlocked(run, serial, index)) return;
  const p = state.hangPractice;
  if (!p || p.index !== index || !p.solved) return;
  Object.assign(p, { index: p.index + 1, guessed: [], solved: false, feedback: '', draft: '' });
  renderHangmanPractice();
  $('hangmanPracticeTitle')?.focus({ preventScroll: true });
}

function startWordguess(name) {
  const size = wordsReadOption('wordguessLength', [4, 5], 5),
    pool = wordsLexicon.filter((w) => Array.from(w.key).length === size);
  if (!pool.length) return toast('اختر طول كلمة متاحاً.');
  state = {
    id: 'wordguess',
    run: ++wordsRunSerial,
    name,
    candidatesShown: false,
    candidateQuery: '',
    candidatePage: 0,
    helperPenalty: 0,
    entryCursor: null,
    size,
    mode: ['focus', 'lab'].includes($('wordguessMode')?.value)
      ? $('wordguessMode').value
      : 'classic',
    hypothesisDrafts: ['', ''],
    labUses: 0,
    labSerial: 0,
    labAnalysis: null,
    labComparisonKeys: [],
    item: pool[wordsRandom(pool.length)],
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
  wordsFocus('wordguessMessage');
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
function wordguessHypothesisError(word, s) {
  if (Array.from(word).length !== s.size) return `كل فرضية تحتاج ${s.size} حروف.`;
  if (!wordguessDictionary.has(word)) return 'الفرضيات تحتاج كلمات موجودة في القاموس المحلي.';
  const violation = wordguessConstraintViolation(word, s.attempts);
  if (violation) return violation;
  if (!wordguessCandidates(s).includes(word))
    return 'هذه الفرضية لا توافق جميع الأدلة أو الفئة المكشوفة.';
  return '';
}
function wordguessHypothesisReport(word, s) {
  const candidates = wordguessCandidates(s),
    groups = new Map();
  for (const candidate of candidates) {
    const pattern = wordguessFeedback(word, candidate).join('/');
    groups.set(pattern, (groups.get(pattern) || 0) + 1);
  }
  const sizes = [...groups.values()];
  return {
    word,
    candidates: candidates.length,
    patterns: groups.size,
    worst: sizes.length ? Math.max(...sizes) : 0,
    expected: candidates.length
      ? sizes.reduce((sum, count) => sum + count * count, 0) / candidates.length
      : 0,
  };
}
function readWordguessHypothesis(slot, raw, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    state.mode !== 'lab' ||
    state.over ||
    turn !== state.attempts.length ||
    ![0, 1].includes(slot)
  )
    return;
  state.hypothesisDrafts[slot] = Array.from(wordsNormalizeKey(raw))
    .filter((letter) => arabicKeyboard.includes(letter))
    .slice(0, 32)
    .join('');
  const input = $(`wordguessHypothesis${slot}`);
  if (input) input.value = state.hypothesisDrafts[slot];
}
function compareWordguessHypotheses(run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    state.mode !== 'lab' ||
    state.over ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.labUses >= 2
  )
    return;
  const [first, second] = state.hypothesisDrafts;
  for (const word of [first, second]) {
    const error = wordguessHypothesisError(word, state);
    if (error) return wordguessMessage(error);
  }
  if (first === second) return wordguessMessage('اختر فرضيتين مختلفتين حتى تكون المقارنة مفيدة.');
  const key = [first, second].sort().join('|') + '#' + state.attempts.length;
  if (state.labComparisonKeys.includes(key))
    return wordguessMessage('قارنت هاتين الفرضيتين بهذه الأدلة بالفعل؛ لم نخصم نقاطاً إضافية.');
  state.labComparisonKeys.push(key);
  state.labUses++;
  state.helperPenalty += 8;
  state.labAnalysis = {
    serial: ++state.labSerial,
    turn: state.attempts.length,
    reports: [wordguessHypothesisReport(first, state), wordguessHypothesisReport(second, state)],
  };
  state.feedback =
    'قارن حجم أكبر مجموعة؛ الأصغر يقلل الاحتمالات أكثر في أسوأ نتيجة ممكنة. المحاكاة لا تكشف ألوان الحل الحقيقي.';
  renderWordguess();
  wordsRevealFeedback('wordguessMessage');
}
function chooseWordguessHypothesis(slot, run, turn, serial) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    state.over ||
    state.mode !== 'lab' ||
    turn !== state.attempts.length ||
    !state.labAnalysis ||
    state.labAnalysis.serial !== serial ||
    state.labAnalysis.turn !== turn ||
    ![0, 1].includes(slot)
  )
    return;
  const word = state.labAnalysis.reports[slot].word;
  if (wordguessHypothesisError(word, state)) return;
  state.entry = word;
  state.entryCursor = null;
  state.feedback = 'اخترت فرضية للمحاولة؛ تأكيد التخمين هو الذي يكشف الألوان الحقيقية.';
  renderWordguess();
  $('wordguessInput')?.focus({ preventScroll: true });
  wordsRevealFeedback('wordguessMessage');
}
function wordguessLabHTML(s) {
  if (s.mode !== 'lab' || s.over) return '';
  const analysis = s.labAnalysis;
  return `<section class="wordguess-lab"><div class="words-status"><h3>🔬 مختبر الفرضيات</h3><span class="pill">${2 - s.labUses} مقارنات متبقية</span></div><p class="note">اختبر كلمتين توافقان الأدلة. نحاكي الألوان الممكنة ضد جميع الاحتمالات المتوافقة، ونقارن مقدار المعلومات؛ لا نقرأ الكلمة السرية.</p><form onsubmit="event.preventDefault();compareWordguessHypotheses(${s.run},${s.attempts.length})"><div class="wordguess-hypothesis-fields">${[0, 1].map((slot) => `<label for="wordguessHypothesis${slot}">الفرضية ${slot === 0 ? 'أ' : 'ب'}<input id="wordguessHypothesis${slot}" value="${esc(s.hypothesisDrafts[slot])}" maxlength="32" autocomplete="off" spellcheck="false" oninput="if(!event.isComposing)readWordguessHypothesis(${slot},this.value,${s.run},${s.attempts.length})" oncompositionend="readWordguessHypothesis(${slot},this.value,${s.run},${s.attempts.length})" placeholder="كلمة من ${s.size} حروف"></label>`).join('')}</div><button id="wordguessCompare" class="primary" ${s.labUses >= 2 ? 'disabled' : ''}>قارن الفرضيتين · −8 · دون محاولة</button></form>${analysis ? `<div class="wordguess-hypothesis-results" role="status"><p class="note">تحليل قبل المحاولة ${analysis.turn + 1} · ${analysis.reports[0].candidates} احتمالاً. ${analysis.turn !== s.attempts.length ? 'هذه قراءة للأدلة السابقة؛ أعد المقارنة بعد أدلتك الجديدة.' : 'يمكنك اختيار فرضية ثم تأكيدها في صف التخمين.'}</p><div>${analysis.reports.map((report, slot) => `<article><b>${esc(report.word)}</b><dl><div><dt>نتائج ألوان ممكنة</dt><dd>${report.patterns}</dd></div><div><dt>أكبر مجموعة متبقية</dt><dd>${report.worst}</dd></div><div><dt>متوسط الاحتمالات بعد المحاولة</dt><dd>${report.expected.toFixed(1)}</dd></div></dl><button id="wordguessHypothesisChoice${slot}" data-hypothesis-choice onclick="chooseWordguessHypothesis(${slot},${s.run},${analysis.turn},${analysis.serial})" ${analysis.turn !== s.attempts.length ? 'disabled' : ''}>ضعها في صف التخمين</button></article>`).join('')}</div></div>` : ''}</section>`;
}
function wordguessNotebook(s) {
  if (!s.attempts.length) return '';
  const evidence = wordguessEvidence(s.attempts, s.size),
    discovered = Object.entries(evidence.minimum),
    eliminated = Object.entries(evidence.maximum)
      .filter(([, count]) => count === 0)
      .map(([letter]) => letter);
  const candidates = s.candidatesShown ? wordguessCandidates(s) : [],
    filtered = candidates.filter((word) => word.includes(s.candidateQuery || '')),
    pages = Math.max(1, Math.ceil(filtered.length / 24)),
    page = Math.min(pages - 1, s.candidatePage || 0);
  return `<details class="wordguess-notebook" ${s.notesOpen ? 'open' : ''} ontoggle="rememberWordguessNotebook(this)"><summary>🧩 دفتر الأدلة · ${discovered.length} حروف مكتشفة</summary><p class="note">المواضع من اليمين؛ استنتجنا هذه الأدلة من محاولاتك فقط.</p><div class="wordguess-known" aria-label="المواضع المؤكدة من اليمين">${evidence.positions.map((letter, i) => `<span aria-label="الخانة ${i + 1}: ${letter || 'لم تُعرف بعد'}"><small>${i + 1}</small><b>${esc(letter || '؟')}</b></span>`).join('')}</div><div class="chips">${discovered.map(([letter, count]) => `<span class="chip">${letter}: ${evidence.maximum[letter] === count ? `${count} بالضبط` : `${count} على الأقل`}</span>`).join('')}</div>${eliminated.length ? `<p class="note">الحروف المستبعدة: <b>${eliminated.join('، ')}</b></p>` : ''}${
    s.candidatesShown
      ? `<div class="wordguess-candidates"><b>${candidates.length} احتمالاً يوافق الأدلة</b><p class="note">قاموس التخمين المحلي؛ الكلمات مرشّحة من محاولاتك${s.hinted ? ' والفئة المكشوفة' : ''}. ابحث عن حروف متتابعة أو انتقل بين الصفحات.</p><label for="wordguessCandidateSearch">ابحث في الاحتمالات</label><input id="wordguessCandidateSearch" type="search" value="${esc(s.candidateQuery || '')}" placeholder="اكتب بداية الكلمة أو جزءاً منها…" autocomplete="off" oninput="if(!event.isComposing)searchWordguessCandidates(this.value,${s.run},${s.attempts.length})" oncompositionend="searchWordguessCandidates(this.value,${s.run},${s.attempts.length})"><p class="note" role="status">${filtered.length} نتائج · الصفحة ${page + 1} من ${pages}</p><div class="chips">${
          filtered
            .slice(page * 24, page * 24 + 24)
            .map(
              (word) =>
                `<button class="chip" onclick="chooseWordguessCandidate('${word}',${s.run},${s.attempts.length})" ${s.over ? 'disabled' : ''}>${esc(word)}</button>`,
            )
            .join('') || '<span class="note">لا توجد نتائج؛ جرّب حروفاً أخرى أو امسح البحث.</span>'
        }</div>${pages > 1 ? `<div class="wordguess-candidate-pages"><button id="wordguessCandidatesPrev" onclick="pageWordguessCandidates(-1,${s.run},${s.attempts.length})" ${page ? '' : 'disabled'}>السابق</button><span><bdi dir="ltr">${page + 1} / ${pages}</bdi></span><button id="wordguessCandidatesNext" onclick="pageWordguessCandidates(1,${s.run},${s.attempts.length})" ${page < pages - 1 ? '' : 'disabled'}>التالي</button></div>` : ''}</div>`
      : !s.over
        ? `<button id="wordguessCandidatesShow" onclick="showWordguessCandidates(${s.run})">🕵 اعرض الاحتمالات · −15 مرة واحدة</button>`
        : ''
  }</details>`;
}
function searchWordguessCandidates(raw, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    turn !== state.attempts.length ||
    state.over ||
    !state.candidatesShown
  )
    return;
  const input = $('wordguessCandidateSearch');
  if (!input || input.isComposing) return;
  const selection = input.selectionStart;
  state.candidateQuery = Array.from(wordsNormalizeKey(raw))
    .filter((letter) => arabicKeyboard.includes(letter))
    .slice(0, state.size)
    .join('');
  state.candidatePage = 0;
  renderWordguess();
  $('wordguessCandidateSearch')?.focus({ preventScroll: true });
  $('wordguessCandidateSearch')?.setSelectionRange(
    Math.min(selection ?? state.candidateQuery.length, state.candidateQuery.length),
    Math.min(selection ?? state.candidateQuery.length, state.candidateQuery.length),
  );
}
function pageWordguessCandidates(direction, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    turn !== state.attempts.length ||
    state.over ||
    !state.candidatesShown ||
    ![-1, 1].includes(direction)
  )
    return;
  const count = wordguessCandidates(state).filter((word) =>
    word.includes(state.candidateQuery || ''),
  ).length;
  state.candidatePage = Math.max(
    0,
    Math.min(Math.max(0, Math.ceil(count / 24) - 1), (state.candidatePage || 0) + direction),
  );
  renderWordguess();
  wordsRevealFeedback('wordguessCandidateSearch');
}
function wordguessCandidates(s) {
  const allowed = s.hinted
    ? new Set(wordsLexicon.filter((item) => item.cat === s.item.cat).map((item) => item.key))
    : null;
  return [...wordguessDictionary].filter(
    (word) =>
      word.length === s.size &&
      (!allowed || allowed.has(word)) &&
      s.attempts.every((attempt) =>
        wordguessFeedback(attempt.word, word).every((mark, i) => mark === attempt.marks[i]),
      ),
  );
}
function showWordguessCandidates(run) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    state.over ||
    !state.attempts.length ||
    state.candidatesShown
  )
    return;
  state.candidatesShown = true;
  state.helperPenalty += 15;
  state.notesOpen = true;
  renderWordguess();
  $('wordguessCandidateSearch')?.focus({ preventScroll: true });
  wordsRevealFeedback('wordguessCandidateSearch');
}
function chooseWordguessCandidate(word, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.over ||
    !state.candidatesShown ||
    !wordguessCandidates(state).includes(word)
  )
    return;
  state.entry = word;
  state.entryCursor = null;
  state.feedback = 'وضعنا الاحتمال في صف التخمين؛ اضغط تحقق عندما تختاره.';
  renderWordguess();
  $('wordguessInput')?.focus({ preventScroll: true });
  wordsRevealFeedback('wordguessMessage');
}
function selectWordguessCell(index, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.over ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.size
  )
    return;
  state.entryCursor = Math.min(index, state.entry.length);
  state.feedback = `عدّل الخانة ${state.entryCursor + 1} من اليمين باستخدام لوحة الحروف.`;
  $('wordguessInput')?.blur();
  renderWordguess();
  document
    .querySelector('.wordguess-row.current')
    ?.children[state.entryCursor]?.focus({ preventScroll: true });
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
    focusedLetter = wordsRememberLetterFocus(),
    restoreHelper = document.activeElement?.closest('.wordguess-panel')
      ? document.activeElement.id
      : '',
    restoreInput = document.activeElement?.id === 'wordguessInput',
    restoreCell = document.activeElement?.matches('.wordguess-row.current button')
      ? [...document.activeElement.parentElement.children].indexOf(document.activeElement)
      : -1,
    cat = wordsCategories.find((c) => c[0] === s.item.cat)[1],
    rows = Array.from({ length: 6 }, (_, row) => {
      const attempt = s.attempts[row],
        letters = Array.from(attempt?.word || (row === s.attempts.length ? s.entry : ''));
      return `<div class="wordguess-row ${row === s.attempts.length && !s.over ? 'current' : ''} ${row === s.attempts.length - 1 ? 'last-attempt' : ''}" ${row === s.attempts.length && !s.over ? 'aria-current="step"' : ''}>${Array.from(
        { length: s.size },
        (_, i) => {
          const editable = row === s.attempts.length && !s.over,
            tag = editable ? 'button' : 'span';
          return `<${tag} class="wordguess-cell ${attempt ? attempt.marks[i] : letters[i] ? 'filled' : ''} ${editable && s.entryCursor === i ? 'selected' : ''}" ${editable ? `type="button" onclick="selectWordguessCell(${i},${s.run},${s.attempts.length})"` : 'role="img"'} aria-label="الخانة ${i + 1}: ${letters[i] ? esc(letters[i]) + ' ' + (attempt ? { correct: 'في مكانه', present: 'في مكان آخر', absent: 'غير موجود أو تكراره زائد' }[attempt.marks[i]] : 'اضغط للتعديل') : 'خانة فارغة'}">${esc(letters[i] || '')}</${tag}>`;
        },
      ).join('')}</div>`;
    }).join('');
  setHTML(
    wrap(
      'wordguess',
      `<section class="panel wordguess-panel ${restoreInput ? 'wordguess-typing' : ''}"><div class="words-status"><span class="pill">${s.size} حروف</span><span class="pill"><bdi dir="ltr">${s.attempts.length} / 6</bdi> محاولات</span>${s.helperPenalty || s.hinted ? `<span class="pill">مساعدات: −${s.helperPenalty + (s.hinted ? 10 : 0)}</span>` : ''}${['focus', 'lab'].includes(s.mode) ? `<span class="pill">${s.mode === 'lab' ? '🔬 مختبر الفرضيات' : '🧩 وضع الاستنتاج'}</span>` : ''}${s.hinted ? `<span class="pill">الفئة: ${esc(cat)}</span>` : ''}</div><div class="wordguess-board" role="group" aria-label="محاولات تخمين الكلمة">${rows}</div>${wordguessNotebook(s)}<div class="wordguess-legend"><span><i class="correct"></i>حرف ومكان صحيح</span><span><i class="present"></i>موجود بمكان آخر</span><span><i class="absent"></i>غير موجود أو زائد</span></div>${wordguessLabHTML(s)}${s.over ? `<div class="trivia-explanation center" id="wordguessOutcome" role="status"><b>${s.won ? 'أحسنت! الكلمة هي' : 'الكلمة كانت'}: ${esc(s.item.word)}</b><p>${esc(s.item.hint)}</p></div><div class="actions"><button id="wordguessFinish" class="primary" onclick="finishWordguess(${s.run})">اعرض النتيجة ←</button></div>` : `<p class="wordguess-feedback" id="wordguessMessage" role="status" tabindex="-1">${esc(s.feedback || `اكتب كلمة من ${s.size} حروف؛ تخمينك التالي يبدأ من اليمين.`)}</p><form class="wordguess-native" onsubmit="event.preventDefault();submitWordguess(${s.run},${s.attempts.length})"><label class="sr" for="wordguessInput">اكتب كلمة عربية من ${s.size} حروف</label><input id="wordguessInput" value="${esc(s.entry)}" placeholder="اكتب كلمة من ${s.size} حروف…" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="wordguessMessage" onfocus="this.closest('.wordguess-panel').classList.add('wordguess-typing')" onblur="this.closest('.wordguess-panel').classList.remove('wordguess-typing')" oninput="if(!event.isComposing)readWordguessDraft(this.value,${s.run},${s.attempts.length})" oncompositionend="readWordguessDraft(this.value,${s.run},${s.attempts.length})"><button class="primary" type="button" onpointerdown="if(event.isPrimary&&event.button===0)event.preventDefault()" onclick="submitWordguess(${s.run},${s.attempts.length})">تحقق ↵</button></form>${wordsKeyboard('typeWordguess', [], s.keyStates)}<div class="actions wordguess-controls"><button onclick="typeWordguess('backspace',${s.run},${s.attempts.length})" aria-label="حذف الحرف المحدد أو آخر حرف">⌫ حذف</button><button onclick="typeWordguess('clear',${s.run},${s.attempts.length})">امسح التخمين</button><button id="wordguessHint" onclick="hintWordguess(${s.run},${s.attempts.length})" ${s.hinted ? 'disabled' : ''}>💡 الفئة · −10</button></div>`}</section>`,
    ),
  );
  if (s.over) wordsFocus('wordguessFinish');
  else if (restoreInput) {
    $('wordguessInput')?.focus({ preventScroll: true });
    $('wordguessInput')?.setSelectionRange(s.entry.length, s.entry.length);
  } else if (restoreCell >= 0) {
    document
      .querySelector('.wordguess-row.current')
      ?.children[s.entryCursor ?? restoreCell]?.focus({ preventScroll: true });
  } else if (restoreHelper) {
    const helper = $(restoreHelper);
    if (helper && !helper.disabled) helper.focus({ preventScroll: true });
    else if (restoreHelper === 'wordguessCompare')
      document.querySelector('[data-hypothesis-choice]')?.focus({ preventScroll: true });
    else if (restoreHelper === 'wordguessHint') $('wordguessInput')?.focus({ preventScroll: true });
    else if (restoreHelper.startsWith('wordguessCandidates'))
      $('wordguessCandidateSearch')?.focus({ preventScroll: true });
  } else wordsRestoreLetterFocus(focusedLetter);
}
function readWordguessDraft(raw, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.over
  )
    return;
  const input = $('wordguessInput');
  if (!input || input.isComposing) return;
  state.entry = Array.from(wordsNormalizeKey(raw))
    .filter((l) => arabicKeyboard.includes(l))
    .slice(0, state.size)
    .join('');
  input.value = state.entry;
  state.entryCursor = null;
  const cells = document.querySelectorAll('.wordguess-row')[state.attempts.length]?.children || [];
  Array.from(cells).forEach((cell, i) => {
    cell.textContent = Array.from(state.entry)[i] || '';
    cell.classList.toggle('filled', !!cell.textContent);
    cell.classList.remove('selected');
    cell.setAttribute(
      'aria-label',
      `الخانة ${i + 1}: ${cell.textContent || 'خانة فارغة'}، اضغط للتعديل`,
    );
  });
}
function typeWordguess(letter, run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.over
  )
    return;
  const s = state;
  if (letter === 'clear') {
    s.entry = '';
    s.entryCursor = null;
    renderWordguess();
    return;
  }
  if (letter === 'backspace') {
    const letters = Array.from(s.entry);
    if (s.entryCursor !== null && s.entryCursor < letters.length) letters.splice(s.entryCursor, 1);
    else letters.pop();
    s.entry = letters.join('');
    s.entryCursor = s.entryCursor === null ? null : Math.min(s.entryCursor, letters.length);
    renderWordguess();
    return;
  }
  letter = wordsNormalizeKey(letter);
  if (!arabicKeyboard.includes(letter)) return;
  const letters = Array.from(s.entry),
    cursor = s.entryCursor;
  if (cursor !== null && cursor < letters.length) letters[cursor] = letter;
  else if (letters.length < s.size) letters.push(letter);
  else return;
  s.entry = letters.join('');
  if (cursor !== null) s.entryCursor = cursor + 1 < s.size ? cursor + 1 : null;
  renderWordguess();
}
function wordguessMessage(text) {
  state.feedback = text;
  if ($('wordguessMessage')) $('wordguessMessage').textContent = text;
  toast(text);
  wordsRevealFeedback('wordguessMessage');
}
function submitWordguess(run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.over
  )
    return;
  const s = state,
    guess = s.entry;
  if (Array.from(guess).length !== s.size)
    return wordguessMessage(`أكمل ${s.size} حروف قبل التحقق.`);
  if (!wordguessDictionary.has(guess))
    return wordguessMessage('الكلمة غير موجودة في القاموس المحلي. جرّب كلمة عربية شائعة.');
  if (s.attempts.some((a) => a.word === guess))
    return wordguessMessage('جربت هذه الكلمة بالفعل. اختر كلمة أخرى.');
  if (['focus', 'lab'].includes(s.mode)) {
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
  s.candidatePage = 0;
  s.candidateQuery = '';
  s.entry = '';
  s.entryCursor = null;
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
  if (!s.over) wordsFocus('wordguessMessage');
  wordsRevealFeedback(s.over ? 'wordguessOutcome' : 'wordguessMessage');
}
function hintWordguess(run, turn) {
  if (
    wordsBlocked('wordguess') ||
    !wordsCurrentRun(run) ||
    (turn !== undefined && turn !== state.attempts.length) ||
    state.over ||
    state.hinted
  )
    return;
  state.hinted = true;
  renderWordguess();
}
function finishWordguess(run) {
  if (wordsBlocked('wordguess') || !wordsCurrentRun(run) || !state.over) return;
  const s = state,
    points = s.won
      ? Math.max(10, 100 - (s.attempts.length - 1) * 14 - (s.hinted ? 10 : 0) - s.helperPenalty)
      : 0;
  finishWords(
    s.won ? 'كلمة صحيحة!' : 'ست محاولات، ومعلومة جديدة',
    `الكلمة: ${s.item.word}. ${s.won ? 'وصلت إليها في ' + s.attempts.length + ' محاولات.' : 'جرّب كلمة جديدة واستفد من الألوان.'}`,
    points,
    s.item.word,
  );
  document.querySelector('#app .play')?.insertAdjacentHTML(
    'beforeend',
    `<section class="panel wordguess-review"><h3>🧩 رحلة الاستنتاج</h3><p class="note">كل سطر يوضح كيف ضيّقت المحاولة الاحتمالات في القاموس المحلي، مع الفئة الحالية إذا كشفتها.</p>${s.attempts
      .map(
        (attempt, i) =>
          `<div class="wordguess-review-row"><b>${i + 1}. ${esc(attempt.word)}</b><span class="wordguess-mini">${Array.from(
            attempt.word,
          )
            .map((letter, index) => `<i class="${attempt.marks[index]}">${esc(letter)}</i>`)
            .join(
              '',
            )}</span><small>${wordguessCandidates({ ...s, attempts: s.attempts.slice(0, i + 1) }).length} احتمالاً</small></div>`,
      )
      .join(
        '',
      )}<p class="note">${s.hinted || s.helperPenalty ? `تكلفة المساعدات: ${(s.hinted ? 10 : 0) + s.helperPenalty} نقطة.` : 'حللت الأدلة دون مساعدات.'} ${s.won ? 'الحروف الرمادية المتكررة تحدد عدد الحروف أيضاً؛ راقبها في جولتك التالية.' : 'ابدأ بكلمة فيها حروف متنوعة، ثم حافظ على الأخضر وانقل الأصفر.'}</p></section>`,
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
    run: ++wordsRunSerial,
    name,
    memoryPreview: false,
    memoryErrors: 0,
    level,
    mode: ['speed', 'precision', 'sequence', 'memory', 'intercept'].includes($('targetMode')?.value)
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
    aim: { x: 50, y: 50 },
    interceptErrors: [],
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
    focusCell: 0,
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
    if (s.mode === 'intercept') updateMovingTarget(s);
    if (s.memoryPreview && elapsed >= s.memoryPreviewUntil) {
      s.memoryPreview = false;
      s.targetBorn = elapsed;
      s.targetExpires = elapsed + s.targetLifetime;
      s.feedback = 'اختفى المسار؛ استرجع الخانة 1 ثم 2 ثم 3.';
      s.token++;
      renderTarget();
    }
    const life = $('targetLife');
    if (life)
      life.style.width =
        Math.max(
          0,
          s.memoryPreview
            ? (100 * (s.memoryPreviewUntil - elapsed)) / s.memoryPreviewDuration
            : (100 * (s.targetExpires - elapsed)) / s.targetLifetime,
        ) + '%';
    if (s.slot >= 0 && !s.memoryPreview && elapsed >= s.targetExpires) {
      s.misses++;
      s.combo = 0;
      s.claimed = true;
      s.slot = -1;
      s.decoy = -1;
      s.sequence = [];
      s.memoryPreview = false;
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
  if (s.mode === 'intercept') wordsFocus('targetMovingField');
  else document.querySelector('.target-cell[tabindex="0"]')?.focus({ preventScroll: true });
}
function spawnTarget() {
  const s = state,
    total = s.size * s.size;
  let slot = wordsRandom(total - 1);
  if (slot >= s.lastSlot && s.lastSlot >= 0) slot++;
  if (s.lastSlot < 0) slot = wordsRandom(total);
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
  s.memoryPreview = false;
  s.moving = null;
  if (s.mode === 'intercept') {
    const speed =
      { easy: 18, normal: 28, hard: 38 }[s.level] + Math.min(12, Math.floor(s.hits / 4) * 2);
    s.moving = {
      x: 25 + wordsRandom(50),
      y: 25 + wordsRandom(50),
      vx: speed * (wordsRandom(2) ? 1 : -1),
      vy: speed * (0.55 + wordsRandom(36) / 100) * (wordsRandom(2) ? 1 : -1),
    };
    s.slot = 0;
    s.targetLifetime = Math.max(
      900,
      { easy: 3600, normal: 2600, hard: 1900 }[s.level] - s.hits * 25,
    );
    s.targetExpires = s.targetBorn + s.targetLifetime;
    s.feedback = 'اعترض الدائرة المتحركة؛ أثرها يوضح اتجاهها.';
  }
  if (s.mode === 'precision') {
    s.decoy = wordsRandom(total - 1);
    if (s.decoy >= slot) s.decoy++;
  }
  if (['sequence', 'memory'].includes(s.mode))
    s.sequence = [
      slot,
      ...wordsShuffle(Array.from({ length: total }, (_, i) => i).filter((i) => i !== slot)).slice(
        0,
        2,
      ),
    ];
  if (s.mode === 'memory') {
    s.memoryPreview = true;
    s.memoryPreviewDuration = { easy: 1600, normal: 1250, hard: 1000 }[s.level];
    s.memoryPreviewUntil = s.targetBorn + s.memoryPreviewDuration;
    s.targetLifetime = Math.max(900, s.targetLifetime * 1.75);
    s.targetExpires = s.memoryPreviewUntil + s.targetLifetime;
    s.feedback = 'احفظ الخانات 1 ثم 2 ثم 3؛ بعدها ستختفي الأرقام.';
  }
}
function movingTargetRadius(s) {
  return { easy: 44, normal: 34, hard: 27 }[s.level] || 34;
}
function movingTargetPosition(s, elapsed = targetElapsed(s)) {
  if (!s.moving) return { x: 50, y: 50, vx: 0, vy: 0 };
  const seconds = Math.max(0, elapsed - s.targetBorn) / 1000,
    reflect = (initial, velocity) => {
      const distance = (((initial - 18 + velocity * seconds) % 128) + 128) % 128;
      return {
        value: 18 + (distance <= 64 ? distance : 128 - distance),
        velocity: velocity * (distance < 64 ? 1 : -1),
      };
    },
    x = reflect(s.moving.x, s.moving.vx),
    y = reflect(s.moving.y, s.moving.vy);
  return { x: x.value, y: y.value, vx: x.velocity, vy: y.velocity };
}
function targetMovingArenaHTML(s) {
  const position = movingTargetPosition(s),
    radius = movingTargetRadius(s);
  return `<div id="targetMovingField" class="target-moving-field" tabindex="0" role="application" aria-label="ساحة الاعتراض: الأسهم تحرك مؤشر التصويب، وEnter أو Space يطلق الإصابة" onpointerdown="if(event.isPrimary&&event.button===0){event.preventDefault();shootMovingTarget(event,${s.token},${s.run})}" onpointermove="if(event.pointerType!=='touch')moveMovingTargetAim(event,${s.token},${s.run})"><span class="target-moving-hint" aria-hidden="true">🎯 اعترض الحركة · +10 وحتى +20 بالسلسلة</span>${[
    1, 2, 3,
  ]
    .map((step) => {
      const trail = movingTargetPosition(s, targetElapsed(s) - step * 160);
      return `<i class="target-moving-trail" data-trail="${step}" style="left:${trail.x}%;top:${trail.y}%;opacity:${0.28 / step}" ${s.slot < 0 ? 'hidden' : ''}></i>`;
    })
    .join(
      '',
    )}<span id="targetRunner" class="target-runner" style="left:${position.x}%;top:${position.y}%;width:${radius * 2}px;height:${radius * 2}px" ${s.slot < 0 || s.claimed ? 'hidden' : ''} aria-hidden="true">🎯</span><span id="targetReticle" class="target-reticle" style="left:${s.aim.x}%;top:${s.aim.y}%" aria-hidden="true">＋</span></div><div class="target-life-track" aria-hidden="true"><span id="targetLife" style="width:${s.slot < 0 ? 0 : Math.max(0, (100 * (s.targetExpires - targetElapsed(s))) / s.targetLifetime)}%"></span></div><p class="target-feedback" id="targetFeedback" role="status">${esc(s.feedback)}</p><div class="chips center"><span class="chip" id="targetAim">التصويب: ${Math.round(s.aim.x)}% ، ${Math.round(s.aim.y)}%</span><span class="chip">إصابات: ${s.hits}</span><span class="chip">فاتت: ${s.misses}</span><span class="chip">ضغطات خاطئة: ${s.wrong}</span></div>${targetGoalsHTML(s)}`;
}
function updateMovingTarget(s = state) {
  const runner = $('targetRunner');
  if (!runner || s !== state || s.mode !== 'intercept') return;
  const position = movingTargetPosition(s);
  runner.style.left = position.x + '%';
  runner.style.top = position.y + '%';
  runner.hidden = s.slot < 0 || s.claimed;
  document.querySelectorAll('.target-moving-trail').forEach((trail) => {
    const p = movingTargetPosition(s, targetElapsed(s) - Number(trail.dataset.trail) * 160);
    trail.style.left = p.x + '%';
    trail.style.top = p.y + '%';
    trail.hidden = s.slot < 0 || s.claimed;
  });
}
function targetMovingPoint(event) {
  const rect = $('targetMovingField')?.getBoundingClientRect();
  return rect?.width && rect.height
    ? {
        x: (100 * (event.clientX - rect.left)) / rect.width,
        y: (100 * (event.clientY - rect.top)) / rect.height,
      }
    : null;
}
function moveMovingTargetAim(event, token, run) {
  if (
    wordsBlocked('target') ||
    !wordsCurrentRun(run) ||
    state.mode !== 'intercept' ||
    token !== state.token
  )
    return;
  const point = targetMovingPoint(event);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  state.aim = { x: Math.max(0, Math.min(100, point.x)), y: Math.max(0, Math.min(100, point.y)) };
  updateMovingTargetReticle();
}
function updateMovingTargetReticle() {
  if ($('targetReticle')) {
    $('targetReticle').style.left = state.aim.x + '%';
    $('targetReticle').style.top = state.aim.y + '%';
    if ($('targetAim'))
      $('targetAim').textContent =
        `التصويب: ${Math.round(state.aim.x)}% ، ${Math.round(state.aim.y)}%`;
  }
}
function moveMovingTargetReticle(dx, dy) {
  if (
    wordsBlocked('target') ||
    state.mode !== 'intercept' ||
    !Number.isFinite(dx) ||
    !Number.isFinite(dy)
  )
    return;
  state.aim = {
    x: Math.max(0, Math.min(100, state.aim.x + dx)),
    y: Math.max(0, Math.min(100, state.aim.y + dy)),
  };
  updateMovingTargetReticle();
}
function shootMovingTarget(event, token, run) {
  if (
    wordsBlocked('target') ||
    !wordsCurrentRun(run) ||
    state.mode !== 'intercept' ||
    token !== state.token
  )
    return;
  const point = targetMovingPoint(event);
  if (point) interceptTarget(point.x, point.y, token, run);
}
function interceptTarget(x, y, token, run) {
  if (wordsBlocked('target') || !wordsCurrentRun(run) || state.mode !== 'intercept') return;
  const s = state,
    now = Date.now();
  if (!wordsSeconds(s)) return finishTarget();
  if (
    token !== s.token ||
    s.claimed ||
    s.slot < 0 ||
    now - s.lastInput < 80 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > 100 ||
    y < 0 ||
    y > 100 ||
    targetElapsed(s) >= s.targetExpires
  )
    return;
  const rect = $('targetMovingField')?.getBoundingClientRect();
  if (!rect?.width || !rect.height) return;
  const position = movingTargetPosition(s),
    error = Math.hypot(
      ((x - position.x) * rect.width) / 100,
      ((y - position.y) * rect.height) / 100,
    );
  s.lastInput = now;
  s.aim = { x, y };
  if (error > movingTargetRadius(s)) {
    s.wrong++;
    s.combo = 0;
    s.points = Math.max(0, s.points - 3);
    s.feedback = 'خارج الدائرة: −3. صوّب باتجاه حركتها قبل الضغط.';
    renderTarget();
    return;
  }
  s.interceptErrors.push(error);
  claimTargetHit(s, ` · ${Math.round(error)} بكسل عن المركز`);
}
function targetStatusHTML(s) {
  return `<b class="countdown" id="targetClock">${wordsSeconds(s)} ث</b><span class="pill">💎 <b id="targetScore">${s.points}</b> نقطة</span><span class="pill">🔥 سلسلة ${s.combo}</span><span class="pill">✓ ${s.hits}</span>${['sequence', 'memory'].includes(s.mode) ? `<span class="pill">مسارات كاملة: ${s.completedPaths}</span>` : ''}`;
}
function targetGoalsHTML(s) {
  const attempts = s.hits + s.misses + s.wrong,
    accuracy = attempts ? Math.round((s.hits * 100) / attempts) : 0,
    path = ['sequence', 'memory'].includes(s.mode),
    goal = path ? Math.max(2, Math.floor(s.duration / 15)) : Math.floor(s.duration / 2),
    goals = [
      [path ? 'مسارات مكتملة' : 'إصابات صحيحة', path ? s.completedPaths : s.hits, goal],
      ['سلسلة متواصلة', s.bestCombo, s.mode === 'memory' ? 6 : 8],
      ['دقة بعد 5 إصابات', s.hits >= 5 ? accuracy : 0, 85],
    ];
  return `<div class="target-goals" aria-label="أهداف الجولة">${goals.map(([label, value, maximum]) => `<div class="${value >= maximum ? 'achieved' : ''}"><b>${value >= maximum ? '✓' : '◇'} ${label}</b><span><bdi dir="ltr">${value} / ${maximum}</bdi>${label.includes('دقة') ? '%' : ''}</span><progress max="${maximum}" value="${Math.min(value, maximum)}" aria-label="${label}: ${value} من ${maximum}"></progress></div>`).join('')}</div>`;
}
function targetArenaHTML(s) {
  if (s.mode === 'intercept') return targetMovingArenaHTML(s);
  const path = ['sequence', 'memory'].includes(s.mode),
    memoryInput = s.mode === 'memory' && !s.memoryPreview;
  return `${path ? `<p class="target-order" aria-label="ترتيب أهداف المسار">${[0, 1, 2].map((i) => `<span class="${i < s.sequenceStep ? 'complete' : i === s.sequenceStep && s.slot >= 0 && !s.memoryPreview ? 'current' : ''}">${i < s.sequenceStep ? '✓' : i + 1}</span>`).join('<i aria-hidden="true">←</i>')} <b>${s.memoryPreview ? 'احفظ المواقع؛ استعد لاختفاء الأرقام' : s.slot >= 0 ? (s.mode === 'memory' ? `تذكر موقع الخانة ${s.sequenceStep + 1}` : `اضغط الهدف ${s.sequenceStep + 1}`) : 'المسار التالي…'}</b></p>` : ''}<div class="target-grid ${s.memoryPreview ? 'target-memorize' : memoryInput ? 'target-recall' : ''}" style="--target-size:${s.size}" role="group" aria-describedby="targetFeedback" aria-label="خانات صيد الأهداف، مرتبة من اليسار">${Array.from(
    { length: s.size * s.size },
    (_, i) => {
      const active = i === s.slot && !s.claimed && !memoryInput && !s.memoryPreview,
        decoy = i === s.decoy && !s.claimed,
        order = s.sequence.indexOf(i),
        preview = s.memoryPreview && order >= 0,
        queued = s.mode === 'sequence' && order > s.sequenceStep;
      return `<button class="target-cell ${active ? 'active' : decoy ? 'decoy' : preview ? 'memory-preview' : queued ? 'queued' : ''}" data-index="${i}" tabindex="${i === (s.focusCell || 0) ? '0' : '-1'}" onfocus="focusTargetCell(${i},${s.run})" onpointerdown="if(event.isPrimary&&event.button===0){event.preventDefault();hitTarget(${i},${s.token},${s.run})}" onclick="if(event.detail===0)hitTarget(${i},${s.token},${s.run})" aria-label="صف ${Math.floor(i / s.size) + 1}، عمود ${(i % s.size) + 1}: ${preview ? `احفظ الخانة ${order + 1}` : memoryInput ? 'استرجع المسار' : active ? (s.mode === 'sequence' ? `الهدف ${order + 1}، اضغط هنا` : 'هدف، اضغط هنا') : decoy ? 'قنبلة، تجنبها' : queued ? `الهدف ${order + 1}، انتظر دوره` : 'خانة فارغة'}">${preview ? `<span aria-hidden="true">${order + 1}</span>` : active ? '<span aria-hidden="true">🎯</span>' : decoy ? '<span aria-hidden="true">💣</span>' : queued ? `<span aria-hidden="true">${order + 1}</span>` : '<span aria-hidden="true">·</span>'}${active && s.mode === 'sequence' ? `<strong class="target-order-badge" aria-hidden="true">${order + 1}</strong>` : ''}${s.size === 3 ? `<small class="target-key" aria-hidden="true">${i + 1}</small>` : ''}</button>`;
    },
  ).join(
    '',
  )}</div><div class="target-life-track" aria-hidden="true"><span id="targetLife" style="width:${s.slot >= 0 ? Math.max(0, s.memoryPreview ? (100 * (s.memoryPreviewUntil - targetElapsed(s))) / s.memoryPreviewDuration : (100 * (s.targetExpires - targetElapsed(s))) / s.targetLifetime) : 0}%"></span></div><p class="target-feedback" id="targetFeedback" role="status">${esc(s.feedback)}</p><div class="chips center"><span class="chip">أفضل سلسلة: ${s.bestCombo}</span><span class="chip">أهداف فاتت: ${s.misses}</span><span class="chip">ضغطات خاطئة: ${s.wrong}</span>${s.reactions?.length ? `<span class="chip">متوسط الاستجابة: ${Math.round(s.reactions.reduce((a, b) => a + b, 0) / s.reactions.length)} ملّي ثانية</span>` : ''}</div>${targetGoalsHTML(s)}`;
}
function focusTargetCell(index, run) {
  if (
    wordsBlocked('target') ||
    !wordsCurrentRun(run) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.size ** 2
  )
    return;
  state.focusCell = index;
  document.querySelectorAll('.target-cell').forEach((cell) => {
    cell.tabIndex = Number(cell.dataset.index) === index ? 0 : -1;
  });
}
function renderTarget() {
  const s = state,
    focusedIndex = document.activeElement?.closest('.target-cell')?.dataset.index,
    restoreMoving = document.activeElement?.id === 'targetMovingField';
  // Preserve the surrounding page and its controls while targets change rapidly.
  if ($('targetArena')) {
    $('targetStatus').innerHTML = targetStatusHTML(s);
    $('targetArena').innerHTML = targetArenaHTML(s);
  } else {
    setHTML(
      wrap(
        'target',
        `<section class="panel target-panel"><div class="words-status" id="targetStatus">${targetStatusHTML(s)}</div><div class="words-clock-track"><span id="targetTimebar" style="width:${(100 * wordsSeconds(s)) / s.duration}%"></span></div><div id="targetArena">${targetArenaHTML(s)}</div><p class="note center">${s.mode === 'precision' ? '🎯 اصنع سلسلة نجاح، و💣 تجنب القنبلة. ' : s.mode === 'sequence' ? 'اصب 1 ثم 2 ثم 3؛ الضغط خارج الترتيب خطأ. ' : s.mode === 'memory' ? 'احفظ الخانات الثلاث ثم اضغط مواقعها بالترتيب بعد اختفاء الأرقام. ' : s.mode === 'intercept' ? 'داخل الساحة: الأسهم تحرك مؤشر التصويب، وEnter أو Space يصيب مكانه، وHome يعيده للوسط. ' : ''}النجاح المتتابع يزيد المكافأة حتى +20 للهدف. الأسهم للتنقل وEnter للإصابة.</p></section>`,
      ),
    );
  }
  if (restoreMoving) $('targetMovingField')?.focus({ preventScroll: true });
  if (focusedIndex !== undefined)
    document
      .querySelector(`.target-cell[data-index="${focusedIndex}"]`)
      ?.focus({ preventScroll: true });
}

function hitTarget(index, token, run) {
  if (wordsBlocked('target') || !wordsCurrentRun(run) || state.mode === 'intercept') return;
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
    now - s.lastInput < 80 ||
    s.memoryPreview
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
      : ['sequence', 'memory'].includes(s.mode) && s.sequence.includes(index)
        ? `خارج الترتيب: −3. اضغط الهدف ${s.sequenceStep + 1} أولاً.`
        : 'خانة فارغة: −3. استهدف الدائرة الملونة.';
    if (s.mode === 'memory') {
      s.memoryErrors++;
      s.claimed = true;
      s.slot = -1;
      s.sequence = [];
      s.nextAt = targetElapsed(s) + 450;
      s.feedback = 'خانة مختلفة: −3. انتهى المسار؛ احفظ مواقع المسار التالي.';
    }
    renderTarget();
    return;
  }
  claimTargetHit(s);
}
function claimTargetHit(s, extra = '') {
  if (s !== state || wordsBlocked('target') || s.claimed || s.slot < 0) return;
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
  s.feedback = `+${gain} نقطة · ${Math.round(reaction)} ملّي ثانية${s.combo >= 3 ? ' · سلسلة ممتازة!' : ''}${extra}`;
  if (['sequence', 'memory'].includes(s.mode)) {
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
      if (s.mode === 'memory') {
        s.points += 5;
        s.feedback += ' · مكافأة الذاكرة +5';
      }
    }
  }
  s.nextAt = targetElapsed(s) + 110;
  tone();
  renderTarget();
}

function finishTarget() {
  if (wordsBlocked('target')) return;
  const s = state;
  // A delayed final timer tick must still count an already-expired, unclaimed target.
  if (s.slot >= 0 && !s.claimed && !s.memoryPreview && targetElapsed(s) >= s.targetExpires) {
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
      `<section class="panel target-review"><h3>🎯 اقرأ أداءك</h3>${targetGoalsHTML(s)}<div class="chips"><span class="chip">الدقة: ${accuracy}%</span>${reactions.length ? `<span class="chip">أسرع إصابة: ${Math.round(reactions[0])} ملّي ثانية</span><span class="chip">الاستجابة الوسطية: ${Math.round(median)} ملّي ثانية</span>` : ''}${['sequence', 'memory'].includes(s.mode) ? `<span class="chip">مسارات كاملة: ${s.completedPaths}</span>` : ''}${s.mode === 'intercept' && s.interceptErrors.length ? `<span class="chip">متوسط بُعد التصويب عن المركز: ${Math.round(s.interceptErrors.reduce((sum, value) => sum + value, 0) / s.interceptErrors.length)} بكسل</span>` : ''}</div>${reactions.length ? `<div class="target-reaction-bars" aria-label="توزيع أزمنة الاستجابة بالملّي ثانية">${buckets.map(([label, count]) => `<div><span>${label} ملّي ثانية</span><b>${count} إصابات</b><meter min="0" max="${reactions.length}" value="${count}" aria-label="${count} إصابات في ${label} ملّي ثانية"></meter></div>`).join('')}</div>` : ''}<p class="note">${s.mode === 'intercept' ? 'راقب اتجاه الأثر؛ إصابة داخل الدائرة كافية، والهدف يرتد عند الحدود. المؤشر يتحرك بالأسهم ويمكن إعادته للوسط بـHome.' : s.wrong > s.misses ? 'خفف الضغطات العشوائية؛ إصابة مؤكدة أفضل من سلسلة أخطاء.' : s.misses > s.hits ? 'ابدأ بالمستوى المريح حتى تقل الأهداف التي تفوتك، ثم ارفع السرعة.' : 'ركز على استمرار السلسلة؛ السرعة تزيد مع كل خمس إصابات.'}</p></section>`,
    );
}
function wordsPracticeKeydown(event) {
  if (
    !state?.done ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    event.repeat ||
    advancedEditableTarget(event.target)
  )
    return false;
  const trivia = event.target.closest?.('#triviaPractice'),
    hangman = event.target.closest?.('#hangmanPractice');
  if (!trivia && !hangman) return false;
  if (['Enter', ' '].includes(event.key) && event.target.closest?.('button,a,summary'))
    return false;
  if (trivia && !triviaPracticeBlocked(state.run)) {
    const p = state.practice;
    if (!p || !p.questions[p.index]) return false;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (p.choice !== null) nextTriviaPractice(state.run, p.serial, p.index);
      else if (p.questions[p.index].statements)
        submitTriviaPracticeFacts(state.run, p.serial, p.index);
      return true;
    }
    if (p.choice === null && /^[1-4]$/.test(latin(event.key))) {
      event.preventDefault();
      const choice = Number(latin(event.key)) - 1;
      if (p.questions[p.index].statements)
        toggleTriviaPracticeFact(choice, state.run, p.serial, p.index);
      else answerTriviaPractice(choice, state.run, p.serial, p.index);
      return true;
    }
  }
  if (hangman && !hangmanPracticeBlocked(state.run)) {
    const p = state.hangPractice;
    if (!p || !p.items[p.index]) return false;
    if (p.solved && event.key === 'Enter') {
      event.preventDefault();
      nextHangmanPractice(state.run, p.index, p.serial);
      return true;
    }
    const letter = wordsNormalizeKey(event.key);
    if (!p.solved && arabicKeyboard.includes(letter)) {
      event.preventDefault();
      guessHangmanPractice(letter, state.run, p.index, p.serial);
      return true;
    }
  }
  return false;
}
document.addEventListener('keydown', (event) => {
  if (wordsPracticeKeydown(event)) return;
  if (
    !wordsGameIds.has(screen) ||
    wordsBlocked(screen) ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    (event.repeat &&
      !(screen === 'target' && state?.mode === 'intercept' && event.key.startsWith('Arrow'))) ||
    advancedEditableTarget(event.target)
  )
    return;
  if (
    ['Enter', ' '].includes(event.key) &&
    event.target.closest?.('button,a,summary,[role="button"]')
  )
    return;
  if (
    screen === 'target' &&
    state.mode === 'intercept' &&
    event.target.closest?.('#targetMovingField')
  ) {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'Enter', ' '].includes(event.key)
    ) {
      event.preventDefault();
      if (['Enter', ' '].includes(event.key))
        interceptTarget(state.aim.x, state.aim.y, state.token, state.run);
      else if (event.key === 'Home') {
        state.aim = { x: 50, y: 50 };
        updateMovingTargetReticle();
      } else
        moveMovingTargetReticle(
          event.key === 'ArrowRight' ? 6 : event.key === 'ArrowLeft' ? -6 : 0,
          event.key === 'ArrowDown' ? 6 : event.key === 'ArrowUp' ? -6 : 0,
        );
    }
    return;
  }
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
  if (
    screen === 'wordguess' &&
    !state.over &&
    ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  ) {
    const cell = event.target.closest?.('.wordguess-row.current button');
    if (!cell) return;
    event.preventDefault();
    const current = [...cell.parentElement.children].indexOf(cell),
      next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? state.size - 1
            : event.key === 'ArrowLeft'
              ? Math.min(state.size - 1, current + 1)
              : Math.max(0, current - 1);
    selectWordguessCell(next);
    return;
  }
  if (screen === 'trivia') {
    if (state.mode === 'facts' && !state.locked && event.key === 'Enter') {
      event.preventDefault();
      submitTriviaFacts();
    } else if (state.locked && event.key === 'Enter') {
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

// Fact-check rounds contain exactly two true statements and explain every correction.
const triviaFactRows = [
  [
    'science',
    'الأرض والسماء',
    [
      'تدور الأرض حول الشمس.',
      'القمر الطبيعي للأرض لا يصنع ضوءه بنفسه.',
      'الشمس كوكب صخري.',
      'يتساوى طول النهار في كل مكان طوال السنة.',
    ],
    [
      'تكمل الأرض دورة حول الشمس في نحو سنة.',
      'نرى ضوء الشمس المنعكس عن سطح القمر.',
      'الشمس نجم، وليست كوكباً.',
      'يتغير طول النهار بحسب الفصل وخط العرض.',
    ],
  ],
  [
    'science',
    'الكائنات الحية',
    [
      'الدلفين يتنفس الهواء برئتَين.',
      'الفراشة حشرة.',
      'كل الطيور تستطيع الطيران.',
      'النباتات لا تتنفس.',
    ],
    [
      'الدلفين ثديي بحري يصعد إلى السطح ليتنفس.',
      'للفراشة صفات الحشرات، ومنها ست أرجل.',
      'النعام والبطريق أمثلة على طيور لا تطير.',
      'تتنفس خلايا النباتات؛ البناء الضوئي عملية أخرى.',
    ],
  ],
  [
    'science',
    'الماء والطاقة',
    [
      'الجليد ماء في الحالة الصلبة.',
      'تتحول الطاقة بين صور مختلفة.',
      'الماء النقي يغلي دائماً عند 100 درجة مهما كان الضغط.',
      'الصوت ينتقل في الفراغ التام.',
    ],
    [
      'يتجمد الماء ويصبح صلباً عند ظروف مناسبة.',
      'يمكن تحويل الطاقة الكهربائية إلى ضوء وحرارة مثلاً.',
      'تعتمد درجة الغليان على الضغط؛ 100 درجة تقريباً عند الضغط الجوي المعتاد.',
      'الصوت يحتاج وسطاً مادياً كالهواء أو الماء.',
    ],
  ],
  [
    'science',
    'القياس والجسم',
    [
      'الميكروسكوب يساعد على رؤية أشياء صغيرة.',
      'يحمل الدم الأكسجين إلى أنسجة الجسم.',
      'الكيلوغرام وحدة لقياس درجة الحرارة.',
      'تنتج الرئتان خلايا الدم الحمراء عند البالغ السليم.',
    ],
    [
      'المجهر يكبّر الأشياء الدقيقة.',
      'يحمل الهيموغلوبين في خلايا الدم الحمراء معظم الأكسجين.',
      'الكيلوغرام وحدة للكتلة، ودرجة الحرارة تقاس بوحدات مثل سيلسيوس.',
      'تُنتج خلايا الدم الحمراء أساساً في نخاع العظم.',
    ],
  ],
  [
    'geo',
    'خريطة العالم',
    [
      'تقع الكويت على ساحل الخليج العربي.',
      'آسيا أكبر القارات مساحةً.',
      'تقع البرازيل في أوروبا.',
      'أستراليا جزيرة في البحر المتوسط.',
    ],
    [
      'الكويت دولة مطلة على الخليج العربي.',
      'آسيا أكبر قارات الأرض مساحةً.',
      'البرازيل دولة في أمريكا الجنوبية.',
      'أستراليا تقع بين المحيطَين الهندي والهادئ.',
    ],
  ],
  [
    'geo',
    'البلدان والعواصم',
    [
      'طوكيو عاصمة اليابان.',
      'اللغة الرسمية في البرازيل هي البرتغالية.',
      'باريس عاصمة ألمانيا.',
      'العملة الرسمية في الكويت هي الدرهم.',
    ],
    [
      'طوكيو عاصمة اليابان.',
      'البرتغالية هي اللغة الرسمية للبرازيل.',
      'باريس عاصمة فرنسا؛ برلين عاصمة ألمانيا.',
      'العملة الرسمية في الكويت هي الدينار الكويتي.',
    ],
  ],
  [
    'geo',
    'الماء واليابسة',
    [
      'الجزيرة أرض يحيط بها الماء.',
      'المحيط الهادئ أكبر المحيطات مساحةً.',
      'البحيرة يجب أن تحتوي ماءً مالحاً.',
      'الصحراء تعني أرضاً حارة دائماً.',
    ],
    [
      'تحيط المياه بالجزيرة من جهاتها.',
      'المحيط الهادئ هو الأكبر مساحةً.',
      'توجد بحيرات عذبة وبحيرات مالحة.',
      'تحدد قلة الهطول الصحارى، ومنها صحارى باردة.',
    ],
  ],
  [
    'geo',
    'الاتجاهات والأقاليم',
    [
      'خط الاستواء يقسم الأرض إلى نصفَين شمالي وجنوبي.',
      'تشترك مصر مع دول أخرى في حوض النيل.',
      'خط غرينتش هو خط الاستواء نفسه.',
      'يقع القطب الجنوبي في المحيط المتجمد الشمالي.',
    ],
    [
      'خط الاستواء يقع عند دائرة العرض صفر.',
      'يمتد حوض النيل عبر عدة دول في إفريقيا.',
      'غرينتش خط طول مرجعي، والاستواء دائرة عرض.',
      'يقع القطب الجنوبي في قارة أنتاركتيكا.',
    ],
  ],
  [
    'history',
    'التاريخ الكويتي',
    [
      'استقلت الكويت عام 1961.',
      'انضمت الكويت إلى الأمم المتحدة عام 1963.',
      'افتُتحت أبراج الكويت في القرن التاسع عشر.',
      'بدأ إصدار الدينار الكويتي عام 2020.',
    ],
    [
      'أُعلن استقلال الكويت في 19 يونيو 1961.',
      'أصبحت الكويت عضواً في الأمم المتحدة في 14 مايو 1963.',
      'افتُتحت أبراج الكويت عام 1979.',
      'بدأ إصدار الدينار الكويتي عام 1961.',
    ],
  ],
  [
    'history',
    'حضارات وكتابة',
    [
      'بُنيت أهرامات الجيزة في مصر القديمة.',
      'استُخدمت الكتابة المسمارية في بلاد الرافدين.',
      'نشأت الألعاب الأولمبية القديمة في أمريكا.',
      'كانت الهيروغليفية نظام كتابة روماني.',
    ],
    [
      'الأهرامات من آثار الحضارة المصرية القديمة.',
      'كتب سكان بلاد الرافدين بالمسمارية على ألواح طينية.',
      'أقيمت الألعاب الأولمبية القديمة في اليونان.',
      'الهيروغليفية نظام كتابة مصري قديم.',
    ],
  ],
  [
    'history',
    'شخصيات واختراعات',
    [
      'ارتبط ابن بطوطة بالرحلات.',
      'طوّر غوتنبرغ الطباعة بالحروف المتحركة في أوروبا.',
      'كان ابن سينا لاعب كرة قدم محترفاً.',
      'استُخدمت الهواتف الذكية في العصر الروماني.',
    ],
    [
      'ابن بطوطة رحالة دوّن أخبار أسفاره.',
      'اشتهر غوتنبرغ بتطوير الطباعة بالحروف المعدنية المتحركة في أوروبا.',
      'ابن سينا طبيب وفيلسوف وعالم.',
      'الهواتف الذكية تقنية حديثة جداً مقارنة بالعصر الروماني.',
    ],
  ],
  [
    'history',
    'ترتيب زمني',
    [
      'بدأت الحرب العالمية الأولى عام 1914.',
      'هبط بشر على القمر لأول مرة عام 1969.',
      'سبق إطلاق أول قمر صناعي اختراع الطباعة في أوروبا.',
      'انتهت الحرب العالمية الثانية قبل أن تبدأ الأولى.',
    ],
    [
      'امتدت الحرب العالمية الأولى من 1914 إلى 1918.',
      'وصلت مهمة أبولو 11 إلى القمر عام 1969.',
      'أُطلق سبوتنيك 1 عام 1957؛ طباعة غوتنبرغ أقدم بقرون.',
      'انتهت الحرب الثانية عام 1945، بعد الحرب الأولى.',
    ],
  ],
  [
    'sport',
    'كرة القدم',
    [
      'يبدأ فريق كرة القدم التقليدي بـ11 لاعباً في الملعب.',
      'الرمية من خط التماس تُنفذ باليدين.',
      'كل هدف في كرة القدم يمنح ثلاث نقاط داخل نتيجة المباراة.',
      'يجوز لأي لاعب لمس الكرة بيده أثناء اللعب العادي.',
    ],
    [
      'تضم التشكيلة الأساسية 11 لاعباً، بينهم الحارس.',
      'تُنفذ رمية التماس باستخدام اليدين وفق القانون.',
      'الهدف يضيف هدفاً واحداً إلى النتيجة؛ نقاط ترتيب الدوري مختلفة.',
      'لمس الكرة باليد يخضع للقانون، وللحارس استثناء داخل منطقة جزائه.',
    ],
  ],
  [
    'sport',
    'ألعاب المضرب',
    [
      'تُلعب بطولة ويمبلدون على العشب.',
      'الريشة الطائرة تستخدم ريشة بدلاً من كرة تنس.',
      'مضرب تنس الطاولة له أوتار مثل مضرب التنس.',
      'تُقام كل بطولات التنس على أرضية واحدة.',
    ],
    [
      'تشتهر ويمبلدون بملاعبها العشبية.',
      'الريشة الطائرة تستخدم ريشة مخصصة.',
      'مضرب تنس الطاولة لوح مغطى بمواد مخصصة؛ ليس مضرباً ذا أوتار.',
      'توجد أرضيات عشبية وترابية وصلبة في التنس.',
    ],
  ],
  [
    'sport',
    'الشطرنج والعدّ',
    [
      'تضم رقعة الشطرنج 64 مربعاً.',
      'يبدأ كل لاعب في الشطرنج بـ16 قطعة.',
      'الحصان في الشطرنج يتحرك قطرياً بأي عدد من المربعات.',
      'تضم رقعة الشطرنج تسعة صفوف وتسعة أعمدة.',
    ],
    [
      'الرقعة 8×8، أي 64 مربعاً.',
      'توجد ثمانية بيادق وثماني قطع أخرى لكل لاعب.',
      'يتحرك الحصان على شكل حرف L، وليس كالفيل.',
      'تضم الرقعة ثمانية صفوف وثمانية أعمدة.',
    ],
  ],
  [
    'sport',
    'نقاط ومنافسات',
    [
      'الرمية الحرة الناجحة في كرة السلة تساوي نقطة واحدة.',
      'الماراثون الرسمي مسافته 42.195 كيلومتراً.',
      'تُقام كأس العالم لكرة القدم كل سنة في النظام المعتاد.',
      'السباحة رياضة لا تدخل الألعاب الأولمبية.',
    ],
    [
      'الرمية الحرة تمنح نقطة واحدة.',
      'المسافة المعتمدة للماراثون هي 42.195 كيلومتراً.',
      'تُقام بطولة كأس العالم للرجال كل أربع سنوات عادةً.',
      'السباحة من الرياضات الأولمبية.',
    ],
  ],
  [
    'culture',
    'لغة وحساب',
    [
      'يتكون المثلث من ثلاثة أضلاع.',
      'تضم السنة الميلادية اثني عشر شهراً.',
      'كل سنة ميلادية تتكون من 366 يوماً.',
      'مجموع زوايا المثلث في المستوى الإقليدي هو 360 درجة.',
    ],
    [
      'للمثلث ثلاثة أضلاع وثلاث زوايا.',
      'السنة الميلادية تضم 12 شهراً.',
      'السنة العادية 365 يوماً، والكبيسة 366 يوماً.',
      'المجموع في الهندسة الإقليدية هو 180 درجة.',
    ],
  ],
  [
    'culture',
    'أدوات ومعرفة',
    [
      'البوصلة تساعد على تحديد الاتجاهات.',
      'برايل نظام كتابة ملموس بالنقاط البارزة.',
      'المسطرة تقيس درجة حرارة الجسم.',
      'الطابعة تحول الورقة تلقائياً إلى ملف رقمي.',
    ],
    [
      'تشير البوصلة المغناطيسية تقريباً إلى الشمال المغناطيسي.',
      'يمكن قراءة نقاط برايل البارزة باللمس.',
      'تقيس المسطرة الأطوال؛ الحرارة تقاس بميزان حرارة.',
      'الماسح الضوئي يحول الورقة إلى صورة رقمية؛ الطابعة تطبع على الورق.',
    ],
  ],
  [
    'culture',
    'الفنون والأدب',
    [
      'كتب شكسبير مسرحية هاملت.',
      'رسم فان غوخ لوحة ليلة النجوم.',
      'فاز نجيب محفوظ بنوبل في الفيزياء.',
      'الأمير الصغير رواية كتبها نيوتن.',
    ],
    [
      'هاملت من أشهر مسرحيات ويليام شكسبير.',
      'رسم فنسنت فان غوخ ليلة النجوم عام 1889.',
      'فاز نجيب محفوظ بجائزة نوبل في الأدب عام 1988.',
      'كتب أنطوان دو سانت إكزوبيري الأمير الصغير.',
    ],
  ],
  [
    'culture',
    'حواسيب وأعداد',
    [
      'البايت القياسي يتكون من 8 بِتّات.',
      'CPU تعني وحدة المعالجة المركزية.',
      'العدد 21 عدد أولي.',
      'ذاكرة الوصول العشوائي هي نفسها القرص الصلب.',
    ],
    [
      'يتكون البايت القياسي من ثمانية بِتّات.',
      'تعني CPU عبارة Central Processing Unit.',
      '21 يساوي 3×7، لذلك ليس عدداً أولياً.',
      'ذاكرة RAM والقرص الصلب يؤديان وظائف مختلفة في الحاسوب.',
    ],
  ],
];
const triviaFactsBank = triviaFactRows.map(([cat, title, statements, reasons], i) => ({
  id: `facts-${cat}-${i}`,
  cat,
  level: i % 4 < 2 ? 'easy' : i % 4 === 2 ? 'normal' : 'hard',
  question: `اختر الحقيقتين الصحيحتين: ${title}`,
  statements: statements.map((text, index) => ({ text, truth: index < 2, reason: reasons[index] })),
  choices: statements,
  answer: statements.slice(0, 2).join(' · '),
  explanation: reasons.join(' '),
}));

// Phrase missions preserve visible word boundaries and give two optional semantic clues.
const hangmanMissionRows = [
  [
    'animals',
    'حصان البحر',
    'يحمل اسم حيوان على اليابسة لكنه يعيش تحت الماء.',
    'جسمه الصغير يقف في الماء كأنه منتصب.',
    'اسمه يتكون من حيوان ومسطح مائي.',
  ],
  [
    'animals',
    'ملك الغابة',
    'لقب مشهور لحيوان ذي زئير قوي، وليس منصباً بشرياً.',
    'غالباً المقصود باللقب هو الأسد.',
    'الكلمة الأولى لقب حاكم، والثانية مكان تكثر فيه الأشجار.',
  ],
  [
    'animals',
    'بيت العنكبوت',
    'مسكن رقيق تصنعه حشرة؟ دقق: صاحبه ذو ثماني أرجل.',
    'صاحبه من العنكبيات، وليس من الحشرات.',
    'شبكته تُنسج من خيوط ينتجها جسمه.',
  ],
  [
    'animals',
    'دب القطب الشمالي',
    'مفترس ضخم يرتبط بالجليد، واسمه يحدد جهة باردة.',
    'فراؤه يبدو أبيض، ويعيش في منطقة القطب الشمالي.',
    'العبارة ثلاث كلمات: حيوان، ثم منطقة، ثم جهة.',
  ],
  [
    'food',
    'عصير البرتقال',
    'مشروب حمضي من ثمرة يحمل لونها اسمها.',
    'نستخرجه بالعصر، وقد يحتوي لُبّ الفاكهة.',
    'الثمرة من الحمضيات وقشرتها برتقالية.',
  ],
  [
    'food',
    'سلطة فواكه',
    'طبق يجمع قطعاً حلوة متعددة، لكنه ليس كعكة.',
    'قد يحتوي التفاح والموز والبرتقال.',
    'الكلمة الأولى اسم طبق مخلوط، والثانية نوع مكوناته.',
  ],
  [
    'food',
    'خبز التنور',
    'غذاء من العجين يُنسب إلى فرن تقليدي.',
    'ينضج قرب جدران فرن حار.',
    'اسم الفرن هو الكلمة الثانية.',
  ],
  [
    'food',
    'حليب جوز الهند',
    'سائل نباتي اسمه يوحي بمنتج حيواني.',
    'يستخرج من لُب ثمرة استوائية.',
    'الثمرة معروفة بقشرتها الصلبة؛ اسمها في كلمتين.',
  ],
  [
    'home',
    'ميزان الحرارة',
    'أداة تخبرنا عن سخونة الجسم، ولا تزن كتلته هنا.',
    'قد يستخدمه الطبيب عند فحص الحمى.',
    'الكلمة الثانية هي الكمية التي يقيسها.',
  ],
  [
    'home',
    'مفتاح الباب',
    'قطعة صغيرة قد تسمح لك بالدخول إلى البيت.',
    'يتعامل مع قفل.',
    'الكلمة الثانية اسم مدخل الغرفة أو المنزل.',
  ],
  [
    'home',
    'فرشاة الأسنان',
    'أداة يومية تنظف شيئاً داخل الفم.',
    'تُستخدم عادةً مع معجون.',
    'لها شعيرات، وما تنظفه نستخدمه للمضغ.',
  ],
  [
    'home',
    'لوحة المفاتيح',
    'سطح يساعد أصابعك على إدخال الحروف إلى الحاسوب.',
    'تحتوي أزراراً مثل Enter وSpace.',
    'الكلمة الثانية جمع اسم زر أو أداة فتح.',
  ],
  [
    'nature',
    'قوس قزح',
    'ألوان مرتبة تظهر أحياناً حين يجتمع المطر وضوء الشمس.',
    'يرتبط بانكسار الضوء وانعكاسه في قطرات الماء.',
    'الجزء الأول من الاسم شكل منحني.',
  ],
  [
    'nature',
    'ضوء الشمس',
    'به نرى في النهار، وهو يصل من نجمنا.',
    'مصدره نجم يبعد عنا ملايين الكيلومترات.',
    'الكلمة الثانية اسم النجم الذي تدور الأرض حوله.',
  ],
  [
    'nature',
    'شجرة الزيتون',
    'نبات خشبي يُزرع لثمار يمكن عصرها لإنتاج زيت.',
    'ثماره قد تكون خضراء أو سوداء.',
    'الجزء الأول اسم نبات طويل، والثاني اسم ثماره.',
  ],
  [
    'nature',
    'المحيط المتجمد الشمالي',
    'مسطح مائي كبير يرتبط بالجليد وقطب من أقطاب الأرض.',
    'يقع حول القطب الشمالي.',
    'العبارة ثلاث كلمات: نوع ماء واسع، وحالته الباردة، وجهته.',
  ],
  [
    'places',
    'محطة القطار',
    'مكان ننتظر فيه وسيلة نقل تسير على قضبان.',
    'قد يضم أرصفة للمغادرة والوصول.',
    'الكلمة الثانية اسم وسيلة النقل.',
  ],
  [
    'places',
    'حديقة الحيوان',
    'مكان يضم أنواعاً من الكائنات لمشاهدتها والتعلم عنها.',
    'قد ترى فيه زرافة وأسداً وطيوراً.',
    'الاسم يجمع مساحة خضراء ونوع الكائنات المعروضة.',
  ],
  [
    'places',
    'ملعب كرة القدم',
    'مكان تجري فيه مباراة بمرمَيين وكرة.',
    'للفريق فيه أحد عشر لاعباً عادةً.',
    'العبارة ثلاث كلمات؛ الأخيرتان اسم الرياضة.',
  ],
  [
    'places',
    'متحف التاريخ الطبيعي',
    'مكان يعرض أشياء مثل الأحافير ونماذج الحيوانات والصخور.',
    'يهتم بالحياة والأرض عبر الزمن.',
    'العبارة ثلاث كلمات: مكان عرض، ثم دراسة الماضي، ثم وصف مرتبط بالطبيعة.',
  ],
  [
    'general',
    'كرة القدم',
    'رياضة شهيرة يطابق اسمها عضواً تستخدمه غالباً للعب.',
    'تُسجل الأهداف بإدخال الكرة في المرمى.',
    'الجزء الثاني هو عضو في نهاية الساق.',
  ],
  [
    'general',
    'رحلة بحرية',
    'سفر تكون فيه المياه طريقاً، لا مجرد منظر.',
    'قد تركب سفينة أو قارباً.',
    'الكلمة الثانية صفة مأخوذة من اسم مسطح مائي.',
  ],
  [
    'general',
    'قصة قصيرة',
    'عمل سردي لا يحتاج عادةً صفحات كثيرة مثل الرواية.',
    'له شخصيات وأحداث.',
    'الكلمة الثانية تصف طوله.',
  ],
  [
    'general',
    'خريطة العالم',
    'رسم يجمع البلدان والقارات على سطح واحد.',
    'تساعدنا على معرفة مواقع الأماكن.',
    'الكلمة الثانية تشمل الأرض وبلدانها.',
  ],
];
const hangmanMissionBank = hangmanMissionRows.map(([cat, word, hint, first, second], i) => ({
  id: `mission-${i}`,
  cat,
  word,
  key: wordsNormalizeKey(word),
  display: word,
  hint,
  cues: [first, second],
}));

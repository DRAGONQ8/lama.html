// Arabic knowledge, vocabulary and precision challenges. No network assets.
games.push(
  [
    'trivia',
    '🧠',
    'كنز المعلومات',
    'أسئلة متنوعة، شروحات لكل جواب، وموضوعات ومستويات مختلفة.',
    'بروحك',
    '#b7d3ff',
  ],
  [
    'hangman',
    '🔤',
    'اكشف الكلمة',
    'اكتشف الحروف العربية مع التلميحات والفئات قبل استهلاك المحاولات.',
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
    'اختبر سرعتك ودقتك، وسلاسل النجاح تزيد نقاطك.',
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
    body = `<p class="muted">اختر حرفاً في كل مرة. عندك 6 أخطاء لكل كلمة، وتلميحان يكشفان حرفاً مقابل خصم النقاط.</p><div class="fields"><div class="field"><label for="hangCategory">فئة الكلمات</label><select id="hangCategory"><option value="all">كل الفئات</option>${wordsCategories.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select></div><div class="field"><label for="hangCount">طول الجولة</label><select id="hangCount"><option value="1">كلمة واحدة</option><option value="5" selected>5 كلمات</option><option value="10">10 كلمات</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">أ، إ، آ تُحسب مثل ا. ة تختلف عن ه، وى تختلف عن ي. تقدر تستخدم لوحة المفاتيح العربية.</div>`;
  if (id === 'wordguess')
    body = `<p class="muted">لديك 6 محاولات للوصول إلى كلمة عربية. الأخضر: حرف في مكانه. الأصفر: حرف موجود في مكان آخر. الرمادي: الحرف غير موجود، أو تكراره زائد.</p><div class="fields"><div class="field full"><label for="wordguessLength">طول الكلمة</label><select id="wordguessLength"><option value="4">4 حروف · بداية خفيفة</option><option value="5" selected>5 حروف · التحدي الكامل</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">تُقبل الكلمات الموجودة في القاموس المحلي. أ، إ، آ تُحسب مثل ا؛ ة وه حرفان مختلفان. التلميح يكشف الفئة ويخصم 10 نقاط.</div>`;
  if (id === 'target')
    body = `<p class="muted">اضغط الهدف الملون فور ظهوره، وتجنب الخانات الفارغة. النجاح المتتابع يزيد المكافأة، والسرعة ترتفع أثناء اللعب.</p><div class="fields"><div class="field"><label for="targetLevel">المستوى</label><select id="targetLevel"><option value="easy">سهل · 9 خانات وأهداف أطول</option><option value="normal" selected>متوسط · 9 خانات</option><option value="hard">صعب · 16 خانة</option></select></div><div class="field"><label for="targetDuration">وقت الجولة</label><select id="targetDuration"><option value="30">30 ثانية</option><option value="60">60 ثانية</option></select></div>${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">الضغط على خانة فارغة يخصم 3 نقاط ويقطع سلسلة النجاح. كل هدف يُحسب مرة واحدة. مناسب للمس والشاشة الكاملة.</div>`;
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
    wanted = Number($('triviaCount').value),
    duration = Number($('triviaTimer').value);
  if (!pool.length) return toast('اختر موضوعاً أو مستوى آخر.');
  state = {
    id: 'trivia',
    name,
    questions: shuffle(pool)
      .slice(0, wanted)
      .map((q) => ({ ...q, choices: shuffle(q.choices) })),
    index: 0,
    correct: 0,
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
}
function renderTrivia() {
  const s = state,
    q = s.questions[s.index],
    cat = triviaCategories.find((c) => c[0] === q.cat)[1];
  setHTML(
    wrap(
      'trivia',
      `<section class="panel"><div class="words-status"><span class="pill">${s.index + 1} / ${s.questions.length}</span><span class="pill">${esc(cat)}</span><span class="pill">✓ ${s.correct}</span>${s.duration ? `<b id="triviaClock" class="countdown">${s.locked ? 'شرح الإجابة' : wordsSeconds(s) + ' ث'}</b>` : '<span class="pill">بدون مؤقت</span>'}</div><div class="progressline"><span style="width:${(100 * s.index) / s.questions.length}%"></span></div>${s.duration ? `<div class="words-clock-track"><span id="triviaTimebar" style="width:${s.locked ? 0 : (100 * wordsSeconds(s)) / s.duration}%"></span></div>` : ''}<h3 class="trivia-question">${esc(q.question)}</h3><div class="trivia-choices">${q.choices.map((c, i) => `<button class="trivia-choice ${s.locked ? (c === q.answer ? 'correct' : i === s.choice ? 'incorrect' : 'faded') : ''}" onclick="answerTrivia(${i})" ${s.locked ? 'disabled' : ''}><span class="choice-number">${i + 1}</span><span>${esc(c)}</span>${s.locked && c === q.answer ? '<b>✓</b>' : s.locked && i === s.choice ? '<b>✕</b>' : ''}</button>`).join('')}</div>${s.locked ? `<div class="trivia-explanation" role="status"><b>${s.choice === -1 ? 'انتهى الوقت' : q.choices[s.choice] === q.answer ? 'إجابة صحيحة!' : 'تعلمنا معلومة جديدة'}</b><p>${esc(q.explanation)}</p></div><div class="actions"><button class="primary" onclick="nextTrivia()">${s.index + 1 === s.questions.length ? 'اعرض النتيجة' : 'السؤال التالي'} ←</button></div>` : '<p class="note center">اختر الجواب أو اضغط رقمه على لوحة المفاتيح.</p>'}</section>`,
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
    tone();
  }
  s.answers.push({ question: q.question, correct, answer: q.answer });
  renderTrivia();
}
function nextTrivia() {
  if (wordsBlocked('trivia') || !state.locked) return;
  const s = state;
  s.index++;
  if (s.index === s.questions.length)
    return finishWords(
      s.correct === s.questions.length ? 'معرفة كاملة!' : 'انتهى اختبار المعلومات',
      `أجبت بشكل صحيح عن ${s.correct} من ${s.questions.length} سؤالاً.`,
      (100 * s.correct) / s.questions.length,
      `${s.correct} / ${s.questions.length}`,
    );
  triviaPrepare();
  renderTrivia();
}

function wordsNormalizeKey(value) {
  return String(value)
    .trim()
    .replace(/[\u064B-\u065F\u0670ـ\s]/g, '')
    .replace(/[أإآ]/g, 'ا');
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
    count = Number($('hangCount').value),
    pool = wordsLexicon.filter((w) => cat === 'all' || w.cat === cat);
  state = {
    id: 'hangman',
    name,
    queue: shuffle(pool).slice(0, count),
    index: 0,
    wins: 0,
    total: 0,
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
  });
}
function hangmanSolved(s) {
  return Array.from(s.item.key).every((letter) => s.guessed.includes(letter));
}
function hangmanDrawing(misses) {
  const body = [
    '<circle cx="146" cy="64" r="17"/>',
    '<path d="M146 81v54"/>',
    '<path d="m146 93-28 22"/>',
    '<path d="m146 93 28 22"/>',
    '<path d="m146 135-25 33"/>',
    '<path d="m146 135 25 33"/>',
  ];
  return `<svg class="hangman-drawing" viewBox="0 0 220 190" role="img" aria-label="${misses} أخطاء من 6"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path class="hangman-frame" d="M24 178h80M62 178V20h84v26"/>${body.slice(0, misses).join('')}</g></svg>`;
}
function renderHangman() {
  const s = state,
    item = s.item,
    category = wordsCategories.find((c) => c[0] === item.cat)[1];
  setHTML(
    wrap(
      'hangman',
      `<section class="panel"><div class="words-status"><span class="pill">الكلمة ${s.index + 1} / ${s.queue.length}</span><span class="pill">${esc(category)}</span><span class="pill">✓ ${s.wins} كلمات</span><b class="${s.misses >= 4 ? 'danger-text' : ''}">${6 - s.misses} أخطاء متبقية</b></div><div class="hangman-layout">${hangmanDrawing(s.misses)}<div><p class="hangman-clue">${esc(item.hint)}</p><div class="hangman-word" aria-label="حروف الكلمة">${Array.from(
        item.key,
      )
        .map(
          (letter) =>
            `<span class="hangman-cell ${s.guessed.includes(letter) ? 'revealed' : s.over ? 'lost' : ''}">${s.guessed.includes(letter) || s.over ? esc(letter) : '<span aria-hidden="true">ـ</span><span class="sr">حرف مخفي</span>'}</span>`,
        )
        .join(
          '',
        )}</div>${s.over ? `<div class="trivia-explanation" role="status"><b>${s.won ? 'أحسنت! الكلمة: ' + esc(item.word) : 'الكلمة هي: ' + esc(item.word)}</b><p>${s.won ? 'المحاولات الأقل تعطي نتيجة أفضل.' : 'الكلمة التالية فرصة جديدة.'}</p></div>` : `<p class="note">الحروف المجربة: ${s.guessed.length ? s.guessed.map(esc).join('، ') : 'لم تجرب أي حرف بعد'}</p>`}</div></div>${!s.over ? wordsKeyboard('guessHangman', s.guessed) : ''}<div class="actions">${s.over ? `<button class="primary" onclick="nextHangman()">${s.index + 1 === s.queue.length ? 'اعرض النتيجة' : 'الكلمة التالية'} ←</button>` : `<button onclick="hintHangman()" ${s.hints >= 2 ? 'disabled' : ''}>💡 اكشف حرفاً (${2 - s.hints} متبقي) · −3</button>`}</div></section>`,
    ),
  );
}
function finishHangmanWord() {
  const s = state;
  s.won = hangmanSolved(s);
  if (s.won || s.misses >= 6) {
    s.over = true;
    if (s.won) {
      s.wins++;
      s.total += Math.max(2, 20 - s.misses * 2 - s.hints * 3);
      tone(true);
    }
  }
}
function guessHangman(raw) {
  if (wordsBlocked('hangman') || state.over) return;
  const letter = wordsNormalizeKey(raw);
  if (!arabicKeyboard.includes(letter) || state.guessed.includes(letter)) return;
  state.guessed.push(letter);
  if (!state.item.key.includes(letter)) state.misses++;
  else tone();
  finishHangmanWord();
  renderHangman();
}
function hintHangman() {
  if (wordsBlocked('hangman') || state.over || state.hints >= 2) return;
  const missing = [...new Set(Array.from(state.item.key))].filter(
    (l) => !state.guessed.includes(l),
  );
  if (!missing.length) return;
  state.hints++;
  state.guessed.push(missing[randInt(missing.length)]);
  finishHangmanWord();
  renderHangman();
}
function nextHangman() {
  if (wordsBlocked('hangman') || !state.over) return;
  const s = state;
  s.index++;
  if (s.index === s.queue.length)
    return finishWords(
      s.wins === s.queue.length ? 'خبير الحروف!' : 'انتهت جولة الكلمات',
      `اكتشفت ${s.wins} من ${s.queue.length} كلمات. التلميحات والأخطاء تخصم من مكافأة الكلمة (20 نقطة كحد أقصى).`,
      s.total,
      `${s.wins} / ${s.queue.length}`,
    );
  prepareHangman();
  renderHangman();
}

function startWordguess(name) {
  const size = Number($('wordguessLength').value),
    pool = wordsLexicon.filter((w) => Array.from(w.key).length === size);
  state = {
    id: 'wordguess',
    name,
    size,
    item: pool[randInt(pool.length)],
    entry: '',
    attempts: [],
    keyStates: Object.create(null),
    hinted: false,
    over: false,
    won: false,
    done: false,
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
function renderWordguess() {
  const s = state,
    cat = wordsCategories.find((c) => c[0] === s.item.cat)[1],
    rows = Array.from({ length: 6 }, (_, row) => {
      const attempt = s.attempts[row],
        letters = Array.from(attempt?.word || (row === s.attempts.length ? s.entry : ''));
      return `<div class="wordguess-row">${Array.from({ length: s.size }, (_, i) => `<span class="wordguess-cell ${attempt ? attempt.marks[i] : letters[i] ? 'filled' : ''}" aria-label="${letters[i] ? esc(letters[i]) + ' ' + (attempt ? { correct: 'في مكانه', present: 'في مكان آخر', absent: 'غير موجود' }[attempt.marks[i]] : '') : 'خانة فارغة'}">${esc(letters[i] || '')}</span>`).join('')}</div>`;
    }).join('');
  setHTML(
    wrap(
      'wordguess',
      `<section class="panel"><div class="words-status"><span class="pill">${s.size} حروف</span><span class="pill">${s.attempts.length} / 6 محاولات</span>${s.hinted ? `<span class="pill">الفئة: ${esc(cat)}</span>` : ''}</div><div class="wordguess-board" role="group" aria-label="محاولات تخمين الكلمة">${rows}</div><div class="wordguess-legend"><span><i class="correct"></i>حرف ومكان صحيح</span><span><i class="present"></i>موجود بمكان آخر</span><span><i class="absent"></i>غير موجود أو زائد</span></div>${s.over ? `<div class="trivia-explanation center" role="status"><b>${s.won ? 'أحسنت! الكلمة هي' : 'الكلمة كانت'}: ${esc(s.item.word)}</b><p>${esc(s.item.hint)}</p></div><div class="actions"><button class="primary" onclick="finishWordguess()">اعرض النتيجة ←</button></div>` : `${wordsKeyboard('typeWordguess', [], s.keyStates)}<div class="actions wordguess-controls"><button onclick="typeWordguess('backspace')" aria-label="حذف آخر حرف">⌫ حذف</button><button class="primary" onclick="submitWordguess()">تحقق ↵</button><button onclick="hintWordguess()" ${s.hinted ? 'disabled' : ''}>💡 الفئة · −10</button></div><p class="note center" id="wordguessMessage" role="status">اكتب كلمة من ${s.size} حروف بلوحة الحروف أو لوحة المفاتيح العربية.</p>`}</section>`,
    ),
  );
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
  if ($('wordguessMessage')) $('wordguessMessage').textContent = text;
  toast(text);
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
  const marks = wordguessFeedback(guess, s.item.key),
    rank = { absent: 1, present: 2, correct: 3 };
  Array.from(guess).forEach((letter, i) => {
    if (rank[marks[i]] > (rank[s.keyStates[letter]] || 0)) s.keyStates[letter] = marks[i];
  });
  s.attempts.push({ word: guess, marks });
  s.entry = '';
  if (guess === s.item.key) {
    s.won = true;
    s.over = true;
    tone(true);
  } else if (s.attempts.length === 6) s.over = true;
  else tone();
  renderWordguess();
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
  const level = $('targetLevel').value,
    duration = Number($('targetDuration').value);
  state = {
    id: 'target',
    name,
    level,
    duration,
    size: level === 'hard' ? 4 : 3,
    endAt: Date.now() + duration * 1000,
    points: 0,
    hits: 0,
    misses: 0,
    wrong: 0,
    combo: 0,
    bestCombo: 0,
    slot: -1,
    lastSlot: -1,
    token: 0,
    claimed: true,
    lastInput: 0,
    nextAt: 0,
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
    if (s.slot >= 0 && elapsed >= s.targetExpires) {
      s.misses++;
      s.combo = 0;
      s.claimed = true;
      s.slot = -1;
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
  s.targetExpires =
    targetElapsed(s) +
    Math.max(
      s.level === 'hard' ? 320 : 400,
      { easy: 1400, normal: 950, hard: 720 }[s.level] - Math.floor(s.hits / 5) * 50,
    );
}
function renderTarget() {
  const s = state;
  setHTML(
    wrap(
      'target',
      `<section class="panel"><div class="words-status"><b class="countdown" id="targetClock">${wordsSeconds(s)} ث</b><span class="pill">💎 <b id="targetScore">${s.points}</b> نقطة</span><span class="pill">🔥 سلسلة ${s.combo}</span><span class="pill">✓ ${s.hits}</span></div><div class="words-clock-track"><span id="targetTimebar" style="width:${(100 * wordsSeconds(s)) / s.duration}%"></span></div><div class="target-grid" style="--target-size:${s.size}" aria-label="خانات صيد الأهداف">${Array.from({ length: s.size * s.size }, (_, i) => `<button class="target-cell ${i === s.slot && !s.claimed ? 'active' : ''}" onclick="hitTarget(${i},${s.token})" aria-label="${i === s.slot && !s.claimed ? 'هدف، اضغط هنا' : 'خانة فارغة'}">${i === s.slot && !s.claimed ? '<span aria-hidden="true">🎯</span>' : '<span aria-hidden="true">·</span>'}</button>`).join('')}</div><p class="target-feedback" role="status">${esc(s.feedback)}</p><div class="chips center"><span class="chip">أفضل سلسلة: ${s.bestCombo}</span><span class="chip">أهداف فاتت: ${s.misses}</span><span class="chip">ضغطات خاطئة: ${s.wrong}</span></div><p class="note center">هدف واحد، ضغطة واحدة. النجاح المتتابع يزيد المكافأة حتى +20 للهدف.</p></section>`,
    ),
  );
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
    s.combo = 0;
    s.points = Math.max(0, s.points - 3);
    s.feedback = 'خانة فارغة: −3. استهدف الدائرة الملونة.';
    renderTarget();
    return;
  }
  s.claimed = true;
  s.slot = -1;
  s.hits++;
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const gain = 10 + Math.min(10, Math.floor((s.combo - 1) / 3) * 2);
  s.points += gain;
  s.feedback = `+${gain} نقطة${s.combo >= 3 ? ' · سلسلة ممتازة!' : ''}`;
  s.nextAt = targetElapsed(s) + 110;
  tone();
  renderTarget();
}
function finishTarget() {
  if (screen !== 'target' || !state || state.done) return;
  const s = state,
    accuracy =
      s.hits + s.misses + s.wrong ? Math.round((100 * s.hits) / (s.hits + s.misses + s.wrong)) : 0;
  finishWords(
    'انتهت رحلة الصيد!',
    `${s.hits} هدفاً صحيحاً، ${s.misses} أهداف فاتت، و${s.wrong} ضغطات خاطئة. الدقة ${accuracy}%، وأفضل سلسلة ${s.bestCombo}.`,
    s.points,
    `${s.hits} هدفاً`,
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
  if (screen === 'hangman' && !state.over) {
    const letter = wordsNormalizeKey(event.key);
    if (arabicKeyboard.includes(letter)) {
      event.preventDefault();
      guessHangman(letter);
    }
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

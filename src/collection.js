// Three offline knowledge games: local SVG flags, explained facts and curated ordering decks.
const collectionGameIds = new Set(['flags', 'truefalse', 'order']);
let collectionRunSerial = 0;
games.push(
  [
    'flags',
    '🏳️',
    'من العلم؟',
    'أعلام دول مشهورة والخليج: اختر القارة وتعرّف على الدولة أو علمها.',
    'بروحك',
    '#a8dbff',
  ],
  [
    'truefalse',
    '✓',
    'صح أو خطأ',
    'حقائق من العلوم والحيوانات والجغرافيا، مع تفسير بعد كل إجابة.',
    'بروحك',
    '#c4efb8',
  ],
  [
    'order',
    '↕',
    'رتّبها',
    'رتّب الكواكب والأعداد والأحداث ومراحل الحياة في الاتجاه المطلوب.',
    'بروحك',
    '#ffd59a',
  ],
);
Object.assign(gameWorld, { flags: 'guess', truefalse: 'brain', order: 'brain' });
for (const id of collectionGameIds) soloGameIds.add(id);
Object.assign(gameGuides, {
  flags: [
    'اعرف الدولة من العلم، أو اختر العلم الصحيح لاسم الدولة. اختر دول العالم أو قارة واحدة أو دول الخليج الست.',
    'تظهر الإجابة بعد كل سؤال، ولا تتكرر الدولة خلال الجولة. كل الإجابات الصحيحة تعطي نتيجة 100. الأعلام مرسومة داخل اللعبة وتعمل دون إنترنت. استخدم الأرقام لاختيار الجواب وEnter للمتابعة. بعد الجولة العادية يمكنك مراجعة أخطائك في تدريب منفصل بلا نقاط إضافية، أو البدء بنفس الخيارات.',
  ],
  truefalse: [
    'اقرأ العبارة وحدد هل هي صحيحة أم خاطئة. اختر الموضوع والمستوى وطول الجولة.',
    'اقرأ الشرح بعد كل جواب؛ لا يوجد مؤقت. كل الإجابات الصحيحة تعطي نتيجة 100، ولا تتكرر العبارة خلال الجولة. على لوحة المفاتيح: 1 للصح و2 للخطأ وEnter للمتابعة. نتيجة الجولة العادية تتيح تدريباً على العبارات التي أخطأت فيها، وتبقى نقاطك الأصلية كما هي.',
  ],
  order: [
    'اقرأ الاتجاه المطلوب، ثم استخدم زري أعلى وأسفل لترتيب البطاقات. البطاقات تبدأ مبعثرة دائماً.',
    'لديك محاولة تأكيد واحدة لكل ترتيب، ويمكن التراجع عن التحريك قبل التأكيد. بعد التأكيد يظهر الترتيب الصحيح وسببه؛ كل بطاقة في مكانها الصحيح تكسب جزءاً من نقاط السؤال. استخدم Tab وEnter للأزرار، أو أرقام البطاقات لاختيارها ثم الأسهم لتحريكها. بعد الجولة العادية يمكنك التدرب على الترتيبات الناقصة دون إضافة نقاط جديدة.',
  ],
});
function collectionShuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function collectionCurrent(run, index, id = state?.id) {
  return (
    collectionGameIds.has(id) &&
    screen === id &&
    state?.id === id &&
    !state.done &&
    !coreBlocked() &&
    run === state.run &&
    index === state.index
  );
}
function collectionOption(id, allowed, fallback) {
  const value = $(id)?.value;
  return allowed.includes(value) ? value : fallback;
}
function collectionNumber(id, allowed, fallback) {
  const value = Number($(id)?.value);
  return allowed.includes(value) ? value : fallback;
}
const collectionPreviousSetup = setup;
setup = function (id, internal = false) {
  if (!collectionGameIds.has(id)) return collectionPreviousSetup(id, internal);
  if (!requirePlayers(id)) return;
  captureSoloSession();
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
  const rounds = (field, values, unit) =>
    `<div class="field"><label for="${field}">طول الجولة</label><select id="${field}" onchange="updateCollectionAvailable()">${values.map((n) => `<option value="${n}">${n} ${unit}</option>`).join('')}</select></div>`;
  let body;
  if (id === 'flags')
    body = `<p class="muted">فرنسا وألمانيا وإيطاليا وأمريكا وبريطانيا ودول مشهورة من كل قارة، مع دول الخليج الست. الأعلام مرسومة محلياً وتعمل على كل الأجهزة دون تحميل صور.</p><div class="fields"><div class="field"><label for="flagsRegion">الدول</label><select id="flagsRegion" onchange="updateCollectionAvailable()">${collectionRegions.map(([key, title]) => `<option value="${key}">${title}</option>`).join('')}</select></div><div class="field"><label for="flagsMode">السؤال</label><select id="flagsMode"><option value="country">من العلم إلى اسم الدولة</option><option value="flag">من اسم الدولة إلى علمها</option></select></div><div class="field"><label for="flagsChoices">عدد الخيارات</label><select id="flagsChoices"><option value="4">4 خيارات</option><option value="2">خياران · بداية سهلة</option><option value="6">6 خيارات · تحدّي</option></select></div>${rounds('flagsCount', [5, 10, 20], 'أسئلة')}${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">الفلتر يحدد الدول التي نسأل عنها. بعض الخيارات الخاطئة قد تكون من قارات أخرى. في أوقيانوسيا نسأل عن أستراليا ونيوزيلندا فقط.</div>`;
  if (id === 'truefalse')
    body = `<p class="muted">حقيقة أم معلومة شائعة خاطئة؟ اختر جوابك، ثم اقرأ التفسير. جولة هادئة بلا مؤقت وبلا تكرار للأسئلة.</p><div class="fields"><div class="field"><label for="factCategory">الموضوع</label><select id="factCategory" onchange="updateCollectionAvailable()"><option value="all">عام · كل المواضيع</option>${collectionFactCategories.map(([key, title]) => `<option value="${key}">${title}</option>`).join('')}</select></div><div class="field"><label for="factLevel">المستوى</label><select id="factLevel" onchange="updateCollectionAvailable()"><option value="all">كل المستويات</option><option value="easy">سهل</option><option value="normal">متوسط</option></select></div>${rounds('factCount', [5, 10, 20], 'أسئلة')}${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">كل إجابة صحيحة تساوي نصيبها من 100 نقطة. الشرح يظهر حتى عند اختيار الجواب الصحيح.</div>`;
  if (id === 'order')
    body = `<p class="muted">رتّب البطاقات حسب المطلوب: من الأقرب إلى الأبعد، أو من الأصغر إلى الأكبر، أو من الأقدم إلى الأحدث. لكل سؤال اتجاه واضح وشرح للحل.</p><div class="fields"><div class="field"><label for="orderCategory">مجموعة الترتيب</label><select id="orderCategory" onchange="updateCollectionAvailable()"><option value="all">عام · كل المجموعات</option>${collectionOrderCategories.map(([key, title]) => `<option value="${key}">${title}</option>`).join('')}</select></div><div class="field"><label for="orderDirection">اتجاه التحدّي</label><select id="orderDirection"><option value="forward">الاتجاه الأساسي لكل سؤال</option><option value="mixed">متنوع · الأساسي أو العكسي</option></select></div>${rounds('orderCount', [3, 5, 10], 'ترتيبات')}${playerField('سجّل النتيجة باسم')}</div><div class="hintpanel">حرّك البطاقات بالأزرار، ثم أكّد مرة واحدة. كل بطاقة في مكانها الصحيح تكسب جزءاً من النقاط. في الاتجاه العكسي يتغير نص المطلوب ليبقى واضحاً.</div>`;
  setHTML(
    wrap(
      id,
      `<section class="panel collection-setup">${body}<p class="note" id="collectionAvailable" aria-live="polite"></p><div class="actions"><button class="primary" onclick="startCollection('${id}')">ابدأ اللعبة ←</button></div></section>`,
    ),
  );
  updateCollectionAvailable();
  goTop();
};
const collectionPreviousStartExtra = startExtra;
startExtra = function (id) {
  return collectionGameIds.has(id) ? startCollection(id) : collectionPreviousStartExtra(id);
};
function collectionPool(id = state?.id) {
  if (id === 'flags') {
    const region = $('flagsRegion')?.value || 'all';
    return collectionCountries.filter(
      (q) => region === 'all' || (region === 'gulf' ? q.gulf : q.region === region),
    );
  }
  if (id === 'truefalse') {
    const cat = $('factCategory')?.value || 'all',
      level = $('factLevel')?.value || 'all';
    return collectionFacts.filter(
      (q) => (cat === 'all' || q.cat === cat) && (level === 'all' || q.level === level),
    );
  }
  const cat = $('orderCategory')?.value || 'all';
  return collectionOrderDecks.filter((q) => cat === 'all' || q.cat === cat);
}
function updateCollectionAvailable() {
  if (screen !== 'setup' || !collectionGameIds.has(state?.id) || !$('collectionAvailable')) return;
  const count = collectionPool().length;
  $('collectionAvailable').textContent =
    `${count} ${state.id === 'flags' ? 'دولة' : state.id === 'order' ? 'ترتيباً' : 'عبارة'} متاحة. إذا اخترت عدداً أكبر نستخدم جميع المتاح دون تكرار.`;
}
function startCollection(id) {
  if (coreBlocked() || screen !== 'setup' || state?.id !== id || !collectionGameIds.has(id)) return;
  const pool = collectionPool(id);
  if (!pool.length) return toast('اختر مجموعة أو مستوى آخر.');
  const name = player(),
    count =
      id === 'flags'
        ? collectionNumber('flagsCount', [5, 10, 20], 5)
        : id === 'truefalse'
          ? collectionNumber('factCount', [5, 10, 20], 5)
          : collectionNumber('orderCount', [3, 5, 10], 3),
    flagMode = collectionOption('flagsMode', ['country', 'flag'], 'country'),
    choicesCount = collectionNumber('flagsChoices', [2, 4, 6], 4),
    direction = collectionOption('orderDirection', ['forward', 'mixed'], 'forward');
  clearTimers();
  state = {
    id,
    name,
    run: ++collectionRunSerial,
    index: 0,
    done: false,
    locked: false,
    correct: 0,
    credit: 0,
    answers: [],
    started: Date.now(),
    flagMode,
    choicesCount,
    settings: Object.fromEntries(
      [...document.querySelectorAll('.collection-setup select[id]')].map((field) => [
        field.id,
        field.value,
      ]),
    ),
    practice: false,
    orderMoves: [],
    orderStatus: '',
    selected: 0,
    questions: collectionShuffle(pool)
      .slice(0, count)
      .map((q) => {
        if (id === 'flags') {
          const near = collectionShuffle(
              collectionCountries.filter((c) => c.code !== q.code && c.region === q.region),
            ),
            others = collectionShuffle(
              collectionCountries.filter((c) => c.code !== q.code && c.region !== q.region),
            );
          return {
            ...q,
            choices: collectionShuffle([q, ...near, ...others].slice(0, choicesCount)),
          };
        }
        if (id === 'order') {
          const reverse = direction === 'mixed' && randInt(2) === 1,
            solution = reverse ? [...q.items].reverse() : [...q.items];
          let items = collectionShuffle(solution);
          if (items.every((v, i) => v === solution[i])) items = [...items.slice(1), items[0]];
          return { ...q, prompt: reverse ? q.reverse : q.prompt, solution, arranged: items };
        }
        return { ...q };
      }),
  };
  screen = id;
  renderCollection();
  goTop();
  collectionFocusQuestion();
}
function collectionFocusQuestion() {
  const question = $('collectionQuestion');
  question?.focus({ preventScroll: true });
  question?.scrollIntoView({ block: 'nearest' });
}
function collectionFeedback(q, answer) {
  if (!state.locked) return '';
  const right = answer.correct;
  return `<div class="collection-feedback ${right ? 'is-correct' : 'is-wrong'}" role="status"><b>${right ? '✓ إجابة صحيحة' : state.id === 'order' ? `في مكانها الصحيح: ${answer.matches} من ${q.solution.length}` : 'راجع الإجابة الصحيحة'}</b><p>${esc(state.id === 'flags' ? `هذا علم ${q.name}.` : q.reason)}</p>${state.id === 'order' ? `<ol class="collection-solution">${q.solution.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>` : ''}</div>`;
}
function renderCollection() {
  if (!collectionGameIds.has(state?.id) || screen !== state.id || state.done) return;
  const s = state,
    q = s.questions[s.index],
    answer = s.answers[s.index],
    token = `${s.run},${s.index}`;
  let body;
  if (s.id === 'flags')
    body = `<h3 class="collection-question" id="collectionQuestion" tabindex="-1" aria-describedby="collectionQuestionProgress">${s.flagMode === 'country' ? 'هذا علم أي دولة؟' : `أي علم يمثل ${esc(q.name)}؟`}</h3>${s.flagMode === 'country' ? `<div class="collection-flag-question">${collectionFlagSVG(q.code, 'علم الدولة المطلوب التعرف عليها')}</div>` : ''}<div class="collection-choices ${s.flagMode === 'flag' ? 'flag-options' : ''}">${q.choices.map((item, i) => `<button class="collection-choice ${s.locked && item.code === q.code ? 'is-correct' : s.locked && answer.choice === i ? 'is-wrong' : ''}" onclick="answerCollection(${i},${token})" ${s.locked ? 'disabled' : ''}><span class="collection-choice-num">${i + 1}</span>${s.flagMode === 'country' ? `<b>${esc(item.name)}</b>` : `${collectionFlagSVG(item.code, `الخيار رقم ${i + 1}`)}${s.locked ? `<b>${esc(item.name)}</b>` : ''}`}${s.locked && item.code === q.code ? '<span class="collection-verdict">✓ الصحيح</span>' : ''}</button>`).join('')}</div>`;
  if (s.id === 'truefalse')
    body = `<span class="collection-category">${esc(collectionFactCategories.find(([id]) => id === q.cat)?.[1] || '')} · ${q.level === 'easy' ? 'سهل' : 'متوسط'}</span><h3 class="collection-question fact-statement" id="collectionQuestion" tabindex="-1" aria-describedby="collectionQuestionProgress">${esc(q.text)}</h3><div class="collection-choices truth-options">${[true, false].map((value, i) => `<button class="collection-choice ${s.locked && value === q.truth ? 'is-correct' : s.locked && answer.choice === i ? 'is-wrong' : ''}" onclick="answerCollection(${i},${token})" ${s.locked ? 'disabled' : ''}><span class="collection-choice-num">${i + 1}</span><b>${value ? '✓ صح' : '✕ خطأ'}</b>${s.locked && value === q.truth ? '<span class="collection-verdict">الجواب الصحيح</span>' : ''}</button>`).join('')}</div>`;
  if (s.id === 'order')
    body = `<h3 class="collection-question" id="collectionQuestion" tabindex="-1" aria-describedby="collectionQuestionProgress">${esc(q.prompt)}</h3><p class="note">الترتيب من أعلى إلى أسفل. ${s.locked ? 'انتهت المحاولة؛ راجع الحل أسفل البطاقات.' : 'حرّك البطاقات ثم أكّد ترتيبك.'}</p><ol class="collection-order" aria-label="بطاقات الترتيب">${q.arranged.map((item, i) => `<li data-order-index="${i}" class="${s.locked ? (item === q.solution[i] ? 'is-correct' : 'is-wrong') : s.selected === i ? 'is-selected' : ''}" ${!s.locked && s.selected === i ? 'aria-current="true"' : ''}><span class="collection-order-number">${i + 1}</span><span class="collection-order-label">${esc(item)}</span><div class="collection-order-controls"><button data-order-move="${i}-up" onclick="moveCollectionOrder(${i},-1,${token})" aria-label="نقل ${esc(item)} إلى أعلى" ${s.locked || i === 0 ? 'disabled' : ''}>↑</button><button data-order-move="${i}-down" onclick="moveCollectionOrder(${i},1,${token})" aria-label="نقل ${esc(item)} إلى أسفل" ${s.locked || i === q.arranged.length - 1 ? 'disabled' : ''}>↓</button></div></li>`).join('')}</ol><p class="note collection-move-status" role="status">${esc(s.orderStatus)}</p>${s.locked ? '' : `<div class="actions"><button onclick="collectionUndoOrder(${token})" ${s.orderMoves.length ? '' : 'disabled'}>↶ تراجع عن آخر حركة</button></div><button class="primary collection-confirm" onclick="submitCollectionOrder(${token})">تأكيد الترتيب ✓</button>`}`;
  setHTML(
    wrap(
      s.id,
      `<section class="panel collection-play">${s.practice ? '<p class="collection-practice-badge">📚 مراجعة أخطائك · تدريب بلا نقاط إضافية</p>' : ''}<div class="collection-top"><span>${esc(s.name)}</span><b id="collectionQuestionProgress">السؤال ${s.index + 1} / ${s.questions.length}</b><span>${Math.round((s.credit * 100) / s.questions.length)} / 100 ${s.practice ? 'تقييم التدريب' : 'نقطة'}</span></div><progress class="collection-progress" value="${s.index + (s.locked ? 1 : 0)}" max="${s.questions.length}" aria-label="تقدم الجولة"></progress>${body}${collectionFeedback(q, answer)}${s.locked ? `<div class="actions"><button class="primary" id="collectionNext" onclick="nextCollection(${token})">${s.index + 1 === s.questions.length ? 'شوف النتيجة' : 'السؤال التالي'} ←</button></div>` : ''}<p class="tiny collection-keyboard">${s.id === 'order' ? 'لوحة المفاتيح: Tab ثم Enter للتحريك والتأكيد. الأرقام تختار بطاقة والأسهم تحركها.' : 'الأرقام لاختيار الإجابة · Enter بعد ظهور الشرح للمتابعة'}</p></section>`,
    ),
  );
}
function answerCollection(choice, run = state?.run, index = state?.index) {
  if (
    !collectionCurrent(run, index) ||
    state.locked ||
    state.id === 'order' ||
    !Number.isInteger(choice)
  )
    return;
  const q = state.questions[index],
    maximum = state.id === 'flags' ? q.choices.length : 2;
  if (choice < 0 || choice >= maximum) return;
  const correct =
    state.id === 'flags' ? q.choices[choice].code === q.code : (choice === 0) === q.truth;
  state.answers.push({ choice, correct });
  state.locked = true;
  if (correct) {
    state.correct++;
    state.credit++;
  }
  renderCollection();
  $('collectionNext')?.focus({ preventScroll: true });
}
function moveCollectionOrder(index, delta, run = state?.run, phase = state?.index) {
  if (
    !collectionCurrent(run, phase, 'order') ||
    state.locked ||
    !Number.isInteger(index) ||
    ![-1, 1].includes(delta)
  )
    return;
  const q = state.questions[phase],
    other = index + delta;
  if (index < 0 || index >= q.arranged.length || other < 0 || other >= q.arranged.length) return;
  state.orderMoves.push([index, other]);
  [q.arranged[index], q.arranged[other]] = [q.arranged[other], q.arranged[index]];
  state.selected = other;
  state.orderStatus = `انتقلت بطاقة «${q.arranged[other]}» إلى المكان ${other + 1}.`;
  renderCollection();
  const control = document.querySelector(
    `[data-order-move="${other}-${delta < 0 && other > 0 ? 'up' : other < q.arranged.length - 1 ? 'down' : 'up'}"]`,
  );
  control?.focus({ preventScroll: true });
}
function collectionUndoOrder(run = state?.run, phase = state?.index) {
  if (!collectionCurrent(run, phase, 'order') || state.locked || !state.orderMoves.length) return;
  const q = state.questions[phase],
    [index, other] = state.orderMoves.pop();
  [q.arranged[index], q.arranged[other]] = [q.arranged[other], q.arranged[index]];
  state.selected = index;
  state.orderStatus = `تراجعنا عن آخر حركة؛ بطاقة «${q.arranged[index]}» في المكان ${index + 1}.`;
  renderCollection();
  document
    .querySelector(`[data-order-move="${index}-${index ? 'up' : 'down'}"]`)
    ?.focus({ preventScroll: true });
}
function collectionSelectOrder(index) {
  if (
    !collectionCurrent(state?.run, state?.index, 'order') ||
    state.locked ||
    !Number.isInteger(index) ||
    !state.questions[state.index].arranged[index]
  )
    return;
  state.selected = index;
  document.querySelectorAll('[data-order-index]').forEach((row) => {
    const selected = Number(row.dataset.orderIndex) === index;
    row.classList.toggle('is-selected', selected);
    if (selected) row.setAttribute('aria-current', 'true');
    else row.removeAttribute('aria-current');
  });
}
function submitCollectionOrder(run = state?.run, index = state?.index) {
  if (!collectionCurrent(run, index, 'order') || state.locked) return;
  const q = state.questions[index],
    matches = q.arranged.filter((item, i) => item === q.solution[i]).length,
    correct = matches === q.solution.length;
  state.answers.push({ correct, matches, arranged: [...q.arranged] });
  state.credit += matches / q.solution.length;
  if (correct) state.correct++;
  state.locked = true;
  renderCollection();
  $('collectionNext')?.focus({ preventScroll: true });
}
function nextCollection(run = state?.run, index = state?.index) {
  if (!collectionCurrent(run, index) || !state.locked) return;
  if (index + 1 === state.questions.length) return finishCollection(run);
  state.index++;
  state.locked = false;
  state.selected = 0;
  state.orderMoves = [];
  state.orderStatus = '';
  renderCollection();
  collectionFocusQuestion();
}
function finishCollection(run = state?.run) {
  if (
    !collectionCurrent(run, state?.index) ||
    !state.locked ||
    state.answers.length !== state.questions.length
  )
    return;
  const s = state,
    points = Math.max(0, Math.min(100, Math.round((s.credit * 100) / s.questions.length)));
  s.done = true;
  clearTimers();
  if (s.practice) {
    setHTML(
      wrap(
        s.id,
        `<section class="panel success center"><div class="resulticon">${points === 100 ? '🌟' : '📚'}</div><h2>${points === 100 ? 'أتقنت كل أسئلة المراجعة!' : 'انتهت مراجعة الأخطاء'}</h2><div class="resultnum">${points} / 100</div><p class="muted">${s.correct} من ${s.questions.length} إجابات كاملة. هذا تدريب؛ نقاط جولتك الأصلية محفوظة كما هي.</p><div class="actions"></div></section>`,
      ),
    );
    tone(points === 100);
  } else {
    if (points > 0) addScore(s.name, points);
    result(
      s.id,
      points === 100 ? 'جولة كاملة! 🏆' : 'اكتملت جولتك ✦',
      `${esc(s.name)} · ${s.correct} من ${s.questions.length} ${s.id === 'order' ? 'ترتيبات كاملة، مع نقاط البطاقات الصحيحة.' : 'إجابات صحيحة.'}`,
      points,
      `${points} / 100`,
    );
  }
  const missed = s.answers.filter((answer) => !answer.correct).length;
  if (!dailyRun && !tourney?.active && !activeRoute && !s.soloSessionToken) {
    $('app').querySelector('.success .actions').innerHTML =
      `<button class="primary" onclick="collectionReplay(${s.run})">🔁 جولة جديدة بنفس الخيارات</button>${missed ? `<button onclick="collectionPractice(${s.run})">📚 تدرب على ${missed} ${s.id === 'order' ? 'ترتيبات' : 'أسئلة'} تحتاج مراجعة</button>` : ''}<button onclick="setup('${s.id}')">غيّر الخيارات</button><button onclick="home()">العالم</button>`;
  }
  $('app')
    .querySelector('.success')
    ?.insertAdjacentHTML(
      'beforeend',
      `${collectionBreakdownHTML(s)}<details class="round-review collection-review"><summary>راجع إجابات ${s.practice ? 'التدريب' : 'الجولة'}</summary><ol>${s.questions.map((q, i) => `<li><b>${s.answers[i].correct ? '✓' : '↺'} ${esc(s.id === 'flags' ? q.name : s.id === 'order' ? q.prompt : q.text)}</b>${collectionAnswerReview(s, q, s.answers[i])}<p>${esc(s.id === 'flags' ? 'العلم الصحيح:' : q.reason)}</p>${s.id === 'flags' ? `<span class="collection-review-flag">${collectionFlagSVG(q.code, `علم ${q.name}`)}</span>` : s.id === 'order' ? `<ol class="collection-review-order">${q.solution.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>` : `<span>الجواب: ${q.truth ? 'صح' : 'خطأ'}</span>`}</li>`).join('')}</ol></details>`,
    );
  const heading = $('app').querySelector('.success h2');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: true });
}
function collectionBreakdownHTML(s) {
  const categories =
      s.id === 'flags'
        ? collectionRegions
        : s.id === 'truefalse'
          ? collectionFactCategories
          : collectionOrderCategories,
    groups = new Map();
  s.questions.forEach((q, i) => {
    const key = s.id === 'flags' ? q.region : q.cat,
      answer = s.answers[i],
      group = groups.get(key) || {
        title: categories.find(([id]) => id === key)?.[1] || key,
        total: 0,
        correct: 0,
        credit: 0,
      };
    group.total++;
    if (answer.correct) group.correct++;
    group.credit += s.id === 'order' ? answer.matches / q.solution.length : Number(answer.correct);
    groups.set(key, group);
  });
  const rows = [...groups.values()],
    weakest = [...rows].sort((a, b) => a.credit / a.total - b.credit / b.total)[0];
  return `<section class="collection-breakdown" aria-labelledby="collectionBreakdownTitle"><h3 id="collectionBreakdownTitle">أداؤك حسب ${s.id === 'flags' ? 'القارة' : 'المجموعة'}</h3><div class="collection-breakdown-grid">${rows
    .map((group) => {
      const percentage = Math.round((group.credit * 100) / group.total);
      return `<div class="collection-breakdown-item"><b>${esc(group.title)}</b><span dir="ltr">${percentage}%</span><progress value="${percentage}" max="100" aria-label="تقييم ${esc(group.title)}: ${percentage} بالمئة"></progress><small>${group.correct} من ${group.total} ${s.id === 'order' ? 'ترتيبات كاملة · النسبة تشمل البطاقات الصحيحة' : 'إجابات صحيحة'}</small></div>`;
    })
    .join(
      '',
    )}</div><p class="note">${weakest.correct === weakest.total ? 'أتقنت كل مجموعات هذه الجولة. جرّب مجموعة جديدة في جولتك القادمة.' : `ابدأ المراجعة بمجموعة «${esc(weakest.title)}»؛ ${weakest.total - weakest.correct} من ${weakest.total} ${s.id === 'order' ? 'ترتيبات تحتاج مراجعة.' : 'إجابات تحتاج مراجعة.'}`}</p></section>`;
}
function collectionAnswerReview(s, q, answer) {
  if (s.id === 'order')
    return `<p class="collection-your-answer">${answer.matches} / ${q.solution.length} بطاقات في مكانها. ترتيبك: ${answer.arranged.map(esc).join('، ')}</p>`;
  return `<p class="collection-your-answer">إجابتك: ${esc(s.id === 'flags' ? q.choices[answer.choice].name : answer.choice === 0 ? 'صح' : 'خطأ')}</p>`;
}
function collectionFinished(run) {
  return (
    collectionGameIds.has(state?.id) &&
    screen === state.id &&
    state.done &&
    run === state.run &&
    !coreBlocked() &&
    !dailyRun &&
    !tourney?.active &&
    !activeRoute &&
    !state.soloSessionToken
  );
}
function collectionReplay(run) {
  if (!collectionFinished(run)) return;
  const previous = state;
  setup(previous.id);
  for (const [id, value] of Object.entries(previous.settings || {})) {
    const input = $(id);
    if (
      input?.tagName === 'SELECT' &&
      [...input.options].some((option) => option.value === value && !option.disabled)
    )
      input.value = value;
  }
  const playerIndex = store.players.indexOf(previous.name);
  if (playerIndex >= 0 && $('player')) $('player').value = String(playerIndex);
  startCollection(previous.id);
}
function collectionPractice(run) {
  if (!collectionFinished(run)) return;
  const previous = state,
    missed = previous.questions.filter((_, index) => !previous.answers[index].correct);
  if (!missed.length) return;
  clearTimers();
  state = {
    id: previous.id,
    name: previous.name,
    settings: { ...previous.settings },
    flagMode: previous.flagMode,
    choicesCount: previous.choicesCount,
    practice: true,
    run: ++collectionRunSerial,
    index: 0,
    done: false,
    locked: false,
    correct: 0,
    credit: 0,
    answers: [],
    selected: 0,
    orderMoves: [],
    orderStatus: '',
    started: Date.now(),
    questions: collectionShuffle(missed).map((question) => {
      const copy = { ...question };
      if (copy.choices) copy.choices = collectionShuffle(copy.choices);
      if (copy.solution) {
        copy.solution = [...copy.solution];
        copy.arranged = collectionShuffle(copy.solution);
        if (copy.arranged.every((item, index) => item === copy.solution[index]))
          copy.arranged.push(copy.arranged.shift());
      }
      return copy;
    }),
  };
  renderCollection();
  goTop();
  collectionFocusQuestion();
}
document.addEventListener('keydown', (event) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing ||
    event.repeat ||
    !collectionGameIds.has(screen) ||
    !state ||
    state.done ||
    coreBlocked() ||
    advancedEditableTarget(event.target)
  )
    return;
  const key = latin(event.key);
  if (state.locked && key === 'Enter' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    nextCollection();
  } else if (!state.locked && state.id !== 'order' && /^[1-6]$/.test(key)) {
    event.preventDefault();
    answerCollection(Number(key) - 1);
  } else if (!state.locked && state.id === 'order') {
    if (/^[1-8]$/.test(key) && Number(key) <= state.questions[state.index].arranged.length) {
      event.preventDefault();
      collectionSelectOrder(Number(key) - 1);
      document
        .querySelector(`[data-order-move="${state.selected}-${state.selected ? 'up' : 'down'}"]`)
        ?.focus();
    } else if (['ArrowUp', 'ArrowDown'].includes(key)) {
      event.preventDefault();
      const row = event.target.closest?.('[data-order-index]');
      if (row) collectionSelectOrder(Number(row.dataset.orderIndex));
      moveCollectionOrder(state.selected, key === 'ArrowUp' ? -1 : 1);
    }
  }
});
document.addEventListener('focusin', (event) => {
  if (screen !== 'order' || state?.id !== 'order') return;
  const row = event.target.closest?.('[data-order-index]');
  if (row) collectionSelectOrder(Number(row.dataset.orderIndex));
});

const collectionRegions = [
  ['all', 'عام · دول العالم المشهورة'],
  ['gulf', 'دول الخليج الست'],
  ['europe', 'أوروبا'],
  ['asia', 'آسيا'],
  ['africa', 'أفريقيا'],
  ['northamerica', 'أمريكا الشمالية'],
  ['southamerica', 'أمريكا الجنوبية'],
  ['oceania', 'أوقيانوسيا'],
];
const collectionCountries = [
  ['FR', 'فرنسا', 'europe'],
  ['DE', 'ألمانيا', 'europe'],
  ['IT', 'إيطاليا', 'europe'],
  ['GB', 'بريطانيا', 'europe'],
  ['ES', 'إسبانيا', 'europe'],
  ['PT', 'البرتغال', 'europe'],
  ['NL', 'هولندا', 'europe'],
  ['CH', 'سويسرا', 'europe'],
  ['GR', 'اليونان', 'europe'],
  ['SE', 'السويد', 'europe'],
  ['KW', 'الكويت', 'asia', true],
  ['SA', 'السعودية', 'asia', true],
  ['AE', 'الإمارات', 'asia', true],
  ['QA', 'قطر', 'asia', true],
  ['BH', 'البحرين', 'asia', true],
  ['OM', 'عُمان', 'asia', true],
  ['JP', 'اليابان', 'asia'],
  ['CN', 'الصين', 'asia'],
  ['IN', 'الهند', 'asia'],
  ['KR', 'كوريا الجنوبية', 'asia'],
  ['EG', 'مصر', 'africa'],
  ['MA', 'المغرب', 'africa'],
  ['DZ', 'الجزائر', 'africa'],
  ['TN', 'تونس', 'africa'],
  ['ZA', 'جنوب أفريقيا', 'africa'],
  ['NG', 'نيجيريا', 'africa'],
  ['US', 'أمريكا', 'northamerica'],
  ['CA', 'كندا', 'northamerica'],
  ['MX', 'المكسيك', 'northamerica'],
  ['BR', 'البرازيل', 'southamerica'],
  ['AR', 'الأرجنتين', 'southamerica'],
  ['CL', 'تشيلي', 'southamerica'],
  ['CO', 'كولومبيا', 'southamerica'],
  ['AU', 'أستراليا', 'oceania'],
  ['NZ', 'نيوزيلندا', 'oceania'],
].map(([code, name, region, gulf = false]) => ({ code, name, region, gulf }));
function collectionStar(cx, cy, radius, fill = '#fff', rotate = -90, tips = 5) {
  const points = Array.from({ length: tips * 2 }, (_, i) => {
    const angle = ((rotate + (i * 180) / tips) * Math.PI) / 180,
      r = i % 2 ? radius * (tips === 7 ? 0.44 : 0.382) : radius;
    return `${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`;
  }).join(' ');
  return `<polygon points="${points}" fill="${fill}"/>`;
}
function collectionFlagSVG(code, label) {
  const rect = (x, y, width, height, fill) =>
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`,
    bands = (colors, vertical = false) =>
      colors
        .map((c, i) =>
          rect(
            vertical ? (i * 300) / colors.length : 0,
            vertical ? 0 : (i * 200) / colors.length,
            vertical ? 300 / colors.length : 300,
            vertical ? 200 : 200 / colors.length,
            c,
          ),
        )
        .join(''),
    red = '#d71920',
    green = '#00843d',
    blue = '#003399',
    white = '#fff',
    black = '#101010',
    union = `${rect(0, 0, 300, 200, '#012169')}<path d="M0 0L300 200M300 0L0 200" stroke="#fff" stroke-width="42"/><path d="M0 0L300 200M300 0L0 200" stroke="#c8102e" stroke-width="16"/><path d="M150 0V200M0 100H300" stroke="#fff" stroke-width="68"/><path d="M150 0V200M0 100H300" stroke="#c8102e" stroke-width="40"/>`,
    crescent = (cx, cy, bg, r = 45) =>
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${red}"/><circle cx="${cx + r * 0.28}" cy="${cy - r * 0.13}" r="${r * 0.8}" fill="${bg}"/>`;
  let body = '';
  if (['FR', 'IT', 'NG', 'MX'].includes(code))
    body = bands(
      {
        FR: [blue, white, red],
        IT: [green, white, red],
        NG: [green, white, green],
        MX: [green, white, red],
      }[code],
      true,
    );
  if (code === 'MX')
    body +=
      '<path d="M140 105l12-23 14 17-13 6 8 16-20-7z" fill="#775621"/><path d="M132 111q18 28 37-2" fill="none" stroke="#387d34" stroke-width="5"/>';
  if (['DE', 'NL', 'EG', 'AR', 'CO', 'IN'].includes(code))
    body = bands(
      {
        DE: [black, '#d00000', '#ffce00'],
        NL: ['#ae1c28', white, '#21468b'],
        EG: [red, white, black],
        AR: ['#74acdf', white, '#74acdf'],
        CO: ['#fcd116', '#fcd116', '#003893', '#ce1126'],
        IN: ['#ff9933', white, '#138808'],
      }[code],
    );
  if (code === 'AR')
    body +=
      collectionStar(150, 100, 17, '#f6b40e') + '<circle cx="150" cy="100" r="10" fill="#f6b40e"/>';
  if (code === 'EG') body += '<path d="M150 84l-16 8 4 23 12-8 12 8 4-23z" fill="#c6a342"/>';
  if (code === 'IN') {
    body += '<circle cx="150" cy="100" r="22" fill="none" stroke="#000080" stroke-width="3"/>';
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      body += `<path d="M150 100L${150 + 22 * Math.cos(a)} ${100 + 22 * Math.sin(a)}" stroke="#000080" stroke-width="1"/>`;
    }
  }
  if (code === 'GB') body = union;
  if (code === 'ES')
    body =
      bands([red, '#ffc400', '#ffc400', red]) +
      '<path d="M77 85h22v32H77z" fill="#bc2633" stroke="#f1d264" stroke-width="4"/>';
  if (code === 'PT')
    body =
      rect(0, 0, 300, 200, '#ff0000') +
      rect(0, 0, 120, 200, '#006600') +
      '<circle cx="120" cy="100" r="36" fill="none" stroke="#ffda00" stroke-width="8"/><path d="M105 77h30v33q-15 25-30 0z" fill="#fff" stroke="#d60000" stroke-width="7"/>';
  if (code === 'CH')
    body =
      rect(0, 0, 200, 200, '#d52b1e') + rect(83, 42, 34, 116, white) + rect(42, 83, 116, 34, white);
  if (code === 'SE')
    body =
      rect(0, 0, 300, 200, '#006aa7') +
      rect(88, 0, 38, 200, '#fecc00') +
      rect(0, 82, 300, 38, '#fecc00');
  if (code === 'GR')
    body =
      bands(Array.from({ length: 9 }, (_, i) => (i % 2 ? white : '#0d5eaf'))) +
      rect(0, 0, 112, 112, '#0d5eaf') +
      rect(44, 0, 23, 112, white) +
      rect(0, 44, 112, 23, white);
  if (code === 'KW')
    body = bands([green, white, red]) + '<polygon points="0,0 78,67 78,133 0,200" fill="#101010"/>';
  if (code === 'AE') body = bands([green, white, black]) + rect(0, 0, 75, 200, red);
  if (code === 'SA')
    body =
      rect(0, 0, 300, 200, '#006c35') +
      '<text x="150" y="86" text-anchor="middle" direction="rtl" fill="#fff" font-size="29" font-family="serif">لا إله إلا الله</text><text x="150" y="118" text-anchor="middle" direction="rtl" fill="#fff" font-size="27" font-family="serif">محمد رسول الله</text><path d="M79 145H218q8 0 8-9M82 145l-7-4" fill="none" stroke="#fff" stroke-width="6"/>';
  if (code === 'QA' || code === 'BH') {
    const n = code === 'QA' ? 9 : 5;
    body = rect(0, 0, 300, 200, code === 'QA' ? '#8a1538' : '#ce1126');
    let points = '0,0 80,0';
    for (let i = 0; i < n; i++) points += ` 110,${((i + 0.5) * 200) / n} 80,${((i + 1) * 200) / n}`;
    body += `<polygon points="${points} 0,200" fill="#fff"/>`;
  }
  if (code === 'OM')
    body =
      bands([white, red, green]) +
      rect(0, 0, 80, 200, red) +
      '<path d="M22 30l36 34M58 30L22 64M25 47h30M40 20v30" stroke="#fff" stroke-width="5"/>';
  if (code === 'JP')
    body = rect(0, 0, 300, 200, white) + '<circle cx="150" cy="100" r="58" fill="#bc002d"/>';
  if (code === 'CN') {
    body = rect(0, 0, 300, 200, '#de2910') + collectionStar(49, 51, 30, '#ffde00');
    [
      [96, 20],
      [119, 45],
      [119, 78],
      [96, 101],
    ].forEach(([x, y]) => (body += collectionStar(x, y, 10, '#ffde00')));
  }
  if (code === 'KR')
    body =
      rect(0, 0, 300, 200, white) +
      '<path d="M104 100a46 46 0 0 1 92 0a23 23 0 0 1-46 0a23 23 0 0 0-46 0" fill="#cd2e3a"/><path d="M104 100a23 23 0 0 1 46 0a23 23 0 0 0 46 0a46 46 0 0 1-92 0" fill="#0047a0"/><g stroke="#111" stroke-width="7"><path d="M53 47l22-22m-14 30 22-22m-14 30 22-22M53 153l22 22m-14-30 8 8m6 6 8 8m-14-30 22 22M209 41l8 8m6 6 8 8m-14-30 22 22m-14-30 8 8m6 6 8 8M209 159l8-8m6-6 8-8m-14 30 8-8m6-6 8-8m-14 30 8-8m6-6 8-8"/></g>';
  if (code === 'MA')
    body =
      rect(0, 0, 300, 200, '#c1272d') +
      '<path d="M150 52L178 140 104 86 196 86 122 140Z" fill="none" stroke="#006233" stroke-width="8"/>';
  if (code === 'DZ')
    body =
      bands([green, white], true) +
      crescent(151, 100, white, 47) +
      collectionStar(169, 100, 23, red);
  if (code === 'TN')
    body =
      rect(0, 0, 300, 200, red) +
      '<circle cx="150" cy="100" r="58" fill="#fff"/>' +
      crescent(148, 100, white, 40) +
      collectionStar(166, 100, 22, red);
  if (code === 'ZA')
    body =
      bands([red, white, blue]) +
      '<path d="M0 0L140 82H300v36H140L0 200" fill="#007a4d" stroke="#fff" stroke-width="19"/><path d="M0 15L114 100 0 185" fill="#101010" stroke="#ffb612" stroke-width="14"/>';
  if (code === 'US') {
    body =
      bands(Array.from({ length: 13 }, (_, i) => (i % 2 ? white : '#b22234'))) +
      rect(0, 0, 122, 108, '#3c3b6e');
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < (r % 2 ? 5 : 6); c++)
        body += collectionStar(10 + c * 20 + (r % 2 ? 10 : 0), 8 + r * 11.5, 5.2);
  }
  if (code === 'CA')
    body =
      bands([red, white, white, red], true) +
      '<path d="M150 42l10 26 15-8-5 28 24-8-8 17 14 11-38 23 4 17-14-3v21h-6v-21l-14 3 4-17-38-23 14-11-8-17 24 8-5-28 15 8z" fill="#d71920"/>';
  if (code === 'BR')
    body =
      rect(0, 0, 300, 200, '#009c3b') +
      '<polygon points="150,24 275,100 150,176 25,100" fill="#ffdf00"/><circle cx="150" cy="100" r="48" fill="#002776"/><path d="M105 86q45-3 87 33" fill="none" stroke="#fff" stroke-width="10"/>' +
      collectionStar(150, 125, 4) +
      collectionStar(125, 108, 3) +
      collectionStar(173, 139, 3);
  if (code === 'CL')
    body = bands([white, red]) + rect(0, 0, 100, 100, '#0039a6') + collectionStar(50, 50, 30);
  if (code === 'AU' || code === 'NZ') {
    body = rect(0, 0, 300, 200, '#012169') + `<g transform="scale(.5)">${union}</g>`;
    if (code === 'AU') {
      body += collectionStar(75, 150, 28, '#fff', -90, 7);
      [
        [225, 45, 14],
        [258, 97, 14],
        [218, 165, 14],
        [186, 106, 14],
        [241, 129, 8],
      ].forEach(([x, y, r]) => (body += collectionStar(x, y, r, '#fff', -90, r === 8 ? 5 : 7)));
    } else {
      [
        [222, 45],
        [258, 91],
        [218, 164],
        [184, 98],
      ].forEach(([x, y]) => {
        body += collectionStar(x, y, 17);
        body += collectionStar(x, y, 12, '#cc142b');
      });
    }
  }
  return `<svg class="collection-flag${code === 'CH' ? ' flag-square' : ''}" viewBox="0 0 ${code === 'CH' ? 200 : 300} 200" role="img" aria-label="${esc(label)}">${body}</svg>`;
}

const collectionFactCategories = [
  ['general', 'معلومات عامة'],
  ['science', 'العلوم'],
  ['geography', 'الجغرافيا'],
  ['animals', 'الحيوانات'],
];
const collectionFacts = [
  [
    'general',
    'easy',
    'السنة الميلادية العادية تتكون من 365 يوماً.',
    true,
    'السنة العادية 365 يوماً، أما السنة الكبيسة فتتكون من 366 يوماً.',
  ],
  ['general', 'easy', 'الأسبوع يتكون من ثمانية أيام.', false, 'الأسبوع يتكون من سبعة أيام.'],
  [
    'general',
    'easy',
    'المثلث له ثلاثة أضلاع.',
    true,
    'تعريف المثلث: مضلع له ثلاثة أضلاع وثلاث زوايا.',
  ],
  [
    'general',
    'easy',
    'الكيلوغرام الواحد يساوي 100 غرام.',
    false,
    'الكيلوغرام الواحد يساوي 1000 غرام.',
  ],
  ['general', 'easy', 'في الساعة الواحدة 60 دقيقة.', true, 'الساعة 60 دقيقة، والدقيقة 60 ثانية.'],
  [
    'general',
    'easy',
    'فبراير دائماً يتكون من 30 يوماً.',
    false,
    'فبراير 28 يوماً في السنة العادية و29 يوماً في السنة الكبيسة.',
  ],
  [
    'general',
    'easy',
    'الحرف الأول في الأبجدية العربية هو الألف.',
    true,
    'تبدأ الأبجدية العربية بالألف ثم الباء ثم التاء.',
  ],
  [
    'general',
    'easy',
    'الألعاب الأولمبية الصيفية تُقام كل سنة في جدولها المعتاد.',
    false,
    'تُقام الألعاب الأولمبية الصيفية عادة كل أربع سنوات.',
  ],
  [
    'general',
    'normal',
    'العدد 2 هو العدد الأولي الزوجي الوحيد.',
    true,
    'كل عدد زوجي أكبر من 2 يقبل القسمة على 2، لذلك لا يكون أولياً.',
  ],
  [
    'general',
    'normal',
    'مجموع زوايا المثلث المستوي 360 درجة.',
    false,
    'مجموع زوايا المثلث في الهندسة المستوية يساوي 180 درجة.',
  ],
  [
    'general',
    'normal',
    'طريقة برايل تتيح القراءة بواسطة نقاط بارزة.',
    true,
    'يتعرف القارئ باللمس إلى مجموعات النقاط البارزة التي تمثل الحروف والرموز.',
  ],
  [
    'general',
    'normal',
    'الصفر عدد موجب.',
    false,
    'الصفر ليس موجباً ولا سالباً، وهو الحد الفاصل بين الأعداد الموجبة والسالبة.',
  ],
  [
    'general',
    'normal',
    'رقعة الشطرنج المعتادة فيها 64 مربعاً.',
    true,
    'رقعة الشطرنج تتكون من 8 صفوف و8 أعمدة؛ 8 × 8 = 64 مربعاً.',
  ],
  [
    'general',
    'normal',
    'المتر الواحد يساوي 10 سنتيمترات.',
    false,
    'المتر الواحد يساوي 100 سنتيمتر.',
  ],
  [
    'general',
    'normal',
    'اللغة البرتغالية هي اللغة الرسمية للبرازيل.',
    true,
    'البرتغالية هي اللغة الرسمية للبرازيل، بخلاف معظم دول أمريكا الجنوبية الناطقة بالإسبانية.',
  ],
  [
    'general',
    'normal',
    'العدد 1 عدد أولي.',
    false,
    'العدد الأولي له قاسمان موجبان مختلفان فقط؛ العدد 1 له قاسم موجب واحد.',
  ],
  ['science', 'easy', 'الشمس نجم.', true, 'الشمس نجم ينتج الطاقة من الاندماج النووي في باطنه.'],
  [
    'science',
    'easy',
    'الأرض هي الكوكب الأقرب إلى الشمس.',
    false,
    'عطارد هو الأقرب إلى الشمس، وتأتي الأرض في المرتبة الثالثة.',
  ],
  [
    'science',
    'easy',
    'الماء قد يوجد في حالات صلبة وسائلة وغازية.',
    true,
    'الجليد حالة صلبة، والماء سائل، وبخار الماء حالة غازية.',
  ],
  [
    'science',
    'easy',
    'النباتات تحصل على كل غذائها من التربة فقط.',
    false,
    'تصنع النباتات الخضراء السكريات بالبناء الضوئي، وتستمد الماء والأملاح من التربة.',
  ],
  ['science', 'easy', 'القمر يدور حول الأرض.', true, 'القمر تابع طبيعي للأرض ويدور حولها.'],
  [
    'science',
    'easy',
    'عدد كواكب المجموعة الشمسية تسعة وفق التصنيف الحالي.',
    false,
    'عدد الكواكب المعترف بها ثمانية؛ صُنّف بلوتو كوكباً قزماً عام 2006.',
  ],
  [
    'science',
    'easy',
    'القلب يضخ الدم في الجسم.',
    true,
    'يعمل القلب كمضخة تدفع الدم عبر الأوعية الدموية.',
  ],
  [
    'science',
    'easy',
    'الإنسان يتنفس تحت الماء دون أي معدات.',
    false,
    'الرئتان تستخلصان الأكسجين من الهواء؛ يحتاج الإنسان معدات مناسبة للتنفس تحت الماء.',
  ],
  [
    'science',
    'normal',
    'الضوء ينتقل أسرع من الصوت في الهواء.',
    true,
    'سرعة الضوء أكبر كثيراً من سرعة الصوت، لذا نرى البرق قبل سماع الرعد البعيد.',
  ],
  [
    'science',
    'normal',
    'الصوت ينتقل عبر الفراغ التام.',
    false,
    'الصوت يحتاج وسطاً مادياً لينتقل، ولذلك لا ينتقل عبر الفراغ التام.',
  ],
  [
    'science',
    'normal',
    'رمز الأكسجين الكيميائي هو O.',
    true,
    'الرمز O يرمز لعنصر الأكسجين، بينما O₂ صيغة جزيء الأكسجين الشائع في الهواء.',
  ],
  [
    'science',
    'normal',
    'الزهرة أبرد من عطارد لأن الزهرة أبعد عن الشمس.',
    false,
    'الزهرة أعلى الكواكب حرارة سطحية في المتوسط بسبب غلافه الجوي وتأثير الاحتباس الحراري الشديد.',
  ],
  [
    'science',
    'normal',
    'الخلية هي وحدة البناء الأساسية للكائنات الحية.',
    true,
    'تتكون الكائنات الحية من خلية واحدة أو أكثر، والخلية وحدة البنية والوظيفة الأساسية.',
  ],
  [
    'science',
    'normal',
    'البروتون يحمل شحنة كهربائية سالبة.',
    false,
    'البروتون موجب الشحنة، والإلكترون سالب الشحنة.',
  ],
  [
    'science',
    'normal',
    'يغلي الماء النقي عند 100 درجة مئوية عند ضغط جوي قياسي.',
    true,
    'درجة الغليان 100 درجة مئوية عند الضغط الجوي القياسي؛ وتتغير بتغير الضغط.',
  ],
  [
    'science',
    'normal',
    'كل المعادن تنجذب بقوة إلى المغناطيس.',
    false,
    'الحديد وبعض المعادن تنجذب بقوة، لكن النحاس والألومنيوم مثلاً لا تنجذبان بهذه الطريقة.',
  ],
  ['geography', 'easy', 'باريس عاصمة فرنسا.', true, 'باريس هي عاصمة فرنسا وأكبر مدنها.'],
  ['geography', 'easy', 'روما عاصمة ألمانيا.', false, 'روما عاصمة إيطاليا، وبرلين عاصمة ألمانيا.'],
  [
    'geography',
    'easy',
    'الكويت من دول مجلس التعاون الخليجي.',
    true,
    'تضم دول المجلس الكويت والسعودية والإمارات وقطر والبحرين وعُمان.',
  ],
  [
    'geography',
    'easy',
    'المحيط الأطلسي هو أكبر محيطات الأرض.',
    false,
    'المحيط الهادئ هو أكبر المحيطات مساحة.',
  ],
  [
    'geography',
    'easy',
    'القاهرة عاصمة مصر.',
    true,
    'القاهرة هي العاصمة المصرية وتقع على نهر النيل.',
  ],
  ['geography', 'easy', 'اليابان تقع في أوروبا.', false, 'اليابان دولة جزرية في شرق آسيا.'],
  [
    'geography',
    'easy',
    'البرازيل تقع في أمريكا الجنوبية.',
    true,
    'البرازيل أكبر دول أمريكا الجنوبية مساحة.',
  ],
  [
    'geography',
    'easy',
    'أستراليا تقع في قارة أفريقيا.',
    false,
    'أستراليا تقع في منطقة أوقيانوسيا وليست في أفريقيا.',
  ],
  [
    'geography',
    'normal',
    'خط الاستواء يقسم الأرض إلى نصفين شمالي وجنوبي.',
    true,
    'خط الاستواء دائرة وهمية عند خط عرض صفر تفصل نصفي الكرة الشمالي والجنوبي.',
  ],
  [
    'geography',
    'normal',
    'البحر الميت محيط.',
    false,
    'البحر الميت بحيرة شديدة الملوحة، رغم وجود كلمة البحر في اسمه.',
  ],
  [
    'geography',
    'normal',
    'جبل إيفرست أعلى قمة فوق مستوى سطح البحر.',
    true,
    'إيفرست أعلى قمة على الأرض عند قياس الارتفاع فوق متوسط مستوى سطح البحر.',
  ],
  [
    'geography',
    'normal',
    'إسطنبول هي عاصمة تركيا الحالية.',
    false,
    'أنقرة هي عاصمة تركيا؛ إسطنبول أكبر مدنها من حيث عدد السكان.',
  ],
  [
    'geography',
    'normal',
    'الصحراء الكبرى تقع في شمال أفريقيا.',
    true,
    'تمتد الصحراء الكبرى عبر عدد من دول شمال أفريقيا.',
  ],
  [
    'geography',
    'normal',
    'نيوزيلندا جزء من أوروبا.',
    false,
    'نيوزيلندا دولة جزرية في جنوب غرب المحيط الهادئ ضمن أوقيانوسيا.',
  ],
  [
    'geography',
    'normal',
    'أوتاوا هي عاصمة كندا.',
    true,
    'أوتاوا عاصمة كندا؛ تورونتو أكبر مدنها سكاناً.',
  ],
  [
    'geography',
    'normal',
    'الرياض هي عاصمة الإمارات.',
    false,
    'الرياض عاصمة السعودية، وأبوظبي عاصمة الإمارات.',
  ],
  [
    'animals',
    'easy',
    'الحوت من الثدييات.',
    true,
    'الحيتان تتنفس بالرئتين وتلد وترضع صغارها، ولذلك هي ثدييات.',
  ],
  [
    'animals',
    'easy',
    'البطريق يستطيع الطيران في الهواء.',
    false,
    'البطاريق طيور لا تطير في الهواء، لكنها سبّاحة بارعة.',
  ],
  [
    'animals',
    'easy',
    'العنكبوت له ثماني أرجل.',
    true,
    'العناكب من العنكبيات ولها ثماني أرجل، بخلاف الحشرات ذات الأرجل الست.',
  ],
  ['animals', 'easy', 'الأخطبوط له ستة أذرع.', false, 'الأخطبوط له ثمانية أذرع.'],
  [
    'animals',
    'easy',
    'الفيل حيوان ثديي.',
    true,
    'الفيلة تلد صغارها وترضعها، وهي أكبر الحيوانات البرية الحية.',
  ],
  ['animals', 'easy', 'الخفاش من الطيور.', false, 'الخفاش ثديي يستطيع الطيران، وليس طائراً.'],
  [
    'animals',
    'easy',
    'النحلة حشرة.',
    true,
    'النحل من الحشرات، وله ست أرجل كغيره من الحشرات البالغة.',
  ],
  [
    'animals',
    'easy',
    'الدلفين يتنفس بواسطة الخياشيم.',
    false,
    'الدلفين ثديي يتنفس الهواء بالرئتين ويصعد إلى السطح.',
  ],
  [
    'animals',
    'normal',
    'للأخطبوط ثلاثة قلوب.',
    true,
    'للأخطبوط قلب يضخ الدم إلى الجسم وقلبان يضخان الدم نحو الخياشيم.',
  ],
  [
    'animals',
    'normal',
    'الحرباء تغير لونها فقط لتشبه الخلفية.',
    false,
    'تغير الحرباء لونها أيضاً للتواصل وتنظيم الحرارة والاستجابة للحالة الداخلية.',
  ],
  [
    'animals',
    'normal',
    'النعامة أكبر الطيور الحية حجماً.',
    true,
    'النعامة أكبر الطيور الحية من حيث الحجم والكتلة، لكنها لا تطير.',
  ],
  [
    'animals',
    'normal',
    'المرجان نبات بحري.',
    false,
    'المرجان يتكون من حيوانات صغيرة تسمى البوليبات، وقد تعيش معه طحالب تكافلية.',
  ],
  [
    'animals',
    'normal',
    'فرس البحر الذكر يحمل الأجنة في كيس خاص.',
    true,
    'تضع الأنثى البيوض في كيس حضانة عند الذكر، الذي يحمل الأجنة حتى خروج الصغار.',
  ],
  [
    'animals',
    'normal',
    'كل الثعابين سامة.',
    false,
    'توجد ثعابين سامة وأخرى غير سامة؛ لا يصح تعميم السمية على جميع الثعابين.',
  ],
  [
    'animals',
    'normal',
    'الضفدع من البرمائيات.',
    true,
    'الضفادع برمائيات، وتمر غالبية أنواعها بمرحلة شرغوف مائي قبل البلوغ.',
  ],
  [
    'animals',
    'normal',
    'الدببة القطبية تعيش طبيعياً في القطب الجنوبي.',
    false,
    'تعيش الدببة القطبية في منطقة القطب الشمالي، ولا توجد طبيعياً في القطب الجنوبي.',
  ],
].map(([cat, level, text, truth, reason], i) => ({
  id: `fact-${i}`,
  cat,
  level,
  text,
  truth,
  reason,
}));
const collectionOrderCategories = [
  ['numbers', 'أعداد وقياس'],
  ['space', 'الفضاء'],
  ['history', 'أحداث واختراعات'],
  ['daily', 'اليوم والتقويم'],
  ['nature', 'الطبيعة ومراحل الحياة'],
];
const collectionOrderDecks = [
  [
    'numbers',
    'رتّب الأعداد من الأصغر إلى الأكبر.',
    'رتّب الأعداد من الأكبر إلى الأصغر.',
    ['−10', '−3', '0', '4', '12'],
    'في خط الأعداد تأتي القيم السالبة أولاً، ثم الصفر، ثم القيم الموجبة.',
  ],
  [
    'numbers',
    'رتّب الكسور من الأصغر إلى الأكبر.',
    'رتّب الكسور من الأكبر إلى الأصغر.',
    ['1/4', '1/3', '1/2', '3/4'],
    'عند تحويلها إلى أجزاء من 12 نحصل على: 3/12، 4/12، 6/12، 9/12.',
  ],
  [
    'numbers',
    'رتّب وحدات الطول من الأصغر إلى الأكبر.',
    'رتّب وحدات الطول من الأكبر إلى الأصغر.',
    ['مليمتر', 'سنتيمتر', 'متر', 'كيلومتر'],
    'كل سنتيمتر 10 مليمترات، وكل متر 100 سنتيمتر، وكل كيلومتر 1000 متر.',
  ],
  [
    'numbers',
    'رتّب وحدات الكتلة من الأصغر إلى الأكبر.',
    'رتّب وحدات الكتلة من الأكبر إلى الأصغر.',
    ['مليغرام', 'غرام', 'كيلوغرام', 'طن متري'],
    'الغرام 1000 مليغرام، والكيلوغرام 1000 غرام، والطن المتري 1000 كيلوغرام.',
  ],
  [
    'numbers',
    'رتّب الأعداد المربعة من الأصغر إلى الأكبر.',
    'رتّب الأعداد المربعة من الأكبر إلى الأصغر.',
    ['1', '4', '9', '16', '25', '36'],
    'هذه مربعات الأعداد الصحيحة من 1 إلى 6: العدد مضروباً في نفسه.',
  ],
  [
    'numbers',
    'رتّب مدد الزمن من الأقصر إلى الأطول.',
    'رتّب مدد الزمن من الأطول إلى الأقصر.',
    ['ثانية', 'دقيقة', 'ساعة', 'يوم', 'أسبوع'],
    'الدقيقة 60 ثانية، والساعة 60 دقيقة، واليوم 24 ساعة، والأسبوع سبعة أيام.',
  ],
  [
    'space',
    'رتّب الكواكب الداخلية بدءاً من الأقرب إلى الشمس.',
    'رتّب الكواكب الداخلية بدءاً من الأبعد عن الشمس.',
    ['عطارد', 'الزهرة', 'الأرض', 'المريخ'],
    'ترتيب الكواكب الأربعة الداخلية بحسب متوسط بعدها عن الشمس: عطارد، الزهرة، الأرض، المريخ.',
  ],
  [
    'space',
    'رتّب الكواكب الخارجية بدءاً من الأقرب إلى الشمس.',
    'رتّب الكواكب الخارجية بدءاً من الأبعد عن الشمس.',
    ['المشتري', 'زحل', 'أورانوس', 'نبتون'],
    'بعد حزام الكويكبات تأتي الكواكب الخارجية: المشتري ثم زحل ثم أورانوس ثم نبتون.',
  ],
  [
    'space',
    'رتّب كواكب المجموعة الشمسية بدءاً من الأقرب إلى الشمس.',
    'رتّب كواكب المجموعة الشمسية بدءاً من الأبعد عن الشمس.',
    ['عطارد', 'الزهرة', 'الأرض', 'المريخ', 'المشتري', 'زحل', 'أورانوس', 'نبتون'],
    'يعتمد هذا الترتيب على متوسط المسافة من الشمس؛ بلوتو مصنّف كوكباً قزماً.',
  ],
  [
    'space',
    'رتّب هذه الكواكب الصخرية من الأصغر قطراً إلى الأكبر.',
    'رتّب هذه الكواكب الصخرية من الأكبر قطراً إلى الأصغر.',
    ['عطارد', 'المريخ', 'الزهرة', 'الأرض'],
    'الأقطار التقريبية بالكيلومتر: عطارد 4879، المريخ 6779، الزهرة 12104، الأرض 12742.',
  ],
  [
    'space',
    'رتّب هذه الأطوار القمرية بدءاً من المحاق خلال دورة واحدة.',
    'رتّب هذه الأطوار القمرية عكس التسلسل الذي يبدأ بالمحاق.',
    ['المحاق', 'التربيع الأول', 'البدر', 'التربيع الأخير'],
    'خلال دورة قمرية واحدة يمر القمر بالمحاق ثم التربيع الأول ثم البدر ثم التربيع الأخير.',
  ],
  [
    'history',
    'رتّب هذه الأحداث من الأقدم إلى الأحدث.',
    'رتّب هذه الأحداث من الأحدث إلى الأقدم.',
    [
      'طباعة غوتنبرغ في أوروبا',
      'أول رحلة للأخوين رايت',
      'أول إنسان في الفضاء',
      'أول هبوط بشري على القمر',
    ],
    'طباعة غوتنبرغ نحو 1450، رحلة رايت 1903، رحلة غاغارين 1961، وهبوط أبولو 11 عام 1969.',
  ],
  [
    'history',
    'رتّب بدايات هذه التقنيات من الأقدم إلى الأحدث.',
    'رتّب بدايات هذه التقنيات من الأحدث إلى الأقدم.',
    [
      'براءة اختراع هاتف بيل',
      'أول طيران آلي مأهول لرايت',
      'إطلاق سبوتنيك 1',
      'اقتراح شبكة الويب العالمية',
    ],
    'براءة بيل 1876، رحلة رايت 1903، سبوتنيك 1 عام 1957، واقتراح الويب عام 1989.',
  ],
  [
    'history',
    'رتّب هذه الأحداث الخليجية من الأقدم إلى الأحدث.',
    'رتّب هذه الأحداث الخليجية من الأحدث إلى الأقدم.',
    [
      'توحيد المملكة العربية السعودية',
      'استقلال الكويت',
      'قيام دولة الإمارات',
      'تأسيس مجلس التعاون الخليجي',
    ],
    'توحيد السعودية 1932، استقلال الكويت في يونيو 1961، قيام الإمارات في ديسمبر 1971، وتأسيس المجلس في مايو 1981.',
  ],
  [
    'history',
    'رتّب هذه المهمات الفضائية من الأقدم إلى الأحدث.',
    'رتّب هذه المهمات الفضائية من الأحدث إلى الأقدم.',
    [
      'إطلاق سبوتنيك 1',
      'رحلة يوري غاغارين',
      'هبوط أبولو 11 على القمر',
      'هبوط كيوريوسيتي على المريخ',
    ],
    'أُطلق سبوتنيك عام 1957، وطار غاغارين عام 1961، وهبط أبولو 11 عام 1969، وكيوريوسيتي عام 2012.',
  ],
  [
    'daily',
    'رتّب أيام الأسبوع بدءاً من الأحد.',
    'رتّب هذه الأيام عكس الأسبوع الذي يبدأ بالأحد.',
    ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    'الترتيب هنا محدد ببداية الأحد؛ اليوم التالي للسبت هو الأحد في الأسبوع التالي.',
  ],
  [
    'daily',
    'رتّب أول ستة أشهر ميلادية بدءاً من بداية السنة.',
    'رتّب أول ستة أشهر ميلادية من الأحدث في السنة إلى الأقدم.',
    ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    'هذه هي الأشهر الميلادية الستة الأولى، من يناير إلى يونيو.',
  ],
  [
    'daily',
    'رتّب النصف الثاني من الأشهر الميلادية من الأسبق إلى الألحق.',
    'رتّب النصف الثاني من الأشهر الميلادية من الألحق إلى الأسبق.',
    ['يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    'يوليو هو الشهر السابع، ويليه أغسطس وسبتمبر وأكتوبر ونوفمبر ثم ديسمبر.',
  ],
  [
    'daily',
    'رتّب هذه الأوقات من بداية اليوم إلى نهايته.',
    'رتّب هذه الأوقات من نهاية اليوم إلى بدايته.',
    ['الفجر', 'شروق الشمس', 'الظهر', 'غروب الشمس', 'منتصف الليل عند نهاية اليوم'],
    'في اليوم المعتاد يبدأ الفجر قبل الشروق، ثم الظهر، ثم الغروب، ثم منتصف الليل عند نهاية اليوم.',
  ],
  [
    'daily',
    'رتّب هذه الساعات من الأسبق إلى الألحق في يوم واحد بنظام 24 ساعة.',
    'رتّب هذه الساعات من الألحق إلى الأسبق في يوم واحد بنظام 24 ساعة.',
    ['06:00', '09:30', '12:00', '18:15', '23:00'],
    'في نظام 24 ساعة يقارن رقم الساعة أولاً، ثم الدقائق إذا تساوت الساعات.',
  ],
  [
    'nature',
    'رتّب مراحل الفراشة بدءاً من البيضة.',
    'رتّب مراحل الفراشة عكس التسلسل الذي يبدأ بالبيضة.',
    ['بيضة الفراشة', 'يرقة الفراشة', 'طور العذراء', 'الفراشة البالغة'],
    'تمر الفراشة بتحول كامل: بيضة ثم يرقة ثم عذراء ثم فراشة بالغة.',
  ],
  [
    'nature',
    'رتّب مراحل حياة الدجاج بدءاً من البيضة.',
    'رتّب مراحل حياة الدجاج عكس التسلسل الذي يبدأ بالبيضة.',
    ['بيضة الدجاج', 'فقس البيضة', 'كتكوت صغير', 'دجاجة بالغة'],
    'ينمو الجنين داخل البيضة، ثم يفقس الكتكوت وينمو حتى البلوغ.',
  ],
  [
    'nature',
    'رتّب نمو نبات مزهر بدءاً من البذرة.',
    'رتّب نمو نبات مزهر عكس التسلسل الذي يبدأ بالبذرة.',
    ['بذرة', 'خروج الجذير', 'بادرة بأوراق أولى', 'نبات مزهر'],
    'في الإنبات يبدأ الجذير بالخروج ثم تنمو البادرة، ويصل النبات لاحقاً إلى مرحلة الإزهار.',
  ],
  [
    'nature',
    'رتّب مراحل تحول الضفدع بدءاً من البيوض.',
    'رتّب مراحل تحول الضفدع عكس التسلسل الذي يبدأ بالبيوض.',
    ['بيوض الضفدع', 'شرغوف بلا أرجل', 'شرغوف بأرجل خلفية', 'ضفدع صغير بأربع أرجل'],
    'في دورة الحياة المعتادة يفقس الشرغوف المائي، ثم تظهر الأرجل الخلفية قبل اكتمال الأرجل الأربع.',
  ],
  [
    'nature',
    'رتّب هذه الطبقات من سطح الأرض نحو المركز.',
    'رتّب هذه الطبقات من مركز الأرض نحو السطح.',
    ['القشرة الأرضية', 'الوشاح', 'اللب الخارجي', 'اللب الداخلي'],
    'من الخارج إلى الداخل: القشرة، فالوشاح، فاللب الخارجي السائل، ثم اللب الداخلي الصلب.',
  ],
].map(([cat, prompt, reverse, items, reason], i) => ({
  id: `order-${i}`,
  cat,
  prompt,
  reverse,
  items,
  reason,
}));

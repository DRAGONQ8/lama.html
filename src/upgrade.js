// Lamma 6: a quicker lobby, remembered setup choices and a useful round history.
function normalizeGamePreferences(raw) {
  const clean = Object.create(null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const [id, values] of Object.entries(raw).slice(0, 60)) {
    if (!/^[a-z]{2,24}$/.test(id) || !values || typeof values !== 'object' || Array.isArray(values))
      continue;
    const fields = Object.create(null);
    for (const [key, value] of Object.entries(values).slice(0, 30)) {
      if (
        !/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key) ||
        ['player', 'second', 'memorysecond'].includes(key)
      )
        continue;
      if (typeof value === 'boolean' || (typeof value === 'string' && value.length <= 100))
        fields[key] = value;
    }
    clean[id] = fields;
  }
  return clean;
}
function normalizeGameHistory(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter(
      (v) =>
        v &&
        /^[a-z]{2,24}$/.test(v.id) &&
        typeof v.name === 'string' &&
        normalizePlayerName(v.name) &&
        v.name.length <= 24 &&
        safeCounter(v.points) &&
        Number.isSafeInteger(v.at) &&
        v.at > 0 &&
        v.at <= 8640000000000000,
    )
    .slice(0, 80)
    .map((v) => ({
      id: v.id,
      name: normalizePlayerName(v.name),
      points: v.points,
      at: v.at,
      ...(typeof v.rid === 'string' && /^[a-zA-Z0-9-]{8,100}$/.test(v.rid) ? { rid: v.rid } : {}),
    }));
}
let restoringSetup = false;
let startingDaily = false;
function setupControls() {
  return [...$('app').querySelectorAll('select[id], input[id]')].filter(
    (el) =>
      !['player', 'second', 'memorysecond'].includes(el.id) &&
      !/^partyTeam/.test(el.id) &&
      !['password', 'file', 'hidden'].includes(el.type),
  );
}
function rememberSetup() {
  if (
    restoringSetup ||
    !store.extra.rememberDefaults ||
    startingDaily ||
    screen !== 'setup' ||
    !state?.id ||
    dailyRun ||
    tourney?.active ||
    activeRoute ||
    state.soloSessionToken
  )
    return;
  const values = Object.create(null);
  for (const el of setupControls()) {
    if (el.disabled || el.value.length > 100) continue;
    values[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  }
  store.extra.preferences[state.id] = values;
  save();
}
function restoreSetup(id) {
  if (!store.extra.rememberDefaults) return;
  const values = store.extra.preferences[id];
  if (!values) return;
  restoringSetup = true;
  try {
    const applyField = (el) => {
      const value = values[el.id];
      if (el.disabled || value === undefined) return;
      if (el.type === 'checkbox') {
        if (typeof value === 'boolean') el.checked = value;
      } else if (typeof value === 'string') {
        if (
          el.tagName === 'SELECT' &&
          ![...el.options].some((option) => option.value === value && !option.disabled)
        )
          return;
        if (el.maxLength > 0 && value.length > el.maxLength) return;
        el.value = value;
      }
    };
    for (const el of setupControls()) applyField(el);
    // Recompute conditional fields after all their dependencies have been restored.
    for (const el of setupControls())
      if (el.hasAttribute('onchange')) el.dispatchEvent(new Event('change', { bubbles: true }));
    // Preset callbacks can rewrite editable bounds. The entered values take precedence.
    for (const el of setupControls().filter((field) => field.tagName === 'INPUT')) {
      applyField(el);
      if (el.hasAttribute('oninput')) el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } finally {
    restoringSetup = false;
  }
}
function resetGamePreferences(id) {
  if (
    screen !== 'setup' ||
    state?.id !== id ||
    dailyRun ||
    tourney?.active ||
    activeRoute ||
    state.soloSessionToken
  )
    return;
  delete store.extra.preferences[id];
  save();
  setup(id);
  toast('رجعنا لإعدادات البداية لهذه اللعبة.');
}
document.addEventListener('change', (event) => {
  if ($('app').contains(event.target)) rememberSetup();
});
document.addEventListener('input', (event) => {
  if ($('app').contains(event.target)) rememberSetup();
});
document.addEventListener(
  'click',
  (event) => {
    if ($('app').contains(event.target) && event.target.closest('button')) rememberSetup();
  },
  true,
);
document.addEventListener('submit', rememberSetup, true);
const upgradeSetup = setup;
setup = function (id, internal = false) {
  const previousState = state;
  const outcome = upgradeSetup(id, internal);
  if (
    state !== previousState &&
    screen === 'setup' &&
    state?.id === id &&
    !internal &&
    !startingDaily &&
    !dailyRun &&
    !tourney?.active &&
    !activeRoute
  ) {
    restoreSetup(id);
    $('app')
      .querySelector('.panel')
      ?.insertAdjacentHTML(
        'beforeend',
        `<div class="setup-memory"><span>⚙ ${store.extra.rememberDefaults ? 'اختياراتك في هذه اللعبة تُحفظ تلقائياً' : 'حفظ الاختيارات متوقف؛ نبدأ بالإعدادات الأصلية'}</span><button class="linkbtn" onclick="resetGamePreferences('${id}')">الإعدادات الأصلية ↺</button></div>`,
      );
  }
  if (screen === 'setup' && state?.id === id) appendSetupBlueprint(id);
  updateDock();
  return outcome;
};
const upgradeDaily = startDaily;
startDaily = function (id) {
  startingDaily = true;
  try {
    return upgradeDaily(id);
  } finally {
    startingDaily = false;
  }
};
const upgradeAddScore = addScore;
addScore = function (name, points) {
  const cleanName = normalizePlayerName(name),
    before = store.scores[cleanName]?.rounds || 0,
    id = state?.id;
  const outcome = upgradeAddScore(name, points);
  if (id && (store.scores[cleanName]?.rounds || 0) > before) {
    store.extra.history.unshift({
      rid: storageToken(),
      id,
      name: cleanName,
      points: Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(points))),
      at: Date.now(),
    });
    store.extra.history = normalizeGameHistory(store.extra.history);
    save();
  }
  return outcome;
};
function openGameHistory() {
  const rows = store.extra.history.filter((v) => games.some((g) => g[0] === v.id));
  const stamp = (at) =>
    new Intl.DateTimeFormat('ar-KW-u-nu-latn', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(at);
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">↺ سجل الجولات</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">آخر 80 نتيجة على هذا الجهاز. يظهر كل لاعب بنتيجته في ألعاب المجموعة.</p>${
      rows.length
        ? `<div class="history-rounds">${rows
            .map((v) => {
              const g = games.find((g) => g[0] === v.id);
              return `<div class="history-round"><span class="tileicon" style="--tile:${g[5]}">${g[1]}</span><div><b>${esc(g[2])}</b><small>${esc(v.name)} · ${stamp(v.at)}</small></div><strong>+${fmt(v.points)}</strong><button class="quiet smallbtn" onclick="closeModal();setup('${v.id}')" aria-label="العب ${esc(g[2])}">↗</button></div>`;
            })
            .join('')}</div>`
        : '<div class="emptylist"><span>✦</span><h3>أول جولة تنتظرك</h3><p>أكمل لعبة، وستجد نتيجتها هنا.</p></div>'
    }<div class="actions"><button class="primary" onclick="closeModal()">نكمل</button></div>`,
  );
}
const upgradeProfile = openProfile;
openProfile = function () {
  upgradeProfile();
  $('modal')
    .querySelector('.actions')
    ?.insertAdjacentHTML(
      'afterbegin',
      '<button onclick="openGameHistory()">↺ سجل الجولات</button>',
    );
};
function updateDock() {
  const buttons = document.querySelectorAll('.dock button');
  buttons.forEach((button, i) => {
    const active = screen === 'home' && i === 0;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.body.classList.toggle('playing', !!state && screen !== 'home' && screen !== 'setup');
}
function audienceChoicesHTML() {
  return `<section class="audience-choices" aria-label="اختَر عدد اللاعبين"><button class="audience-solo" onclick="openSoloHub()"><span>🧠</span><div><small>ابدأ بنفسك</small><h3>وقت لك، تحدٍّ يتطوّر معك</h3><p>${games.filter(isSolo).length} لعبة فردية · تدريب، استنتاج، واستكشاف</p></div><b>الصالة الفردية ←</b></button><button onclick="chooseDuoLobby()"><span>⚔</span><div><small>شخصان</small><h3>مواجهة لها أكثر من جولة</h3><p>خصم ذكي أو صديق · تناوب عادل على البداية</p></div><b>ألعاب الشخصين ←</b></button><button onclick="openLounge()"><span>🎭</span><div><small>من 3 إلى 12 لاعبًا</small><h3>كل دور يحرّك اللمّة</h3><p>مشاهد، أدوار سرية، أسئلة، وتصويت</p></div><b>جهّزوا الجلسة ←</b></button></section>`;
}
function chooseDuoLobby() {
  if (screen !== 'home') home();
  world = 'all';
  filter = 'duo';
  searchQuery = '';
  onlyFavorites = false;
  renderHome();
  scrollCatalog();
}
const gameControlTips = {
  finder:
    '↑ أكبر · ↓ أصغر · Enter صحيح. في الخزنة يكتب صاحب الرقم سره وحده؛ يُرفض الجواب المخالف له دون استهلاك محاولة.',
  solo: 'اكتب رقمًا واضغط Enter، أو استخدم لوحة اللعبة. مهمة الأقفال تحتاج حل ثلاثة أرقام؛ النقاط تُسجّل مرة واحدة عند انتهاء المهمة.',
  mind: 'أجب نعم أو لا أو مو متأكد. في التحقيق اختر السؤال من الدفتر وشاهد كيف يقسم الاحتمالات؛ تصحيح الأدلة والتراجع يبقيان متاحين.',
  who: 'اكتب الاسم أو اسمًا بديلًا. دفتر المشتبهين يسمح بالبحث والاستبعاد اليدوي بعد فتحه؛ استبعاد اسم لا يُعد تخمينًا.',
  memory:
    'لمس بطاقتين، أو الأسهم وEnter. في مواجهة الشخصين يحتفظ صاحب التطابق بالدور، ويتناوب اللاعبان بعد إخفاء الزوج المختلف.',
  reaction:
    'في الوضع المعتاد المس المنطقة أو المسافة. في اختيار الاتجاه انتظر السهم ثم اضغط جهته أو مفتاحها؛ الاتجاه الخاطئ يُحسب بداية خاطئة.',
  mime: 'الممثّل يرى الكلمة وحده والمراقب يسجّل النتيجة. الحكاية من ثلاث مراحل: شخصية ثم مشكلة ثم حل، مع مكافأة إكمال وحد للتجاوزات.',
  secret:
    'أخفِ الكلمة ثم مرّر الجهاز. في التحقيق بالتناوب يجب كتابة سؤال صاحب الدور؛ بعد آخر سؤال تتعاونون في التخمين الأخير.',
  ttt: 'لمس الخانة أو أرقام 1–9. في القاعدة المعكوسة تكوين خط يخسّرك؛ القاعدة والتكتيك يظهران قبل الحركة.',
  connect:
    'لمس العمود أو أرقام 1–7. القطع تسقط لآخر خانة؛ معاينة التهديدات تقرأ اللوحة الظاهرة، والبداية تتناوب في المواجهة.',
  code: 'لوحة الأرقام أو الكتابة المباشرة. الأخضر مكان صحيح والأصفر مكان مختلف؛ دفتر استبعاد الخانات يعدّل الفرضيات دون قراءة الشفرة.',
  simon:
    'الألوان أو أرقام 1–4. اتبع الترتيب أو اعكسه حسب الوضع؛ الاستماع وحده يحتاج تشغيل الصوت، والاستدعاء المؤجل يبدأ بعد الانتظار.',
  slide:
    'لمس قطعة أو الأسهم والسحب. تستطيع تثبيت الصفوف العليا المكتملة؛ تلميح 3×3 يحافظ عليها، وفي اللوحات الأكبر فك التثبيت أولًا.',
  sudoku:
    'الخانة ثم رقم، أو الأرقام والأسهم. N للملاحظات وCtrl+Z للتراجع؛ التفتيش يشرح التعارض أو الدليل من القيم الظاهرة.',
  word: 'اكتب الكلمة أو رتّب الحروف باللمس. مساعدة تثبيت البداية مدفوعة وتحافظ على مسودتك؛ وقت القراءة لا يستهلك السؤال التالي.',
  math: 'اختر أو اكتب الجواب. وضع العدد المفقود يسأل عن جزء من العملية؛ اقرأ الشرح ثم اضغط التالي.',
  color:
    'اقرأ بطاقة القاعدة أولًا؛ قد يُطلب لون الحروف أو معنى الكلمة أو استجابة تتحدد بالرمز الظاهر.',
  pattern:
    'راجع الفروق أو النسب بين الأعداد. دفتر الفروق مساعدة بخصم معلن؛ لا يغيّر إجابتك تلقائيًا.',
  spy: 'البداية عشوائية أو تتفقون عليها بينكم. اسأل أي لاعب واختر سؤالك؛ صوّتوا أولاً ثم اعرفوا الجاسوس وصحة اختياركم، وبعدها يخمّن الكلمة من قائمة قابلة للبحث. الكلمة تبقى مخفية حتى نهاية التخمين.',
  taboo:
    'الجهاز مع الشارح والمراقب. الصحيح والمخالفة والتجاوز يسجّلون النتيجة؛ اختَر حد التجاوزات قبل البداية واحجب البطاقة عن الآخرين.',
  snake:
    'الأسهم أو أزرار الاتجاه؛ Shift للتسارع. في التوصيل اجمع الفواكه بالترتيب ثم ارجع للمستودع؛ الحمولة تستهلك طاقة أكثر.',
  merge:
    'الأسهم أو السحب. في الورشة الصناديق تعرقل الحركة؛ الدمج المجاور يضعفها، والحركات محدودة. التراجع يعيد القرعة نفسها.',
  mines:
    'اكشف أو ضع علامة. في المسح ابحث عن آثار آمنة موزعة على المناطق؛ الكاشف يدل على الأثر دون كشف الألغام ويخصم حسب المعلن.',
  maze: 'الأسهم أو لمس جار. في التوصيل اجمع الطرود المرقمة بالترتيب ثم أعدها فعليًا إلى القاعدة؛ مراجعة المسار تعرض أحداث التسليم.',
  trivia:
    'حدد الثقة واختر الجواب. في التحقق من الأخبار افحص كل عبارة وراجع دليلها؛ وقت الشرح يبقى متوقفًا حتى التالي.',
  hangman:
    'جرّب حرفًا أو الحل كاملًا. مهام العبارات تحتوي أكثر من كلمة؛ الدليل الدلالي مساعدة محدودة بخصم معلن.',
  wordguess:
    'اكتب التخمين أو حرّر الخانات. مختبر الفرضيتين يقارن نتائج محتملة من القاموس والأدلة العامة؛ لا يقرأ الحل المخفي.',
  target:
    'المس الهدف أو وجّه المؤشر بالأسهم وأكد بـ Enter. في الاعتراض يتحرك الهدف باستمرار؛ صوّب إلى موضعه الحالي واحذر القنابل.',
  teamcup:
    'وزّع الفرق وحدّد التكتيك. في التتابع سلّم الجهاز لقائد ثانٍ منتصف الوقت؛ الاستراحة لا تستهلك وقت الفريق.',
  undercover:
    'بطاقة خاصة لكل لاعب، ثم تلميحات وأسئلة علنية. المحكمة تضيف اتهامًا ودفاعًا قبل التصويت السري.',
  improv:
    'اكتب وحدك ثم اكشف الأعمال المجهولة. الحكاية المتسلسلة تعرض لك السطر السابق فقط وتطلب كلمة وصل قبل ترتيب القصة.',
  nonogram:
    'ارسم بالسحب أو الأسهم وEnter؛ علامة الفراغ بالوضع الآخر. قاعدة المرآة تربط الخانات المناظرة، والتراجع يعيد ضربة الرسم كاملة.',
  lights:
    'كل ضغطة تغيّر الخانة وجيرانها. شبكة المفاتيح تتيح مفاتيح محددة فقط؛ جرّب الخطة قبل تنفيذها.',
  pipes:
    'اختَر أنبوبًا ثم دوّره، واختبر التسريب. الحيّان لهما مصدران بلونين؛ أوصل كل منطقة بمصدرها دون تسريب عبر الحدود.',
  flags:
    'اختر اسم الدولة أو علمها باللمس أو بالأرقام. اقرأ الإجابة ثم اضغط Enter للمتابعة؛ يحدد فلتر الخليج أو القارة الدول المطلوبة.',
  truefalse:
    'اقرأ العبارة واختر صح أو خطأ؛ 1 للصح و2 للخطأ. راجع تفسير كل إجابة، ثم اضغط Enter للمتابعة دون ضغط مؤقت.',
  order:
    'حرّك البطاقات بأزرار أعلى وأسفل ثم أكّد الترتيب. بلوحة المفاتيح اختر رقم البطاقة واستعمل الأسهم؛ اقرأ اتجاه الترتيب قبل التأكيد.',
};
function appendSetupBlueprint(id) {
  if ($('setupBlueprint')) return;
  $('app')
    .querySelector('.panel')
    ?.insertAdjacentHTML(
      'beforeend',
      `<details class="setup-blueprint" id="setupBlueprint"><summary>؟ التحكم، والخصوصية، وحفظ الجولة</summary><p>${esc(gameControlTips[id] || 'اتبع أزرار الجولة والتعليمات الظاهرة.')}</p><div class="chips"><span class="chip">${esc(modeLabel(id))}</span><span class="chip">${gameLength(id)}</span><span class="chip">النقاط محلية على جهازك</span></div><p class="tiny">${['code', 'slide', 'sudoku'].includes(id) ? 'يُحفظ آخر لغز فردي مستقل غير مكتمل للاستكمال؛ اليومية والبطولة لهما قواعد منفصلة.' : 'تُحفظ النتيجة بعد انتهاء الجولة؛ الانتقال للعبة أخرى يبدأ جولة جديدة.'} ${groupGameIds.has(id) ? 'احجب الشاشة عند فتح الكلمات والأدوار الخاصة.' : 'المساعدات وخصمها موضّحان داخل كل لعبة.'}</p></details>`,
    );
}
function openHelp() {
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">؟ مساعدة لَمّة</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">لَمّة 14 · ${games.length} لعبة عربية في ملف واحد.</p>${[
      [
        'هل تحتاج إنترنت أو حسابًا؟',
        'افتح ملف HTML في متصفح حديث. الألعاب والمحتوى تعمل دون إنترنت أو حساب؛ حفظ النتائج مرتبط بهذا المتصفح.',
      ],
      [
        'كيف نلعب معًا؟',
        'سجّل الأسماء من اللاعبين. الشخصان أو المجموعة يلعبون بالتناوب على جهاز واحد؛ الأدوار والتصويت السري يحتاجان تمرير الجهاز وحجب الشاشة.',
      ],
      [
        'كيف أنقل نقاطي لهاتف آخر؟',
        'من الإعدادات صدّر نسخة احتياطية JSON ثم استوردها على الجهاز الآخر. الاستيراد يستبدل تقدم الجهاز بعد عرض المراجعة.',
      ],
      [
        'هل أقدر أكمل جولة قديمة؟',
        'آخر لغز مستقل غير مكتمل من فك الشفرة أو رتّب الأرقام أو سودوكو يظهر في الرئيسية. المسارات تحفظ المحطات المكتملة. باقي الألعاب تبدأ من جديد.',
      ],
      [
        'كيف تُحسب النقاط؟',
        'القواعد والخصومات تختلف حسب اللعبة. النتيجة والسجل يعرضان النقاط المكتسبة؛ للمقارنة العادلة استخدم نفس الإعدادات أو بطولة اللمّة.',
      ],
      [
        'كيف أحافظ على بطاقتي السرية؟',
        'افتحها وحدك، ثم استخدم إخفاء وتمرير الجهاز. الاستراحة تخفي الأدوار الخاصة. لا تُحفظ الكلمات والأدوار الجماعية في النسخة الاحتياطية.',
      ],
      [
        'ما أفضل إعدادات للجوال؟',
        'ابدأ بمستوى مريح، افتح وضع التركيز ◎، واستخدم أزرار اللمس. الشاشة الكاملة اختيارية حسب دعم المتصفح.',
      ],
      [
        'أين تُحفظ بياناتي؟',
        'في التخزين المحلي للمتصفح؛ قد يمنعه الوضع الخاص. التبويبات المفتوحة لنفس العنوان تزامن التقدم محليًا. صدّر نسخة قبل نقل الملف أو تغيير عنوانه.',
      ],
    ]
      .map(
        ([question, answer]) =>
          `<details class="help-question"><summary>${question}</summary><p>${answer}</p></details>`,
      )
      .join(
        '',
      )}<div class="actions"><button onclick="openGuide()">دليل الألعاب</button><button onclick="exportProgress()">صدّر تقدّمك</button><button class="primary" onclick="closeModal()">نكمل اللعب</button></div>`,
  );
}
const upgradeSetHTML = setHTML;
setHTML = function (html) {
  upgradeSetHTML(html);
  updateDock();
};
const mediaMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
mediaMotion.addEventListener?.('change', applySettings);

const quickChoices = {
  quick: ['reaction', 'solo', 'color', 'target', 'math'],
  calm: ['nonogram', 'sudoku', 'pipes', 'lights', 'wordguess'],
  action: ['snake', 'merge', 'maze', 'target', 'mines'],
  party: [
    'teamcup',
    'undercover',
    'improv',
    'spy',
    'taboo',
    'mime',
    'secret',
    'ttt',
    'connect',
    'reaction',
  ],
};
Object.assign(gameGuides, {
  ttt: [
    'كوّن خطاً من 3 علامات. يمكنك التراجع عن دورك، أو طلب حركة مقترحة مقابل 10 نقاط.',
    'ابدأ بالوسط، وراقب فرص الفوز والصد. التلميح يشرح سبب الحركة المقترحة.',
  ],
  connect: [
    'وصّل 4 قطع أفقياً أو عمودياً أو قطرياً. القطعة تنزل إلى أسفل عمودها.',
    'راقب القطرين واصنع فرصتين للفوز. الحركة المقترحة تشرح الخطر وتخصم 10 نقاط.',
  ],
  code: [
    'اكتشف الشفرة من إشارات الرقم والمكان. الأخضر صحيح تماماً، والأصفر رقم صحيح في مكان مختلف.',
    'التحليل يعرض الاحتمالات التي توافق محاولاتك فقط، والأرقام الممكنة في كل خانة دون قراءة السر.',
  ],
  simon: [
    'كرر تسلسل الرموز والألوان. المستوى الخفيف يعطي فرصة ثانية مقابل خصم 10 نقاط.',
    'استخدم الأرقام 1–4. إعادة العرض تخصم 5 نقاط، والاستراحة توقف العرض لتبدأه من جديد.',
  ],
  slide: [
    'حرّك قطعة مجاورة للفراغ ورتّب الأرقام. يمكنك التراجع أو العودة إلى اللوحة الأولى.',
    'تلميحات 3×3 تبحث عن أقصر حل. اللوحات الأكبر تستخدم مساراً مضموناً، والمساعدة تخصم من النتيجة.',
  ],
  sudoku: [
    'املأ 1–9 دون تكرار في الصف أو العمود أو مربع 3×3، واستعمل الملاحظات لتسجيل الاحتمالات.',
    'التلميح يشرح الخانات التي يحددها المنطق أولاً؛ إن لم تكفِ الاستنتاجات يكشف خانة من الحل مع توضيح ذلك.',
  ],
  math: [
    'اختر ناتج العملية قبل انتهاء وقت اللعب. وقت قراءة شرح الإجابة لا يستهلك وقت الجولة.',
    'الدقة والسلسلة الصحيحة ترفعان نتيجتك. الأرقام 1–4 تختار إجابة، وEnter ينتقل بعد الشرح.',
  ],
  color: [
    'اختر لون الحروف نفسها. كلمة «أحمر» المكتوبة بالأزرق جوابها أزرق.',
    'تجاهل معنى الكلمة وركز على الحبر. المؤقت يتوقف أثناء مراجعة الإجابة.',
  ],
  pattern: [
    'استنتج قاعدة السلسلة واختر العدد الناقص، ثم اقرأ تفسير الحل قبل الانتقال.',
    'ابدأ بالفروق، ثم النسب والقواعد المتناوبة. وقت الشرح محفوظ من وقت الجولة.',
  ],
  secret: [
    'شخص واحد يعرف الكلمة، والباقون يسألون ويخمنون قبل نفاد الوقت أو الأسئلة.',
    'دوّن السؤال اختيارياً لتراجعوا الأدلة. يمكنك التراجع عن سؤال؛ فتح نافذة يخفي السر ويحفظ الكلمة المخصصة.',
  ],
});
let quickMood = 'quick';
function openQuickPicker(mood = 'quick') {
  quickMood = Object.hasOwn(quickChoices, mood) ? mood : 'quick';
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">✦ لعبة على جوّك</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">اختر جوّك، ونرتّب لك بداية مناسبة.</p><div class="mood-tabs" aria-label="نوع التحدي">${[
      ['quick', '⚡ جولة سريعة'],
      ['calm', '🧩 تفكير وهدوء'],
      ['action', '🕹 حركة وتركيز'],
      ['party', '👥 مع الربع'],
    ]
      .map(
        ([id, label]) =>
          `<button onclick="openQuickPicker('${id}')" aria-pressed="${quickMood === id}" class="${quickMood === id ? 'active' : ''}">${label}</button>`,
      )
      .join(
        '',
      )}</div>${pickerRecommendationsHTML()}<div class="hintpanel">${quickMood === 'party' ? `${store.players.length} لاعبين مسجّلين. الألعاب الجماعية بالتناوب على هذا الجهاز.` : 'تقدر تغيّر المستوى والوقت قبل البداية؛ نحتفظ باختياراتك للجولات القادمة.'}</div>${quickMood === 'party' ? '<div class="actions"><button onclick="openPeople()">عدّل اللاعبين</button></div>' : ''}`,
  );
}
function pickerRecommendationsHTML() {
  const ids = quickChoices[quickMood];
  const available = ids
    .map((id) => games.find((g) => g[0] === id))
    .filter((g) => quickMood !== 'party' || store.players.length >= gameMinimum(g[0]));
  available.sort((a, b) => (store.extra.played[a[0]] || 0) - (store.extra.played[b[0]] || 0));
  return `<div class="picker-games">${
    available
      .slice(0, 3)
      .map(
        (g) =>
          `<button onclick="closeModal();setup('${g[0]}')"><span class="tileicon" style="--tile:${g[5]}">${g[1]}</span><div><b>${esc(g[2])}</b><p>${esc(g[3])}</p><small>${gameLength(g[0])} · ${store.extra.played[g[0]] ? 'طوّر نتيجتك' : 'جرّبها للمرة الأولى'}</small></div><span>←</span></button>`,
      )
      .join('') || '<p class="note">أضف لاعباً آخر لبدء المنافسة.</p>'
  }</div>`;
}
function quickLaunchHTML() {
  const recent = store.extra.recent
    .map((v) => games.find((g) => g[0] === v.id))
    .filter(Boolean)
    .slice(0, 3);
  const picks = recent.length
    ? recent
    : ['memory', 'merge', 'lights'].map((id) => games.find((g) => g[0] === id));
  return `<section class="quick-launch" aria-label="ابدأ اللعب"><div class="quick-intro"><span class="world-label">${recent.length ? '↺ نكمل التحدّي' : '✦ البداية من هنا'}</span><h2>${recent.length ? 'ألعابك قريبة منك.' : 'اختَر أول تحدّي.'}</h2><button class="linkbtn" onclick="openQuickPicker()">اقترح لي لعبة ←</button></div>${picks.map((g) => `<button class="quick-game" style="--tile:${g[5]}" onclick="setup('${g[0]}')"><span class="tileicon" style="--tile:${g[5]}">${g[1]}</span><div><b>${esc(g[2])}</b><small>${gameLength(g[0])}</small></div><span>↗</span></button>`).join('')}</section>`;
}

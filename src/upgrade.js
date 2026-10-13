// Lamma 6: a quicker lobby, remembered setup choices and a useful round history.
function normalizeGamePreferences(raw) {
  const clean = Object.create(null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const [id, values] of Object.entries(raw).slice(0, 60)) {
    if (!/^[a-z]{2,24}$/.test(id) || !values || typeof values !== 'object' || Array.isArray(values))
      continue;
    const fields = Object.create(null);
    for (const [key, value] of Object.entries(values).slice(0, 30)) {
      if (!/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key) || ['player', 'second'].includes(key)) continue;
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
      !['player', 'second'].includes(el.id) &&
      !/^partyTeam/.test(el.id) &&
      !['password', 'file', 'hidden'].includes(el.type),
  );
}
function rememberSetup() {
  if (
    restoringSetup ||
    startingDaily ||
    screen !== 'setup' ||
    !state?.id ||
    dailyRun ||
    tourney?.active ||
    activeRoute
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
  if (screen !== 'setup' || state?.id !== id || dailyRun || tourney?.active || activeRoute) return;
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
        `<div class="setup-memory"><span>⚙ اختياراتك في هذه اللعبة تُحفظ تلقائياً</span><button class="linkbtn" onclick="resetGamePreferences('${id}')">الإعدادات الأصلية ↺</button></div>`,
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
const upgradeSettings = openSettings;
openSettings = function () {
  upgradeSettings();
  $('modal')
    .querySelector('.actions')
    ?.insertAdjacentHTML(
      'beforebegin',
      '<div class="settingsrow"><div class="primarytext"><b>مساعدة اللعب والحفظ</b><small>الجماعي والخصوصية والاستكمال ونقل تقدّمك</small></div><button onclick="openHelp()">؟ المساعدة</button></div>',
    );
  $('modal')
    .querySelector('.hintpanel')
    ?.insertAdjacentHTML(
      'beforebegin',
      '<div class="settingsrow"><div class="primarytext"><b>سجل الجولات</b><small>نتائجك الأخيرة محفوظة مع النسخة الاحتياطية</small></div><button onclick="openGameHistory()">عرض السجل</button></div>',
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
  return `<section class="audience-choices" aria-label="اختَر عدد اللاعبين"><button class="audience-solo" onclick="chooseSoloLobby()"><span>🧠</span><div><small>ابدأ بنفسك</small><h3>وقت لك، تحدٍّ يتطوّر معك</h3><p>${games.filter(isSolo).length} لعبة فردية · تدريب، استنتاج، واستكشاف</p></div><b>العب بمفردك ←</b></button><button onclick="chooseDuoLobby()"><span>⚔</span><div><small>شخصان</small><h3>مواجهة لها أكثر من جولة</h3><p>خصم ذكي أو صديق · تناوب عادل على البداية</p></div><b>ألعاب الشخصين ←</b></button><button onclick="openLounge()"><span>🎭</span><div><small>من 3 إلى 12 لاعبًا</small><h3>كل دور يحرّك اللمّة</h3><p>مشاهد، أدوار سرية، أسئلة، وتصويت</p></div><b>جهّزوا الجلسة ←</b></button></section>`;
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
  finder: '↑ أكبر · ↓ أصغر · Enter صحيح. أو المس زر الإجابة؛ داخل الدفتر تقدر تغيّر التخمين.',
  solo: 'اكتب رقمًا واضغط Enter، أو استخدم لوحة أرقام اللعبة. افتح معاينة التقسيم للتدريب.',
  mind: 'أزرار نعم ولا ومو متأكد. افتح دفتر الأدلة لتصحيح إجابة قديمة ومراجعة الاحتمالات.',
  who: 'اكتب الاسم أو اسمًا بديلًا. تقدر تسأل عن صفتين، بخصم معلن لكل سؤال.',
  memory: 'لمس بطاقتين، أو الأسهم للتنقل وEnter للقلب. الصورة تطابق صورتها أو اسمها حسب الوضع.',
  reaction: 'لمس المنطقة أو المسافة. في وضع التمييز اضغط الأخضر فقط وتجاهل البرتقالي.',
  mime: 'الجهاز مع الممثّل. المراقب يراجع الجواب، والأزرار تسجل النجاح والتجاوز؛ إخفاء الكلمة يحميها.',
  secret:
    'مرّر الجهاز بعد إخفاء الكلمة. دوّن الأسئلة أو جرّب التخمين المكتوب؛ السائل المقترح يتناوب.',
  ttt: 'لمس الخانة أو أرقام 1–9. في المواجهات الطويلة تتناوب البداية؛ راجع الحركات بعد الجولة.',
  connect: 'لمس العمود أو أرقام 1–7. القطع تسقط لآخر خانة، والمساعد يشرح الفرصة والتهديد.',
  code: 'لوحة الأرقام أو الكتابة المباشرة؛ الأخضر مكان صحيح والأصفر رقم بمكان مختلف. دفتر الأدلة من المحاولات الظاهرة.',
  simon: 'لمس الألوان أو أرقام 1–4. اتبع الوضع المختار: نفس الترتيب أو من الأخير للأول.',
  slide:
    'لمس قطعة بجوار الفراغ، أو في صفه وعموده بعد تفعيل دفع الصف. الأسهم والسحب للتحريك. تراجع عن الحركة عند الحاجة.',
  sudoku:
    'لمس خانة ثم رقم، أو الأرقام والأسهم. N للملاحظات وCtrl+Z للتراجع؛ معاينة الخطوة تشرح دليلها.',
  word: 'اكتب الكلمة أو اختر الحروف؛ حدّد حرفًا في ترتيبك لتعديله. القراءة بعد الحل لا تستهلك وقت الكلمة التالية.',
  math: 'اختر جوابًا أو اكتبه. بعد الإجابة اقرأ الشرح ثم اضغط التالي؛ التدريب على الأخطاء لا يضيف نقاطًا.',
  color: 'اتبع بطاقة القاعدة الظاهرة: لون الحروف، أو معنى الكلمة في الوضع المتغيّر.',
  pattern: 'ابحث عن الفرق أو النسبة بين الأعداد؛ قد تكون الخانة الناقصة في الداخل حسب الوضع.',
  spy: 'كل لاعب يرى دوره وحده؛ الأسئلة بين أشخاص محددين، والسجل علني بينما التصويت خاص.',
  taboo:
    'الجهاز مع الشارح والمراقب. الصحيح والمخالفة والتجاوز يسجلون النتيجة، وإخفاء البطاقة يحمي السر.',
  snake:
    'الأسهم أو أزرار الاتجاه؛ الضغط على التسارع أو Shift يستهلك طاقة. التدريب يسمح بخطوة ومعاينة.',
  merge: 'الأسهم أو السحب أو أزرار الاتجاه. اختر 4×4 أو 5×5، وشاهد البلاطة القادمة قبل الحركة.',
  mines:
    'اكشف الخانة أو بدّل إلى وضع العلامات. الأعلام وعلامات الشك تساعدانك؛ التكبير يوسّع الخانات.',
  maze: 'الأسهم، أزرار الاتجاه، أو لمس جار. في الاستكشاف تجمع المفاتيح بالترتيب وتضع علامات على الخريطة.',
  trivia: 'حدد ثقتك واختر الجواب. مساعد حذف خيارين محدود؛ شرح الإجابة يبقى حتى التالي.',
  hangman:
    'جرّب حرفًا أو الكلمة كاملة. دفتر الكلمات يساعدك على المقارنة، والتدريب على الكلمات الفائتة بدون نقاط.',
  wordguess:
    'اكتب التخمين أو حرّر خاناته. دفتر الأدلة يراعي الحروف المكررة؛ قائمة الاحتمالات تُستنتج من الألوان.',
  target: 'المس الهدف أو تحرك بالأسهم وأكد بـ Enter. اتبع ترتيب المسار أو احفظه أولًا حسب الوضع.',
  teamcup:
    'وزّع الفرق ثم مرّر الجهاز حسب الدور؛ اختاروا التكتيك، وافتحوا البطاقة بعد استعداد الفريق.',
  undercover: 'بطاقة خاصة لكل لاعب، ثم تلميحات وأسئلة علنية، ثم تصويت سري بعيدًا عن الآخرين.',
  improv: 'كل لاعب يكتب وحده؛ اعرضوا الأفكار المجهولة ثم صوّتوا وفق معيار الجولة.',
  nonogram:
    'املأ الخانات أو ضع علامة فراغ. دفتر الصفوف يعرض فرضيات قابلة للتراجع، وعدسة الحركة تسبق التنفيذ.',
  lights:
    'كل ضغطة تغيّر الخانة وجيرانها. جرّب الخطة أو مطاردة الصفوف، ثم نفّذ خطوة واحدة وتابع النتيجة.',
  pipes: 'دوّر الأنابيب لتوصل المصدر بالهدف. اختبر ضغط الماء طبقة بطبقة وافحص التسريب الفعلي.',
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
    `<div class="modalhead"><h2 id="modaltitle">؟ مساعدة لَمّة</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">لَمّة 8 · ${games.length} لعبة عربية في ملف واحد.</p>${[
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
renderHome = function () {
  homeRenderedDate = dayKey();
  store.extra.favorites = [...new Set(store.extra.favorites)].filter((id) =>
    games.some((g) => g[0] === id),
  );
  setHTML(
    `<section class="lobby-hero"><div class="lobby-copy"><span class="release-chip"><span></span>لَمّة 8.0 · العب، تعلّم، وتفوّق</span><h1>وقت للعب.<br><em>ولَمّة تستاهل.</em></h1><p>${games.length} تحدّياً على جوّك. تعلّم بروحك، نافس شخصًا، أو اجمع الربع. ألغاز للاستنتاج، جولات للشخصين، وتجارب حركة ومشاهد جماعية على نفس الجهاز.</p><div class="actions"><button class="primary" onclick="openQuickPicker()">✦ اختَر لي تحدّي</button><button class="lobby-party" onclick="openLounge()">👥 نجمع الربع</button></div><div class="lobby-details"><span>◉ بدون إنترنت</span><span>1–12 لاعب</span><button class="linkbtn" onclick="chooseSoloLobby()">كل الألعاب الفردية ←</button></div></div><div class="lobby-art" aria-hidden="true"><div class="art-ring one"></div><div class="art-ring two"></div><div class="art-glow"></div><div class="art-dice"><span></span><span></span><span></span><span></span><span></span></div><div class="art-ticket ticket-one"><b>LEVEL ${level()}</b><small>خطوة أذكى كل مرة</small></div><div class="art-ticket ticket-two"><span>🧩</span><b>تحدّي جديد. جوّك نفسه.</b></div><div class="art-spark s-one">✦</div><div class="art-spark s-two">✧</div><span class="art-caption">LET THE GOOD TIMES PLAY.</span></div></section>${audienceChoicesHTML()}<div class="lobby-summary"><button onclick="openProfile()"><span class="summary-icon">✦</span><span><small>مستواك ${level()}</small><b>${250 - (totalPoints() % 250)} نقطة للمستوى التالي</b><span class="mini-progress" style="--progress:${(totalPoints() % 250) / 2.5}%"></span></span><span>←</span></button><button onclick="openGameHistory()"><span class="summary-icon">↺</span><span><small>جولاتك ونتائجك</small><b>${fmt(totalPoints())} <small>نقطة · ${totalRounds()} جولة</small></b></span><span>←</span></button><button onclick="openDaily()"><span class="summary-icon">☀</span><span><small>تحديات اليوم</small><b>${dailyCompleted()} من 3 مكتملة</b></span><span>←</span></button></div>${snapshotHTML()}${routeResumeHTML()}${quickLaunchHTML()}<details class="discover-drawer"><summary><span>🗺️ مسارات ومنافسات</span><small>ثلاث محطات لك، أو بطولة للربع</small><b>اكتشف أكثر +</b></summary><div class="discovery-content"><div class="discovery-actions"><button onclick="openLounge()">👥 صالة اللمّة</button><button onclick="openTournament()">🏆 نبدأ بطولة</button><button onclick="openGameHistory()">↺ سجل الجولات</button></div>${routeCardsHTML()}</div></details><div class="sectionhead" id="gamesheading"><div><span class="world-label">${worlds.length - 1} عوالم · ${games.length} لعبة</span><h2>وين نلعب اليوم؟</h2></div><button class="quiet smallbtn" onclick="openGuide()">؟ دليل اللعب</button></div><nav class="worldtabs" aria-label="عوالم الألعاب">${worlds.map((w) => `<button class="worldtab ${world === w[0] ? 'active' : ''}" onclick="setWorld('${w[0]}')" aria-pressed="${world === w[0]}"><span>${w[1]}</span>${w[2]}<small>${w[0] === 'all' ? games.length : games.filter((g) => gameWorld[g[0]] === w[0]).length}</small></button>`).join('')}</nav><div class="catalogbar"><nav class="filter" aria-label="طريقة اللعب">${[
      ['all', 'الكل'],
      ['solo', 'بمفردك'],
      ['duo', 'شخصان'],
      ['group', 'مع الربع'],
      ['new', 'أحدث الألعاب ✦'],
    ]
      .map(
        ([id, label]) =>
          `<button class="${filter === id ? 'active' : ''}" onclick="setFilter('${id}')" aria-pressed="${filter === id}">${label}</button>`,
      )
      .join(
        '',
      )}<button class="${onlyFavorites ? 'active' : ''}" onclick="toggleFavorites()" aria-pressed="${onlyFavorites}">☆ المفضّلة <span id="favcount">${store.extra.favorites.length}</span></button></nav><div class="searchwrap"><label class="sr" for="search">ابحث عن لعبة</label><input id="search" type="search" placeholder="ابحث عن لعبة…  /" value="${esc(searchQuery)}" oninput="searchGames(this.value)" autocomplete="off"></div></div><div class="catalogsummary"><p class="tiny" id="gamecount" aria-live="polite"></p><div class="catalog-sort"><label for="catalogsort">الترتيب</label><select id="catalogsort" onchange="setCatalogSort(this.value)">${[
      ['recommended', 'اختيارات لَمّة'],
      ['name', 'أبجدي'],
      ['recent', 'آخر ألعابك'],
      ['popular', 'الأكثر لعباً عندك'],
    ]
      .map(
        ([v, label]) =>
          `<option value="${v}" ${experience().sort === v ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select><button class="linkbtn" onclick="clearFilters()">إعادة الفلاتر ↺</button></div></div><div class="grid" id="catalog"></div><section class="home-guide"><div><span class="guide-icon">👥</span><h3>جهاز واحد، لمّة كاملة</h3><p>أضف الأسماء، مرّر الجهاز، والعبوا بالتناوب. الكلمات والتصويت تبقى سرية أثناء الأدوار.</p></div><div><span class="guide-icon">⚙</span><h3>اللعبة على كيفك</h3><p>مطابقة الصورة باسمها، تسلسل معكوس، خرائط استكشاف، ومواجهات من عدة جولات. اختَر طريقة اللعب والوقت قبل البداية.</p></div><div><span class="guide-icon">💾</span><h3>نتائجك معك</h3><p>سجل الجولات والنقاط والألغاز محفوظة هنا. صدّر نسخة احتياطية من الإعدادات لنقل تقدمك.</p></div></section>`,
  );
  renderCatalog();
  $('foot').textContent = `لَمّة 8.0 · ${games.length} لعبة · على جهاز واحد · بدون إنترنت`;
};

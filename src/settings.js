// One settings screen owns preferences, backups and explicitly scoped resets.
const settingsSections = [
  ['appearance', '◐', 'المظهر'],
  ['play', '◎', 'اللعب'],
  ['data', '↺', 'البيانات'],
];
let settingsSection = 'appearance',
  pendingSettingsReset = null;

function settingsRow(title, description, control) {
  return `<div class="settingsrow"><div class="primarytext"><b>${title}</b><small>${description}</small></div><div class="settingscontrol">${control}</div></div>`;
}
function settingsStorageStatus() {
  return storageAvailable
    ? '✓ محفوظ تلقائياً على هذا المتصفح'
    : '⚠ الحفظ غير متاح هنا؛ صدّر نسخة قبل إغلاق الصفحة';
}
function settingsDefaultsHTML() {
  const saved = games.filter((game) => Object.keys(store.extra.preferences[game[0]] || {}).length);
  const canOpen = ['home', 'setup', 'solo-hub'].includes(screen) || state?.done;
  return `<details class="settings-defaults"><summary>اختيارات الألعاب المحفوظة · ${saved.length}</summary><p class="note">يمكنك إعادة لعبة واحدة إلى إعداداتها الأصلية. تعديل اختياراتها يكون من شاشة بدء اللعبة.</p>${saved.length ? `<div class="settings-default-list">${saved.map((game) => `<div><span><b>${game[1]} ${esc(game[2])}</b><small>${Object.keys(store.extra.preferences[game[0]]).length} خيارات محفوظة</small></span><div><button class="quiet smallbtn" onclick="settingsOpenGame('${game[0]}')" ${!canOpen ? 'disabled title="متاح بعد انتهاء الجولة الحالية"' : ''}>تعديل</button><button class="quiet smallbtn" onclick="settingsRequestReset('defaults','${game[0]}')" aria-label="إعادة إعدادات ${esc(game[2])}">↺ إعادة</button></div></div>`).join('')}</div>` : '<p class="note">غيّر اختيارات أي لعبة قبل بدء الجولة لتظهر هنا.</p>'}<button class="quiet settings-wide" onclick="settingsRequestReset('defaults')" ${!saved.length ? 'disabled' : ''}>إعادة اختيارات جميع الألعاب</button></details>`;
}
function openSettings(section) {
  const wasSettings = !$('modalback').hidden && !!$('modal').querySelector('.settings-tabs'),
    active =
      wasSettings && $('modal').contains(document.activeElement) ? document.activeElement : null,
    focusId = active?.id,
    focusAction = active?.getAttribute('onclick'),
    scrollTop = wasSettings ? $('modal').scrollTop : 0;
  if (settingsSections.some(([id]) => id === section)) settingsSection = section;
  pendingSettingsReset = null;
  const extra = store.extra;
  openModal(`<div class="modalhead"><div><p class="settings-eyebrow">مساحتك، على كيفك</p><h2 id="modaltitle">⚙ إعدادات لَمّة</h2></div><button onclick="closeModal()" aria-label="إغلاق الإعدادات">✕</button></div>
    <div class="settings-tabs" role="tablist" aria-label="أقسام الإعدادات">${settingsSections.map(([id, icon, title]) => `<button type="button" role="tab" id="settings-tab-${id}" aria-controls="settings-panel-${id}" aria-selected="${id === settingsSection}" tabindex="${id === settingsSection ? 0 : -1}" onclick="switchSettingsTab('${id}')"><span aria-hidden="true">${icon}</span>${title}</button>`).join('')}</div>
    <div class="settings-content">
      <section id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" ${settingsSection !== 'appearance' ? 'hidden' : ''}>
        <h3>عرض أوضح يناسبك</h3>
        ${settingsRow(
          '<label for="settings-theme">شكل العالم</label>',
          'فاتح، داكن أو يتبع إعداد جهازك تلقائياً',
          `<select id="settings-theme" onchange="changeSetting('theme',this.value)">${[
            ['dark', 'داكن 🌙'],
            ['light', 'فاتح ☀'],
            ['system', 'حسب الجهاز ◐'],
          ]
            .map(
              ([value, title]) =>
                `<option value="${value}" ${extra.theme === value ? 'selected' : ''}>${title}</option>`,
            )
            .join('')}</select>`,
        )}
        ${settingsRow(
          '<label for="settings-text-scale">حجم النص</label>',
          'يكبّر التعليمات والأزرار دون تغيير حجم لوحة اللعب',
          `<select id="settings-text-scale" onchange="changeSetting('textScale',Number(this.value))">${[
            [100, 'عادي · 100%'],
            [115, 'أكبر · 115%'],
            [130, 'كبير · 130%'],
          ]
            .map(
              ([value, title]) =>
                `<option value="${value}" ${extra.textScale === value ? 'selected' : ''}>${title}</option>`,
            )
            .join('')}</select>`,
        )}
        ${settingsRow('تباين أوضح', 'حدود ونصوص أقوى لسهولة القراءة', `<button onclick="changeSetting('contrast',!store.extra.contrast);openSettings()" aria-pressed="${extra.contrast}">${extra.contrast ? 'شغّال ✓' : 'تشغيل'}</button>`)}
        ${settingsRow('حركة الواجهة', 'الانتقالات والاحتفال؛ نحترم تقليل الحركة على جهازك', `<button onclick="toggleMotion()" aria-pressed="${extra.motion}">${extra.motion ? 'شغّالة' : 'مخففة'}</button>`)}
        <div class="settings-preview" aria-label="معاينة حجم النص"><b>جاهز للتحدّي؟</b><p class="note">اختر لعبتك، خذ وقتك، وجرّب طريقة جديدة.</p><span class="pill">معاينة القراءة</span></div>
        <button class="quiet settings-wide" onclick="settingsRequestReset('appearance')">إعادة إعدادات المظهر</button>
      </section>
      <section id="settings-panel-play" role="tabpanel" aria-labelledby="settings-tab-play" ${settingsSection !== 'play' ? 'hidden' : ''}>
        <h3>لعب مريح، بطريقتك</h3>
        ${settingsRow('الصوت', 'نغمات خفيفة وقت اللعب، بدون موسيقى مستمرة', `<button onclick="toggleSound();openSettings()" aria-pressed="${store.sound}">${store.sound ? 'شغّال 🔊' : 'مقفّل 🔇'}</button>`)}
        <div class="settings-volume"><label for="settings-volume">مستوى الصوت <output id="settings-volume-value" for="settings-volume">${extra.volume}%</output></label><input id="settings-volume" type="range" min="0" max="100" step="1" value="${extra.volume}" oninput="changeSetting('volume',Number(this.value))"><div><small>صامت</small><button class="quiet smallbtn" onclick="settingsPreviewSound()">جرّب النغمة</button><small>مرتفع</small></div></div>
        ${settingsRow('وضع التركيز', 'أخفِ رأس الموقع وزد مساحة اللعبة؛ زر ◎ يعيده', `<button onclick="togglePlayFocus();openSettings()" aria-pressed="${extra.focus}">${extra.focus ? 'شغّال ◎' : 'تشغيل'}</button>`)}
        ${settingsRow('حفظ اختيارات الألعاب', 'تذكر المستوى والطريقة تلقائياً للجولة القادمة', `<button onclick="changeSetting('rememberDefaults',!store.extra.rememberDefaults);openSettings()" aria-pressed="${extra.rememberDefaults}">${extra.rememberDefaults ? 'شغّال ✓' : 'مقفّل'}</button>`)}
        ${settingsRow('الشاشة الكاملة', 'وسّع مساحة اللعب إلى كامل الشاشة', '<button onclick="toggleFullscreen()">⛶ تبديل</button>')}
        ${settingsDefaultsHTML()}
        <p class="note">إيقاف حفظ الاختيارات يبدأ الألعاب بإعداداتها الأصلية ويحتفظ باختياراتك السابقة. البطولة وتحدّي اليوم لهما إعداداتهما الخاصة.</p>
      </section>
      <section id="settings-panel-data" role="tabpanel" aria-labelledby="settings-tab-data" ${settingsSection !== 'data' ? 'hidden' : ''}>
        <h3>تقدّمك بين يديك</h3>
        <div class="settings-data-summary"><div><b>${fmt(totalRounds())}</b><small>جولات مسجّلة</small></div><div><b>${store.extra.history.length}</b><small>نتائج في السجل</small></div><div><b>${store.extra.favorites.length}</b><small>ألعاب مفضّلة</small></div></div>
        <div class="settings-backup"><b>انقل تقدّمك أو احتفظ بنسخة</b><p class="note">نسخة JSON تضم الأسماء والنقاط والاختيارات والإضافات وتقدّم اللعب الفردي. استيرادها يعرض تأكيداً قبل استبدال بياناتك الحالية.</p><div class="actions"><button class="primary" onclick="exportProgress()">⬇ نسخة احتياطية</button><button onclick="document.getElementById('importfile').click()">⬆ استيراد نسخة</button></div><input type="file" id="importfile" accept="application/json,.json" hidden onchange="importProgress(this.files[0]);this.value=''"></div>
        <div class="settings-backup"><b>كل الألعاب في ملف HTML واحد</b><p class="note">حمّل نسخة الموقع لتلعب دون إنترنت. نقاطك واختياراتك تُنقل بشكل منفصل من زر النسخة الاحتياطية JSON أعلاه.</p><div class="actions"><button onclick="downloadStandalone()">⬇ تحميل نسخة HTML</button></div></div>
        ${settingsRow('قاعدة التخمين', `${items.length} شي · ${extra.learned.length} إضافة منك`, '<button onclick="openKnowledge()">إدارة</button>')}
        ${settingsRow('سجل الجولات', 'راجع نتائجك وألعابك الأخيرة', '<button onclick="openGameHistory()">عرض السجل</button>')}
        ${settingsRow('مساعدة اللعب والحفظ', 'الخصوصية واللعب الجماعي والاستكمال', '<button onclick="openHelp()">؟ المساعدة</button>')}
        <details class="settings-reset"><summary>تنظيف بيانات محددة</summary><p class="note">كل خيار يوضح ما يحذفه ويطلب تأكيدك. الأسماء والنقاط تبقى محفوظة.</p><div class="settings-reset-actions"><button onclick="settingsRequestReset('history')" ${!extra.history.length ? 'disabled' : ''}>مسح سجل الجولات</button><button onclick="settingsRequestReset('favorites')" ${!extra.favorites.length ? 'disabled' : ''}>إفراغ المفضّلة</button><button onclick="settingsRequestReset('session')" ${!extra.savedSession ? 'disabled' : ''}>حذف الجولة المحفوظة</button></div></details>
        <div class="hintpanel">اللعب محلي ومن دون حساب. الحفظ على هذا المتصفح فقط؛ صدّر نسخة عند الانتقال لجهاز آخر. فتح الإعدادات يوقف مؤقت الجولة إلى أن تغلقها.</div>
      </section>
    </div><p id="settings-save-status" class="settings-save-status" role="status">${settingsStorageStatus()}</p>`);
  const target = focusId
    ? $(focusId)
    : focusAction
      ? [...$('modal').querySelectorAll('button')].find(
          (button) => button.getAttribute('onclick') === focusAction,
        )
      : null;
  if (target && target.getClientRects().length) target.focus({ preventScroll: true });
  if (wasSettings) $('modal').scrollTop = scrollTop;
}
function switchSettingsTab(section, focus = false) {
  if (!settingsSections.some(([id]) => id === section) || !$('settings-tab-' + section)) return;
  settingsSection = section;
  for (const [id] of settingsSections) {
    const selected = id === section;
    $('settings-tab-' + id).setAttribute('aria-selected', String(selected));
    $('settings-tab-' + id).tabIndex = selected ? 0 : -1;
    $('settings-panel-' + id).hidden = !selected;
  }
  if (focus) $('settings-tab-' + section).focus({ preventScroll: true });
}
function changeSetting(key, value) {
  const validators = {
    theme: (v) => ['dark', 'light', 'system'].includes(v),
    textScale: (v) => [100, 115, 130].includes(v),
    contrast: (v) => typeof v === 'boolean',
    volume: (v) => Number.isInteger(v) && v >= 0 && v <= 100,
    rememberDefaults: (v) => typeof v === 'boolean',
  };
  if (!Object.hasOwn(validators, key) || !validators[key](value)) return false;
  store.extra[key] = value;
  save();
  applySettings();
  const output = $('settings-volume-value');
  if (output) output.value = store.extra.volume + '%';
  const status = $('settings-save-status');
  if (status) status.textContent = settingsStorageStatus();
  return true;
}
function settingsPreviewSound() {
  if (!store.sound) return toast('شغّل الصوت أولاً لتجربة النغمة.');
  if (!store.extra.volume) return toast('مستوى الصوت صفر؛ ارفعه لتسمع النغمة.');
  tone(true);
}
function settingsOpenGame(id) {
  if (
    !games.some((game) => game[0] === id) ||
    (!['home', 'setup', 'solo-hub'].includes(screen) && !state?.done)
  )
    return;
  closeModal();
  setup(id);
}
function settingsResetDescription(kind, id) {
  const game = id && games.find((entry) => entry[0] === id);
  if (id && (kind !== 'defaults' || !game)) return null;
  const descriptions = {
    appearance: [
      'إعادة إعدادات المظهر',
      'يرجع الشكل الداكن وحجم النص العادي والتباين الافتراضي والحركة. إعدادات الصوت واللعب لا تتغير.',
    ],
    defaults: [
      'إعادة اختيارات الألعاب',
      game
        ? `تنحذف اختيارات ${game[2]} المحفوظة فقط. الجولة الحالية تبقى كما هي.`
        : 'تنحذف اختيارات جميع الألعاب المحفوظة. الجولة الحالية تبقى كما هي.',
    ],
    history: [
      'مسح سجل الجولات',
      'ينحذف سجل النتائج الأخيرة فقط. النقاط والإنجازات وأرقامك القياسية لا تتغير.',
    ],
    favorites: [
      'إفراغ المفضّلة',
      'تنحذف النجوم من قائمة الألعاب المفضّلة فقط. تقدر تضيفها مرة ثانية.',
    ],
    session: [
      'حذف الجولة المحفوظة',
      'تنحذف نسخة الاستكمال الحالية فقط. إذا عندك جولة مفتوحة الآن، يمكن حفظها مجدداً عند مغادرتها.',
    ],
  };
  return Object.hasOwn(descriptions, kind) ? descriptions[kind] : null;
}
function settingsRequestReset(kind, id = '') {
  const description = settingsResetDescription(kind, id);
  if (!description) return;
  const token = storageToken();
  pendingSettingsReset = { kind, id, token };
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">${description[0]}</h2><button onclick="settingsCancelReset()" aria-label="إلغاء">✕</button></div><div data-settings-confirm="${token}" class="settings-confirm"><span aria-hidden="true">↺</span><p>${esc(description[1])}</p><p class="note">الأسماء والنقاط محفوظة. يمكنك تصدير نسخة قبل المتابعة.</p><div class="actions"><button onclick="exportProgress()">⬇ نسخة احتياطية</button><button onclick="settingsCancelReset()">إلغاء</button><button class="primary" onclick="settingsConfirmReset('${token}')">تأكيد الإعادة</button></div></div>`,
  );
}
function settingsCancelReset() {
  pendingSettingsReset = null;
  openSettings();
}
function settingsConfirmReset(token) {
  const pending = pendingSettingsReset;
  if (
    !pending ||
    pending.token !== token ||
    $('modalback').hidden ||
    $('modal').querySelector('[data-settings-confirm]')?.dataset.settingsConfirm !== token
  )
    return false;
  pendingSettingsReset = null;
  const resetSetupId =
    pending.kind === 'defaults' &&
    screen === 'setup' &&
    (!pending.id || pending.id === state?.id) &&
    !state?.soloSessionToken &&
    !dailyRun &&
    !tourney?.active &&
    !activeRoute
      ? state.id
      : null;
  // Merge any recent remote contributions before creating a new generation.
  // Scoped deletions then remain deleted when an older tab saves again.
  save();
  switch (pending.kind) {
    case 'appearance':
      Object.assign(store.extra, { theme: 'dark', textScale: 100, contrast: false, motion: true });
      break;
    case 'defaults':
      if (pending.id) delete store.extra.preferences[pending.id];
      else store.extra.preferences = Object.create(null);
      break;
    case 'history':
      store.extra.history = [];
      break;
    case 'favorites':
      store.extra.favorites = [];
      break;
    case 'session':
      store.extra.savedSession = null;
      break;
    default:
      return false;
  }
  save({ replace: true });
  applySettings();
  if (resetSetupId) setup(resetSetupId, true);
  updateDock();
  openSettings(
    pending.kind === 'appearance' ? 'appearance' : pending.kind === 'defaults' ? 'play' : 'data',
  );
  toast('تمت إعادة البيانات المحددة؛ الأسماء والنقاط محفوظة.');
  return true;
}
document.addEventListener('keydown', (event) => {
  const tab = event.target.closest?.('[role="tab"][id^="settings-tab-"]');
  if (
    !tab ||
    !$('modal').contains(tab) ||
    $('modalback').hidden ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.isComposing
  )
    return;
  const current = settingsSections.findIndex(([id]) => tab.id === 'settings-tab-' + id);
  let next;
  if (event.key === 'ArrowLeft') next = (current + 1) % settingsSections.length;
  else if (event.key === 'ArrowRight')
    next = (current + settingsSections.length - 1) % settingsSections.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = settingsSections.length - 1;
  else return;
  event.preventDefault();
  switchSettingsTab(settingsSections[next][0], true);
});
const settingsSystemTheme = window.matchMedia('(prefers-color-scheme: dark)');
settingsSystemTheme.addEventListener?.('change', () => {
  if (store.extra.theme === 'system') applySettings();
});

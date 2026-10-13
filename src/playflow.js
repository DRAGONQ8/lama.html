// Shared play comfort: keyboard-aware viewports, focus mode and useful round reviews.
const flowWrap = wrap;
wrap = function (id, body) {
  return flowWrap(id, body).replace(
    '<div class="playtools">',
    `<div class="playtools"><button class="quiet focus-toggle" onclick="togglePlayFocus()" aria-pressed="${store.extra.focus}" aria-label="${store.extra.focus ? 'إيقاف وضع التركيز' : 'تشغيل وضع التركيز'}" title="وضع التركيز">◎</button>`,
  );
};
const flowDock = updateDock;
updateDock = function () {
  flowDock();
  document.body.classList.toggle('focus-play', store.extra.focus && screen !== 'home');
  updatePlayViewport();
};
function togglePlayFocus() {
  store.extra.focus = !store.extra.focus;
  save();
  updateDock();
  document.querySelectorAll('.focus-toggle').forEach((button) => {
    button.setAttribute('aria-pressed', String(store.extra.focus));
    button.setAttribute(
      'aria-label',
      store.extra.focus ? 'إيقاف وضع التركيز' : 'تشغيل وضع التركيز',
    );
  });
  toast(store.extra.focus ? 'وضع التركيز: مساحة أوسع للعب. اضغط ◎ للعودة.' : 'رجعنا للعرض الكامل.');
}
function playEditable(element) {
  return (
    !!element?.matches?.(
      'textarea,input:not([type="checkbox"]):not([type="range"]):not([type="button"]):not([type="submit"])',
    ) &&
    !element.readOnly &&
    !element.disabled
  );
}
let playViewportHeight = innerHeight;
let playViewportWidth = innerWidth;
function updatePlayViewport() {
  const view = window.visualViewport,
    height = view?.height || innerHeight,
    editing = playEditable(document.activeElement),
    small = innerWidth <= 900,
    unzoomed = !view || Math.abs(view.scale - 1) < 0.05;
  if (unzoomed && playViewportWidth !== innerWidth) {
    playViewportHeight = Math.max(innerHeight, height);
    playViewportWidth = innerWidth;
  }
  if (!editing && unzoomed) playViewportHeight = Math.max(playViewportHeight, innerHeight, height);
  const keyboard =
    small &&
    editing &&
    unzoomed &&
    ((matchMedia('(pointer: coarse)').matches && playViewportHeight - height > 140) ||
      innerHeight - height > 140);
  document.documentElement.style.setProperty('--play-viewport-height', `${Math.round(height)}px`);
  document.documentElement.style.setProperty(
    '--play-viewport-top',
    `${Math.round(view?.offsetTop || 0)}px`,
  );
  document.body.classList.toggle('keyboard-open', keyboard);
}
window.addEventListener('resize', updatePlayViewport);
window.addEventListener('orientationchange', () => {
  playViewportHeight = innerHeight;
  updatePlayViewport();
});
window.visualViewport?.addEventListener('resize', updatePlayViewport);
window.visualViewport?.addEventListener('scroll', updatePlayViewport);
document.addEventListener('focusin', (event) => {
  if (screen === 'memory' && !event.target.matches('.memcard')) state.memoryRestoreFocus = false;
  updatePlayViewport();
  requestAnimationFrame(updatePlayViewport);
});
document.addEventListener('focusout', () => requestAnimationFrame(updatePlayViewport));
document.addEventListener('input', (event) => {
  if (event.target.id === 'guessInput') {
    event.target.removeAttribute('aria-invalid');
    $('soloFeedback')?.classList.remove('invalid');
    updateSoloSplit();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || coreBlocked()) return;
  if (
    screen === 'solo' &&
    !state.done &&
    event.target.id === 'guessInput' &&
    event.target.readOnly
  ) {
    const key = latin(event.key);
    if (/^\d$/.test(key) || ['Backspace', 'Delete', '-'].includes(key)) {
      event.preventDefault();
      soloKey(
        key === 'Backspace' ? 'back' : key === 'Delete' ? 'clear' : key === '-' ? 'sign' : key,
      );
    }
  }
  if (
    screen === 'memory' &&
    !state.done &&
    event.target.matches('.memcard') &&
    /^Arrow/.test(event.key)
  ) {
    event.preventDefault();
    const columns = state.pairs <= 16 ? 4 : state.pairs <= 20 ? 5 : 6,
      current = Number(event.target.dataset.memoryIndex),
      rtl = getComputedStyle(event.target.parentElement).direction === 'rtl',
      horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key),
      offset = {
        ArrowUp: -columns,
        ArrowDown: columns,
        ArrowLeft: rtl ? 1 : -1,
        ArrowRight: rtl ? -1 : 1,
      }[event.key];
    if (!offset) return;
    let next = current + offset;
    while (next >= 0 && next < state.deck.length && state.matched.includes(next)) next += offset;
    if (horizontal && Math.floor(next / columns) !== Math.floor(current / columns)) return;
    const button = document.querySelector(`[data-memory-index="${next}"]:not(:disabled)`);
    if (button) {
      document.querySelectorAll('.memcard').forEach((card) => (card.tabIndex = -1));
      button.tabIndex = 0;
      state.memoryFocus = next;
      button.focus({ preventScroll: true });
      button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
});
const flowSettings = openSettings;
openSettings = function () {
  flowSettings();
  $('modal')
    .querySelector('.settingsrow')
    ?.insertAdjacentHTML(
      'afterend',
      `<div class="settingsrow"><div class="primarytext"><b>وضع التركيز</b><small>أخفِ رأس الموقع وزد مساحة اللعبة؛ زر ◎ يعيده</small></div><button onclick="togglePlayFocus();openSettings()" aria-pressed="${store.extra.focus}">${store.extra.focus ? 'شغّال ◎' : 'تشغيل'}</button></div>`,
    );
};
const flowResult = result;
result = function (id, title, text, points = 0, detail = '') {
  const s = state,
    alreadyShown = s?.resultShown;
  flowResult(id, title, text, points, detail);
  if (alreadyShown || !s || !s.resultShown || state !== s) return;
  if (id === 'solo') {
    $('app')
      .querySelector('.success')
      ?.insertAdjacentHTML(
        'beforeend',
        `<details class="round-review"><summary>كيف ضيّقت النطاق؟</summary><p class="note">بدأت بـ ${fmt(s.initialH - s.initialL + 1n)} احتمال، واستخدمت ${s.attempt} محاولة و${s.hints} تلميحات. اختيار المنتصف يستبعد أكبر عدد مضمون من الاحتمالات.</p>${s.history.length ? `<ol>${s.history.map((v, i) => `<li><span>المحاولة ${i + 1}</span><bdi>${fmt(v.n)}</bdi><b>${v.a === 'higher' ? '↑ أكبر' : '↓ أصغر'}</b></li>`).join('')}</ol>` : ''}<p class="note">الرقم الصحيح: <bdi>${fmt(s.secret)}</bdi></p></details>`,
      );
  }
  const best = store.extra.best[id] || 0;
  $('app')
    .querySelector('.success')
    ?.insertAdjacentHTML(
      'beforeend',
      `<div class="result-path"><span>✦ أفضل نتيجة لهذه اللعبة على الجهاز: <b>${fmt(best)}</b> نقطة</span><button class="quiet" onclick="openQuickPicker('${['snake', 'merge', 'mines', 'maze', 'target'].includes(id) ? 'action' : 'calm'}')">تحدّي آخر يناسبك ←</button></div>`,
    );
};

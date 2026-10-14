// Personal training: saved stations, adaptable difficulty and a separate practice record.
// This declaration is intentionally safe to call before the rest of this file runs.
function normalizeSoloProgress(raw, strict = false) {
  const clean = { version: 1, profiles: [] },
    skillIds = ['memory', 'logic', 'numbers', 'words', 'focus'],
    allowed = [
      'memory',
      'simon',
      'code',
      'lights',
      'pipes',
      'nonogram',
      'slide',
      'math',
      'pattern',
      'solo',
      'word',
      'hangman',
      'wordguess',
      'color',
      'target',
    ],
    levels = ['easy', 'normal', 'hard'],
    record = (v) => !!v && typeof v === 'object' && !Array.isArray(v),
    counter = (v) => Number.isSafeInteger(v) && v >= 0,
    token = (v) => typeof v === 'string' && /^[a-zA-Z0-9-]{8,100}$/.test(v),
    stamp = (v) => Number.isSafeInteger(v) && v > 0 && v <= 8640000000000000,
    points = (v) => Number.isInteger(v) && v >= 0 && v <= 100,
    name = (v) => typeof v === 'string' && v.length <= 24 && normalizePlayerName(v),
    invalid = () => {
      if (strict) throw Error('Invalid solo progress');
    };
  if (raw == null) return clean;
  if (
    !record(raw) ||
    raw.version !== 1 ||
    !Array.isArray(raw.profiles) ||
    raw.profiles.length > 24
  ) {
    invalid();
    return clean;
  }
  const seen = new Set();
  for (const p of raw.profiles) {
    const normalizedName = name(p?.name);
    if (!record(p) || !normalizedName || seen.has(normalizedName)) {
      invalid();
      continue;
    }
    seen.add(normalizedName);
    const profile = {
      name: normalizedName,
      goal: 3,
      prefs: { rounds: 3, skill: 'all', level: 'normal', mode: 'practice', adaptive: true },
      sessions: 0,
      rounds: 0,
      practiceRounds: 0,
      total: 0,
      best: 0,
      skills: {},
      days: {},
      recent: [],
      active: null,
    };
    if (Number.isInteger(p.goal) && p.goal >= 1 && p.goal <= 8) profile.goal = p.goal;
    else if (p.goal !== undefined) invalid();
    const prefs = p.prefs;
    if (record(prefs)) {
      if ([3, 5, 8].includes(prefs.rounds)) profile.prefs.rounds = prefs.rounds;
      else invalid();
      if (['all', ...skillIds].includes(prefs.skill)) profile.prefs.skill = prefs.skill;
      else invalid();
      if (levels.includes(prefs.level)) profile.prefs.level = prefs.level;
      else invalid();
      if (['practice', 'ranked'].includes(prefs.mode)) profile.prefs.mode = prefs.mode;
      else invalid();
      if (typeof prefs.adaptive === 'boolean') profile.prefs.adaptive = prefs.adaptive;
      else invalid();
    } else if (prefs !== undefined) invalid();
    for (const key of ['sessions', 'rounds', 'practiceRounds', 'total', 'best']) {
      if (counter(p[key]) && (key !== 'best' || p[key] <= 100)) profile[key] = p[key];
      else if (p[key] !== undefined) invalid();
    }
    if (profile.practiceRounds > profile.rounds) {
      invalid();
      profile.practiceRounds = profile.rounds;
    }
    for (const id of skillIds) {
      const v = p.skills?.[id];
      if (v === undefined) continue;
      if (!record(v) || !counter(v.rounds) || !counter(v.total) || !points(v.best)) {
        invalid();
        continue;
      }
      profile.skills[id] = { rounds: v.rounds, total: v.total, best: v.best };
    }
    if (record(p.days)) {
      for (const [day, count] of Object.entries(p.days)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 90)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && counter(count)) profile.days[day] = count;
        else invalid();
      }
    } else if (p.days !== undefined) invalid();
    if (Array.isArray(p.recent)) {
      const rids = new Set();
      for (const v of p.recent.slice(0, 120)) {
        if (
          !record(v) ||
          !token(v.rid) ||
          !allowed.includes(v.id) ||
          !points(v.points) ||
          !stamp(v.at) ||
          !['practice', 'ranked'].includes(v.mode) ||
          !levels.includes(v.level) ||
          !counter(v.seconds) ||
          v.seconds > 31536000 ||
          (v.complete !== undefined && typeof v.complete !== 'boolean') ||
          (v.day !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(v.day))
        ) {
          invalid();
          continue;
        }
        if (rids.has(v.rid)) continue;
        rids.add(v.rid);
        profile.recent.push({
          rid: v.rid,
          id: v.id,
          points: v.points,
          at: v.at,
          mode: v.mode,
          level: v.level,
          seconds: v.seconds,
          day: v.day || new Date(v.at).toISOString().slice(0, 10),
          complete: v.complete === true,
        });
      }
      profile.recent.sort((a, b) => b.at - a.at || a.rid.localeCompare(b.rid));
    } else if (p.recent !== undefined) invalid();
    const a = p.active;
    if (a != null) {
      if (
        !record(a) ||
        !token(a.token) ||
        a.name !== normalizedName ||
        !Array.isArray(a.queue) ||
        ![3, 5, 8].includes(a.queue.length) ||
        !a.queue.every((id) => allowed.includes(id)) ||
        !Number.isInteger(a.at) ||
        a.at < 0 ||
        a.at >= a.queue.length ||
        !['practice', 'ranked'].includes(a.mode) ||
        !levels.includes(a.level) ||
        typeof a.adaptive !== 'boolean' ||
        !stamp(a.started) ||
        !Array.isArray(a.results) ||
        a.results.length !== a.at ||
        a.results.some(
          (v, i) =>
            !record(v) ||
            v.id !== a.queue[i] ||
            !points(v.points) ||
            !levels.includes(v.level) ||
            !counter(v.seconds) ||
            v.seconds > 31536000,
        )
      )
        invalid();
      else
        profile.active = {
          token: a.token,
          name: normalizedName,
          queue: [...a.queue],
          at: a.at,
          mode: a.mode,
          level: a.level,
          adaptive: a.adaptive,
          started: a.started,
          results: a.results.map((v) => ({
            id: v.id,
            points: v.points,
            level: v.level,
            seconds: v.seconds,
          })),
        };
    }
    clean.profiles.push(profile);
  }
  return clean;
}

// Merge new round identities, then add only the contributions the other tab has not seen.
// Totals remain cumulative even after the bounded recent log discards older rounds.
function mergeSoloProgress(local, baseline, remote) {
  const l = normalizeSoloProgress(local),
    b = normalizeSoloProgress(baseline),
    r = normalizeSoloProgress(remote),
    merged = { version: 1, profiles: [] };
  for (const name of [...new Set([...r.profiles, ...l.profiles].map((p) => p.name))].slice(0, 24)) {
    const current = l.profiles.find((p) => p.name === name),
      before = b.profiles.find((p) => p.name === name),
      latest = r.profiles.find((p) => p.name === name);
    if (!current) {
      merged.profiles.push(latest);
      continue;
    }
    if (!latest) {
      merged.profiles.push(current);
      continue;
    }
    const out = JSON.parse(JSON.stringify(latest)),
      remoteIds = new Set(latest.recent.map((v) => v.rid)),
      cutoff = latest.recent.at(-1),
      added = current.recent.filter(
        (v) =>
          !remoteIds.has(v.rid) &&
          (latest.recent.length < 120 ||
            v.at > cutoff.at ||
            (v.at === cutoff.at && v.rid < cutoff.rid)),
      );
    for (const event of added) soloApplyEvent(out, event);
    out.recent = [...new Map([...current.recent, ...latest.recent].map((v) => [v.rid, v])).values()]
      .sort((a, z) => z.at - a.at || a.rid.localeCompare(z.rid))
      .slice(0, 120);
    for (const key of ['goal', 'prefs', 'active'])
      if (JSON.stringify(current[key]) !== JSON.stringify(before?.[key])) out[key] = current[key];
    // A stale tab cannot reopen a station that another tab already completed.
    if (out.active) {
      while (out.active.at < out.active.queue.length) {
        const event = out.recent.find((v) => v.rid === `${out.active.token}-${out.active.at}`);
        if (!event) break;
        out.active.results.push({
          id: event.id,
          points: event.points,
          level: event.level,
          seconds: event.seconds,
        });
        out.active.at++;
      }
      if (out.active.at === out.active.queue.length) out.active = null;
    }
    merged.profiles.push(out);
  }
  return normalizeSoloProgress(merged);
}

function soloApplyEvent(profile, event) {
  // Literal mapping keeps storage normalization and merging independent of script initialization order.
  const skill = {
    memory: 'memory',
    simon: 'memory',
    code: 'logic',
    lights: 'logic',
    pipes: 'logic',
    nonogram: 'logic',
    slide: 'logic',
    math: 'numbers',
    pattern: 'numbers',
    solo: 'numbers',
    word: 'words',
    hangman: 'words',
    wordguess: 'words',
    color: 'focus',
    target: 'focus',
  }[event.id];
  profile.rounds = sumCounter(profile.rounds, 1);
  profile.practiceRounds = sumCounter(profile.practiceRounds, event.mode === 'practice' ? 1 : 0);
  profile.total = sumCounter(profile.total, event.points);
  profile.best = Math.max(profile.best, event.points);
  profile.sessions = sumCounter(profile.sessions, event.complete ? 1 : 0);
  const stat = (profile.skills[skill] ||= { rounds: 0, total: 0, best: 0 });
  stat.rounds = sumCounter(stat.rounds, 1);
  stat.total = sumCounter(stat.total, event.points);
  stat.best = Math.max(stat.best, event.points);
  profile.days[event.day] = sumCounter(profile.days[event.day] || 0, 1);
  profile.days = Object.fromEntries(
    Object.entries(profile.days)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 90),
  );
}

const soloSkills = [
  {
    id: 'memory',
    icon: '🧠',
    name: 'الذاكرة',
    desc: 'احفظ، واربط، واسترجع.',
    games: ['memory', 'simon'],
  },
  {
    id: 'logic',
    icon: '🧩',
    name: 'المنطق',
    desc: 'خطة واضحة قبل الحركة.',
    games: ['code', 'lights', 'pipes', 'nonogram', 'slide'],
  },
  {
    id: 'numbers',
    icon: '🔢',
    name: 'الأرقام',
    desc: 'استنتج النمط واحسب بثقة.',
    games: ['math', 'pattern', 'solo'],
  },
  {
    id: 'words',
    icon: '✍',
    name: 'الكلمات',
    desc: 'اقرأ الأدلة وابنِ المفردات.',
    games: ['word', 'hangman', 'wordguess'],
  },
  {
    id: 'focus',
    icon: '◎',
    name: 'التركيز',
    desc: 'دقة الاختيار وسرعة الاستجابة.',
    games: ['color', 'target'],
  },
];
let soloHubName = null,
  soloRound = null,
  soloOpening = false,
  soloManageNames = [],
  soloPendingRemoval = null;
store.extra.solo = normalizeSoloProgress(store.extra.solo || rawExtra.solo);

function soloProfile(name = soloHubName || store.players[0], create = true) {
  store.extra.solo ||= normalizeSoloProgress(null);
  let profile = store.extra.solo.profiles.find((p) => p.name === name);
  if (!profile && create && normalizePlayerName(name)) {
    if (store.extra.solo.profiles.length >= 24) return null;
    profile = normalizeSoloProgress({ version: 1, profiles: [{ name }] }).profiles[0];
    store.extra.solo.profiles.push(profile);
  }
  return profile;
}
function soloSkillFor(id) {
  return soloSkills.find((skill) => skill.games.includes(id));
}
function soloLevelLabel(level) {
  return { easy: 'خفيف', normal: 'متوسط', hard: 'تحدّي' }[level];
}
function soloSample(profile, skill) {
  const own = profile.recent.filter((v) => skill.games.includes(v.id)),
    ranked = store.extra.history.filter(
      (v) =>
        v.name === profile.name &&
        skill.games.includes(v.id) &&
        !own.some((r) => r.mode === 'ranked' && r.id === v.id && Math.abs(r.at - v.at) < 2000),
    ),
    sample = [...own, ...ranked].sort((a, b) => b.at - a.at).slice(0, 8);
  return {
    count: sample.length,
    average: sample.length
      ? Math.round(sample.reduce((n, v) => n + Math.min(100, v.points), 0) / sample.length)
      : null,
  };
}
function soloRecommendation(profile) {
  const ranked = soloSkills.map((skill) => ({ skill, ...soloSample(profile, skill) }));
  return ranked.filter((v) => v.count).sort((a, b) => a.average - b.average)[0] || ranked[0];
}
function soloHomeHTML() {
  const saved = store.extra.solo?.profiles.find((p) => p.active && store.players.includes(p.name));
  return `<section class="solo-home"><div class="solo-home-icon" aria-hidden="true">◎</div><div><span class="world-label">مساحتك الفردية</span><h3>${saved ? 'جلسة ' + esc(saved.name) + ' تنتظرك' : 'درّب مهارة. وراقب تقدمك.'}</h3><p>${saved ? saved.active.at + ' من ' + saved.active.queue.length + ' جولات مكتملة · الجولة الحالية تبدأ من جديد' : 'جلسة من اختيارك، مستوى يتكيف معك، وتدريب دون التأثير على لوحة النقاط.'}</p></div><button class="primary" onclick="openSoloHub()">${saved ? 'نكمل الجلسة' : 'افتح النادي الفردي'} ←</button></section>`;
}
function openSoloHub(name) {
  const departed = screen === 'home' && navigationHasHome(),
    previousView = screen;
  if (departed) {
    navigationCaptureHome();
    navigationHistory('home');
  }
  captureSoloSession();
  soloRound = null;
  activeRoute = null;
  tourney = null;
  dailyRun = null;
  clearTimers();
  removePause();
  closeModal(true);
  const saved = store.extra.solo?.profiles.find((p) => p.active && store.players.includes(p.name));
  soloHubName = store.players.includes(name)
    ? name
    : store.players.includes(soloHubName)
      ? soloHubName
      : saved?.name || store.players[0];
  screen = 'solo-hub';
  state = null;
  renderSoloHub();
  navigationHistory(
    'solo',
    null,
    previousView !== 'solo-hub' && history.state?.lammaView?.view !== 'solo',
  );
  goTop();
}
function renderSoloHub() {
  if (screen !== 'solo-hub') return;
  const p = soloProfile(),
    prefs = p?.prefs;
  if (!p) {
    setHTML(
      '<section class="panel"><h2>ملفاتك الفردية محفوظة</h2><p>وصلت إلى 24 ملفاً. من إدارة الملفات يمكنك حذف سجل لاعب قديم لإنشاء ملف جديد؛ نقاط لوحة اللمّة تبقى محفوظة.</p><div class="actions"><button class="primary" onclick="openSoloProfiles()">إدارة الملفات المحفوظة</button><button onclick="home()">العالم</button></div></section>',
    );
    updateDock();
    return;
  }
  const recommendation = soloRecommendation(p),
    today = p.days[dayKey()] || 0,
    last = p.recent[0];
  setHTML(
    `<div class="play solo-hub"><div class="solo-head"><div><span class="world-label">مساحتك الفردية · خطوة كل يوم</span><h1>ناديك الخاص.<br><em>تحدٍّ على مستواك.</em></h1><p class="muted">اختَر مهارة وجلسة تناسبك. كل محطة تُحفظ، والمستوى يواكب نتيجتك.</p></div><button class="quiet" onclick="home()" aria-label="العودة لعالم الألعاب">← العالم</button></div><div class="solo-profile"><label for="soloPlayer">ملف اللاعب</label><select id="soloPlayer" onchange="openSoloHub(store.players[Number(this.value)])">${store.players.map((name, i) => `<option value="${i}" ${name === p.name ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select><button class="linkbtn" onclick="openPeople()">إدارة اللاعبين</button></div><div class="solo-summary"><div><small>جلسات مكتملة</small><b>${fmt(p.sessions)}</b></div><div><small>جولات النادي</small><b>${fmt(p.rounds)}</b><span>${fmt(p.practiceRounds)} تدريب</span></div><div><small>متوسط النتيجة</small><b><bdi dir="ltr">${p.rounds ? Math.round(p.total / p.rounds) : '—'}<small> / 100</small></bdi></b></div><div><small>هدف اليوم</small><b><bdi dir="ltr">${Math.min(today, p.goal)}<small> / ${p.goal}</small></bdi></b><progress value="${Math.min(today, p.goal)}" max="${p.goal}" aria-label="تقدم هدف اليوم"></progress></div></div>${p.active ? `<section class="solo-resume panel"><div><span class="world-label">💾 محطاتك محفوظة</span><h3>كمّل جلسة ${p.active.mode === 'practice' ? 'التدريب' : 'النقاط'}</h3><p class="note">${p.active.at} من ${p.active.queue.length} جولات مكتملة. الجولة غير المكتملة تبدأ من جديد، والنقاط المكتملة تبقى محفوظة.</p></div><div class="actions"><button class="primary" onclick="continueSoloSession()">المحطة التالية ←</button><button class="quiet" onclick="discardSoloSession()">إنهاء الجلسة</button></div></section>` : ''}<div class="solo-columns"><section class="panel solo-builder"><span class="world-label">أنت ترتّب الجلسة</span><h2>وش نطوّر اليوم؟</h2><div class="fields"><div class="field full"><label for="soloSkill">المهارة</label><select id="soloSkill" onchange="saveSoloOptions()"><option value="all">تدريب متوازن · جميع المهارات</option>${soloSkills.map((s) => `<option value="${s.id}" ${prefs.skill === s.id ? 'selected' : ''}>${s.icon} ${s.name}</option>`).join('')}</select></div><div class="field"><label for="soloRounds">طول الجلسة</label><select id="soloRounds" onchange="saveSoloOptions()">${[3, 5, 8].map((n) => `<option value="${n}" ${prefs.rounds === n ? 'selected' : ''}>${n} جولات</option>`).join('')}</select></div><div class="field"><label for="soloLevel">مستوى البداية</label><select id="soloLevel" onchange="saveSoloOptions()">${['easy', 'normal', 'hard'].map((l) => `<option value="${l}" ${prefs.level === l ? 'selected' : ''}>${soloLevelLabel(l)}</option>`).join('')}</select></div><div class="field full"><label for="soloMode">طريقة التسجيل</label><select id="soloMode" onchange="saveSoloOptions()"><option value="practice" ${prefs.mode === 'practice' ? 'selected' : ''}>تدريب · سجل شخصي مستقل</option><option value="ranked" ${prefs.mode === 'ranked' ? 'selected' : ''}>نقاط · أضف النتائج للوحة اللمّة</option></select></div><div class="field"><label for="soloGoal">هدفك اليومي</label><select id="soloGoal" onchange="saveSoloOptions()">${Array.from(
      { length: 8 },
      (_, i) => i + 1,
    )
      .map(
        (n) => `<option value="${n}" ${p.goal === n ? 'selected' : ''}>${n} جولات يومياً</option>`,
      )
      .join(
        '',
      )}</select></div><div class="field"><label for="soloAdaptive">تطور المستوى</label><select id="soloAdaptive" onchange="saveSoloOptions()"><option value="yes" ${prefs.adaptive ? 'selected' : ''}>يتكيف مع نتيجتك</option><option value="no" ${!prefs.adaptive ? 'selected' : ''}>ثابت طوال الجلسة</option></select></div></div><div class="hintpanel">التدريب يُحفظ هنا، ولا يضيف نقاطاً أو إنجازات للوحة اللمّة. المستوى المتكيف يرتفع بعد 85/100 أو أكثر، وينخفض عند 40/100 أو أقل. كل محطة تُحسب من 100 حسب أقصى نتيجة لإعداداتها، وتضاف النتيجة نفسها للوحة اللمّة في وضع النقاط. لا يوجد وقت محدد للجلسة؛ كل لعبة لها وقتها.</div><div class="actions"><button class="primary" onclick="startSoloSession()">${p.active ? 'استبدلها بجلسة جديدة' : 'ابدأ جلستي'} ←</button><button onclick="openSoloCatalogue()">كل الألعاب الفردية</button></div></section><section class="panel solo-insight"><span class="world-label">خطوتك القادمة</span><h2>${recommendation.skill.icon} ${recommendation.count ? 'نطوّر ' + recommendation.skill.name : 'ابدأ بالذاكرة'}</h2><p class="muted">${recommendation.count ? `متوسط آخر ${recommendation.count} نتائج في ${recommendation.skill.name}: ${recommendation.average}/100. جلسة مركزة تساعدك تقارن تقدمك.` : 'كل مهارة لها طريقة مختلفة للتفكير. جرّب جلسة قصيرة؛ بعدها تظهر توصية من نتائجك الشخصية.'}</p><button onclick="soloTrainSkill('${recommendation.skill.id}')">جلسة ${recommendation.skill.name} ←</button><div class="solo-skills">${soloSkills
      .map((skill) => {
        const sample = soloSample(p, skill);
        return `<button onclick="soloTrainSkill('${skill.id}')"><span>${skill.icon}</span><div><b>${skill.name}</b><small>${sample.count ? `${sample.average}/100 · آخر ${sample.count} نتائج` : skill.desc}</small></div><span>←</span></button>`;
      })
      .join(
        '',
      )}</div><p class="note">التوصية تعتمد على آخر 8 نتائج لكل مهارة، وتشمل جولاتك المسجلة باسم ${esc(p.name)}.</p></section></div><section class="panel solo-log"><div class="sectionhead"><div><span class="world-label">سجلّك الخاص</span><h2>كل محاولة لها أثر.</h2></div><div><button class="linkbtn" onclick="openSoloProfiles()">إدارة الملفات</button><span class="note">${last ? 'آخر لعب: ' + new Date(last.at).toLocaleDateString('ar-KW') : 'أول جلسة تبدأ منك'}</span></div></div>${
      p.recent.length
        ? `<div class="solo-log-list">${p.recent
            .slice(0, 8)
            .map((r) => {
              const g = games.find((v) => v[0] === r.id);
              return `<div><span>${g[1]}</span><b>${esc(g[2])}<small>${r.mode === 'practice' ? 'تدريب' : 'نقاط'} · ${soloLevelLabel(r.level)} · ${r.seconds} ثانية</small></b><strong>${r.points}<small>/100</small></strong></div>`;
            })
            .join('')}</div>`
        : '<p class="muted">نتائج جلسات النادي تظهر هنا، وتبقى محفوظة لكل لاعب على هذا المتصفح.</p>'
    }</section></div>`,
  );
  updateDock();
}
function saveSoloOptions() {
  if (screen !== 'solo-hub' || !$('soloSkill')) return;
  const p = soloProfile();
  p.prefs = {
    skill: $('soloSkill').value,
    rounds: Number($('soloRounds').value),
    level: $('soloLevel').value,
    mode: $('soloMode').value,
    adaptive: $('soloAdaptive').value === 'yes',
  };
  p.goal = Number($('soloGoal').value);
  save();
}
function openSoloProfiles() {
  soloPendingRemoval = null;
  soloManageNames = store.extra.solo.profiles.map((p) => p.name);
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">ملفات النادي الفردي</h2><button onclick="closeModal()" aria-label="إغلاق">✕</button></div><p class="muted">${soloManageNames.length} من 24 ملفاً محفوظاً. حذف ملف يزيل سجله وجلساته وهدفه من النادي، ونقاط لوحة اللمّة وسجل الألعاب تبقى محفوظة.</p>${store.extra.solo.profiles.map((p, i) => `<div class="roundrow"><b>${esc(p.name)}<small style="display:block">${p.rounds} جولات · ${p.sessions} جلسات${p.active ? ' · جلسة غير مكتملة' : ''}</small></b><button onclick="confirmSoloProfileRemoval(${i})" aria-label="حذف ملف ${esc(p.name)}">حذف السجل</button></div>`).join('') || '<p class="note">لا توجد ملفات محفوظة.</p>'}`,
  );
}
function confirmSoloProfileRemoval(index) {
  const name = soloManageNames[index];
  if (!name || !soloProfile(name, false)) return;
  const token = storageToken();
  soloPendingRemoval = { name, token };
  openModal(
    `<div class="modalhead"><h2 id="modaltitle">حذف سجل ${esc(name)}؟</h2><button onclick="openSoloProfiles()" aria-label="العودة">←</button></div><div data-solo-confirm="${token}"><p class="muted">ستُحذف جلسات هذا الملف ونتائج تدريبه وهدفه. نقاط لوحة اللمّة والألعاب المحفوظة تبقى كما هي.</p><div class="actions"><button onclick="openSoloProfiles()">إلغاء</button><button class="primary" onclick="removeSoloProfile('${token}')">حذف سجل النادي</button></div></div>`,
  );
}
function removeSoloProfile(token) {
  const pending = soloPendingRemoval;
  if (
    !pending ||
    pending.token !== token ||
    $('modalback').hidden ||
    $('modal').querySelector('[data-solo-confirm]')?.dataset.soloConfirm !== token
  )
    return;
  const name = pending.name;
  soloPendingRemoval = null;
  save();
  store.extra.solo.profiles = store.extra.solo.profiles.filter((p) => p.name !== name);
  if (soloRound?.name === name) soloRound = null;
  save({ replace: true });
  closeModal(true);
  if (screen === 'solo-hub') renderSoloHub();
  else openSoloHub();
  toast('حُذف سجل النادي لهذا اللاعب.');
}
function soloTrainSkill(id) {
  if (screen !== 'solo-hub' || !soloSkills.some((s) => s.id === id)) return;
  $('soloSkill').value = id;
  saveSoloOptions();
  startSoloSession();
}
function openSoloCatalogue() {
  home();
  chooseSoloLobby();
}
function soloBuildQueue(profile, prefs) {
  const choices = (
    prefs.skill === 'all' ? soloSkills : soloSkills.filter((s) => s.id === prefs.skill)
  )
    .map((skill) => ({ skill, ...soloSample(profile, skill) }))
    .sort((a, b) => (a.average ?? 50) - (b.average ?? 50));
  const visits = new Map(),
    queue = [];
  for (let at = 0; at < prefs.rounds; at++) {
    const skill = choices[at % choices.length].skill,
      candidates = [...skill.games].sort((a, b) => {
        const count = (id) =>
          (visits.get(id) || 0) * 1000 + profile.recent.filter((v) => v.id === id).length;
        return count(a) - count(b) || skill.games.indexOf(a) - skill.games.indexOf(b);
      }),
      id = candidates.find((v) => v !== queue.at(-1)) || candidates[0];
    queue.push(id);
    visits.set(id, (visits.get(id) || 0) + 1);
  }
  return queue;
}
function startSoloSession() {
  if (screen !== 'solo-hub') return;
  saveSoloOptions();
  const p = soloProfile(),
    prefs = p.prefs;
  p.active = {
    token: storageToken(),
    name: p.name,
    queue: soloBuildQueue(p, prefs),
    at: 0,
    results: [],
    mode: prefs.mode,
    level: prefs.level,
    adaptive: prefs.adaptive,
    started: Date.now(),
  };
  save();
  continueSoloSession();
}
function discardSoloSession() {
  if (screen !== 'solo-hub') return;
  soloProfile().active = null;
  soloRound = null;
  save();
  renderSoloHub();
  toast('انتهت الجلسة. نتائج المحطات المكتملة محفوظة.');
}
function soloNextLevel(session) {
  const last = session.results.at(-1);
  if (!session.adaptive || !last) return session.level;
  const levels = ['easy', 'normal', 'hard'],
    at = levels.indexOf(last.level);
  return levels[
    Math.max(0, Math.min(2, at + (last.points >= 85 ? 1 : last.points <= 40 ? -1 : 0)))
  ];
}
function continueSoloSession(expectedToken, expectedAt) {
  save();
  const p = soloProfile(soloHubName, false),
    session = p?.active;
  if (
    !session ||
    !store.players.includes(p.name) ||
    (expectedToken && expectedToken !== session.token) ||
    (expectedAt !== undefined && expectedAt !== session.at)
  )
    return;
  if (soloRound && !soloRound.finished && screen !== 'solo-hub') return;
  const id = session.queue[session.at],
    push = screen === 'solo-hub';
  captureSoloSession();
  activeRoute = null;
  tourney = null;
  dailyRun = null;
  soloRound = {
    name: p.name,
    token: session.token,
    at: session.at,
    id,
    mode: session.mode,
    level: soloNextLevel(session),
    finished: false,
    started: 0,
    scored: false,
  };
  soloOpening = true;
  const historyHandling = navigationHistoryHandling;
  navigationHistoryHandling = true;
  try {
    setup(id, true);
  } finally {
    soloOpening = false;
    navigationHistoryHandling = historyHandling;
  }
  if (screen !== 'setup' || state?.id !== id) {
    soloRound = null;
    return;
  }
  soloConfigureRound(soloRound);
  navigationHistory('play', id, push);
}
function soloConfigureRound(round) {
  const value = (id, v, disabled = false) => {
      const el = $(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = v;
      else el.value = String(v);
      if (disabled) el.disabled = true;
    },
    level = round.level,
    easy = level === 'easy',
    hard = level === 'hard';
  value('player', store.players.indexOf(round.name), true);
  for (const field of ['level', 'labLevel', 'hangLevel', 'targetLevel']) value(field, level);
  value('difficulty', easy ? 4 : hard ? 12 : 6);
  value('memoryplay', 'solo', true);
  if ($('memoryplay')) memoryPlayChanged();
  value('memorymode', 'pictures');
  value('numberQuest', 'classic');
  value('numberMode', level);
  value('group', false, true);
  value('quizcount', 5);
  value('quizduration', hard ? 45 : easy ? 120 : 90);
  value('wordcount', 5);
  value('hangCount', 1);
  value('hangMode', 'classic');
  value('wordguessLength', easy ? 4 : 5);
  value('wordguessMode', hard ? 'focus' : 'classic');
  value('size', 3);
  value('codelength', easy ? 3 : hard ? 5 : 4);
  value('targetDuration', 30);
  if ($('soloRoundConfig'))
    $('soloRoundConfig').textContent =
      `المستوى المقترح: ${soloLevelLabel(level)} · يمكنك تعديل خيارات اللعبة قبل البداية.`;
  state.soloSessionToken = round.token;
}
function soloLinkedRound(id = state?.id) {
  const round = soloRound,
    p = round && soloProfile(round.name, false),
    s = p?.active;
  return round &&
    !round.finished &&
    round.id === id &&
    state?.id === id &&
    s?.token === round.token &&
    s.at === round.at &&
    !dailyRun &&
    !tourney?.active &&
    !activeRoute
    ? { round, profile: p, session: s }
    : null;
}
function soloElapsed(round) {
  const s = state;
  if (typeof s?.started === 'number' && s.started > 0) {
    const end = s.finishedAt || s.pausedAt || Date.now();
    return Math.max(0, Math.min(31536000, Math.floor((end - s.started) / 1000)));
  }
  return Math.max(
    0,
    Math.min(31536000, Math.floor((Date.now() - (round.started || Date.now())) / 1000)),
  );
}
function soloRoundPoints(id, points) {
  if (!Number.isFinite(points)) return 0;
  const s = state;
  let ceiling = 100;
  if (id === 'memory' && s?.pairs && !s.duo)
    ceiling = Math.min(100, 60 + s.pairs * 2 + Math.min(10, Math.max(0, s.pairs - 1) * 2));
  if (id === 'hangman' && s?.queue?.length) {
    const count = s.queue.length;
    ceiling = count * (s.mode === 'mission' ? 30 : 20);
    if (s.mode === 'rescue')
      ceiling += Array.from({ length: count }, (_, i) => Math.min(8, i * 2)).reduce(
        (n, v) => n + v,
        0,
      );
  }
  return Math.max(0, Math.min(100, Math.round((Math.max(0, points) * 100) / ceiling)));
}
const soloCapturePrevious = captureSoloSession;
captureSoloSession = function () {
  if (soloRound || state?.soloSessionToken) return;
  return soloCapturePrevious();
};
const soloSetupPrevious = setup;
setup = function (id, internal = false) {
  const previous = state,
    opening = soloOpening,
    refresh = !opening && internal && screen === 'setup' && soloLinkedRound(id),
    fields = refresh
      ? setupControls()
          .filter((el) => !el.disabled)
          .map((el) => ({ id: el.id, value: el.type === 'checkbox' ? el.checked : el.value }))
      : [];
  if (refresh && !store.players.includes(refresh.round.name)) return openSoloHub();
  if (!opening && !refresh && games.some((g) => g[0] === id)) soloRound = null;
  let outcome;
  if (refresh) soloOpening = true;
  try {
    outcome = soloSetupPrevious(id, internal);
  } finally {
    soloOpening = opening;
  }
  if (refresh && screen === 'setup' && state?.id === id) {
    soloConfigureRound(refresh.round);
    for (const field of fields) {
      const el = $(field.id);
      if (!el || el.disabled) continue;
      if (el.type === 'checkbox') el.checked = field.value;
      else if (
        el.tagName !== 'SELECT' ||
        [...el.options].some((option) => option.value === field.value)
      )
        el.value = field.value;
    }
    for (const field of fields)
      if ($(field.id)?.hasAttribute('onchange'))
        $(field.id).dispatchEvent(new Event('change', { bubbles: true }));
    for (const field of fields) {
      const el = $(field.id);
      if (!el || el.disabled || el.tagName !== 'INPUT') continue;
      if (el.type === 'checkbox') el.checked = field.value;
      else el.value = field.value;
      if (el.hasAttribute('oninput')) el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  if (state !== previous && screen === 'setup' && state?.id === id && !soloOpening && !refresh)
    soloRound = null;
  return outcome;
};
const soloHomePrevious = home;
home = function (options = {}) {
  soloRound = null;
  return soloHomePrevious(options);
};
const soloDockPrevious = updateDock;
updateDock = function () {
  soloDockPrevious();
  const button = document.querySelector('.dock button[onclick="openSoloHub()"]'),
    active = screen === 'solo-hub' || !!soloRound;
  button?.classList.toggle('active', active);
  if (active) button?.setAttribute('aria-current', 'page');
  else button?.removeAttribute('aria-current');
};
const soloPeoplePrevious = savePeople;
savePeople = function () {
  const outcome = soloPeoplePrevious();
  if (screen === 'solo-hub' && $('modalback').hidden) {
    if (!store.players.includes(soloHubName)) soloHubName = store.players[0];
    renderSoloHub();
  }
  return outcome;
};
const soloResumeClockPrevious = resumeClock;
resumeClock = function () {
  const pausedAt = state?.pausedAt,
    shiftFallback = soloRound?.started && !state?.started;
  const outcome = soloResumeClockPrevious();
  if (pausedAt && !state?.pausedAt && shiftFallback && soloRound)
    soloRound.started += Date.now() - pausedAt;
  return outcome;
};
const soloResumePrevious = resumeSavedGame;
resumeSavedGame = function () {
  soloRound = null;
  return soloResumePrevious();
};
const soloWrapPrevious = wrap;
wrap = function (id, body) {
  const linked = soloLinkedRound(id);
  if (linked) {
    const { round, session } = linked;
    state.soloSessionToken = round.token;
    if (screen !== 'setup' && !round.started) {
      round.started = Date.now();
      round.level = ['easy', 'normal', 'hard'].includes(state.level) ? state.level : round.level;
    }
    body = `<div class="solo-session-banner"><div><b>◎ ${round.mode === 'practice' ? 'تدريب شخصي' : 'جلسة نقاط'} · ${esc(round.name)}</b><small id="soloRoundConfig">${screen === 'setup' ? 'جهّز محطتك قبل البداية' : soloLevelLabel(round.level) + ' · ' + (round.mode === 'practice' ? 'النتيجة في سجل النادي فقط' : 'النقاط تضاف للوحة اللمّة')}</small></div><span>${round.at + 1} / ${session.queue.length}</span><button class="quiet" onclick="openSoloHub()">نكمل لاحقاً</button></div>${body}`;
  }
  return soloWrapPrevious(id, body);
};
const soloAddScorePrevious = addScore;
addScore = function (name, points) {
  if (state?.soloSessionToken && (!soloRound || soloRound.token !== state.soloSessionToken)) {
    state.roundRecorded = true;
    return;
  }
  if (soloRound && soloRound.id === state?.id) {
    save();
    const linked = soloLinkedRound();
    if (!linked || soloRound.scored) return;
    soloRound.scored = true;
    if (soloRound.mode === 'practice') {
      state.roundRecorded = true;
      return;
    }
    points = soloRoundPoints(state.id, points);
  }
  return soloAddScorePrevious(name, points);
};
const soloResultPrevious = result;
result = function (id, title, text, points = 0, detail = '') {
  if (state?.resultShown) return;
  const linked = soloLinkedRound(id),
    elapsed = linked ? soloElapsed(linked.round) : 0,
    stale = soloRound && soloRound.id === id && !soloRound.finished && !linked;
  const normalizedPoints = linked ? soloRoundPoints(id, points) : points;
  soloResultPrevious(id, title, text, normalizedPoints, detail);
  if (!linked) {
    if (stale) {
      soloRound.finished = true;
      const panel = $('app').querySelector('.celebrate');
      if (panel) {
        const chip = panel.querySelector('.chips .chip');
        if (chip) chip.textContent = 'هذه المحطة محفوظة مسبقاً';
        const actions = panel.querySelector('.actions');
        if (actions)
          actions.innerHTML =
            '<button class="primary" onclick="openSoloHub()">شوف تقدمك في النادي</button><button onclick="home()">العالم</button>';
      }
      toast('هذه المحطة اكتملت في نافذة أخرى. لم تُضف نقاط جديدة.');
    }
    return;
  }
  const { round } = linked,
    p = soloProfile(round.name, false),
    s = p?.active;
  round.finished = true;
  if (!s || s.token !== round.token || s.at !== round.at) {
    toast('هذه المحطة اكتملت في نافذة أخرى. تقدمك محفوظ في النادي.');
    return;
  }
  const earned = normalizedPoints,
    event = {
      rid: `${round.token}-${round.at}`,
      id,
      points: earned,
      at: Date.now(),
      mode: round.mode,
      level: round.level,
      seconds: elapsed,
      day: dayKey(),
      complete: s.at + 1 === s.queue.length,
    };
  if (!p.recent.some((v) => v.rid === event.rid)) {
    soloApplyEvent(p, event);
    p.recent.unshift(event);
    p.recent = p.recent.slice(0, 120);
  }
  s.results.push({ id, points: earned, level: round.level, seconds: elapsed });
  s.at++;
  const total = s.results.reduce((n, v) => n + v.points, 0),
    complete = s.at === s.queue.length,
    queueLength = s.queue.length,
    nextLevel = soloNextLevel(s);
  if (complete) p.active = null;
  save();
  const resultPanel = $('app').querySelector('.celebrate');
  if (resultPanel) {
    const chip = resultPanel.querySelector('.chips .chip');
    if (chip && round.mode === 'practice') chip.textContent = `${earned}/100 · نتيجة تدريب`;
    resultPanel.querySelector('.actions')?.remove();
  }
  $('app')
    .querySelector('.play')
    ?.insertAdjacentHTML(
      'beforeend',
      `<section class="panel solo-session-result"><span class="world-label">${complete ? '✓ جلسة مكتملة' : '✓ محطة محفوظة'}</span><h2>${complete ? 'خطوة جديدة في مستواك.' : 'استعد للتحدّي التالي.'}</h2><p class="muted">${total} من ${queueLength * 100} · ${complete ? queueLength + ' جولات مكتملة' : s.at + ' من ' + queueLength + ' جولات'}${round.mode === 'practice' ? ' · تدريب في سجلك الشخصي' : ' · النتائج أُضيفت للوحة اللمّة'}</p>${!complete && s.adaptive ? `<p class="note">المحطة التالية: ${soloLevelLabel(nextLevel)}${nextLevel !== round.level ? ' · المستوى تغير حسب نتيجتك' : ''}.</p>` : ''}<div class="actions">${!complete ? `<button class="primary" onclick="continueSoloSession('${s.token}',${s.at})">المحطة التالية ←</button>` : ''}<button class="${complete ? 'primary' : ''}" onclick="openSoloHub()">${complete ? 'شوف تقدّمك' : 'نكمل لاحقاً'}</button><button onclick="home()">العالم</button></div></section>`,
    );
};

// Starting another activity detaches the running station while retaining completed stations.
for (const key of [
  'startDaily',
  'startRoute',
  'continueRoute',
  'startTournament',
  'confirmImport',
]) {
  const previous = window[key];
  if (typeof previous === 'function')
    window[key] = function (...args) {
      soloRound = null;
      return previous(...args);
    };
}
const soloNavigationHistoryPrevious = navigationHistory;
navigationHistory = function (view, id = null, push = false) {
  const managed =
    view === 'play' && soloRound?.id === id && state?.soloSessionToken === soloRound.token;
  const outcome = soloNavigationHistoryPrevious(managed ? 'solo-play' : view, id, push);
  if (managed && !navigationHistoryHandling) {
    try {
      const data = {
        ...history.state,
        lammaView: {
          ...history.state.lammaView,
          solo: { name: soloRound.name, token: soloRound.token, at: soloRound.at },
        },
      };
      history.replaceState(data, '', location.href);
    } catch (e) {}
  }
  return outcome;
};
window.addEventListener('popstate', (event) => {
  const target = event.state?.lammaView;
  if (target?.version !== 1 || !['solo', 'solo-play'].includes(target.view)) return;
  navigationHomePoint = navigationCleanPoint(target.home);
  navigationHistoryHandling = true;
  try {
    openSoloHub(target.solo?.name);
    const profile = target.solo && soloProfile(target.solo.name, false);
    if (
      target.view === 'solo-play' &&
      profile?.active?.token === target.solo.token &&
      profile.active.at === target.solo.at &&
      store.players.includes(profile.name)
    )
      continueSoloSession(target.solo.token, target.solo.at);
  } finally {
    navigationHistoryHandling = false;
  }
});

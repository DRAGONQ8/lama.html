// Three pass-and-play party games. All secrets stay on the current device.
const partyGameIDs = new Set(['teamcup', 'undercover', 'improv']);
games.push(
  [
    'teamcup',
    '🏆',
    'كأس اللمّة',
    'فريقان، قادة يتبدلون، وتمثيل وكلمات ممنوعة وأسئلة في بطولة واحدة.',
    'جماعي · 4–12',
    '#ffd38c',
  ],
  [
    'undercover',
    '🥸',
    'الكلمة الدخيلة',
    'كلمات قريبة لكن مختلفة؛ أعطوا تلميحات، حللوا، وصوّتوا بسرية.',
    'جماعي · 3–12',
    '#c8b7ff',
  ],
  [
    'improv',
    '💡',
    'مجلس الإبداع',
    'ابتكروا ردوداً طريفة، اعرضوها بلا أسماء، وصوّتوا للأفضل.',
    'جماعي · 3–12',
    '#9fe5d5',
  ],
);
for (const id of partyGameIDs) gameWorld[id] = 'party';
timedGames.add('teamcup');
timedGames.add('undercover');
Object.assign(gameGuides, {
  teamcup: [
    'قسّموا اللمّة إلى فريقين. كل جولة تعطي الفريقين الوقت نفسه في التمثيل أو الكلمات الممنوعة أو المعلومات. أعلى مجموع يفوز بالكأس.',
    'القيادة تتناوب بين أعضاء الفريق. الصحيح +10، التجاوز −2، والكلمة الممنوعة −5. توزيع النقاط العامة متساوٍ داخل كل فريق، ومكافأة الفوز +10 لكل عضو.',
  ],
  undercover: [
    'كل لاعب يشاهد كلمة سرية. معظم اللاعبين لديهم الكلمة نفسها، وواحد أو اثنان لديهم كلمة قريبة مختلفة. لا أحد يعرف دوره حتى الكشف.',
    'أعطوا تلميحاً واحداً في كل دور دون ذكر الكلمة. بعد النقاش، مرّروا الجهاز للتصويت السري. كشف صاحب كلمة مختلفة يمنح الفريق العادي الفوز؛ التعادل يؤدي إلى إعادة تصويت واحدة.',
  ],
  improv: [
    'أمامكم موقف طريف. كل شخص يكتب رده بسرية، ثم تُعرض الردود بترتيب عشوائي ومن دون أسماء. يختار كل لاعب رداً واحداً غير رده.',
    'كل صوت يضيف 5 نقاط لصاحب الرد، وأصحاب أعلى عدد من الأصوات يأخذون مكافأة 10. اكتبوا ردوداً قصيرة لطيفة؛ الأسماء لا تظهر إلا بعد إقفال التصويت.',
  ],
});

const partyPairs = [
  ['قهوة', 'شاي'],
  ['بيتزا', 'فطيرة'],
  ['قطة', 'كلب'],
  ['بحر', 'مسبح'],
  ['قطار', 'مترو'],
  ['طائرة', 'هليكوبتر'],
  ['مكتبة', 'متحف'],
  ['قلم', 'فرشاة'],
  ['خيمة', 'كوخ'],
  ['شمس', 'قمر'],
  ['ثلج', 'مطر'],
  ['حذاء', 'صندل'],
  ['تفاح', 'كمثرى'],
  ['ليمون', 'برتقال'],
  ['دراجة', 'سكوتر'],
  ['حاسوب', 'تابلت'],
  ['مسرح', 'سينما'],
  ['مطعم', 'مقهى'],
  ['خبز', 'توست'],
  ['عسل', 'مربى'],
  ['ساعة', 'منبه'],
  ['حديقة', 'غابة'],
  ['نهر', 'شلال'],
  ['سلحفاة', 'حلزون'],
  ['ببغاء', 'عصفور'],
  ['نحلة', 'فراشة'],
  ['كرة سلة', 'كرة طائرة'],
  ['تنس', 'ريشة'],
  ['شطرنج', 'داما'],
  ['جيتار', 'عود'],
  ['طبل', 'دف'],
  ['حقيبة', 'محفظة'],
  ['غسالة', 'غسالة صحون'],
  ['ثلاجة', 'فريزر'],
  ['مصعد', 'سلم متحرك'],
  ['شمعة', 'مصباح'],
  ['شوربة', 'مرق'],
  ['فشار', 'شيبس'],
  ['كعكة', 'بسكويت'],
  ['عصير', 'سموذي'],
  ['جبل', 'تل'],
  ['جزيرة', 'شاطئ'],
  ['مخبز', 'محل حلويات'],
  ['سوق', 'مول'],
  ['حافلة', 'سيارة أجرة'],
  ['سفينة', 'قارب'],
  ['خريطة', 'بوصلة'],
  ['مظلة', 'معطف مطر'],
  ['كرسي', 'كنبة'],
  ['مرآة', 'نافذة'],
  ['كرة قدم', 'كرة يد'],
  ['زرافة', 'غزال'],
  ['دب', 'باندا'],
  ['بطريق', 'بطة'],
  ['أرز', 'معكرونة'],
  ['عدس', 'حمص'],
  ['روبوت', 'دمية'],
  ['نجار', 'حداد'],
  ['طبيب', 'ممرض'],
  ['رسالة', 'بطاقة تهنئة'],
];
const partyCreativePrompts = [
  'اختر اسماً لمطعم لا يقدم إلا البطاطس.',
  'لو تكلمت ثلاجتك، ما أول جملة تقولها؟',
  'اختر شعاراً لفريق يبحث دائماً عن جهاز التحكم.',
  'اكتب عذراً لطيفاً لتأخر بطل خارق عن إنقاذ قطة.',
  'اختر اسماً لكوكب سكانه يعشقون القيلولة.',
  'اكتب إعلاناً من سطر واحد لمظلة تكره المطر.',
  'ما الهدية المناسبة لروبوت في يوم ميلاده؟',
  'سمّ مدرسة تعلم القطط احترام الأثاث.',
  'ما أول قانون لو أصبحت مديراً لمدينة من الحلوى؟',
  'اكتب عنوان فيلم عن ملعقة تحلم بأن تصبح طائرة.',
  'اقترح اختراعاً يحل مشكلة ضياع الجوارب.',
  'ما اسم بطولة عالمية في ترتيب الوسائد؟',
  'اكتب رسالة قصيرة من نبتة تطلب إجازة.',
  'سمّ مقهى يزوره الأبطال الخارقون بعد العمل.',
  'اختر وظيفة جديدة لو صار للحيوانات مكتب توظيف.',
  'ما الجملة التي يكتبها القمر في يومياته؟',
  'اكتب تحذيراً طريفاً على علبة بسكويت سحرية.',
  'اختر اسم تطبيق لترجمة كلام البطاريق.',
  'ما نصيحة سحابة لصديقتها التي لا تمطر؟',
  'اكتب شعاراً لمتجر يبيع الوقت الإضافي.',
  'لو للمصعد هواية، ما هي؟',
  'سمّ فرقة موسيقية كل أعضائها أدوات مطبخ.',
  'ما أول سؤال تسأله لديناصور مهذب؟',
  'اكتب عنوان خبر عن سلحفاة فازت بسباق فوري.',
  'اختر كلمة مرور يستطيع السمك تذكرها.',
  'اقترح جائزة لأفضل شخص يختار مكان الطلعة.',
  'اكتب اسم فندق خاص بالحيوانات المحشوة.',
  'ما الشيء الذي يخبئه ساحر في حقيبة الرياضة؟',
  'سمّ رحلة سياحية إلى داخل شطيرة.',
  'اكتب أول رسالة من حذاء فقد شريكه.',
  'ما العنوان المناسب لكتاب مذكرات غسالة؟',
  'اختر تعويذة تحول الواجب إلى لعبة ممتعة.',
  'اقترح رياضة تجمع بين الشطرنج والتخييم.',
  'اكتب اسم مطار تستخدمه الفراشات.',
  'ماذا يطلب رجل الثلج في المطعم؟',
  'اختر لقباً لبطل خارق قوته فتح البرطمانات.',
  'اكتب شعاراً لنادي من ينسون أين وضعوا مفاتيحهم.',
  'اقترح اسم متحف للأشياء التي وجدناها تحت الكنبة.',
  'ما أول طلب لو صار جهاز التحكم يتمنى أمنية؟',
  'اكتب جملة ترحيب لمحل يبيع الأحلام الجميلة.',
  'لو صنعتم عطر اللمّة، ما اسمه؟',
  'اقترح نكهة آيس كريم تلائم رائد فضاء.',
  'ما اسم قارب صغير يخاف من الموج؟',
  'اكتب خطة من جملة واحدة لفتح مطعم على المريخ.',
  'اختر شعاراً لفريق يفوز بالضحك قبل النقاط.',
  'ما التطبيق الذي تتمنى شجرة تنزيله؟',
  'اكتب اسم دورة تدريبية للتنانين الصغار.',
  'ما النصيحة التي تقدمها وسادة لمنبه؟',
  'سمّ تحدياً يستطيع الجميع الفوز فيه معاً.',
  'اكتب عنوان قصة عن خريطة قررت أن تضيع.',
  'ما الاسم المناسب لمكتبة تطير بين المدن؟',
  'اختر شعاراً لسوق تبادل الأفكار المضحكة.',
  'اكتب سؤالاً تسأله لأول زائر من كوكب الجبن.',
  'ما المهنة المناسبة لفراشة تحب الحساب؟',
  'سمّ جائزة لأفضل صديق للنباتات.',
  'اكتب إعلاناً من جملة واحدة لحذاء يقودك إلى المغامرات.',
  'اختر اسم مدينة طرقها من المعكرونة.',
  'ما الشيء الذي يتمنى قلم الرصاص رسمه لنفسه؟',
  'اكتب قانوناً لطيفاً لجزيرة يعيش عليها الأصدقاء.',
  'اختر اسم مهرجان لكل من يحبون التجربة الأولى.',
];
const partyModes = [
  { id: 'mime', icon: '🎭', name: 'تمثيل', rule: 'مثّل بلا كلام، بلا أصوات، وبلا كتابة حروف.' },
  {
    id: 'taboo',
    icon: '🚫',
    name: 'كلمات ممنوعة',
    rule: 'اشرح بالكلام دون ذكر الكلمة أو جزء منها أو أي كلمة ممنوعة.',
  },
  {
    id: 'trivia',
    icon: '🧠',
    name: 'معلومات',
    rule: 'تشاوروا كفريق ثم اختاروا جواباً واحداً. كل سؤال يُحسب مرة واحدة.',
  },
];
const partyPreviousSetup = setup;
setup = function (id, internal = false) {
  if (!partyGameIDs.has(id)) return partyPreviousSetup(id, internal);
  if (typeof captureSoloSession === 'function') captureSoloSession();
  clearTimers();
  removePause();
  closeModal(true);
  tourney = null;
  dailyRun = null;
  recordRecent(id);
  screen = 'setup';
  state = { id, teams: id === 'teamcup' ? partyDraftTeams('balanced') : null };
  const minimum = id === 'teamcup' ? 4 : 3,
    enough = store.players.length >= minimum;
  const people = `<div class="party-people"><div><b>👥 ${store.players.length} لاعبين</b><p class="note">${store.players.map(esc).join(' · ')}</p></div><button onclick="openPeople()">تعديل اللاعبين</button></div>${enough ? '' : `<div class="hintpanel">أضيفوا ${minimum} لاعبين على الأقل لبدء هذه اللعبة.</div>`}`;
  let body = '';
  if (id === 'teamcup')
    body = `<p class="muted">بطولة للربع تجمع 3 أنواع تحديات. الفريقان يحصلان على الوقت نفسه، والقائد يتبدل كل جولة. تنتهي الجلسة بكأس ولوحة نتائج.</p>${people}<div class="fields"><div class="field"><label for="partyCycles">عدد جولات كل فريق</label><select id="partyCycles"><option value="3">3 جولات · جولة من كل نوع</option><option value="6" selected>6 جولات · بطولة كاملة</option><option value="9">9 جولات · سهرة طويلة</option></select></div><div class="field"><label for="partyDuration">وقت كل دور</label><select id="partyDuration"><option value="45">45 ثانية</option><option value="60" selected>60 ثانية</option><option value="90">90 ثانية</option></select></div><div class="field"><label for="partyDraft">توزيع الفرق</label><select id="partyDraft" onchange="partyRemixTeams()"><option value="balanced">متوازن حسب سجل النقاط</option><option value="random">عشوائي</option></select></div><div class="field"><label for="partyTeamA">اسم الفريق الأول</label><input id="partyTeamA" maxlength="18" value="الصقور"></div><div class="field"><label for="partyTeamB">اسم الفريق الثاني</label><input id="partyTeamB" maxlength="18" value="التنانين"></div></div><div id="partyTeamsPreview">${partyTeamsHTML(state.teams)}</div><div class="actions"><button onclick="partyRemixTeams()">🔀 توزيع جديد</button></div><div class="hintpanel">الصحيح +10 · التجاوز −2 · مخالفة الكلمات −5. بعد البطولة تُوزع نقاط الفريق بالتساوي بين أعضائه، ومكافأة الفوز +10. عدد الأعضاء يختلف بواحد فقط إذا كنتم عدداً فردياً.</div>`;
  if (id === 'undercover')
    body = `<p class="muted">الجميع يعرف كلمة، لكن بينكم كلمة دخيلة قريبة منها. الكلمات تُعرض سراً، وبعد التلميحات يصوّت كل شخص بعيداً عن أنظار الآخرين.</p>${people}<div class="fields"><div class="field"><label for="partyRounds">عدد الجولات</label><select id="partyRounds"><option value="1">جولة سريعة</option><option value="3" selected>3 جولات</option><option value="5">5 جولات</option></select></div><div class="field"><label for="partyHiddenCount">أصحاب الكلمة الدخيلة</label><select id="partyHiddenCount"><option value="1">لاعب واحد</option><option value="2" ${store.players.length < 7 ? 'disabled' : ''}>لاعبان · يحتاج 7 لاعبين</option></select></div><div class="field"><label for="partyClueRounds">دورات التلميحات</label><select id="partyClueRounds"><option value="1">تلميح من كل لاعب</option><option value="2" selected>تلميحان من كل لاعب</option></select></div><div class="field"><label for="partyDuration">وقت النقاش</label><select id="partyDuration"><option value="90">90 ثانية</option><option value="150" selected>150 ثانية</option><option value="240">240 ثانية</option><option value="0">بدون مؤقت</option></select></div></div><div class="hintpanel">لا تذكروا كلماتكم ولا تعرضوا الشاشة. استبعاد صاحب كلمة دخيلة يمنح العاديين +20، وتصويتهم الصحيح +10. إذا نجا الفريق الدخيل يأخذ كل عضو +30. التعادل يعيد التصويت مرة واحدة، وبعدها النجاة للفريق الدخيل.</div>`;
  if (id === 'improv')
    body = `<p class="muted">إجابات قصيرة، أفكار غير متوقعة، وتصويت سري. ردودكم تظهر بلا أسماء حتى تنتهي الأصوات؛ لا أحد يصوّت لرده.</p>${people}<div class="fields"><div class="field full"><label for="partyRounds">طول الجلسة</label><select id="partyRounds"><option value="3">3 مواقف · جلسة سريعة</option><option value="5" selected>5 مواقف</option><option value="8">8 مواقف · تحدي الإبداع</option></select></div></div><div class="hintpanel">60 موقفاً عائلياً في بنك اللعبة. كل صوت +5 لصاحب الرد، وأعلى الردود تحصل على +10 حتى في التعادل. اكتبوا ردوداً لطيفة؛ ما تحتاجون معلومات شخصية. تُحفظ نقاط الجلسة عند إكمالها.</div>`;
  setHTML(
    wrap(
      id,
      `<section class="panel party-panel">${body}<div class="actions"><button class="primary" onclick="startPartyGame('${id}')" ${enough ? '' : 'disabled'}>ابدأ اللمّة ←</button></div></section>`,
    ),
  );
  goTop();
};

function partyBlocked(id) {
  return (
    screen !== id ||
    state?.id !== id ||
    state.done ||
    state.pausedAt ||
    !$('modalback').hidden ||
    !!$('pausecover')
  );
}
function partyStage(id, stage) {
  return !partyBlocked(id) && state.stage === stage;
}
function partyReadOption(id, options, fallback) {
  const n = Number($(id)?.value);
  return options.includes(n) ? n : fallback;
}
function partyDraftTeams(mode) {
  const all = shuffle(store.players),
    teams = [[], []],
    strength = [0, 0];
  if (mode === 'balanced') all.sort((a, b) => partyStrength(b) - partyStrength(a));
  for (const name of all) {
    const team =
      teams[0].length !== teams[1].length
        ? teams[0].length < teams[1].length
          ? 0
          : 1
        : mode === 'balanced' && strength[0] !== strength[1]
          ? strength[0] < strength[1]
            ? 0
            : 1
          : randInt(2);
    teams[team].push(name);
    strength[team] += partyStrength(name);
  }
  return teams;
}
function partyStrength(name) {
  const score = store.scores[name];
  return score?.rounds ? score.points / score.rounds : 0;
}
function partyTeamsHTML(teams, names = ['الفريق الأول', 'الفريق الثاني'], scores = null) {
  return `<div class="party-teams">${teams.map((members, i) => `<div class="party-team party-team-${i}"><div class="party-team-title"><b>${i ? '🐉' : '🦅'} ${esc(names[i])}</b>${scores ? `<strong>${scores[i]}</strong>` : `<span>${members.length} لاعبين</span>`}</div><div class="party-members">${members.map((n) => `<span>${esc(n)}</span>`).join('')}</div></div>`).join('')}</div>`;
}
function partyRemixTeams() {
  if (screen !== 'setup' || state?.id !== 'teamcup') return;
  state.teams = partyDraftTeams($('partyDraft')?.value || 'balanced');
  $('partyTeamsPreview').innerHTML = partyTeamsHTML(state.teams, [
    $('partyTeamA').value.trim() || 'الفريق الأول',
    $('partyTeamB').value.trim() || 'الفريق الثاني',
  ]);
}
function partySessionScore(s) {
  return `<details class="history party-session"><summary>🏅 نقاط الجلسة</summary>${boardHTML(s.players, s.results)}</details>`;
}
function partyPrivateHandoff(id, name, label, button) {
  return `<section class="panel party-private center"><span class="party-lock" aria-hidden="true">🔒</span><p class="party-kicker">${label}</p><h2>الجهاز مع ${esc(name)}</h2><p class="note">مرّروا الجهاز، ثم افتحوا الشاشة بعيداً عن الآخرين.</p><div class="actions"><button class="primary" onclick="${button}">أنا ${esc(name)}، جاهز</button></div></section>`;
}
function startPartyGame(id) {
  if (screen !== 'setup' || state?.id !== id || !partyGameIDs.has(id)) return;
  const minimum = id === 'teamcup' ? 4 : 3;
  if (store.players.length < minimum) return toast(`أضيفوا ${minimum} لاعبين على الأقل.`);
  const players = [...store.players];
  const options = {
    rounds: partyReadOption('partyRounds', [1, 3, 5, 8], id === 'improv' ? 5 : 3),
    duration: partyReadOption(
      'partyDuration',
      [0, 45, 60, 90, 150, 240],
      id === 'teamcup' ? 60 : 150,
    ),
    cycles: partyReadOption('partyCycles', [3, 6, 9], 6),
    hiddenCount: players.length >= 7 ? partyReadOption('partyHiddenCount', [1, 2], 1) : 1,
    clueRounds: partyReadOption('partyClueRounds', [1, 2], 2),
  };
  const teams = state.teams,
    teamNames = [
      $('partyTeamA')?.value.trim() || 'الصقور',
      $('partyTeamB')?.value.trim() || 'التنانين',
    ];
  if (id === 'teamcup' && norm(teamNames[0]) === norm(teamNames[1]))
    return toast('اختاروا اسماً مختلفاً لكل فريق.');
  clearTimers();
  screen = id;
  state = {
    id,
    players,
    results: Object.fromEntries(players.map((n) => [n, 0])),
    done: false,
    round: 0,
    ...options,
  };
  if (id === 'teamcup') {
    Object.assign(state, {
      teams,
      teamNames,
      turn: 0,
      teamScores: [0, 0],
      history: [],
      decks: {
        mime: shuffle(items.map((v) => v.name)),
        taboo: shuffle(tabooDeck),
        trivia: shuffle(triviaBank),
      },
      deckIndex: { mime: 0, taboo: 0, trivia: 0 },
      onPause: () => {
        if (state?.id === 'teamcup' && state.stage === 'active' && state.mode !== 'trivia') {
          state.hiddenCard = true;
          renderTeamCup();
        }
      },
    });
    teamCupHandoff();
  } else if (id === 'undercover') {
    Object.assign(state, { pairs: shuffle(partyPairs), onPause: partyUndercoverPause });
    undercoverRound();
  } else {
    Object.assign(state, {
      prompts: shuffle(partyCreativePrompts).slice(0, options.rounds),
      onPause: partyCreativePause,
    });
    creativeRound();
  }
  goTop();
}

// Team tournament: equal timed turns, rotating captains and one final score write.
function teamCupInfo() {
  const s = state,
    cycle = Math.floor(s.turn / 2),
    team = ((s.turn % 2) + Math.floor(cycle / 3)) % 2;
  return {
    cycle,
    team,
    captain: s.teams[team][cycle % s.teams[team].length],
    mode: partyModes[cycle % partyModes.length],
  };
}
function teamCupHandoff() {
  const s = state;
  clearTimers();
  s.endAt = 0;
  if (s.turn >= s.cycles * 2) return finishTeamCup();
  s.stage = 'handoff';
  const info = teamCupInfo();
  s.mode = info.mode.id;
  setHTML(
    wrap(
      'teamcup',
      `${partyTeamsHTML(s.teams, s.teamNames, s.teamScores)}<section class="panel center party-round-card"><p class="party-kicker">الجولة ${info.cycle + 1} / ${s.cycles} · ${info.mode.icon} ${info.mode.name}</p><h2>دور فريق ${esc(s.teamNames[info.team])}</h2><div class="party-captain">القائد: <b>${esc(info.captain)}</b></div><p class="note">${info.mode.rule}</p><p class="note">${s.duration} ثانية · ${info.mode.id === 'trivia' ? 'الشاشة يشاهدها الفريق كله، والخصم يراقب.' : 'الشاشة للقائد فقط، زملاؤه يخمنون، والخصم يراقب الوقت.'}</p><div class="actions"><button class="primary" onclick="teamCupBegin()">الفريق جاهز، ابدأ الوقت</button></div></section>`,
    ),
  );
}
function teamCupBegin() {
  if (!partyStage('teamcup', 'handoff')) return;
  Object.assign(state, {
    stage: 'active',
    turnScore: 0,
    correct: 0,
    skips: 0,
    violations: 0,
    turnLog: [],
    hiddenCard: false,
    endAt: Date.now() + state.duration * 1000,
    feedback: null,
  });
  teamCupNextCard();
  renderTeamCup();
  const s = state;
  repeat(() => {
    if (state !== s || s.stage !== 'active' || partyBlocked('teamcup')) return;
    const seconds = partySeconds(s);
    if ($('teamCupClock')) $('teamCupClock').textContent = seconds;
    if ($('teamCupTimebar')) $('teamCupTimebar').style.width = (seconds / s.duration) * 100 + '%';
    if (!seconds) teamCupEndTurn();
  }, 100);
}
function partySeconds(s = state) {
  return Math.max(0, Math.ceil((s.endAt - (s.pausedAt || Date.now())) / 1000));
}
function teamCupNextCard() {
  const s = state,
    mode = s.mode;
  if (s.deckIndex[mode] >= s.decks[mode].length) {
    const last = s.card;
    s.decks[mode] = shuffle(s.decks[mode]);
    if (s.decks[mode].length > 1 && s.decks[mode][0] === last)
      [s.decks[mode][0], s.decks[mode][1]] = [s.decks[mode][1], s.decks[mode][0]];
    s.deckIndex[mode] = 0;
  }
  s.card = s.decks[mode][s.deckIndex[mode]++];
  s.feedback = null;
  if (mode === 'trivia') s.choices = shuffle(s.card.choices);
}
function renderTeamCup() {
  const s = state,
    info = teamCupInfo();
  let card = '';
  if (s.mode === 'trivia')
    card = `<h3 class="party-question">${esc(s.card.question)}</h3><div class="party-answers">${s.choices.map((c, i) => `<button class="${s.feedback ? (c === s.card.answer ? 'party-correct' : i === s.feedback.choice ? 'party-wrong' : '') : ''}" onclick="teamCupTrivia(${i})" ${s.feedback ? 'disabled' : ''}>${esc(c)}${s.feedback && c === s.card.answer ? ' ✓' : ''}</button>`).join('')}</div>${s.feedback ? `<div class="hintpanel" role="status"><b>${s.feedback.correct ? 'صح! +10' : 'نحاول في السؤال التالي'}</b><p>${esc(s.card.explanation)}</p></div><div class="actions"><button class="primary" onclick="teamCupTriviaNext()">السؤال التالي ←</button></div>` : '<p class="note center">تشاوروا ثم سجّلوا إجابة واحدة.</p>'}`;
  else
    card = s.hiddenCard
      ? `<div class="party-secret-card"><span class="party-lock">🔒</span><h3>البطاقة مخفية</h3><p class="note">الوقت مستمر؛ أظهرها للقائد فقط.</p><button onclick="teamCupToggleCard()">إظهار البطاقة</button></div>`
      : `<div class="party-secret-card"><p class="party-kicker">${s.mode === 'mime' ? 'مثّل بدون كلام' : 'اشرح دون الكلمات الممنوعة'}</p><div class="party-secret-word">${esc(s.mode === 'mime' ? s.card : s.card[0])}</div>${
          s.mode === 'taboo'
            ? `<div class="party-forbidden">${s.card
                .slice(1, 5)
                .map((w) => `<span>${esc(w)}</span>`)
                .join('')}</div>`
            : ''
        }</div><div class="actions"><button class="primary" onclick="teamCupRecord('correct')">عرفوها! +10</button><button onclick="teamCupRecord('skip')">تجاوز −2</button>${s.mode === 'taboo' ? '<button class="softred" onclick="teamCupRecord(\'violation\')">مخالفة −5</button>' : ''}</div>`;
  setHTML(
    wrap(
      'teamcup',
      `<div class="party-matchbar"><span>${info.mode.icon} ${esc(s.teamNames[info.team])}</span><b>${esc(info.captain)}</b><strong>${s.turnScore} نقطة</strong></div><section class="panel party-panel"><div class="party-clockline"><span>الجولة ${info.cycle + 1} / ${s.cycles}</span><b class="countdown" id="teamCupClock">${partySeconds()}</b><span>${info.mode.name}</span></div><div class="party-time-track"><span id="teamCupTimebar" style="width:${(partySeconds() / s.duration) * 100}%"></span></div>${card}<p class="note center party-turn-summary">✓ ${s.correct} صحيح · ↷ ${s.skips} تجاوز${s.mode === 'taboo' ? ` · ✕ ${s.violations} مخالفة` : ''}</p><div class="actions">${s.mode !== 'trivia' ? `<button onclick="teamCupToggleCard()">${s.hiddenCard ? 'إظهار' : 'إخفاء'} البطاقة</button><button onclick="teamCupUndo()" ${s.turnLog.length ? '' : 'disabled'}>↶ تراجع</button>` : ''}<button class="quiet" onclick="teamCupEndTurn()">أنهِ دور الفريق</button></div></section>`,
    ),
  );
}
function teamCupToggleCard() {
  if (!partyStage('teamcup', 'active') || state.mode === 'trivia') return;
  if (!partySeconds()) return teamCupEndTurn();
  state.hiddenCard = !state.hiddenCard;
  renderTeamCup();
}
function teamCupRecord(action) {
  if (
    !partyStage('teamcup', 'active') ||
    state.mode === 'trivia' ||
    !['correct', 'skip', 'violation'].includes(action)
  )
    return;
  if (!partySeconds()) return teamCupEndTurn();
  if (action === 'violation' && state.mode !== 'taboo') return;
  const s = state;
  s.turnLog.push({
    action,
    word: s.mode === 'mime' ? s.card : s.card[0],
    card: s.card,
    deck: [...s.decks[s.mode]],
    index: s.deckIndex[s.mode],
    score: s.turnScore,
    correct: s.correct,
    skips: s.skips,
    violations: s.violations,
  });
  if (action === 'correct') {
    s.correct++;
    s.turnScore += 10;
    tone();
  } else if (action === 'skip') {
    s.skips++;
    s.turnScore = Math.max(0, s.turnScore - 2);
  } else {
    s.violations++;
    s.turnScore = Math.max(0, s.turnScore - 5);
  }
  s.hiddenCard = false;
  teamCupNextCard();
  renderTeamCup();
}
function teamCupUndo() {
  if (!partyStage('teamcup', 'active') || state.mode === 'trivia' || !state.turnLog.length) return;
  if (!partySeconds()) return teamCupEndTurn();
  const s = state,
    h = s.turnLog.pop();
  Object.assign(s, {
    card: h.card,
    turnScore: h.score,
    correct: h.correct,
    skips: h.skips,
    violations: h.violations,
    hiddenCard: false,
  });
  s.decks[s.mode] = h.deck;
  s.deckIndex[s.mode] = h.index;
  renderTeamCup();
}
function teamCupTrivia(choice) {
  if (
    !partyStage('teamcup', 'active') ||
    state.mode !== 'trivia' ||
    state.feedback ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= state.choices.length
  )
    return;
  if (!partySeconds()) return teamCupEndTurn();
  const s = state,
    correct = s.choices[choice] === s.card.answer;
  s.feedback = { choice, correct };
  s.turnLog.push({ action: correct ? 'correct' : 'wrong', word: s.card.question });
  if (correct) {
    s.turnScore += 10;
    s.correct++;
    tone();
  }
  renderTeamCup();
}
function teamCupTriviaNext() {
  if (!partyStage('teamcup', 'active') || state.mode !== 'trivia' || !state.feedback) return;
  if (!partySeconds()) return teamCupEndTurn();
  teamCupNextCard();
  renderTeamCup();
}
function teamCupEndTurn() {
  if (!partyStage('teamcup', 'active')) return;
  const s = state,
    info = teamCupInfo();
  clearTimers();
  s.stage = 'turn-result';
  s.endAt = 0;
  s.teamScores[info.team] += s.turnScore;
  s.history.push({
    team: info.team,
    captain: info.captain,
    mode: info.mode.name,
    score: s.turnScore,
    correct: s.correct,
    words: s.turnLog.map((h) => ({ action: h.action, word: h.word })),
  });
  tone(true);
  setHTML(
    wrap(
      'teamcup',
      `${partyTeamsHTML(s.teams, s.teamNames, s.teamScores)}<section class="panel center"><p class="party-kicker">${info.mode.icon} انتهى دور ${esc(s.teamNames[info.team])}</p><div class="resultnum">${s.turnScore}</div><p class="note">${s.correct} صحيح · القائد ${esc(info.captain)}</p><details class="history"><summary>سجل دور الفريق</summary><div class="listchips">${s.turnLog.map((h) => `<span>${h.action === 'correct' ? '✓' : h.action === 'skip' ? '↷' : '✕'} ${esc(h.word)}</span>`).join('') || '<span>لم تُسجّل إجابات</span>'}</div></details><div class="actions"><button class="primary" onclick="teamCupAdvance()">${s.turn + 1 === s.cycles * 2 ? 'تتويج الفائز' : 'الدور التالي'} ←</button></div></section>`,
    ),
  );
}
function teamCupAdvance() {
  if (!partyStage('teamcup', 'turn-result')) return;
  state.turn++;
  teamCupHandoff();
}
function finishTeamCup() {
  const s = state;
  if (s.done) return;
  s.done = true;
  const tied = s.teamScores[0] === s.teamScores[1],
    winner = s.teamScores[0] > s.teamScores[1] ? 0 : 1;
  s.teams.forEach((team, i) =>
    team.forEach((name) => {
      s.results[name] =
        Math.floor(s.teamScores[i] / team.length) + (!tied && i === winner ? 10 : 0);
      addScore(name, s.results[name]);
    }),
  );
  tone(true);
  setHTML(
    wrap(
      'teamcup',
      `<section class="panel success celebrate center"><span class="party-trophy">${tied ? '🤝' : '🏆'}</span><h2>${tied ? 'تعادل بطعم الفوز' : `الكأس لفريق ${esc(s.teamNames[winner])}`}</h2><p class="note">انتهت ${s.cycles} جولات لكل فريق. انحفظت النقاط العامة لكل لاعب.</p>${partyTeamsHTML(s.teams, s.teamNames, s.teamScores)}${boardHTML(s.players, s.results)}<details class="history"><summary>مسار البطولة · ${s.history.length} أدوار</summary><div class="party-timeline">${s.history.map((h, i) => `<div><span>${i + 1}</span><p><b>${esc(s.teamNames[h.team])}</b> · ${esc(h.mode)}<small>${esc(h.captain)} · ${h.correct} صحيح</small></p><strong>${h.score}</strong></div>`).join('')}</div></details><div class="actions"><button class="primary" onclick="setup('teamcup')">بطولة جديدة</button><button onclick="home()">عالم الألعاب</button></div></section>`,
    ),
  );
}

// Undercover: equal-looking secret cards, private ballots and one fair runoff.
function undercoverRound() {
  const s = state;
  clearTimers();
  const pair = shuffle(s.pairs[s.round % s.pairs.length]),
    hidden = shuffle(s.players.map((_, i) => i)).slice(0, s.hiddenCount);
  Object.assign(s, {
    pair,
    hidden,
    revealIndex: 0,
    clueIndex: 0,
    clueOrder: shuffle(s.players.map((_, i) => i)),
    votes: [],
    voteIndex: 0,
    voteChoice: null,
    voteCandidates: s.players.map((_, i) => i),
    runoff: false,
    stage: 'reveal-handoff',
    endAt: 0,
  });
  renderUndercoverHandoff();
}
function renderUndercoverHandoff() {
  const s = state,
    name = s.players[s.revealIndex];
  setHTML(
    wrap(
      'undercover',
      `<div class="party-status"><span>الجولة ${s.round + 1} / ${s.rounds}</span><span>البطاقة ${s.revealIndex + 1} / ${s.players.length}</span></div>${partyPrivateHandoff('undercover', name, 'كلمتك لا يراها غيرك', 'undercoverReveal()')}`,
    ),
  );
}
function undercoverReveal() {
  if (!partyStage('undercover', 'reveal-handoff')) return;
  state.stage = 'reveal-view';
  const s = state,
    word = s.hidden.includes(s.revealIndex) ? s.pair[1] : s.pair[0];
  setHTML(
    wrap(
      'undercover',
      `<section class="panel party-private center"><p class="party-kicker">الكلمة السرية لـ ${esc(s.players[s.revealIndex])}</p><div class="party-secret-word">${esc(word)}</div><p class="note">احفظها. لا تقولها نفسها، ولا تسأل الآخرين عن كلماتهم.</p><p class="note">الكلمة وحدها لا تكشف لك هل أنت من الفريق الدخيل.</p><div class="actions"><button class="primary" onclick="undercoverHide()">حفظتها، أخفِ الشاشة</button></div></section>`,
    ),
  );
}
function undercoverHide() {
  if (!partyStage('undercover', 'reveal-view')) return;
  const s = state;
  s.revealIndex++;
  if (s.revealIndex === s.players.length) {
    s.stage = 'discussion-ready';
    setHTML(
      wrap(
        'undercover',
        `<section class="panel center"><span class="party-lock">🗣️</span><h2>الجميع شاف كلمته</h2><p class="note">أعطوا ${s.clueRounds === 2 ? 'تلميحين' : 'تلميحاً'} من كل شخص بالترتيب. لا تقولوا الكلمة نفسها. الهدف اكتشاف صاحب كلمة مختلفة.</p><div class="actions"><button class="primary" onclick="undercoverDiscuss()">ابدأوا التلميحات والنقاش</button></div></section>`,
      ),
    );
  } else {
    s.stage = 'reveal-handoff';
    renderUndercoverHandoff();
  }
}
function undercoverDiscuss() {
  if (!partyStage('undercover', 'discussion-ready')) return;
  const s = state;
  s.stage = 'discussion';
  s.endAt = s.duration ? Date.now() + s.duration * 1000 : 0;
  renderUndercoverDiscussion();
  if (s.duration)
    repeat(() => {
      if (state !== s || s.stage !== 'discussion' || partyBlocked('undercover')) return;
      const seconds = partySeconds(s);
      if ($('undercoverClock')) $('undercoverClock').textContent = seconds + ' ث';
      if (!seconds) undercoverStartVote();
    }, 200);
}
function renderUndercoverDiscussion() {
  const s = state,
    total = s.players.length * s.clueRounds,
    current = s.clueIndex < total ? s.clueOrder[s.clueIndex % s.players.length] : null;
  setHTML(
    wrap(
      'undercover',
      `<div class="party-status"><span>الجولة ${s.round + 1} / ${s.rounds}</span><b id="undercoverClock">${s.duration ? partySeconds() + ' ث' : 'بدون مؤقت'}</b><span>${s.hiddenCount} كلمة دخيلة</span></div><section class="panel center"><p class="party-kicker">${current === null ? 'التلميحات اكتملت' : `دورة التلميحات ${Math.floor(s.clueIndex / s.players.length) + 1} / ${s.clueRounds}`}</p><h2>${current === null ? 'ناقشوا من المختلف' : `تلميح من ${esc(s.players[current])}`}</h2><p class="note">قولوا وصفاً قصيراً يرتبط بالكلمة؛ لا تذكروها ولا تشيروا إلى حروفها.</p><div class="party-speakers">${s.clueOrder.map((n, i) => `<span class="${n === current ? 'current' : i < s.clueIndex % s.players.length || current === null ? 'spoken' : ''}">${n === current ? '🎤 ' : ''}${esc(s.players[n])}</span>`).join('')}</div><div class="actions">${current !== null ? '<button class="primary" onclick="undercoverNextClue()">تم التلميح، التالي ←</button>' : ''}<button ${current === null ? 'class="primary"' : ''} onclick="undercoverStartVote()">ابدأوا التصويت السري</button></div><p class="note">التصويت لا يستبعد أحداً حتى يُسجّل الجميع أصواتهم.</p></section>${partySessionScore(s)}`,
    ),
  );
}
function undercoverNextClue() {
  if (
    !partyStage('undercover', 'discussion') ||
    state.clueIndex >= state.players.length * state.clueRounds
  )
    return;
  if (state.duration && !partySeconds()) return undercoverStartVote();
  state.clueIndex++;
  renderUndercoverDiscussion();
}
function undercoverStartVote() {
  if (!partyStage('undercover', 'discussion')) return;
  clearTimers();
  Object.assign(state, {
    endAt: 0,
    votes: [],
    voteIndex: 0,
    voteChoice: null,
    stage: 'vote-handoff',
  });
  renderUndercoverVoteHandoff();
}
function renderUndercoverVoteHandoff() {
  const s = state;
  setHTML(
    wrap(
      'undercover',
      `<div class="party-status"><span>${s.runoff ? 'إعادة التصويت' : 'التصويت السري'}</span><span>${s.voteIndex + 1} / ${s.players.length}</span></div>${partyPrivateHandoff('undercover', s.players[s.voteIndex], 'صوتك لا يراه الآخرون', 'undercoverOpenVote()')}`,
    ),
  );
}
function undercoverOpenVote() {
  if (!partyStage('undercover', 'vote-handoff')) return;
  state.stage = 'vote-view';
  state.voteChoice = null;
  renderUndercoverVote();
}
function renderUndercoverVote() {
  const s = state;
  setHTML(
    wrap(
      'undercover',
      `<section class="panel party-private"><p class="party-kicker">صوت ${esc(s.players[s.voteIndex])} · ${s.runoff ? 'بين المتعادلين فقط' : 'من صاحب الكلمة الدخيلة؟'}</p><h2>اختر شخصاً غير نفسك</h2><div class="party-ballots">${s.voteCandidates
        .filter((i) => i !== s.voteIndex)
        .map(
          (i) =>
            `<button class="${s.voteChoice === i ? 'selected' : ''}" aria-pressed="${s.voteChoice === i}" onclick="undercoverChoose(${i})">${esc(s.players[i])}${s.voteChoice === i ? ' ✓' : ''}</button>`,
        )
        .join(
          '',
        )}<button class="${s.voteChoice === -1 ? 'selected' : ''}" aria-pressed="${s.voteChoice === -1}" onclick="undercoverChoose(-1)">امتنع عن التصويت</button></div><div class="actions"><button class="primary" onclick="undercoverConfirmVote()" ${s.voteChoice === null ? 'disabled' : ''}>ثبّت صوتي وأخفِ الشاشة</button></div><p class="note">الأصوات والنتيجة تُكشف بعد الجميع. الامتناع لا يحسب لأي لاعب.</p></section>`,
    ),
  );
}
function undercoverChoose(i) {
  if (
    !partyStage('undercover', 'vote-view') ||
    !Number.isInteger(i) ||
    i === state.voteIndex ||
    (i !== -1 && !state.voteCandidates.includes(i))
  )
    return;
  state.voteChoice = i;
  renderUndercoverVote();
}
function undercoverConfirmVote() {
  if (!partyStage('undercover', 'vote-view') || state.voteChoice === null) return;
  const s = state;
  s.votes.push(s.voteChoice);
  s.voteIndex++;
  s.voteChoice = null;
  if (s.voteIndex === s.players.length) return undercoverTally();
  s.stage = 'vote-handoff';
  renderUndercoverVoteHandoff();
}
function undercoverTally() {
  const s = state,
    tally = s.players.map(() => 0);
  s.votes.forEach((i) => {
    if (i >= 0) tally[i]++;
  });
  s.tally = tally;
  const max = Math.max(...tally),
    top = max ? tally.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0) : [];
  if (top.length > 1 && !s.runoff) {
    s.stage = 'tie';
    s.voteCandidates = top;
    return setHTML(
      wrap(
        'undercover',
        `<section class="panel center"><span class="party-lock">🤝</span><h2>تعادل في التصويت</h2><p class="note">${top.map((i) => esc(s.players[i])).join(' · ')} حصلوا على ${max} أصوات لكل شخص.</p><p class="note">ناقشوا مرة قصيرة، ثم أعيدوا التصويت بين هؤلاء فقط. إذا تكرر التعادل يفوز الفريق الدخيل بالنجاة.</p><div class="actions"><button class="primary" onclick="undercoverRunoff()">ابدأ إعادة التصويت</button></div></section>`,
      ),
    );
  }
  finishUndercoverRound(top.length === 1 ? top[0] : null);
}
function undercoverRunoff() {
  if (!partyStage('undercover', 'tie')) return;
  Object.assign(state, {
    runoff: true,
    votes: [],
    voteIndex: 0,
    voteChoice: null,
    stage: 'vote-handoff',
  });
  renderUndercoverVoteHandoff();
}
function finishUndercoverRound(eliminated) {
  const s = state,
    normalWin = eliminated !== null && s.hidden.includes(eliminated);
  s.stage = 'round-result';
  s.roundPoints = s.players.map((name, i) => {
    const points = s.hidden.includes(i)
      ? normalWin
        ? 0
        : 30
      : (normalWin ? 20 : 0) + (s.hidden.includes(s.votes[i]) ? 10 : 0);
    s.results[name] += points;
    addScore(name, points);
    return points;
  });
  tone(true);
  setHTML(
    wrap(
      'undercover',
      `<section class="panel ${normalWin ? 'success' : ''} center"><span class="party-trophy">${normalWin ? '🔍' : '🥸'}</span><h2>${normalWin ? 'كشفتوا الكلمة الدخيلة!' : 'الفريق الدخيل نجا!'}</h2><p class="note">${eliminated === null ? 'لم يُحسم شخص واحد في التصويت.' : `صوّتت اللمّة لاستبعاد ${esc(s.players[eliminated])}.`}</p><div class="party-word-reveal"><div><small>الكلمة الأصلية</small><b>${esc(s.pair[0])}</b></div><div><small>الكلمة الدخيلة</small><b>${esc(s.pair[1])}</b></div></div><p class="note">الفريق الدخيل: ${s.hidden.map((i) => esc(s.players[i])).join(' · ')}</p><div class="party-vote-results">${s.players.map((n, i) => `<div><span>${s.hidden.includes(i) ? '🥸' : '👤'} ${esc(n)}</span><span>${s.tally[i]} أصوات</span><b>+${s.roundPoints[i]}</b></div>`).join('')}</div><details class="history"><summary>الأصوات بعد إقفال الجولة</summary><div class="party-timeline">${s.players.map((n, i) => `<div><p>${esc(n)} ← ${s.votes[i] < 0 ? 'امتناع' : esc(s.players[s.votes[i]])}</p></div>`).join('')}</div></details><div class="actions"><button class="primary" onclick="undercoverAdvance()">${s.round + 1 === s.rounds ? 'نتيجة الجلسة' : 'جولة بكلمات جديدة'} ←</button></div></section>${partySessionScore(s)}`,
    ),
  );
}
function undercoverAdvance() {
  if (!partyStage('undercover', 'round-result')) return;
  state.round++;
  if (state.round === state.rounds) return finishPartySession('undercover', 'محققو اللمّة', false);
  undercoverRound();
}
function partyUndercoverPause() {
  if (state?.id !== 'undercover') return;
  if (state.stage === 'reveal-view') {
    state.stage = 'reveal-handoff';
    renderUndercoverHandoff();
  } else if (state.stage === 'vote-view') {
    state.stage = 'vote-handoff';
    state.voteChoice = null;
    renderUndercoverVoteHandoff();
  }
}

// Creative council: all answers collected first, shuffled and anonymous until tally.
function creativeRound() {
  const s = state;
  clearTimers();
  Object.assign(s, {
    stage: 'prompt',
    answerIndex: 0,
    answerDraft: '',
    entries: [],
    voteIndex: 0,
    votes: [],
    voteChoice: null,
    prompt: s.prompts[s.round],
    endAt: 0,
  });
  setHTML(
    wrap(
      'improv',
      `<section class="panel party-prompt-card center"><p class="party-kicker">الموقف ${s.round + 1} / ${s.rounds}</p><span class="party-lock">💡</span><h2>${esc(s.prompt)}</h2><p class="note">أعطوا الفكرة لحظة، ثم كل شخص يكتب رده الخاص. الردود ستظهر بلا أسماء.</p><div class="actions"><button class="primary" onclick="creativeStartAnswers()">ابدأ كتابة الردود</button></div></section>${partySessionScore(s)}`,
    ),
  );
}
function creativeStartAnswers() {
  if (!partyStage('improv', 'prompt')) return;
  state.stage = 'answer-handoff';
  renderCreativeHandoff();
}
function renderCreativeHandoff() {
  const s = state;
  setHTML(
    wrap(
      'improv',
      `<div class="party-status"><span>الرد ${s.answerIndex + 1} / ${s.players.length}</span><span>الموقف ${s.round + 1} / ${s.rounds}</span></div>${partyPrivateHandoff('improv', s.players[s.answerIndex], 'اكتب فكرتك بسرية', 'creativeOpenAnswer()')}`,
    ),
  );
}
function creativeOpenAnswer() {
  if (!partyStage('improv', 'answer-handoff')) return;
  const s = state;
  s.stage = 'answer-view';
  setHTML(
    wrap(
      'improv',
      `<section class="panel party-private"><p class="party-kicker">رد ${esc(s.players[s.answerIndex])}</p><h3 class="party-question">${esc(s.prompt)}</h3><label for="creativeAnswer">ردك · 120 حرفاً كحد أقصى</label><textarea id="creativeAnswer" class="party-textarea" maxlength="120" rows="3" placeholder="فكرة خفيفة ومبتكرة…" oninput="creativeDraftUpdate()">${esc(s.answerDraft)}</textarea><p class="note" id="creativeCounter">${s.answerDraft.length} / 120</p><div class="actions"><button class="primary" onclick="creativeSubmit()">احفظ ردي وأخفِ الشاشة</button></div><p class="note">لا تكتب اسمك. الأجمل فكرة لطيفة يفهمها الجميع.</p></section>`,
    ),
  );
  $('creativeAnswer').focus();
}
function creativeDraftUpdate() {
  if (screen !== 'improv' || state?.stage !== 'answer-view') return;
  state.answerDraft = $('creativeAnswer').value.slice(0, 120);
  $('creativeCounter').textContent = state.answerDraft.length + ' / 120';
}
function creativeSubmit() {
  if (!partyStage('improv', 'answer-view')) return;
  const s = state,
    answer = latin($('creativeAnswer').value).trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!answer) {
    toast('اكتب رداً قبل تمرير الجهاز.');
    return $('creativeAnswer').focus();
  }
  s.entries.push({ author: s.answerIndex, text: answer });
  s.answerDraft = '';
  s.answerIndex++;
  if (s.answerIndex === s.players.length) {
    s.entries = shuffle(s.entries);
    s.stage = 'gallery';
    return renderCreativeGallery();
  }
  s.stage = 'answer-handoff';
  renderCreativeHandoff();
}
function partyCreativeCards(s, vote = false) {
  return `<div class="party-creative-cards">${s.entries
    .map((entry, i) => {
      const own = vote && entry.author === s.voteIndex;
      return vote
        ? `<button class="party-creative-entry ${s.voteChoice === i ? 'selected' : ''}" onclick="creativeChoose(${i})" ${own ? 'disabled' : ''} aria-pressed="${s.voteChoice === i}"><span class="party-entry-number">${i + 1}</span><span>${esc(entry.text)}${own ? '<small>ردك · لا يمكنك التصويت له</small>' : ''}</span>${s.voteChoice === i ? '<b>✓</b>' : ''}</button>`
        : `<div class="party-creative-entry"><span class="party-entry-number">${i + 1}</span><p>${esc(entry.text)}</p></div>`;
    })
    .join('')}</div>`;
}
function renderCreativeGallery() {
  const s = state;
  setHTML(
    wrap(
      'improv',
      `<section class="panel"><p class="party-kicker">الردود بلا أسماء · الموقف ${s.round + 1}</p><h3 class="party-question">${esc(s.prompt)}</h3>${partyCreativeCards(s)}<p class="note center">اقرؤوا جميع الردود معاً. التصويت سري، ولكل شخص صوت واحد لرد غير رده.</p><div class="actions"><button class="primary" onclick="creativeStartVoting()">ابدأ التصويت</button></div></section>`,
    ),
  );
}
function creativeStartVoting() {
  if (!partyStage('improv', 'gallery')) return;
  state.stage = 'creative-vote-handoff';
  renderCreativeVoteHandoff();
}
function renderCreativeVoteHandoff() {
  const s = state;
  setHTML(
    wrap(
      'improv',
      `<div class="party-status"><span>صوت ${s.voteIndex + 1} / ${s.players.length}</span><span>الموقف ${s.round + 1} / ${s.rounds}</span></div>${partyPrivateHandoff('improv', s.players[s.voteIndex], 'اختر الرد الذي أعجبك', 'creativeOpenVote()')}`,
    ),
  );
}
function creativeOpenVote() {
  if (!partyStage('improv', 'creative-vote-handoff')) return;
  state.stage = 'creative-vote-view';
  state.voteChoice = null;
  renderCreativeVote();
}
function renderCreativeVote() {
  const s = state;
  setHTML(
    wrap(
      'improv',
      `<section class="panel party-private"><p class="party-kicker">التصويت السري لـ ${esc(s.players[s.voteIndex])}</p><h3 class="party-question">${esc(s.prompt)}</h3>${partyCreativeCards(s, true)}<div class="actions"><button class="primary" onclick="creativeConfirmVote()" ${s.voteChoice === null ? 'disabled' : ''}>ثبّت صوتي وأخفِ الشاشة</button></div><p class="note center">صوّت للفكرة، لا تحاول تخمين صاحبها.</p></section>`,
    ),
  );
}
function creativeChoose(i) {
  if (
    !partyStage('improv', 'creative-vote-view') ||
    !Number.isInteger(i) ||
    !state.entries[i] ||
    state.entries[i].author === state.voteIndex
  )
    return;
  state.voteChoice = i;
  renderCreativeVote();
}
function creativeConfirmVote() {
  if (!partyStage('improv', 'creative-vote-view') || state.voteChoice === null) return;
  const s = state;
  if (s.entries[s.voteChoice]?.author === s.voteIndex) return;
  s.votes.push(s.voteChoice);
  s.voteChoice = null;
  s.voteIndex++;
  if (s.voteIndex === s.players.length) return creativeTally();
  s.stage = 'creative-vote-handoff';
  renderCreativeVoteHandoff();
}
function creativeTally() {
  const s = state,
    counts = s.entries.map(() => 0);
  s.votes.forEach((i) => counts[i]++);
  const highest = Math.max(...counts);
  s.stage = 'creative-result';
  const results = s.entries
    .map((entry, i) => {
      const points = counts[i] * 5 + (counts[i] === highest ? 10 : 0);
      s.results[s.players[entry.author]] += points;
      return { ...entry, votes: counts[i], points, winning: counts[i] === highest };
    })
    .sort((a, b) => b.votes - a.votes);
  tone(true);
  setHTML(
    wrap(
      'improv',
      `<section class="panel center"><span class="party-trophy">✨</span><h2>أفكار اللمّة كشفت أصحابها</h2><p class="note">${esc(s.prompt)}</p><div class="party-creative-results">${results.map((entry) => `<div class="${entry.winning ? 'winning' : ''}"><div class="party-creative-author"><b>${entry.winning ? '🏅 ' : ''}${esc(s.players[entry.author])}</b><strong>+${entry.points}</strong></div><p>${esc(entry.text)}</p><small>${entry.votes} أصوات${entry.winning ? ' · مكافأة أفضل رد +10' : ''}</small></div>`).join('')}</div><div class="actions"><button class="primary" onclick="creativeAdvance()">${s.round + 1 === s.rounds ? 'نتيجة الجلسة' : 'موقف جديد'} ←</button></div></section>${partySessionScore(s)}`,
    ),
  );
}
function creativeAdvance() {
  if (!partyStage('improv', 'creative-result')) return;
  state.round++;
  if (state.round === state.rounds) return finishPartySession('improv', 'نجوم الإبداع', true);
  creativeRound();
}
function partyCreativePause() {
  if (state?.id !== 'improv') return;
  if (state.stage === 'answer-view') {
    state.answerDraft = $('creativeAnswer')?.value.slice(0, 120) || state.answerDraft;
    state.stage = 'answer-handoff';
    renderCreativeHandoff();
  } else if (state.stage === 'creative-vote-view') {
    state.stage = 'creative-vote-handoff';
    state.voteChoice = null;
    renderCreativeVoteHandoff();
  }
}
function finishPartySession(id, title, saveScores) {
  const s = state;
  if (s.done) return;
  clearTimers();
  s.done = true;
  if (saveScores) s.players.forEach((n) => addScore(n, s.results[n]));
  const best = Math.max(...s.players.map((n) => s.results[n])),
    winners = s.players.filter((n) => s.results[n] === best);
  setHTML(
    wrap(
      id,
      `<section class="panel success celebrate center"><span class="party-trophy">🏆</span><h2>${esc(title)}</h2><p class="party-champions">${winners.map(esc).join(' · ')}</p><p class="note">اكتملت ${s.rounds} جولات. نقاط اللمّة انحفظت في اللوحة العامة.</p>${boardHTML(s.players, s.results)}<div class="actions"><button class="primary" onclick="setup('${id}')">جلسة جديدة</button><button onclick="home()">عالم الألعاب</button></div></section>`,
    ),
  );
  tone(true);
}

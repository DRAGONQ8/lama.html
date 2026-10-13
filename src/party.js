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
    'القيادة تتناوب بين أعضاء الفريق وبين أنواع التحديات. الصحيح +10، التجاوز −2، والمخالفة −5. بطاقة المضاعفة مرة في الدور تضاعف مكسب البطاقة أو عقوبتها، وجواب المعلومات الخاطئ معها −10. تكتيك السلسلة اختياري: كل 3 إجابات صحيحة متتالية +5. مثّل الموقف كاملًا ويُقبل وصف واضح للفعل. النقاط العامة توزّع بالتساوي داخل الفريق، ومكافأة الفوز +10 لكل عضو.',
  ],
  undercover: [
    'كل لاعب يشاهد كلمة سرية. معظم اللاعبين لديهم الكلمة نفسها، وواحد أو اثنان لديهم كلمة قريبة مختلفة. لا أحد يعرف دوره حتى الكشف.',
    'أعطوا تلميحاً واحداً في كل دور وفق الزاوية المقترحة دون ذكر الكلمة. يمكن بعد التلميحات أن يسأل كل لاعب شخصاً آخر وتُدوّن الإجابة كدليل علني. مرّروا الجهاز للتصويت السري مع درجة ثقة لا تؤثر على النقاط. كشف صاحب كلمة مختلفة يمنح الفريق العادي الفوز؛ التعادل يعيد التصويت مرة واحدة، ثم تكشف الأدلة والأصوات.',
  ],
  improv: [
    'أمامكم موقف طريف. كل شخص يكتب رده بسرية، ثم تُعرض الردود بترتيب عشوائي ومن دون أسماء. يختار كل لاعب رداً واحداً غير رده.',
    'كل صوت أول +5، وأصحاب أعلى عدد من الأصوات الأولى يأخذون مكافأة +10. في التحكيم الموسع اختاروا رداً آخر للتقدير +2؛ لا تكرروا الرد ولا تختاروا ردكم. يتبدّل معيار التحكيم بين الطرافة والأصالة والوضوح، وكلمة الإلهام اختيارية. الأسماء لا تظهر إلا بعد إقفال التصويت.',
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
const partyCreativeFormats = {
  free: { name: 'أفكار مفتوحة', limit: 120, rule: 'رد قصير ولطيف يفهمه الجميع.' },
  short: {
    name: 'تحدي الرد الخاطف',
    limit: 40,
    rule: 'عبّر عن فكرتك في 40 حرفاً فقط؛ الاختصار جزء من التحدي.',
  },
  seven: {
    name: 'قصة من سبع كلمات',
    limit: 120,
    rule: 'اكتب ردك في سبع كلمات بالضبط؛ المسافات تفصل الكلمات.',
  },
};
const partyPairCategories = {
  all: { name: 'كل المواضيع' },
  food: {
    name: 'أكل ومشروبات',
    words: [
      'قهوة',
      'بيتزا',
      'تفاح',
      'ليمون',
      'مطعم',
      'خبز',
      'عسل',
      'شوربة',
      'فشار',
      'كعكة',
      'عصير',
      'مخبز',
      'أرز',
      'عدس',
    ],
  },
  nature: {
    name: 'طبيعة وحيوانات',
    words: [
      'قطة',
      'بحر',
      'شمس',
      'ثلج',
      'حديقة',
      'نهر',
      'سلحفاة',
      'ببغاء',
      'نحلة',
      'جبل',
      'جزيرة',
      'زرافة',
      'دب',
      'بطريق',
    ],
  },
  everyday: {
    name: 'أشياء من يومنا',
    words: [
      'قلم',
      'حذاء',
      'دراجة',
      'حاسوب',
      'ساعة',
      'حقيبة',
      'غسالة',
      'ثلاجة',
      'مصعد',
      'شمعة',
      'خريطة',
      'مظلة',
      'كرسي',
      'مرآة',
      'رسالة',
    ],
  },
};
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
// Actions give the mime captain something concrete to perform, rather than only a noun.
const partyMimeScenes = [
  'تحاول فتح مظلة في يوم عاصف',
  'تحمل صينية قهوة دون أن تسكبها',
  'تبحث عن نظارتك وهي فوق رأسك',
  'تركب حصاناً لأول مرة',
  'تحاول التقاط صورة جماعية بالمؤقت',
  'تمشي على أرض شديدة الحرارة',
  'تفتح هدية كبيرة فتجد علبة صغيرة',
  'تحاول إخراج قطة من تحت الكنبة',
  'تتعلم التزلج وتفقد توازنك',
  'تغيّر إطار سيارة',
  'تحاول النفخ في بالون مثقوب',
  'تصطاد سمكة أكبر من قاربك',
  'تخبز كعكة وتحترق أطرافها',
  'تنظف نافذة عالية',
  'تحاول النوم بجانب منبه مزعج',
  'تجمع ملابس طارت من الحبل',
  'تسقي نبتة ثم تكتشف أنها صناعية',
  'تتسلل إلى المطبخ دون إيقاظ أحد',
  'تلبس حذاء ضيقاً ثم تمشي به',
  'تقود سيارة في ازدحام',
  'تعيد ترتيب حقيبة سفر ممتلئة',
  'تصنع قلعة رمل وتأتي موجة',
  'تبحث عن جهاز تحكم بين الوسائد',
  'تفتح برطماناً محكماً',
  'تتذوق حساء ساخناً جداً',
  'تلتقط كرة ثم تعيدها للحارس',
  'تصعد سلماً وأنت تحمل صندوقاً',
  'تصلح صنبوراً يرش الماء',
  'تزرع بذرة وتراقبها وهي تنمو',
  'تقود طائرة ورقية',
  'تتحدث إلى روبوت لا يفهم الإشارة',
  'تضع خيمة ثم تنام داخلها',
  'تلف هدية بشريط لاصق يعلق بيدك',
  'تحاول ارتداء معطف بالمقلوب',
  'تعزف على آلة بلا صوت',
  'تطارد فراشة ثم تطلقها',
  'تنقل كوب ماء فوق رأسك',
  'تصل إلى محطة بعد مغادرة القطار',
  'تجرب مصعداً سريعاً',
  'توازن بين أكياس التسوق',
  'تعلّم طفلاً ركوب الدراجة',
  'تدرب كلباً على الجلوس',
  'تعد نقوداً ثم يطير بعضها',
  'تمسح أرضاً ثم تنزلق عليها',
  'تقيس قطعة أثاث لباب صغير',
  'تمارس اليوغا مع فقدان التوازن',
  'تخيط زراً بخيط قصير',
  'تحاول قراءة خريطة بالمقلوب',
];
const partyExtraTaboo = [
  ['جواز سفر', 'سفر', 'مطار', 'دولة', 'هوية'],
  ['غواصة', 'بحر', 'ماء', 'سفينة', 'عمق'],
  ['بطارية', 'شحن', 'كهرباء', 'هاتف', 'طاقة'],
  ['إشارة مرور', 'أحمر', 'أخضر', 'سيارة', 'شارع'],
  ['بوصلة', 'شمال', 'اتجاه', 'خريطة', 'مغناطيس'],
  ['عدسة', 'كاميرا', 'عين', 'نظارة', 'صورة'],
  ['مخبز', 'خبز', 'فرن', 'عجين', 'طحين'],
  ['مظلة', 'مطر', 'شمس', 'حماية', 'فتح'],
  ['شلال', 'ماء', 'نهر', 'سقوط', 'جبل'],
  ['مصعد', 'طابق', 'صعود', 'نزول', 'درج'],
  ['حقيبة ظهر', 'حمل', 'مدرسة', 'كتف', 'سفر'],
  ['منطاد', 'هواء', 'بالون', 'سماء', 'طيران'],
  ['تلسكوب', 'نجوم', 'فضاء', 'عدسة', 'سماء'],
  ['سماعات', 'أذن', 'صوت', 'موسيقى', 'استماع'],
  ['مزرعة', 'زراعة', 'حيوان', 'أرض', 'حصاد'],
  ['مرساة', 'سفينة', 'بحر', 'تثبيت', 'حبل'],
  ['سبورة', 'مدرسة', 'طباشير', 'كتابة', 'معلم'],
  ['بذرة', 'نبات', 'زرع', 'شجرة', 'أرض'],
  ['متحف', 'آثار', 'قديم', 'فن', 'معرض'],
  ['خيمة', 'تخييم', 'قماش', 'نوم', 'رحلة'],
  ['مسرح', 'تمثيل', 'جمهور', 'ستارة', 'عرض'],
  ['جسر', 'نهر', 'عبور', 'طريق', 'ضفة'],
  ['مدفأة', 'حرارة', 'شتاء', 'نار', 'دفء'],
  ['لغز', 'حل', 'سؤال', 'تفكير', 'جواب'],
];
const partyClueLenses = [
  ['ارتباط', 'صف شيئاً يرتبط بكلمتك دون ذكرها.'],
  ['موقف', 'في أي موقف قد تستعملها أو تصادفها؟ صف الموقف.'],
  ['إحساس', 'صف صوتاً أو ملمساً أو إحساساً تتخيله معها.'],
  ['مقارنة', 'صف ما يميزها عن شيء يشبهها، دون تسمية ذلك الشيء.'],
];
const partyCreativeCriteria = [
  { name: 'أطرف فكرة', rule: 'صوّت للرد الذي رسم ابتسامة، مع احترام الجميع.' },
  { name: 'أكثر فكرة أصالة', rule: 'صوّت لزاوية جديدة لم تتوقعها.' },
  { name: 'أوضح فكرة', rule: 'صوّت لفكرة بسيطة توصل المعنى من أول قراءة.' },
];
const partySparkWords = [
  'قمر',
  'مفتاح',
  'غيمة',
  'جوارب',
  'مظلة',
  'كنبة',
  'فراشة',
  'ساعة',
  'بطاطس',
  'جزيرة',
  'روبوت',
  'وسادة',
];
function partyChoice(id, label, choices) {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">${choices.map(([value, name]) => `<option value="${value}">${name}</option>`).join('')}</select></div>`;
}
function partySetting(id, values, fallback) {
  const value = $(id)?.value;
  return values.includes(value) ? value : fallback;
}
const partyPreviousSetup = setup;
let partyActionSerial = 0;
function partyWrap(id, body) {
  return wrap(id, `${screen === id && state?.id === id ? partyFlow(state) : ''}${body}`);
}
function partyFlow(s) {
  const steps =
    s.id === 'teamcup'
      ? ['جاهزية الفريق', 'تحدي القائد', 'حصيلة الدور']
      : s.id === 'undercover'
        ? ['كلمات سرية', 'تلميحات ونقاش', 'تصويت سري', 'كشف النتيجة']
        : ['الموقف', 'ردود خاصة', 'معرض الأفكار', 'تصويت سري', 'النتيجة'];
  const stages =
    s.id === 'teamcup'
      ? { handoff: 0, active: 1, 'turn-result': 2 }
      : s.id === 'undercover'
        ? {
            'reveal-handoff': 0,
            'reveal-view': 0,
            'discussion-ready': 1,
            discussion: 1,
            'vote-handoff': 2,
            'vote-view': 2,
            tie: 2,
            'round-result': 3,
          }
        : {
            prompt: 0,
            'answer-handoff': 1,
            'answer-view': 1,
            'answer-preview': 1,
            gallery: 2,
            'creative-vote-handoff': 3,
            'creative-vote-view': 3,
            'creative-result': 4,
          };
  const current = s.done ? steps.length - 1 : (stages[s.stage] ?? 0);
  return `<ol class="party-flow" aria-label="مراحل اللعب">${steps.map((step, index) => `<li class="${index === current ? 'current' : index < current ? 'complete' : ''}" ${index === current ? 'aria-current="step"' : ''}><span aria-hidden="true">${index < current ? '✓' : index + 1}</span><b>${step}</b></li>`).join('')}</ol>`;
}
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
    body = `<p class="muted">بطولة للربع تجمع 3 أنواع تحديات. الفريقان يحصلان على الوقت نفسه، والقائد يتبدل كل جولة. تنتهي الجلسة بكأس ولوحة نتائج.</p>${people}<div class="fields"><div class="field"><label for="partyCycles">عدد جولات كل فريق</label><select id="partyCycles"><option value="3">3 جولات · جولة من كل نوع</option><option value="6" selected>6 جولات · بطولة كاملة</option><option value="9">9 جولات · سهرة طويلة</option></select></div><div class="field"><label for="partyDuration">وقت كل دور</label><select id="partyDuration"><option value="45">45 ثانية</option><option value="60" selected>60 ثانية</option><option value="90">90 ثانية</option></select></div><div class="field"><label for="partyDraft">توزيع الفرق</label><select id="partyDraft" onchange="partyRemixTeams()"><option value="balanced">متوازن حسب سجل النقاط</option><option value="random">عشوائي</option></select></div><div class="field"><label for="partyTeamA">اسم الفريق الأول</label><input id="partyTeamA" maxlength="18" value="الصقور"></div><div class="field"><label for="partyTeamB">اسم الفريق الثاني</label><input id="partyTeamB" maxlength="18" value="التنانين"></div></div><div id="partyTeamsPreview">${partyTeamsHTML(state.teams)}</div><div class="actions"><button onclick="partyRemixTeams()">🔀 توزيع جديد</button></div><div class="hintpanel">الصحيح +10 · التجاوز −2 · الكلام في التمثيل أو الكلمة الممنوعة −5. بطاقة المضاعفة مرة في كل دور: الصحيح +20، التجاوز −4، والمخالفة أو جواب المعلومات الخاطئ −10. بعد البطولة تُوزع نقاط الفريق بالتساوي بين أعضائه، ومكافأة الفوز +10. العقوبات تُحسب حتى لو صار رصيد الدور سالباً؛ النقاط العامة لا تنقص. عدد الأعضاء يختلف بواحد فقط إذا كنتم عدداً فردياً. القادة يتناوبون، ويتبدّل ترتيبهم بعد دورة كاملة حتى يجربوا تحديات مختلفة.</div>`;
  if (id === 'undercover')
    body = `<p class="muted">الجميع يعرف كلمة، لكن بينكم كلمة دخيلة قريبة منها. الكلمات تُعرض سراً، وبعد التلميحات يصوّت كل شخص بعيداً عن أنظار الآخرين.</p>${people}<div class="fields"><div class="field"><label for="partyRounds">عدد الجولات</label><select id="partyRounds"><option value="1">جولة سريعة</option><option value="3" selected>3 جولات</option><option value="5">5 جولات</option></select></div><div class="field"><label for="partyHiddenCount">أصحاب الكلمة الدخيلة</label><select id="partyHiddenCount"><option value="1">لاعب واحد</option><option value="2" ${store.players.length < 7 ? 'disabled' : ''}>لاعبان · يحتاج 7 لاعبين</option></select></div><div class="field"><label for="partyClueRounds">دورات التلميحات</label><select id="partyClueRounds"><option value="1">تلميح من كل لاعب</option><option value="2" selected>تلميحان من كل لاعب</option></select></div><div class="field"><label for="partyDuration">وقت النقاش</label><select id="partyDuration"><option value="90">90 ثانية</option><option value="150" selected>150 ثانية</option><option value="240">240 ثانية</option><option value="0">بدون مؤقت</option></select></div><div class="field"><label for="partyWordCategory">موضوع الكلمات</label><select id="partyWordCategory">${Object.entries(
      partyPairCategories,
    )
      .map(([id, category]) => `<option value="${id}">${category.name}</option>`)
      .join(
        '',
      )}</select></div></div><div class="hintpanel">لا تذكروا كلماتكم ولا تعرضوا الشاشة. استبعاد صاحب كلمة دخيلة يمنح العاديين +20، وتصويتهم الصحيح +10. إذا نجا الفريق الدخيل يأخذ كل عضو +30. التعادل يعيد التصويت مرة واحدة، وبعدها النجاة للفريق الدخيل.</div>`;
  if (id === 'improv')
    body = `<p class="muted">إجابات قصيرة، أفكار غير متوقعة، وتصويت سري. ردودكم تظهر بلا أسماء حتى تنتهي الأصوات؛ لا أحد يصوّت لرده.</p>${people}<div class="fields"><div class="field full"><label for="partyRounds">طول الجلسة</label><select id="partyRounds"><option value="3">3 مواقف · جلسة سريعة</option><option value="5" selected>5 مواقف</option><option value="8">8 مواقف · تحدي الإبداع</option></select></div><div class="field full"><label for="partyCreativeFormat">طريقة كتابة الرد</label><select id="partyCreativeFormat">${Object.entries(
      partyCreativeFormats,
    )
      .map(([id, format]) => `<option value="${id}">${format.name}</option>`)
      .join(
        '',
      )}</select></div></div><div class="hintpanel">60 موقفاً عائلياً في بنك اللعبة. كل صوت +5 لصاحب الرد، وأعلى الردود تحصل على +10 حتى في التعادل. اكتبوا ردوداً لطيفة؛ ما تحتاجون معلومات شخصية. تُحفظ نقاط الجلسة عند إكمالها.</div>`;
  if (id === 'teamcup')
    body += `<div class="fields party-extra-options">${partyChoice(
      'partyMimeDeck',
      'بطاقات التمثيل',
      [
        ['mixed', 'مواقف واقعية وأشياء'],
        ['scenes', 'مواقف حركية فقط'],
        ['objects', 'أشياء فقط'],
      ],
    )}${partyChoice('partyTeamTactic', 'تكتيك النقاط', [
      ['classic', 'النقاط الأساسية'],
      ['streak', 'سلسلة الفريق · كل 3 صح متتالٍ +5'],
    ])}</div><div class="party-explainer"><b>🎬 تحديات أقرب للحياة</b><p>48 موقفاً حركياً جديداً و24 بطاقة كلمات ممنوعة. قائد التمثيل يؤدي المشهد كاملًا؛ يكفي أن يصف الفريق الفعل بوضوح. مراقب من الخصم يسجّل المخالفة، والتراجع يصلح ضغطة غير مقصودة.</p></div>`;
  if (id === 'undercover')
    body += `<div class="fields party-extra-options">${partyChoice(
      'partyInquiry',
      'بعد التلميحات',
      [
        ['on', 'استجواب اختياري · سؤال لكل لاعب'],
        ['off', 'نقاش وتصويت مباشرة'],
      ],
    )}</div><div class="party-explainer"><b>🔍 ابنوا شكّكم على دليل</b><p>تتغير زاوية التلميح بين الدورات. بعد التلميحات يمكن لكل لاعب سؤال شخص آخر؛ الإجابات تظهر في دفتر الأدلة. أثناء التصويت اختاروا درجة الثقة، ثم راجعوا مدى دقة توقعاتكم بعد الكشف.</p></div>`;
  if (id === 'improv')
    body += `<div class="fields party-extra-options">${partyChoice(
      'partyCreativeBallot',
      'طريقة التحكيم',
      [
        ['single', 'صوت واحد · +5'],
        ['ranked', 'اختيار أول +5 وتقدير لرد آخر +2'],
      ],
    )}${partyChoice('partyCreativeCriterion', 'ما الذي نقيّمه؟', [
      ['rotate', 'معيار جديد لكل موقف'],
      ['funny', 'الطرافة طوال الجلسة'],
    ])}${partyChoice('partyCreativeSpark', 'كلمة الإلهام', [
      ['off', 'حرية كاملة'],
      ['on', 'كلمة مختلفة يجب تضمينها في كل موقف'],
    ])}</div><div class="party-explainer"><b>🎤 مجلس أكثر تفاعلاً</b><p>يمكن عرض الأفكار واحدة واحدة قبل التحكيم. الاختياران في التحكيم الموسع يجب أن يكونا لردين مختلفين، ولا يصوّت أحد لرده. كلمة الإلهام تضيف تحدياً مشتركاً للجميع.</p></div>`;
  setHTML(
    partyWrap(
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
function partyRematch(token = partyStageToken()) {
  const previous = state;
  if (
    !partyGameIDs.has(previous?.id) ||
    screen !== previous.id ||
    !previous.done ||
    !$('modalback').hidden ||
    $('pausecover') ||
    !partyAcceptStage(token)
  )
    return;
  const id = previous.id;
  setup(id);
  const values = {
    partyRounds: previous.rounds,
    partyDuration: previous.duration,
    partyCycles: previous.cycles,
    partyHiddenCount: previous.hiddenCount,
    partyClueRounds: previous.clueRounds,
    partyWordCategory: previous.wordCategory,
    partyMimeDeck: previous.mimeDeck,
    partyTeamTactic: previous.teamTactic,
    partyInquiry: previous.inquiry ? 'on' : 'off',
    partyCreativeFormat: previous.creativeFormat,
    partyCreativeBallot: previous.creativeBallot,
    partyCreativeCriterion: previous.creativeCriterion,
    partyCreativeSpark: previous.creativeSpark ? 'on' : 'off',
  };
  for (const [key, value] of Object.entries(values)) {
    const input = $(key);
    if (
      input &&
      [...input.options].some((option) => option.value === String(value) && !option.disabled)
    )
      input.value = String(value);
  }
  if (id === 'teamcup') {
    $('partyTeamA').value = previous.teamNames[0];
    $('partyTeamB').value = previous.teamNames[1];
    if (
      previous.teams.flat().length === store.players.length &&
      previous.teams.flat().every((name) => store.players.includes(name))
    )
      state.teams = previous.teams.map((team) => [...team]);
    $('partyTeamsPreview').innerHTML = partyTeamsHTML(state.teams, previous.teamNames);
  }
  startPartyGame(id);
}
function partyMetrics(items) {
  return `<div class="party-metrics">${items.map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('')}</div>`;
}
function partyTeamInsights(s) {
  return `<details class="history"><summary>📊 قوة الفريقين حسب التحدي</summary><div class="party-mode-results">${partyModes
    .map(
      (mode) =>
        `<section><b>${mode.icon} ${mode.name}</b>${s.teams
          .map((_, team) => {
            const rounds = s.history.filter((h) => h.team === team && h.mode === mode.name),
              score = rounds.reduce((sum, h) => sum + h.score, 0),
              correct = rounds.reduce((sum, h) => sum + h.correct, 0),
              attempts = rounds.reduce((sum, h) => sum + (h.attempts || h.words.length), 0);
            return `<p><span>${esc(s.teamNames[team])}</span><strong>${score} نقطة</strong><small>${correct} / ${attempts} صحيح${attempts ? ` · دقة ${Math.round((correct / attempts) * 100)}٪` : ''}</small></p>`;
          })
          .join('')}</section>`,
    )
    .join('')}</div></details>`;
}
function partyTeamTacticHTML(s) {
  if (s.teamTactic !== 'streak') return '';
  return `<div class="party-tactic" aria-live="polite"><b>🔥 سلسلة الفريق: ${s.streak}</b><span>أفضل سلسلة ${s.bestStreak} · مكافآت +${s.comboPoints}</span><div class="party-streak-track" aria-label="${s.streak % 3} من 3 إجابات للمكافأة">${[0, 1, 2].map((i) => `<i class="${i < s.streak % 3 ? 'complete' : ''}"></i>`).join('')}</div><small>كل ثلاث إجابات صحيحة متتالية +5. التجاوز أو الخطأ يقطع السلسلة.</small></div>`;
}
function partyTeamDebrief(s) {
  return `<div class="party-debrief"><h3>🧭 خطة البطولة القادمة</h3>${s.teams
    .map((_, team) => {
      const performances = partyModes
        .map((mode) => {
          const turns = s.history.filter((h) => h.team === team && h.mode === mode.name);
          const attempts = turns.reduce((sum, h) => sum + h.attempts, 0);
          return { mode, attempts, correct: turns.reduce((sum, h) => sum + h.correct, 0) };
        })
        .filter((result) => result.attempts);
      performances.sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);
      const weakest = performances[0],
        best = performances.at(-1),
        longest = Math.max(
          0,
          ...s.history.filter((h) => h.team === team).map((h) => h.bestStreak || 0),
        );
      return `<p><b>${esc(s.teamNames[team])}</b> · ${weakest ? `ابدؤوا بالتدرب على ${weakest.mode.name}. أفضل دقتكم كانت في ${best.mode.name}.` : 'جرّبوا تسجيل بطاقات في كل نوع حتى تظهر مقارنة الأداء.'}<small>أطول سلسلة ${longest} · ${s.history.filter((h) => h.team === team).reduce((sum, h) => sum + (h.comboPoints || 0), 0)} نقطة مكافآت</small></p>`;
    })
    .join('')}</div>`;
}
function partyPrivateHandoff(id, name, label, button) {
  state.privatePass = ++partyActionSerial;
  return `<section class="panel party-private center"><span class="party-lock" aria-hidden="true">🔒</span><p class="party-kicker">${label}</p><h2>الجهاز مع ${esc(name)}</h2><p class="note">مرّروا الجهاز، ثم افتحوا الشاشة بعيداً عن الآخرين.</p><div class="actions"><button class="primary" data-party-pass="${state.privatePass}" onclick="${button}">أنا ${esc(name)}، جاهز</button></div></section>`;
}
function partyPassToken() {
  return window.event?.currentTarget?.dataset?.partyPass;
}
function partyAcceptPass(token) {
  return token === undefined || String(token) === String(state?.privatePass);
}
function partyHidePrivate() {
  const s = state;
  if (!partyGameIDs.has(s?.id) || partyBlocked(s.id)) return false;
  if (s.id === 'teamcup' && s.stage === 'active' && s.mode !== 'trivia' && !s.hiddenCard) {
    s.hiddenCard = true;
    renderTeamCup();
  } else if (s.id === 'undercover' && ['reveal-view', 'vote-view'].includes(s.stage)) {
    partyUndercoverPause();
  } else if (
    s.id === 'improv' &&
    ['answer-view', 'answer-preview', 'creative-vote-view'].includes(s.stage)
  ) {
    partyCreativePause();
  } else return false;
  return true;
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && partyHidePrivate()) event.preventDefault();
});
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
    mimeDeck = partySetting('partyMimeDeck', ['mixed', 'scenes', 'objects'], 'mixed'),
    teamTactic = partySetting('partyTeamTactic', ['classic', 'streak'], 'classic'),
    inquiry = partySetting('partyInquiry', ['on', 'off'], 'on') === 'on',
    creativeBallot = partySetting('partyCreativeBallot', ['single', 'ranked'], 'single'),
    creativeCriterion = partySetting('partyCreativeCriterion', ['rotate', 'funny'], 'rotate'),
    creativeSpark = partySetting('partyCreativeSpark', ['on', 'off'], 'off') === 'on',
    wordCategory = Object.hasOwn(partyPairCategories, $('partyWordCategory')?.value)
      ? $('partyWordCategory').value
      : 'all',
    creativeFormat = Object.hasOwn(partyCreativeFormats, $('partyCreativeFormat')?.value)
      ? $('partyCreativeFormat').value
      : 'free',
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
      mimeDeck,
      teamTactic,
      decks: {
        mime: shuffle(
          mimeDeck === 'scenes'
            ? partyMimeScenes
            : mimeDeck === 'objects'
              ? items.map((v) => v.name)
              : [...items.map((v) => v.name), ...partyMimeScenes],
        ),
        taboo: shuffle([...tabooDeck, ...partyExtraTaboo]),
        trivia: shuffle(triviaBank),
      },
      deckIndex: { mime: 0, taboo: 0, trivia: 0 },
      cardToken: 0,
      onPause: () => {
        if (state?.id === 'teamcup' && state.stage === 'active' && state.mode !== 'trivia') {
          state.hiddenCard = true;
          renderTeamCup();
        }
      },
    });
    teamCupHandoff();
  } else if (id === 'undercover') {
    const category = partyPairCategories[wordCategory];
    Object.assign(state, {
      pairs: shuffle(
        partyPairs.filter((pair) => !category.words || category.words.includes(pair[0])),
      ),
      wordCategory,
      inquiry,
      history: [],
      roleCounts: players.map(() => 0),
      startingPlayer: randInt(players.length),
      onPause: partyUndercoverPause,
    });
    undercoverRound();
  } else {
    Object.assign(state, {
      prompts: shuffle(partyCreativePrompts).slice(0, options.rounds),
      creativeFormat,
      creativeBallot,
      creativeCriterion,
      creativeSpark,
      sparkWords: shuffle(partySparkWords),
      history: [],
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
    team = ((s.turn % 2) + cycle) % 2;
  return {
    cycle,
    team,
    captain:
      s.teams[team][(cycle + Math.floor(cycle / s.teams[team].length)) % s.teams[team].length],
    mode: partyModes[cycle % partyModes.length],
  };
}
function teamCupHandoff() {
  const s = state;
  clearTimers();
  s.endAt = 0;
  if (s.turn >= s.cycles * 2) return finishTeamCup();
  s.stage = 'handoff';
  s.stageToken = ++partyActionSerial;
  const info = teamCupInfo();
  s.mode = info.mode.id;
  setHTML(
    partyWrap(
      'teamcup',
      `${partyTeamsHTML(s.teams, s.teamNames, s.teamScores)}<section class="panel center party-round-card"><p class="party-kicker">الجولة ${info.cycle + 1} / ${s.cycles} · ${info.mode.icon} ${info.mode.name}</p><h2>دور فريق ${esc(s.teamNames[info.team])}</h2><div class="party-captain">القائد: <b>${esc(info.captain)}</b></div><p class="note">${info.mode.rule}</p><p class="note">${s.duration} ثانية · ${info.mode.id === 'trivia' ? 'الشاشة يشاهدها الفريق كله، والخصم يراقب.' : 'الشاشة للقائد فقط، زملاؤه يخمنون، والخصم يراقب الوقت.'}</p><div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="teamCupBegin()">الفريق جاهز، ابدأ الوقت</button></div></section>`,
    ),
  );
}
function teamCupBegin(token = partyStageToken()) {
  if (!partyStage('teamcup', 'handoff') || !partyAcceptStage(token)) return;
  Object.assign(state, {
    stage: 'active',
    turnScore: 0,
    correct: 0,
    skips: 0,
    violations: 0,
    turnLog: [],
    hiddenCard: false,
    boostUsed: false,
    boostActive: false,
    streak: 0,
    bestStreak: 0,
    comboPoints: 0,
    stageToken: ++partyActionSerial,
    endAt: Date.now() + state.duration * 1000,
    feedback: null,
  });
  teamCupNextCard();
  renderTeamCup();
  const s = state;
  repeat(() => {
    if (state !== s || s.stage !== 'active' || partyBlocked('teamcup')) return;
    const seconds = partySeconds(s);
    if ($('teamCupClock')) {
      $('teamCupClock').textContent = seconds;
      $('teamCupClock').classList.toggle('party-urgent', seconds <= 10);
    }
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
  s.cardToken = ++partyActionSerial;
  s.feedback = null;
  s.boostActive = false;
  if (mode === 'trivia') s.choices = shuffle(s.card.choices);
}
function renderTeamCup() {
  const s = state,
    info = teamCupInfo();
  let card = '';
  if (s.mode === 'trivia')
    card = `<h3 class="party-question">${esc(s.card.question)}</h3><div class="party-answers">${s.choices.map((c, i) => `<button class="${s.feedback ? (c === s.card.answer ? 'party-correct' : i === s.feedback.choice ? 'party-wrong' : '') : ''}" data-party-card="${s.cardToken}" onclick="teamCupTrivia(${i})" ${s.feedback ? 'disabled' : ''}>${esc(c)}${s.feedback && c === s.card.answer ? ' ✓' : ''}</button>`).join('')}</div>${s.feedback ? `<div class="hintpanel" role="status"><b>${s.feedback.correct ? `صح! +${s.feedback.points}` : s.feedback.points < 0 ? 'مخاطرة المضاعفة −10' : 'نحاول في السؤال التالي'}</b><p>${esc(s.card.explanation)}</p></div><div class="actions"><button class="primary" onclick="teamCupTriviaNext()">السؤال التالي ←</button></div>` : '<p class="note center">تشاوروا ثم سجّلوا إجابة واحدة.</p>'}`;
  else
    card = s.hiddenCard
      ? `<div class="party-secret-card"><span class="party-lock">🔒</span><h3>البطاقة مخفية</h3><p class="note">الوقت مستمر؛ أظهرها للقائد فقط.</p><button onclick="teamCupToggleCard()">إظهار البطاقة</button></div>`
      : `<div class="party-secret-card"><p class="party-kicker">${s.mode === 'mime' ? 'مثّل بدون كلام' : 'اشرح دون الكلمات الممنوعة'}</p><div class="party-secret-word ${s.mode === 'mime' && partyMimeScenes.includes(s.card) ? 'party-scene' : ''}">${esc(s.mode === 'mime' ? s.card : s.card[0])}</div>${s.mode === 'mime' && partyMimeScenes.includes(s.card) ? '<p class="note">مثّل الفعل كاملاً. يُقبل وصف واضح للموقف حتى لو اختلفت الصياغة.</p>' : ''}${
          s.mode === 'taboo'
            ? `<div class="party-forbidden">${s.card
                .slice(1, 5)
                .map((w) => `<span>${esc(w)}</span>`)
                .join('')}</div>`
            : ''
        }</div><div class="actions"><button class="primary" data-party-card="${s.cardToken}" onclick="teamCupRecord('correct')">عرفوها! +${s.boostActive ? 20 : 10}</button><button data-party-card="${s.cardToken}" onclick="teamCupRecord('skip')">تجاوز −${s.boostActive ? 4 : 2}</button><button class="softred" data-party-card="${s.cardToken}" onclick="teamCupRecord('violation')">${s.mode === 'mime' ? 'كلام أو أصوات' : 'كلمة ممنوعة'} −${s.boostActive ? 10 : 5}</button></div>`;
  setHTML(
    partyWrap(
      'teamcup',
      `<div class="party-matchbar"><span>${info.mode.icon} ${esc(s.teamNames[info.team])}</span><b>${esc(info.captain)}</b><strong>${s.turnScore} نقطة</strong></div><section class="panel party-panel"><div class="party-clockline"><span>الجولة ${info.cycle + 1} / ${s.cycles}</span><b class="countdown" id="teamCupClock">${partySeconds()}</b><span>${info.mode.name}</span></div><div class="party-time-track"><span id="teamCupTimebar" style="width:${(partySeconds() / s.duration) * 100}%"></span></div>${card}${partyTeamTacticHTML(s)}${s.boostActive ? '<p class="party-boost active" role="status">⚡ هذه البطاقة مضاعفة: الصحيح +20 · الخسارة مضاعفة</p>' : !s.boostUsed && !s.feedback && !s.hiddenCard ? `<div class="party-boost"><button data-party-card="${s.cardToken}" onclick="teamCupBoost()">⚡ ضاعف هذه البطاقة</button><small>مرة في الدور · الصحيح +20 · ${s.mode === 'trivia' ? 'الخاطئ −10' : 'التجاوز −4 والمخالفة −10'}</small></div>` : '<p class="note center">⚡ بطاقة المضاعفة استُخدمت أو غير متاحة الآن.</p>'}<p class="note center party-turn-summary">✓ ${s.correct} صحيح · ↷ ${s.skips} تجاوز${s.mode !== 'trivia' ? ` · ✕ ${s.violations} مخالفة` : ''}</p><div class="actions">${s.mode !== 'trivia' ? `<button onclick="teamCupToggleCard()">${s.hiddenCard ? 'إظهار' : 'إخفاء'} البطاقة</button><button onclick="teamCupUndo()" ${s.turnLog.length && !s.hiddenCard ? '' : 'disabled'}>↶ تراجع</button>` : ''}<button class="quiet" data-party-stage="${s.stageToken}" onclick="teamCupEndTurn()">أنهِ دور الفريق</button></div></section>`,
    ),
  );
}
function teamCupToggleCard() {
  if (!partyStage('teamcup', 'active') || state.mode === 'trivia') return;
  if (!partySeconds()) return teamCupEndTurn();
  state.hiddenCard = !state.hiddenCard;
  renderTeamCup();
}
function partyCardToken() {
  // Inline buttons retain their public handlers; detached buttons keep the old token.
  return window.event?.currentTarget?.dataset?.partyCard;
}
function partyStageToken() {
  return window.event?.currentTarget?.dataset?.partyStage;
}
function partyAcceptStage(token) {
  return token === undefined || String(token) === String(state?.stageToken);
}
function teamCupStreak(s, correct) {
  s.streak = correct ? s.streak + 1 : 0;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  const bonus = s.teamTactic === 'streak' && correct && s.streak % 3 === 0 ? 5 : 0;
  s.comboPoints += bonus;
  s.turnScore += bonus;
  return bonus;
}
function teamCupBoost(token = partyCardToken()) {
  if (!partyStage('teamcup', 'active') || state.boostUsed || state.feedback || state.hiddenCard)
    return;
  if (token !== undefined && String(token) !== String(state.cardToken)) return;
  if (!partySeconds()) return teamCupEndTurn();
  state.boostUsed = true;
  state.boostActive = true;
  renderTeamCup();
}
function teamCupRecord(action, token = partyCardToken()) {
  if (
    !partyStage('teamcup', 'active') ||
    state.mode === 'trivia' ||
    !['correct', 'skip', 'violation'].includes(action)
  )
    return;
  if (token !== undefined && String(token) !== String(state.cardToken)) return;
  if (token !== undefined && window.event?.detail > 1) return;
  if (state.hiddenCard) return;
  if (!partySeconds()) return teamCupEndTurn();
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
    boostUsed: s.boostUsed,
    boostActive: s.boostActive,
    boosted: s.boostActive,
    streak: s.streak,
    bestStreak: s.bestStreak,
    comboPoints: s.comboPoints,
  });
  const multiplier = s.boostActive ? 2 : 1;
  if (action === 'correct') {
    s.correct++;
    s.turnScore += 10 * multiplier;
    tone();
  } else if (action === 'skip') {
    s.skips++;
    s.turnScore -= 2 * multiplier;
  } else {
    s.violations++;
    s.turnScore -= 5 * multiplier;
  }
  s.turnLog.at(-1).streakBonus = teamCupStreak(s, action === 'correct');
  s.hiddenCard = false;
  teamCupNextCard();
  renderTeamCup();
}
function teamCupUndo() {
  if (
    !partyStage('teamcup', 'active') ||
    state.mode === 'trivia' ||
    state.hiddenCard ||
    !state.turnLog.length
  )
    return;
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
    boostUsed: h.boostUsed,
    boostActive: h.boostActive,
    streak: h.streak,
    bestStreak: h.bestStreak,
    comboPoints: h.comboPoints,
  });
  s.decks[s.mode] = h.deck;
  s.deckIndex[s.mode] = h.index;
  s.cardToken = ++partyActionSerial;
  renderTeamCup();
}
function teamCupTrivia(choice, token = partyCardToken()) {
  if (
    !partyStage('teamcup', 'active') ||
    state.mode !== 'trivia' ||
    state.feedback ||
    !Number.isInteger(choice) ||
    choice < 0 ||
    choice >= state.choices.length
  )
    return;
  if (token !== undefined && String(token) !== String(state.cardToken)) return;
  if (!partySeconds()) return teamCupEndTurn();
  const s = state,
    correct = s.choices[choice] === s.card.answer;
  const points = correct ? (s.boostActive ? 20 : 10) : s.boostActive ? -10 : 0;
  s.feedback = { choice, correct, points };
  s.turnLog.push({
    action: correct ? 'correct' : 'wrong',
    word: s.card.question,
    boosted: s.boostActive,
  });
  s.turnScore += points;
  s.feedback.streakBonus = teamCupStreak(s, correct);
  s.turnLog.at(-1).streakBonus = s.feedback.streakBonus;
  s.boostActive = false;
  if (correct) {
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
function teamCupEndTurn(token = partyStageToken()) {
  if (!partyStage('teamcup', 'active') || !partyAcceptStage(token)) return;
  const s = state,
    info = teamCupInfo();
  const elapsed = Math.max(0, s.duration - partySeconds(s));
  clearTimers();
  s.stage = 'turn-result';
  s.stageToken = ++partyActionSerial;
  s.endAt = 0;
  s.teamScores[info.team] += s.turnScore;
  s.history.push({
    team: info.team,
    captain: info.captain,
    mode: info.mode.name,
    score: s.turnScore,
    correct: s.correct,
    attempts: s.turnLog.length,
    boosts: s.turnLog.filter((h) => h.boosted).length,
    elapsed,
    bestStreak: s.bestStreak,
    comboPoints: s.comboPoints,
    words: s.turnLog.map((h) => ({ action: h.action, word: h.word, boosted: h.boosted })),
  });
  tone(true);
  setHTML(
    partyWrap(
      'teamcup',
      `${partyTeamsHTML(s.teams, s.teamNames, s.teamScores)}<section class="panel center"><p class="party-kicker">${info.mode.icon} انتهى دور ${esc(s.teamNames[info.team])}</p><div class="resultnum">${s.turnScore}</div><p class="note">${s.correct} صحيح · القائد ${esc(info.captain)}</p>${partyMetrics(
        [
          [s.turnLog.length, 'بطاقات لعبتموها'],
          [
            s.turnLog.length ? Math.round((s.correct / s.turnLog.length) * 100) + '٪' : '—',
            'دقة الإجابات',
          ],
          [s.turnLog.filter((h) => h.boosted).length, 'بطاقات مضاعفة'],
        ],
      )}<details class="history"><summary>سجل دور الفريق</summary><div class="listchips">${s.turnLog.map((h) => `<span>${h.boosted ? '⚡ ' : ''}${h.action === 'correct' ? '✓' : h.action === 'skip' ? '↷' : '✕'} ${esc(h.word)}</span>`).join('') || '<span>لم تُسجّل إجابات</span>'}</div></details><div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="teamCupAdvance()">${s.turn + 1 === s.cycles * 2 ? 'تتويج الفائز' : 'الدور التالي'} ←</button></div></section>`,
    ),
  );
}
function teamCupAdvance(token = partyStageToken()) {
  if (!partyStage('teamcup', 'turn-result') || !partyAcceptStage(token)) return;
  state.turn++;
  teamCupHandoff();
}
function finishTeamCup() {
  const s = state;
  if (s?.id !== 'teamcup' || s.done || s.turn < s.cycles * 2) return;
  s.done = true;
  const tied = s.teamScores[0] === s.teamScores[1],
    winner = s.teamScores[0] > s.teamScores[1] ? 0 : 1;
  s.teams.forEach((team, i) =>
    team.forEach((name) => {
      s.results[name] =
        Math.max(0, Math.floor(s.teamScores[i] / team.length)) + (!tied && i === winner ? 10 : 0);
      addScore(name, s.results[name]);
    }),
  );
  tone(true);
  setHTML(
    partyWrap(
      'teamcup',
      `<section class="panel success celebrate center"><span class="party-trophy">${tied ? '🤝' : '🏆'}</span><h2>${tied ? 'تعادل بطعم الفوز' : `الكأس لفريق ${esc(s.teamNames[winner])}`}</h2><p class="note">انتهت ${s.cycles} جولات لكل فريق. انحفظت النقاط العامة لكل لاعب.</p>${partyTeamsHTML(s.teams, s.teamNames, s.teamScores)}${boardHTML(s.players, s.results)}${partyTeamInsights(s)}${partyTeamDebrief(s)}<details class="history"><summary>مسار البطولة · ${s.history.length} أدوار</summary><div class="party-timeline">${s.history.map((h, i) => `<div><span>${i + 1}</span><p><b>${esc(s.teamNames[h.team])}</b> · ${esc(h.mode)}<small>${esc(h.captain)} · ${h.correct} صحيح</small></p><strong>${h.score}</strong></div>`).join('')}</div></details><div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="partyRematch()">🔁 إعادة البطولة بنفس القواعد</button><button onclick="setup('teamcup')">بطولة بإعدادات جديدة</button><button onclick="home()">عالم الألعاب</button></div></section>`,
    ),
  );
}

// Undercover: equal-looking secret cards, private ballots and one fair runoff.
function undercoverChooseRoles(s) {
  s.roleCounts ||= s.players.map(() => 0);
  const candidates = s.players.map((_, i) => i),
    chosen = [],
    highest = Math.max(...s.roleCounts);
  // Less frequent roles receive extra chances, while every player remains eligible.
  for (let slot = 0; slot < s.hiddenCount && candidates.length; slot++) {
    const weights = candidates.map((i) => highest - s.roleCounts[i] + 1);
    let ticket = randInt(weights.reduce((sum, weight) => sum + weight, 0)),
      choice = 0;
    while (ticket >= weights[choice]) ticket -= weights[choice++];
    chosen.push(candidates.splice(choice, 1)[0]);
  }
  chosen.forEach((i) => s.roleCounts[i]++);
  return chosen;
}
function undercoverRound() {
  const s = state;
  clearTimers();
  const pair = shuffle(s.pairs[s.round % s.pairs.length]),
    hidden = undercoverChooseRoles(s),
    clueOrder = shuffle(s.players.map((_, i) => i)),
    first = ((s.startingPlayer || 0) + s.round) % s.players.length;
  clueOrder.splice(clueOrder.indexOf(first), 1);
  clueOrder.unshift(first);
  Object.assign(s, {
    pair,
    hidden,
    revealIndex: 0,
    clueIndex: 0,
    clueOrder,
    clues: [],
    clueDraft: '',
    questioning: false,
    questionIndex: 0,
    questions: [],
    inquiryTarget: null,
    inquiryQuestion: '',
    inquiryAnswer: '',
    votes: [],
    voteConfidence: [],
    voteReasons: [],
    confidence: 2,
    voteReason: '',
    firstBallots: null,
    voteIndex: 0,
    voteCount: 0,
    voteOrder: s.players.map((_, i) => (s.round + i) % s.players.length),
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
    partyWrap(
      'undercover',
      `<div class="party-status"><span>الجولة ${s.round + 1} / ${s.rounds}</span><span>البطاقة ${s.revealIndex + 1} / ${s.players.length}</span></div>${partyPrivateHandoff('undercover', name, 'كلمتك لا يراها غيرك', 'undercoverReveal()')}`,
    ),
  );
}
function undercoverReveal(token = partyPassToken()) {
  if (!partyStage('undercover', 'reveal-handoff') || !partyAcceptPass(token)) return;
  state.stage = 'reveal-view';
  const s = state,
    word = s.hidden.includes(s.revealIndex) ? s.pair[1] : s.pair[0];
  setHTML(
    partyWrap(
      'undercover',
      `<section class="panel party-private center"><p class="party-kicker">الكلمة السرية لـ ${esc(s.players[s.revealIndex])}</p><div class="party-secret-word">${esc(word)}</div><p class="note">احفظها. لا تقولها نفسها، ولا تسأل الآخرين عن كلماتهم.</p><p class="note">الكلمة وحدها لا تكشف لك هل أنت من الفريق الدخيل.</p><div class="actions"><button class="primary" data-party-pass="${s.privatePass}" onclick="undercoverHide()">حفظتها، أخفِ الشاشة</button><button onclick="partyHidePrivate()">🔒 إخفاء مؤقت</button></div><p class="note">Escape يعيدك إلى شاشة التسليم من دون تغيير اللاعب.</p></section>`,
    ),
  );
}
function undercoverHide(token = partyPassToken()) {
  if (!partyStage('undercover', 'reveal-view') || !partyAcceptPass(token)) return;
  const s = state;
  s.revealIndex++;
  if (s.revealIndex === s.players.length) {
    s.stage = 'discussion-ready';
    setHTML(
      partyWrap(
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
    cycle = Math.floor(s.clueIndex / s.players.length),
    order = [...s.clueOrder.slice(cycle), ...s.clueOrder.slice(0, cycle)],
    current = s.clueIndex < total ? order[s.clueIndex % s.players.length] : null;
  s.clueToken = ++partyActionSerial;
  setHTML(
    partyWrap(
      'undercover',
      `<div class="party-status"><span>الجولة ${s.round + 1} / ${s.rounds}</span><b id="undercoverClock">${s.duration ? partySeconds() + ' ث' : 'بدون مؤقت'}</b><span>${s.hiddenCount} كلمة دخيلة</span></div><section class="panel center"><p class="party-kicker">${current === null ? 'التلميحات اكتملت' : `دورة التلميحات ${cycle + 1} / ${s.clueRounds}`}</p><h2>${current === null ? 'ناقشوا من المختلف' : `تلميح من ${esc(s.players[current])}`}</h2>${current !== null ? undercoverLens(s) : ''}<p class="note">قولوا وصفاً قصيراً يرتبط بالكلمة؛ لا تذكروها ولا تشيروا إلى حروفها.</p><div class="party-speakers">${order.map((n, i) => `<span class="${n === current ? 'current' : i < s.clueIndex % s.players.length || current === null ? 'spoken' : ''}">${n === current ? '🎤 ' : ''}${esc(s.players[n])}</span>`).join('')}</div><p class="note">${s.clueIndex} / ${total} تلميحات اكتملت</p>${current !== null ? `<div class="party-clue-input"><label for="undercoverClue">دوّنوا التلميح ليراجعه الجميع · اختياري</label><input id="undercoverClue" maxlength="48" autocomplete="off" value="${esc(s.clueDraft)}" placeholder="وصف قصير، بدون الكلمة السرية…" oninput="undercoverClueUpdate()"><p class="note">التلميحات المكتوبة علنية، والكلمات السرية تبقى مخفية.</p></div>` : ''}<div class="actions">${current !== null ? `<button class="primary" data-party-card="${s.clueToken}" onclick="undercoverNextClue()">تم التلميح، التالي ←</button>` : ''}<button ${current === null ? 'class="primary"' : ''} data-party-card="${s.clueToken}" onclick="undercoverStartVote()">ابدأوا التصويت السري</button></div><p class="note">${current !== null ? 'يمكنكم التصويت مبكراً إذا اتفقت اللمّة. ' : ''}التصويت لا يستبعد أحداً حتى يُسجّل الجميع أصواتهم. ترتيب البداية يتبدّل بين دورات التلميحات.</p>${undercoverInquiryHTML(s)}</section>${undercoverClueTrail(s)}${partySessionScore(s)}`,
    ),
  );
}
function undercoverLens(s) {
  const cycle = Math.floor(s.clueIndex / s.players.length);
  const lens = partyClueLenses[(s.round + cycle) % partyClueLenses.length];
  return `<div class="party-clue-lens"><b>زاوية التلميح: ${lens[0]}</b><p>${lens[1]}</p></div>`;
}
function undercoverInquiryHTML(s) {
  if (!s.inquiry || s.clueIndex < s.players.length * s.clueRounds) return '';
  if (!s.questioning)
    return `<div class="party-inquiry"><h3>🔎 هل تحتاجون دليلاً آخر؟</h3><p class="note">جولة أسئلة اختيارية: كل لاعب يسأل شخصاً آخر، ولا يُسمح بذكر أي كلمة سرية.</p><button data-party-card="${s.clueToken}" onclick="undercoverBeginInquiry()">ابدأ الاستجواب المتبادل</button></div>`;
  if (s.questionIndex >= s.players.length)
    return `<div class="party-inquiry"><b>✓ كل لاعب أخذ فرصة السؤال.</b><p class="note">راجعوا دفتر الأدلة ثم صوّتوا؛ الأسئلة لا تغيّر النقاط.</p></div>`;
  const asker = s.clueOrder[s.questionIndex],
    target = Number.isInteger(s.inquiryTarget) ? s.inquiryTarget : (asker + 1) % s.players.length;
  return `<div class="party-inquiry"><p class="party-kicker">سؤال ${s.questionIndex + 1} / ${s.players.length}</p><h3>سؤال من ${esc(s.players[asker])}</h3><div class="fields"><div class="field"><label for="undercoverTarget">وجّه السؤال إلى</label><select id="undercoverTarget" onchange="undercoverInquiryUpdate()">${s.players.map((name, i) => (i === asker ? '' : `<option value="${i}" ${i === target ? 'selected' : ''}>${esc(name)}</option>`)).join('')}</select></div><div class="field"><label for="undercoverQuestion">السؤال العلني · 80 حرفاً</label><input id="undercoverQuestion" maxlength="80" autocomplete="off" placeholder="كيف يبدو مكانه الطبيعي؟" value="${esc(s.inquiryQuestion)}" oninput="undercoverInquiryUpdate()"></div><div class="field"><label for="undercoverReply">رد الشخص المختار · 80 حرفاً</label><input id="undercoverReply" maxlength="80" autocomplete="off" placeholder="رد قصير دون الكلمة نفسها" value="${esc(s.inquiryAnswer)}" oninput="undercoverInquiryUpdate()"></div></div><p class="note">يمكنكم السؤال عن الحجم، المكان، أو الاستخدام. لا تسألوا عن الحروف.</p><div class="actions"><button class="primary" data-party-card="${s.clueToken}" onclick="undercoverRecordInquiry()">دوّن السؤال والرد ←</button><button data-party-card="${s.clueToken}" onclick="undercoverSkipInquiry()">أتجاوز فرصة سؤالي</button></div></div>`;
}
function undercoverBeginInquiry(token = partyCardToken()) {
  if (
    !partyStage('undercover', 'discussion') ||
    !state.inquiry ||
    state.questioning ||
    state.clueIndex < state.players.length * state.clueRounds
  )
    return;
  if (token !== undefined && String(token) !== String(state.clueToken)) return;
  if (state.duration && !partySeconds()) return undercoverStartVote();
  state.questioning = true;
  renderUndercoverDiscussion();
}
function undercoverInquiryUpdate() {
  if (!partyStage('undercover', 'discussion') || !state.questioning) return;
  const target = Number($('undercoverTarget')?.value);
  if (Number.isInteger(target) && target >= 0 && target < state.players.length)
    state.inquiryTarget = target;
  state.inquiryQuestion = $('undercoverQuestion')?.value.slice(0, 80) || '';
  state.inquiryAnswer = $('undercoverReply')?.value.slice(0, 80) || '';
}
function undercoverRecordInquiry(token = partyCardToken()) {
  if (
    !partyStage('undercover', 'discussion') ||
    !state.questioning ||
    state.questionIndex >= state.players.length
  )
    return;
  if (token !== undefined && String(token) !== String(state.clueToken)) return;
  if (state.duration && !partySeconds()) return undercoverStartVote();
  undercoverInquiryUpdate();
  const s = state,
    asker = s.clueOrder[s.questionIndex],
    target = s.inquiryTarget,
    question = s.inquiryQuestion.trim().replace(/\s+/gu, ' '),
    answer = s.inquiryAnswer.trim().replace(/\s+/gu, ' ');
  if (!Number.isInteger(target) || target === asker || !question || !answer)
    return toast('اختاروا شخصاً آخر واكتبوا السؤال والرد أولاً.');
  if (
    s.pair.some((word) => norm(question).includes(norm(word)) || norm(answer).includes(norm(word)))
  )
    return toast('السؤال أو الرد يتضمن كلمة سرية؛ صفوها دون تسميتها.');
  s.questions.push({ asker, target, question, answer });
  undercoverSkipInquiry(token);
}
function undercoverSkipInquiry(token = partyCardToken()) {
  if (
    !partyStage('undercover', 'discussion') ||
    !state.questioning ||
    state.questionIndex >= state.players.length
  )
    return;
  if (token !== undefined && String(token) !== String(state.clueToken)) return;
  if (state.duration && !partySeconds()) return undercoverStartVote();
  state.questionIndex++;
  state.inquiryTarget = null;
  state.inquiryQuestion = '';
  state.inquiryAnswer = '';
  renderUndercoverDiscussion();
}
function undercoverClueUpdate() {
  const input = $('undercoverClue');
  if (!input) return;
  if (!partyStage('undercover', 'discussion')) {
    input.value = state?.clueDraft || '';
    return;
  }
  state.clueDraft = input.value.slice(0, 48);
}
function undercoverClueTrail(s) {
  const clues = s.clues?.filter((clue) => clue.text) || [];
  const questions = s.questions || [];
  if (!clues.length && !questions.length) return '';
  return `<details class="history party-clue-trail" open><summary>🗣️ دفتر الأدلة · ${clues.length} تلميحات · ${questions.length} أسئلة</summary><div>${clues.map((clue) => `<p><b>${esc(s.players[clue.player])}</b><small>التلميح ${clue.cycle + 1}</small><span>${esc(clue.text)}</span></p>`).join('')}</div>${questions.length ? `<div class="party-question-trail">${questions.map((item) => `<p><b>${esc(s.players[item.asker])} يسأل ${esc(s.players[item.target])}</b><span>${esc(item.question)}</span><span>↳ ${esc(item.answer)}</span></p>`).join('')}</div>` : ''}</details>`;
}
function undercoverNextClue(token = partyCardToken()) {
  if (
    !partyStage('undercover', 'discussion') ||
    state.clueIndex >= state.players.length * state.clueRounds
  )
    return;
  if (token !== undefined && String(token) !== String(state.clueToken)) return;
  if (state.duration && !partySeconds()) return undercoverStartVote();
  const s = state,
    cycle = Math.floor(s.clueIndex / s.players.length),
    order = [...s.clueOrder.slice(cycle), ...s.clueOrder.slice(0, cycle)],
    player = order[s.clueIndex % s.players.length],
    text = (s.clueDraft || '').trim().replace(/\s+/gu, ' '),
    word = s.hidden.includes(player) ? s.pair[1] : s.pair[0];
  if (text && norm(text).includes(norm(word))) {
    toast('هذا التلميح يحتوي كلمتك؛ اختر وصفاً آخر كي لا تكشفها.');
    return $('undercoverClue')?.focus();
  }
  s.clues.push({ player, cycle, text });
  s.clueDraft = '';
  s.clueIndex++;
  renderUndercoverDiscussion();
}
function undercoverStartVote(token = partyCardToken()) {
  if (!partyStage('undercover', 'discussion')) return;
  if (token !== undefined && String(token) !== String(state.clueToken)) return;
  clearTimers();
  Object.assign(state, {
    endAt: 0,
    votes: [],
    voteIndex: state.voteOrder[0],
    voteCount: 0,
    voteChoice: null,
    confidence: 2,
    voteReason: '',
    voteConfidence: [],
    voteReasons: [],
    stage: 'vote-handoff',
  });
  renderUndercoverVoteHandoff();
}
function renderUndercoverVoteHandoff() {
  const s = state;
  setHTML(
    partyWrap(
      'undercover',
      `<div class="party-status"><span>${s.runoff ? 'إعادة التصويت' : 'التصويت السري'}</span><span>${s.voteCount + 1} / ${s.players.length}</span></div>${partyPrivateHandoff('undercover', s.players[s.voteIndex], 'صوتك لا يراه الآخرون', 'undercoverOpenVote()')}`,
    ),
  );
}
function undercoverOpenVote(token = partyPassToken()) {
  if (!partyStage('undercover', 'vote-handoff') || !partyAcceptPass(token)) return;
  state.stage = 'vote-view';
  state.voteToken = ++partyActionSerial;
  state.voteChoice = null;
  state.confidence = 2;
  state.voteReason = '';
  renderUndercoverVote();
}
function renderUndercoverVote() {
  const s = state;
  setHTML(
    partyWrap(
      'undercover',
      `<section class="panel party-private"><p class="party-kicker">صوت ${esc(s.players[s.voteIndex])} · ${s.runoff ? 'بين المتعادلين فقط' : 'من صاحب الكلمة الدخيلة؟'}</p><h2>اختر شخصاً غير نفسك</h2><div class="party-ballots">${s.voteCandidates
        .filter((i) => i !== s.voteIndex)
        .map(
          (i) =>
            `<button class="${s.voteChoice === i ? 'selected' : ''}" aria-pressed="${s.voteChoice === i}" data-party-card="${s.voteToken}" onclick="undercoverChoose(${i})">${esc(s.players[i])}${s.voteChoice === i ? ' ✓' : ''}</button>`,
        )
        .join(
          '',
        )}<button class="${s.voteChoice === -1 ? 'selected' : ''}" aria-pressed="${s.voteChoice === -1}" data-party-card="${s.voteToken}" onclick="undercoverChoose(-1)">امتنع عن التصويت</button></div>${undercoverConfidenceHTML(s)}<div class="actions"><button class="primary" data-party-card="${s.voteToken}" onclick="undercoverConfirmVote()" ${s.voteChoice === null ? 'disabled' : ''}>ثبّت صوتي وأخفِ الشاشة</button><button onclick="partyHidePrivate()">🔒 إخفاء مؤقت</button></div><p class="note">الأصوات والنتيجة تُكشف بعد الجميع. الامتناع لا يحسب لأي لاعب.</p></section>`,
    ),
  );
}
function undercoverChoose(i, token = partyCardToken()) {
  if (
    !partyStage('undercover', 'vote-view') ||
    !Number.isInteger(i) ||
    i === state.voteIndex ||
    (i !== -1 && !state.voteCandidates.includes(i))
  )
    return;
  if (token !== undefined && String(token) !== String(state.voteToken)) return;
  state.voteChoice = i;
  renderUndercoverVote();
}
function undercoverConfidence(value, token = partyCardToken()) {
  if (!partyStage('undercover', 'vote-view') || ![1, 2, 3].includes(value)) return;
  if (token !== undefined && String(token) !== String(state.voteToken)) return;
  state.confidence = value;
  renderUndercoverVote();
}
function undercoverReasonUpdate() {
  if (!partyStage('undercover', 'vote-view')) return;
  state.voteReason = $('undercoverReason')?.value.slice(0, 80) || '';
}
function undercoverConfidenceHTML(s) {
  return `<fieldset class="party-confidence"><legend>ما درجة ثقتك؟ · لا تؤثر على النقاط</legend><div>${['احتمال', 'أرجّح', 'واثق'].map((label, index) => `<button aria-pressed="${s.confidence === index + 1}" class="${s.confidence === index + 1 ? 'selected' : ''}" data-party-card="${s.voteToken}" onclick="undercoverConfidence(${index + 1})">${label}</button>`).join('')}</div><label for="undercoverReason">دليلك · اختياري ويظهر بعد الكشف</label><input id="undercoverReason" maxlength="80" autocomplete="off" value="${esc(s.voteReason)}" oninput="undercoverReasonUpdate()" placeholder="أي تلميح أو رد أقنعك؟"></fieldset>`;
}
function undercoverConfirmVote(token = partyCardToken()) {
  if (!partyStage('undercover', 'vote-view') || state.voteChoice === null) return;
  if (token !== undefined && String(token) !== String(state.voteToken)) return;
  const s = state;
  s.votes.push(s.voteChoice);
  s.voteConfidence.push(s.confidence);
  s.voteReasons.push(s.voteReason.trim());
  s.voteCount++;
  s.voteChoice = null;
  if (s.voteCount === s.players.length) return undercoverTally();
  s.voteIndex = s.voteOrder[s.voteCount];
  s.stage = 'vote-handoff';
  renderUndercoverVoteHandoff();
}
function undercoverTally() {
  if (!partyStage('undercover', 'vote-view') || state.votes.length !== state.players.length) return;
  const s = state,
    tally = s.players.map(() => 0);
  // Ballots are collected in handoff order, then mapped to their actual voters.
  const ordered = (ballots) => s.players.map((_, player) => ballots[s.voteOrder.indexOf(player)]);
  s.votes = ordered(s.votes);
  s.voteConfidence = ordered(s.voteConfidence);
  s.voteReasons = ordered(s.voteReasons);
  s.votes.forEach((i) => {
    if (i >= 0) tally[i]++;
  });
  s.tally = tally;
  const max = Math.max(...tally),
    top = max ? tally.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0) : [];
  if (top.length > 1 && !s.runoff) {
    s.firstBallots = {
      votes: [...s.votes],
      confidence: [...s.voteConfidence],
      reasons: [...s.voteReasons],
    };
    s.stage = 'tie';
    s.voteCandidates = top;
    return setHTML(
      partyWrap(
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
    voteConfidence: [],
    voteReasons: [],
    voteIndex: state.voteOrder[0],
    voteCount: 0,
    voteChoice: null,
    stage: 'vote-handoff',
  });
  renderUndercoverVoteHandoff();
}
function finishUndercoverRound(eliminated) {
  if (!partyStage('undercover', 'vote-view') || state.votes.length !== state.players.length) return;
  const s = state,
    normalWin = eliminated !== null && s.hidden.includes(eliminated);
  s.stage = 'round-result';
  s.stageToken = ++partyActionSerial;
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
  s.history.push({
    pair: [...s.pair],
    hidden: [...s.hidden],
    eliminated,
    normalWin,
    clues: s.clues.map((clue) => ({ ...clue })),
    questions: s.questions.map((question) => ({ ...question })),
    votes: [...s.votes],
    confidence: [...s.voteConfidence],
    reasons: [...s.voteReasons],
    firstBallots: s.firstBallots,
    points: [...s.roundPoints],
  });
  tone(true);
  setHTML(
    partyWrap(
      'undercover',
      `<section class="panel ${normalWin ? 'success' : ''} center"><span class="party-trophy">${normalWin ? '🔍' : '🥸'}</span><h2>${normalWin ? 'كشفتوا الكلمة الدخيلة!' : 'الفريق الدخيل نجا!'}</h2><p class="note">${eliminated === null ? 'لم يُحسم شخص واحد في التصويت.' : `صوّتت اللمّة لاستبعاد ${esc(s.players[eliminated])}.`}</p>${partyMetrics(
        [
          [s.clueIndex, 'تلميحات اكتملت'],
          [s.votes.filter((vote) => vote >= 0).length, 'أصوات مسجّلة'],
          [s.votes.filter((vote) => s.hidden.includes(vote)).length, 'أصوات كشفت الدخيل'],
        ],
      )}<div class="party-word-reveal"><div><small>الكلمة الأصلية</small><b>${esc(s.pair[0])}</b></div><div><small>الكلمة الدخيلة</small><b>${esc(s.pair[1])}</b></div></div><p class="note">الفريق الدخيل: ${s.hidden.map((i) => esc(s.players[i])).join(' · ')}</p><div class="party-vote-results">${s.players.map((n, i) => `<div><span>${s.hidden.includes(i) ? '🥸' : '👤'} ${esc(n)}</span><span>${s.tally[i]} أصوات</span><b>+${s.roundPoints[i]}</b></div>`).join('')}</div><details class="history"><summary>الأصوات بعد إقفال الجولة</summary><div class="party-timeline">${s.players.map((n, i) => `<div><p>${esc(n)} ← ${s.votes[i] < 0 ? 'امتناع' : esc(s.players[s.votes[i]])}</p></div>`).join('')}</div></details>${undercoverClueTrail(s)}${undercoverRoundReview(s)}<div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="undercoverAdvance()">${s.round + 1 === s.rounds ? 'نتيجة الجلسة' : 'جولة بكلمات جديدة'} ←</button></div></section>${partySessionScore(s)}`,
    ),
  );
}
function undercoverRoundReview(s) {
  const decisive = s.voteConfidence
    .map((confidence, player) => ({ confidence, player, target: s.votes[player] }))
    .filter((vote) => vote.confidence === 3 && vote.target >= 0);
  const right = decisive.filter((vote) => s.hidden.includes(vote.target)).length;
  return `<div class="party-debrief"><h3>🧭 ماذا أقنعكم؟</h3><p>${decisive.length ? `${right} / ${decisive.length} من الأصوات الواثقة أشارت إلى كلمة دخيلة.` : 'لم تُسجّل أصوات واثقة؛ قارنوا التلميحات قبل رفع الثقة.'} التلميح المختلف دليل محتمل؛ المعلومة الدقيقة في الاستجواب تساعدكم على التحقق.</p><div class="party-reasons">${s.players.map((name, i) => `<p><b>${esc(name)}</b><span>${['احتمال', 'أرجّح', 'واثق'][(s.voteConfidence[i] || 2) - 1]} · ${s.votes[i] < 0 ? 'امتنع' : s.hidden.includes(s.votes[i]) ? '✓ أشار للدخيل' : 'لم يشر للدخيل'}</span>${s.voteReasons[i] ? `<small>${esc(s.voteReasons[i])}</small>` : ''}</p>`).join('')}</div>${s.runoff ? '<p class="note">حُفظت الأصوات الأولى للمراجعة؛ النقاط حُسبت من التصويت النهائي فقط.</p>' : ''}</div>`;
}
function undercoverSessionReview(s) {
  const found = s.history.filter((round) => round.normalWin).length;
  return `<div class="party-debrief"><h3>🔍 سجل التحقيقات</h3>${partyMetrics([
    [found, 'جولات كشفت الدخيل'],
    [s.history.reduce((sum, round) => sum + round.questions.length, 0), 'أسئلة متبادلة'],
    [s.history.reduce((sum, round) => sum + round.clues.length, 0), 'تلميحات مسجّلة'],
  ])}<div class="party-timeline">${s.history.map((round, i) => `<div><span>${i + 1}</span><p><b>${esc(round.pair[0])} / ${esc(round.pair[1])}</b><small>${round.normalWin ? 'كُشف الدخيل' : 'نجا الدخيل'} · ${round.questions.length} أسئلة</small></p><strong>${round.normalWin ? '🔍' : '🥸'}</strong></div>`).join('')}</div></div>`;
}
function undercoverAdvance(token = partyStageToken()) {
  if (!partyStage('undercover', 'round-result') || !partyAcceptStage(token)) return;
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
    stageToken: ++partyActionSerial,
    answerIndex: s.round % s.players.length,
    answerCount: 0,
    answerDraft: '',
    entries: [],
    voteIndex: s.round % s.players.length,
    voteCount: 0,
    votes: [],
    voteChoice: null,
    secondChoice: null,
    appreciations: [],
    galleryFocus: false,
    galleryIndex: 0,
    criterion:
      partyCreativeCriteria[
        s.creativeCriterion === 'funny' ? 0 : s.round % partyCreativeCriteria.length
      ],
    sparkWord: s.creativeSpark ? s.sparkWords[s.round % s.sparkWords.length] : '',
    prompt: s.prompts[s.round],
    endAt: 0,
  });
  setHTML(
    partyWrap(
      'improv',
      `<section class="panel party-prompt-card center"><p class="party-kicker">الموقف ${s.round + 1} / ${s.rounds}</p><span class="party-lock">💡</span><h2>${esc(s.prompt)}</h2><div class="party-format"><b>${creativeRules().name}</b><p>${creativeRules().rule}</p></div>${creativeBrief(s)}<p class="note">أعطوا الفكرة لحظة، ثم كل شخص يكتب رده الخاص. الردود ستظهر بلا أسماء.</p><div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="creativeStartAnswers()">ابدأ كتابة الردود</button><button data-party-stage="${s.stageToken}" onclick="creativeRefreshPrompt()">🔀 موقف مختلف</button></div></section>${partySessionScore(s)}`,
    ),
  );
}
function creativeRules(s = state) {
  return partyCreativeFormats[s.creativeFormat] || partyCreativeFormats.free;
}
function creativeRefreshPrompt(token = partyStageToken()) {
  if (!partyStage('improv', 'prompt') || !partyAcceptStage(token)) return;
  const s = state;
  s.usedPrompts ||= [...s.prompts];
  const fresh = partyCreativePrompts.filter((prompt) => !s.usedPrompts.includes(prompt));
  if (!fresh.length) return toast('جرّبتوا كل المواقف المتاحة؛ نكمل بهذا الموقف.');
  const prompt = fresh[randInt(fresh.length)];
  s.usedPrompts.push(prompt);
  s.prompts[s.round] = prompt;
  creativeRound();
}
function creativeStartAnswers(token = partyStageToken()) {
  if (!partyStage('improv', 'prompt') || !partyAcceptStage(token)) return;
  state.stage = 'answer-handoff';
  renderCreativeHandoff();
}
function renderCreativeHandoff() {
  const s = state;
  setHTML(
    partyWrap(
      'improv',
      `<div class="party-status"><span>الرد ${s.answerCount + 1} / ${s.players.length}</span><span>الموقف ${s.round + 1} / ${s.rounds}</span></div>${partyPrivateHandoff('improv', s.players[s.answerIndex], 'اكتب فكرتك بسرية', 'creativeOpenAnswer()')}`,
    ),
  );
}
function creativeOpenAnswer(token = partyPassToken()) {
  if (!partyStage('improv', 'answer-handoff') || !partyAcceptPass(token)) return;
  const s = state,
    format = creativeRules();
  s.stage = 'answer-view';
  s.answerToken = ++partyActionSerial;
  setHTML(
    partyWrap(
      'improv',
      `<section class="panel party-private"><p class="party-kicker">رد ${esc(s.players[s.answerIndex])}</p><h3 class="party-question">${esc(s.prompt)}</h3><div class="party-format"><b>${format.name}</b><p>${format.rule}</p></div>${creativeBrief(s)}<label for="creativeAnswer">ردك · ${format.limit} حرفاً كحد أقصى</label><textarea id="creativeAnswer" class="party-textarea" maxlength="${format.limit}" rows="3" placeholder="فكرة خفيفة ومبتكرة…" oninput="creativeDraftUpdate()" aria-describedby="creativeCounter">${esc(s.answerDraft)}</textarea><p class="note" id="creativeCounter">${s.answerDraft.length} / ${format.limit}</p><div class="actions"><button class="primary" data-party-card="${s.answerToken}" onclick="creativePreview()">👀 راجع ردي قبل تسليمه</button><button data-party-card="${s.answerToken}" onclick="creativeSubmit()">احفظ ردي وأخفِ الشاشة</button><button onclick="partyHidePrivate()">🔒 إخفاء مؤقت</button></div><p class="note">لا تكتب اسمك. الأجمل فكرة لطيفة يفهمها الجميع. زر Escape يخفي ردك ويحفظ المسودة.</p></section>`,
    ),
  );
  $('creativeAnswer').focus();
}
function creativeDraftUpdate() {
  if (!partyStage('improv', 'answer-view')) return;
  const format = creativeRules();
  state.answerDraft = $('creativeAnswer').value.slice(0, format.limit);
  const words = state.answerDraft.trim() ? state.answerDraft.trim().split(/\s+/u).length : 0;
  $('creativeCounter').textContent =
    state.answerDraft.length +
    ' / ' +
    format.limit +
    (state.creativeFormat === 'seven' ? ` · ${words} / 7 كلمات` : '');
}
function creativeReadAnswer() {
  return latin($('creativeAnswer')?.value ?? state.answerDraft)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, creativeRules().limit);
}
function creativeValidAnswer(answer) {
  if (!answer) {
    toast('اكتب رداً قبل تمرير الجهاز.');
    $('creativeAnswer')?.focus();
    return false;
  }
  if (state.creativeFormat === 'seven' && answer.split(/\s+/u).length !== 7) {
    toast('هذا التحدي يحتاج سبع كلمات بالضبط؛ عدّل ردك ثم احفظه.');
    $('creativeAnswer')?.focus();
    return false;
  }
  if (state.sparkWord && !norm(answer).includes(norm(state.sparkWord))) {
    toast(`ضمّن كلمة الإلهام «${state.sparkWord}» في ردك.`);
    $('creativeAnswer')?.focus();
    return false;
  }
  if (state.entries.some((entry) => norm(entry.text) === norm(answer))) {
    toast('هذا الرد سبق تسجيله؛ جرّب فكرة مختلفة.');
    $('creativeAnswer')?.focus();
    return false;
  }
  return true;
}
function creativeBrief(s) {
  return `<div class="party-creative-brief"><b>🗳️ معيار الجولة: ${esc(s.criterion.name)}</b><p>${esc(s.criterion.rule)}</p>${s.sparkWord ? `<p class="party-spark">✨ ضمّنوا كلمة الإلهام: <strong>${esc(s.sparkWord)}</strong></p>` : ''}</div>`;
}
function creativePreview(token = partyCardToken()) {
  if (!partyStage('improv', 'answer-view')) return;
  if (token !== undefined && String(token) !== String(state.answerToken)) return;
  const s = state,
    answer = creativeReadAnswer();
  if (!creativeValidAnswer(answer)) return;
  s.answerDraft = answer;
  s.stage = 'answer-preview';
  setHTML(
    partyWrap(
      'improv',
      `<section class="panel party-private"><p class="party-kicker">مراجعة خاصة لـ ${esc(s.players[s.answerIndex])}</p><h2>هذا ما سيظهر بلا اسمك</h2><p class="note">${esc(s.prompt)}</p><blockquote class="party-answer-preview">${esc(answer)}</blockquote><p class="note">${answer.length} حرفاً · ${answer.split(/\s+/u).length} كلمات</p><div class="actions"><button class="primary" data-party-card="${s.answerToken}" onclick="creativeSubmit()">اعتمد ردي ومرّر الجهاز</button><button onclick="creativeEditAnswer()">↶ عدّل الرد</button><button onclick="partyHidePrivate()">🔒 إخفاء مؤقت</button></div></section>`,
    ),
  );
}
function creativeEditAnswer() {
  if (!partyStage('improv', 'answer-preview')) return;
  state.stage = 'answer-handoff';
  creativeOpenAnswer();
}
function creativeSubmit(token = partyCardToken()) {
  if (partyBlocked('improv') || !['answer-view', 'answer-preview'].includes(state.stage)) return;
  if (token !== undefined && String(token) !== String(state.answerToken)) return;
  const s = state,
    answer = creativeReadAnswer();
  if (!creativeValidAnswer(answer)) return;
  s.entries.push({ author: s.answerIndex, text: answer });
  s.answerDraft = '';
  s.answerCount++;
  if (s.answerCount === s.players.length) {
    s.entries = shuffle(s.entries);
    s.stage = 'gallery';
    return renderCreativeGallery();
  }
  s.answerIndex = (s.round + s.answerCount) % s.players.length;
  s.stage = 'answer-handoff';
  renderCreativeHandoff();
}
function partyCreativeCards(s, vote = false) {
  return `<div class="party-creative-cards">${s.entries
    .map((entry, i) => {
      const own = vote && entry.author === s.voteIndex;
      return vote
        ? `<button class="party-creative-entry ${s.voteChoice === i ? 'selected' : ''}" data-party-card="${s.voteToken}" onclick="creativeChoose(${i})" ${own ? 'disabled' : ''} aria-pressed="${s.voteChoice === i}"><span class="party-entry-number">${i + 1}</span><span>${esc(entry.text)}${own ? '<small>ردك · لا يمكنك التصويت له</small>' : ''}</span>${s.voteChoice === i ? '<b>✓</b>' : ''}</button>`
        : `<div class="party-creative-entry"><span class="party-entry-number">${i + 1}</span><p>${esc(entry.text)}</p></div>`;
    })
    .join('')}</div>`;
}
function renderCreativeGallery() {
  const s = state;
  setHTML(
    partyWrap(
      'improv',
      `<section class="panel"><p class="party-kicker">الردود بلا أسماء · الموقف ${s.round + 1}</p><h3 class="party-question">${esc(s.prompt)}</h3>${creativeBrief(s)}${creativeGalleryHTML(s)}<p class="note center">اقرؤوا جميع الردود معاً. التصويت سري، ولكل شخص صوت واحد لرد غير رده.</p><div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="creativeStartVoting()">ابدأ التصويت</button><button data-party-stage="${s.stageToken}" onclick="creativeGalleryToggle()">${s.galleryFocus ? 'اعرضوا كل الأفكار' : '🎤 اعرضوا فكرة واحدة كل مرة'}</button></div></section>`,
    ),
  );
}
function creativeGalleryHTML(s) {
  if (!s.galleryFocus) return partyCreativeCards(s);
  const entry = s.entries[s.galleryIndex];
  return `<div class="party-focus-card" aria-live="polite"><span class="party-entry-number">${s.galleryIndex + 1}</span><p>${esc(entry.text)}</p><small>الفكرة ${s.galleryIndex + 1} / ${s.entries.length} · بلا أسماء</small></div><div class="actions"><button data-party-stage="${s.stageToken}" onclick="creativeGalleryMove(-1)" ${s.galleryIndex === 0 ? 'disabled' : ''}>الفكرة السابقة</button><button data-party-stage="${s.stageToken}" onclick="creativeGalleryMove(1)" ${s.galleryIndex === s.entries.length - 1 ? 'disabled' : ''}>الفكرة التالية</button></div>`;
}
function creativeGalleryToggle(token = partyStageToken()) {
  if (!partyStage('improv', 'gallery') || !partyAcceptStage(token)) return;
  state.galleryFocus = !state.galleryFocus;
  renderCreativeGallery();
}
function creativeGalleryMove(direction, token = partyStageToken()) {
  if (
    !partyStage('improv', 'gallery') ||
    !partyAcceptStage(token) ||
    !state.galleryFocus ||
    ![-1, 1].includes(direction)
  )
    return;
  state.galleryIndex = Math.max(
    0,
    Math.min(state.entries.length - 1, state.galleryIndex + direction),
  );
  renderCreativeGallery();
}
function creativeStartVoting(token = partyStageToken()) {
  if (!partyStage('improv', 'gallery') || !partyAcceptStage(token)) return;
  state.stage = 'creative-vote-handoff';
  renderCreativeVoteHandoff();
}
function renderCreativeVoteHandoff() {
  const s = state;
  setHTML(
    partyWrap(
      'improv',
      `<div class="party-status"><span>صوت ${s.voteCount + 1} / ${s.players.length}</span><span>الموقف ${s.round + 1} / ${s.rounds}</span></div>${partyPrivateHandoff('improv', s.players[s.voteIndex], 'اختر الرد الذي أعجبك', 'creativeOpenVote()')}`,
    ),
  );
}
function creativeOpenVote(token = partyPassToken()) {
  if (!partyStage('improv', 'creative-vote-handoff') || !partyAcceptPass(token)) return;
  state.stage = 'creative-vote-view';
  state.voteToken = ++partyActionSerial;
  state.voteChoice = null;
  state.secondChoice = null;
  renderCreativeVote();
}
function renderCreativeVote() {
  const s = state;
  setHTML(
    partyWrap(
      'improv',
      `<section class="panel party-private"><p class="party-kicker">التصويت السري لـ ${esc(s.players[s.voteIndex])}</p><h3 class="party-question">${esc(s.prompt)}</h3>${creativeBrief(s)}<p class="party-kicker">${s.creativeBallot === 'ranked' ? 'اختيارك الأول · +5' : 'صوتك · +5'}</p>${partyCreativeCards(s, true)}${creativeAppreciationHTML(s)}<div class="actions"><button class="primary" data-party-card="${s.voteToken}" onclick="creativeConfirmVote()" ${s.voteChoice === null || (s.creativeBallot === 'ranked' && s.secondChoice === null) ? 'disabled' : ''}>ثبّت صوتي وأخفِ الشاشة</button><button onclick="partyHidePrivate()">🔒 إخفاء مؤقت</button></div><p class="note center">صوّت للفكرة، لا تحاول تخمين صاحبها.</p></section>`,
    ),
  );
}
function creativeChoose(i, token = partyCardToken()) {
  if (
    !partyStage('improv', 'creative-vote-view') ||
    !Number.isInteger(i) ||
    !state.entries[i] ||
    state.entries[i].author === state.voteIndex
  )
    return;
  if (token !== undefined && String(token) !== String(state.voteToken)) return;
  state.voteChoice = i;
  if (state.secondChoice === i) state.secondChoice = null;
  renderCreativeVote();
}
function creativeAppreciationHTML(s) {
  if (s.creativeBallot !== 'ranked') return '';
  return `<fieldset class="party-appreciation"><legend>⭐ التقدير الثاني · رد مختلف · +2</legend><p class="note">اختاروا ردًا آخر يستحق التقدير. لا يمكن اختيار ردك أو اختيارك الأول.</p><div>${s.entries.map((entry, i) => `<button data-party-card="${s.voteToken}" onclick="creativeChooseSecond(${i})" aria-pressed="${s.secondChoice === i}" class="${s.secondChoice === i ? 'selected' : ''}" ${entry.author === s.voteIndex || i === s.voteChoice ? 'disabled' : ''}>الفكرة ${i + 1}${s.secondChoice === i ? ' ✓' : ''}</button>`).join('')}</div></fieldset>`;
}
function creativeChooseSecond(i, token = partyCardToken()) {
  if (
    !partyStage('improv', 'creative-vote-view') ||
    state.creativeBallot !== 'ranked' ||
    !Number.isInteger(i) ||
    !state.entries[i] ||
    i === state.voteChoice ||
    state.entries[i].author === state.voteIndex
  )
    return;
  if (token !== undefined && String(token) !== String(state.voteToken)) return;
  state.secondChoice = i;
  renderCreativeVote();
}
function creativeConfirmVote(token = partyCardToken()) {
  if (!partyStage('improv', 'creative-vote-view') || state.voteChoice === null) return;
  if (token !== undefined && String(token) !== String(state.voteToken)) return;
  const s = state;
  if (s.entries[s.voteChoice]?.author === s.voteIndex) return;
  if (
    s.creativeBallot === 'ranked' &&
    (s.secondChoice === null ||
      !s.entries[s.secondChoice] ||
      s.secondChoice === s.voteChoice ||
      s.entries[s.secondChoice].author === s.voteIndex)
  )
    return;
  s.votes.push(s.voteChoice);
  s.appreciations.push(s.creativeBallot === 'ranked' ? s.secondChoice : null);
  s.voteChoice = null;
  s.secondChoice = null;
  s.voteCount++;
  if (s.voteCount === s.players.length) return creativeTally();
  s.voteIndex = (s.round + s.voteCount) % s.players.length;
  s.stage = 'creative-vote-handoff';
  renderCreativeVoteHandoff();
}
function creativeTally() {
  if (!partyStage('improv', 'creative-vote-view') || state.votes.length !== state.players.length)
    return;
  const s = state,
    counts = s.entries.map(() => 0),
    appreciations = s.entries.map(() => 0);
  s.votes.forEach((i) => counts[i]++);
  s.appreciations.forEach((i) => {
    if (Number.isInteger(i) && appreciations[i] !== undefined) appreciations[i]++;
  });
  const highest = Math.max(...counts);
  s.stage = 'creative-result';
  const results = s.entries
    .map((entry, i) => {
      const points = counts[i] * 5 + appreciations[i] * 2 + (counts[i] === highest ? 10 : 0);
      s.results[s.players[entry.author]] += points;
      return {
        ...entry,
        votes: counts[i],
        appreciation: appreciations[i],
        points,
        winning: counts[i] === highest,
      };
    })
    .sort((a, b) => b.votes - a.votes);
  s.history.push({
    prompt: s.prompt,
    criterion: s.criterion.name,
    sparkWord: s.sparkWord,
    entries: results,
  });
  s.stageToken = ++partyActionSerial;
  tone(true);
  setHTML(
    partyWrap(
      'improv',
      `<section class="panel center"><span class="party-trophy">✨</span><h2>أفكار اللمّة كشفت أصحابها</h2><p class="note">${esc(s.prompt)}</p>${creativeBrief(s)}<div class="party-creative-results">${results.map((entry) => `<div class="${entry.winning ? 'winning' : ''}"><div class="party-creative-author"><b>${entry.winning ? '🏅 ' : ''}${esc(s.players[entry.author])}</b><strong>+${entry.points}</strong></div><p>${esc(entry.text)}</p><small>${entry.votes} أصوات${s.creativeBallot === 'ranked' ? ` · ${entry.appreciation} تقديرات` : ''}${entry.winning ? ' · مكافأة أفضل رد +10' : ''}</small></div>`).join('')}</div><div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="creativeAdvance()">${s.round + 1 === s.rounds ? 'نتيجة الجلسة' : 'موقف جديد'} ←</button></div></section>${partySessionScore(s)}`,
    ),
  );
}
function creativeAdvance(token = partyStageToken()) {
  if (!partyStage('improv', 'creative-result') || !partyAcceptStage(token)) return;
  state.round++;
  if (state.round === state.rounds) return finishPartySession('improv', 'نجوم الإبداع', true);
  creativeRound();
}
function partyCreativePause() {
  if (state?.id !== 'improv') return;
  if (['answer-view', 'answer-preview'].includes(state.stage)) {
    state.answerDraft = ($('creativeAnswer')?.value ?? state.answerDraft).slice(
      0,
      creativeRules().limit,
    );
    state.stage = 'answer-handoff';
    renderCreativeHandoff();
  } else if (state.stage === 'creative-vote-view') {
    state.stage = 'creative-vote-handoff';
    state.voteChoice = null;
    state.secondChoice = null;
    renderCreativeVoteHandoff();
  }
}
function finishPartySession(id, title, saveScores) {
  const s = state;
  if (s?.id !== id || s.done || s.round < s.rounds) return;
  clearTimers();
  s.done = true;
  if (saveScores) s.players.forEach((n) => addScore(n, s.results[n]));
  const best = Math.max(...s.players.map((n) => s.results[n])),
    winners = s.players.filter((n) => s.results[n] === best);
  const review =
    id === 'improv'
      ? `<details class="history party-creative-recap"><summary>✨ أفكار فازت في الجلسة</summary>${s.history
          .map(
            (round, index) =>
              `<section><p class="party-kicker">الموقف ${index + 1} · ${esc(round.prompt)}</p><small>${esc(round.criterion || 'أطرف فكرة')}${round.sparkWord ? ` · كلمة الإلهام: ${esc(round.sparkWord)}` : ''}</small>${round.entries
                .filter((entry) => entry.winning)
                .map(
                  (entry) =>
                    `<p><b>${esc(s.players[entry.author])}</b> · ${esc(entry.text)} <small>${entry.votes} أصوات</small></p>`,
                )
                .join('')}</section>`,
          )
          .join('')}</details>`
      : undercoverSessionReview(s);
  setHTML(
    partyWrap(
      id,
      `<section class="panel success celebrate center"><span class="party-trophy">🏆</span><h2>${esc(title)}</h2><p class="party-champions">${winners.map(esc).join(' · ')}</p><p class="note">اكتملت ${s.rounds} جولات. نقاط اللمّة انحفظت في اللوحة العامة.</p>${boardHTML(s.players, s.results)}${review}<div class="actions"><button class="primary" data-party-stage="${s.stageToken}" onclick="partyRematch()">🔁 جولة جديدة بنفس القواعد</button><button onclick="setup('${id}')">غيّر إعدادات الجلسة</button><button onclick="home()">عالم الألعاب</button></div></section>`,
    ),
  );
  tone(true);
}

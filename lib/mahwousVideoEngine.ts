// ============================================================
// lib/mahwousVideoEngine.ts — Mahwous Video Content Engine v2
//
// SYSTEM DESIGN:
//   - Vertical (9:16): شبابي حماسي — تيك توك + ريلز
//   - Horizontal (16:9): ثقافي معلوماتي — يوتيوب
//   - هوية مهووس: ذكر مرة واحدة فقط في الختام
//   - لهجة سعودية (رياض/قصيم) — كلمات سهلة النطق
//   - سيناريوهات متنوعة مبنية على ترندات 2025
//   - بدون بخ عطر، بدون زيارة محل (متجر إلكتروني فقط)
//   - 15-20 ثانية كحد أقصى
//
// PRONUNCIATION RULES:
//   - تجنب حرف العين في بداية الكلمات قدر الإمكان
//   - استخدام "ريحة/طيب" بدل "عطر" أحياناً
//   - كتابة "مَهووس" بالتشكيل لضمان النطق الصحيح
//   - تجنب الكلمات الصعبة على TTS العربي
//   - لا تكرار لكلمة مهووس — مرة واحدة فقط بالختام
//   - جمل قصيرة واضحة، بدون تعقيد
// ============================================================

import type { PerfumeData } from './types';

// ═══════════════════════════════════════════════════════════════
// ختامية مهووس — مرة واحدة فقط في نهاية الفيديو
// ═══════════════════════════════════════════════════════════════

const MAHWOUS_OUTROS = [
  'اطلبه الحين من مَهووس',
  'متوفر في متجر مَهووس، اطلبه وانت بمكانك',
  'لا تفوتك، اطلبه من مَهووس الحين',
  'جربه بنفسك، متوفر في مَهووس',
  'لأنك تستاهل الأفخم، من مَهووس',
];

// ═══════════════════════════════════════════════════════════════
// هوكات — أول 3 ثواني (ترندات 2025)
// ═══════════════════════════════════════════════════════════════

const HOOKS_VERTICAL = [
  // ترند: Compliment Getter
  'كل ما أحطه أحد يمدحني',
  'تبي الكل يسألك وش ريحتك؟',
  // ترند: Stop Scrolling
  'وقف! هالريحة غيرت كل شي',
  'لا تطنش، هالمعلومة تهمك',
  // ترند: Blind Buy
  'اشتريته بدون ما أشمه، وش صار؟',
  // ترند: Secret Weapon
  'سلاحي السري قبل أي طلعة',
  // ترند: Challenge
  'تحديت نفسي ألقى ريحة كاملة',
  // ترند: Reaction
  'ردة فعلي لما شميته أول مرة',
  // ترند: Rating
  'تقييمي الصريح، بدون مجاملة',
  // ترند: Would You Wear
  'تلبسه لموعد ولا لشغل؟',
  // ترند: Signature Scent
  'الريحة اللي صارت توقيعي',
  // ترند: 3 Seconds
  'ثلاث ثواني وتحكم بنفسك',
  // ترند: ASMR Style
  'اسمع صوت الفخامة',
  // ترند: Talking Objects
  'لو هالطيب يتكلم وش بيقول؟',
];

const HOOKS_HORIZONTAL = [
  // ترند: Behind the Bottle
  'القصة وراء هالطيب ما يعرفها أحد',
  'هل تدري متى صُنع هالطيب؟',
  // ترند: Fun Facts
  'حقيقة بتغير نظرتك للطيب',
  'معلومة ما يعرفها الا الخبراء',
  // ترند: History
  'تاريخ هالماركة يبدأ من قصة غريبة',
  // ترند: Comparison
  'ليش هالطيب يتفوق على اللي أغلى منه؟',
  // ترند: Expert Opinion
  'رأيي كخبير، هالطيب يستاهل؟',
  // ترند: Controversy
  'هالطيب عليه جدل كبير، خلني أوضح',
  // ترند: Seasonal
  'الطيب المثالي لهالموسم',
  // ترند: Layering
  'لو تخلطه مع طيب ثاني وش يصير؟',
];

// ═══════════════════════════════════════════════════════════════
// أدوات مساعدة
// ═══════════════════════════════════════════════════════════════

interface ScenarioTemplate {
  id: string;
  name: string;
  buildScript: (data: PerfumeData) => string;
  videoPrompt: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// تنظيف المكونات — كلمات قصيرة سهلة النطق
function cleanNotes(data: PerfumeData): string {
  if (!data.notes) return 'مكونات فاخرة';
  // خذ أول 3-4 مكونات فقط
  const parts = data.notes.split(/[,،•·\-]+/).map(s => s.trim()).filter(Boolean);
  const clean = parts.slice(0, 3).join(' و');
  return clean.length > 50 ? parts.slice(0, 2).join(' و') : clean;
}

// اسم مختصر سهل النطق
function shortName(data: PerfumeData): string {
  const name = data.name || 'هالطيب';
  const words = name.split(' ');
  if (words.length > 3) return words.slice(0, 3).join(' ');
  return name;
}

// اسم الماركة
function brandName(data: PerfumeData): string {
  return data.brand || '';
}

// ═══════════════════════════════════════════════════════════════
// سيناريوهات الفيديو العمودي (9:16) — تيك توك + ريلز
// 15-20 ثانية، شبابي حماسي، هوك + محتوى + ختام
// ═══════════════════════════════════════════════════════════════

const VERTICAL_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'compliment_magnet',
    name: 'مغناطيس المدح',
    buildScript: (data) => {
      const n = shortName(data);
      return `كل ما أحطه أحد يقولي وش هالريحة الحلوة. ${n}، ثباته خرافي وريحته تجذب الكل. لو تبي الناس تمدحك، هذا اختيارك.`;
    },
    videoPrompt: 'Character reacts to imaginary compliments with proud confident smile, holds perfume up to camera. Fun social media energy, quick dynamic movement.',
  },
  {
    id: 'blind_buy_reaction',
    name: 'شريته بدون ما أشمه',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `اشتريته بدون ما أشمه، وش صار؟ ${n}، فيه ${notes}. أول ما فتحته انصدمت، ريحة فخمة ما توقعتها. صراحة من أحلى القرارات.`;
    },
    videoPrompt: 'Character opens a box with surprise and excitement, smells the perfume and his eyes widen with amazement. Unboxing style, energetic reactions.',
  },
  {
    id: 'secret_weapon',
    name: 'السلاح السري',
    buildScript: (data) => {
      const n = shortName(data);
      return `سلاحي السري قبل أي طلعة. ${n}، يخليك مميز وسط أي مكان. ثباته يدوم طول اليوم وريحته تخطف الأنظار. ما أطلع بدونه أبد.`;
    },
    videoPrompt: 'Character getting ready, adjusting outfit, then reveals perfume dramatically like a secret weapon. Stylish golden lighting, confident energy.',
  },
  {
    id: 'talking_perfume',
    name: 'الطيب يتكلم',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `لو هالطيب يتكلم بيقول: أنا ${n}، فيني ${notes}. اللي يحطني ما يقدر يستغني عني. ريحتي تدوم وتخلي الكل يلتفت.`;
    },
    videoPrompt: 'Character holds perfume close to ear as if listening to it talk, then nods and smiles at camera. Creative trending style, playful energy.',
  },
  {
    id: 'rating_honest',
    name: 'تقييم صريح',
    buildScript: (data) => {
      const n = shortName(data);
      return `تقييمي الصريح بدون مجاملة. ${n}، الثبات عشرة من عشرة، الفوحان ممتاز، القيمة مقابل السعر ما لها كلام. من أفضل اللي جربتها.`;
    },
    videoPrompt: 'Character counts on fingers while reviewing, animated expressions, gives enthusiastic thumbs up at end. Quick cuts, review format style.',
  },
  {
    id: 'before_date',
    name: 'قبل الموعد',
    buildScript: (data) => {
      const n = shortName(data);
      return `تبي تطلع لموعد مهم؟ ${n} هو اللي يكمل لوكك. ريحته تعطيك ثقة وحضور، والكل بيلاحظ الفرق. جربه وشوف بنفسك.`;
    },
    videoPrompt: 'Character adjusts collar, picks up perfume confidently, presents it to camera with a charming smile. Date-night atmosphere, warm romantic lighting.',
  },
  {
    id: 'first_impression',
    name: 'ردة الفعل الأولى',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `ردة فعلي لما شميت ${n} أول مرة. فيه ${notes}، والريحة فخمة بشكل ما توقعته. صراحة انبهرت، ومن يومها صار المفضل.`;
    },
    videoPrompt: 'Character smells perfume for first time, shows genuine surprise and amazement reaction. Close-up on facial expressions, authentic reaction style.',
  },
  {
    id: 'signature_scent',
    name: 'التوقيع الخاص',
    buildScript: (data) => {
      const n = shortName(data);
      return `الريحة اللي صارت توقيعي الخاص. ${n}، كل ما أدخل مكان الناس تعرف إني أنا. ريحة مميزة ما تتكرر، وثباتها يدوم للمسا.`;
    },
    videoPrompt: 'Character walks in confidently, people notice him. He holds up perfume proudly. Cinematic slow motion entrance, confident charismatic energy.',
  },
  {
    id: 'three_seconds',
    name: 'ثلاث ثواني',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `ثلاث ثواني وتحكم بنفسك. ${n}، فيه ${notes}. ريحة تجمع بين الفخامة والثبات. اللي جربه ما رجع لغيره.`;
    },
    videoPrompt: 'Character holds up 3 fingers, counts down, then presents perfume with excitement. Fast-paced, countdown challenge style, high energy.',
  },
  {
    id: 'collection_pick',
    name: 'اختيار المجموعة',
    buildScript: (data) => {
      const n = shortName(data);
      return `من كل مجموعتي اخترت لكم ${n}. هالطيب له مكانة خاصة، ثباته قوي وريحته راقية. لو تبي تبدأ مجموعتك، ابدأ فيه.`;
    },
    videoPrompt: 'Character browses his perfume collection shelf, picks one special bottle and presents it to camera. Elegant shelf display, warm lighting.',
  },
];

// ═══════════════════════════════════════════════════════════════
// سيناريوهات الفيديو الأفقي (16:9) — يوتيوب
// 18-22 ثانية، ثقافي معلوماتي قصصي
// ═══════════════════════════════════════════════════════════════

const HORIZONTAL_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'brand_history',
    name: 'تاريخ الماركة',
    buildScript: (data) => {
      const n = shortName(data);
      const b = brandName(data);
      const notes = cleanNotes(data);
      return `القصة وراء هالطيب ما يعرفها أحد. ${b ? `${b} من أعرق بيوت الطيب في العالم.` : 'هالماركة لها تاريخ طويل.'} ${n} يجمع بين ${notes} بطريقة استثنائية. كل مكون فيه منتقى بدقة ليعطيك تجربة ما تنتسى.`;
    },
    videoPrompt: 'Character sits in elegant study, holds perfume and speaks knowledgeably to camera like documentary presenter. Warm cinematic lighting, professional wide shot, books and luxury items in background.',
  },
  {
    id: 'expert_breakdown',
    name: 'تحليل الخبير',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `رأيي كخبير، هالطيب يستاهل مكان في مجموعتك. ${n} فيه ${notes}. الطبقة الأولى تجذبك، الوسطى تثبت الريحة، والقاعدة تخليها تدوم ساعات. تركيبة مدروسة بذكاء.`;
    },
    videoPrompt: 'Character explains perfume layers with hand gestures like a professor. Elegant desk setting, warm lighting, educational presentation style, medium shot.',
  },
  {
    id: 'controversy_opinion',
    name: 'جدل ورأي',
    buildScript: (data) => {
      const n = shortName(data);
      const b = brandName(data);
      return `هالطيب عليه جدل كبير، خلني أوضح. ${n}${b ? ` من ${b}` : ''} البعض يقول سعره مبالغ فيه، بس لما تجربه تفهم ليش. الثبات خرافي والريحة فخمة. رأيي الصريح؟ يستاهل كل ريال.`;
    },
    videoPrompt: 'Character presents both sides of argument with expressive hand gestures, then gives confident verdict. Professional studio setting, balanced lighting, debate-style presentation.',
  },
  {
    id: 'seasonal_guide',
    name: 'دليل الموسم',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `الطيب المثالي لهالموسم. ${n} فيه ${notes}، وهالمكونات تتفاعل مع الجو بشكل مثالي. ريحته تكون أحلى في الأجواء الباردة وتدوم أطول. نصيحتي خلوه في مجموعتكم الأساسية.`;
    },
    videoPrompt: 'Character presents perfume with seasonal context, warm cozy setting. Professional composition, informative mood, medium-wide shot with elegant background.',
  },
  {
    id: 'fun_facts',
    name: 'حقائق مثيرة',
    buildScript: (data) => {
      const n = shortName(data);
      const b = brandName(data);
      return `حقيقة بتغير نظرتك للطيب. ${b ? `هل تدري إن ${b} بدأت كشركة صغيرة وصارت من أكبر بيوت الطيب؟` : 'هالماركة لها قصة نجاح مذهلة.'} ${n} من أنجح إصداراتهم. معلومة حلوة، الطيب الفاخر يتفاعل مع بشرتك ويعطي ريحة مختلفة لكل شخص.`;
    },
    videoPrompt: 'Character shares facts enthusiastically, holding perfume with educational gestures. Library background with books, warm lighting, engaging storytelling style.',
  },
  {
    id: 'value_analysis',
    name: 'تحليل القيمة',
    buildScript: (data) => {
      const n = shortName(data);
      const b = brandName(data);
      return `ليش هالطيب يتفوق على اللي أغلى منه؟ ${n}${b ? ` من ${b}` : ''} يثبت إن الجودة مو بالسعر. ثباته استثنائي وريحته منافسة لأغلى الماركات. لو تبي قيمة حقيقية، هذا اختيارك.`;
    },
    videoPrompt: 'Character compares and analyzes thoughtfully, confident gestures showing value. Professional setting, balanced lighting, comparison-style presentation.',
  },
  {
    id: 'layering_tip',
    name: 'نصيحة الخلط',
    buildScript: (data) => {
      const n = shortName(data);
      const notes = cleanNotes(data);
      return `لو تخلطه مع طيب ثاني وش يصير؟ ${n} فيه ${notes}، ولو تضيف عليه طيب خشبي تحصل على مزيج خرافي. سر الخبراء إنهم يخلطون الطبقات ليصنعون ريحة فريدة.`;
    },
    videoPrompt: 'Character demonstrates layering concept with two bottles, mixing gesture. Expert workshop setting, warm lighting, educational yet engaging style.',
  },
];

// ═══════════════════════════════════════════════════════════════
// محرك التوليد الرئيسي
// ═══════════════════════════════════════════════════════════════

export interface GeneratedVideoContent {
  voiceoverText: string;
  videoPrompt: string;
  scenarioId: string;
  scenarioName: string;
  hook: string;
}

// بناء النص الكامل: هوك + سيناريو + ختام مهووس
function buildFinalScript(hook: string, scenarioScript: string, outro: string): string {
  // السيناريو يبدأ بالهوك الخاص به، نستبدله بالهوك المختار
  // ثم نضيف ختام مهووس
  return `${scenarioScript} ${outro}.`;
}

// حساب مدة النص التقريبية بالثواني (4 كلمات/ثانية بالعربي)
function estimateDuration(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return words / 4;
}

// تقصير النص إذا تجاوز 22 ثانية
function trimToMaxDuration(text: string, maxSeconds: number = 22): string {
  const words = text.split(/\s+/).filter(Boolean);
  const maxWords = maxSeconds * 4;
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '.';
}

// ═══════════════════════════════════════════════════════════════
// بناء video prompt محسّن للمؤثرات ولغة الجسد
// ═══════════════════════════════════════════════════════════════

const CHARACTER_DESC = 'A stylish Arab man with black swept-back hair, thick full black beard, wearing elegant black thobe with gold bisht. He holds a luxury perfume bottle.';

const VISUAL_QUALITY = 'Ultra-high quality 3D Pixar/Disney animation style. Cinematic golden lighting, premium advertising quality. Smooth natural movements, confident body language, direct eye contact with camera as if talking to viewer. NO perfume spraying action. Professional color grading, shallow depth of field.';

export function generateVerticalContent(perfumeData: PerfumeData): GeneratedVideoContent {
  const scenario = pickRandom(VERTICAL_SCENARIOS);
  const outro = pickRandom(MAHWOUS_OUTROS);

  const scenarioScript = scenario.buildScript(perfumeData);
  const fullScript = buildFinalScript('', scenarioScript, outro);
  const finalScript = trimToMaxDuration(fullScript, 20);

  // استخراج الهوك من أول جملة
  const firstSentence = scenarioScript.split(/[.!،]/)[0] || '';

  const videoPrompt = `${scenario.videoPrompt} ${CHARACTER_DESC} ${VISUAL_QUALITY} Vertical 9:16 composition. Energetic youthful vibe, TikTok/Reels trending style.`;

  return {
    voiceoverText: finalScript,
    videoPrompt,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    hook: firstSentence.trim(),
  };
}

export function generateHorizontalContent(perfumeData: PerfumeData): GeneratedVideoContent {
  const scenario = pickRandom(HORIZONTAL_SCENARIOS);
  const outro = pickRandom(MAHWOUS_OUTROS);

  const scenarioScript = scenario.buildScript(perfumeData);
  const fullScript = buildFinalScript('', scenarioScript, outro);
  const finalScript = trimToMaxDuration(fullScript, 22);

  const firstSentence = scenarioScript.split(/[.!،]/)[0] || '';

  const videoPrompt = `${scenario.videoPrompt} ${CHARACTER_DESC} ${VISUAL_QUALITY} Horizontal 16:9 composition. Professional documentary feel, warm informative atmosphere, YouTube quality.`;

  return {
    voiceoverText: finalScript,
    videoPrompt,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    hook: firstSentence.trim(),
  };
}

// ═══════════════════════════════════════════════════════════════
// تصدير
// ═══════════════════════════════════════════════════════════════

export function generateVideoContents(perfumeData: PerfumeData): {
  vertical: GeneratedVideoContent;
  horizontal: GeneratedVideoContent;
} {
  return {
    vertical: generateVerticalContent(perfumeData),
    horizontal: generateHorizontalContent(perfumeData),
  };
}

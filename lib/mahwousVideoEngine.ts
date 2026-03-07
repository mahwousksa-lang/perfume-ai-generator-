// ============================================================
// lib/mahwousVideoEngine.ts — Mahwous Video Content Engine v1
//
// SYSTEM DESIGN:
//   - Vertical (9:16): شبابي حماسي — تيك توك + ريلز
//   - Horizontal (16:9): ثقافي معلوماتي — يوتيوب
//   - هوية مهووس: افتتاحية + ختامية ثابتة
//   - لهجة سعودية (رياض/قصيم)
//   - سيناريوهات متنوعة عشوائية
//   - بدون بخ عطر، بدون زيارة محل (متجر إلكتروني فقط)
//   - 20-25 ثانية كحد أقصى
// ============================================================

import type { PerfumeData } from './types';

// ═══════════════════════════════════════════════════════════════
// هوية مهووس الصوتية — كلمات ثابتة للعلامة التجارية
// ═══════════════════════════════════════════════════════════════

const MAHWOUS_INTROS = [
  'مهووس يقولك',
  'مع مهووس',
  'من مهووس لك',
  'مهووس جابلك',
  'مهووس اختارلك',
];

const MAHWOUS_OUTROS = [
  'اطلبه الحين من متجر مهووس',
  'متوفر الحين في متجر مهووس، اطلبه وانت بمكانك',
  'لا تفوتك الفرصة، اطلبه من مهووس',
  'جربه بنفسك، اطلبه من متجر مهووس الحين',
  'مهووس، لأنك تستاهل الأفخم',
];

// ═══════════════════════════════════════════════════════════════
// هوكات قوية — لجذب الانتباه في أول 3 ثواني
// ═══════════════════════════════════════════════════════════════

const HOOKS_VERTICAL = [
  'وقف وقف! هالعطر غير كل شي',
  'لو تبي الكل يسألك وش عطرك، كمّل معي',
  'العطر هذا خلاني أغير رأيي بالعطور كلها',
  'تبي تعرف سر الحضور القوي؟',
  'والله لو تشمه مرة ما تتركه',
  'هالعطر ما ينلام عليه اللي يدمنه',
  'انتبه! هالعطر يسرق الأنظار',
  'وش تتوقع يصير لو كل الناس تسألك عن عطرك؟',
  'جربت عطور كثير بس هذا فرق',
  'العطر اللي كل مرة أحطه أحد يمدحني',
];

const HOOKS_HORIZONTAL = [
  'قصة عطر غيّرت عالم العطور',
  'هل تعرف القصة وراء هالعطر الأسطوري؟',
  'معلومة عطرية ما يعرفها كثير',
  'ليش هالعطر يعتبر من أفخم العطور؟',
  'تعال نتعرف على تاريخ عطر استثنائي',
  'حقيقة عن هالعطر بتغير نظرتك',
  'من أقوى العطور اللي صنعت في التاريخ',
];

// ═══════════════════════════════════════════════════════════════
// سيناريوهات الفيديو العمودي (9:16) — تيك توك + ريلز
// شبابي، حماسي، هوك قوي، حركات، ترند
// ═══════════════════════════════════════════════════════════════

interface ScenarioTemplate {
  id: string;
  name: string;
  buildScript: (data: PerfumeData, hook: string, intro: string, outro: string) => string;
  videoPrompt: string;
}

function extractNotes(data: PerfumeData): string {
  if (!data.notes) return 'مكونات فاخرة';
  const notes = data.notes;
  // Shorten if too long
  if (notes.length > 60) {
    return notes.substring(0, 57) + '...';
  }
  return notes;
}

function getShortName(data: PerfumeData): string {
  const name = data.name || 'هالعطر';
  // If name is too long, use just first 3 words
  const words = name.split(' ');
  if (words.length > 4) return words.slice(0, 3).join(' ');
  return name;
}

const VERTICAL_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'talking_to_perfume',
    name: 'يتكلم مع العطر',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const notes = extractNotes(data);
      return `${hook}! ${intro}، ${name}. يا جمالك يا عطر! مكوناتك من ${notes}، كل ما أحطك الناس تسألني وش هالريحة. ${outro}.`;
    },
    videoPrompt: 'The character is talking to the perfume bottle he holds, looking at it with admiration and excitement, then turns to camera with a confident smile. Dynamic camera movement, energetic mood.',
  },
  {
    id: 'perfume_library',
    name: 'المكتبة العطرية',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const brand = data.brand || '';
      return `${hook}! ${intro}، من المكتبة العطرية اخترت لكم ${name}${brand ? ` من ${brand}` : ''}. هالعطر مو عادي، ثباته قوي وفوحانه يجنن. ${outro}.`;
    },
    videoPrompt: 'The character picks the perfume bottle from an elegant shelf/library of perfumes, examines it closely, then presents it to camera with enthusiasm. Smooth cinematic movement.',
  },
  {
    id: 'unboxing_reveal',
    name: 'فتح العلبة',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const notes = extractNotes(data);
      return `${hook}! ${intro}، وصلني ${name} الحين! شوفوا التغليف، شوفوا الفخامة. ريحته ${notes}. والله ما يخيب ظنك. ${outro}.`;
    },
    videoPrompt: 'The character excitedly reveals the perfume bottle, holding it up proudly to the camera. His eyes light up with genuine excitement. Quick dynamic cuts, trendy style.',
  },
  {
    id: 'before_going_out',
    name: 'قبل الطلعة',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      return `${hook}! ${intro}، قبل أي طلعة لازم ${name} يكون معك. هالعطر يعطيك هيبة وحضور، الكل يلتفت لك. جربه وشوف الفرق بنفسك. ${outro}.`;
    },
    videoPrompt: 'The character is getting ready, adjusting his outfit, then picks up the perfume and presents it confidently to camera. Stylish, trendy atmosphere with golden lighting.',
  },
  {
    id: 'challenge_trend',
    name: 'تحدي العطور',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const notes = extractNotes(data);
      return `${hook}! ${intro}، تحديت نفسي ألقى عطر يجمع ${notes} بشكل مثالي. ولقيت ${name}! صراحة فاز بالتحدي. ${outro}.`;
    },
    videoPrompt: 'The character holds the perfume triumphantly like winning a challenge, energetic and excited expression. Fast-paced trendy editing style, dynamic angles.',
  },
  {
    id: 'secret_weapon',
    name: 'السلاح السري',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      return `${hook}! ${intro}، سلاحي السري اللي ما أطلع بدونه هو ${name}. هالعطر يخليك مميز وسط أي مكان. ثباته خرافي ورائحته تجذب الكل. ${outro}.`;
    },
    videoPrompt: 'The character reveals the perfume like a secret weapon, holding it close then presenting it dramatically to camera. Mysterious then confident mood, cinematic lighting.',
  },
  {
    id: 'rating_review',
    name: 'تقييم سريع',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const notes = extractNotes(data);
      return `${hook}! ${intro}، تقييمي لـ ${name}: الثبات عشرة من عشرة، الفوحان ممتاز، المكونات ${notes}. من أفضل العطور اللي جربتها. ${outro}.`;
    },
    videoPrompt: 'The character holds the perfume and counts on his fingers while reviewing, animated expressions, then gives a thumbs up. Quick cuts, review-style format.',
  },
  {
    id: 'compliment_getter',
    name: 'جاذب المدح',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      return `${hook}! ${intro}، كل ما أحط ${name} أحد يقولي وش هالريحة الجميلة. هالعطر مغناطيس مدح والله. لو تبي الكل يمدحك، هذا عطرك. ${outro}.`;
    },
    videoPrompt: 'The character applies perfume then reacts to imaginary compliments with a proud smile, pointing at the perfume bottle. Fun, engaging, social media style.',
  },
];

// ═══════════════════════════════════════════════════════════════
// سيناريوهات الفيديو الأفقي (16:9) — يوتيوب
// ثقافي، معلوماتي، قصصي، تاريخ العطر والماركة
// ═══════════════════════════════════════════════════════════════

const HORIZONTAL_SCENARIOS: ScenarioTemplate[] = [
  {
    id: 'brand_story',
    name: 'قصة الماركة',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const brand = data.brand || 'هالماركة';
      const notes = extractNotes(data);
      return `${hook}. ${intro}، ${name} من ${brand}. هالماركة لها تاريخ طويل في صناعة العطور الفاخرة. ${name} يجمع بين ${notes} بطريقة استثنائية تخليك تحس بالفخامة من أول شمة. عطر يستاهل مكانه في مجموعتك. ${outro}.`;
    },
    videoPrompt: 'The character sits in an elegant setting, holding the perfume bottle and speaking knowledgeably to camera like a documentary presenter. Warm cinematic lighting, professional composition, wide shot.',
  },
  {
    id: 'perfume_notes_breakdown',
    name: 'تحليل المكونات',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const brand = data.brand || '';
      const notes = extractNotes(data);
      return `${hook}. ${intro}، خلوني أشرح لكم مكونات ${name}${brand ? ` من ${brand}` : ''}. المكونات هي ${notes}. كل مكون له دور، الرأسية تجذبك، القلبية تثبت، والقاعدية تخلي الريحة تدوم ساعات طويلة. عطر مدروس بعناية. ${outro}.`;
    },
    videoPrompt: 'The character presents the perfume like a professor explaining, gesturing with hands to describe layers. Elegant study or library background, warm professional lighting, medium shot.',
  },
  {
    id: 'comparison_insight',
    name: 'مقارنة ورأي',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const brand = data.brand || '';
      return `${hook}. ${intro}، ${name}${brand ? ` من ${brand}` : ''} يتميز عن غيره بثباته الاستثنائي وفوحانه القوي. كثير يقارنونه بعطور أغلى منه بكثير، بس هالعطر يثبت إن الجودة مو بالسعر. تجربة عطرية تستاهل كل ريال. ${outro}.`;
    },
    videoPrompt: 'The character holds the perfume thoughtfully, comparing and analyzing with confident gestures. Professional studio-like setting, balanced lighting, informative mood.',
  },
  {
    id: 'occasion_guide',
    name: 'دليل المناسبات',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const notes = extractNotes(data);
      return `${hook}. ${intro}، متى تستخدم ${name}؟ بمكوناته من ${notes}، هالعطر مثالي للمناسبات الرسمية والسهرات. ثباته يدوم طول اليوم، يعني تحطه الصبح ويفضل معك للمسا. نصيحتي لكم، خلوه في مجموعتكم الأساسية. ${outro}.`;
    },
    videoPrompt: 'The character presents the perfume in an elegant setting, gesturing to suggest different occasions. Warm golden lighting, sophisticated atmosphere, wide cinematic shot.',
  },
  {
    id: 'fun_facts',
    name: 'حقائق ممتعة',
    buildScript: (data, hook, intro, outro) => {
      const name = getShortName(data);
      const brand = data.brand || 'هالماركة';
      return `${hook}. ${intro}، هل تعرف إن ${brand} من أعرق بيوت العطور؟ ${name} صُنع بعناية فائقة، كل مكون فيه منتقى بدقة. العطر هذا يحكي قصة فخامة وأصالة. معلومة حلوة، العطور الفاخرة تتفاعل مع بشرتك وتعطي ريحة مختلفة لكل شخص. ${outro}.`;
    },
    videoPrompt: 'The character shares interesting facts with enthusiasm, holding the perfume and making educational gestures. Library or study background, warm lighting, engaging presentation style.',
  },
];

// ═══════════════════════════════════════════════════════════════
// محرك اختيار السيناريو
// ═══════════════════════════════════════════════════════════════

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GeneratedVideoContent {
  // Voiceover script (Arabic, Saudi dialect)
  voiceoverText: string;
  // Video prompt for Hedra (English)
  videoPrompt: string;
  // Scenario info
  scenarioId: string;
  scenarioName: string;
  // Hook used
  hook: string;
}

export function generateVerticalContent(perfumeData: PerfumeData): GeneratedVideoContent {
  const scenario = pickRandom(VERTICAL_SCENARIOS);
  const hook = pickRandom(HOOKS_VERTICAL);
  const intro = pickRandom(MAHWOUS_INTROS);
  const outro = pickRandom(MAHWOUS_OUTROS);

  const voiceoverText = scenario.buildScript(perfumeData, hook, intro, outro);

  // Ensure script is within ~25 seconds (roughly 4-5 words per second in Arabic = ~100-125 words)
  // Average Arabic word = ~5 chars, so ~500-625 chars max
  const trimmedVoiceover = voiceoverText.length > 600
    ? voiceoverText.substring(0, 597) + '...'
    : voiceoverText;

  const videoPrompt = `${scenario.videoPrompt} The character is a stylish Arab man with black swept-back hair, thick full black beard, wearing elegant black suit with gold details. He holds a luxury perfume bottle "${perfumeData.name || 'perfume'}". 3D Pixar/Disney animation style, vertical 9:16 composition, cinematic golden lighting, premium advertising quality. NO perfume spraying action.`;

  return {
    voiceoverText: trimmedVoiceover,
    videoPrompt,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    hook,
  };
}

export function generateHorizontalContent(perfumeData: PerfumeData): GeneratedVideoContent {
  const scenario = pickRandom(HORIZONTAL_SCENARIOS);
  const hook = pickRandom(HOOKS_HORIZONTAL);
  const intro = pickRandom(MAHWOUS_INTROS);
  const outro = pickRandom(MAHWOUS_OUTROS);

  const voiceoverText = scenario.buildScript(perfumeData, hook, intro, outro);

  const trimmedVoiceover = voiceoverText.length > 650
    ? voiceoverText.substring(0, 647) + '...'
    : voiceoverText;

  const videoPrompt = `${scenario.videoPrompt} The character is a stylish Arab man with black swept-back hair, thick full black beard, wearing elegant black suit with gold details. He holds a luxury perfume bottle "${perfumeData.name || 'perfume'}". 3D Pixar/Disney animation style, horizontal 16:9 composition, cinematic warm lighting, professional documentary quality. NO perfume spraying action.`;

  return {
    voiceoverText: trimmedVoiceover,
    videoPrompt,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    hook,
  };
}

// ═══════════════════════════════════════════════════════════════
// تصدير للاستخدام في generate-video route
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

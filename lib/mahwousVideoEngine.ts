// ============================================================
// lib/mahwousVideoEngine.ts — Mahwous Video Content Engine v4
//
// v4 IMPROVEMENTS:
//   - Full tashkeel (تشكيل) on all voiceover scripts for better TTS
//   - Enhanced cinematic video prompts (Kling AI Avatar v2 Pro style)
//   - Better pronunciation: no ع-starting words, simpler vocabulary
//   - Richer scene descriptions for more professional output
//   - Consistent "مَهووس" brand voice
//
// CRITICAL PRONUNCIATION RULES:
//   1. "مَهووس" — always with tashkeel, mentioned ONCE at the end only
//   2. NEVER start a word with ع (ain) — use alternatives:
//      - "طيب" instead of "عطر"
//      - "ريحة" instead of "عطر"
//      - "حلو" instead of "عجيب"
//   3. AVOID these hard-to-pronounce words:
//      - منتقاة، استثنائي، مجاملة، تنتسى، ليصنعون
//      - Any word with double consonants or rare Arabic letters
//   4. Use SHORT simple sentences — max 8 words per sentence
//   5. NO ingredient listing — only general descriptions
//   6. Total script: 10-15 seconds (40-60 words max)
//   7. Saudi dialect (Riyadh/Qassim) — natural spoken style
//   8. NEVER say "زوروا" — online store only: "اطلبه"
//   9. Each sentence ends with period for clear TTS pauses
//   10. Avoid English words completely
//   11. Add tashkeel to key words for correct TTS pronunciation
//
// VIDEO PROMPT RULES (CINEMATIC):
//   - Ultra-high quality 3D Pixar animation style
//   - Natural body language, direct eye contact
//   - Confident but relaxed, like talking to a friend
//   - Smooth movements, no sudden gestures
//   - Professional cinematic lighting with golden tones
//   - Shallow depth of field, premium color grading
//   - NO spraying action
//   - Scene-specific camera angles and movements
// ============================================================

import type { PerfumeData } from './types';

// ═══════════════════════════════════════════════════════════════
// ختامية مَهووس — مرة واحدة فقط مع تشكيل
// ═══════════════════════════════════════════════════════════════

const OUTROS = [
  'اِطلُبه الحين مِن مَهووس.',
  'مُتوفِّر في مَهووس. اِطلُبه وانت بِمكانك.',
  'لا تفوتك الفُرصة. اِطلُبه مِن مَهووس.',
  'جَرِّبه بنَفسك. مُتوفِّر في مَهووس.',
  'تِستاهل الأفخَم. مِن مَهووس.',
  'حَصري في مَهووس. اِطلُبه الحين.',
];

// ═══════════════════════════════════════════════════════════════
// أدوات مساعدة
// ═══════════════════════════════════════════════════════════════

interface Scenario {
  id: string;
  name: string;
  build: (d: PerfumeData) => string;
  prompt: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// اسم مختصر — أول كلمتين فقط
function sName(d: PerfumeData): string {
  const n = d.name || 'هالطيب';
  const w = n.split(' ');
  return w.length > 2 ? w.slice(0, 2).join(' ') : n;
}

// اسم الماركة — كلمة واحدة فقط
function bName(d: PerfumeData): string {
  if (!d.brand) return '';
  const w = d.brand.split(' ');
  return w[0] || '';
}

// وصف بسيط بدون تعداد مكونات — مع تشكيل
function simpleDesc(): string {
  const descs = [
    'ريحَته فَخمة وثَباته قَوي',
    'ريحة راقِية تدوم طول اليَوم',
    'ريحَته تِجذب كُل مَن حَولك',
    'ريحة مُمَيَّزة ما تِتكرَّر',
    'ريحَته تِخطف الأنظار',
    'ريحة تِجمع بين الفَخامة والثَبات',
    'ريحة تِخليك مُمَيَّز وسط الكُل',
    'ريحَته تِملا المَكان فَخامة',
  ];
  return pick(descs);
}

// تقصير النص — 15 ثانية = 60 كلمة كحد أقصى
function trim(text: string, maxWords: number = 55): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  const trimmed = words.slice(0, maxWords).join(' ');
  const lastDot = trimmed.lastIndexOf('.');
  if (lastDot > trimmed.length * 0.6) return trimmed.substring(0, lastDot + 1);
  return trimmed + '.';
}

// ═══════════════════════════════════════════════════════════════
// وصف الشخصية والجودة البصرية — سينماتوغرافي محسّن
// ═══════════════════════════════════════════════════════════════

const CHAR = 'A stylish Arab man in his late 20s, black swept-back hair with clean fade, thick full black beard perfectly groomed, wearing an elegant crisp white thobe with subtle embroidery. Holds a luxury perfume bottle naturally at chest level. Warm olive skin tone, confident charismatic expression.';

const QUALITY = `Ultra-high quality 3D Pixar-style animation rendered in 4K. 
Cinematic golden-hour lighting with warm amber key light and soft blue fill. 
Smooth natural lip-sync movements matching Arabic speech. 
Direct eye contact with camera lens, talking intimately to viewer like a close trusted friend. 
Confident relaxed body language with subtle hand gestures. 
NO spraying action ever. 
Professional Hollywood-grade color grading with rich warm tones. 
Shallow depth of field f/1.4 with creamy bokeh background. 
Premium luxury advertising quality. 
Subtle lens flare and volumetric light rays. 
Film grain texture for cinematic feel.`;

// ═══════════════════════════════════════════════════════════════
// سيناريوهات عمودي (9:16) — تيك توك + ريلز
// شبابي حماسي — 12-15 ثانية — مع تشكيل كامل
// ═══════════════════════════════════════════════════════════════

const V_SCENARIOS: Scenario[] = [
  {
    id: 'compliment',
    name: 'مغناطيس المدح',
    build: (d) => {
      const n = sName(d);
      return `كُل ما أحُطّه النّاس تِمدَحني. ${n}. ${simpleDesc()}. لو تبي الكُل يِسألك وِش ريحتك هذا هو.`;
    },
    prompt: `Character reacts to imaginary compliments with proud confident smile, slowly raises perfume bottle to camera in hero shot. 
Fun energetic social media energy with quick confident head movements. 
Camera: starts medium shot then smooth dolly-in to close-up on face and bottle. 
Background: bright gradient with floating golden particles. 
Lighting: vibrant ring light with warm color temperature.`,
  },
  {
    id: 'blind_buy',
    name: 'شراء بدون شم',
    build: (d) => {
      const n = sName(d);
      return `اِشتريته بدون ما أشُمّه. ${n}. أوَّل ما فتحته اِنصدمت. ريحة فَخمة ما توقَّعتها. مِن أحلى القرارات.`;
    },
    prompt: `Character opens elegant gift box with genuine surprise expression, lifts perfume bottle, brings to nose, eyes widen with amazement and delight. 
Unboxing style with authentic excitement and natural reactions. 
Camera: overhead shot of box opening, then cut to close-up reaction face. 
Background: clean modern minimalist white marble surface with soft shadows. 
Lighting: soft overhead diffused light with warm accent.`,
  },
  {
    id: 'secret',
    name: 'السلاح السري',
    build: (d) => {
      const n = sName(d);
      return `سِلاحي السِّري قبل أي طَلعة. ${n}. يِخلّيك مُمَيَّز وسط أي مكان. ثَباته يدوم طول اليَوم.`;
    },
    prompt: `Character getting ready in front of elegant mirror, adjusts thobe collar, then dramatically reveals perfume bottle from behind back with confident wink. 
Stylish preparation montage feel. 
Camera: mirror reflection shot with rack focus from reflection to character. 
Background: luxurious dressing room with warm golden sconces. 
Lighting: dramatic side lighting creating depth and mystery.`,
  },
  {
    id: 'talking',
    name: 'الطيب يتكلم',
    build: (d) => {
      const n = sName(d);
      return `لو هالطّيب يِتكلَّم بيقول أنا ${n}. اللي يِحُطّني ما يِقدر يِستغني. ريحتي تدوم وتِخلّي الكُل يِلتفت.`;
    },
    prompt: `Character holds perfume bottle near ear as if listening to it whisper, nods knowingly, then turns to camera with playful conspiratorial smile. 
Creative imaginative storytelling style. 
Camera: starts tight on bottle near ear, pulls back to medium shot as character addresses viewer. 
Background: colorful trendy gradient with abstract perfume mist effects. 
Lighting: creative colored rim lights with warm key.`,
  },
  {
    id: 'rating',
    name: 'تقييم صريح',
    build: (d) => {
      const n = sName(d);
      return `تَقييمي الصَّريح. ${n}. الثَّبات عَشرة مِن عَشرة. الريحة مُمتازة. مِن أفضل اللي جرَّبتها صَراحة.`;
    },
    prompt: `Character counts on fingers while reviewing, pauses thoughtfully, then gives enthusiastic thumbs up with big genuine smile. 
Quick-cut review format with dynamic energy. 
Camera: medium shot with subtle zoom on each point, close-up on thumbs up. 
Background: clean studio with floating rating graphics and stars. 
Lighting: bright even studio lighting with subtle warm tone.`,
  },
  {
    id: 'date_night',
    name: 'قبل الموعد',
    build: (d) => {
      const n = sName(d);
      return `تبي تِطلع لمَوعد مُهم؟ ${n} يِكمّل لوكك. ريحَته تِمنحك ثِقة وحُضور. جَرِّبه وشوف الفَرق.`;
    },
    prompt: `Character adjusts collar in mirror, picks up perfume bottle with deliberate confident motion, applies with charming knowing smile. 
Date-night preparation atmosphere. 
Camera: starts wide establishing shot, smooth track-in to medium close-up. 
Background: elegant warm-toned room with soft ambient candle-like lighting. 
Lighting: warm romantic golden hour simulation with soft shadows.`,
  },
  {
    id: 'reaction',
    name: 'ردة الفعل',
    build: (d) => {
      const n = sName(d);
      return `رِدّة فِعلي لمّا شمّيت ${n} أوَّل مرّة. ريحة فَخمة ما توقَّعتها. مِن يومها صار المُفضَّل.`;
    },
    prompt: `Character brings perfume to nose, inhales deeply, face transforms from neutral to genuine amazement and pure delight. 
Authentic first-impression reaction video style. 
Camera: extreme close-up on face during smell, then pull back to show full excited reaction. 
Background: soft blurred warm tones. 
Lighting: soft beauty lighting with warm fill, catch lights in eyes.`,
  },
  {
    id: 'signature',
    name: 'التوقيع',
    build: (d) => {
      const n = sName(d);
      return `الريحة اللي صارت تَوقيعي. ${n}. كُل ما أدخل مكان النّاس تِعرفني. ريحة مُمَيَّزة وثَبات قَوي.`;
    },
    prompt: `Character walks in confidently through doorway in slow motion, holds perfume bottle proudly at chest level, subtle head nod to camera. 
Cinematic entrance scene with authority. 
Camera: low angle tracking shot following character entrance, then medium portrait shot. 
Background: luxury lobby with marble and warm lighting. 
Lighting: dramatic backlight creating silhouette then revealing face with warm key.`,
  },
  {
    id: 'countdown',
    name: 'العد التنازلي',
    build: (d) => {
      const n = sName(d);
      return `ثلاث ثَواني وتِحكم بنَفسك. ${n}. ريحة فَخمة وثَبات قَوي. اللي جرَّبه ما رِجع لغيره.`;
    },
    prompt: `Character holds up 3 fingers, counts down dramatically with each finger, then presents perfume bottle with explosive excitement. 
Fast-paced countdown challenge style. 
Camera: quick cuts synced with countdown, final reveal in slow motion. 
Background: high energy bright colors with countdown graphics. 
Lighting: dynamic changing colored lights synced with countdown.`,
  },
  {
    id: 'collection',
    name: 'من المجموعة',
    build: (d) => {
      const n = sName(d);
      return `مِن كُل مَجموعتي اِخترت لكم ${n}. هالطّيب له مَكانة خاصّة. ثَباته قَوي وريحَته راقِية.`;
    },
    prompt: `Character browses elegant perfume shelf display, hand glides over bottles, deliberately picks one special bottle, presents to camera with pride. 
Collector showcase style with reverence. 
Camera: tracking shot along shelf, then close-up on hand selection, medium shot presentation. 
Background: elegant dark wood shelf with warm spot lighting on bottles. 
Lighting: warm accent spots on bottles, soft key on character face.`,
  },
  {
    id: 'stop_scroll',
    name: 'وقف وشوف',
    build: (d) => {
      const n = sName(d);
      return `وَقّف. هالمَعلومة تِهمّك. ${n}. ${simpleDesc()}. لو ما جرَّبته فاتك شي كبير.`;
    },
    prompt: `Character makes dramatic stop gesture with palm toward camera, pauses, then leans in closer to camera as if sharing a secret, reveals perfume. 
Scroll-stopping attention grab format. 
Camera: starts with fast zoom to palm, then intimate close-up as character leans in. 
Background: bold vibrant gradient that demands attention. 
Lighting: bright punchy front lighting with dramatic rim light.`,
  },
  {
    id: 'challenge',
    name: 'التحدي',
    build: (d) => {
      const n = sName(d);
      return `تحدَّيت نَفسي ألقى ريحة كامِلة بكُل شي. ${n}. فَخامة وثَبات وسِعر مُمتاز. التَّحدي نِجح.`;
    },
    prompt: `Character accepts challenge with determined expression, examines perfume bottle carefully, tests it, then celebrates with victorious fist pump and big smile. 
Challenge accepted and completed format. 
Camera: dynamic angles following the challenge journey, triumphant final shot. 
Background: fun competitive atmosphere with challenge graphics. 
Lighting: energetic bright lighting with celebratory warm burst at end.`,
  },
];

// ═══════════════════════════════════════════════════════════════
// سيناريوهات أفقي (16:9) — يوتيوب
// ثقافي معلوماتي — 15-18 ثانية — مع تشكيل كامل
// ═══════════════════════════════════════════════════════════════

const H_SCENARIOS: Scenario[] = [
  {
    id: 'history',
    name: 'تاريخ الماركة',
    build: (d) => {
      const n = sName(d);
      const b = bName(d);
      return `القِصّة وراء هالطّيب ما يِعرفها كثير. ${b ? `${b} مِن أقدم بيوت الطّيب.` : 'هالماركة لها تاريخ طَويل.'} ${n}. ${simpleDesc()}. كُل تَفصيلة فيه مَدروسة بدِقّة.`;
    },
    prompt: `Character sits in elegant leather chair in sophisticated study, speaks knowledgeably and passionately to camera about brand heritage. 
Documentary presenter style with gravitas and warmth. 
Camera: wide establishing shot of study, then medium shot with subtle push-in during key points. 
Background: rich wood-paneled study with leather-bound books, vintage perfume bottles, warm ambient lighting. 
Lighting: warm cinematic three-point lighting with practical desk lamp accent.`,
  },
  {
    id: 'expert',
    name: 'رأي الخبير',
    build: (d) => {
      const n = sName(d);
      return `رأيي كخَبير. هالطّيب يِستاهل مكان في مَجموعتك. ${n}. الطَّبقة الأولى تِجذبك والقاعِدة تِخلّيها تدوم ساعات. تَركيبة ذَكيّة.`;
    },
    prompt: `Character explains with professional authoritative hand gestures, occasionally gestures to perfume bottle on elegant display stand. 
Expert review format with educational depth. 
Camera: medium shot with subtle side angle, occasional close-up inserts of bottle details. 
Background: elegant desk with perfume on crystal stand, soft blurred luxury office. 
Lighting: warm professional key light with soft fill, accent on bottle.`,
  },
  {
    id: 'debate',
    name: 'جدل ورأي',
    build: (d) => {
      const n = sName(d);
      const b = bName(d);
      return `هالطّيب فيه جَدل كبير. ${n}${b ? ` مِن ${b}` : ''}. البَعض يقول سِعره مُبالغ فيه. بس لمّا تِجرّبه تِفهم ليش. الثَّبات قَوي والريحة فَخمة. يِستاهل كُل ريال.`;
    },
    prompt: `Character presents both sides of debate with expressive balanced gestures, weighs pros and cons with hands, then gives confident decisive verdict with firm nod. 
Professional debate and analysis format. 
Camera: medium shot with dynamic angle changes for each argument, centered final verdict shot. 
Background: professional studio with subtle split lighting suggesting two sides. 
Lighting: balanced professional lighting, slightly warmer on verdict moment.`,
  },
  {
    id: 'season',
    name: 'طيب الموسم',
    build: (d) => {
      const n = sName(d);
      return `الطّيب المِثالي لهالمَوسم. ${n}. مُكوّناته تِتفاعل مع الجَو بشكل مِثالي. ريحَته تكون أحلى في البَرد وتدوم أطوَل. نَصيحتي خلّوه في مَجموعتكم.`;
    },
    prompt: `Character presents perfume with seasonal context, gestures to suggest weather and atmosphere, holds bottle warmly. 
Seasonal recommendation format with cozy informative mood. 
Camera: medium-wide establishing shot, then medium shot with warm intimate feel. 
Background: cozy elegant setting with seasonal elements, warm textures and fabrics. 
Lighting: warm golden ambient lighting suggesting the season, soft and inviting.`,
  },
  {
    id: 'facts',
    name: 'حقائق مثيرة',
    build: (d) => {
      const n = sName(d);
      const b = bName(d);
      return `حَقيقة بتِغيّر نَظرتك. ${b ? `هل تِدري إن ${b} بَدأت كشَركة صغيرة؟` : 'هالماركة لها قِصّة نَجاح مُذهلة.'} ${n} مِن أنجح إصداراتهم. الطّيب الفاخر يِتفاعل مع بَشرتك ويِعطي ريحة مُختلفة لكُل شخص.`;
    },
    prompt: `Character shares fascinating facts with enthusiastic educational energy, uses expressive storytelling gestures, leans in for key revelations. 
Educational storytelling format with genuine passion. 
Camera: medium shot with push-in during surprising facts, occasional close-up for emphasis. 
Background: elegant library setting with warm ambient lighting, books and artifacts. 
Lighting: warm storytelling lighting with subtle dramatic shifts during revelations.`,
  },
  {
    id: 'value',
    name: 'تحليل القيمة',
    build: (d) => {
      const n = sName(d);
      return `ليش هالطّيب يِتفوَّق على اللي أغلى مِنه؟ ${n}. الجَودة مو بالسِّعر. ثَباته قَوي وريحَته مُنافسة لأغلى الماركات. لو تبي قيمة حَقيقية هذا اِختيارك.`;
    },
    prompt: `Character compares thoughtfully with analytical gestures, weighs value proposition with confident balanced assessment. 
Value analysis and comparison format. 
Camera: medium shot with clean composition, occasional two-shot with bottle for scale. 
Background: professional clean setting suggesting objectivity and analysis. 
Lighting: balanced professional lighting with warm undertones.`,
  },
  {
    id: 'layering',
    name: 'نصيحة الخلط',
    build: (d) => {
      const n = sName(d);
      return `لو تِخلطه مع طيب ثاني وِش يِصير؟ ${n}. لو تِضيف طيب خَشبي تِحصل على مَزيج رهيب. سِر الخُبراء إنّهم يِخلطون الطَّبقات لريحة فَريدة.`;
    },
    prompt: `Character demonstrates layering technique with two elegant bottles, shows combination process with expert precision and excitement about the result. 
Expert workshop and tutorial format. 
Camera: medium shot establishing, close-up inserts on bottles during layering demonstration. 
Background: elegant perfumer workshop setting with warm wood and glass elements. 
Lighting: warm workshop lighting with accent spots on bottles and hands.`,
  },
  {
    id: 'journey',
    name: 'رحلة الريحة',
    build: (d) => {
      const n = sName(d);
      return `خلّوني آخذكم في رِحلة مع ${n}. أوَّل ما تِحُطّه تِحس بنَفحة مُنعشة. بعد ساعة تِتحوَّل لريحة دافِية. وبالليل تِصير أغنى وأعمق. تَجربة كامِلة.`;
    },
    prompt: `Character takes viewer on olfactory journey through time, gestures showing progression and transformation, expressions change with each phase. 
Cinematic time-lapse storytelling format. 
Camera: smooth tracking shot with subtle lighting transitions suggesting time passing. 
Background: transitions from bright morning to warm afternoon to rich evening atmosphere. 
Lighting: dynamic lighting that shifts from cool bright to warm golden to rich amber through the narrative.`,
  },
];

// ═══════════════════════════════════════════════════════════════
// محرك التوليد
// ═══════════════════════════════════════════════════════════════

export interface GeneratedVideoContent {
  voiceoverText: string;
  videoPrompt: string;
  scenarioId: string;
  scenarioName: string;
  hook: string;
}

export function generateVerticalContent(perfumeData: PerfumeData): GeneratedVideoContent {
  const sc = pick(V_SCENARIOS);
  const outro = pick(OUTROS);
  const script = sc.build(perfumeData);
  const full = `${script} ${outro}`;
  const final = trim(full, 55);

  const hook = script.split(/[.!]/)[0]?.trim() || '';
  const vp = `${sc.prompt}

CHARACTER: ${CHAR}

QUALITY: ${QUALITY}

COMPOSITION: Vertical 9:16 portrait orientation optimized for mobile viewing. 
Energetic youthful vibe matching TikTok and Instagram Reels trending aesthetic. 
Character speaks directly to camera with genuine enthusiasm and charisma. 
Fast-paced editing rhythm with smooth transitions.`;

  return {
    voiceoverText: final,
    videoPrompt: vp,
    scenarioId: sc.id,
    scenarioName: sc.name,
    hook,
  };
}

export function generateHorizontalContent(perfumeData: PerfumeData): GeneratedVideoContent {
  const sc = pick(H_SCENARIOS);
  const outro = pick(OUTROS);
  const script = sc.build(perfumeData);
  const full = `${script} ${outro}`;
  const final = trim(full, 60);

  const hook = script.split(/[.!]/)[0]?.trim() || '';
  const vp = `${sc.prompt}

CHARACTER: ${CHAR}

QUALITY: ${QUALITY}

COMPOSITION: Horizontal 16:9 widescreen cinematic composition optimized for YouTube. 
Professional documentary feel with warm informative atmosphere. 
Character speaks to camera with authority, warmth, and genuine expertise. 
Measured pacing with elegant transitions and breathing room.`;

  return {
    voiceoverText: final,
    videoPrompt: vp,
    scenarioId: sc.id,
    scenarioName: sc.name,
    hook,
  };
}

export function generateVideoContents(perfumeData: PerfumeData): {
  vertical: GeneratedVideoContent;
  horizontal: GeneratedVideoContent;
} {
  return {
    vertical: generateVerticalContent(perfumeData),
    horizontal: generateHorizontalContent(perfumeData),
  };
}

// ============================================================
// lib/mahwousCaptionEngine.ts — محرك كابشنات مهووس SEO المحسّن v2
// 50+ قالب كابشن متنوع لكل منصة مع هاشتاقات ترند 2025/2026
// ============================================================

// ─── هوية مهووس الثابتة ────────────────────────────────────────
export const MAHWOUS_IDENTITY = {
  name: 'مهووس ستور',
  nameEn: 'Mahwous Store',
  tagline: 'نبيع عطور ماركات عالمية أصلية 100%',
  personality: 'خبير عطور سعودي، ودود، واثق، يتكلم بلهجة سعودية طبيعية',
  tone: 'ودي، حماسي، خبير، قريب من الناس',
  note: 'نحن نبيع ماركات عالمية أصلية — المنتجات متوفرة لدينا ولدى المنافسين، ميزتنا الخدمة والتجربة',
  whatsapp: '+966553964135',
  whatsappLink: 'https://wa.me/966553964135',
  storeUrl: 'https://mahwous.com',
};

// ─── كلمات SEO الأكثر بحثاً ───────────────────────────────────
export const SEO_KEYWORDS = {
  primary: [
    'عطور أصلية', 'عطر رجالي', 'عطر نسائي', 'أفضل عطر',
    'عطور ماركات', 'عطور فخمة', 'عطر يثبت', 'عطر يفوح',
    'perfume', 'fragrance', 'original perfume', 'luxury perfume',
  ],
  secondary: [
    'هدية عطر', 'عطر مناسبات', 'عطر يومي', 'عطر صيفي', 'عطر شتوي',
    'عطر مسائي', 'عطر للعمل', 'عطر للسهرة', 'توصيل عطور',
    'عطور السعودية', 'عطور الرياض', 'عطور جدة',
  ],
  trending2026: [
    'عطر_الموسم', 'عطر_اليوم', 'عطري_المفضل', 'عطور_2026',
    'PerfumeTok', 'FragranceCommunity', 'PerfumeCollection',
    'SaudiPerfume', 'ArabPerfume', 'NicheFragrance',
    'ScentOfTheDay', 'PerfumeAddict', 'FragranceLover',
  ],
};

// ─── هاشتاقات ترند لكل منصة ────────────────────────────────────
export function getTrendingHashtags(platform: string, perfumeName: string, brand: string): string[] {
  const brandTag = `#${brand.replace(/\s+/g, '_')}`;
  const nameTag = `#${perfumeName.replace(/\s+/g, '_')}`;

  const base = [
    '#عطور', '#عطور_أصلية', '#مهووس_ستور', brandTag, nameTag,
    '#perfume', '#fragrance',
  ];

  const platformSpecific: Record<string, string[]> = {
    instagram: [
      '#عطور_انستقرام', '#عطر_اليوم', '#عطري_المفضل',
      '#PerfumeOfTheDay', '#FragranceLover', '#PerfumeAddict',
      '#ScentOfTheDay', '#عطور_فخمة', '#luxury',
      '#السعودية', '#الرياض', '#جدة', '#عطور_ماركات',
      '#Explore', '#Reels', '#InstaFragrance',
    ],
    facebook: [
      '#عطور_فيسبوك', '#عروض_عطور', '#تخفيضات',
      '#عطور_أصلية_للبيع', '#هدايا', '#عطور_رجالية',
      '#عطور_نسائية', '#ماركات_أصلية',
    ],
    twitter: [
      '#عطور', '#عطر', '#السعودية', '#الرياض',
      '#PerfumeTweet', '#Fragrance', '#عطور_تويتر',
    ],
    tiktok: [
      '#PerfumeTok', '#عطور_تيك_توك', '#fyp', '#viral',
      '#foryou', '#trending', '#عطر_اليوم', '#تجربة_عطر',
      '#SmellGood', '#PerfumeReview', '#FragranceTok',
      '#عطور_ماركات', '#أفضل_عطر', '#عطر_يثبت',
    ],
    linkedin: [
      '#Perfume', '#Fragrance', '#LuxuryBrands', '#Retail',
      '#SaudiArabia', '#Ecommerce', '#عطور',
    ],
    youtube: [
      '#عطور', '#مراجعة_عطر', '#PerfumeReview', '#FragranceReview',
      '#BestPerfume', '#TopFragrance', '#عطر_اليوم',
      '#أفضل_عطور', '#عطور_رجالية', '#عطور_نسائية',
    ],
    pinterest: [
      '#Perfume', '#Fragrance', '#LuxuryPerfume', '#PerfumeBottle',
      '#عطور', '#عطور_فخمة', '#PerfumeAesthetic',
    ],
    google_business: [
      '#عطور_أصلية', '#متجر_عطور', '#عطور_الرياض',
    ],
  };

  return [...base, ...(platformSpecific[platform] || [])].slice(0, platform === 'instagram' ? 25 : platform === 'tiktok' ? 15 : 8);
}

// ─── ترجمة المكونات الإنجليزية إلى عربي ───────────────────────
export function translateNotes(raw: string): string {
  if (!raw) return 'مكونات فاخرة تأسر الحواس';
  const map: Record<string, string> = {
    'oud': 'عود', 'musk': 'مسك', 'amber': 'عنبر', 'vanilla': 'فانيلا',
    'patchouli': 'باتشولي', 'sandalwood': 'صندل', 'bergamot': 'برغموت',
    'jasmine': 'ياسمين', 'rose': 'ورد', 'cedar': 'خشب الأرز', 'vetiver': 'فيتيفر',
    'saffron': 'زعفران', 'cardamom': 'هيل', 'cinnamon': 'قرفة', 'iris': 'زنبق',
    'lavender': 'لافندر', 'tonka': 'تونكا', 'incense': 'بخور', 'leather': 'جلد',
    'tobacco': 'تبغ', 'pepper': 'فلفل', 'ginger': 'زنجبيل', 'lemon': 'ليمون',
    'orange': 'برتقال', 'lime': 'ليم', 'geranium': 'جيرانيوم', 'tuberose': 'مسك الليل',
    'ylang': 'إيلانغ', 'neroli': 'نيرولي', 'benzoin': 'بنزوين', 'myrrh': 'مر',
    'frankincense': 'لبان', 'agarwood': 'دهن العود', 'woody': 'خشبي',
    'floral': 'زهري', 'oriental': 'شرقي', 'fresh': 'منعش', 'citrus': 'حمضي',
    'spicy': 'حار', 'sweet': 'حلو', 'warm': 'دافئ', 'aquatic': 'مائي',
  };
  let result = raw;
  for (const [en, ar] of Object.entries(map)) {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ar);
  }
  return result;
}

// ─── أدوات مساعدة ──────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type CaptionFn = (n: string, b: string) => string;

// ─── قوالب كابشنات انستقرام (بوست) ─────────────────────────────
const INSTAGRAM_POST_TEMPLATES: CaptionFn[] = [
  (n, b) => `${n} من ${b} — عطر يخليك تحس إنك ملك\n\nمن أول بخة تعرف إنه مو عادي. ثبات خرافي وفوحان يسحر كل اللي حولك.\n\nجربه وراح تشكرني بعدين`,
  (n, b) => `لو تبي عطر يخلي الناس تسألك "وش حاط؟"\n\nالجواب: ${n} من ${b}\n\nعطر يتكلم عنك قبل ما تتكلم. فخامة في كل قطرة.`,
  (n, b) => `${b} ما يحتاج تعريف، بس ${n} شي ثاني!\n\nعطر يناسب كل المناسبات — من الدوام للسهرة. ثباته يوم كامل بدون مبالغة.`,
  (n, b) => `سألوني وش أفضل عطر جربته هالسنة؟\n\nبدون تردد: ${n} من ${b}\n\nمكوناته فخمة، ثباته عالي، وفوحانه يخطف الأنظار.`,
  (n, b) => `عطرك يحكي شخصيتك — وهذا يحكي فخامة\n\n${n} من ${b}\n\nاختيار الذواقة اللي يعرفون الأصلي من التقليد.`,
  (n, b) => `مو كل عطر يستاهل مكان في مجموعتك...\nبس ${n} من ${b} يستاهل يكون النجم\n\nجربه مرة وراح يصير رفيقك الدائم.`,
  (n, b) => `تبي تترك أثر؟ خل عطرك يتكلم\n\n${n} — ${b}\n\nعطر يخلي الناس تتذكرك حتى بعد ما تمشي.`,
  (n, b) => `الفخامة مو بس في الشكل — الفخامة في الريحة\n\n${n} من ${b}\n\nعطر أصلي 100% — نفس اللي تلقاه في أكبر المحلات العالمية.`,
  (n, b) => `كل يوم عطر جديد؟ لا! كل يوم نفس العطر اللي يسحر\n\n${n} — ${b}\n\nلأن العطر الصح ما تمل منه.`,
  (n, b) => `هذا مو مجرد عطر — هذا ستايل حياة\n\n${n} من ${b}\n\nاختيارك يعكس ذوقك. اختار الأفضل.`,
];

// ─── قوالب كابشنات انستقرام (ستوري) ────────────────────────────
const INSTAGRAM_STORY_TEMPLATES: CaptionFn[] = [
  (n, b) => `بخة واحدة كفيلة تغير يومك!\n${n} — ${b}`,
  (n, b) => `عطر اليوم: ${n} من ${b}\nوش رأيكم؟`,
  (n, b) => `جربته اليوم وأقول واو!\n${n} — ${b}`,
  (n, b) => `سحبة سريعة على ${n}\nمن ${b} — أصلي 100%`,
  (n, b) => `اللي يبي يسأل عن العطر — هذا هو!\n${n} — ${b}`,
];

// ─── قوالب كابشنات فيسبوك ──────────────────────────────────────
const FACEBOOK_POST_TEMPLATES: CaptionFn[] = [
  (n, b) => `${n} من ${b}\n\nعطر يستاهل يكون في مجموعتك! ثبات عالي وفوحان يملي المكان.\n\nأصلي 100% — متوفر الآن في مهووس ستور.\n\nاطلبه وجربه بنفسك`,
  (n, b) => `هل جربت ${n} من ${b}؟\n\nواحد من أفضل العطور اللي مرت علينا هالموسم. مكوناته فخمة وثباته يوم كامل.\n\nمتوفر الآن — اطلبه قبل ما يخلص!`,
  (n, b) => `عطر الأسبوع: ${n} — ${b}\n\nليش نحبه؟\nثبات خرافي\nفوحان راقي\nيناسب كل المناسبات\nأصلي 100%\n\nمتوفر في مهووس ستور`,
  (n, b) => `تدور عطر هدية؟\n\n${n} من ${b} — اختيار ما يخيب!\n\nعطر فخم يناسب الرجال والنساء. اطلبه الآن من مهووس ستور.`,
  (n, b) => `${n} — ${b}\n\nمن العطور اللي كل ما جربتها أكثر حبيتها.\n\nالريحة تتطور مع الوقت وتعطيك إحساس مختلف كل ساعة.\n\nجربه وقول لنا رأيك!`,
];

// ─── قوالب كابشنات فيسبوك (ستوري) ──────────────────────────────
const FACEBOOK_STORY_TEMPLATES: CaptionFn[] = [
  (n, b) => `عطر اليوم ${n} — ${b}\nمتوفر في مهووس ستور`,
  (n, b) => `${n} من ${b} — جربه وراح تدمن عليه!`,
  (n, b) => `بخة واحدة = يوم كامل فخامة\n${n} — ${b}`,
];

// ─── قوالب كابشنات تويتر ───────────────────────────────────────
const TWITTER_TEMPLATES: CaptionFn[] = [
  (n, b) => `${n} من ${b} — عطر يخليك تحس بالثقة من أول بخة\n\nأصلي 100% | متوفر في مهووس ستور`,
  (n, b) => `سألوني وش حاط؟\n${n} — ${b}\n\nعطر يتكلم عنك قبل ما تتكلم`,
  (n, b) => `لو عندك عطر واحد بس تختاره — ${n} من ${b}\n\nثبات يوم كامل + فوحان يسحر`,
  (n, b) => `عطر ${n} من ${b} = الفخامة في قارورة\n\nجربه مرة وراح يصير المفضل`,
  (n, b) => `تبي عطر يخلي الناس تسألك عنه؟\n\n${n} — ${b}\n\nمتوفر الآن في مهووس ستور`,
];

// ─── قوالب كابشنات تيك توك ──────────────────────────────────────
const TIKTOK_TEMPLATES: CaptionFn[] = [
  (n, b) => `هذا العطر خلى كل اللي حولي يسألوني وش حاط!\n\n${n} من ${b}\n\nأصلي 100% من مهووس ستور`,
  (n, b) => `POV: لقيت عطر يثبت معك من الصبح لآخر الليل\n\n${n} — ${b}`,
  (n, b) => `تحدي: شم هالعطر وقول لي مو حلو! مستحيل\n\n${n} من ${b}`,
  (n, b) => `العطر اللي كل الناس تسأل عنه\n\n${n} — ${b}\n\nالرابط في البايو`,
  (n, b) => `لا تشتري عطر قبل ما تشوف هالفيديو!\n\n${n} من ${b} — راح يغير رأيك عن العطور`,
  (n, b) => `ردة فعلي لما شميت ${n} أول مرة\n\nمن ${b} — عطر مو طبيعي!`,
  (n, b) => `عطر واحد بس يكفي يخلي يومك كامل فخامة\n\n${n} — ${b}\n\nجربه وشكرني بعدين`,
];

// ─── قوالب كابشنات لينكدإن ──────────────────────────────────────
const LINKEDIN_TEMPLATES: CaptionFn[] = [
  (n, b) => `في عالم العطور، الجودة تتكلم عن نفسها.\n\n${n} من ${b} — عطر يعكس الذوق الرفيع والاهتمام بالتفاصيل.\n\nفي مهووس ستور، نؤمن أن العطر جزء من هويتك المهنية والشخصية.\n\nماركات عالمية أصلية 100% — نوصلها لباب بيتك.`,
  (n, b) => `الانطباع الأول يبدأ من عطرك.\n\n${n} — ${b}\n\nاختيار العطر المناسب يعكس احترافيتك واهتمامك بالتفاصيل.\n\nمهووس ستور — عطور ماركات عالمية أصلية.`,
  (n, b) => `هل تعلم أن 80% من الانطباعات الأولى تتأثر بالرائحة؟\n\n${n} من ${b} — اختيار يليق بمكانتك.\n\nمتوفر في مهووس ستور — أصلي 100%.`,
];

// ─── قوالب كابشنات يوتيوب ──────────────────────────────────────
const YOUTUBE_TEMPLATES: CaptionFn[] = [
  (n, b) => `مراجعة ${n} من ${b} — هل يستاهل السعر؟\n\nفي هالفيديو راح أعطيكم رأيي الصريح عن هالعطر:\n- الثبات\n- الفوحان\n- المكونات\n- يناسب مين؟\n\nتابعوا للنهاية عشان تعرفون!\n\nمتوفر في مهووس ستور — أصلي 100%`,
  (n, b) => `${n} — ${b} | مراجعة كاملة\n\nعطر يستحق مكان في مجموعتك؟ شوف الفيديو وقرر بنفسك!\n\nمهووس ستور — عطور ماركات عالمية أصلية`,
  (n, b) => `أفضل عطر جربته هالشهر! ${n} من ${b}\n\nشوف ليش هالعطر مميز وليش الكل يمدحه.\n\nاطلبه من مهووس ستور — الرابط في الوصف`,
];

// ─── قوالب كابشنات بنترست ──────────────────────────────────────
const PINTEREST_TEMPLATES: CaptionFn[] = [
  (n, b) => `${n} by ${b} — Luxury Perfume\n\nOriginal 100% | Available at Mahwous Store\n\nعطر فخم يناسب كل المناسبات`,
  (n, b) => `Perfume of the Day: ${n} — ${b}\n\nElegant, Long-lasting, Irresistible\n\nShop at Mahwous Store`,
  (n, b) => `${b} ${n} — The Perfect Scent\n\nDiscover luxury fragrances at Mahwous Store\n\nأصلي 100% — عطور ماركات عالمية`,
];

// ─── قوالب كابشنات واتساب ──────────────────────────────────────
const WHATSAPP_TEMPLATES: CaptionFn[] = [
  (n, b) => `السلام عليكم\n\nعطر جديد وصلنا:\n\n*${n}* من *${b}*\n\nأصلي 100%\nثبات عالي\nتوصيل سريع\n\nللطلب تواصل معنا مباشرة\n\nمهووس ستور — ذوقك يستاهل الأفضل`,
  (n, b) => `مساء الخير\n\nتبي عطر يخلي يومك أحلى؟\n\n*${n}* — *${b}*\n\nعطر فخم بسعر مناسب\n\nتبي تطلب؟ رد علينا\n\nمهووس ستور`,
  (n, b) => `عطر اليوم\n\n*${n}* من *${b}*\n\nمن أفضل العطور اللي عندنا!\n\nالسعر: تواصل معنا\nالتوصيل: متاح\n\nمهووس ستور — عطور أصلية`,
];

// ─── قوالب كابشنات حراج ────────────────────────────────────────
const HARAJ_TEMPLATES: CaptionFn[] = [
  (n, b) => `للبيع: عطر ${n} من ${b}\n\nأصلي 100% — ماركة عالمية\nثبات عالي — يوم كامل\nفوحان قوي وراقي\n\nالتوصيل متاح لجميع مناطق المملكة\n\nمهووس ستور — عطور ماركات عالمية أصلية\n\nللتواصل والطلب: راسلني`,
  (n, b) => `عطر ${n} — ${b}\n\nأصلي 100%\nجديد بالكرتون\n\nالسعر: تواصل خاص\nالتوصيل: متاح\n\nمهووس ستور`,
  (n, b) => `${n} من ${b} — عطر فخم أصلي\n\nماركة عالمية معروفة\nثبات ممتاز\nمناسب لكل المناسبات\n\nللطلب: تواصل معي\n\nمهووس ستور — نوصل لباب بيتك`,
];

// ─── قوالب كابشنات سناب شات ────────────────────────────────────
const SNAPCHAT_TEMPLATES: CaptionFn[] = [
  (n, b) => `${n} من ${b}\nعطر يسحر — جربه!`,
  (n, b) => `بخة اليوم ${n}\nمن ${b} — أصلي`,
  (n, b) => `وش حاط اليوم؟\n${n} — ${b}`,
];

// ─── قوالب كابشنات تلقرام ──────────────────────────────────────
const TELEGRAM_TEMPLATES: CaptionFn[] = [
  (n, b) => `عطر مميز: ${n} من ${b}\n\nأصلي 100%\nثبات عالي\nفوحان راقي\n\nمتوفر الآن في مهووس ستور\n\nللطلب تواصل معنا مباشرة`,
  (n, b) => `${n} — ${b}\n\nمن أفضل العطور اللي وصلتنا!\n\nاطلبه الآن — مهووس ستور`,
];

// ─── قوالب كابشنات قوقل بزنس ───────────────────────────────────
const GOOGLE_BUSINESS_TEMPLATES: CaptionFn[] = [
  (n, b) => `عطر ${n} من ${b} متوفر الآن في مهووس ستور!\n\nعطر أصلي 100% بثبات عالي وفوحان راقي.\n\nاطلبه أونلاين الآن.`,
  (n, b) => `جديد في مهووس ستور: ${n} — ${b}\n\nماركة عالمية أصلية. اطلبه الآن!`,
];

// ─── الدالة الرئيسية: توليد كابشنات لكل المنصات ────────────────
export function generateAllCaptions(
  perfumeName: string,
  brand: string,
  productUrl?: string,
  notes?: string | string[],
  description?: string,
  price?: string,
): Record<string, string> {
  const n = perfumeName || 'العطر';
  const b = brand || 'الماركة';
  const url = productUrl || MAHWOUS_IDENTITY.storeUrl;
  const wa = MAHWOUS_IDENTITY.whatsappLink;
  const notesStr = typeof notes === 'string' ? translateNotes(notes) : Array.isArray(notes) ? translateNotes(notes.join(', ')) : '';
  const priceStr = price ? price.replace(/SAR/gi, 'ريال') : '';

  // إضافة معلومات إضافية للكابشنات
  function addInfo(caption: string, platform: string): string {
    const parts = [caption];

    // إضافة المكونات إن وجدت
    if (notesStr && ['instagram_post', 'facebook_post', 'youtube_thumbnail', 'whatsapp', 'haraj', 'telegram'].includes(platform)) {
      parts.push(`\nالمكونات: ${notesStr}`);
    }

    // إضافة السعر إن وجد
    if (priceStr && ['whatsapp', 'haraj', 'telegram'].includes(platform)) {
      parts.push(`السعر: ${priceStr}`);
    }

    // إضافة رابط الواتساب
    if (['instagram_post', 'facebook_post', 'whatsapp', 'haraj', 'telegram', 'snapchat'].includes(platform)) {
      parts.push(`\nللطلب: ${wa}`);
    }

    // إضافة رابط المنتج
    if (['facebook_post', 'linkedin', 'pinterest', 'youtube_thumbnail'].includes(platform)) {
      parts.push(`\n${url}`);
    }

    // إضافة الهاشتاقات
    const hashtags = getTrendingHashtags(
      platform.replace('_post', '').replace('_story', '').replace('_thumbnail', ''),
      perfumeName, brand
    );
    if (['instagram_post', 'facebook_post', 'tiktok', 'twitter', 'youtube_thumbnail', 'pinterest'].includes(platform)) {
      parts.push(`\n${hashtags.join(' ')}`);
    }

    return parts.join('\n');
  }

  const captions: Record<string, string> = {
    instagram_post: addInfo(pick(INSTAGRAM_POST_TEMPLATES)(n, b), 'instagram_post'),
    instagram_story: pick(INSTAGRAM_STORY_TEMPLATES)(n, b),
    facebook_post: addInfo(pick(FACEBOOK_POST_TEMPLATES)(n, b), 'facebook_post'),
    facebook_story: pick(FACEBOOK_STORY_TEMPLATES)(n, b),
    twitter: addInfo(pick(TWITTER_TEMPLATES)(n, b), 'twitter'),
    tiktok: addInfo(pick(TIKTOK_TEMPLATES)(n, b), 'tiktok'),
    linkedin: addInfo(pick(LINKEDIN_TEMPLATES)(n, b), 'linkedin'),
    youtube_thumbnail: addInfo(pick(YOUTUBE_TEMPLATES)(n, b), 'youtube_thumbnail'),
    youtube_shorts: pick(TIKTOK_TEMPLATES)(n, b),
    pinterest: addInfo(pick(PINTEREST_TEMPLATES)(n, b), 'pinterest'),
    whatsapp: addInfo(pick(WHATSAPP_TEMPLATES)(n, b), 'whatsapp'),
    haraj: addInfo(pick(HARAJ_TEMPLATES)(n, b), 'haraj'),
    snapchat: pick(SNAPCHAT_TEMPLATES)(n, b),
    telegram: addInfo(pick(TELEGRAM_TEMPLATES)(n, b), 'telegram'),
    google_business: pick(GOOGLE_BUSINESS_TEMPLATES)(n, b),
    truth_social: `${n} by ${b}\n\nLuxury fragrance that speaks elegance\n\n${url}\n\n#Perfume #Luxury #${b.replace(/\s+/g, '')}`,
  };

  return captions;
}

// ─── توليد هاشتاقات لكل المنصات ────────────────────────────────
export function generateAllHashtags(
  perfumeName: string,
  brand: string
): Record<string, string[]> {
  const platforms = [
    'instagram', 'facebook', 'twitter', 'tiktok',
    'linkedin', 'youtube', 'pinterest', 'google_business',
  ];

  const result: Record<string, string[]> = {};
  for (const p of platforms) {
    result[p] = getTrendingHashtags(p, perfumeName, brand);
  }

  return result;
}

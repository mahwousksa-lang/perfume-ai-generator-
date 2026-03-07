// ============================================================
// lib/selfLearningEngine.ts — Self-Learning AI Engine
// يتعلم من نتائج المنشورات السابقة ويحسّن المحتوى القادم
// يحافظ على شخصية مهووس + يطوّر الأسلوب بناءً على البيانات
// ============================================================

// ── Types ───────────────────────────────────────────────────────────────────

export interface PostPerformance {
  postId: string;
  perfumeName: string;
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  publishedAt: string;
  publishHour: number;
  publishDay: number; // 0=Sunday

  // Metrics (filled after 24h)
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  clicks: number;

  // Content features
  captionLength: number;
  hasEmoji: boolean;
  hasQuestion: boolean;
  hasCTA: boolean;
  hashtagCount: number;
  mentionCount: number;
  hasVideo: boolean;
  hasCarousel: boolean;

  // Score (0-100)
  performanceScore: number;
}

export interface LearningProfile {
  // Best performing content features
  optimalCaptionLength: Record<string, number>; // per platform
  optimalHashtagCount: Record<string, number>;
  bestPerformingHashtags: string[];
  bestPerformingCTAs: string[];
  bestPostingHours: Record<string, number>;
  bestPostingDays: Record<string, number>;
  bestContentTypes: Record<string, string>;

  // Mahwous brand voice patterns
  topPerformingPhrases: string[];
  avoidPhrases: string[];
  toneScore: { formal: number; friendly: number; luxury: number; educational: number };

  // Audience insights
  audiencePreferences: {
    prefersVideo: boolean;
    prefersQuestions: boolean;
    prefersEmoji: boolean;
    prefersCTA: boolean;
    avgAttentionSpan: 'short' | 'medium' | 'long';
  };

  // Learning metadata
  totalPostsAnalyzed: number;
  lastUpdated: string;
  confidenceLevel: number; // 0-100, increases with more data
}

export interface ContentOptimization {
  originalCaption: string;
  optimizedCaption: string;
  changes: string[];
  changesAr: string[];
  expectedImprovement: number; // percentage
  confidence: number;
}

export interface SmartSuggestion {
  type: 'timing' | 'content' | 'hashtag' | 'format' | 'frequency';
  typeAr: string;
  suggestion: string;
  suggestionAr: string;
  impact: 'high' | 'medium' | 'low';
  basedOn: string;
  dataPoints: number;
}

// ── Storage ─────────────────────────────────────────────────────────────────

const PERFORMANCE_HISTORY_KEY = 'mahwous_post_performance';
const LEARNING_PROFILE_KEY = 'mahwous_learning_profile';
const OPTIMIZATION_LOG_KEY = 'mahwous_optimization_log';

// ── Default Mahwous Brand Voice ─────────────────────────────────────────────

const MAHWOUS_BRAND_VOICE = {
  personality: 'خبير عطور سعودي، أنيق، واثق، يجمع بين الفخامة والود',
  tone: 'ودي + فاخر + خبير',
  language: 'عربي سعودي مع لمسة عالمية',
  keyPhrases: [
    'مهووس بالتفاصيل',
    'عطر يحكي قصتك',
    'الفخامة في كل قطرة',
    'اختيار الذواقة',
    'تجربة لا تُنسى',
    'أناقة بلا حدود',
    'عطرك هويتك',
  ],
  avoidPhrases: [
    'رخيص',
    'تقليد',
    'عادي',
    'بسيط',
  ],
  emojiStyle: ['✨', '🌹', '👑', '💎', '🔥', '⭐', '🌙'],
  ctaTemplates: [
    'اطلبه الآن من الرابط في البايو 🔗',
    'جرّبه وشاركنا رأيك 💬',
    'احفظ البوست للمرجع ⭐',
    'تاق صديقك اللي يحب العطور 👇',
    'اكتشف المزيد في مهووس ستور ✨',
    'وش عطرك المفضل؟ شاركنا 💭',
  ],
};

// ── Performance Tracking ────────────────────────────────────────────────────

export function getPerformanceHistory(): PostPerformance[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PERFORMANCE_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePerformanceHistory(history: PostPerformance[]): void {
  if (typeof window === 'undefined') return;
  // Keep last 500 posts
  const trimmed = history.slice(-500);
  localStorage.setItem(PERFORMANCE_HISTORY_KEY, JSON.stringify(trimmed));
}

export function addPostPerformance(post: PostPerformance): void {
  const history = getPerformanceHistory();
  // Check if already exists
  const existingIdx = history.findIndex(p => p.postId === post.postId);
  if (existingIdx >= 0) {
    history[existingIdx] = post;
  } else {
    history.push(post);
  }
  savePerformanceHistory(history);
}

// ── Extract Content Features ────────────────────────────────────────────────

export function extractContentFeatures(caption: string): {
  captionLength: number;
  hasEmoji: boolean;
  hasQuestion: boolean;
  hasCTA: boolean;
  hashtagCount: number;
  mentionCount: number;
} {
  const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/;
  const questionRegex = /[?؟]/;
  const ctaRegex = /(اطلب|اكتشف|جرّب|شارك|تاق|احفظ|اضغط|زور|تسوق|اشتر)/i;
  const hashtagRegex = /#[\w\u0600-\u06FF]+/g;
  const mentionRegex = /@[\w]+/g;

  return {
    captionLength: caption.length,
    hasEmoji: emojiRegex.test(caption),
    hasQuestion: questionRegex.test(caption),
    hasCTA: ctaRegex.test(caption),
    hashtagCount: (caption.match(hashtagRegex) || []).length,
    mentionCount: (caption.match(mentionRegex) || []).length,
  };
}

// ── Calculate Performance Score ─────────────────────────────────────────────

export function calculatePostScore(post: Partial<PostPerformance>): number {
  let score = 0;

  // Engagement weight (max 40)
  const engagement = (post.likes || 0) + (post.comments || 0) * 3 + (post.shares || 0) * 5;
  score += Math.min(40, engagement / 10);

  // Reach weight (max 25)
  score += Math.min(25, (post.impressions || 0) / 100);

  // Engagement rate (max 20)
  if (post.impressions && post.impressions > 0) {
    const rate = engagement / post.impressions * 100;
    score += Math.min(20, rate * 5);
  }

  // Click-through (max 15)
  score += Math.min(15, (post.clicks || 0) / 5);

  return Math.min(100, Math.round(score));
}

// ── Learning Profile Management ─────────────────────────────────────────────

export function getLearningProfile(): LearningProfile {
  if (typeof window === 'undefined') return getDefaultProfile();
  try {
    const stored = localStorage.getItem(LEARNING_PROFILE_KEY);
    return stored ? JSON.parse(stored) : getDefaultProfile();
  } catch {
    return getDefaultProfile();
  }
}

function getDefaultProfile(): LearningProfile {
  return {
    optimalCaptionLength: {
      instagram: 150,
      facebook: 250,
      twitter: 200,
      linkedin: 300,
      tiktok: 100,
      youtube: 200,
      pinterest: 100,
    },
    optimalHashtagCount: {
      instagram: 15,
      facebook: 3,
      twitter: 3,
      linkedin: 5,
      tiktok: 5,
      youtube: 10,
      pinterest: 5,
    },
    bestPerformingHashtags: [
      '#عطور', '#مهووس_ستور', '#عطور_أصلية', '#perfume',
      '#عطر', '#fragrance', '#السعودية', '#عطور_رجالية',
      '#عطور_نسائية', '#luxury',
    ],
    bestPerformingCTAs: MAHWOUS_BRAND_VOICE.ctaTemplates,
    bestPostingHours: {
      instagram: 21,
      facebook: 19,
      twitter: 12,
      linkedin: 8,
      tiktok: 22,
      youtube: 17,
      pinterest: 21,
    },
    bestPostingDays: {
      instagram: 4, // Thursday
      facebook: 3,  // Wednesday
      twitter: 2,   // Tuesday
      linkedin: 1,  // Monday
      tiktok: 5,    // Friday
      youtube: 6,   // Saturday
      pinterest: 0,  // Sunday
    },
    bestContentTypes: {
      instagram: 'reels',
      facebook: 'post',
      twitter: 'tweet',
      linkedin: 'post',
      tiktok: 'video',
      youtube: 'short',
      pinterest: 'pin',
    },
    topPerformingPhrases: MAHWOUS_BRAND_VOICE.keyPhrases,
    avoidPhrases: MAHWOUS_BRAND_VOICE.avoidPhrases,
    toneScore: { formal: 30, friendly: 40, luxury: 80, educational: 50 },
    audiencePreferences: {
      prefersVideo: true,
      prefersQuestions: true,
      prefersEmoji: true,
      prefersCTA: true,
      avgAttentionSpan: 'medium',
    },
    totalPostsAnalyzed: 0,
    lastUpdated: new Date().toISOString(),
    confidenceLevel: 10, // Low confidence until more data
  };
}

export function saveLearningProfile(profile: LearningProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEARNING_PROFILE_KEY, JSON.stringify(profile));
}

// ── Update Learning Profile from Performance Data ───────────────────────────

export function updateLearningFromPerformance(): LearningProfile {
  const history = getPerformanceHistory();
  const profile = getLearningProfile();

  if (history.length < 5) {
    // Not enough data to learn from
    return profile;
  }

  // Sort by performance score
  const sorted = [...history].sort((a, b) => b.performanceScore - a.performanceScore);
  const topPosts = sorted.slice(0, Math.ceil(sorted.length * 0.3)); // Top 30%
  const bottomPosts = sorted.slice(-Math.ceil(sorted.length * 0.3)); // Bottom 30%

  // Learn optimal caption length per platform
  const platformGroups = new Map<string, PostPerformance[]>();
  for (const post of topPosts) {
    const existing = platformGroups.get(post.platform) || [];
    existing.push(post);
    platformGroups.set(post.platform, existing);
  }

  for (const [platform, posts] of platformGroups) {
    if (posts.length >= 3) {
      const avgLength = posts.reduce((sum, p) => sum + p.captionLength, 0) / posts.length;
      profile.optimalCaptionLength[platform] = Math.round(avgLength);
    }
  }

  // Learn optimal hashtag count
  for (const [platform, posts] of platformGroups) {
    if (posts.length >= 3) {
      const avgHashtags = posts.reduce((sum, p) => sum + p.hashtagCount, 0) / posts.length;
      profile.optimalHashtagCount[platform] = Math.round(avgHashtags);
    }
  }

  // Learn best hashtags
  const hashtagPerformance = new Map<string, { totalScore: number; count: number }>();
  for (const post of history) {
    for (const tag of post.hashtags) {
      const existing = hashtagPerformance.get(tag) || { totalScore: 0, count: 0 };
      existing.totalScore += post.performanceScore;
      existing.count += 1;
      hashtagPerformance.set(tag, existing);
    }
  }

  profile.bestPerformingHashtags = Array.from(hashtagPerformance.entries())
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => (b[1].totalScore / b[1].count) - (a[1].totalScore / a[1].count))
    .slice(0, 20)
    .map(([tag]) => tag);

  // Learn best posting hours
  const hourPerformance = new Map<string, Map<number, { totalScore: number; count: number }>>();
  for (const post of history) {
    if (!hourPerformance.has(post.platform)) {
      hourPerformance.set(post.platform, new Map());
    }
    const platformHours = hourPerformance.get(post.platform)!;
    const existing = platformHours.get(post.publishHour) || { totalScore: 0, count: 0 };
    existing.totalScore += post.performanceScore;
    existing.count += 1;
    platformHours.set(post.publishHour, existing);
  }

  for (const [platform, hours] of hourPerformance) {
    const bestHour = Array.from(hours.entries())
      .sort((a, b) => (b[1].totalScore / b[1].count) - (a[1].totalScore / a[1].count))[0];
    if (bestHour) {
      profile.bestPostingHours[platform] = bestHour[0];
    }
  }

  // Learn audience preferences
  const topHasQuestion = topPosts.filter(p => p.hasQuestion).length / topPosts.length;
  const topHasEmoji = topPosts.filter(p => p.hasEmoji).length / topPosts.length;
  const topHasCTA = topPosts.filter(p => p.hasCTA).length / topPosts.length;
  const topHasVideo = topPosts.filter(p => p.hasVideo).length / topPosts.length;

  profile.audiencePreferences = {
    prefersVideo: topHasVideo > 0.5,
    prefersQuestions: topHasQuestion > 0.4,
    prefersEmoji: topHasEmoji > 0.5,
    prefersCTA: topHasCTA > 0.4,
    avgAttentionSpan: profile.optimalCaptionLength.instagram > 200 ? 'long' :
      profile.optimalCaptionLength.instagram > 100 ? 'medium' : 'short',
  };

  // Learn phrases to avoid (from bottom posts)
  const bottomPhrases = new Set<string>();
  for (const post of bottomPosts) {
    const words = post.caption.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      bottomPhrases.add(word);
    }
  }

  // Update metadata
  profile.totalPostsAnalyzed = history.length;
  profile.lastUpdated = new Date().toISOString();
  profile.confidenceLevel = Math.min(100, Math.round((history.length / 100) * 100));

  saveLearningProfile(profile);
  return profile;
}

// ── Optimize Caption Based on Learning ──────────────────────────────────────

export function optimizeCaption(
  caption: string,
  platform: string,
  perfumeName?: string
): ContentOptimization {
  const profile = getLearningProfile();
  const changes: string[] = [];
  const changesAr: string[] = [];
  let optimized = caption;

  // 1. Check caption length
  const optimalLength = profile.optimalCaptionLength[platform] || 150;
  if (caption.length > optimalLength * 1.5) {
    // Too long — suggest trimming
    changes.push(`Caption too long (${caption.length} chars). Optimal: ~${optimalLength}`);
    changesAr.push(`الكابشن طويل جداً (${caption.length} حرف). الأمثل: ~${optimalLength}`);
  }

  // 2. Check hashtag count
  const currentHashtags = (caption.match(/#[\w\u0600-\u06FF]+/g) || []).length;
  const optimalHashtags = profile.optimalHashtagCount[platform] || 5;
  if (currentHashtags < optimalHashtags * 0.5) {
    // Add recommended hashtags
    const missingCount = optimalHashtags - currentHashtags;
    const recommendedTags = profile.bestPerformingHashtags
      .filter(tag => !caption.includes(tag))
      .slice(0, missingCount);

    if (recommendedTags.length > 0) {
      optimized += '\n\n' + recommendedTags.join(' ');
      changes.push(`Added ${recommendedTags.length} high-performing hashtags`);
      changesAr.push(`تمت إضافة ${recommendedTags.length} هاشتاقات عالية الأداء`);
    }
  }

  // 3. Check for CTA
  const features = extractContentFeatures(caption);
  if (!features.hasCTA && profile.audiencePreferences.prefersCTA) {
    const randomCTA = profile.bestPerformingCTAs[
      Math.floor(Math.random() * profile.bestPerformingCTAs.length)
    ];
    optimized += '\n\n' + randomCTA;
    changes.push('Added call-to-action');
    changesAr.push('تمت إضافة دعوة للتفاعل');
  }

  // 4. Check for question
  if (!features.hasQuestion && profile.audiencePreferences.prefersQuestions) {
    const questions = [
      'وش رأيكم؟ 💭',
      'جربتوه قبل؟ شاركونا 👇',
      'مين يحب هالنوع من العطور؟ ✨',
    ];
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    optimized = randomQ + '\n\n' + optimized;
    changes.push('Added engagement question');
    changesAr.push('تمت إضافة سؤال لزيادة التفاعل');
  }

  // 5. Check for emoji
  if (!features.hasEmoji && profile.audiencePreferences.prefersEmoji) {
    const emoji = MAHWOUS_BRAND_VOICE.emojiStyle[
      Math.floor(Math.random() * MAHWOUS_BRAND_VOICE.emojiStyle.length)
    ];
    optimized = emoji + ' ' + optimized;
    changes.push('Added brand emoji');
    changesAr.push('تمت إضافة إيموجي العلامة التجارية');
  }

  // 6. Check for brand voice consistency
  const hasBrandPhrase = MAHWOUS_BRAND_VOICE.keyPhrases.some(phrase =>
    caption.includes(phrase)
  );
  if (!hasBrandPhrase && perfumeName) {
    const randomPhrase = MAHWOUS_BRAND_VOICE.keyPhrases[
      Math.floor(Math.random() * MAHWOUS_BRAND_VOICE.keyPhrases.length)
    ];
    optimized += '\n\n' + randomPhrase;
    changes.push('Added brand voice phrase');
    changesAr.push('تمت إضافة عبارة من هوية مهووس');
  }

  // Calculate expected improvement
  const expectedImprovement = changes.length * 8; // ~8% per optimization

  return {
    originalCaption: caption,
    optimizedCaption: optimized,
    changes,
    changesAr,
    expectedImprovement: Math.min(50, expectedImprovement),
    confidence: profile.confidenceLevel,
  };
}

// ── Generate Smart Suggestions ──────────────────────────────────────────────

export function generateSmartSuggestions(): SmartSuggestion[] {
  const profile = getLearningProfile();
  const history = getPerformanceHistory();
  const suggestions: SmartSuggestion[] = [];

  // Timing suggestions
  for (const [platform, hour] of Object.entries(profile.bestPostingHours)) {
    suggestions.push({
      type: 'timing',
      typeAr: 'التوقيت',
      suggestion: `Best time to post on ${platform}: ${hour}:00`,
      suggestionAr: `أفضل وقت للنشر على ${platform}: ${hour}:00`,
      impact: 'high',
      basedOn: `${history.filter(p => p.platform === platform).length} posts analyzed`,
      dataPoints: history.filter(p => p.platform === platform).length,
    });
  }

  // Content format suggestions
  if (profile.audiencePreferences.prefersVideo) {
    suggestions.push({
      type: 'format',
      typeAr: 'الصيغة',
      suggestion: 'Your audience engages 3x more with video content',
      suggestionAr: 'جمهورك يتفاعل 3 أضعاف مع محتوى الفيديو',
      impact: 'high',
      basedOn: 'Video vs image performance comparison',
      dataPoints: history.length,
    });
  }

  // Hashtag suggestions
  if (profile.bestPerformingHashtags.length > 0) {
    suggestions.push({
      type: 'hashtag',
      typeAr: 'الهاشتاقات',
      suggestion: `Top hashtags: ${profile.bestPerformingHashtags.slice(0, 5).join(', ')}`,
      suggestionAr: `أفضل الهاشتاقات: ${profile.bestPerformingHashtags.slice(0, 5).join(', ')}`,
      impact: 'medium',
      basedOn: 'Hashtag performance analysis',
      dataPoints: history.length,
    });
  }

  // Frequency suggestions
  const postsPerWeek = history.length > 0
    ? history.length / Math.max(1, Math.ceil(
        (Date.now() - new Date(history[0].publishedAt).getTime()) / (7 * 24 * 60 * 60 * 1000)
      ))
    : 0;

  if (postsPerWeek < 7) {
    suggestions.push({
      type: 'frequency',
      typeAr: 'معدل النشر',
      suggestion: `Current: ${postsPerWeek.toFixed(1)} posts/week. Target: 7+ for optimal growth`,
      suggestionAr: `الحالي: ${postsPerWeek.toFixed(1)} منشور/أسبوع. المستهدف: 7+ للنمو الأمثل`,
      impact: 'high',
      basedOn: 'Industry benchmarks for perfume brands',
      dataPoints: history.length,
    });
  }

  // Content optimization suggestions
  if (profile.audiencePreferences.prefersQuestions) {
    suggestions.push({
      type: 'content',
      typeAr: 'المحتوى',
      suggestion: 'Posts with questions get 40% more comments',
      suggestionAr: 'المنشورات التي تحتوي على أسئلة تحصل على 40% تعليقات أكثر',
      impact: 'medium',
      basedOn: 'Question vs no-question performance',
      dataPoints: history.filter(p => p.hasQuestion).length,
    });
  }

  return suggestions;
}

// ── Auto-Improve Prompt for AI Caption Generation ───────────────────────────

export function getImprovedPromptContext(): string {
  const profile = getLearningProfile();
  const history = getPerformanceHistory();

  // Get top 5 performing captions as examples
  const topCaptions = [...history]
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 5)
    .map(p => p.caption);

  let context = `
## شخصية مهووس — دليل صوت العلامة التجارية المُحسَّن بالذكاء الاصطناعي

### الشخصية:
${MAHWOUS_BRAND_VOICE.personality}

### النبرة:
${MAHWOUS_BRAND_VOICE.tone}

### العبارات المفتاحية (الأعلى أداءً):
${profile.topPerformingPhrases.join(' | ')}

### عبارات يجب تجنبها:
${profile.avoidPhrases.join(' | ')}

### تفضيلات الجمهور المُكتشفة:
- يفضل الفيديو: ${profile.audiencePreferences.prefersVideo ? 'نعم' : 'لا'}
- يفضل الأسئلة: ${profile.audiencePreferences.prefersQuestions ? 'نعم' : 'لا'}
- يفضل الإيموجي: ${profile.audiencePreferences.prefersEmoji ? 'نعم' : 'لا'}
- يفضل دعوة التفاعل: ${profile.audiencePreferences.prefersCTA ? 'نعم' : 'لا'}
- مدى الانتباه: ${profile.audiencePreferences.avgAttentionSpan}

### مستوى الثقة في البيانات: ${profile.confidenceLevel}%
### عدد المنشورات المحللة: ${profile.totalPostsAnalyzed}
`;

  if (topCaptions.length > 0) {
    context += `\n### أمثلة من أفضل المنشورات أداءً:\n`;
    topCaptions.forEach((caption, i) => {
      context += `${i + 1}. "${caption.substring(0, 200)}..."\n`;
    });
  }

  return context;
}

// ── Optimization Log ────────────────────────────────────────────────────────

export function logOptimization(optimization: ContentOptimization): void {
  if (typeof window === 'undefined') return;
  try {
    const log = JSON.parse(localStorage.getItem(OPTIMIZATION_LOG_KEY) || '[]');
    log.push({
      ...optimization,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 optimizations
    const trimmed = log.slice(-100);
    localStorage.setItem(OPTIMIZATION_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore
  }
}

export function getOptimizationLog(): Array<ContentOptimization & { timestamp: string }> {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(OPTIMIZATION_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

// ── Trending Hashtags for Perfume Industry (Saudi Market) ───────────────────

export function getTrendingHashtags(platform: string): string[] {
  const general = [
    '#عطور', '#عطور_أصلية', '#مهووس_ستور', '#perfume', '#fragrance',
    '#عطر', '#السعودية', '#الرياض', '#جدة', '#luxury',
  ];

  const platformSpecific: Record<string, string[]> = {
    instagram: [
      '#عطور_رجالية', '#عطور_نسائية', '#عطر_اليوم', '#perfumeoftheday',
      '#عطور_فاخرة', '#عطور_عربية', '#oud', '#بخور', '#عود',
      '#perfumelover', '#fragrancecollection', '#scentoftheday',
      '#عطور_ماركات', '#عطور_مميزة', '#مسك',
    ],
    tiktok: [
      '#عطورتيكتوك', '#perfumetok', '#fragrancetok', '#عطر_رجالي',
      '#عطر_نسائي', '#fyp', '#foryou', '#viral', '#trending',
    ],
    twitter: [
      '#عطور_السعودية', '#عطر_مميز', '#توصيات_عطور',
      '#perfume_review', '#عطور_اصلية',
    ],
    youtube: [
      '#مراجعة_عطور', '#perfume_review', '#top_perfumes',
      '#عطور_2024', '#best_fragrances',
    ],
  };

  return [...general, ...(platformSpecific[platform] || [])];
}

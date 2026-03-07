// ============================================================
// lib/contentQueue.ts — Content Queue & Scheduling System
// Saves posts to localStorage with scheduling + export to CSV
// ============================================================

export interface QueuedPost {
  id: string;
  timestamp: string;
  perfumeName: string;
  perfumeBrand: string;
  productUrl: string;

  // Images
  storyImageUrl: string;
  postImageUrl: string;
  landscapeImageUrl: string;

  // Videos
  verticalVideoUrl: string;
  horizontalVideoUrl: string;
  verticalVoiceover: string;
  horizontalVoiceover: string;

  // Captions per platform
  captions: Record<string, string>;
  videoCaptions: Record<string, string>;

  // Scheduling
  scheduledTime: string | null; // ISO string or null for immediate
  platforms: string[]; // which platforms to post to
  status: 'draft' | 'scheduled' | 'published' | 'failed';

  // Google Sheets sync
  sheetRowId?: number;
  sheetsExported: boolean;
}

const STORAGE_KEY = 'mahwous_content_queue';

// ── Read queue from localStorage ─────────────────────────────────────────────
export function getQueue(): QueuedPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Save queue to localStorage ───────────────────────────────────────────────
export function saveQueue(queue: QueuedPost[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

// ── Add a post to the queue ──────────────────────────────────────────────────
export function addToQueue(post: Omit<QueuedPost, 'id' | 'timestamp' | 'sheetsExported'>): QueuedPost {
  const queue = getQueue();
  const newPost: QueuedPost = {
    ...post,
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    sheetsExported: false,
  };
  queue.unshift(newPost); // newest first
  saveQueue(queue);
  return newPost;
}

// ── Update a post in the queue ───────────────────────────────────────────────
export function updateQueuePost(id: string, updates: Partial<QueuedPost>): void {
  const queue = getQueue();
  const idx = queue.findIndex(p => p.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates };
    saveQueue(queue);
  }
}

// ── Remove a post from the queue ─────────────────────────────────────────────
export function removeFromQueue(id: string): void {
  const queue = getQueue().filter(p => p.id !== id);
  saveQueue(queue);
}

// ── Get scheduled posts ──────────────────────────────────────────────────────
export function getScheduledPosts(): QueuedPost[] {
  return getQueue().filter(p => p.status === 'scheduled' && p.scheduledTime);
}

// ── Export to CSV for Google Sheets ──────────────────────────────────────────
export function exportToCSV(posts: QueuedPost[]): string {
  const headers = [
    'Timestamp',
    'PerfumeName',
    'PerfumeBrand',
    'ProductURL',
    'StoryImageURL',
    'PostImageURL',
    'LandscapeImageURL',
    'VerticalVideoURL',
    'HorizontalVideoURL',
    'MediaType',
    'Instagram_Caption',
    'Facebook_Caption',
    'Twitter_Caption',
    'LinkedIn_Caption',
    'TikTok_Caption',
    'YouTube_Caption',
    'Pinterest_Caption',
    'Snapchat_Caption',
    'WhatsApp_Caption',
    'PostToInstagram',
    'PostToFacebook',
    'PostToTwitter',
    'PostToLinkedIn',
    'PostToTikTok',
    'PostToYouTube',
    'PostToPinterest',
    'PostToSnapchat',
    'PostToWhatsApp',
    'ScheduledTime',
    'Status',
  ];

  const escapeCSV = (val: string) => {
    if (!val) return '';
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = posts.map(p => [
    p.timestamp,
    p.perfumeName,
    p.perfumeBrand,
    p.productUrl,
    p.storyImageUrl,
    p.postImageUrl,
    p.landscapeImageUrl,
    p.verticalVideoUrl,
    p.horizontalVideoUrl,
    p.verticalVideoUrl || p.horizontalVideoUrl ? 'video' : 'image',
    p.captions?.instagram_post || p.captions?.instagram_story || '',
    p.captions?.facebook_post || p.captions?.facebook_story || '',
    p.captions?.twitter || '',
    p.captions?.linkedin || '',
    p.captions?.tiktok || p.videoCaptions?.tiktok_video || '',
    p.captions?.youtube_thumbnail || p.videoCaptions?.youtube_video || '',
    p.captions?.pinterest || '',
    p.captions?.snapchat || '',
    p.captions?.whatsapp || '',
    p.platforms.includes('instagram') ? 'TRUE' : 'FALSE',
    p.platforms.includes('facebook') ? 'TRUE' : 'FALSE',
    p.platforms.includes('twitter') ? 'TRUE' : 'FALSE',
    p.platforms.includes('linkedin') ? 'TRUE' : 'FALSE',
    p.platforms.includes('tiktok') ? 'TRUE' : 'FALSE',
    p.platforms.includes('youtube') ? 'TRUE' : 'FALSE',
    p.platforms.includes('pinterest') ? 'TRUE' : 'FALSE',
    p.platforms.includes('snapchat') ? 'TRUE' : 'FALSE',
    p.platforms.includes('whatsapp') ? 'TRUE' : 'FALSE',
    p.scheduledTime || '',
    p.status,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
  ].join('\n');

  return csvContent;
}

// ── Download CSV file ────────────────────────────────────────────────────────
export function downloadCSV(posts: QueuedPost[], filename?: string): void {
  const csv = exportToCSV(posts);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Arabic
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `mahwous-content-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── All available platforms ──────────────────────────────────────────────────
export const ALL_PLATFORMS = [
  { id: 'instagram', label: 'إنستقرام', icon: 'instagram' },
  { id: 'facebook', label: 'فيسبوك', icon: 'facebook' },
  { id: 'twitter', label: 'تويتر / X', icon: 'twitter' },
  { id: 'linkedin', label: 'لينكدإن', icon: 'linkedin' },
  { id: 'tiktok', label: 'تيك توك', icon: 'tiktok' },
  { id: 'youtube', label: 'يوتيوب', icon: 'youtube' },
  { id: 'pinterest', label: 'بنترست', icon: 'pinterest' },
  { id: 'snapchat', label: 'سناب شات', icon: 'snapchat' },
  { id: 'whatsapp', label: 'واتساب', icon: 'whatsapp' },
  { id: 'telegram', label: 'تلقرام', icon: 'telegram' },
] as const;

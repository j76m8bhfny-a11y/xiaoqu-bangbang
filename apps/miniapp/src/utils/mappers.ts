import type { EventDto } from '@xiaoqu-bangbang/shared';
import type { EventCardData } from '@/components/event-card';

export const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; ctaText: string; ctaColor: string }
> = {
  // 两色语义制（草木绿系统）：需求类=暖橙(提醒·需要关注)，供给/善意类=草绿(善意·提供)。
  // 标签文字用加深色保证在浅底上对比达标；CTA 统一草绿深色，与全站按钮一致。
  help_request: {
    label: '求助',
    color: '#9A5A12', // 深琥珀（需求）
    bgColor: '#FBF0DD',
    ctaText: '我来帮',
    ctaColor: '#4A8C5E',
  },
  // @deprecated help_offer 已废弃，仅兼容历史数据
  help_offer: {
    label: '我能帮忙',
    color: '#35704A', // 深草绿（供给）
    bgColor: '#EAF4EC',
    ctaText: '我需要',
    ctaColor: '#4A8C5E',
  },
  public_welfare: {
    label: '公益',
    color: '#35704A',
    bgColor: '#EAF4EC',
    ctaText: '我要报名',
    ctaColor: '#4A8C5E',
  },
  lost_found: {
    label: '寻宠寻物',
    color: '#9A5A12',
    bgColor: '#FBF0DD',
    ctaText: '提供线索',
    ctaColor: '#4A8C5E',
  },
  public_feedback: {
    label: '公共反馈',
    color: '#35704A',
    bgColor: '#EAF4EC',
    ctaText: '关注进展',
    ctaColor: '#4A8C5E',
  },
  discussion: {
    label: '讨论',
    color: '#35704A',
    bgColor: '#EAF4EC',
    ctaText: '参与讨论',
    ctaColor: '#4A8C5E',
  },
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  pending_review: '审核中',
  open: '进行中',
  in_progress: '进行中',
  processing: '处理中',
  completed: '已完成',
  closed: '已关闭',
  rejected: '已拒绝',
};

export function mapEventDtoToCardData(dto: EventDto): EventCardData {
  const cfg = EVENT_TYPE_CONFIG[dto.type] || EVENT_TYPE_CONFIG.discussion;
  return {
    id: dto.id,
    type: dto.type,
    typeLabel: cfg.label,
    typeColor: cfg.color,
    typeBgColor: cfg.bgColor,
    statusLabel: EVENT_STATUS_LABELS[dto.status] || dto.status,
    title: dto.title,
    description: dto.description,
    creatorName: dto.creator?.nickname ?? '邻居',
    creatorAvatarUrl: dto.creator?.avatarUrl ?? undefined,
    createdAt: formatRelativeTime(dto.createdAt),
    locationText: dto.locationText ?? undefined,
    likeCount: dto.likeCount,
    commentCount: dto.commentCount,
    thanksCount: dto.thanksCount,
    ctaText: cfg.ctaText,
    ctaColor: cfg.ctaColor,
  };
}

export const MARKET_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  free: { label: '免费', icon: 'gift' },
  furniture: { label: '家具', icon: 'chair' },
  baby: { label: '母婴', icon: 'teddy' },
  books: { label: '书籍', icon: 'books' },
  pet: { label: '宠物', icon: 'paw' },
  digital: { label: '数码', icon: 'phone' },
  other: { label: '其他', icon: 'box' },
};

export const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: '全新', color: '#5b9e6f' },
  like_new: { label: '九成新', color: '#5b9e6f' },
  good: { label: '八成新', color: '#e89b6c' },
  used: { label: '七成新', color: '#FF6B6B' },
  old: { label: '旧物', color: '#999' },
};

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

// ===== 图文教程 =====

export const GUIDE_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  usage_guide: { label: '使用指南', icon: 'book' },
  repair: { label: '维修排障', icon: 'wrench' },
  maintenance: { label: '保养维护', icon: 'tool' },
  other: { label: '其他', icon: 'more' },
};

export const GUIDE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_review: { label: '待审核', color: '#e89b6c' },
  published: { label: '已发布', color: '#5b9e6f' },
  rejected: { label: '未通过', color: '#FF6B6B' },
};

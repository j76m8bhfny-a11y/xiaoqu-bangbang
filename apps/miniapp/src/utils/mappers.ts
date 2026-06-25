import type {
  EventDto,
  RankingItemDto,
  BannerDto,
  ServiceProviderDto,
} from '@xiaoqu-bangbang/shared';
import type { EventCardData } from '@/components/event-card';
import type { RankingUser } from '@/components/ranking-top3';
import type { BannerItem } from '@/components/banner-carousel';
import type { ServiceProviderData } from '@/components/service-card';

export const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; ctaText: string; ctaColor: string }
> = {
  help_request: {
    label: '求助',
    color: '#FF6B6B',
    bgColor: '#FFF0F0',
    ctaText: '我来帮',
    ctaColor: '#35E89A',
  },
  help_offer: {
    label: '我能帮忙',
    color: '#35E89A',
    bgColor: '#E9FFF4',
    ctaText: '我需要',
    ctaColor: '#35E89A',
  },
  public_welfare: {
    label: '公益',
    color: '#FFD93D',
    bgColor: '#FFFBE6',
    ctaText: '我要报名',
    ctaColor: '#FF9F43',
  },
  lost_found: {
    label: '寻宠寻物',
    color: '#7C6EF6',
    bgColor: '#F0EDFF',
    ctaText: '提供线索',
    ctaColor: '#7C6EF6',
  },
  public_feedback: {
    label: '公共反馈',
    color: '#4ECDC4',
    bgColor: '#E8FAF8',
    ctaText: '关注进展',
    ctaColor: '#4ECDC4',
  },
  discussion: {
    label: '讨论',
    color: '#4ECDC4',
    bgColor: '#E8FAF8',
    ctaText: '参与讨论',
    ctaColor: '#4ECDC4',
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

export function mapRankingItemToUser(dto: RankingItemDto): RankingUser {
  return {
    id: dto.userId,
    nickname: dto.nickname,
    avatarUrl: dto.avatarUrl || '',
    flowerCount: dto.flowerCount,
    helpCount: dto.helpCount,
  };
}

export function mapBannerDtoToItem(dto: BannerDto): BannerItem {
  const colorMap: Record<string, { bg: string; accent: string }> = {
    event: { bg: '#E9FFF4', accent: '#35E89A' },
    market: { bg: '#FFF1DD', accent: '#FF9F43' },
    announcement: { bg: '#F0EDFF', accent: '#7C6EF6' },
  };
  const colors = colorMap[dto.linkType] || { bg: '#E9FFF4', accent: '#35E89A' };
  return {
    id: dto.id,
    title: dto.title,
    subtitle: dto.subtitle ?? undefined,
    ctaText: '去看看',
    bgColor: colors.bg,
    accentColor: colors.accent,
    linkType: dto.linkType,
    linkId: dto.linkId ?? undefined,
    linkUrl: dto.linkUrl ?? undefined,
  };
}

export function mapServiceProviderDto(dto: ServiceProviderDto): ServiceProviderData {
  const categoryLabels: Record<string, string> = {
    repair: '维修',
    cleaning: '保洁',
    lock: '开锁',
    home_appliance: '家电',
    moving: '搬家',
    pet: '宠物',
    other: '其他',
  };
  const sourceLabels: Record<string, string> = {
    platform: '平台',
    committee: '业委会',
    community: '邻居',
  };
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    categoryLabel: categoryLabels[dto.category] || dto.category,
    description: dto.description,
    recommendationSource: sourceLabels[dto.recommendationSource] || dto.recommendationSource,
  };
}

export const MARKET_CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  free: { label: '免费', icon: '🎁' },
  furniture: { label: '家具', icon: '🪑' },
  baby: { label: '母婴', icon: '🧸' },
  books: { label: '书籍', icon: '📚' },
  pet: { label: '宠物', icon: '🐾' },
  digital: { label: '数码', icon: '📱' },
  other: { label: '其他', icon: '📦' },
};

export const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: '全新', color: '#35E89A' },
  like_new: { label: '九成新', color: '#35E89A' },
  good: { label: '八成新', color: '#FF9F43' },
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

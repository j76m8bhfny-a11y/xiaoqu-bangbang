import type { EventDto, PetSubType, FeedItemDto, GroupBuyDto } from '@xiaoqu-bangbang/shared';
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
  pet_help: {
    label: '宠物帮帮',
    color: '#9A5A12',
    bgColor: '#FBF0DD',
    ctaText: '我来帮',
    ctaColor: '#4A8C5E',
  },
  // pet_help 子分类 label/ctaText 覆盖（color/bgColor 继承主分类）
  // M23 阶段加 group_buy.seek / group_buy.offer
  // @deprecated lost_found 已迁移到 pet_help + subType=lost
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

// pet_help 子分类覆盖（只改 label + ctaText，配色继承主分类）
const PET_HELP_SUBTYPE_OVERRIDE: Record<PetSubType, { label: string; ctaText: string }> = {
  feed: { label: '求代喂', ctaText: '我来代喂' },
  walk: { label: '求代遛', ctaText: '我来代遛' },
  lost: { label: '寻宠', ctaText: '提供线索' },
};

// M23: 购物拼拼子类型 label（seek=求代购 / offer=代购方）
export const GROUP_BUY_TYPE_LABELS: Record<string, { label: string; ctaText: string }> = {
  seek: { label: '求代购', ctaText: '参与拼单' },
  offer: { label: '帮代购', ctaText: '查看详情' },
};

// M23: 购物拼拼配色（沿用 pet_help 暖橙语义：需求类需要关注）
const GROUP_BUY_TYPE_CONFIG = {
  color: '#9A5A12',
  bgColor: '#FBF0DD',
  ctaColor: '#4A8C5E',
};

// M23: 购物拼拼主表状态 label
export const GROUP_BUY_STATUS_LABELS: Record<string, string> = {
  pending_review: '审核中',
  open: '报名中',
  closed_for_bid: '已截单',
  purchased: '已采购',
  completed: '已完成',
  closed: '已关闭',
  rejected: '已拒绝',
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
  // pet_help 子分类覆盖 label/ctaText（color/bgColor 继承主分类）
  const subOverride =
    dto.type === 'pet_help' && dto.subType
      ? PET_HELP_SUBTYPE_OVERRIDE[dto.subType as PetSubType]
      : undefined;
  return {
    id: dto.id,
    type: dto.type,
    typeLabel: subOverride?.label ?? cfg.label,
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
    ctaText: subOverride?.ctaText ?? cfg.ctaText,
    ctaColor: cfg.ctaColor,
    isInactive: dto.status === 'completed' || dto.status === 'closed',
    sourceType: 'event',
  };
}

// M23: FeedItemDto -> EventCardData
// /feed/all 聚合端点返回的统一卡片 DTO，按 sourceType 分别映射 label/配色。
export function mapFeedItemDtoToCardData(dto: FeedItemDto): EventCardData {
  if (dto.sourceType === 'group_buy') {
    const sub = GROUP_BUY_TYPE_LABELS[dto.type] ?? {
      label: '购物拼拼',
      ctaText: '查看详情',
    };
    return {
      id: dto.id,
      type: dto.type,
      typeLabel: sub.label,
      typeColor: GROUP_BUY_TYPE_CONFIG.color,
      typeBgColor: GROUP_BUY_TYPE_CONFIG.bgColor,
      statusLabel: GROUP_BUY_STATUS_LABELS[dto.status] || dto.status,
      title: dto.title,
      description: dto.subtitle ?? '',
      creatorName: dto.creator?.nickname ?? '邻居',
      createdAt: formatRelativeTime(dto.createdAt),
      likeCount: dto.stats?.likeCount ?? 0,
      commentCount: dto.stats?.commentCount ?? 0,
      // responseCount 在购物拼拼语境里=报名人数，映射到 thanksCount 位展示热度
      thanksCount: dto.stats?.responseCount ?? 0,
      ctaText: sub.ctaText,
      ctaColor: GROUP_BUY_TYPE_CONFIG.ctaColor,
      sourceType: 'group_buy',
    };
  }

  // event 分支
  const cfg = EVENT_TYPE_CONFIG[dto.type] || EVENT_TYPE_CONFIG.discussion;
  const subOverride =
    dto.type === 'pet_help' && dto.subType
      ? PET_HELP_SUBTYPE_OVERRIDE[dto.subType as PetSubType]
      : undefined;
  return {
    id: dto.id,
    type: dto.type,
    typeLabel: subOverride?.label ?? cfg.label,
    typeColor: cfg.color,
    typeBgColor: cfg.bgColor,
    statusLabel: EVENT_STATUS_LABELS[dto.status] || dto.status,
    title: dto.title,
    description: dto.subtitle ?? '',
    creatorName: dto.creator?.nickname ?? '邻居',
    createdAt: formatRelativeTime(dto.createdAt),
    likeCount: dto.stats?.likeCount ?? 0,
    commentCount: dto.stats?.commentCount ?? 0,
    thanksCount: dto.stats?.responseCount ?? 0,
    ctaText: subOverride?.ctaText ?? cfg.ctaText,
    ctaColor: cfg.ctaColor,
    isInactive: dto.status === 'completed' || dto.status === 'closed',
    sourceType: 'event',
  };
}

// M23: GroupBuyDto -> EventCardData
// 直接调用 /group-buys 端点时使用（如点击「购物拼拼」filter 单独拉取）。
export function mapGroupBuyDtoToCardData(dto: GroupBuyDto): EventCardData {
  const sub = GROUP_BUY_TYPE_LABELS[dto.type] ?? {
    label: '购物拼拼',
    ctaText: '查看详情',
  };
  const title =
    dto.type === 'offer'
      ? `${dto.location}${dto.departAt ? ' ' + dto.departAt.slice(0, 10) : ''}`
      : `拼单-${dto.location}`;
  return {
    id: dto.id,
    type: dto.type,
    typeLabel: sub.label,
    typeColor: GROUP_BUY_TYPE_CONFIG.color,
    typeBgColor: GROUP_BUY_TYPE_CONFIG.bgColor,
    statusLabel: GROUP_BUY_STATUS_LABELS[dto.status] || dto.status,
    title,
    description: dto.note ?? '',
    creatorName: dto.initiator?.nickname ?? '邻居',
    creatorAvatarUrl: dto.initiator?.avatarUrl ?? undefined,
    createdAt: formatRelativeTime(dto.createdAt),
    likeCount: 0,
    commentCount: 0,
    // 报名 item 数作为热度展示
    thanksCount: dto._count?.items ?? dto.items?.length ?? 0,
    ctaText: sub.ctaText,
    ctaColor: GROUP_BUY_TYPE_CONFIG.ctaColor,
    isInactive: dto.status === 'completed' || dto.status === 'closed',
    sourceType: 'group_buy',
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

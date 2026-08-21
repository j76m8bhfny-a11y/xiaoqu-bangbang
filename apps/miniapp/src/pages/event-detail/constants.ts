import { EventType, ActionType, RewardType } from '@xiaoqu-bangbang/shared';

export interface CommentDto {
  id: string;
  content: string;
  userId: string;
  userNickname: string;
  userAvatarUrl: string;
  createdAt: string;
}

export interface FeedbackLogDto {
  id: string;
  status: string;
  content: string;
  images: string[];
  visibleToPublic: boolean;
  createdAt: string;
}

export interface ContactInfo {
  nickname: string;
  phone: string | null;
  rawPhone: string | null;
  wechatId: string | null;
}

export const EVENT_TYPE_TO_ACTION: Record<string, ActionType> = {
  [EventType.HELP_REQUEST]: ActionType.HELP,
  [EventType.HELP_OFFER]: ActionType.NEED_HELP,
  [EventType.PUBLIC_WELFARE]: ActionType.JOIN,
  [EventType.LOST_FOUND]: ActionType.PROVIDE_CLUE,
  [EventType.PUBLIC_FEEDBACK]: ActionType.FOLLOW,
  [EventType.DISCUSSION]: ActionType.PARTICIPATE_DISCUSSION,
};

// ponytail: petMeta 展示用的 label 映射，上限 M22 三种 subType，新增字段时同步加
export const PET_TYPE_LABELS: Record<string, string> = {
  cat: '猫',
  dog: '狗',
  fish: '鱼',
  other: '其他',
};
export const DOG_SIZE_LABELS: Record<string, string> = {
  small: '小型',
  medium: '中型',
  large: '大型',
};

// FE-10/11: pet_help 子分类标签与 CTA 文案（详情页按 subType 显示，区别于卡片主分类）
export const PET_SUBTYPE_LABELS: Record<string, string> = {
  feed: '求代喂',
  walk: '求代遛',
  lost: '寻宠',
};

export const PET_SUBTYPE_CTA: Record<string, string> = {
  feed: '我来代喂',
  walk: '我来代遛',
  lost: '提供线索',
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  [ActionType.HELP]: '提供帮助',
  [ActionType.NEED_HELP]: '需要帮助',
  [ActionType.JOIN]: '报名参加',
  [ActionType.PROVIDE_CLUE]: '提供线索',
  [ActionType.FOLLOW]: '关注进展',
  [ActionType.PARTICIPATE_DISCUSSION]: '参与讨论',
};

export const REWARD_TYPE_LABELS: Record<string, string> = {
  [RewardType.FREE]: '免费',
  [RewardType.PAID]: '有偿',
  [RewardType.NEGOTIABLE]: '面议',
  [RewardType.NONE]: '无',
};

export const FEEDBACK_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  submitted: { label: '已提交', color: '#3586FF', bgColor: '#EBF2FF' },
  received: { label: '已接收', color: '#e89b6c', bgColor: '#fbf0dd' },
  processing: { label: '处理中', color: '#5b9e6f', bgColor: '#eaf4ec' },
  resolved: { label: '已解决', color: '#5b9e6f', bgColor: '#eaf4ec' },
  closed: { label: '已关闭', color: '#999', bgColor: '#F5F5F5' },
};

export const RATING_TAGS = ['响应及时', '沟通顺畅', '靠谱', '有耐心', '态度友好'];

export function formatRelativeTime(isoString: string): string {
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

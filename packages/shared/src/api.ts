// ===== 小区帮榜棒 - 共享 API DTO 类型 =====

import type {
  EventType,
  EventStatus,
  AiReviewStatus,
  RewardType,
  Visibility,
  ActionType,
  ApplicationStatus,
  ConfirmationRole,
  ConfirmationStatus,
  MarketCategory,
  TradeType,
  ConditionLevel,
  MarketItemStatus,
  ContributionAction,
  ContributionSourceType,
  ContributionStatus,
  PeriodType,
  MemberRole,
  VerifyStatus,
  MaterialType,
  VerificationStatus,
  FeedbackStatus,
  VoteType,
  VoteStatus,
  ResultVisibility,
  BannerPosition,
  BannerStatus,
  BannerLinkType,
  ServiceProviderCategory,
  ServiceProviderStatus,
  RecommendationSource,
  NotificationType,
  ShareTargetType,
  ShareChannel,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  CommentStatus,
  ClaimStatus,
  AnnouncementStatus,
  AdminRole,
} from './enums';

// ===== 通用响应 =====

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

// ===== 错误码 =====

export const ErrorCodes = {
  SUCCESS: 0,
  BAD_REQUEST: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NEED_VERIFICATION: 40302,
  NOT_FOUND: 40401,
  CONFLICT: 40901,
  DUPLICATE: 40902,
  AI_REVIEW_REJECTED: 42201,
  SERVER_ERROR: 50001,
} as const;

// ===== 用户与认证 =====

export interface WechatLoginRequest {
  code: string;
  phoneCode?: string;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  openid: string;
  nickname: string;
  avatarUrl: string;
  bio: string | null;
  status: string;
  currentCommunityId: string | null;
  currentCommunityName: string | null;
  verifyStatus: string;
  roles: MemberRole[];
}

export interface UpdateMeRequest {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
}

// home tab 看板。currentCommunityId 为 null 时其余字段均为零值/空数组。
export interface MyDashboardDto {
  communityId: string | null;
  unreadNotificationCount: number;
  contributionScore: number;
  badgeCount: number;
  myActiveEventCount: number;
  myActiveMarketCount: number;
  pendingVotes: Array<{ id: string; title: string; endAt: string }>;
}

// ===== 小区 =====

export interface CommunityDto {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  status: string;
  memberCount: number;
}

export interface SelectCommunityRequest {
  communityId: string;
}

export interface SocialGroupDto {
  id: string;
  title: string;
  description: string | null;
  qrImageUrl: string | null;
  contactText: string | null;
  visibleTo: string;
}

// ===== 认证 =====

export interface SubmitVerificationRequest {
  communityId: string;
  materialType: MaterialType;
  fileUrl: string;
  consentAccepted: boolean;
  consentVersion: string;
}

export interface VerificationDto {
  id: string;
  communityId: string;
  materialType: MaterialType;
  status: VerificationStatus;
  rejectReason: string | null;
  reviewedAt: string | null;
}

// ===== 事件 =====

export interface CreateEventRequest {
  type: EventType;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  rewardType?: RewardType;
  rewardAmount?: number | null;
  locationText?: string;
  expectedTime?: string | null;
  eventTime?: string | null;
  capacity?: number | null;
  isAnonymous?: boolean;
  visibility?: Visibility;
  topicId?: string;
}

export interface EventDto {
  id: string;
  communityId: string;
  creatorId: string;
  creator?: { id: string; nickname: string; avatarUrl: string | null };
  type: EventType;
  title: string;
  description: string;
  images: string[];
  videos?: string[];
  rewardType: RewardType;
  rewardAmount: number | null;
  locationText: string | null;
  expectedTime: string | null;
  isAnonymous: boolean;
  visibility?: Visibility;
  status: EventStatus;
  aiReviewStatus: AiReviewStatus;
  selectedHelperId: string | null;
  selectedHelper?: { id: string; nickname: string; avatarUrl: string | null };
  completedAt: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thanksCount: number;
  _count?: {
    applications: number;
    comments: number;
    likes: number;
    thanks: number;
    favorites: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventListQuery {
  type?: EventType;
  status?: EventStatus;
  keyword?: string;
  excludeTypes?: string; // 逗号分隔的 EventType 列表
  page?: number;
  pageSize?: number;
}

// ===== 事件动作 =====

export interface CreateApplicationRequest {
  actionType: ActionType;
  message?: string;
}

export interface EventApplicationDto {
  id: string;
  eventId: string;
  userId: string;
  userNickname: string;
  userAvatarUrl: string | null;
  actionType: ActionType;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
}

export interface RateRequest {
  targetUserId: string;
  rating: number;
  tags?: string[];
  content?: string;
}

// ===== 闲置 =====

export interface CreateMarketItemRequest {
  category: MarketCategory;
  title: string;
  description: string;
  images: string[];
  price?: number | null;
  tradeType: TradeType;
  conditionLevel: ConditionLevel;
  contactText?: string;
}

export interface MarketItemDto {
  id: string;
  communityId: string;
  sellerId: string;
  sellerNickname: string;
  sellerAvatarUrl: string | null;
  category: MarketCategory;
  title: string;
  description: string;
  images: string[];
  price: number | null;
  tradeType: TradeType;
  conditionLevel: ConditionLevel;
  contactText: string | null;
  status: MarketItemStatus;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== 榜单 =====

export interface RankingQuery {
  communityId?: string;
  periodType: PeriodType;
  periodKey?: string;
  page?: number;
  pageSize?: number;
}

export interface RankingItemDto {
  rankNo: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  isVerified?: boolean;
  score: number;
  flowerCount: number;
  helpCount: number;
  badgeCount: number;
  thanksCount?: number;
  latestAction?: string | null;
}

export interface MyRankingDto {
  rankNo: number | null;
  score: number;
  flowerCount: number;
  helpCount: number;
  badgeCount: number;
}

// ===== 业委会 =====

export interface CommitteeMemberDto {
  id: string;
  name: string;
  position: string;
  avatarUrl: string | null;
  responsibility: string | null;
  termStart: string | null;
  termEnd: string | null;
  claimStatus: ClaimStatus;
  claimedUserId: string | null;
}

export interface ClaimCommitteeMemberRequest {
  statement: string;
  materialUrls: string[];
}

export interface CommitteeAnnouncementDto {
  id: string;
  title: string;
  content: string;
  images: string[];
  publisherNickname: string;
  isPinned: boolean;
  publishedAt: string;
}

// ===== 投票 =====

export interface VoteDto {
  id: string;
  title: string;
  description: string;
  voteType: VoteType;
  maxChoices: number | null;
  onlyVerified: boolean;
  resultVisibility: ResultVisibility;
  isAnonymous: boolean;
  startAt: string;
  endAt: string;
  status: VoteStatus;
  options: VoteOptionDto[];
}

export interface VoteOptionDto {
  id: string;
  content: string;
  sortOrder: number;
}

export interface SubmitVoteRequest {
  selectedOptionIds: string[];
}

// ===== Banner & 服务商 =====

export interface BannerDto {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkType: BannerLinkType;
  linkId: string | null;
  linkUrl: string | null;
}

export interface ServiceProviderDto {
  id: string;
  name: string;
  category: ServiceProviderCategory;
  logoUrl: string | null;
  description: string;
  contactText: string;
  serviceArea: string | null;
  recommendationSource: RecommendationSource;
  verifyStatus: string;
}

// ===== 通知 =====

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  targetType: string | null;
  targetId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ===== 分享 =====

export interface ShareCardConfig {
  title: string;
  path: string;
  imageUrl: string;
  shareToken: string;
  canShare: boolean;
  disabledReason: string | null;
}

export interface ShareCardQuery {
  targetType: ShareTargetType;
  targetId?: string;
  communityId?: string;
}

export interface ShareLogRequest {
  targetType: ShareTargetType;
  targetId: string;
  channel: ShareChannel;
  shareToken?: string;
  scene?: string;
}

// ===== 缺失的读取侧 DTO =====

export interface FeedbackLogDto {
  id: string;
  eventId: string;
  operatorId: string;
  status: string;
  content: string;
  images?: string[];
  visibleToPublic: boolean;
  createdAt: string;
}

export interface EventRateDto {
  id: string;
  eventId: string;
  userId: string;
  targetUserId: string;
  rating: number;
  tags?: string[];
  content?: string;
  createdAt: string;
}

export interface MarketReviewDto {
  id: string;
  itemId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  tags?: string[];
  content?: string;
  status: string;
  createdAt: string;
}

export interface AuditLogDto {
  id: string;
  operatorId: string;
  operatorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  detailJson?: Record<string, unknown>;
  createdAt: string;
}

export interface ShareLogDto {
  id: string;
  userId?: string;
  communityId?: string;
  targetType: string;
  targetId?: string;
  channel: string;
  shareTitle?: string;
  sharePath?: string;
  imageUrl?: string;
  shareToken?: string;
  createdAt: string;
}

export interface ShareTemplateDto {
  id: string;
  targetType: string;
  titleTemplate: string;
  defaultImageUrl?: string;
  status: string;
}

export interface AdminUserDto {
  id: string;
  userId?: string;
  username: string;
  role: 'platform_admin' | 'committee_admin';
  communityId?: string;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface ReportDto {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  status: string;
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
}

// ===== 管理后台写入 DTO =====

// 管理后台认证
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  adminUser: AdminUserDto;
}

// 管理后台事件审核
export interface AdminReviewActionRequest {
  action: 'approve' | 'reject' | 'manual-visible-admin-only';
  rejectReason?: string;
}

// 管理后台认证审核
export interface AdminVerificationReviewRequest {
  action: 'approve' | 'reject';
  rejectReason?: string;
}

// 业委会成员 CRUD
export interface CreateCommitteeMemberRequest {
  name: string;
  position: string;
  avatarUrl?: string;
  responsibility?: string;
  termStart?: string;
  termEnd?: string;
}

export interface UpdateCommitteeMemberRequest {
  name?: string;
  position?: string;
  avatarUrl?: string;
  responsibility?: string;
  termStart?: string;
  termEnd?: string;
  status?: 'active' | 'inactive';
}

// 业委会认领审核
export interface AdminClaimReviewRequest {
  action: 'approve' | 'reject';
  rejectReason?: string;
}

// 公告 CRUD
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  images?: string[];
  isPinned?: boolean;
  status?: 'draft' | 'published';
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  images?: string[];
  isPinned?: boolean;
  status?: 'draft' | 'published' | 'hidden';
}

// 投票 CRUD
export interface CreateVoteRequest {
  title: string;
  description: string;
  voteType: 'single' | 'multiple';
  maxChoices?: number;
  resultVisibility: 'always' | 'after_vote' | 'after_end' | 'admin_only';
  isAnonymous: boolean;
  startAt: string;
  endAt: string;
  options: { content: string; sortOrder: number }[];
}

export interface UpdateVoteRequest {
  title?: string;
  description?: string;
  voteType?: 'single' | 'multiple';
  maxChoices?: number;
  resultVisibility?: 'always' | 'after_vote' | 'after_end' | 'admin_only';
  isAnonymous?: boolean;
  startAt?: string;
  endAt?: string;
  status?: 'draft' | 'published' | 'closed';
}

// Banner CRUD
export interface CreateBannerRequest {
  communityId?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkType: 'event' | 'market' | 'announcement' | 'service_provider' | 'url' | 'none';
  linkId?: string;
  linkUrl?: string;
  position: 'home_top' | 'event_list' | 'market_list';
  sortOrder?: number;
  startAt?: string;
  endAt?: string;
}

export interface UpdateBannerRequest {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkType?: 'event' | 'market' | 'announcement' | 'service_provider' | 'url' | 'none';
  linkId?: string;
  linkUrl?: string;
  position?: 'home_top' | 'event_list' | 'market_list';
  sortOrder?: number;
  status?: 'draft' | 'published' | 'offline';
  startAt?: string;
  endAt?: string;
}

// 服务商 CRUD
export interface CreateServiceProviderRequest {
  name: string;
  category: 'repair' | 'cleaning' | 'lock' | 'home_appliance' | 'moving' | 'pet' | 'other';
  logoUrl?: string;
  coverUrl?: string;
  description: string;
  contactText: string;
  serviceArea?: string;
  recommendationSource: 'platform' | 'committee' | 'community';
  sortOrder?: number;
}

export interface UpdateServiceProviderRequest {
  name?: string;
  category?: 'repair' | 'cleaning' | 'lock' | 'home_appliance' | 'moving' | 'pet' | 'other';
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  contactText?: string;
  serviceArea?: string;
  recommendationSource?: 'platform' | 'committee' | 'community';
  sortOrder?: number;
  status?: 'pending_review' | 'published' | 'offline' | 'rejected';
}

// 奖章颁发
export interface AdminAwardBadgeRequest {
  userId: string;
  badgeId: string;
  reason: string;
  sourceType?: 'manual';
}

// 社群 CRUD
export interface CreateSocialGroupRequest {
  title: string;
  description?: string;
  qrImageUrl?: string;
  contactText?: string;
  visibleTo: 'verified_only' | 'public';
  sortOrder?: number;
}

export interface UpdateSocialGroupRequest {
  title?: string;
  description?: string;
  qrImageUrl?: string;
  contactText?: string;
  visibleTo?: 'verified_only' | 'public';
  status?: 'active' | 'inactive';
  sortOrder?: number;
}

// 反馈日志
export interface AdminFeedbackLogRequest {
  status: 'received' | 'processing' | 'contacted' | 'resolved' | 'cannot_resolve' | 'closed';
  content: string;
  images?: string[];
  visibleToPublic: boolean;
}

// 系统设置
export interface SystemSettingsDto {
  appName: string;
  defaultShareTitle: string;
  defaultShareImage: string;
  bannerDisplayCount: number;
  providerDisplayCount: number;
  privacyVersion: string;
  defaultReviewPolicy: string;
}

export interface UpdateSystemSettingsRequest {
  appName?: string;
  defaultShareTitle?: string;
  defaultShareImage?: string;
  bannerDisplayCount?: number;
  providerDisplayCount?: number;
  privacyVersion?: string;
  defaultReviewPolicy?: string;
}

// 管理后台仪表盘
export interface AdminDashboardDto {
  pendingReviews: number;
  pendingVerifications: number;
  pendingClaims: number;
  highRiskFeedback: number;
  pendingReports: number;
  totalUsers: number;
  totalEvents: number;
  totalCommunities: number;
  todayMutualHelp: number;
  todoItems: AdminTodoItem[];
}

export interface AdminTodoItem {
  type: string;
  id: string;
  summary: string;
  createdAt: string;
}

// ===== Topic / 议事榜 DTOs =====

export interface TopicDto {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  status: string;
  likeCount: number;
  dislikeCount: number;
  closedLikeCount: number;
  closedDislikeCount: number;
  ratingSum: number;
  ratingCount: number;
  avgRating: number;
  eventCount: number;
  commentCount: number;
  closedSummary?: string;
  closedAt?: string;
  createdBy: string;
  createdAt: string;
  latestEventPreview?: { title: string; firstImage?: string };
}

export interface TopicEventItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  aiComment?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  creator: { id: string; nickname: string; avatarUrl?: string };
  isAnonymous: boolean;
}

export interface TopicDetailDto extends TopicDto {
  events: TopicEventItem[];
}

export interface CreateTopicRequest {
  title: string;
  description?: string;
}

export interface TopicSuggestionDto {
  topicId: string;
  title: string;
  similarity: number;
}

export interface TopicCommentDto {
  id: string;
  topicId: string;
  eventId?: string;
  userId: string;
  userNickname: string;
  userAvatarUrl?: string;
  parentId?: string;
  content: string;
  images: string[];
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  createdAt: string;
  replies?: TopicCommentDto[];
}

export interface TopicTimelineItem {
  type: 'event';
  data: TopicEventItem & { comments: TopicCommentDto[] };
}

export interface CreateTopicCommentRequest {
  eventId?: string;
  content: string;
  images?: string[];
  parentId?: string;
}

export interface TopicLikeRequest {
  scope: 'open' | 'closed';
}

export interface TopicRatingRequest {
  rating: number; // 1-5
}

export interface AiSettingsDto {
  aiTopicSuggest: boolean;
  aiTopicMerge: boolean;
  aiEventComment: boolean;
  aiContentReview: boolean;
}

// ===== 小区申请 =====

export interface CreateCommunityApplicationRequest {
  name: string;
  city: string;
  district: string;
  address: string;
  estimatedHouseholds?: number;
  reason?: string;
  materialType: 'property_cert' | 'rent_contract' | 'access_card' | 'other';
  materialUrl: string;
  doorPhotoUrl?: string;
}

export interface CommunityApplicationSupporterDto {
  userId: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

export interface CommunityApplicationDto {
  id: string;
  applicantId: string;
  applicantNickname?: string;
  applicantAvatarUrl?: string;
  name: string;
  city: string;
  district: string;
  address: string;
  estimatedHouseholds?: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  supportCount: number;
  hasSupported?: boolean;
  recentSupporters?: CommunityApplicationSupporterDto[];
  approvedCommunityId?: string;
  createdAt: string;
}

export interface AdminCommunityApplicationDto extends CommunityApplicationDto {
  materialType: string;
  materialUrl: string;
  doorPhotoUrl?: string;
  supporters?: CommunityApplicationSupporterDto[];
}

export interface RejectCommunityApplicationRequest {
  reason?: string;
}

// ============================================
// 用户公开个人主页
// ============================================

export interface UserProfileBadgeDto {
  id: string;
  code: string;
  name: string;
  iconUrl: string | null;
}

export interface UserProfileDto {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  joinedAt: string;
  /** 同 viewer 当前小区下的认证状态；viewer 无小区或 target 不在该小区时为 null */
  verifyStatus: 'verified' | 'unverified' | null;
  communityName: string | null;
  helpCount: number;
  flowerCount: number;
  badgeCount: number;
  contributionScore: number;
  /** 最多 6 个最新徽章 */
  badges: UserProfileBadgeDto[];
}

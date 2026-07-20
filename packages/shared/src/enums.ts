// ===== 左邻右帮 - 共享枚举 =====

/** 用户状态 */
export enum UserStatus {
  ACTIVE = 'active',
  BANNED = 'banned',
  DELETED = 'deleted',
}

/** 小区状态 */
export enum CommunityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** 小区成员角色 */
export enum MemberRole {
  RESIDENT = 'resident',
  COMMITTEE_ADMIN = 'committee_admin',
  PLATFORM_ADMIN = 'platform_admin',
  VOLUNTEER = 'volunteer',
}

/** 认证状态 */
export enum VerifyStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

/** 认证材料类型 */
export enum MaterialType {
  PROPERTY_CERT = 'property_cert',
  RENT_CONTRACT = 'rent_contract',
  ACCESS_CARD = 'access_card',
  OTHER = 'other',
}

/** 认证审核状态 */
export enum VerificationStatus {
  PENDING = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MANUAL_REVIEW = 'manual_review',
}

/** 事件类型 */
export enum EventType {
  HELP_REQUEST = 'help_request',
  /** @deprecated help_offer 已废弃，前端不再允许创建，仅兼容历史数据 */
  HELP_OFFER = 'help_offer',
  PUBLIC_WELFARE = 'public_welfare',
  PET_HELP = 'pet_help',
  /** @deprecated lost_found 已迁移到 pet_help + subType=lost */
  LOST_FOUND = 'lost_found',
  PUBLIC_FEEDBACK = 'public_feedback',
  DISCUSSION = 'discussion',
}

/** 宠物帮帮子分类 */
export enum PetSubType {
  FEED = 'feed',
  WALK = 'walk',
  LOST = 'lost',
}

/** 事件状态 */
export enum EventStatus {
  PENDING_REVIEW = 'pending_review',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  REJECTED = 'rejected',
}

/** AI 审核状态 */
export enum AiReviewStatus {
  PENDING = 'pending',
  PASS = 'pass',
  REJECT = 'reject',
  MANUAL_REVIEW = 'manual_review',
}

/** 事件奖励类型 */
export enum RewardType {
  FREE = 'free',
  PAID = 'paid',
  NEGOTIABLE = 'negotiable',
  NONE = 'none',
}

/** 事件可见性 */
export enum Visibility {
  PUBLIC = 'public',
  ADMIN_ONLY = 'admin_only',
}

/** 响应动作类型 */
export enum ActionType {
  HELP = 'help',
  NEED_HELP = 'need_help',
  JOIN = 'join',
  PROVIDE_CLUE = 'provide_clue',
  FOLLOW = 'follow',
  PARTICIPATE_DISCUSSION = 'participate_discussion',
}

/** 响应状态 */
export enum ApplicationStatus {
  PENDING = 'pending',
  SELECTED = 'selected',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
}

/** 确认角色 */
export enum ConfirmationRole {
  CREATOR = 'creator',
  HELPER = 'helper',
  PARTICIPANT = 'participant',
  ADMIN = 'admin',
}

/** 确认状态 */
export enum ConfirmationStatus {
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
}

/** 评论状态 */
export enum CommentStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

/** 举报原因 */
export enum ReportReason {
  PRIVACY = 'privacy',
  FALSE_INFO = 'false_info',
  HARASSMENT = 'harassment',
  ILLEGAL = 'illegal',
  AD_SPAM = 'ad_spam',
  OTHER = 'other',
}

/** 举报状态 */
export enum ReportStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  REJECTED = 'rejected',
}

/** 举报目标类型 */
export enum ReportTargetType {
  EVENT = 'event',
  EVENT_COMMENT = 'event_comment',
  MARKET_ITEM = 'market_item',
  MARKET_COMMENT = 'market_comment',
  USER = 'user',
  TOPIC = 'topic',
  TOPIC_COMMENT = 'topic_comment',
  GUIDE = 'guide',
  GUIDE_COMMENT = 'guide_comment',
  VOTE = 'vote',
}

/** 反馈处理状态 */
export enum FeedbackStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  CONTACTED = 'contacted',
  RESOLVED = 'resolved',
  CANNOT_RESOLVE = 'cannot_resolve',
  CLOSED = 'closed',
}

/** 闲置分类 */
export enum MarketCategory {
  FREE = 'free',
  FURNITURE = 'furniture',
  BABY = 'baby',
  BOOKS = 'books',
  PET = 'pet',
  DIGITAL = 'digital',
  OTHER = 'other',
}

/** 闲置交易类型 */
export enum TradeType {
  SELL = 'sell',
  FREE = 'free',
  EXCHANGE = 'exchange',
}

/** 闲置成色 */
export enum ConditionLevel {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  USED = 'used',
  OLD = 'old',
}

/** 闲置状态 */
export enum MarketItemStatus {
  PENDING_REVIEW = 'pending_review',
  ON_SALE = 'on_sale',
  SOLD = 'sold',
  CLOSED = 'closed',
  REJECTED = 'rejected',
}

/** 贡献行为 */
export enum ContributionAction {
  HELP_FREE = 'help_free',
  HELP_PAID = 'help_paid',
  PUBLIC_WELFARE = 'public_welfare',
  LOST_FOUND = 'lost_found',
  FEEDBACK = 'feedback',
  COMMUNITY_FOUNDING = 'community_founding',
  // ponytail: 预留枚举值，当前未使用但未来可能需要
  MARKET = 'market',
  GOOD_REVIEW = 'good_review',
  GUIDE = 'guide',
  MANUAL = 'manual',
}

/** 贡献来源 */
export enum ContributionSourceType {
  EVENT = 'event',
  MARKET = 'market',
  FEEDBACK = 'feedback',
  GUIDE = 'guide',
  MANUAL = 'manual',
}

/** 贡献状态 */
export enum ContributionStatus {
  VALID = 'valid',
  PENDING_REVIEW = 'pending_review',
  INVALID = 'invalid',
}

/** 榜单周期 */
export enum PeriodType {
  TOTAL = 'total',
  MONTH = 'month',
}

/** 奖章来源 */
export enum BadgeSourceType {
  EVENT = 'event',
  MARKET = 'market',
  GUIDE = 'guide',
  MANUAL = 'manual',
}

/** 成员认领状态 */
export enum ClaimStatus {
  UNCLAIMED = 'unclaimed',
  PENDING = 'pending',
  CLAIMED = 'claimed',
  REJECTED = 'rejected',
}

/** 公告状态 */
export enum AnnouncementStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

/** 投票类型 */
export enum VoteType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
}

/** 投票状态 */
export enum VoteStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

/** 投票结果可见性 */
export enum ResultVisibility {
  ALWAYS = 'always',
  AFTER_VOTE = 'after_vote',
  AFTER_END = 'after_end',
  ADMIN_ONLY = 'admin_only',
}

/** Banner 位置 */
export enum BannerPosition {
  HOME_TOP = 'home_top',
  EVENT_LIST = 'event_list',
  MARKET_LIST = 'market_list',
}

/** Banner 状态 */
export enum BannerStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  OFFLINE = 'offline',
}

/** Banner 链接类型 */
export enum BannerLinkType {
  EVENT = 'event',
  MARKET = 'market',
  ANNOUNCEMENT = 'announcement',
  SERVICE_PROVIDER = 'service_provider',
  URL = 'url',
  NONE = 'none',
}

/** 服务商分类 */
export enum ServiceProviderCategory {
  REPAIR = 'repair',
  CLEANING = 'cleaning',
  LOCK = 'lock',
  HOME_APPLIANCE = 'home_appliance',
  MOVING = 'moving',
  PET = 'pet',
  OTHER = 'other',
}

/** 服务商状态 */
export enum ServiceProviderStatus {
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  OFFLINE = 'offline',
  REJECTED = 'rejected',
}

/** 推荐来源 */
export enum RecommendationSource {
  PLATFORM = 'platform',
  COMMITTEE = 'committee',
  COMMUNITY = 'community',
}

/** 社群入口可见性 */
export enum SocialGroupVisibleTo {
  VERIFIED_ONLY = 'verified_only',
  PUBLIC = 'public',
}

/** 通知类型 */
export enum NotificationType {
  REVIEW_RESULT = 'review_result',
  EVENT_RESPONSE = 'event_response',
  COMPLETION = 'completion',
  BADGE = 'badge',
  FEEDBACK = 'feedback',
  VOTE = 'vote',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system',
  TOPIC_CLOSED = 'topic_closed',
}

/** 分享目标类型 */
export enum ShareTargetType {
  HOME = 'home',
  EVENT = 'event',
  MARKET = 'market',
  RANKING = 'ranking',
  BADGE = 'badge',
  ANNOUNCEMENT = 'announcement',
  VOTE = 'vote',
  SERVICE_PROVIDER = 'service_provider',
}

/** 分享渠道 */
export enum ShareChannel {
  FRIEND = 'friend',
  TIMELINE = 'timeline',
  POSTER = 'poster',
  COPY_LINK = 'copy_link',
  OPEN_FROM_SHARE = 'open_from_share',
}

/** AI 审核目标类型 */
export enum AiReviewTargetType {
  EVENT = 'event',
  COMMENT = 'comment',
  MARKET_ITEM = 'market_item',
  VERIFICATION = 'verification',
  COMMITTEE_CLAIM = 'committee_claim',
  BANNER = 'banner',
  SERVICE_PROVIDER = 'service_provider',
}

/** 后台管理员角色 */
export enum AdminRole {
  PLATFORM_ADMIN = 'platform_admin',
  COMMITTEE_ADMIN = 'committee_admin',
}

/** 后台管理员状态 */
export enum AdminStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/** 服务商认证状态 */
export enum ServiceProviderVerifyStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

/** 议题状态 */
export enum TopicStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

/** 议题赞踩范围 */
export enum TopicLikeScope {
  OPEN = 'open',
  CLOSED = 'closed',
}

/** 议题赞踩类型 */
export enum TopicLikeType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

/** 议题合并建议状态 */
export enum MergeSuggestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** AI 功能开关 key */
export enum AiFeatureKey {
  TOPIC_SUGGEST = 'ai_topic_suggest',
  TOPIC_MERGE = 'ai_topic_merge',
  EVENT_COMMENT = 'ai_event_comment',
  CONTENT_REVIEW = 'ai_content_review',
}

/** 小区申请状态 */
export enum CommunityApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** 图文教程状态 */
export enum GuideStatus {
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

/** 图文教程分类 */
export enum GuideCategory {
  USAGE_GUIDE = 'usage_guide',
  REPAIR = 'repair',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

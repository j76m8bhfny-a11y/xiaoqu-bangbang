import { View, Text, Image, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/icon';
import { EventStatus, EventType } from '@xiaoqu-bangbang/shared';
import type { EventDto, EventRateDto } from '@xiaoqu-bangbang/shared';
import { RATING_TAGS, formatRelativeTime } from './constants';

interface LifecycleProps {
  isCreator: boolean;
  isHelper: boolean;
  isMultiHelperType: boolean;
  event: EventDto;
  user: { id: string } | null;
  submitting: boolean;
  hasContacted: boolean;
  hasRated: boolean;
  rateTargetUserId: string | null;
  ratingStars: number;
  selectedTags: string[];
  ratingContent: string;
  ratingSubmitting: boolean;
  ratings: EventRateDto[];
  onContact: () => void;
  onConfirmCompletion: () => void;
  onRequestCompletion: () => void;
  onThanks: (userId?: string) => void;
  onRateHelper: () => void;
  onClose: () => void;
  onReport: () => void;
  onSetRatingStars: (n: number) => void;
  onToggleTag: (tag: string) => void;
  onSetRatingContent: (v: string) => void;
}

export function Lifecycle({
  isCreator,
  isHelper,
  isMultiHelperType,
  event,
  user,
  submitting,
  hasContacted,
  hasRated,
  rateTargetUserId,
  ratingStars,
  selectedTags,
  ratingContent,
  ratingSubmitting,
  ratings,
  onContact,
  onConfirmCompletion,
  onRequestCompletion,
  onThanks,
  onRateHelper,
  onClose,
  onReport,
  onSetRatingStars,
  onToggleTag,
  onSetRatingContent,
}: LifecycleProps) {
  return (
    <>
      {/* H2: Contact button - only for creator/helper when a helper is selected */}
      {(isCreator || isHelper) &&
        event.selectedHelperId &&
        event.status !== EventStatus.PENDING_REVIEW &&
        event.status !== EventStatus.REJECTED && (
          <View
            className={`event-detail__contact-btn ${hasContacted ? 'event-detail__contact-btn--contacted' : ''}`}
            onClick={onContact}
          >
            <Icon name="phone" size={16} color={hasContacted ? '#86909c' : '#5B9E6F'} />
            <Text
              className={`event-detail__contact-btn-text ${hasContacted ? 'event-detail__contact-btn-text--contacted' : ''}`}
            >
              {hasContacted ? `已联系 ✓` : isCreator ? '联系帮手' : '联系发布者'}
            </Text>
          </View>
        )}

      <View className="event-detail__lifecycle">
        {/* 状态推进主按钮：确认完成 / 申请完成 / 送花感谢 */}
        {/* ponytail: 多帮手类型(public_welfare/lost_found) 走逐个确认流程，不显示全局确认/申请按钮 */}
        {isCreator &&
          !isMultiHelperType &&
          (event.status === EventStatus.IN_PROGRESS || event.status === EventStatus.PROCESSING) && (
            <View
              className="event-detail__lifecycle-btn event-detail__lifecycle-btn--confirm"
              onClick={onConfirmCompletion}
            >
              <Text className="event-detail__lifecycle-btn-text">
                {submitting ? '提交中...' : '确认完成'}
              </Text>
            </View>
          )}
        {user &&
          !isMultiHelperType &&
          event.selectedHelperId === user.id &&
          (event.status === EventStatus.IN_PROGRESS || event.status === EventStatus.PROCESSING) && (
            <View
              className="event-detail__lifecycle-btn event-detail__lifecycle-btn--request"
              onClick={onRequestCompletion}
            >
              <Text className="event-detail__lifecycle-btn-text">
                {submitting ? '提交中...' : '申请完成'}
              </Text>
            </View>
          )}
        {isCreator && !isMultiHelperType && event.status === EventStatus.COMPLETED && (
          <View
            className="event-detail__lifecycle-btn event-detail__lifecycle-btn--thanks"
            onClick={() => onThanks()}
          >
            <Text className="event-detail__lifecycle-btn-text" style={{ color: '#FF6B6B' }}>
              <Icon name="flower" size={16} color="#C9702F" /> 送花感谢
            </Text>
          </View>
        )}

        {/* 评价对方：COMPLETED + 参与者 + 有评价目标 + 未评价 */}
        {event.status === EventStatus.COMPLETED &&
          (isCreator || isHelper) &&
          rateTargetUserId &&
          (hasRated ? (
            <View className="event-detail__rated-hint">
              <View className="event-detail__rated-hint-text">
                <Icon name="check" size={14} /> <Text>已完成评价</Text>
              </View>
            </View>
          ) : (
            <View className="event-detail__rating">
              <Text className="event-detail__rating-title">
                <Icon name="star" size={16} color="#C9702F" /> 评价{isCreator ? '帮手' : '发起者'}
              </Text>
              <View className="event-detail__rating-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Text
                    key={n}
                    className={
                      n <= ratingStars
                        ? 'event-detail__rating-star event-detail__rating-star--active'
                        : 'event-detail__rating-star'
                    }
                    onClick={() => onSetRatingStars(n)}
                  >
                    {'\u2605'}
                  </Text>
                ))}
              </View>
              <View className="event-detail__rating-tags">
                {RATING_TAGS.map((tag) => (
                  <Text
                    key={tag}
                    className={
                      selectedTags.includes(tag)
                        ? 'event-detail__rating-tag event-detail__rating-tag--active'
                        : 'event-detail__rating-tag'
                    }
                    onClick={() => onToggleTag(tag)}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
              <Input
                className="event-detail__rating-input"
                placeholder="说点什么（可选）"
                value={ratingContent}
                onInput={(e) => onSetRatingContent(e.detail.value)}
                maxlength={200}
              />
              <View
                className="event-detail__lifecycle-btn event-detail__lifecycle-btn--rate"
                onClick={onRateHelper}
              >
                <Text className="event-detail__lifecycle-btn-text">
                  {ratingSubmitting ? '提交中...' : '提交评价'}
                </Text>
              </View>
            </View>
          ))}

        {/* 已有评价列表 */}
        {event.status === EventStatus.COMPLETED && ratings.length > 0 && (
          <View className="event-detail__ratings-list">
            <View className="event-detail__ratings-list-header">
              <Icon name="star" size={18} color="#C9702F" /> <Text>评价 ({ratings.length})</Text>
            </View>
            {ratings.map((r) => (
              <View key={r.id} className="event-detail__rating-item">
                <View className="event-detail__rating-item-header">
                  <View className="event-detail__rating-item-avatar">
                    {r.user?.avatarUrl ? (
                      <Image
                        className="event-detail__rating-item-avatar-img"
                        src={r.user.avatarUrl}
                        mode="aspectFill"
                      />
                    ) : (
                      <Text className="event-detail__rating-item-avatar-emoji">
                        {(r.user?.nickname ?? '?').slice(0, 1)}
                      </Text>
                    )}
                  </View>
                  <View className="event-detail__rating-item-meta">
                    <Text className="event-detail__rating-item-nickname">
                      {r.user?.nickname ?? '邻居'}
                    </Text>
                    <Text className="event-detail__rating-item-role">
                      {r.role === 'creator' ? '发起者评价' : '帮手评价'}
                    </Text>
                  </View>
                  <View className="event-detail__rating-item-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Text
                        key={n}
                        className={
                          n <= r.rating
                            ? 'event-detail__rating-item-star event-detail__rating-item-star--active'
                            : 'event-detail__rating-item-star'
                        }
                      >
                        {'\u2605'}
                      </Text>
                    ))}
                  </View>
                </View>
                {r.tags && r.tags.length > 0 && (
                  <View className="event-detail__rating-item-tags">
                    {r.tags.map((tag) => (
                      <Text key={tag} className="event-detail__rating-item-tag">
                        {tag}
                      </Text>
                    ))}
                  </View>
                )}
                {r.content && (
                  <Text className="event-detail__rating-item-content">{r.content}</Text>
                )}
                <Text className="event-detail__rating-item-time">
                  {formatRelativeTime(r.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 创建者管理区：编辑（仅 open）/ 关闭（open~processing） */}
        {isCreator &&
          (event.status === EventStatus.OPEN ||
            event.status === EventStatus.IN_PROGRESS ||
            event.status === EventStatus.PROCESSING) && (
            <View className="event-detail__manage-row">
              {event.status === EventStatus.OPEN && (
                <View
                  className="event-detail__manage-btn"
                  onClick={() =>
                    Taro.navigateTo({
                      url:
                        event.type === EventType.PET_HELP
                          ? `/pages/pet-edit/index?id=${event.id}`
                          : `/pages/event-edit/index?id=${event.id}`,
                    })
                  }
                >
                  <View className="event-detail__manage-btn-text">
                    <Icon name="edit" size={16} /> <Text>编辑</Text>
                  </View>
                </View>
              )}
              <View className="event-detail__manage-btn" onClick={onClose}>
                <View className="event-detail__manage-btn-text">
                  <Icon name="lock" size={16} /> <Text>关闭事件</Text>
                </View>
              </View>
            </View>
          )}

        {/* 举报：非创建者可见，pending_review/rejected 除外 */}
        {!isCreator &&
          event.status !== EventStatus.PENDING_REVIEW &&
          event.status !== EventStatus.REJECTED && (
            <View className="event-detail__report-link" onClick={onReport}>
              <View className="event-detail__report-link-text">
                <Icon name="block" size={16} color="#D9534F" /> <Text>举报该事件</Text>
              </View>
            </View>
          )}
      </View>
    </>
  );
}

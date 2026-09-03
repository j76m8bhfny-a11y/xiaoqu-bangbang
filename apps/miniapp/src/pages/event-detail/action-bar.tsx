import { View, Text } from '@tarojs/components';
import Icon from '@/components/icon';
import { EventType, EventStatus } from '@xiaoqu-bangbang/shared';
import type { EventDto } from '@xiaoqu-bangbang/shared';
import { PET_SUBTYPE_CTA } from './constants';

interface TypeConfig {
  ctaColor: string;
  ctaText: string;
}

interface ActionBarProps {
  liked: boolean;
  favorited: boolean;
  interactionDisabled: boolean;
  isCreator: boolean;
  event: EventDto;
  submitting: boolean;
  typeConfig: TypeConfig;
  onLike: () => void;
  onComment: () => void;
  onCta: () => void;
  onFavorite: () => void;
}

export function ActionBar({
  liked,
  favorited,
  interactionDisabled,
  isCreator,
  event,
  submitting,
  typeConfig,
  onLike,
  onComment,
  onCta,
  onFavorite,
}: ActionBarProps) {
  return (
    <View className="event-detail__action-bar">
      <View
        className={`event-detail__action-btn event-detail__action-btn--like ${liked ? 'event-detail__action-btn--active' : ''} ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
        onClick={interactionDisabled ? undefined : onLike}
      >
        <View className="event-detail__action-btn-icon">
          <Icon name="heart" size={24} color={liked ? '#C9702F' : '#6B7A6E'} />
        </View>
        <Text className="event-detail__action-btn-label">赞</Text>
      </View>

      <View
        className={`event-detail__action-btn event-detail__action-btn--comment ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
        onClick={interactionDisabled ? undefined : onComment}
      >
        <View className="event-detail__action-btn-icon">
          <Icon name="chat" size={24} />
        </View>
        <Text className="event-detail__action-btn-label">评论</Text>
      </View>

      {!isCreator &&
        (event.status === EventStatus.OPEN || event.status === EventStatus.IN_PROGRESS) && (
          <View
            className="event-detail__action-btn event-detail__action-btn--cta"
            style={{ backgroundColor: typeConfig.ctaColor }}
            onClick={onCta}
          >
            <Text className="event-detail__action-btn-cta-text">
              {submitting
                ? '提交中...'
                : event.type === EventType.PET_HELP && event.subType
                  ? (PET_SUBTYPE_CTA[event.subType] ?? typeConfig.ctaText)
                  : typeConfig.ctaText}
            </Text>
          </View>
        )}

      <View
        className={`event-detail__action-btn event-detail__action-btn--fav ${favorited ? 'event-detail__action-btn--active' : ''} ${interactionDisabled ? 'event-detail__action-btn--disabled' : ''}`}
        onClick={interactionDisabled ? undefined : onFavorite}
      >
        <View className="event-detail__action-btn-icon">
          <Icon name={favorited ? 'star' : 'star-outline'} size={24} color="#C9702F" />
        </View>
        <Text className="event-detail__action-btn-label">收藏</Text>
      </View>
    </View>
  );
}

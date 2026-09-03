import { View, Text } from '@tarojs/components';
import './index.scss';
import Icon from '@/components/icon';
import type { EventCardData } from '../event-card';

interface MasonryEventCardProps {
  data: EventCardData;
  onClick?: (id: string) => void;
}

export default function MasonryEventCard({ data, onClick }: MasonryEventCardProps) {
  return (
    <View
      className={`masonry-card${data.isInactive ? ' masonry-card--inactive' : ''}`}
      onClick={() => onClick?.(data.id)}
    >
      <View
        className="masonry-card__tag"
        style={{ background: data.typeBgColor, color: data.typeColor }}
      >
        <Text>{data.typeLabel}</Text>
      </View>
      <Text className="masonry-card__title">{data.title}</Text>
      {data.createdAt && data.createdAt !== '刚刚' && (
        <Text className="masonry-card__time">{data.createdAt}</Text>
      )}
      <View className="masonry-card__footer">
        <Text className="masonry-card__name">{data.creatorName}</Text>
        <View className="masonry-card__stats">
          {data.thanksCount > 0 && (
            <View className="masonry-card__stat">
              <Icon name="flower" size={14} color="#C9702F" />
              <Text className="masonry-card__stat-text">{data.thanksCount}</Text>
            </View>
          )}
          {data.likeCount > 0 && (
            <View className="masonry-card__stat">
              <Icon name="heart" size={14} color="#C9702F" />
              <Text className="masonry-card__stat-text">{data.likeCount}</Text>
            </View>
          )}
          {data.commentCount > 0 && (
            <View className="masonry-card__stat">
              <Icon name="chat" size={14} />
              <Text className="masonry-card__stat-text">{data.commentCount}</Text>
            </View>
          )}
          {data.thanksCount === 0 && data.likeCount === 0 && data.commentCount === 0 && (
            <Text className="masonry-card__stat-text masonry-card__stat-text--empty">刚刚发布</Text>
          )}
        </View>
      </View>
    </View>
  );
}

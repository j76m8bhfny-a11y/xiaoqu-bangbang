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
    <View className="masonry-card" onClick={() => onClick?.(data.id)}>
      <View
        className="masonry-card__tag"
        style={{ background: data.typeBgColor, color: data.typeColor }}
      >
        <Text>{data.typeLabel}</Text>
      </View>
      <Text className="masonry-card__title">{data.title}</Text>
      <View className="masonry-card__footer">
        <Text className="masonry-card__name">{data.creatorName}</Text>
        <View className="masonry-card__stats">
          <View className="masonry-card__stat">
            <Icon name="flower" size={14} color="#E89B6C" />
            <Text className="masonry-card__stat-text">{data.thanksCount}</Text>
          </View>
          <View className="masonry-card__stat">
            <Icon name="heart" size={14} color="#E89B6C" />
            <Text className="masonry-card__stat-text">{data.likeCount}</Text>
          </View>
          <View className="masonry-card__stat">
            <Icon name="chat" size={14} />
            <Text className="masonry-card__stat-text">{data.commentCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

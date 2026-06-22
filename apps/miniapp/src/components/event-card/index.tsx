import { View, Text, Image } from '@tarojs/components';
import './index.scss';

export interface EventCardData {
  id: string;
  type: string;
  typeLabel: string;
  typeColor: string;
  typeBgColor: string;
  statusLabel: string;
  title: string;
  description: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  createdAt: string;
  locationText?: string;
  likeCount: number;
  commentCount: number;
  thanksCount: number;
  ctaText: string;
  ctaColor: string;
}

interface EventCardProps {
  data: EventCardData;
  onClick?: (id: string) => void;
  onCtaClick?: (id: string) => void;
}

export default function EventCard({ data, onClick, onCtaClick }: EventCardProps) {
  return (
    <View className='event-card' onClick={() => onClick?.(data.id)}>
      <View className='event-card__header'>
        <View
          className='event-card__type-tag'
          style={{ background: data.typeBgColor, color: data.typeColor }}
        >
          <Text className='event-card__type-text'>{data.typeLabel}</Text>
        </View>
        <View className='event-card__status-tag'>
          <Text className='event-card__status-text'>{data.statusLabel}</Text>
        </View>
      </View>

      <Text className='event-card__title'>{data.title}</Text>
      <Text className='event-card__desc'>{data.description}</Text>

      <View className='event-card__meta'>
        <View className='event-card__creator-avatar'>
          {data.creatorAvatarUrl ? (
            <Image className='event-card__creator-avatar-img' src={data.creatorAvatarUrl} mode='aspectFill' />
          ) : (
            <Text className='event-card__creator-avatar-fallback'>{data.creatorName.slice(0, 1)}</Text>
          )}
        </View>
        <Text className='event-card__creator'>{data.creatorName}</Text>
        <Text className='event-card__dot'>·</Text>
        <Text className='event-card__time'>{data.createdAt}</Text>
        {data.locationText && (
          <>
            <Text className='event-card__dot'>·</Text>
            <Text className='event-card__location'>{data.locationText}</Text>
          </>
        )}
      </View>

      <View className='event-card__footer'>
        <View className='event-card__stats'>
          <Text className='event-card__stat'>❤️ {data.likeCount}</Text>
          <Text className='event-card__stat'>💬 {data.commentCount}</Text>
          <Text className='event-card__stat'>🌸 {data.thanksCount}</Text>
        </View>
        <View
          className='event-card__cta'
          style={{ background: data.ctaColor }}
          onClick={(e) => {
            e.stopPropagation();
            onCtaClick?.(data.id);
          }}
        >
          <Text className='event-card__cta-text'>{data.ctaText}</Text>
        </View>
      </View>
    </View>
  );
}

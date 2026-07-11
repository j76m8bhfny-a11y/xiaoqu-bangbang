import { View, Text } from '@tarojs/components';
import './index.scss';
import Icon from '@/components/icon';

export interface ServiceProviderData {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  recommendationSource: string;
}

interface ServiceProviderCardProps {
  data: ServiceProviderData;
  onClick?: (id: string) => void;
}

export default function ServiceProviderCard({ data, onClick }: ServiceProviderCardProps) {
  return (
    <View className="service-card" onClick={() => onClick?.(data.id)}>
      <View className="service-card__icon-wrap">
        <View className="service-card__icon">
          <Icon
            name={
              data.category === 'repair'
                ? 'wrench'
                : data.category === 'cleaning'
                  ? 'star'
                  : data.category === 'lock'
                    ? 'key'
                    : data.category === 'pet'
                      ? 'paw'
                      : data.category === 'moving'
                        ? 'box'
                        : 'house'
            }
            size={28}
          />
        </View>
      </View>
      <View className="service-card__info">
        <View className="service-card__top">
          <Text className="service-card__name">{data.name}</Text>
          <View className="service-card__tag">
            <Text className="service-card__tag-text">{data.categoryLabel}</Text>
          </View>
        </View>
        <Text className="service-card__desc">{data.description}</Text>
        <Text className="service-card__source">{data.recommendationSource}推荐</Text>
      </View>
    </View>
  );
}

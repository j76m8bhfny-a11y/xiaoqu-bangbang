import { View, Text, Swiper, SwiperItem } from '@tarojs/components';
import { useState } from 'react';
import './index.scss';

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  ctaText?: string;
  bgColor?: string;
  accentColor?: string;
  linkType?: string;
  linkId?: string;
  linkUrl?: string;
}

interface BannerCarouselProps {
  banners?: BannerItem[];
  onBannerClick?: (id: string) => void;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: '1',
    title: '本月热心邻居出炉啦',
    subtitle: '看看谁拿到了小红花',
    tag: '好人榜',
    ctaText: '去看看',
    bgColor: '#eaf4ec',
    accentColor: '#5b9e6f',
  },
  {
    id: '2',
    title: '周末邻里互助日',
    subtitle: '一起让小区更温暖',
    tag: '公益活动',
    ctaText: '我要报名',
    bgColor: '#fbf0dd',
    accentColor: '#e89b6c',
  },
  {
    id: '3',
    title: '楼道灯维修进度',
    subtitle: '业委会已联系物业处理',
    tag: '公共反馈',
    ctaText: '关注进展',
    bgColor: '#eaf4ec',
    accentColor: '#5b9e6f',
  },
];

export default function BannerCarousel({
  banners = DEFAULT_BANNERS,
  onBannerClick,
}: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);

  return (
    <View className="banner-carousel">
      <Swiper
        className="banner-carousel__swiper"
        indicatorDots={false}
        autoplay
        circular
        interval={4000}
        onChange={(e) => setCurrent(e.detail.current)}
      >
        {banners.map((banner) => (
          <SwiperItem key={banner.id}>
            <View
              className="banner-carousel__item"
              style={{ background: banner.bgColor || '#eaf4ec' }}
              onClick={() => onBannerClick?.(banner.id)}
            >
              <View className="banner-carousel__content">
                {banner.tag && (
                  <View
                    className="banner-carousel__tag"
                    style={{ background: banner.accentColor || '#5b9e6f' }}
                  >
                    <Text className="banner-carousel__tag-text">{banner.tag}</Text>
                  </View>
                )}
                <Text className="banner-carousel__title">{banner.title}</Text>
                {banner.subtitle && (
                  <Text className="banner-carousel__subtitle">{banner.subtitle}</Text>
                )}
                {banner.ctaText && (
                  <View
                    className="banner-carousel__cta"
                    style={{ background: banner.accentColor || '#5b9e6f' }}
                  >
                    <Text className="banner-carousel__cta-text">{banner.ctaText}</Text>
                    <Text className="banner-carousel__cta-arrow">→</Text>
                  </View>
                )}
              </View>
              <View className="banner-carousel__deco">
                <View
                  className="banner-carousel__deco-circle banner-carousel__deco-circle--1"
                  style={{ borderColor: banner.accentColor || '#5b9e6f' }}
                />
                <View
                  className="banner-carousel__deco-circle banner-carousel__deco-circle--2"
                  style={{ background: banner.accentColor || '#5b9e6f' }}
                />
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>
      <View className="banner-carousel__dots">
        {banners.map((_, i) => (
          <View
            key={i}
            className={`banner-carousel__dot ${i === current ? 'banner-carousel__dot--active' : ''}`}
          />
        ))}
      </View>
    </View>
  );
}

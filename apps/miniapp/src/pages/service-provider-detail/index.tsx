import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { serviceProviderService } from '@/services';
import { useRequest } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import type { ServiceProviderDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

const CATEGORY_LABELS: Record<string, string> = {
  repair: '维修', cleaning: '保洁', lock: '开锁',
  home_appliance: '家电', moving: '搬家', pet: '宠物', other: '其他',
};

const CATEGORY_ICONS: Record<string, string> = {
  repair: '🔧', cleaning: '🧹', lock: '🔑',
  home_appliance: '🔌', moving: '📦', pet: '🐾', other: '🏠',
};

const SOURCE_LABELS: Record<string, string> = {
  platform: '平台',
  committee: '业委会',
  community: '邻居',
};

export default function ServiceProviderDetail() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};

  const { data: provider, loading, error, refresh } = useRequest<ServiceProviderDto>(
    () => serviceProviderService.getById(id!),
    [id],
    { enabled: !!id },
  );

  if (loading) {
    return <Loading text='加载服务详情...' />;
  }

  if (error || !provider) {
    return <ErrorState message={error?.message ?? '服务不存在'} onRetry={refresh} />;
  }

  const categoryLabel = CATEGORY_LABELS[provider.category] ?? provider.category;
  const categoryIcon = CATEGORY_ICONS[provider.category] ?? '🏠';
  const sourceLabel = SOURCE_LABELS[provider.recommendationSource] ?? provider.recommendationSource;

  return (
    <View className='sp-detail'>
      <ScrollView scrollY className='sp-detail__scroll'>
        {/* Header */}
        <View className='sp-detail__header'>
          <View className='sp-detail__logo'>
            <Text className='sp-detail__logo-icon'>{categoryIcon}</Text>
          </View>
          <Text className='sp-detail__name'>{provider.name}</Text>
          <View className='sp-detail__tags'>
            <View className='sp-detail__tag sp-detail__tag--category'>
              <Text className='sp-detail__tag-text'>{categoryLabel}</Text>
            </View>
            <View className='sp-detail__tag sp-detail__tag--source'>
              <Text className='sp-detail__tag-text'>{sourceLabel}推荐</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View className='sp-detail__section'>
          <Text className='sp-detail__section-title'>服务介绍</Text>
          <Text className='sp-detail__description'>{provider.description}</Text>
        </View>

        {/* Contact */}
        <View className='sp-detail__section'>
          <Text className='sp-detail__section-title'>联系方式</Text>
          {provider.contactText ? (
            <Text className='sp-detail__contact-value'>{provider.contactText}</Text>
          ) : (
            <Text className='sp-detail__no-contact'>暂无联系方式</Text>
          )}
        </View>

        {/* Risk Disclaimer */}
        <View className='sp-detail__disclaimer'>
          <Text className='sp-detail__disclaimer-text'>⚠️ 请用户线下自行确认资质与费用</Text>
        </View>

        <View className='sp-detail__bottom-spacer' />
      </ScrollView>
    </View>
  );
}

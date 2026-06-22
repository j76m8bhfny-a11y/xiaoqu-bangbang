import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '@/store';
import { communityService, type SocialGroupDto } from '@/services';
import { useRequest, useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import './index.scss';

export default function SocialGroups() {
  useAuthGuard();

  const user = useAuthStore((s) => s.user);
  const isVerified = user?.verifyStatus === 'verified';

  const { data: groupsData, loading, error, refresh } = useRequest<{ items: SocialGroupDto[] }>(
    () => communityService.getSocialGroups(),
    [],
  );
  const groups = groupsData?.items;

  const handleVerifyPrompt = () => {
    Taro.showModal({
      title: '需要业主认证',
      content: '认证后即可查看群二维码并加入群组',
      confirmText: '去认证',
    }).then(({ confirm }) => {
      if (confirm) {
        Taro.navigateTo({ url: '/pages/verify/index' });
      }
    });
  };

  if (loading) {
    return <Loading text='加载群组...' />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  return (
    <View className='social-groups'>
      <ScrollView scrollY className='social-groups__scroll'>
        <View className='social-groups__header'>
          <Text className='social-groups__header-title'>👥 社区群组</Text>
          <Text className='social-groups__header-sub'>加入兴趣群组，认识更多邻居</Text>
        </View>

        {!groups || groups.length === 0 ? (
          <EmptyState icon='👥' text='暂无群组' />
        ) : (
          <View className='social-groups__list'>
            {groups.map((group) => (
              <View key={group.id} className='social-groups__card'>
                <View className='social-groups__card-header'>
                  <View className='social-groups__card-info'>
                    <Text className='social-groups__card-name'>{group.title}</Text>
                    <Text className='social-groups__card-desc'>{group.description}</Text>
                  </View>
                </View>
                {group.contactText && (
                  <View className='social-groups__card-meta'>
                    <Text className='social-groups__card-members'>{group.contactText}</Text>
                  </View>
                )}

                {isVerified ? (
                  <View className='social-groups__card-qr'>
                    {group.qrImageUrl ? (
                      <Image
                        className='social-groups__qr-image'
                        src={group.qrImageUrl}
                        mode='aspectFit'
                      />
                    ) : (
                      <Text className='social-groups__qr-placeholder'>暂无二维码</Text>
                    )}
                  </View>
                ) : (
                  <View className='social-groups__card-verify' onClick={handleVerifyPrompt}>
                    <Text className='social-groups__card-verify-text'>🔒 认证后查看</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View className='social-groups__bottom-spacer' />
      </ScrollView>
    </View>
  );
}

import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { communityService } from '@/services';
import { useCommunityStore, useAuthStore } from '@/store';
import { useRequest } from '@/hooks';
import type { CommunityDto } from '@xiaoqu-bangbang/shared';
import NavBar from '@/components/navbar';
import './index.scss';
import Icon from '@/components/icon';

export default function CommunitySelect() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);
  const updateUser = useAuthStore((s) => s.updateUser);

  // 启动/登录时带 pendingAppId 参数 → 自动跳转到申请详情页
  useEffect(() => {
    const { pendingAppId } = router.params;
    if (pendingAppId) {
      Taro.navigateTo({ url: `/pages/community-application-detail/index?id=${pendingAppId}` });
    }
  }, [router.params]);

  const { data, loading, error } = useRequest(
    () => communityService.list({ keyword: keyword || undefined }),
    [keyword],
  );

  const communities = data?.items ?? [];

  const handleSelect = async (community: CommunityDto) => {
    try {
      await communityService.select({ communityId: community.id });
      selectCommunity(community);
      updateUser({ currentCommunityId: community.id, currentCommunityName: community.name });
      Taro.switchTab({ url: '/pages/home/index' });
    } catch {
      Taro.showToast({ title: '选择失败', icon: 'none' });
    }
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  return (
    <View className="cs">
      <NavBar title="选择小区" />
      {/* 顶部装饰区域 */}
      <View className="cs__hero">
        <View className="cs__hero-decor">
          <View className="cs__hero-emoji">
            <Icon name="community" size={64} color="#C9702F" />
          </View>
        </View>
        <Text className="cs__hero-title">选择您所在的小区</Text>
        <Text className="cs__hero-subtitle">加入社区，开启邻里互助之旅</Text>
      </View>

      {/* 搜索栏 */}
      <View className="cs__search-wrap">
        <View className="cs__search">
          <View className="cs__search-icon">
            <Icon name="search" size={20} />
          </View>
          <Input
            className="cs__search-input"
            placeholder="搜索小区名称或地址..."
            placeholderClass="cs__search-placeholder"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
          />
          {keyword && (
            <Text className="cs__search-clear" onClick={() => setKeyword('')}>
              <Icon name="close" size={20} />
            </Text>
          )}
        </View>
      </View>

      {/* 小区列表 */}
      <ScrollView scrollY className="cs__list">
        {loading && (
          <View className="cs__loading">
            <View className="cs__loading-dots">
              <View className="cs__loading-dot" />
              <View className="cs__loading-dot" />
              <View className="cs__loading-dot" />
            </View>
            <Text className="cs__loading-text">正在搜索小区...</Text>
          </View>
        )}

        {error && (
          <View className="cs__empty">
            <View className="cs__empty-emoji">
              <Icon name="confused" size={48} color="#6B7A6E" />
            </View>
            <Text className="cs__empty-text">加载失败，请重试</Text>
          </View>
        )}

        {!loading && !error && communities.length === 0 && (
          <View className="cs__empty">
            <View className="cs__empty-emoji">
              <Icon name="community" size={48} color="#C9702F" />
            </View>
            <Text className="cs__empty-text">未找到匹配的小区</Text>
            <Text className="cs__empty-hint">换个关键词试试？</Text>
            <View
              className="cs__empty-cta"
              onClick={() => Taro.navigateTo({ url: '/pages/community-apply/index' })}
            >
              <Text className="cs__empty-cta-text">+ 申请开通你家小区</Text>
            </View>
          </View>
        )}

        {!loading &&
          communities.map((c) => (
            <View key={c.id} className="cs__card" onClick={() => handleSelect(c)}>
              <View className="cs__card-left">
                <View className="cs__card-icon">
                  <View className="cs__card-icon-text">
                    <Icon name="house" size={20} />
                  </View>
                </View>
              </View>
              <View className="cs__card-body">
                <Text className="cs__card-name">{c.name}</Text>
                <View className="cs__card-meta">
                  <Text className="cs__card-district">{c.district}</Text>
                  {c.address && (
                    <>
                      <Text className="cs__card-dot">·</Text>
                      <Text className="cs__card-address">{c.address}</Text>
                    </>
                  )}
                </View>
              </View>
              <View className="cs__card-right">
                <View className="cs__card-badge">
                  <Text className="cs__card-badge-num">{formatMemberCount(c.memberCount)}</Text>
                  <Text className="cs__card-badge-label">人已入驻</Text>
                </View>
                <Text className="cs__card-arrow">›</Text>
              </View>
            </View>
          ))}
      </ScrollView>

      <View
        className="cs__apply-bar"
        onClick={() => Taro.navigateTo({ url: '/pages/community-apply/index' })}
      >
        <Text className="cs__apply-text">+ 没找到？申请开通你家小区</Text>
      </View>
    </View>
  );
}

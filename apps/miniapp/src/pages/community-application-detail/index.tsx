import { useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { communityApplicationService, communityService } from '@/services';
import { useAuthStore, useCommunityStore } from '@/store';
import { useRequest } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import NavBar from '@/components/navbar';
import type { CommunityApplicationDto } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '审核中', color: 'orange' },
  approved: { label: '已开通', color: 'green' },
  rejected: { label: '已驳回', color: 'red' },
};

export default function CommunityApplicationDetail() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const selectCommunity = useCommunityStore((s) => s.selectCommunity);
  const [supporting, setSupporting] = useState(false);
  const [entering, setEntering] = useState(false);

  const { data, loading, error, refresh } = useRequest<CommunityApplicationDto>(
    () => communityApplicationService.detail(id!),
    [id],
    { enabled: !!id },
  );

  useShareAppMessage(() => ({
    title: data ? `请为「${data.name}」助力开通左邻右帮` : '左邻右帮',
    path: `/pages/community-application-detail/index?id=${id}`,
  }));

  const handleSupport = async () => {
    if (!id) return;
    if (!user) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }
    if (data?.hasSupported) return;
    setSupporting(true);
    try {
      await communityApplicationService.support(id);
      Taro.showToast({ title: '助力成功！', icon: 'success' });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : '助力失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSupporting(false);
    }
  };

  const handleEnterCommunity = async () => {
    if (!data?.approvedCommunityId) return;
    if (!user) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }
    setEntering(true);
    try {
      await communityService.select({ communityId: data.approvedCommunityId });
      selectCommunity({
        id: data.approvedCommunityId,
        name: data.name,
        city: data.city,
        district: data.district,
        address: data.address,
        status: 'active',
        memberCount: 0,
      });
      updateUser({
        currentCommunityId: data.approvedCommunityId,
        currentCommunityName: data.name,
      });
      Taro.switchTab({ url: '/pages/home/index' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '进入失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setEntering(false);
    }
  };

  if (loading) {
    return (
      <View className="cad">
        <Loading text="加载中..." />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="cad">
        <ErrorState message="加载失败" onRetry={refresh} />
      </View>
    );
  }

  const statusInfo = STATUS_MAP[data.status] ?? { label: data.status, color: 'gray' };
  const isApproved = data.status === 'approved';
  const isPending = data.status === 'pending';
  const isMine = !!user && user.id === data.applicantId;
  const supporterList = data.recentSupporters ?? [];

  return (
    <View className="cad">
      <NavBar title="申请详情" />
      <ScrollView scrollY className="cad__body">
        {/* 小区信息卡 */}
        <View className="cad__hero">
          <View className={`cad__status cad__status--${statusInfo.color}`}>
            <Text className="cad__status-text">{statusInfo.label}</Text>
          </View>
          <Text className="cad__hero-name">{data.name}</Text>
          <Text className="cad__hero-location">
            {data.city} · {data.district}
          </Text>
          <Text className="cad__hero-address">{data.address}</Text>
        </View>

        {/* 助力数 */}
        <View className="cad__count-card">
          <Text className="cad__count-num">{data.supportCount}</Text>
          <Text className="cad__count-label">位邻居已助力</Text>
          {isPending && <Text className="cad__count-hint">助力越多，越早被平台审核哦～</Text>}
          {isApproved && (
            <View className="cad__count-hint">
              <Icon name="party" size={18} color="#C9702F" /> <Text>小区已开通，欢迎大家加入</Text>
            </View>
          )}
        </View>

        {/* 申请人 */}
        <View className="cad__card">
          <Text className="cad__section-title">申请发起人</Text>
          <View className="cad__applicant">
            {data.applicantAvatarUrl ? (
              <Image
                className="cad__applicant-avatar"
                src={data.applicantAvatarUrl}
                mode="aspectFill"
              />
            ) : (
              <View className="cad__applicant-avatar cad__applicant-avatar--placeholder">
                <Text className="cad__applicant-avatar-text">
                  {(data.applicantNickname ?? '邻').slice(0, 1)}
                </Text>
              </View>
            )}
            <View className="cad__applicant-info">
              <Text className="cad__applicant-name">
                {data.applicantNickname ?? '匿名邻居'}
                {isMine && <Text className="cad__applicant-mine">（我）</Text>}
              </Text>
              {data.reason && <Text className="cad__applicant-reason">{data.reason}</Text>}
            </View>
          </View>
        </View>

        {/* 助力人列表 */}
        {supporterList.length > 0 && (
          <View className="cad__card">
            <Text className="cad__section-title">助力的邻居（{data.supportCount}）</Text>
            <View className="cad__supporters">
              {supporterList.map((s) => (
                <View key={s.userId} className="cad__supporter">
                  {s.avatarUrl ? (
                    <Image className="cad__supporter-avatar" src={s.avatarUrl} mode="aspectFill" />
                  ) : (
                    <View className="cad__supporter-avatar cad__supporter-avatar--placeholder">
                      <Text className="cad__supporter-avatar-text">
                        {(s.nickname ?? '邻').slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text className="cad__supporter-name">{s.nickname ?? '邻居'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 驳回原因 */}
        {data.status === 'rejected' && data.rejectReason && (
          <View className="cad__card cad__card--rejected">
            <Text className="cad__section-title">驳回原因</Text>
            <Text className="cad__reject-text">{data.rejectReason}</Text>
          </View>
        )}

        <View className="cad__bottom-spacer" />
      </ScrollView>

      {/* 底部按钮区 */}
      <View className="cad__footer">
        {isPending && !isMine && (
          <View
            className={`cad__support-btn ${
              data.hasSupported || supporting ? 'cad__support-btn--disabled' : ''
            }`}
            onClick={data.hasSupported || supporting ? undefined : handleSupport}
          >
            <Text className="cad__support-text">
              {data.hasSupported ? '✓ 已助力' : supporting ? '助力中...' : '我来助力'}
            </Text>
          </View>
        )}
        {isPending && isMine && (
          <Text className="cad__footer-tip">点击右上角「···」→ 转发给邻居，邀请助力</Text>
        )}
        {isApproved && data.approvedCommunityId && (
          <View
            className={`cad__support-btn ${entering ? 'cad__support-btn--disabled' : ''}`}
            onClick={entering ? undefined : handleEnterCommunity}
          >
            <Text className="cad__support-text">{entering ? '进入中...' : '进入小区首页'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

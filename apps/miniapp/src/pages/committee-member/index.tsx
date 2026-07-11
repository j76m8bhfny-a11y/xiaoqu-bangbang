import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useCallback } from 'react';
import { useRequest } from '@/hooks';
import { committeeService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import { ClaimStatus, type CommitteeMemberDetailDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  [ClaimStatus.UNCLAIMED]: { label: '待认领', color: '#e89b6c', bgColor: '#fbf0dd' },
  [ClaimStatus.PENDING]: { label: '审核中', color: '#3586FF', bgColor: '#EBF2FF' },
  [ClaimStatus.CLAIMED]: { label: '已认领', color: '#5b9e6f', bgColor: '#eaf4ec' },
  [ClaimStatus.REJECTED]: { label: '已拒绝', color: '#FF6B6B', bgColor: '#FFF0F0' },
};

const CLAIM_ITEM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> =
  {
    pending: { label: '审核中', color: '#3586FF', bgColor: '#EBF2FF' },
    approved: { label: '已通过', color: '#5b9e6f', bgColor: '#eaf4ec' },
    rejected: { label: '已拒绝', color: '#FF6B6B', bgColor: '#FFF0F0' },
  };

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CommitteeMember() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};
  const [submitting, setSubmitting] = useState(false);

  const {
    data: member,
    loading,
    error,
    refresh,
  } = useRequest<CommitteeMemberDetailDto>(() => committeeService.getMemberDetail(id!), [id], {
    enabled: !!id,
  });

  const handleClaim = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const res = (await Taro.showModal({
        title: '认领身份',
        editable: true,
        placeholderText: '请说明您与此人的关系...',
      } as any)) as any;
      if (res.confirm && res.content?.trim()) {
        setSubmitting(true);
        await committeeService.claimMembership(id, {
          statement: res.content.trim(),
          materialUrls: [],
        });
        Taro.showToast({ title: '认领申请已提交', icon: 'success' });
        refresh();
      }
    } catch {
      Taro.showToast({ title: '认领失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, refresh]);

  if (loading) {
    return <Loading text="加载成员详情..." />;
  }

  if (error || !member) {
    return <ErrorState message={error?.message ?? '成员不存在'} onRetry={refresh} />;
  }

  const statusConfig =
    CLAIM_STATUS_CONFIG[member.claimStatus] ?? CLAIM_STATUS_CONFIG[ClaimStatus.UNCLAIMED];

  return (
    <View className="committee-member">
      <ScrollView scrollY className="committee-member__scroll">
        {/* Avatar Section */}
        <View className="committee-member__avatar-section">
          <View className="committee-member__avatar">
            {member.avatarUrl ? (
              <Image
                className="committee-member__avatar-img"
                src={member.avatarUrl}
                mode="aspectFill"
              />
            ) : (
              <Text className="committee-member__avatar-text">{member.name[0]}</Text>
            )}
          </View>
          <Text className="committee-member__name">{member.name}</Text>
          <Text className="committee-member__position">{member.position}</Text>
          <View
            className="committee-member__status-badge"
            style={{ backgroundColor: statusConfig.bgColor }}
          >
            <Text className="committee-member__status-text" style={{ color: statusConfig.color }}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View className="committee-member__info-card">
          {member.responsibility && (
            <View className="committee-member__info-row">
              <Text className="committee-member__info-label">职责</Text>
              <Text className="committee-member__info-value">{member.responsibility}</Text>
            </View>
          )}
          {member.termStart && (
            <View className="committee-member__info-row">
              <Text className="committee-member__info-label">任期</Text>
              <Text className="committee-member__info-value">
                {formatDate(member.termStart)} ~{' '}
                {member.termEnd ? formatDate(member.termEnd) : '至今'}
              </Text>
            </View>
          )}
        </View>

        {/* Claim Button */}
        {member.claimStatus === ClaimStatus.UNCLAIMED && (
          <View className="committee-member__claim-section">
            <View className="committee-member__claim-btn" onClick={handleClaim}>
              <Text className="committee-member__claim-btn-text">
                {submitting ? '提交中...' : '我是此人'}
              </Text>
            </View>
          </View>
        )}

        {/* Claims List */}
        {member.claims && member.claims.length > 0 && (
          <View className="committee-member__claims">
            <Text className="committee-member__claims-header">认领记录</Text>
            {member.claims.map((claim) => {
              const claimStatusConfig =
                CLAIM_ITEM_STATUS_CONFIG[claim.status] ?? CLAIM_ITEM_STATUS_CONFIG.pending;
              return (
                <View key={claim.id} className="committee-member__claim-item">
                  <View className="committee-member__claim-item-top">
                    <Text className="committee-member__claim-item-statement">
                      {claim.statement}
                    </Text>
                    <View
                      className="committee-member__claim-item-tag"
                      style={{ backgroundColor: claimStatusConfig.bgColor }}
                    >
                      <Text
                        className="committee-member__claim-item-tag-text"
                        style={{ color: claimStatusConfig.color }}
                      >
                        {claimStatusConfig.label}
                      </Text>
                    </View>
                  </View>
                  <Text className="committee-member__claim-item-date">
                    {formatDate(claim.createdAt)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View className="committee-member__bottom-spacer" />
      </ScrollView>
    </View>
  );
}

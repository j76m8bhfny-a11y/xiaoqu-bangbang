import { View, Text, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { useRequest } from '@/hooks';
import { committeeService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import type {
  CommitteeMemberDto,
  CommitteeAnnouncementDto,
  PaginatedData,
} from '@xiaoqu-bangbang/shared';
import { ClaimStatus } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

interface CommitteeOverviewDto {
  memberCount: number;
  announcementCount: number;
  latestAnnouncement: { id: string; title: string; publishedAt: string } | null;
}

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  [ClaimStatus.UNCLAIMED]: { label: '待认领', color: '#e89b6c', bgColor: '#fbf0dd' },
  [ClaimStatus.PENDING]: { label: '审核中', color: '#3586FF', bgColor: '#EBF2FF' },
  [ClaimStatus.CLAIMED]: { label: '已认领', color: '#5b9e6f', bgColor: '#eaf4ec' },
  [ClaimStatus.REJECTED]: { label: '已拒绝', color: '#FF6B6B', bgColor: '#FFF0F0' },
};

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Committee() {
  const [membersExpanded, setMembersExpanded] = useState(false);

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    refresh: refreshOverview,
  } = useRequest<CommitteeOverviewDto>(() => committeeService.getOverview());

  const {
    data: membersData,
    loading: membersLoading,
    error: membersError,
    refresh: refreshMembers,
  } = useRequest<PaginatedData<CommitteeMemberDto>>(() => committeeService.getMembers());
  const members = membersData?.items;

  const {
    data: announcementsData,
    loading: announcementsLoading,
    error: announcementsError,
    refresh: refreshAnnouncements,
  } = useRequest<PaginatedData<CommitteeAnnouncementDto>>(() =>
    committeeService.getAnnouncements(),
  );
  const announcements = announcementsData?.items;

  const loading = overviewLoading || membersLoading || announcementsLoading;
  const error = overviewError ?? membersError ?? announcementsError;

  const refresh = () => {
    refreshOverview();
    refreshMembers();
    refreshAnnouncements();
  };

  const handleMemberClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/committee-member/index?id=${id}` });
  };

  const handleAnnouncementClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/committee-announcement/index?id=${id}` });
  };

  if (loading) {
    return <Loading text="加载业委会信息..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  return (
    <View className="committee">
      <ScrollView scrollY className="committee__scroll">
        {/* Stats Header */}
        <View className="committee__stats">
          <View className="committee__stat-card">
            <Text className="committee__stat-value">{overview?.memberCount ?? 0}</Text>
            <Text className="committee__stat-label">业委会成员</Text>
          </View>
          <View className="committee__stat-card">
            <Text className="committee__stat-value">{overview?.announcementCount ?? 0}</Text>
            <Text className="committee__stat-label">公告通知</Text>
          </View>
        </View>

        {/* Members Section — 名单默认折叠，点击标题展开，避免过长占屏 */}
        <View className="committee__section">
          <View
            className="committee__section-header-row"
            onClick={() => setMembersExpanded((v) => !v)}
          >
            <View className="committee__section-header">
              <Icon name="people" size={18} /> <Text>业委会成员</Text>
            </View>
            <View className="committee__section-toggle">
              <Text className="committee__section-toggle-text">
                {membersExpanded ? '收起' : `查看名单 (${members?.length ?? 0})`}
              </Text>
              <Text className="committee__section-toggle-arrow">{membersExpanded ? '▲' : '›'}</Text>
            </View>
          </View>

          {!membersExpanded ? (
            <View className="committee__member-preview" onClick={() => setMembersExpanded(true)}>
              {!members || members.length === 0 ? (
                <Text className="committee__member-preview-hint">暂无成员信息</Text>
              ) : (
                <>
                  <View className="committee__member-preview-avatars">
                    {members.slice(0, 4).map((m) => (
                      <View key={m.id} className="committee__member-preview-avatar">
                        <Text className="committee__member-preview-avatar-text">{m.name[0]}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="committee__member-preview-hint">
                    点击查看全部 {members.length} 位成员 ›
                  </Text>
                </>
              )}
            </View>
          ) : !members || members.length === 0 ? (
            <EmptyState icon="people" text="暂无成员信息" />
          ) : (
            members.map((member) => {
              const statusConfig =
                CLAIM_STATUS_CONFIG[member.claimStatus] ??
                CLAIM_STATUS_CONFIG[ClaimStatus.UNCLAIMED];
              return (
                <View
                  key={member.id}
                  className="committee__member-card"
                  onClick={() => handleMemberClick(member.id)}
                >
                  <View className="committee__member-avatar">
                    {member.avatarUrl ? (
                      <Text className="committee__member-avatar-emoji">{member.name[0]}</Text>
                    ) : (
                      <Text className="committee__member-avatar-emoji">{member.name[0]}</Text>
                    )}
                  </View>
                  <View className="committee__member-info">
                    <Text className="committee__member-name">{member.name}</Text>
                    <Text className="committee__member-position">{member.position}</Text>
                  </View>
                  <View
                    className="committee__member-tag"
                    style={{ backgroundColor: statusConfig.bgColor }}
                  >
                    <Text
                      className="committee__member-tag-text"
                      style={{ color: statusConfig.color }}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Announcements Section */}
        <View className="committee__section">
          <View className="committee__section-header">
            <Icon name="megaphone" size={18} /> <Text>公告通知</Text>
          </View>
          {!announcements || announcements.length === 0 ? (
            <EmptyState icon="megaphone" text="暂无公告" />
          ) : (
            announcements.map((ann) => (
              <View
                key={ann.id}
                className="committee__announcement-card"
                onClick={() => handleAnnouncementClick(ann.id)}
              >
                <View className="committee__announcement-top">
                  <Text className="committee__announcement-title">{ann.title}</Text>
                  {ann.isPinned && (
                    <View className="committee__announcement-pin">
                      <View className="committee__announcement-pin-text">
                        <Icon name="flag" size={14} /> <Text>置顶</Text>
                      </View>
                    </View>
                  )}
                </View>
                <Text className="committee__announcement-date">{formatDate(ann.publishedAt)}</Text>
              </View>
            ))
          )}
        </View>

        <View className="committee__bottom-spacer" />
      </ScrollView>
    </View>
  );
}

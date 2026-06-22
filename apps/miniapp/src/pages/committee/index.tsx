import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useRequest } from '@/hooks';
import { committeeService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import type { CommitteeMemberDto, CommitteeAnnouncementDto, PaginatedData } from '@xiaoqu-bangbang/shared';
import { ClaimStatus } from '@xiaoqu-bangbang/shared';
import './index.scss';

interface CommitteeOverviewDto {
  memberCount: number;
  announcementCount: number;
  latestAnnouncement: { id: string; title: string; publishedAt: string } | null;
}

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  [ClaimStatus.UNCLAIMED]: { label: '待认领', color: '#FF9F43', bgColor: '#FFF1DD' },
  [ClaimStatus.PENDING]: { label: '审核中', color: '#3586FF', bgColor: '#EBF2FF' },
  [ClaimStatus.CLAIMED]: { label: '已认领', color: '#4CAF82', bgColor: '#E9FFF4' },
  [ClaimStatus.REJECTED]: { label: '已拒绝', color: '#FF6B6B', bgColor: '#FFF0F0' },
};

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Committee() {
  const { data: overview, loading: overviewLoading, error: overviewError, refresh: refreshOverview } = useRequest<CommitteeOverviewDto>(
    () => committeeService.getOverview(),
  );

  const { data: membersData, loading: membersLoading, error: membersError, refresh: refreshMembers } = useRequest<PaginatedData<CommitteeMemberDto>>(
    () => committeeService.getMembers(),
  );
  const members = membersData?.items;

  const { data: announcementsData, loading: announcementsLoading, error: announcementsError, refresh: refreshAnnouncements } = useRequest<PaginatedData<CommitteeAnnouncementDto>>(
    () => committeeService.getAnnouncements(),
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
    return <Loading text='加载业委会信息...' />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  return (
    <View className='committee'>
      <ScrollView scrollY className='committee__scroll'>
        {/* Stats Header */}
        <View className='committee__stats'>
          <View className='committee__stat-card'>
            <Text className='committee__stat-value'>{overview?.memberCount ?? 0}</Text>
            <Text className='committee__stat-label'>业委会成员</Text>
          </View>
          <View className='committee__stat-card'>
            <Text className='committee__stat-value'>{overview?.announcementCount ?? 0}</Text>
            <Text className='committee__stat-label'>公告通知</Text>
          </View>
        </View>

        {/* Members Section */}
        <View className='committee__section'>
          <Text className='committee__section-header'>👥 业委会成员</Text>
          {(!members || members.length === 0) ? (
            <EmptyState icon='👥' text='暂无成员信息' />
          ) : (
            members.map((member) => {
              const statusConfig = CLAIM_STATUS_CONFIG[member.claimStatus] ?? CLAIM_STATUS_CONFIG[ClaimStatus.UNCLAIMED];
              return (
                <View
                  key={member.id}
                  className='committee__member-card'
                  onClick={() => handleMemberClick(member.id)}
                >
                  <View className='committee__member-avatar'>
                    {member.avatarUrl ? (
                      <Text className='committee__member-avatar-emoji'>{member.name[0]}</Text>
                    ) : (
                      <Text className='committee__member-avatar-emoji'>{member.name[0]}</Text>
                    )}
                  </View>
                  <View className='committee__member-info'>
                    <Text className='committee__member-name'>{member.name}</Text>
                    <Text className='committee__member-position'>{member.position}</Text>
                  </View>
                  <View
                    className='committee__member-tag'
                    style={{ backgroundColor: statusConfig.bgColor }}
                  >
                    <Text className='committee__member-tag-text' style={{ color: statusConfig.color }}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Announcements Section */}
        <View className='committee__section'>
          <Text className='committee__section-header'>📢 公告通知</Text>
          {(!announcements || announcements.length === 0) ? (
            <EmptyState icon='📢' text='暂无公告' />
          ) : (
            announcements.map((ann) => (
              <View
                key={ann.id}
                className='committee__announcement-card'
                onClick={() => handleAnnouncementClick(ann.id)}
              >
                <View className='committee__announcement-top'>
                  <Text className='committee__announcement-title'>{ann.title}</Text>
                  {ann.isPinned && (
                    <View className='committee__announcement-pin'>
                      <Text className='committee__announcement-pin-text'>📌 置顶</Text>
                    </View>
                  )}
                </View>
                <Text className='committee__announcement-date'>
                  {formatDate(ann.publishedAt)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View className='committee__bottom-spacer' />
      </ScrollView>
    </View>
  );
}

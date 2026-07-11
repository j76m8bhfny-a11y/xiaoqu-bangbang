import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCommunityStore } from '@/store';
import { voteService } from '@/services';
import { useRequest } from '@/hooks';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import { VoteType, VoteStatus } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isVoteActive(endAt: string, status: VoteStatus): boolean {
  if (status === VoteStatus.CLOSED) return false;
  return new Date(endAt).getTime() > Date.now();
}

export default function Votes() {
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  const {
    data: votesData,
    loading,
    error,
    refresh,
  } = useRequest(() => voteService.list(), [communityId], { enabled: !!communityId });
  const votes = votesData?.items;

  const handleVoteClick = (id: string) => {
    Taro.navigateTo({ url: `/pages/vote-detail/index?id=${id}` });
  };

  if (loading) {
    return <Loading text="加载投票列表..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refresh} />;
  }

  if (!votes || votes.length === 0) {
    return <EmptyState icon="vote" text="暂无投票" />;
  }

  return (
    <View className="votes">
      <View className="votes__header">
        <View className="votes__header-title">
          <Icon name="vote" size={22} /> <Text>社区投票</Text>
        </View>
        <Text className="votes__header-sub">参与投票，共建美好社区</Text>
      </View>

      <ScrollView scrollY className="votes__list">
        {votes.map((vote) => {
          const active = isVoteActive(vote.endAt, vote.status as VoteStatus);
          return (
            <View key={vote.id} className="votes__card" onClick={() => handleVoteClick(vote.id)}>
              <View className="votes__card-header">
                <Text className="votes__card-title">{vote.title}</Text>
              </View>

              <View className="votes__card-tags">
                <View className={`votes__tag votes__tag--type`}>
                  <Text className="votes__tag-text">
                    {vote.voteType === VoteType.SINGLE ? '单选' : '多选'}
                  </Text>
                </View>
                <View
                  className={`votes__tag ${active ? 'votes__tag--active' : 'votes__tag--ended'}`}
                >
                  <Text className="votes__tag-text">{active ? '进行中' : '已结束'}</Text>
                </View>
                <View className="votes__tag votes__tag--verified">
                  <Text className="votes__tag-text">仅认证用户</Text>
                </View>
              </View>

              <View className="votes__card-time">
                <Text className="votes__card-time-text">
                  {formatDate(vote.startAt)} ~ {formatDate(vote.endAt)}
                </Text>
              </View>
            </View>
          );
        })}

        <View className="votes__bottom-spacer" />
      </ScrollView>
    </View>
  );
}

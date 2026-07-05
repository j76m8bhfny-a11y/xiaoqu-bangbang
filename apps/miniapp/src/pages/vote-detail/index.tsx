import { useState, useCallback } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { useRequest } from '@/hooks';
import { voteService, shareService } from '@/services';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import { VoteType, VoteStatus, ResultVisibility } from '@xiaoqu-bangbang/shared';
import type { VoteDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

interface VoteResultOption {
  id: string;
  content: string;
  sortOrder: number;
  count: number;
  percentage: number;
}

interface VoteResultDto {
  id: string;
  title: string;
  totalVoters: number;
  options: VoteResultOption[];
}

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

function canShowResults(vote: VoteDto, voted: boolean): boolean {
  switch (vote.resultVisibility) {
    case ResultVisibility.ALWAYS:
      return true;
    case ResultVisibility.AFTER_VOTE:
      return voted;
    case ResultVisibility.AFTER_END:
      return !isVoteActive(vote.endAt, vote.status as VoteStatus);
    case ResultVisibility.ADMIN_ONLY:
      return false;
    default:
      return false;
  }
}

export default function VoteDetail() {
  const { id } = Taro.getCurrentInstance().router?.params ?? {};

  const {
    data: vote,
    loading,
    error,
    refresh,
  } = useRequest<VoteDto>(() => voteService.getById(id!), [id], { enabled: !!id });

  const { data: shareConfig } = useRequest(
    () => shareService.getCardConfig({ targetType: 'vote', targetId: id! }),
    [id],
    { enabled: !!id },
  );

  useShareAppMessage(() => {
    if (shareConfig && !shareConfig.canShare) {
      Taro.showToast({ title: shareConfig.disabledReason ?? '无法分享', icon: 'none' });
      return { title: '小区帮榜棒', path: '/pages/home/index' };
    }
    if (shareConfig) {
      return {
        title: shareConfig.title,
        path: shareConfig.path,
        imageUrl: shareConfig.imageUrl,
      };
    }
    return {
      title: vote ? `${vote.title} - 小区帮榜棒` : '小区帮榜棒',
      path: `/pages/vote-detail/index?id=${id}`,
    };
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [voted, setVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<VoteResultDto | null>(null);

  const handleToggleOption = useCallback(
    (optionId: string) => {
      if (voted) return;

      setSelectedIds((prev) => {
        if (!vote) return prev;

        if (vote.voteType === VoteType.SINGLE) {
          return prev.includes(optionId) ? [] : [optionId];
        }

        // Multiple choice
        if (prev.includes(optionId)) {
          return prev.filter((id) => id !== optionId);
        }

        const maxChoices = vote.maxChoices ?? prev.length + 1;
        if (prev.length >= maxChoices) {
          Taro.showToast({
            title: `最多选择${maxChoices}项`,
            icon: 'none',
          });
          return prev;
        }

        return [...prev, optionId];
      });
    },
    [vote, voted],
  );

  const handleSubmit = useCallback(async () => {
    if (!id || selectedIds.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      await voteService.submitVote(id, { selectedOptionIds: selectedIds });
      setVoted(true);
      Taro.showToast({ title: '投票成功', icon: 'success' });
    } catch {
      Taro.showToast({ title: '投票失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [id, selectedIds, submitting]);

  const handleShowResults = useCallback(async () => {
    if (!id) return;
    try {
      const res = await voteService.getResults(id);
      setResults(res);
      setShowResults(true);
    } catch {
      Taro.showToast({ title: '获取结果失败', icon: 'none' });
    }
  }, [id]);

  if (loading) {
    return <Loading text="加载投票详情..." />;
  }

  if (error || !vote) {
    return <ErrorState message={error?.message ?? '投票不存在'} onRetry={refresh} />;
  }

  const active = isVoteActive(vote.endAt, vote.status as VoteStatus);
  const canSubmit = !voted && active && selectedIds.length > 0;
  const shouldShowResultsBtn = voted || canShowResults(vote, voted);

  return (
    <View className="vote-detail">
      <ScrollView scrollY className="vote-detail__scroll">
        {/* 头部卡片：标签 + 标题 + 描述 + 时间 */}
        <View className="vote-detail__card vote-detail__card--first">
          <View className="vote-detail__tags">
            <View className="vote-detail__tag vote-detail__tag--type">
              <Text className="vote-detail__tag-text">
                {vote.voteType === VoteType.SINGLE ? '单选' : '多选'}
              </Text>
            </View>
            <View
              className={`vote-detail__tag ${active ? 'vote-detail__tag--active' : 'vote-detail__tag--ended'}`}
            >
              <Text className="vote-detail__tag-text">{active ? '进行中' : '已结束'}</Text>
            </View>
            <View className="vote-detail__tag vote-detail__tag--verified">
              <Text className="vote-detail__tag-text">仅认证用户</Text>
            </View>
            {voted && (
              <View className="vote-detail__tag vote-detail__tag--voted">
                <Text className="vote-detail__tag-text">已投票</Text>
              </View>
            )}
          </View>

          <Text className="vote-detail__title">{vote.title}</Text>

          {vote.description && <Text className="vote-detail__description">{vote.description}</Text>}

          <Text className="vote-detail__time-text">
            {formatDate(vote.startAt)} ~ {formatDate(vote.endAt)}
          </Text>
        </View>

        {/* 选项卡片 */}
        <View className="vote-detail__card">
          <Text className="vote-detail__options-header">
            {vote.voteType === VoteType.SINGLE
              ? '请选择一项'
              : `请选择（最多${vote.maxChoices ?? vote.options.length}项）`}
          </Text>

          {vote.options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            return (
              <View
                key={option.id}
                className={`vote-detail__option ${isSelected ? 'vote-detail__option--selected' : ''} ${voted ? 'vote-detail__option--disabled' : ''}`}
                onClick={() => handleToggleOption(option.id)}
              >
                <View
                  className={`vote-detail__indicator ${vote.voteType === VoteType.SINGLE ? 'vote-detail__indicator--radio' : 'vote-detail__indicator--checkbox'} ${isSelected ? 'vote-detail__indicator--checked' : ''}`}
                >
                  {isSelected && <Text className="vote-detail__indicator-icon">✓</Text>}
                </View>
                <Text className="vote-detail__option-text">{option.content}</Text>
              </View>
            );
          })}
        </View>

        {/* 结果卡片 */}
        {showResults && results && (
          <View className="vote-detail__card">
            <Text className="vote-detail__results-header">
              投票结果（共{results.totalVoters}人参与）
            </Text>
            {results.options.map((opt) => (
              <View key={opt.id} className="vote-detail__result-item">
                <View className="vote-detail__result-info">
                  <Text className="vote-detail__result-content">{opt.content}</Text>
                  <Text className="vote-detail__result-percent">{opt.percentage.toFixed(1)}%</Text>
                </View>
                <View className="vote-detail__result-bar-bg">
                  <View
                    className="vote-detail__result-bar-fill"
                    style={{ width: `${opt.percentage}%` }}
                  />
                </View>
                <Text className="vote-detail__result-count">{opt.count}票</Text>
              </View>
            ))}
          </View>
        )}

        <View className="vote-detail__bottom-spacer" />
      </ScrollView>

      <View className="vote-detail__action-bar">
        {canSubmit && (
          <View
            className={`vote-detail__submit-btn ${submitting ? 'vote-detail__submit-btn--disabled' : ''}`}
            onClick={submitting ? undefined : handleSubmit}
          >
            <Text className="vote-detail__submit-btn-text">
              {submitting ? '提交中...' : '提交投票'}
            </Text>
          </View>
        )}

        {shouldShowResultsBtn && !showResults && (
          <View className="vote-detail__results-btn" onClick={handleShowResults}>
            <Text className="vote-detail__results-btn-text">查看结果</Text>
          </View>
        )}

        {voted && !canSubmit && !shouldShowResultsBtn && (
          <View className="vote-detail__voted-badge">
            <Text className="vote-detail__voted-badge-text">已完成投票</Text>
          </View>
        )}
      </View>
    </View>
  );
}

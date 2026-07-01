import { View, Text, Input, Textarea } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { topicService } from '@/services';
import { useCommunityStore } from '@/store';
import UnverifiedFormBanner from '@/components/unverified-form-banner';
import './index.scss';

// 发起议题页。议题独立于 event 表，后端 POST /topics 仅接收 { title, description? }，
// 并由 VerifiedMemberGuard 要求已认证成员。补齐 plaza「发议题」入口（原为占位 toast）。

const TITLE_MAX = 50;
const DESC_MAX = 500;

export default function TopicCreate() {
  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请填写议题标题', icon: 'none' });
      return;
    }
    if (!communityId) {
      Taro.showToast({ title: '请先选择小区', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await topicService.create({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      Taro.showToast({ title: '议题已发起', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (err) {
      // 后端 40302 = 需完成业主认证；其余按后端 message 透传。
      const message = err instanceof Error ? err.message : '发起失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="topic-create">
      <UnverifiedFormBanner tip="你尚未完成业主认证，认证后才能发起议题" />

      <View className="topic-create__field">
        <Text className="topic-create__label">议题标题</Text>
        <Input
          className="topic-create__input"
          placeholder="一句话说清你想讨论的事"
          maxlength={TITLE_MAX}
          value={title}
          onInput={(e) => setTitle(e.detail.value)}
        />
        <Text className="topic-create__counter">
          {title.length}/{TITLE_MAX}
        </Text>
      </View>

      <View className="topic-create__field">
        <Text className="topic-create__label">议题描述（选填）</Text>
        <Textarea
          className="topic-create__textarea"
          placeholder="补充背景、诉求或希望邻居一起讨论的问题"
          maxlength={DESC_MAX}
          value={description}
          onInput={(e) => setDescription(e.detail.value)}
        />
        <Text className="topic-create__counter">
          {description.length}/{DESC_MAX}
        </Text>
      </View>

      <View
        className={`topic-create__submit ${submitting ? 'topic-create__submit--disabled' : ''}`}
        onClick={submitting ? undefined : handleSubmit}
      >
        <Text className="topic-create__submit-text">{submitting ? '发起中…' : '发起议题'}</Text>
      </View>
    </View>
  );
}

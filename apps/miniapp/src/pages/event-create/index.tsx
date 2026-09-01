import { View, Text, Input, Textarea, Switch } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro from '@tarojs/taro';
import { eventService, topicService } from '@/services';
import { useAuthStore, useCommunityStore } from '@/store';
import { useDraft } from '@/hooks';
import { EventType, RewardType } from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_CONFIG } from '@/utils/mappers';
import ImagePicker from '@/components/image-picker';
import UnverifiedFormBanner from '@/components/unverified-form-banner';
import NavBar from '@/components/navbar';
import './index.scss';
import Icon from '@/components/icon';

const REWARD_OPTIONS: { key: RewardType; label: string }[] = [
  { key: RewardType.FREE, label: '免费' },
  { key: RewardType.NEGOTIABLE, label: '协商' },
  { key: RewardType.PAID, label: '有偿' },
];

const TOPIC_TYPES: EventType[] = [EventType.PUBLIC_FEEDBACK, EventType.DISCUSSION];

export default function EventCreate() {
  const routerParams = Taro.getCurrentInstance().router?.params;
  const preselectedType = (routerParams?.type ?? 'help_request') as EventType;
  const preselectedTopicId = routerParams?.topicId;
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  const typeConfig = EVENT_TYPE_CONFIG[preselectedType] ?? EVENT_TYPE_CONFIG.help_request;
  const isTopicType = TOPIC_TYPES.includes(preselectedType);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [expectedTime, setExpectedTime] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>(RewardType.FREE);
  const [rewardAmount, setRewardAmount] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 议题相关状态
  const [topicId, setTopicId] = useState<string>(preselectedTopicId ?? '');
  const [suggestions, setSuggestions] = useState<{ topicId: string; title: string }[]>([]);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const debounceRef = useRef<any>(null);

  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);

  // 草稿恢复：挂载时检查是否有未提交的草稿
  const [draftReady, setDraftReady] = useState(false);
  const draftState = {
    title,
    description,
    locationText,
    expectedTime,
    rewardType,
    rewardAmount,
    capacity,
    isAnonymous,
    images,
    topicId,
  };
  const { restore, clear, has } = useDraft('event_create', draftState, { enabled: draftReady });

  useEffect(() => {
    if (!has()) {
      setDraftReady(true);
      return;
    }
    Taro.showModal({
      title: '恢复草稿？',
      content: '上次填写的互助内容未提交，是否恢复？',
      confirmText: '恢复',
      cancelText: '丢弃',
      success: (res) => {
        if (res.confirm) {
          const d = restore();
          if (d) {
            setTitle(d.title ?? '');
            setDescription(d.description ?? '');
            setLocationText(d.locationText ?? '');
            setExpectedTime(d.expectedTime ?? '');
            setRewardType(d.rewardType ?? RewardType.FREE);
            setRewardAmount(d.rewardAmount ?? '');
            setCapacity(d.capacity ?? '');
            setIsAnonymous(d.isAnonymous ?? false);
            setImages(Array.isArray(d.images) ? d.images : []);
            if (!preselectedTopicId) setTopicId(d.topicId ?? '');
          }
        } else {
          clear();
        }
        setDraftReady(true);
      },
      fail: () => setDraftReady(true),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 标题/描述变化时 debounce 获取议题推荐
  useEffect(() => {
    if (!isTopicType || preselectedTopicId || !title.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await topicService.suggestTopics(title.trim(), description.trim());
        setSuggestions(res.items ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 500);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [title, description, isTopicType, preselectedTopicId]);

  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim()) {
      Taro.showToast({ title: '请输入议题标题', icon: 'none' });
      return;
    }
    try {
      const topic = await topicService.create({ title: newTopicTitle.trim() });
      setTopicId(topic.id);
      setCreatingTopic(false);
      Taro.showToast({ title: '议题已创建', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e.message || '创建失败', icon: 'none' });
    }
  };

  const handleSubmit = async () => {
    if (verifyStatus !== 'verified') {
      Taro.showModal({
        title: '需要业主认证',
        content: '完成业主认证后才能发布互助内容，是否前往认证？',
        confirmText: '去认证',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/verify/index' });
        },
      });
      return;
    }
    if (!title.trim()) {
      Taro.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请填写描述', icon: 'none' });
      return;
    }
    if (!communityId) {
      Taro.showToast({ title: '请先选择小区', icon: 'none' });
      return;
    }
    if (isTopicType && !topicId) {
      Taro.showToast({ title: '请选择或创建议题', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await eventService.create({
        type: preselectedType,
        title: title.trim(),
        description: description.trim(),
        images,
        locationText: locationText.trim() || undefined,
        expectedTime: expectedTime.trim() || undefined,
        rewardType,
        rewardAmount: rewardType === RewardType.PAID && rewardAmount ? Number(rewardAmount) : null,
        capacity: capacity ? Number(capacity) : null,
        isAnonymous,
        topicId: isTopicType ? topicId : undefined,
      });
      clear();
      Taro.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '发布失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="event-create">
      <NavBar title="发布求助" />
      <UnverifiedFormBanner tip="你尚未完成业主认证，无法发布互助内容" />
      <View className="event-create__body">
        <View className="event-create__card">
          <View className="event-create__field">
            <Text className="event-create__label">事件类型</Text>
            <View className="event-create__type-badge" style={{ background: typeConfig.bgColor }}>
              <Text className="event-create__type-text" style={{ color: typeConfig.color }}>
                {typeConfig.label}
              </Text>
            </View>
          </View>

          <View className="event-create__field">
            <Text className="event-create__label">
              标题 <Text className="event-create__required">*</Text>
            </Text>
            <Input
              className="event-create__input"
              placeholder="请输入标题"
              placeholderClass="event-create__placeholder"
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={50}
            />
          </View>

          <View className="event-create__field">
            <Text className="event-create__label">
              详细描述 <Text className="event-create__required">*</Text>
            </Text>
            <Textarea
              className="event-create__textarea"
              placeholder="请详细描述你的需求..."
              placeholderClass="event-create__placeholder"
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={500}
              autoHeight
            />
          </View>

          {isTopicType && (
            <View className="event-create__field">
              <Text className="event-create__label">
                议题归属 <Text className="event-create__required">*</Text>
              </Text>
              {topicId ? (
                <View
                  className="event-create__radio event-create__radio--active"
                  style={{ width: '100%' }}
                >
                  <Text className="event-create__radio-text event-create__radio-text--active">
                    <Icon name="check" size={16} color="#5B9E6F" /> 已选议题{' '}
                    {preselectedTopicId ? '（从详情页带入）' : ''}
                  </Text>
                  {!preselectedTopicId && (
                    <Text
                      style={{ marginLeft: '12px', color: '#5b9e6f', fontSize: '12px' }}
                      onClick={() => setTopicId('')}
                    >
                      重选
                    </Text>
                  )}
                </View>
              ) : (
                <View>
                  {title.trim() && suggestions.length > 0 && (
                    <View style={{ marginBottom: '8px' }}>
                      <Text style={{ fontSize: '12px', color: '#5b9e6f' }}>
                        <Icon name="robot" size={14} /> 推荐议题：
                      </Text>
                      {suggestions.map((s) => (
                        <View
                          key={s.topicId}
                          className="event-create__radio"
                          style={{ width: '100%', marginTop: '4px' }}
                          onClick={() => setTopicId(s.topicId)}
                        >
                          <Text className="event-create__radio-text">{s.title}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {creatingTopic ? (
                    <View>
                      <Input
                        className="event-create__input"
                        placeholder="输入新议题标题"
                        value={newTopicTitle}
                        onInput={(e) => setNewTopicTitle(e.detail.value)}
                        maxlength={80}
                      />
                      <View style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <View
                          className="event-create__radio event-create__radio--active"
                          onClick={handleCreateTopic}
                        >
                          <Text className="event-create__radio-text event-create__radio-text--active">
                            确认创建
                          </Text>
                        </View>
                        <View
                          className="event-create__radio"
                          onClick={() => setCreatingTopic(false)}
                        >
                          <Text className="event-create__radio-text">取消</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View
                      className="event-create__radio"
                      style={{ width: '100%' }}
                      onClick={() => setCreatingTopic(true)}
                    >
                      <Text className="event-create__radio-text">+ 创建新议题</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View className="event-create__field">
            <Text className="event-create__label">图片</Text>
            <ImagePicker images={images} onChange={setImages} />
          </View>

          <View className="event-create__field">
            <Text className="event-create__label">地点</Text>
            <Input
              className="event-create__input"
              placeholder="如：3栋楼下、小区门口"
              placeholderClass="event-create__placeholder"
              value={locationText}
              onInput={(e) => setLocationText(e.detail.value)}
            />
          </View>

          <View className="event-create__field">
            <Text className="event-create__label">期望时间</Text>
            <Input
              className="event-create__input"
              placeholder="如：本周六下午、明天上午"
              placeholderClass="event-create__placeholder"
              value={expectedTime}
              onInput={(e) => setExpectedTime(e.detail.value)}
            />
          </View>

          <View className="event-create__field">
            <Text className="event-create__label">奖励方式</Text>
            <View className="event-create__radio-group">
              {REWARD_OPTIONS.map((opt) => (
                <View
                  key={opt.key}
                  className={`event-create__radio ${rewardType === opt.key ? 'event-create__radio--active' : ''}`}
                  onClick={() => setRewardType(opt.key)}
                >
                  <Text
                    className={`event-create__radio-text ${rewardType === opt.key ? 'event-create__radio-text--active' : ''}`}
                  >
                    {opt.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {rewardType === RewardType.PAID && (
            <View className="event-create__field">
              <Text className="event-create__label">奖励金额</Text>
              <Input
                className="event-create__input"
                type="digit"
                placeholder="请输入金额"
                placeholderClass="event-create__placeholder"
                value={rewardAmount}
                onInput={(e) => setRewardAmount(e.detail.value)}
              />
            </View>
          )}

          <View className="event-create__field">
            <Text className="event-create__label">人数上限</Text>
            <Input
              className="event-create__input"
              type="number"
              placeholder="不填则不限人数"
              placeholderClass="event-create__placeholder"
              value={capacity}
              onInput={(e) => setCapacity(e.detail.value)}
            />
          </View>

          <View className="event-create__field event-create__field--switch">
            <Text className="event-create__label">匿名发布</Text>
            <Switch
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.detail.value)}
              color="#5b9e6f"
            />
          </View>
        </View>
      </View>

      <View className="event-create__footer">
        <View
          className={`event-create__submit ${submitting ? 'event-create__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className="event-create__submit-text">{submitting ? '发布中...' : '发布'}</Text>
        </View>
      </View>
    </View>
  );
}

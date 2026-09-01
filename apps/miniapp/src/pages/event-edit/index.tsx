import { View, Text, Input, Textarea, Switch } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useRequest } from '@/hooks';
import { eventService } from '@/services';
import { useAuthStore } from '@/store';
import { RewardType } from '@xiaoqu-bangbang/shared';
import type { EventDto } from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_CONFIG } from '@/utils/mappers';
import ImagePicker from '@/components/image-picker';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import NavBar from '@/components/navbar';
import './index.scss';

const REWARD_OPTIONS: { key: RewardType; label: string }[] = [
  { key: RewardType.FREE, label: '免费' },
  { key: RewardType.NEGOTIABLE, label: '协商' },
  { key: RewardType.PAID, label: '有偿' },
];

export default function EventEdit() {
  const id = Taro.getCurrentInstance().router?.params?.id;
  const user = useAuthStore((s) => s.user);

  const {
    data: event,
    loading,
    error,
    refresh,
  } = useRequest<EventDto>(() => eventService.getById(id!), [id], { enabled: !!id });

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

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setLocationText(event.locationText ?? '');
      setExpectedTime(event.expectedTime ?? '');
      setRewardType(event.rewardType);
      setRewardAmount(event.rewardAmount != null ? String(event.rewardAmount) : '');
      // ponytail: capacity 未在 EventDto 暴露，编辑态暂不回填；下迭代恢复。
      setCapacity('');
      setIsAnonymous(event.isAnonymous);
      setImages(event.images ?? []);
    }
  }, [event]);

  if (loading) {
    return <Loading text="加载事件..." />;
  }

  if (error || !event) {
    return <ErrorState message={error?.message ?? '事件不存在'} onRetry={refresh} />;
  }

  if (user && event.creatorId !== user.id) {
    Taro.showToast({ title: '无权编辑此事件', icon: 'none' });
    setTimeout(() => Taro.navigateBack(), 1500);
    return null;
  }

  const typeConfig = EVENT_TYPE_CONFIG[event.type] ?? EVENT_TYPE_CONFIG.help_request;

  const handleSubmit = async () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请填写描述', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await eventService.update(id!, {
        title: title.trim(),
        description: description.trim(),
        images,
        locationText: locationText.trim() || undefined,
        expectedTime: expectedTime.trim() || undefined,
        rewardType,
        rewardAmount: rewardType === RewardType.PAID && rewardAmount ? Number(rewardAmount) : null,
        capacity: capacity ? Number(capacity) : null,
        isAnonymous,
      });
      Taro.showToast({ title: '修改成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '修改失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="event-edit">
      <NavBar title="编辑互助" />
      <View className="event-edit__body">
        <View className="event-edit__card">
          <View className="event-edit__field">
            <Text className="event-edit__label">事件类型</Text>
            <View className="event-edit__type-badge" style={{ background: typeConfig.bgColor }}>
              <Text className="event-edit__type-text" style={{ color: typeConfig.color }}>
                {typeConfig.label}
              </Text>
            </View>
          </View>

          <View className="event-edit__field">
            <Text className="event-edit__label">
              标题 <Text className="event-edit__required">*</Text>
            </Text>
            <Input
              className="event-edit__input"
              placeholder="请输入标题"
              placeholderClass="event-edit__placeholder"
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={50}
            />
          </View>

          <View className="event-edit__field">
            <Text className="event-edit__label">
              详细描述 <Text className="event-edit__required">*</Text>
            </Text>
            <Textarea
              className="event-edit__textarea"
              placeholder="请详细描述你的需求..."
              placeholderClass="event-edit__placeholder"
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={500}
              autoHeight
            />
          </View>

          <View className="event-edit__field">
            <Text className="event-edit__label">图片</Text>
            <ImagePicker images={images} onChange={setImages} />
          </View>

          <View className="event-edit__field">
            <Text className="event-edit__label">地点</Text>
            <Input
              className="event-edit__input"
              placeholder="如：3栋楼下、小区门口"
              placeholderClass="event-edit__placeholder"
              value={locationText}
              onInput={(e) => setLocationText(e.detail.value)}
            />
          </View>

          <View className="event-edit__field">
            <Text className="event-edit__label">期望时间</Text>
            <Input
              className="event-edit__input"
              placeholder="如：本周六下午、明天上午"
              placeholderClass="event-edit__placeholder"
              value={expectedTime}
              onInput={(e) => setExpectedTime(e.detail.value)}
            />
          </View>

          <View className="event-edit__field">
            <Text className="event-edit__label">奖励方式</Text>
            <View className="event-edit__radio-group">
              {REWARD_OPTIONS.map((opt) => (
                <View
                  key={opt.key}
                  className={`event-edit__radio ${rewardType === opt.key ? 'event-edit__radio--active' : ''}`}
                  onClick={() => setRewardType(opt.key)}
                >
                  <Text
                    className={`event-edit__radio-text ${rewardType === opt.key ? 'event-edit__radio-text--active' : ''}`}
                  >
                    {opt.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {rewardType === RewardType.PAID && (
            <View className="event-edit__field">
              <Text className="event-edit__label">奖励金额</Text>
              <Input
                className="event-edit__input"
                type="digit"
                placeholder="请输入金额"
                placeholderClass="event-edit__placeholder"
                value={rewardAmount}
                onInput={(e) => setRewardAmount(e.detail.value)}
              />
            </View>
          )}

          <View className="event-edit__field">
            <Text className="event-edit__label">人数上限</Text>
            <Input
              className="event-edit__input"
              type="number"
              placeholder="不填则不限人数"
              placeholderClass="event-edit__placeholder"
              value={capacity}
              onInput={(e) => setCapacity(e.detail.value)}
            />
          </View>

          <View className="event-edit__field event-edit__field--switch">
            <Text className="event-edit__label">匿名发布</Text>
            <Switch
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.detail.value)}
              color="#5b9e6f"
            />
          </View>
        </View>
      </View>

      <View className="event-edit__footer">
        <View
          className={`event-edit__submit ${submitting ? 'event-edit__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className="event-edit__submit-text">{submitting ? '保存中...' : '保存修改'}</Text>
        </View>
      </View>
    </View>
  );
}

import { View, Text, Input, Textarea, Switch } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { eventService } from '@/services';
import { useCommunityStore } from '@/store';
import { EventType, RewardType } from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_CONFIG } from '@/utils/mappers';
import ImagePicker from '@/components/image-picker';
import './index.scss';

const REWARD_OPTIONS: { key: RewardType; label: string }[] = [
  { key: RewardType.FREE, label: '免费' },
  { key: RewardType.NEGOTIABLE, label: '协商' },
  { key: RewardType.PAID, label: '有偿' },
];

export default function EventCreate() {
  const preselectedType = (Taro.getCurrentInstance().router?.params?.type ?? 'help_request') as EventType;
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  const typeConfig = EVENT_TYPE_CONFIG[preselectedType] ?? EVENT_TYPE_CONFIG.help_request;

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

  const handleSubmit = async () => {
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
      });
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
    <View className='event-create'>
      <View className='event-create__body'>
        <View className='event-create__card'>
          <View className='event-create__field'>
            <Text className='event-create__label'>事件类型</Text>
            <View
              className='event-create__type-badge'
              style={{ background: typeConfig.bgColor }}
            >
              <Text className='event-create__type-text' style={{ color: typeConfig.color }}>
                {typeConfig.label}
              </Text>
            </View>
          </View>

          <View className='event-create__field'>
            <Text className='event-create__label'>标题 <Text className='event-create__required'>*</Text></Text>
            <Input
              className='event-create__input'
              placeholder='请输入标题'
              placeholderClass='event-create__placeholder'
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={50}
            />
          </View>

          <View className='event-create__field'>
            <Text className='event-create__label'>详细描述 <Text className='event-create__required'>*</Text></Text>
            <Textarea
              className='event-create__textarea'
              placeholder='请详细描述你的需求...'
              placeholderClass='event-create__placeholder'
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={500}
              autoHeight
            />
          </View>

          <View className='event-create__field'>
            <Text className='event-create__label'>图片</Text>
            <ImagePicker images={images} onChange={setImages} />
          </View>

          <View className='event-create__field'>
            <Text className='event-create__label'>地点</Text>
            <Input
              className='event-create__input'
              placeholder='如：3栋楼下、小区门口'
              placeholderClass='event-create__placeholder'
              value={locationText}
              onInput={(e) => setLocationText(e.detail.value)}
            />
          </View>

          <View className='event-create__field'>
            <Text className='event-create__label'>期望时间</Text>
            <Input
              className='event-create__input'
              placeholder='如：本周六下午、明天上午'
              placeholderClass='event-create__placeholder'
              value={expectedTime}
              onInput={(e) => setExpectedTime(e.detail.value)}
            />
          </View>

          <View className='event-create__field'>
            <Text className='event-create__label'>奖励方式</Text>
            <View className='event-create__radio-group'>
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
            <View className='event-create__field'>
              <Text className='event-create__label'>奖励金额</Text>
              <Input
                className='event-create__input'
                type='digit'
                placeholder='请输入金额'
                placeholderClass='event-create__placeholder'
                value={rewardAmount}
                onInput={(e) => setRewardAmount(e.detail.value)}
              />
            </View>
          )}

          <View className='event-create__field'>
            <Text className='event-create__label'>人数上限</Text>
            <Input
              className='event-create__input'
              type='number'
              placeholder='不填则不限人数'
              placeholderClass='event-create__placeholder'
              value={capacity}
              onInput={(e) => setCapacity(e.detail.value)}
            />
          </View>

          <View className='event-create__field event-create__field--switch'>
            <Text className='event-create__label'>匿名发布</Text>
            <Switch
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.detail.value)}
              color='#35e89a'
            />
          </View>
        </View>
      </View>

      <View className='event-create__footer'>
        <View
          className={`event-create__submit ${submitting ? 'event-create__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className='event-create__submit-text'>
            {submitting ? '发布中...' : '发布'}
          </Text>
        </View>
      </View>
    </View>
  );
}

import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { marketService } from '@/services';
import { useCommunityStore } from '@/store';
import { MarketCategory, TradeType, ConditionLevel } from '@xiaoqu-bangbang/shared';
import { MARKET_CATEGORY_CONFIG, CONDITION_LABELS } from '@/utils/mappers';
import ImagePicker from '@/components/image-picker';
import './index.scss';

const TRADE_OPTIONS: { key: TradeType; label: string }[] = [
  { key: TradeType.SELL, label: '出售' },
  { key: TradeType.FREE, label: '免费' },
  { key: TradeType.EXCHANGE, label: '交换' },
];

const CONDITION_OPTIONS: { key: ConditionLevel }[] = [
  { key: ConditionLevel.NEW },
  { key: ConditionLevel.LIKE_NEW },
  { key: ConditionLevel.GOOD },
  { key: ConditionLevel.USED },
  { key: ConditionLevel.OLD },
];

export default function MarketCreate() {
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  const [category, setCategory] = useState<MarketCategory>(MarketCategory.OTHER);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>(TradeType.SELL);
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>(ConditionLevel.GOOD);
  const [contactText, setContactText] = useState('');
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
      await marketService.create({
        category,
        title: title.trim(),
        description: description.trim(),
        images,
        price: price ? Number(price) : null,
        tradeType,
        conditionLevel,
        contactText: contactText.trim() || undefined,
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
    <View className='market-create'>
      <View className='market-create__body'>
        <View className='market-create__card'>
          <View className='market-create__field'>
            <Text className='market-create__label'>分类 <Text className='market-create__required'>*</Text></Text>
            <ScrollView scrollX className='market-create__category-scroll'>
              <View className='market-create__category-list'>
                {Object.entries(MARKET_CATEGORY_CONFIG).map(([key, cfg]) => (
                  <View
                    key={key}
                    className={`market-create__category-item ${category === key ? 'market-create__category-item--active' : ''}`}
                    onClick={() => setCategory(key as MarketCategory)}
                  >
                    <Text className='market-create__category-icon'>{cfg.icon}</Text>
                    <Text className={`market-create__category-label ${category === key ? 'market-create__category-label--active' : ''}`}>
                      {cfg.label}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>标题 <Text className='market-create__required'>*</Text></Text>
            <Input
              className='market-create__input'
              placeholder='请输入物品标题'
              placeholderClass='market-create__placeholder'
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={30}
            />
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>详细描述 <Text className='market-create__required'>*</Text></Text>
            <Textarea
              className='market-create__textarea'
              placeholder='请描述物品详情、使用情况等...'
              placeholderClass='market-create__placeholder'
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={500}
              autoHeight
            />
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>图片</Text>
            <ImagePicker images={images} onChange={setImages} />
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>价格</Text>
            <Input
              className='market-create__input'
              type='digit'
              placeholder='请输入价格，免费可不填'
              placeholderClass='market-create__placeholder'
              value={price}
              onInput={(e) => setPrice(e.detail.value)}
            />
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>交易方式</Text>
            <View className='market-create__radio-group'>
              {TRADE_OPTIONS.map((opt) => (
                <View
                  key={opt.key}
                  className={`market-create__radio ${tradeType === opt.key ? 'market-create__radio--active' : ''}`}
                  onClick={() => setTradeType(opt.key)}
                >
                  <Text
                    className={`market-create__radio-text ${tradeType === opt.key ? 'market-create__radio-text--active' : ''}`}
                  >
                    {opt.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>成色</Text>
            <View className='market-create__condition-group'>
              {CONDITION_OPTIONS.map((opt) => {
                const cfg = CONDITION_LABELS[opt.key];
                const isActive = conditionLevel === opt.key;
                return (
                  <View
                    key={opt.key}
                    className={`market-create__condition ${isActive ? 'market-create__condition--active' : ''}`}
                    style={isActive ? { background: cfg.color + '1a', borderColor: cfg.color } : undefined}
                    onClick={() => setConditionLevel(opt.key)}
                  >
                    <Text
                      className={`market-create__condition-text ${isActive ? 'market-create__condition-text--active' : ''}`}
                      style={isActive ? { color: cfg.color } : undefined}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className='market-create__field'>
            <Text className='market-create__label'>联系方式</Text>
            <Input
              className='market-create__input'
              placeholder='微信号/手机号（选填）'
              placeholderClass='market-create__placeholder'
              value={contactText}
              onInput={(e) => setContactText(e.detail.value)}
            />
          </View>
        </View>
      </View>

      <View className='market-create__footer'>
        <View
          className={`market-create__submit ${submitting ? 'market-create__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className='market-create__submit-text'>
            {submitting ? '发布中...' : '发布'}
          </Text>
        </View>
      </View>
    </View>
  );
}

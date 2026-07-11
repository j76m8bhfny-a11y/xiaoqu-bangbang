import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useRequest } from '@/hooks';
import { marketService } from '@/services';
import { useAuthStore } from '@/store';
import { MarketCategory, TradeType, ConditionLevel } from '@xiaoqu-bangbang/shared';
import type { MarketItemDto } from '@xiaoqu-bangbang/shared';
import { MARKET_CATEGORY_CONFIG, CONDITION_LABELS } from '@/utils/mappers';
import ImagePicker from '@/components/image-picker';
import ErrorState from '@/components/error-state';
import './index.scss';
import Icon from '@/components/icon';

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

export default function MarketEdit() {
  const id = Taro.getCurrentInstance().router?.params?.id;
  const user = useAuthStore((s) => s.user);

  const {
    data: item,
    loading,
    error,
    refresh,
  } = useRequest<MarketItemDto>(() => marketService.getById(id!), [id], { enabled: !!id });

  const [category, setCategory] = useState<MarketCategory>(MarketCategory.OTHER);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tradeType, setTradeType] = useState<TradeType>(TradeType.SELL);
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>(ConditionLevel.GOOD);
  const [contactText, setContactText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (item && !initialized) {
      setCategory(item.category);
      setTitle(item.title);
      setDescription(item.description);
      setPrice(item.price != null ? String(item.price) : '');
      setTradeType(item.tradeType);
      setConditionLevel(item.conditionLevel);
      setContactText(item.contactText ?? '');
      setImages(item.images ?? []);
      setInitialized(true);
    }
  }, [item, initialized]);

  if (loading) {
    return (
      <View className="market-edit">
        <View className="market-edit__body">
          <View className="market-edit__loading">
            <Text className="market-edit__loading-text">加载中...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View className="market-edit">
        <View className="market-edit__body">
          <ErrorState message="加载失败" onRetry={refresh} />
        </View>
      </View>
    );
  }

  // Guard: only the seller can edit
  if (user && item.sellerId !== user.id) {
    return (
      <View className="market-edit">
        <View className="market-edit__body">
          <ErrorState message="无权编辑此商品" />
        </View>
      </View>
    );
  }

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
      await marketService.update(id!, {
        category,
        title: title.trim(),
        description: description.trim(),
        images,
        price: price ? Number(price) : null,
        tradeType,
        conditionLevel,
        contactText: contactText.trim() || undefined,
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
    <View className="market-edit">
      <View className="market-edit__body">
        <View className="market-edit__card">
          <View className="market-edit__field">
            <Text className="market-edit__label">
              分类 <Text className="market-edit__required">*</Text>
            </Text>
            <ScrollView scrollX className="market-edit__category-scroll">
              <View className="market-edit__category-list">
                {Object.entries(MARKET_CATEGORY_CONFIG).map(([key, cfg]) => (
                  <View
                    key={key}
                    className={`market-edit__category-item ${category === key ? 'market-edit__category-item--active' : ''}`}
                    onClick={() => setCategory(key as MarketCategory)}
                  >
                    <View className="market-edit__category-icon">
                      <Icon name={cfg.icon as any} size={24} />
                    </View>
                    <Text
                      className={`market-edit__category-label ${category === key ? 'market-edit__category-label--active' : ''}`}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">
              标题 <Text className="market-edit__required">*</Text>
            </Text>
            <Input
              className="market-edit__input"
              placeholder="请输入物品标题"
              placeholderClass="market-edit__placeholder"
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={30}
            />
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">
              详细描述 <Text className="market-edit__required">*</Text>
            </Text>
            <Textarea
              className="market-edit__textarea"
              placeholder="请描述物品详情、使用情况等..."
              placeholderClass="market-edit__placeholder"
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={500}
              autoHeight
            />
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">图片</Text>
            <ImagePicker images={images} onChange={setImages} />
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">价格</Text>
            <Input
              className="market-edit__input"
              type="digit"
              placeholder="请输入价格，免费可不填"
              placeholderClass="market-edit__placeholder"
              value={price}
              onInput={(e) => setPrice(e.detail.value)}
            />
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">交易方式</Text>
            <View className="market-edit__radio-group">
              {TRADE_OPTIONS.map((opt) => (
                <View
                  key={opt.key}
                  className={`market-edit__radio ${tradeType === opt.key ? 'market-edit__radio--active' : ''}`}
                  onClick={() => setTradeType(opt.key)}
                >
                  <Text
                    className={`market-edit__radio-text ${tradeType === opt.key ? 'market-edit__radio-text--active' : ''}`}
                  >
                    {opt.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">成色</Text>
            <View className="market-edit__condition-group">
              {CONDITION_OPTIONS.map((opt) => {
                const cfg = CONDITION_LABELS[opt.key];
                const isActive = conditionLevel === opt.key;
                return (
                  <View
                    key={opt.key}
                    className={`market-edit__condition ${isActive ? 'market-edit__condition--active' : ''}`}
                    style={
                      isActive
                        ? { background: cfg.color + '1a', borderColor: cfg.color }
                        : undefined
                    }
                    onClick={() => setConditionLevel(opt.key)}
                  >
                    <Text
                      className={`market-edit__condition-text ${isActive ? 'market-edit__condition-text--active' : ''}`}
                      style={isActive ? { color: cfg.color } : undefined}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="market-edit__field">
            <Text className="market-edit__label">联系方式</Text>
            <Input
              className="market-edit__input"
              placeholder="微信号/手机号（选填）"
              placeholderClass="market-edit__placeholder"
              value={contactText}
              onInput={(e) => setContactText(e.detail.value)}
            />
          </View>
        </View>
      </View>

      <View className="market-edit__footer">
        <View
          className={`market-edit__submit ${submitting ? 'market-edit__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className="market-edit__submit-text">{submitting ? '保存中...' : '保存修改'}</Text>
        </View>
      </View>
    </View>
  );
}

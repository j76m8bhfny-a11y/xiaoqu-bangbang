import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Textarea, Radio, RadioGroup, Label, Button } from '@tarojs/components';
import { groupBuyService } from '@/services';
import './index.scss';

const GroupBuyCreate = () => {
  const type = Taro.getCurrentInstance().router?.params?.type || 'seek';
  const [form, setForm] = useState<any>({
    location: '',
    deliveryMethod: 'self_pickup',
    note: '',
    items: type === 'seek' ? [{ name: '', qty: 1, note: '' }] : [],
    departAt: '',
    bidCloseAt: '',
    quota: 5,
  });

  const setField = (name: string, value: any) => setForm({ ...form, [name]: value });

  const handleSubmit = async () => {
    if (!form.location) {
      Taro.showToast({ title: '请选择采购地点', icon: 'none' });
      return;
    }
    if (
      type === 'seek' &&
      (!form.items || form.items.length === 0 || form.items.some((i: any) => !i.name))
    ) {
      Taro.showToast({ title: '请填写商品名', icon: 'none' });
      return;
    }
    if (type === 'offer') {
      if (!form.departAt || !form.bidCloseAt || !form.quota) {
        Taro.showToast({ title: '请填写出发时间/截止时间/名额', icon: 'none' });
        return;
      }
    }
    try {
      await groupBuyService.create({ type, ...form });
      Taro.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '发布失败', icon: 'none' });
    }
  };

  return (
    <View className="gb-create">
      <View className="form">
        <View className="form-item">
          <Text className="label">采购地点 *</Text>
          <RadioGroup onChange={(e) => setField('location', e.detail.value)}>
            <Label className="radio-label">
              <Radio value="山姆" />
              山姆
            </Label>
            <Label className="radio-label">
              <Radio value="Costco" />
              Costco
            </Label>
            <Label className="radio-label">
              <Radio value="其他" />
              其他
            </Label>
          </RadioGroup>
        </View>

        {type === 'seek' && (
          <View className="form-item">
            <Text className="label">商品清单 *</Text>
            {form.items.map((it: any, idx: number) => (
              <View key={idx} className="item-row">
                <Input
                  className="item-name"
                  placeholder="商品名"
                  value={it.name}
                  onInput={(e) => {
                    const items = [...form.items];
                    items[idx] = { ...it, name: e.detail.value };
                    setField('items', items);
                  }}
                />
                <Input
                  className="item-qty"
                  type="number"
                  placeholder="数量"
                  value={String(it.qty)}
                  onInput={(e) => {
                    const items = [...form.items];
                    items[idx] = { ...it, qty: Number(e.detail.value) };
                    setField('items', items);
                  }}
                />
                <Button
                  size="mini"
                  onClick={() =>
                    setField(
                      'items',
                      form.items.filter((_: any, i: number) => i !== idx),
                    )
                  }
                >
                  删除
                </Button>
              </View>
            ))}
            <Button
              size="mini"
              onClick={() => setField('items', [...form.items, { name: '', qty: 1, note: '' }])}
            >
              + 添加商品
            </Button>
          </View>
        )}

        {type === 'offer' && (
          <>
            <View className="form-item">
              <Text className="label">出发时间 *</Text>
              <Input
                placeholder="2026-08-01 10:00"
                value={form.departAt}
                onInput={(e) => setField('departAt', e.detail.value)}
              />
            </View>
            <View className="form-item">
              <Text className="label">截止接单时间 *</Text>
              <Input
                placeholder="2026-07-31 20:00"
                value={form.bidCloseAt}
                onInput={(e) => setField('bidCloseAt', e.detail.value)}
              />
            </View>
            <View className="form-item">
              <Text className="label">名额 *</Text>
              <Input
                type="number"
                placeholder="5"
                value={String(form.quota)}
                onInput={(e) => setField('quota', Number(e.detail.value))}
              />
            </View>
          </>
        )}

        <View className="form-item">
          <Text className="label">交付方式 *</Text>
          <RadioGroup onChange={(e) => setField('deliveryMethod', e.detail.value)}>
            <Label className="radio-label">
              <Radio value="self_pickup" checked={form.deliveryMethod === 'self_pickup'} />
              自取
            </Label>
            <Label className="radio-label">
              <Radio value="door_drop" checked={form.deliveryMethod === 'door_drop'} />
              送上门
            </Label>
            <Label className="radio-label">
              <Radio value="spot" checked={form.deliveryMethod === 'spot'} />
              集中点
            </Label>
          </RadioGroup>
        </View>

        <View className="form-item">
          <Text className="label">备注</Text>
          <Textarea
            value={form.note}
            placeholder="补充说明"
            onInput={(e) => setField('note', e.detail.value)}
          />
        </View>
      </View>

      <Button className="submit-btn" onClick={handleSubmit}>
        发布
      </Button>
    </View>
  );
};

export default GroupBuyCreate;

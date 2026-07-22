import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Textarea, Radio, RadioGroup, Label, Button } from '@tarojs/components';
import { groupBuyService } from '@/services';
import './index.scss';

const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

const GroupBuyCreate = () => {
  const [type, setType] = useState(Taro.getCurrentInstance().router?.params?.type || 'seek');
  const [form, setForm] = useState<any>({
    location: '',
    locationCustom: '',
    deliveryMethod: 'self_pickup',
    note: '',
    items: [{ name: '', qty: 1, note: '' }],
    departAt: '',
    bidCloseAt: '',
    quota: 5,
  });

  const setField = (name: string, value: any) => setForm({ ...form, [name]: value });

  const handleSubmit = async () => {
    const location = form.location === '其他' ? form.locationCustom || '其他' : form.location;
    if (!form.location || (form.location === '其他' && !form.locationCustom.trim())) {
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
    // FE-11: seek item qty >= 1
    if (type === 'seek' && form.items.some((i: any) => !i.qty || i.qty < 1)) {
      Taro.showToast({ title: '商品数量需≥1', icon: 'none' });
      return;
    }
    if (type === 'offer') {
      if (!form.departAt || !form.bidCloseAt || !form.quota) {
        Taro.showToast({ title: '请填写出发时间/截止时间/名额', icon: 'none' });
        return;
      }
      // FE-7: 时间格式校验
      if (!DATETIME_RE.test(form.departAt) || !DATETIME_RE.test(form.bidCloseAt)) {
        Taro.showToast({ title: '时间格式应为 YYYY-MM-DD HH:mm', icon: 'none' });
        return;
      }
    }
    try {
      // FE-2: seek 不传 quota，让后端 ?? 999 生效
      const payload: any = { type, ...form, location };
      if (type === 'seek') delete payload.quota;
      delete payload.locationCustom;
      await groupBuyService.create(payload);
      Taro.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '发布失败', icon: 'none' });
    }
  };

  return (
    <View className="gb-create">
      <View className="form">
        {/* FE-1: seek/offer 类型切换（覆盖 URL type 默认 seek） */}
        <View className="form-item">
          <Text className="label">类型 *</Text>
          <RadioGroup onChange={(e) => setType(e.detail.value)}>
            <Label className="radio-label">
              <Radio value="seek" checked={type === 'seek'} />
              求代购
            </Label>
            <Label className="radio-label">
              <Radio value="offer" checked={type === 'offer'} />
              代购方
            </Label>
          </RadioGroup>
        </View>

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
          {/* N4: 选"其他"显示自定义文本输入 */}
          {form.location === '其他' && (
            <Input
              placeholder="请输入采购地点"
              value={form.locationCustom}
              onInput={(e) => setField('locationCustom', e.detail.value)}
            />
          )}
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

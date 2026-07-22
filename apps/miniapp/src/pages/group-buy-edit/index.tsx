import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Textarea, Radio, RadioGroup, Label, Button } from '@tarojs/components';
import { groupBuyService } from '@/services';
import type { GroupBuyDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const PRESET_LOCATIONS = ['山姆', 'Costco'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const GroupBuyEdit = () => {
  const id = Taro.getCurrentInstance().router?.params?.id ?? '';
  const [groupBuy, setGroupBuy] = useState<GroupBuyDto | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    groupBuyService
      .getById(id)
      .then((data) => {
        setGroupBuy(data);
        // N4: 已有地点非预设值则归入"其他"+自定义文本
        const isPreset = PRESET_LOCATIONS.includes(data.location);
        setForm({
          location: isPreset ? data.location : '其他',
          locationCustom: isPreset ? '' : data.location,
          // departAt/bidCloseAt 后端返回 ISO，回填转 YYYY-MM-DD HH:mm 供正则校验通过
          departAt: data.departAt ? formatDateTime(data.departAt) : '',
          bidCloseAt: data.bidCloseAt ? formatDateTime(data.bidCloseAt) : '',
          quota: data.quota,
          deliveryMethod: data.deliveryMethod,
          note: data.note || '',
        });
      })
      .catch(() => {
        Taro.showToast({ title: '加载失败', icon: 'none' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const setField = (name: string, value: any) => setForm({ ...form, [name]: value });

  const handleSave = async () => {
    const location = form.location === '其他' ? form.locationCustom || '其他' : form.location;
    if (!form.location || (form.location === '其他' && !form.locationCustom.trim())) {
      Taro.showToast({ title: '请选择采购地点', icon: 'none' });
      return;
    }
    if (groupBuy?.type === 'offer') {
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
    setSaving(true);
    try {
      const payload: any = { ...form, location };
      delete payload.locationCustom;
      await groupBuyService.update(id, payload);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '保存失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View className="gb-edit">加载中...</View>;
  if (!groupBuy) return <View className="gb-edit">事件不存在</View>;

  return (
    <View className="gb-edit">
      <View className="form">
        <View className="form-item">
          <Text className="label">采购地点 *</Text>
          <RadioGroup onChange={(e) => setField('location', e.detail.value)}>
            <Label className="radio-label">
              <Radio value="山姆" checked={form.location === '山姆'} />
              山姆
            </Label>
            <Label className="radio-label">
              <Radio value="Costco" checked={form.location === 'Costco'} />
              Costco
            </Label>
            <Label className="radio-label">
              <Radio value="其他" checked={form.location === '其他'} />
              其他
            </Label>
          </RadioGroup>
          {form.location === '其他' && (
            <Input
              placeholder="请输入采购地点"
              value={form.locationCustom}
              onInput={(e) => setField('locationCustom', e.detail.value)}
            />
          )}
        </View>

        {groupBuy.type === 'offer' && (
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
                value={String(form.quota ?? '')}
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

      <Button className="submit-btn" loading={saving} disabled={saving} onClick={handleSave}>
        保存
      </Button>
    </View>
  );
};

export default GroupBuyEdit;

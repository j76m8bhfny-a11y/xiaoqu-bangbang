import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import {
  View,
  Text,
  Input,
  Textarea,
  Radio,
  RadioGroup,
  Label,
  Checkbox,
  CheckboxGroup,
  Switch,
  Button,
} from '@tarojs/components';
import { eventService } from '@/services';
import { getFields, FieldConfig } from '../pet-create/field-configs';
import './index.scss';

const PetEdit: React.FC = () => {
  const eventId = Taro.getCurrentInstance().router?.params?.id;
  const [event, setEvent] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    eventService
      .getById(eventId)
      .then((eventData) => {
        setEvent(eventData);
        setForm(eventData.petMeta || {});
      })
      .catch(() => {
        Taro.showToast({ title: '加载失败', icon: 'none' });
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const setField = (name: string, value: any) => {
    setForm({ ...form, [name]: value });
  };

  const handleSave = async () => {
    if (!event) return;
    // 校验必填
    const fields = getFields(event.subType);
    for (const f of fields) {
      if (f.required && !form[f.name]) {
        Taro.showToast({ title: `请填写${f.label}`, icon: 'none' });
        return;
      }
    }
    // 构造 petMeta
    const petMeta: Record<string, any> = {};
    for (const f of fields) {
      if (form[f.name] !== undefined) petMeta[f.name] = form[f.name];
    }
    try {
      await eventService.update(eventId!, { petMeta });
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '保存失败', icon: 'none' });
    }
  };

  const renderField = (f: FieldConfig) => {
    switch (f.type) {
      case 'text':
        return (
          <Input
            value={form[f.name] || ''}
            placeholder={f.placeholder}
            onInput={(e) => setField(f.name, e.detail.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={form[f.name] !== undefined ? String(form[f.name]) : ''}
            onInput={(e) => setField(f.name, Number(e.detail.value))}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={form[f.name] || ''}
            placeholder={f.placeholder}
            onInput={(e) => setField(f.name, e.detail.value)}
          />
        );
      case 'radio':
        return (
          <RadioGroup onChange={(e) => setField(f.name, e.detail.value)}>
            {f.options!.map((o) => (
              <Label key={o.value} className="radio-label">
                <Radio value={o.value} checked={form[f.name] === o.value} />
                {o.label}
              </Label>
            ))}
          </RadioGroup>
        );
      case 'checkbox':
        return (
          <CheckboxGroup onChange={(e) => setField(f.name, e.detail.value)}>
            {f.options!.map((o) => (
              <Label key={o.value} className="checkbox-label">
                <Checkbox value={o.value} />
                {o.label}
              </Label>
            ))}
          </CheckboxGroup>
        );
      case 'switch':
        return (
          <Switch checked={!!form[f.name]} onChange={(e) => setField(f.name, e.detail.value)} />
        );
      case 'date-range':
        return (
          <View className="date-range">
            <Input
              type="text"
              placeholder="开始日期 如 2026-08-01"
              onInput={(e) => setField(f.name, { ...(form[f.name] || {}), start: e.detail.value })}
            />
            <Input
              type="text"
              placeholder="结束日期 如 2026-08-03"
              onInput={(e) => setField(f.name, { ...(form[f.name] || {}), end: e.detail.value })}
            />
          </View>
        );
      case 'image':
        // ponytail: 图片上传后续接入 image-picker 组件，本期最小实现用 Taro.chooseImage
        return (
          <Button
            size="mini"
            onClick={async () => {
              const res = await Taro.chooseImage({ count: 9, sourceType: ['album', 'camera'] });
              setField(f.name, res.tempFilePaths);
            }}
          >
            选择图片
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) return <View className="pet-edit">加载中...</View>;
  if (!event) return <View className="pet-edit">事件不存在</View>;

  const fields = getFields(event.subType);

  return (
    <View className="pet-edit">
      <View className="form">
        {fields.map((f) => (
          <View key={f.name} className="form-item">
            <Text className="label">
              {f.label}
              {f.required && ' *'}
            </Text>
            {renderField(f)}
          </View>
        ))}
      </View>
      <Button className="submit-btn" onClick={handleSave}>
        保存
      </Button>
    </View>
  );
};

export default PetEdit;

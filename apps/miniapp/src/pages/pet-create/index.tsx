import { useState } from 'react';
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
import { useAuthStore } from '@/store/auth';
import { getFields, FieldConfig } from './field-configs';
import './index.scss';

const API = process.env.TARO_APP_API || 'http://localhost:3000';

const PetCreate: React.FC = () => {
  const subType = Taro.getCurrentInstance().router?.params?.type || 'feed';
  const fields = getFields(subType);
  const [form, setForm] = useState<Record<string, any>>({});
  // ponytail: verifyStatus 在 user 对象上（非 store 顶层），参考 event-create 的取值方式
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);

  // 业主认证前置（feed/walk）
  if ((subType === 'feed' || subType === 'walk') && verifyStatus !== 'verified') {
    Taro.showModal({
      title: '需要业主认证',
      content: '代喂/代遛需要业主认证后才能发布，是否前往认证？',
      success: (res) => {
        if (res.confirm) Taro.redirectTo({ url: '/pages/verify/index' });
        else Taro.navigateBack();
      },
    });
    return null;
  }

  const setField = (name: string, value: any) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    // 校验必填
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
    // 构造 title
    const title =
      subType === 'feed'
        ? `代喂${petMeta.petName || ''}`
        : subType === 'walk'
          ? `代遛${petMeta.dogName || ''}`
          : `寻宠-${petMeta.name || petMeta.petType}`;
    const payload = {
      type: 'pet_help',
      subType,
      title,
      description: petMeta.note || '',
      petMeta,
    };
    try {
      const res = await Taro.request({
        url: `${API}/api/v1/events`,
        method: 'POST',
        header: {
          Authorization: `Bearer ${Taro.getStorageSync('token')}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      });
      if (res.data?.code === 0) {
        Taro.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => Taro.navigateBack(), 1500);
      } else {
        Taro.showToast({ title: res.data?.message || '发布失败', icon: 'none' });
      }
    } catch (e) {
      Taro.showToast({ title: '网络错误', icon: 'none' });
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
        // ponytail: 图片上传后续接入现有 image-picker 组件，本期最小实现用 Taro.chooseImage
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

  return (
    <View className="pet-create">
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
      <Button className="submit-btn" onClick={handleSubmit}>
        发布
      </Button>
    </View>
  );
};

export default PetCreate;

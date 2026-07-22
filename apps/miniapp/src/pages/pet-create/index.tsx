import { useState, useEffect, useRef } from 'react';
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
import { eventService } from '@/services';
import ImagePicker from '@/components/image-picker';
import { getFields, FieldConfig } from './field-configs';
import './index.scss';

const SUB_TYPE_OPTIONS = [
  { label: '代喂', value: 'feed' },
  { label: '代遛', value: 'walk' },
  { label: '寻宠', value: 'lost' },
];

const PetCreate: React.FC = () => {
  const [subType, setSubType] = useState(Taro.getCurrentInstance().router?.params?.type || 'feed');
  const fields = getFields(subType);
  const [form, setForm] = useState<Record<string, any>>({});
  // ponytail: verifyStatus 在 user 对象上（非 store 顶层），参考 event-create 的取值方式
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);
  // M22 review fix: 用 useEffect + ref 避免重复渲染触发多次弹窗
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (hasRedirected.current) return;
    if ((subType === 'feed' || subType === 'walk') && verifyStatus !== 'verified') {
      hasRedirected.current = true;
      Taro.showModal({
        title: '需要业主认证',
        content: '代喂/代遛需要业主认证后才能发布，是否前往认证？',
        success: (res) => {
          if (res.confirm) Taro.redirectTo({ url: '/pages/verify/index' });
          else Taro.navigateBack();
        },
      });
    }
  }, [subType, verifyStatus]);

  // 业主认证未通过时（feed/walk）不渲染表单
  if ((subType === 'feed' || subType === 'walk') && verifyStatus !== 'verified') {
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
      const event = await eventService.create(payload);
      Taro.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '发布失败', icon: 'none' });
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
                <Checkbox value={o.value} checked={(form[f.name] || []).includes(o.value)} />
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
              value={form[f.name]?.start || ''}
              placeholder="开始日期 如 2026-08-01"
              onInput={(e) => setField(f.name, { ...(form[f.name] || {}), start: e.detail.value })}
            />
            <Input
              type="text"
              value={form[f.name]?.end || ''}
              placeholder="结束日期 如 2026-08-03"
              onInput={(e) => setField(f.name, { ...(form[f.name] || {}), end: e.detail.value })}
            />
          </View>
        );
      case 'image':
        // FE-5: 走 image-picker 组件上传远端 URL（chooseMedia + http.upload + 预览/删除/追加）
        return (
          <ImagePicker images={form[f.name] || []} onChange={(imgs) => setField(f.name, imgs)} />
        );
      default:
        return null;
    }
  };

  return (
    <View className="pet-create">
      <View className="form">
        <View className="form-item">
          <Text className="label">类型 *</Text>
          <RadioGroup onChange={(e) => setSubType(e.detail.value)}>
            {SUB_TYPE_OPTIONS.map((o) => (
              <Label key={o.value} className="radio-label">
                <Radio value={o.value} checked={subType === o.value} />
                {o.label}
              </Label>
            ))}
          </RadioGroup>
        </View>
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

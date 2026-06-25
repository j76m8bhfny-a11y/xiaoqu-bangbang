import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import { communityApplicationService } from '@/services';
import { useDraft } from '@/hooks';
import ImagePicker from '@/components/image-picker';
import type { CreateCommunityApplicationRequest } from '@xiaoqu-bangbang/shared';
import './index.scss';

type MaterialType = CreateCommunityApplicationRequest['materialType'];

const MATERIAL_OPTIONS: { key: MaterialType; label: string }[] = [
  { key: 'property_cert', label: '🏠 房产证' },
  { key: 'rent_contract', label: '📄 租房合同' },
  { key: 'access_card', label: '🔑 门禁卡' },
  { key: 'other', label: '📋 其他' },
];

export default function CommunityApply() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [householdsText, setHouseholdsText] = useState('');
  const [reason, setReason] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('property_cert');
  const [materialImages, setMaterialImages] = useState<string[]>([]);
  const [doorImages, setDoorImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 草稿：表单字段防抖写入本地，下次进入若有未提交内容可恢复。
  // draftReady 控制 hook enable 时机：弹「恢复/丢弃」对话框前不写入，
  // 避免空白 state 在用户回应前覆盖原草稿。
  const [draftReady, setDraftReady] = useState(false);
  const draftState = {
    name,
    city,
    district,
    address,
    householdsText,
    reason,
    materialType,
    materialImages,
    doorImages,
  };
  const { restore, clear, has } = useDraft('community_apply', draftState, {
    enabled: draftReady,
  });

  useEffect(() => {
    if (!has()) {
      setDraftReady(true);
      return;
    }
    Taro.showModal({
      title: '恢复草稿？',
      content: '上次填写的小区申请还未提交，是否恢复？',
      confirmText: '恢复',
      cancelText: '丢弃',
      success: (res) => {
        if (res.confirm) {
          const d = restore();
          if (d) {
            setName(d.name ?? '');
            setCity(d.city ?? '');
            setDistrict(d.district ?? '');
            setAddress(d.address ?? '');
            setHouseholdsText(d.householdsText ?? '');
            setReason(d.reason ?? '');
            setMaterialType(d.materialType ?? 'property_cert');
            setMaterialImages(Array.isArray(d.materialImages) ? d.materialImages : []);
            setDoorImages(Array.isArray(d.doorImages) ? d.doorImages : []);
          }
        } else {
          clear();
        }
        setDraftReady(true);
      },
      fail: () => setDraftReady(true),
    });
    // 只在首次挂载时询问
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) return Taro.showToast({ title: '请填写小区名', icon: 'none' });
    if (!city.trim()) return Taro.showToast({ title: '请填写城市', icon: 'none' });
    if (!district.trim()) return Taro.showToast({ title: '请填写区/县', icon: 'none' });
    if (!address.trim()) return Taro.showToast({ title: '请填写详细地址', icon: 'none' });
    if (materialImages.length === 0) {
      return Taro.showToast({ title: '请上传证明材料', icon: 'none' });
    }

    const households = householdsText ? Number(householdsText) : undefined;
    if (householdsText && (!Number.isFinite(households) || households! <= 0)) {
      return Taro.showToast({ title: '户数需为正整数', icon: 'none' });
    }

    setSubmitting(true);
    try {
      const payload: CreateCommunityApplicationRequest = {
        name: name.trim(),
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        estimatedHouseholds: households,
        reason: reason.trim() || undefined,
        materialType,
        materialUrl: materialImages[0],
        doorPhotoUrl: doorImages[0],
      };
      const created = await communityApplicationService.create(payload);
      clear();
      Taro.showToast({ title: '已提交，等待审核', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: `/pages/community-application-detail/index?id=${created.id}` });
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : '提交失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="apply">
      <ScrollView scrollY className="apply__body">
        <View className="apply__hero">
          <Text className="apply__hero-emoji">🏘️</Text>
          <Text className="apply__hero-title">申请开通你家小区</Text>
          <Text className="apply__hero-subtitle">
            填写小区信息+1 张证明材料，邀请邻居助力，平台审核通过即开通
          </Text>
        </View>

        <View className="apply__card">
          <Text className="apply__section-title">小区信息</Text>

          <View className="apply__field">
            <Text className="apply__label">小区名称</Text>
            <Input
              className="apply__input"
              placeholder="如：阳光花园"
              value={name}
              onInput={(e) => setName(e.detail.value)}
              maxlength={50}
            />
          </View>

          <View className="apply__field-row">
            <View className="apply__field apply__field--half">
              <Text className="apply__label">城市</Text>
              <Input
                className="apply__input"
                placeholder="如：北京"
                value={city}
                onInput={(e) => setCity(e.detail.value)}
                maxlength={20}
              />
            </View>
            <View className="apply__field apply__field--half">
              <Text className="apply__label">区/县</Text>
              <Input
                className="apply__input"
                placeholder="如：朝阳区"
                value={district}
                onInput={(e) => setDistrict(e.detail.value)}
                maxlength={20}
              />
            </View>
          </View>

          <View className="apply__field">
            <Text className="apply__label">详细地址</Text>
            <Input
              className="apply__input"
              placeholder="街道、门牌等"
              value={address}
              onInput={(e) => setAddress(e.detail.value)}
              maxlength={100}
            />
          </View>

          <View className="apply__field">
            <Text className="apply__label">预估户数（可选）</Text>
            <Input
              className="apply__input"
              type="number"
              placeholder="如：800"
              value={householdsText}
              onInput={(e) => setHouseholdsText(e.detail.value)}
            />
          </View>

          <View className="apply__field">
            <Text className="apply__label">申请理由（可选）</Text>
            <Textarea
              className="apply__textarea"
              placeholder="说说你想开通小区的理由～"
              value={reason}
              onInput={(e) => setReason(e.detail.value)}
              maxlength={200}
              autoHeight
            />
          </View>
        </View>

        <View className="apply__card">
          <Text className="apply__section-title">证明材料</Text>
          <Text className="apply__hint">请选择一种材料类型并上传 1 张照片</Text>

          <View className="apply__type-group">
            {MATERIAL_OPTIONS.map((opt) => (
              <View
                key={opt.key}
                className={`apply__type-pill ${materialType === opt.key ? 'apply__type-pill--active' : ''}`}
                onClick={() => setMaterialType(opt.key)}
              >
                <Text
                  className={`apply__type-text ${materialType === opt.key ? 'apply__type-text--active' : ''}`}
                >
                  {opt.label}
                </Text>
              </View>
            ))}
          </View>

          <Text className="apply__field-title">材料照片</Text>
          <ImagePicker images={materialImages} maxCount={1} onChange={setMaterialImages} />

          <Text className="apply__field-title">门牌照片（可选）</Text>
          <ImagePicker images={doorImages} maxCount={1} onChange={setDoorImages} />
        </View>

        <View
          className={`apply__submit ${submitting ? 'apply__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className="apply__submit-text">{submitting ? '提交中...' : '提交申请'}</Text>
        </View>

        <Text className="apply__tip">
          提交后将进入「我的小区申请」，把链接分享给邻居获得助力。审核通过后你将自动成为认证业主。
        </Text>
      </ScrollView>
    </View>
  );
}

import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Switch, ScrollView } from '@tarojs/components';
import { verificationService } from '@/services';
import { useCommunityStore } from '@/store';
import { useRequest } from '@/hooks';
import ImagePicker from '@/components/image-picker';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import { MaterialType, VerificationStatus } from '@xiaoqu-bangbang/shared';
import type { VerificationDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

const MATERIAL_OPTIONS: { key: MaterialType; label: string }[] = [
  { key: MaterialType.PROPERTY_CERT, label: '🏠 房产证' },
  { key: MaterialType.RENT_CONTRACT, label: '📄 租房合同' },
  { key: MaterialType.ACCESS_CARD, label: '🔑 门禁卡' },
  { key: MaterialType.OTHER, label: '📋 其他' },
];

const STATUS_MAP: Record<VerificationStatus, { label: string; color: string }> = {
  [VerificationStatus.PENDING]: { label: '审核中', color: 'orange' },
  [VerificationStatus.APPROVED]: { label: '已通过', color: 'green' },
  [VerificationStatus.REJECTED]: { label: '已拒绝', color: 'red' },
  [VerificationStatus.MANUAL_REVIEW]: { label: '人工审核中', color: 'blue' },
};

const MATERIAL_LABEL_MAP: Record<MaterialType, string> = {
  [MaterialType.PROPERTY_CERT]: '房产证',
  [MaterialType.RENT_CONTRACT]: '租房合同',
  [MaterialType.ACCESS_CARD]: '门禁卡',
  [MaterialType.OTHER]: '其他',
};

export default function Verify() {
  const communityId = useCommunityStore((s) => s.currentCommunityId);

  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.PROPERTY_CERT);
  const [images, setImages] = useState<string[]>([]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: records,
    loading: recordsLoading,
    error: recordsError,
    refresh: refreshRecords,
  } = useRequest<{ items: VerificationDto[] }>(() => verificationService.getMine());

  const handleSubmit = async () => {
    if (images.length === 0) {
      Taro.showToast({ title: '请上传认证材料照片', icon: 'none' });
      return;
    }
    if (!consentAccepted) {
      Taro.showToast({ title: '请同意授权认证', icon: 'none' });
      return;
    }
    if (!communityId) {
      Taro.showToast({ title: '请先选择小区', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await verificationService.submit({
        communityId,
        materialType,
        fileUrl: images[0],
        consentAccepted: true,
        consentVersion: '1.0',
      });

      // Show OCR + match result
      const parts: string[] = [];
      if (result.ocrSummary) {
        parts.push(
          `识别小区: ${result.ocrSummary.communityName}`,
          `地址: ${result.ocrSummary.address}`,
          `业主: ${result.ocrSummary.ownerName}`,
          `置信度: ${Math.round(result.ocrSummary.confidence * 100)}%`,
        );
      }
      if (result.matchResult) {
        parts.push(
          `匹配结果: ${result.matchResult.matched ? '匹配成功' : '未匹配'}`,
          `匹配度: ${Math.round(result.matchResult.confidence * 100)}%`,
        );
      }

      Taro.showModal({
        title: '认证提交成功',
        content: parts.length > 0 ? parts.join('\n') : '您的认证申请已提交，请等待审核',
        showCancel: false,
        confirmText: '知道了',
      });

      // Reset form & refresh records
      setImages([]);
      setConsentAccepted(false);
      refreshRecords();
    } catch (err) {
      const message = err instanceof Error ? err.message : '提交失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <View className="verify">
      <ScrollView scrollY className="verify__body">
        {/* ===== Form Section ===== */}
        <View className="verify__card">
          <Text className="verify__section-title">材料类型</Text>
          <View className="verify__type-group">
            {MATERIAL_OPTIONS.map((opt) => (
              <View
                key={opt.key}
                className={`verify__type-pill ${materialType === opt.key ? 'verify__type-pill--active' : ''}`}
                onClick={() => setMaterialType(opt.key)}
              >
                <Text
                  className={`verify__type-text ${materialType === opt.key ? 'verify__type-text--active' : ''}`}
                >
                  {opt.label}
                </Text>
              </View>
            ))}
          </View>

          <Text className="verify__section-title">上传材料照片</Text>
          <ImagePicker images={images} maxCount={1} onChange={setImages} />

          <View className="verify__consent-row">
            <Text className="verify__consent-text">我同意授权认证，并确认所提供信息真实有效</Text>
            <Switch
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.detail.value)}
              color="#5b9e6f"
            />
          </View>

          <View
            className={`verify__submit ${submitting ? 'verify__submit--disabled' : ''}`}
            onClick={submitting ? undefined : handleSubmit}
          >
            <Text className="verify__submit-text">{submitting ? '提交中...' : '提交认证'}</Text>
          </View>
        </View>

        {/* ===== My Verification Records ===== */}
        <View className="verify__records">
          <Text className="verify__section-title">我的认证记录</Text>

          {recordsLoading && <Loading text="加载中..." />}

          {recordsError && <ErrorState message="加载失败" onRetry={refreshRecords} />}

          {records && records.items.length === 0 && <EmptyState icon="📋" text="暂无认证记录" />}

          {records && records.items.length > 0 && (
            <View className="verify__record-list">
              {records.items.map((record) => {
                const statusInfo = STATUS_MAP[record.status] ?? {
                  label: record.status,
                  color: 'gray',
                };
                return (
                  <View key={record.id} className="verify__record-item">
                    <View className="verify__record-left">
                      <Text className="verify__record-type">
                        {MATERIAL_LABEL_MAP[record.materialType] ?? record.materialType}
                      </Text>
                      {record.reviewedAt && (
                        <Text className="verify__record-date">{formatDate(record.reviewedAt)}</Text>
                      )}
                    </View>
                    <View className={`verify__status-tag verify__status-tag--${statusInfo.color}`}>
                      <Text className="verify__status-tag-text">{statusInfo.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

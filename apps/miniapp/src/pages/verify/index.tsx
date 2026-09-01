import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { verificationService } from '@/services';
import { useCommunityStore, useAuthStore } from '@/store';
import { useRequest } from '@/hooks';
import ImagePicker from '@/components/image-picker';
import Loading from '@/components/loading';
import ErrorState from '@/components/error-state';
import EmptyState from '@/components/empty-state';
import { MaterialType, VerificationStatus } from '@xiaoqu-bangbang/shared';
import type { VerificationDto } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';
import NavBar from '@/components/navbar';

const MATERIAL_OPTIONS: { key: MaterialType; label: string; icon: string }[] = [
  { key: MaterialType.PROPERTY_CERT, label: '房产证', icon: 'house' },
  { key: MaterialType.RENT_CONTRACT, label: '租房合同', icon: 'document' },
  { key: MaterialType.ACCESS_CARD, label: '门禁卡', icon: 'key' },
  { key: MaterialType.OTHER, label: '其他', icon: 'clipboard' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
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
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const isVerified = user?.verifyStatus === 'verified';
  const [showForm, setShowForm] = useState(false);

  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.PROPERTY_CERT);
  const [images, setImages] = useState<string[]>([]);
  const [buildingNo, setBuildingNo] = useState('');
  const [unitNo, setUnitNo] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: records,
    loading: recordsLoading,
    error: recordsError,
    refresh: refreshRecords,
  } = useRequest<{ items: VerificationDto[] }>(() => verificationService.getMine());

  const latestApproved = records?.items?.find((r) => r.status === VerificationStatus.APPROVED);
  const pendingRecord = records?.items?.find(
    (r) => r.status === VerificationStatus.PENDING || r.status === VerificationStatus.MANUAL_REVIEW,
  );

  const handleSubmit = async () => {
    if (images.length === 0) {
      Taro.showToast({ title: '请上传认证材料照片', icon: 'none' });
      return;
    }
    if (!buildingNo.trim() || !roomNo.trim()) {
      Taro.showToast({ title: '请填写楼栋号和房号', icon: 'none' });
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
        buildingNo: buildingNo.trim(),
        unitNo: unitNo.trim(),
        roomNo: roomNo.trim(),
        consentAccepted: true,
        consentVersion: '1.0',
      });

      const parts: string[] = [];
      if (result.ocrSummary) {
        parts.push(
          `识别小区: ${result.ocrSummary.communityName}`,
          `识别房号: ${result.ocrSummary.buildingNo}栋${result.ocrSummary.unitNo}单元${result.ocrSummary.roomNo}室`,
          `置信度: ${Math.round(result.ocrSummary.confidence * 100)}%`,
        );
      }

      const statusMsg =
        result.status === 'approved'
          ? 'OCR 识别与您输入一致，已自动通过认证'
          : 'OCR 识别与您输入不一致，已转入人工审核，请等待 Admin 审批';

      Taro.showModal({
        title: result.status === 'approved' ? '认证已通过' : '认证审核中',
        content: parts.length > 0 ? `${parts.join('\n')}\n\n${statusMsg}` : statusMsg,
        showCancel: false,
        confirmText: '知道了',
      });

      setImages([]);
      setBuildingNo('');
      setUnitNo('');
      setRoomNo('');
      setConsentAccepted(false);
      setShowForm(false);
      refreshRecords();

      if (result.status === 'approved') {
        updateUser({ verifyStatus: 'verified' });
      }
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
      <NavBar title="业主认证" />
      <ScrollView scrollY className="verify__body">
        {/* Verified status card */}
        {isVerified && latestApproved && !showForm && (
          <View className="verify__status-card verify__status-card--approved">
            <View className="verify__status-card-icon">
              <Icon name="check-circle" size={32} color="#5B9E6F" />
            </View>
            <View className="verify__status-card-body">
              <Text className="verify__status-card-title">已认证业主</Text>
              <Text className="verify__status-card-desc">
                认证方式：
                {MATERIAL_LABEL_MAP[latestApproved.materialType] ?? latestApproved.materialType}
              </Text>
              {latestApproved.reviewedAt && (
                <Text className="verify__status-card-date">
                  通过时间：{formatDate(latestApproved.reviewedAt)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Pending status card */}
        {pendingRecord && !showForm && (
          <View className="verify__status-card verify__status-card--pending">
            <View className="verify__status-card-icon">
              <Icon name="clock" size={32} color="#E89B6C" />
            </View>
            <View className="verify__status-card-body">
              <Text className="verify__status-card-title">认证审核中</Text>
              <Text className="verify__status-card-desc">
                提交时间：{formatDate(pendingRecord.createdAt ?? '')}
              </Text>
              <Text className="verify__status-card-desc">请耐心等待审核结果</Text>
            </View>
          </View>
        )}

        {/* Benefits Card - hidden when verified */}
        {!isVerified && !pendingRecord && (
          <View className="verify__benefits">
            <Text className="verify__benefits-title">认证权益</Text>
            {['发布互助和闲置', '发起议题和投票', '查看完整联系方式', '获得小红花奖励'].map((b) => (
              <View key={b} className="verify__benefit-item">
                <View className="verify__benefit-check">
                  <Icon name="check" size={12} color="#5B9E6F" />
                </View>
                <Text className="verify__benefit-text">{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Form Section - hidden when verified or pending, unless toggled */}
        {(!isVerified || showForm) && !pendingRecord && (
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
                    <Icon name={opt.icon as any} size={16} /> {opt.label}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="verify__section-title">楼栋 / 单元 / 房号</Text>
            <View className="verify__address-row">
              <Input
                className="verify__address-input"
                type="number"
                placeholder="楼栋号"
                value={buildingNo}
                onInput={(e) => setBuildingNo(e.detail.value)}
              />
              <Text className="verify__address-sep">栋</Text>
              <Input
                className="verify__address-input"
                type="number"
                placeholder="单元号(选填)"
                value={unitNo}
                onInput={(e) => setUnitNo(e.detail.value)}
              />
              <Text className="verify__address-sep">单元</Text>
              <Input
                className="verify__address-input"
                type="number"
                placeholder="房号"
                value={roomNo}
                onInput={(e) => setRoomNo(e.detail.value)}
              />
              <Text className="verify__address-sep">室</Text>
            </View>

            <Text className="verify__section-title">上传材料照片</Text>
            <ImagePicker images={images} maxCount={1} onChange={setImages} />

            <View
              className="verify__consent-row"
              onClick={() => setConsentAccepted(!consentAccepted)}
            >
              <View
                className={`verify__checkbox ${consentAccepted ? 'verify__checkbox--checked' : ''}`}
              >
                {consentAccepted && (
                  <View className="verify__checkbox-icon">
                    <Icon name="check" size={16} color="#FFF" />
                  </View>
                )}
              </View>
              <Text className="verify__consent-text">我同意授权认证，并确认所提供信息真实有效</Text>
            </View>

            <View
              className={`verify__submit ${submitting ? 'verify__submit--disabled' : ''}`}
              onClick={submitting ? undefined : handleSubmit}
            >
              <Text className="verify__submit-text">{submitting ? '提交中...' : '提交认证'}</Text>
            </View>
          </View>
        )}

        {/* Re-verify button for verified users */}
        {isVerified && !showForm && (
          <View className="verify__reverify" onClick={() => setShowForm(true)}>
            <Text className="verify__reverify-text">重新提交认证</Text>
          </View>
        )}

        {/* Records */}
        <View className="verify__records">
          <Text className="verify__section-title">我的认证记录</Text>

          {recordsLoading && <Loading text="加载中..." />}

          {recordsError && <ErrorState message="加载失败" onRetry={refreshRecords} />}

          {records && records.items.length === 0 && (
            <EmptyState icon="clipboard" text="暂无认证记录" />
          )}

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
                      {record.reviewedAt ? (
                        <Text className="verify__record-date">{formatDate(record.reviewedAt)}</Text>
                      ) : (
                        <Text className="verify__record-date">
                          {formatDate(record.createdAt ?? '')}
                        </Text>
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

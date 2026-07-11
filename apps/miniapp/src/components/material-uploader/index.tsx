import { View, Text } from '@tarojs/components';
import ImagePicker from '../image-picker';
import './index.scss';
import Icon from '@/components/icon';

export type MaterialType = 'property_cert' | 'rent_contract' | 'access_card' | 'other';

export const MATERIAL_OPTIONS: { key: MaterialType; label: string; icon: string }[] = [
  { key: 'property_cert', label: '房产证', icon: 'house' },
  { key: 'rent_contract', label: '租房合同', icon: 'document' },
  { key: 'access_card', label: '门禁卡', icon: 'key' },
  { key: 'other', label: '其他', icon: 'clipboard' },
];

export const MATERIAL_LABEL_MAP: Record<MaterialType, string> = {
  property_cert: '房产证',
  rent_contract: '租房合同',
  access_card: '门禁卡',
  other: '其他',
};

interface MaterialUploaderProps {
  materialType: MaterialType;
  onMaterialTypeChange: (type: MaterialType) => void;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxCount?: number;
}

// 业主认证 / 申请开通小区共用的「材料类型 + 图片」选择器。
// 仅负责（材料类型 pills + 1 张图片）这块；门牌照片这类附加图片由调用方自行渲染。
export default function MaterialUploader({
  materialType,
  onMaterialTypeChange,
  images,
  onImagesChange,
  maxCount = 1,
}: MaterialUploaderProps) {
  return (
    <View className="mu">
      <View className="mu__pills">
        {MATERIAL_OPTIONS.map((opt) => (
          <View
            key={opt.key}
            className={`mu__pill ${materialType === opt.key ? 'mu__pill--active' : ''}`}
            onClick={() => onMaterialTypeChange(opt.key)}
          >
            <Text
              className={`mu__pill-text ${materialType === opt.key ? 'mu__pill-text--active' : ''}`}
            >
              <Icon name={opt.icon as any} size={16} /> {opt.label}
            </Text>
          </View>
        ))}
      </View>
      <ImagePicker images={images} maxCount={maxCount} onChange={onImagesChange} />
    </View>
  );
}

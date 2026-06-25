import { View, Text } from '@tarojs/components';
import './index.scss';

interface UnverifiedAuthorTagProps {
  // 作者的 verifyStatus，仅当非 'verified' 时显示。
  verifyStatus?: string | null;
  size?: 'small' | 'medium';
}

// 列表/卡片中标注作者「未认证」身份的小色块。配合发布限流（unverified 仍可发求助/闲置等）使用。
export default function UnverifiedAuthorTag({
  verifyStatus,
  size = 'small',
}: UnverifiedAuthorTagProps) {
  if (verifyStatus === 'verified') return null;
  return (
    <View className={`uat uat--${size}`}>
      <Text className="uat__text">未认证</Text>
    </View>
  );
}

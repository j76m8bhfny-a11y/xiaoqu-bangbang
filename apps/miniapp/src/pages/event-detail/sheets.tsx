import { View, Text, Image } from '@tarojs/components';
import BottomSheet from '@/components/bottom-sheet';
import Loading from '@/components/loading';
import Icon from '@/components/icon';
import { ApplicationStatus } from '@xiaoqu-bangbang/shared';
import type { EventApplicationDto } from '@xiaoqu-bangbang/shared';
import type { ContactInfo } from './constants';

interface HelperSelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  applications: EventApplicationDto[];
  onSelectHelper: (applicationId: string) => void;
}

export function HelperSelectionSheet({
  visible,
  onClose,
  applications,
  onSelectHelper,
}: HelperSelectionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="选择帮助者">
      {applications
        ?.filter((a) => a.status === ApplicationStatus.PENDING)
        .map((app) => (
          <View key={app.id} className="event-detail__helper-item">
            <View className="event-detail__helper-avatar">
              {app.userAvatarUrl ? (
                <Image
                  className="event-detail__helper-avatar-img"
                  src={app.userAvatarUrl}
                  mode="aspectFill"
                />
              ) : (
                <Text className="event-detail__helper-avatar-fallback">
                  {app.userNickname.slice(0, 1)}
                </Text>
              )}
            </View>
            <View className="event-detail__helper-info">
              <Text className="event-detail__helper-nickname">{app.userNickname}</Text>
              {app.message && <Text className="event-detail__helper-message">{app.message}</Text>}
            </View>
            <View
              className="event-detail__helper-select-btn"
              onClick={() => onSelectHelper(app.id)}
            >
              <Text className="event-detail__helper-select-text">选择</Text>
            </View>
          </View>
        ))}
      {(!applications ||
        applications.filter((a) => a.status === ApplicationStatus.PENDING).length === 0) && (
        <Text className="event-detail__helper-empty">暂无待选帮手</Text>
      )}
    </BottomSheet>
  );
}

interface ContactInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  isCreator: boolean;
  contactLoading: boolean;
  contactInfo: ContactInfo | null;
  onCallPhone: (phone: string) => void;
  onCopyWechat: (wechatId: string) => void;
}

export function ContactInfoSheet({
  visible,
  onClose,
  isCreator,
  contactLoading,
  contactInfo,
  onCallPhone,
  onCopyWechat,
}: ContactInfoSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={isCreator ? '联系帮手' : '联系发布者'}>
      {contactLoading ? (
        <Loading text="加载中..." />
      ) : contactInfo ? (
        <View className="event-detail__contact">
          <View className="event-detail__contact-name">
            <Icon name="person" size={20} />
            <Text className="event-detail__contact-name-text">{contactInfo.nickname}</Text>
          </View>
          {contactInfo.rawPhone && (
            <View className="event-detail__contact-item">
              <View className="event-detail__contact-item-left">
                <Icon name="phone" size={20} color="#5B9E6F" />
                <View className="event-detail__contact-item-info">
                  <Text className="event-detail__contact-item-label">电话</Text>
                  <Text className="event-detail__contact-item-value">{contactInfo.phone}</Text>
                </View>
              </View>
              <View
                className="event-detail__contact-item-action"
                onClick={() => onCallPhone(contactInfo.rawPhone!)}
              >
                <Icon name="phone" size={16} color="#fff" />
                <Text className="event-detail__contact-item-action-text">拨打</Text>
              </View>
            </View>
          )}
          {contactInfo.wechatId && (
            <View className="event-detail__contact-item">
              <View className="event-detail__contact-item-left">
                <Icon name="chat" size={20} color="#5B9E6F" />
                <View className="event-detail__contact-item-info">
                  <Text className="event-detail__contact-item-label">微信</Text>
                  <Text className="event-detail__contact-item-value">{contactInfo.wechatId}</Text>
                </View>
              </View>
              <View
                className="event-detail__contact-item-action"
                onClick={() => onCopyWechat(contactInfo.wechatId!)}
              >
                <Icon name="memo" size={16} color="#fff" />
                <Text className="event-detail__contact-item-action-text">复制</Text>
              </View>
            </View>
          )}
          {!contactInfo.rawPhone && !contactInfo.wechatId && (
            <Text className="event-detail__contact-empty">对方暂未填写联系方式</Text>
          )}
          <View className="event-detail__contact-privacy">
            <Icon name="lock" size={12} color="#999" />
            <Text className="event-detail__contact-privacy-text">
              为保护隐私，请在互助结束后删除联系方式
            </Text>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

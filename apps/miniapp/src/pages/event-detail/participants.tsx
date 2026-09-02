import { View, Text, Image } from '@tarojs/components';
import Icon from '@/components/icon';
import { ApplicationStatus, EventStatus } from '@xiaoqu-bangbang/shared';
import type { EventDto, EventApplicationDto } from '@xiaoqu-bangbang/shared';
import { ACTION_TYPE_LABELS } from './constants';

interface ParticipantsProps {
  applications: EventApplicationDto[];
  event: EventDto;
  isCreator: boolean;
  isHelperType: boolean;
  isMultiHelperType: boolean;
  submitting: boolean;
  onSelectHelper: (id: string) => void;
  onSelectParticipant: (data: { applicationId: string }) => void;
  onConfirmParticipant: (id: string) => void;
  onThanks: (userId: string) => void;
  onOpenHelperSheet: () => void;
  onStartRating: (userId: string) => void;
}

export function Participants({
  applications,
  event,
  isCreator,
  isHelperType,
  isMultiHelperType,
  submitting,
  onSelectHelper,
  onSelectParticipant,
  onConfirmParticipant,
  onThanks,
  onOpenHelperSheet,
  onStartRating,
}: ParticipantsProps) {
  const participants = event.participants ?? [];

  return (
    <>
      {/* M5: Participants / Responses Section */}
      {applications && applications.length > 0 && (
        <View className="event-detail__section event-detail__respondents-section">
          <Text className="event-detail__section-title">
            <Icon name="handshake" size={16} /> 响应者 ({applications.length})
          </Text>
          <View className="event-detail__stacked-avatars">
            {applications.slice(0, 5).map((app, index) => (
              <View
                key={app.id}
                className="event-detail__stacked-avatar"
                style={{ zIndex: 10 - index }}
              >
                {app.userAvatarUrl ? (
                  <Image
                    className="event-detail__stacked-avatar-img"
                    src={app.userAvatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="event-detail__stacked-avatar-emoji">
                    {app.userNickname.slice(0, 1)}
                  </Text>
                )}
              </View>
            ))}
            {applications.length > 5 && (
              <View className="event-detail__stacked-badge">
                <Text className="event-detail__stacked-badge-text">+{applications.length - 5}</Text>
              </View>
            )}
          </View>
          <View className="event-detail__participant-names">
            {applications.map((app) => (
              <Text key={app.id} className="event-detail__participant-name-tag">
                {app.userNickname}
              </Text>
            ))}
          </View>
          {applications.map((app) => (
            <View key={app.id} className="event-detail__participant">
              <View className="event-detail__participant-avatar">
                {app.userAvatarUrl ? (
                  <Image
                    className="event-detail__participant-avatar-img"
                    src={app.userAvatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="event-detail__participant-avatar-emoji">
                    {app.userNickname.slice(0, 1)}
                  </Text>
                )}
              </View>
              <View className="event-detail__participant-body">
                <View className="event-detail__participant-top">
                  <Text className="event-detail__participant-nickname">{app.userNickname}</Text>
                  <View className="event-detail__participant-action-tag">
                    <Text className="event-detail__participant-action-text">
                      {ACTION_TYPE_LABELS[app.actionType] ?? app.actionType}
                    </Text>
                  </View>
                </View>
                {app.message && (
                  <Text className="event-detail__participant-message">{app.message}</Text>
                )}
              </View>
              {isHelperType && isCreator && app.status === ApplicationStatus.PENDING && (
                <View
                  className="event-detail__participant-select-btn"
                  onClick={() => onSelectHelper(app.id)}
                >
                  <Text className="event-detail__participant-select-text">选择</Text>
                </View>
              )}
              {isMultiHelperType && isCreator && app.status === ApplicationStatus.PENDING && (
                <View
                  className="event-detail__participant-select-btn"
                  onClick={() => onSelectParticipant({ applicationId: app.id })}
                >
                  <Text className="event-detail__participant-select-text">选择参与</Text>
                </View>
              )}
              {(isHelperType || isMultiHelperType) && app.status === ApplicationStatus.SELECTED && (
                <View className="event-detail__participant-selected-tag">
                  <Text className="event-detail__participant-selected-text">已选择</Text>
                </View>
              )}
            </View>
          ))}
          {isHelperType &&
            isCreator &&
            (event.status === EventStatus.OPEN || event.status === EventStatus.IN_PROGRESS) && (
              <View className="event-detail__select-helper-btn" onClick={onOpenHelperSheet}>
                <Text className="event-detail__select-helper-text">选择帮助者</Text>
              </View>
            )}
        </View>
      )}

      {/* M5: Multi-helper participants section */}
      {isMultiHelperType && participants.length > 0 && (
        <View className="event-detail__section">
          <Text className="event-detail__section-title">
            <Icon name="people" size={16} /> 参与者 ({participants.length}
            {event.capacity ? `/${event.capacity}` : ''})
          </Text>
          {participants.map((p) => (
            <View key={p.id} className="event-detail__participant">
              <View className="event-detail__participant-avatar">
                {p.user?.avatarUrl ? (
                  <Image
                    className="event-detail__participant-avatar-img"
                    src={p.user.avatarUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <Text className="event-detail__participant-avatar-emoji">
                    {(p.user?.nickname ?? '?').slice(0, 1)}
                  </Text>
                )}
              </View>
              <View className="event-detail__participant-body">
                <View className="event-detail__participant-top">
                  <Text className="event-detail__participant-nickname">
                    {p.user?.nickname ?? '邻居'}
                  </Text>
                  <View
                    className={`event-detail__participant-action-tag ${p.status === 'confirmed' ? 'event-detail__participant-action-tag--done' : ''}`}
                  >
                    <Text className="event-detail__participant-action-text">
                      {p.status === 'confirmed' ? '已完成' : '待确认'}
                    </Text>
                  </View>
                </View>
              </View>
              {isCreator &&
                p.status !== 'confirmed' &&
                (event.status === EventStatus.PROCESSING ||
                  event.status === EventStatus.IN_PROGRESS) && (
                  <View
                    className="event-detail__participant-select-btn"
                    onClick={() => onConfirmParticipant(p.id)}
                  >
                    <Text className="event-detail__participant-select-text">
                      {submitting ? '...' : '确认完成'}
                    </Text>
                  </View>
                )}
              {isCreator &&
                p.status === 'confirmed' &&
                event.status === EventStatus.COMPLETED &&
                p.userId && (
                  <View className="event-detail__participant-actions">
                    <View
                      className="event-detail__participant-action-btn event-detail__participant-action-btn--thanks"
                      onClick={() => onThanks(p.userId)}
                    >
                      <View className="event-detail__participant-action-text">
                        <Icon name="flower" size={16} color="#C9702F" /> <Text>送花</Text>
                      </View>
                    </View>
                    <View
                      className="event-detail__participant-action-btn event-detail__participant-action-btn--rate"
                      onClick={() => onStartRating(p.userId)}
                    >
                      <View className="event-detail__participant-action-text">
                        <Icon name="star" size={16} color="#C9702F" /> <Text>评价</Text>
                      </View>
                    </View>
                  </View>
                )}
            </View>
          ))}
        </View>
      )}
    </>
  );
}

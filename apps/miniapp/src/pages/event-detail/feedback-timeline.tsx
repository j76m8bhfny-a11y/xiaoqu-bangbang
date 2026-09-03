import { View, Text, Image } from '@tarojs/components';
import Icon from '@/components/icon';
import { FEEDBACK_STATUS_CONFIG, formatRelativeTime } from './constants';
import type { FeedbackLogDto } from './constants';

interface FeedbackTimelineProps {
  isPublicFeedback: boolean;
  feedbackLogs: FeedbackLogDto[];
}

export function FeedbackTimeline({ isPublicFeedback, feedbackLogs }: FeedbackTimelineProps) {
  if (
    !isPublicFeedback ||
    !feedbackLogs ||
    feedbackLogs.filter((l) => l.visibleToPublic).length === 0
  )
    return null;

  return (
    <View className="event-detail__section event-detail__feedback">
      <Text className="event-detail__section-title">
        <Icon name="clipboard" size={16} /> 处理进度
      </Text>
      {feedbackLogs
        .filter((l) => l.visibleToPublic)
        .map((log) => {
          const statusCfg = FEEDBACK_STATUS_CONFIG[log.status] ?? {
            label: log.status,
            color: '#999',
            bgColor: '#F5F5F5',
          };
          return (
            <View key={log.id} className="event-detail__feedback-item">
              <View className="event-detail__feedback-dot-wrap">
                <View
                  className="event-detail__feedback-dot"
                  style={{ background: statusCfg.color }}
                />
              </View>
              <View className="event-detail__feedback-body">
                <View className="event-detail__feedback-top">
                  <View
                    className="event-detail__feedback-status"
                    style={{ backgroundColor: statusCfg.bgColor }}
                  >
                    <Text
                      className="event-detail__feedback-status-text"
                      style={{ color: statusCfg.color }}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                  <Text className="event-detail__feedback-time">
                    {formatRelativeTime(log.createdAt)}
                  </Text>
                </View>
                {log.content && (
                  <Text className="event-detail__feedback-content">{log.content}</Text>
                )}
                {log.images.length > 0 && (
                  <View className="event-detail__feedback-images">
                    {log.images.map((img, idx) => (
                      <Image
                        key={idx}
                        className="event-detail__feedback-img"
                        src={img}
                        mode="aspectFill"
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
    </View>
  );
}

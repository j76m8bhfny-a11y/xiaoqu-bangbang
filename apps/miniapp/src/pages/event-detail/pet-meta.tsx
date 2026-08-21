import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/icon';
import { EventType, PetSubType } from '@xiaoqu-bangbang/shared';
import type { EventDto, PetFeedMeta, PetWalkMeta, PetLostMeta } from '@xiaoqu-bangbang/shared';
import { PET_TYPE_LABELS, DOG_SIZE_LABELS } from './constants';

export function PetMeta({ event }: { event: EventDto }) {
  if (event.type !== EventType.PET_HELP || !event.petMeta || !event.subType) return null;

  return (
    <View className="pet-meta">
      <Text className="section-title">
        <Icon name="paw" size={16} /> 宠物详情
      </Text>
      <Text className="pet-meta__watermark">🐾</Text>
      {event.subType === PetSubType.FEED &&
        (() => {
          const m = event.petMeta as PetFeedMeta;
          return (
            <>
              <View className="pet-meta__row">
                <Text className="pet-meta__label">宠物种类</Text>
                <Text className="pet-meta__value">{PET_TYPE_LABELS[m.petType] ?? m.petType}</Text>
              </View>
              {m.petName && (
                <View className="pet-meta__row">
                  <Text className="pet-meta__label">名字</Text>
                  <Text className="pet-meta__value">{m.petName}</Text>
                </View>
              )}
              <View className="pet-meta__row">
                <Text className="pet-meta__label">喂食次数/天</Text>
                <Text className="pet-meta__value">{m.feedsPerDay}</Text>
              </View>
              <View className="pet-meta__row">
                <Text className="pet-meta__label">总天数</Text>
                <Text className="pet-meta__value">{m.totalDays}</Text>
              </View>
              <View className="pet-meta__row">
                <Text className="pet-meta__label">起止日期</Text>
                <Text className="pet-meta__value">
                  {m.dateRange ? `${m.dateRange.start} ~ ${m.dateRange.end}` : '未设置'}
                </Text>
              </View>
              <View className="pet-meta__row">
                <Text className="pet-meta__label">需要清理</Text>
                <Text className="pet-meta__value">{m.needClean ? '是' : '否'}</Text>
              </View>
            </>
          );
        })()}
      {event.subType === PetSubType.WALK &&
        (() => {
          const m = event.petMeta as PetWalkMeta;
          const slots: Record<string, string> = {
            morning: '早上',
            noon: '中午',
            evening: '傍晚',
            night: '夜间',
          };
          return (
            <>
              <View className="pet-meta__tags">
                <View className="pet-meta__tag pet-meta__tag--size">
                  <Text>🐶 {DOG_SIZE_LABELS[m.dogSize] ?? m.dogSize}</Text>
                </View>
                {m.dogName && (
                  <View className="pet-meta__tag pet-meta__tag--type">
                    <Text>📋 {m.dogName}</Text>
                  </View>
                )}
                <View className="pet-meta__tag pet-meta__tag--schedule">
                  <Text>🔄 每天{m.timesPerDay}次</Text>
                </View>
                <View className="pet-meta__tag pet-meta__tag--duration">
                  <Text>⏱️ 每次{m.durationPerTime}分钟</Text>
                </View>
                {m.timeSlots?.map((slot) => (
                  <View key={slot} className="pet-meta__tag pet-meta__tag--schedule">
                    <Text>{slots[slot] ?? slot}</Text>
                  </View>
                ))}
                {m.needGear && (
                  <View className="pet-meta__tag pet-meta__tag--gear">
                    <Text>🔧 需牵引绳/尿垫</Text>
                  </View>
                )}
              </View>
              {m.note && (
                <View className="pet-meta__warning">
                  <Text className="pet-meta__warning-text">⚠️ {m.note}</Text>
                </View>
              )}
            </>
          );
        })()}
      {event.subType === PetSubType.LOST &&
        (() => {
          const m = event.petMeta as PetLostMeta;
          return (
            <>
              <View className="pet-meta__row">
                <Text className="pet-meta__label">种类</Text>
                <Text className="pet-meta__value">{m.petType}</Text>
              </View>
              {m.breed && (
                <View className="pet-meta__row">
                  <Text className="pet-meta__label">品种</Text>
                  <Text className="pet-meta__value">{m.breed}</Text>
                </View>
              )}
              {m.name && (
                <View className="pet-meta__row">
                  <Text className="pet-meta__label">名字</Text>
                  <Text className="pet-meta__value">{m.name}</Text>
                </View>
              )}
              <View className="pet-meta__row">
                <Text className="pet-meta__label">走丢地点</Text>
                <Text className="pet-meta__value">{m.lostLocation}</Text>
              </View>
              <View className="pet-meta__row">
                <Text className="pet-meta__label">走丢时间</Text>
                <Text className="pet-meta__value">{m.lostTime}</Text>
              </View>
              {m.appearance && (
                <View className="pet-meta__row">
                  <Text className="pet-meta__label">外观</Text>
                  <Text className="pet-meta__value">{m.appearance}</Text>
                </View>
              )}
              {m.photos && m.photos.length > 0 && (
                <View className="pet-meta__photos">
                  {m.photos.map((p, i) => (
                    <Image
                      key={i}
                      className="pet-meta__photo"
                      src={p}
                      mode="aspectFill"
                      onClick={() =>
                        Taro.previewMedia({
                          sources: m.photos!.map((src) => ({
                            url: src,
                            type: 'image' as const,
                          })),
                          current: i,
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </>
          );
        })()}
    </View>
  );
}

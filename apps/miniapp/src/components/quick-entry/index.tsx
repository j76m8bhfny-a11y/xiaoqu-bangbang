import { View, Text } from '@tarojs/components';
import './index.scss';
import Icon from '@/components/icon';

export interface QuickEntryItem {
  key: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

interface QuickEntryGridProps {
  onEntryClick?: (key: string) => void;
}

const ENTRIES: QuickEntryItem[] = [
  {
    key: 'help_request',
    label: '找人帮忙',
    emoji: 'hands-up',
    color: '#5b9e6f',
    bgColor: '#eaf4ec',
  },
  { key: 'help_offer', label: '我能帮忙', emoji: 'wrench', color: '#e89b6c', bgColor: '#fbf0dd' },
  { key: 'public_welfare', label: '发公益', emoji: 'sun', color: '#e89b6c', bgColor: '#fbf0dd' },
  { key: 'lost_found', label: '寻宠寻物', emoji: 'paw', color: '#5b9e6f', bgColor: '#eaf4ec' },
  {
    key: 'public_feedback',
    label: '反馈问题',
    emoji: 'megaphone',
    color: '#FF6B6B',
    bgColor: '#FFF0F0',
  },
  { key: 'discussion', label: '发讨论', emoji: 'chat', color: '#5b9e6f', bgColor: '#E8FAF8' },
  { key: 'vote', label: '社区投票', emoji: 'vote', color: '#5b9e6f', bgColor: '#eaf4ec' },
  { key: 'committee', label: '业委会', emoji: 'building', color: '#e89b6c', bgColor: '#fbf0dd' },
];

export default function QuickEntryGrid({ onEntryClick }: QuickEntryGridProps) {
  return (
    <View className="quick-entry">
      <View className="quick-entry__grid">
        {ENTRIES.map((entry) => (
          <View
            key={entry.key}
            className="quick-entry__item"
            onClick={() => onEntryClick?.(entry.key)}
          >
            <View className="quick-entry__icon" style={{ background: entry.bgColor }}>
              <Text className="quick-entry__emoji">{entry.emoji}</Text>
            </View>
            <Text className="quick-entry__label">{entry.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

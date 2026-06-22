import { View, Text } from '@tarojs/components';
import './index.scss';

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
  { key: 'help_request', label: '找人帮忙', emoji: '🤲', color: '#35E89A', bgColor: '#E9FFF4' },
  { key: 'help_offer', label: '我能帮忙', emoji: '🔧', color: '#FF9F43', bgColor: '#FFF1DD' },
  { key: 'public_welfare', label: '发公益', emoji: '☀️', color: '#FFD93D', bgColor: '#FFFBE6' },
  { key: 'lost_found', label: '寻宠寻物', emoji: '🐾', color: '#7C6EF6', bgColor: '#F0EDFF' },
  { key: 'public_feedback', label: '反馈问题', emoji: '📢', color: '#FF6B6B', bgColor: '#FFF0F0' },
  { key: 'discussion', label: '发讨论', emoji: '💬', color: '#4ECDC4', bgColor: '#E8FAF8' },
  { key: 'vote', label: '社区投票', emoji: '🗳️', color: '#7C6EF6', bgColor: '#F0EDFF' },
  { key: 'committee', label: '业委会', emoji: '🏛️', color: '#FF9F43', bgColor: '#FFF1DD' },
];

export default function QuickEntryGrid({ onEntryClick }: QuickEntryGridProps) {
  return (
    <View className='quick-entry'>
      <View className='quick-entry__grid'>
        {ENTRIES.map((entry) => (
          <View
            key={entry.key}
            className='quick-entry__item'
            onClick={() => onEntryClick?.(entry.key)}
          >
            <View
              className='quick-entry__icon'
              style={{ background: entry.bgColor }}
            >
              <Text className='quick-entry__emoji'>{entry.emoji}</Text>
            </View>
            <Text className='quick-entry__label'>{entry.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

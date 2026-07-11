import { ICON_MAP, type IconName } from './icon-map';
import './index.scss';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

/** 手绘 SVG 图标组件，纯展示，不引入外部依赖 */
function Icon({ name, size = 24, color = '#5B9E6F', className = '' }: IconProps) {
  const def = ICON_MAP[name];
  if (!def) return null;

  return (
    <view
      className={`icon ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, color }}
    >
      <text className="icon__svg" style={{ width: `${size}px`, height: `${size}px` }}>
        <svg
          viewBox={def.vb}
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {def.body}
        </svg>
      </text>
    </view>
  );
}

export default Icon;
export { type IconName } from './icon-map';

/** 将 emoji 字符串映射为 IconName，未匹配则返回 fallback */
export function emojiToIconName(emoji: string | undefined, fallback: IconName = 'medal'): IconName {
  if (!emoji) return fallback;
  const map: Record<string, IconName> = {
    '🏅': 'medal',
    '🏆': 'trophy',
    '🎖️': 'medal',
    '🎖': 'medal',
    '🥇': 'medal',
    '🥈': 'silver',
    '🥉': 'bronze',
    '🌸': 'flower',
    '⭐': 'star',
    '☆': 'star-outline',
    '🏠': 'house',
    '🔑': 'key',
    '🔒': 'lock',
    '❤️': 'heart',
    '❤': 'heart',
    '👍': 'thumbs-up',
    '👎': 'thumbs-down',
    '🤝': 'handshake',
    '🤲': 'hands-up',
    '💬': 'chat',
    '📋': 'clipboard',
    '📝': 'memo',
    '🔔': 'bell',
    '📢': 'megaphone',
    '🗳️': 'vote',
    '📦': 'box',
    '🔧': 'wrench',
    '🐾': 'paw',
    '👥': 'people',
    '👤': 'person',
    '👑': 'crown',
    '☀️': 'sun',
    '💡': 'bulb',
    '⚙️': 'gear',
    '📊': 'chart',
    '💌': 'envelope',
    '📑': 'documents',
    '🏘️': 'community',
    '🏛️': 'building',
    '🆘': 'help',
    '✅': 'check-circle',
    '⏳': 'clock',
    '⚠️': 'warning',
    '🚫': 'block',
    '🎉': 'party',
  };
  return map[emoji.trim()] ?? fallback;
}

import { type IconName } from './icon-map';
import './index.scss';

// ponytail: SVG 图标在微信小程序中不渲染（不支持 <svg> 标签），
//           改用 emoji 字符替代。icon-map.tsx 的 SVG body 保留供 H5 端后续使用。
//           升级路径: 用 base64 SVG data URI + <Image> 组件，或接入图标字体。
const EMOJI_MAP: Record<IconName, string> = {
  back: '←',
  bell: '🔔',
  block: '🚫',
  books: '📚',
  box: '📦',
  bronze: '🥉',
  building: '🏛️',
  camera: '📷',
  cart: '🛒',
  chair: '🪑',
  chat: '💬',
  chart: '📊',
  check: '✓',
  'check-circle': '✅',
  clock: '⏳',
  clipboard: '📋',
  close: '✕',
  community: '🏘️',
  confused: '😕',
  crown: '👑',
  document: '📄',
  documents: '📑',
  door: '🚪',
  edit: '✏️',
  envelope: '💌',
  eye: '👁️',
  flag: '🚩',
  flower: '🌸',
  gear: '⚙️',
  gift: '🎁',
  heart: '❤️',
  house: '🏠',
  inbox: '📥',
  key: '🔑',
  leaf: '🍃',
  location: '📍',
  lock: '🔒',
  medal: '🏅',
  megaphone: '📢',
  memo: '📝',
  party: '🎉',
  paw: '🐾',
  person: '👤',
  phone: '📱',
  plus: '➕',
  recycle: '♻️',
  ribbon: '🎀',
  robot: '🤖',
  sad: '😢',
  search: '🔍',
  send: '📤',
  silver: '🥈',
  star: '⭐',
  'star-outline': '☆',
  sun: '☀️',
  'thumbs-up': '👍',
  'thumbs-down': '👎',
  trash: '🗑️',
  trophy: '🏆',
  vote: '🗳️',
  warning: '⚠️',
  wrench: '🔧',
  help: '❓',
  'hands-up': '🤲',
  handshake: '🤝',
  bulb: '💡',
  plug: '🔌',
  cat: '🐱',
  teddy: '🧸',
  people: '👥',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

function Icon({ name, size = 24, color = '#5B9E6F', className = '' }: IconProps) {
  const emoji = EMOJI_MAP[name];
  if (!emoji) return null;

  return (
    <view
      className={`icon ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, color }}
    >
      <text style={{ fontSize: `${size * 0.8}px` }}>{emoji}</text>
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

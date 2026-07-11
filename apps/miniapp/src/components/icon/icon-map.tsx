/**
 * 手绘 SVG 图标库
 * 从 docs/design-mockups/ 提取，颜色统一用 currentColor（由父级 color 控制）
 * fillOpacity={0.07} 模拟手绘淡色填充
 * viewBox 统一 0 0 24 24（部分装饰图标除外）
 */

export type IconName =
  | 'back'
  | 'bell'
  | 'block'
  | 'books'
  | 'box'
  | 'bronze'
  | 'building'
  | 'camera'
  | 'cart'
  | 'chair'
  | 'chat'
  | 'chart'
  | 'check'
  | 'check-circle'
  | 'clock'
  | 'clipboard'
  | 'close'
  | 'community'
  | 'confused'
  | 'crown'
  | 'document'
  | 'documents'
  | 'door'
  | 'edit'
  | 'envelope'
  | 'eye'
  | 'flag'
  | 'flower'
  | 'gear'
  | 'gift'
  | 'heart'
  | 'house'
  | 'inbox'
  | 'key'
  | 'leaf'
  | 'location'
  | 'lock'
  | 'medal'
  | 'megaphone'
  | 'memo'
  | 'party'
  | 'paw'
  | 'person'
  | 'phone'
  | 'plus'
  | 'recycle'
  | 'ribbon'
  | 'robot'
  | 'sad'
  | 'search'
  | 'send'
  | 'silver'
  | 'star'
  | 'star-outline'
  | 'sun'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'trash'
  | 'trophy'
  | 'vote'
  | 'warning'
  | 'wrench'
  | 'help'
  | 'hands-up'
  | 'handshake'
  | 'bulb'
  | 'plug'
  | 'cat'
  | 'teddy'
  | 'people';

interface IconDef {
  vb: string;
  body: React.ReactNode;
}

export const ICON_MAP: Record<IconName, IconDef> = {
  back: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M16 4L8 12L16 20"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  bell: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M6 4C5 4 4 5 4 6V8H20V6C20 5 19 4 18 4"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M5 8V18C5 19 6 20 7 20H17C18 20 19 19 19 18V8"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M10 4V2H14V4"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="14" r="2.5" fill="currentColor" />
      </>
    ),
  },
  block: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} fill="none" />
        <path d="M6 6L18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  books: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="4"
          y="4"
          width="5"
          height="16"
          rx="1"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <rect
          x="10"
          y="8"
          width="5"
          height="12"
          rx="1"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M16 6L20 7L17 21L13 20"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  box: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 8L12 4L20 8V18L12 22L4 18Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M4 8L12 12L20 8M12 12V22"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  bronze: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="9"
          r="6"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 15L8 22L12 20L16 22L15 15"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <text x="12" y="12" fontSize="8" fill="currentColor" textAnchor="middle" fontWeight="bold">
          3
        </text>
      </>
    ),
  },
  building: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 10C4 9 5 8 6 8H8L16 4V20L8 16H6C5 16 4 15 4 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M16 8C18 8 20 10 20 12C20 14 18 16 16 16"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path d="M3 20H16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  camera: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="3"
          y="8"
          width="18"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
        />
        <path
          d="M8 8L9 5H15L16 8"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <circle
          cx="12"
          cy="14"
          r="3.5"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  cart: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M3 4H5L7 16H19L21 8H7"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="9" cy="20" r="1.5" stroke="currentColor" strokeWidth={2} />
        <circle cx="18" cy="20" r="1.5" stroke="currentColor" strokeWidth={2} />
      </>
    ),
  },
  chair: {
    vb: '0 0 24 24',
    body: (
      <>
        <path d="M8 4V14M16 4V14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M6 10H18V14C18 17 15 20 12 20C9 20 6 17 6 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  chat: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 6C4 5 5 4 6 4H18C19 4 20 5 20 6V14C20 15 19 16 18 16H12L8 20V16H6C5 16 4 15 4 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M8 8H16M8 12H13" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  chart: {
    vb: '0 0 24 24',
    body: (
      <>
        <path d="M4 20H20" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M7 20V14M12 20V8M17 20V11"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <rect x="5" y="12" width="4" height="2" rx="1" fill="currentColor" fillOpacity={0.3} />
        <rect x="10" y="6" width="4" height="2" rx="1" fill="currentColor" fillOpacity={0.3} />
        <rect x="15" y="9" width="4" height="2" rx="1" fill="currentColor" fillOpacity={0.3} />
      </>
    ),
  },
  check: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M5 12L10 17L19 7"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  'check-circle': {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M8 12L11 15L16 9"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  clock: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} fill="none" />
        <path
          d="M12 7V13L16 15"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  clipboard: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="17"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
        />
        <path
          d="M9 4V2H15V4"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path d="M8 10H16M8 14H13" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  close: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    ),
  },
  community: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 11L12 4L20 11V20H15V14H9V20H4Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M10 20V16H14V20"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  confused: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 10L9.01 10M15 10L15.01 10"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="M8 16C9 15 10 15 12 16C14 17 15 16 16 15"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  crown: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 18L6 8L10 12L12 6L14 12L18 8L20 18Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M4 18H20" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <circle cx="6" cy="8" r="1" fill="currentColor" />
        <circle cx="12" cy="6" r="1" fill="currentColor" />
        <circle cx="18" cy="8" r="1" fill="currentColor" />
      </>
    ),
  },
  document: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M6 3C5 3 4 4 4 5V21L8 19L12 21L16 19L20 21V5C20 4 19 3 18 3Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M8 8H16M8 12H14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  documents: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M6 3C5 3 4 4 4 5V21L8 19L12 21L16 19L20 21V5C20 4 19 3 18 3Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M8 8H16M8 12H14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <path d="M3 7L21 7" stroke="currentColor" strokeWidth={1} opacity={0.3} />
      </>
    ),
  },
  door: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M6 3H18V21H6Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
        <path d="M3 21H21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  edit: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M14 4L20 10L10 20L4 20L4 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M14 4L20 10" stroke="currentColor" strokeWidth={2} />
        <path d="M4 20L10 14" stroke="currentColor" strokeWidth={1.5} strokeDasharray="2 2" />
      </>
    ),
  },
  envelope: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="3"
          y="6"
          width="18"
          height="13"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M3 8L12 14L21 8"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  eye: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M2 12C2 12 6 6 12 6C18 6 22 12 22 12C22 12 18 18 12 18C6 18 2 12 2 12Z"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.5} fill="none" />
      </>
    ),
  },
  flag: {
    vb: '0 0 24 24',
    body: (
      <>
        <path d="M5 4V21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M5 4H18L15 8L18 12H5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  flower: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <ellipse cx="12" cy="5" rx="2.5" ry="3" fill="currentColor" opacity={0.5} />
        <ellipse cx="12" cy="19" rx="2.5" ry="3" fill="currentColor" opacity={0.5} />
        <ellipse cx="5" cy="12" rx="3" ry="2.5" fill="currentColor" opacity={0.5} />
        <ellipse cx="19" cy="12" rx="3" ry="2.5" fill="currentColor" opacity={0.5} />
      </>
    ),
  },
  gear: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} fill="none" />
        <path
          d="M12 2L13 4.5L15.5 4L16 6.5L18.5 7.5L17.5 10L19.5 12L17.5 14L18.5 16.5L16 17.5L15.5 20L13 19.5L12 22L11 19.5L8.5 20L8 17.5L5.5 16.5L6.5 14L4.5 12L6.5 10L5.5 7.5L8 6.5L8.5 4L11 4.5Z"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  gift: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="3"
          y="9"
          width="18"
          height="4"
          rx="1"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M5 13V20H19V13"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M12 9V20" stroke="currentColor" strokeWidth={2} />
        <path
          d="M12 9C10 6 6 6 6 8C6 9 8 9 12 9ZM12 9C14 6 18 6 18 8C18 9 16 9 12 9Z"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="none"
        />
      </>
    ),
  },
  heart: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M12 20C8 17 4 14 4 10C4 7 6 5 9 5C10 5 11 6 12 7C13 6 14 5 15 5C18 5 20 7 20 10C20 14 16 17 12 20Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.07}
      />
    ),
  },
  house: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 11L12 4L20 11V20H15V14H9V20H4Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M10 20V16H14V20"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  inbox: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 12L6 4H18L20 12V18C20 19 19 20 18 20H6C5 20 4 19 4 18Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M4 12H9L10 14H14L15 12H20"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  key: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="8"
          cy="8"
          r="4"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M11 11L20 20M17 17L20 14"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </>
    ),
  },
  leaf: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 20C4 12 8 4 20 4C20 16 12 20 4 20Z"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="currentColor"
          fillOpacity={0.1}
        />
        <path d="M4 20L12 12" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
      </>
    ),
  },
  location: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M12 3C8 3 5 6 5 10C5 14 12 21 12 21C12 21 19 14 19 10C19 6 16 3 12 3Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth={1.5} fill="none" />
      </>
    ),
  },
  lock: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="5"
          y="11"
          width="14"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
        />
        <path
          d="M8 11V8C8 5 10 3 12 3C14 3 16 5 16 8V11"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  medal: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M8 4H16V12C16 14 14 16 12 16C10 16 8 14 8 12Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M12 16V20M8 22H16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M4 6C3 6 2 7 2 8C2 10 3 11 4 11"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 6C21 6 22 7 22 8C22 10 21 11 20 11"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  megaphone: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 10C4 9 5 8 6 8H8L16 4V20L8 16H6C5 16 4 15 4 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M16 8C18 8 20 10 20 12C20 14 18 16 16 16"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path d="M3 20H8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  memo: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M6 3H18V21L15 18L12 21L9 18L6 21Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M9 8H15M9 12H13" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  party: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 20L10 4L20 10Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M14 4L16 2M18 8L20 6M12 6L14 4"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </>
    ),
  },
  paw: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M14 4L20 10L10 20L4 20L4 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <circle cx="17" cy="7" r="2" stroke="currentColor" strokeWidth={1.5} fill="none" />
        <circle cx="7" cy="8" r="1.5" fill="currentColor" opacity={0.5} />
        <circle cx="10" cy="5" r="1.5" fill="currentColor" opacity={0.5} />
        <circle cx="5" cy="12" r="1.5" fill="currentColor" opacity={0.5} />
      </>
    ),
  },
  person: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={2} fill="none" />
        <path
          d="M4 21C4 16 8 14 12 14C16 14 20 16 20 21"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  phone: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="7"
          y="3"
          width="10"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M11 18H13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  plus: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
    ),
  },
  recycle: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M12 4L8 11H16Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M8 14L4 14L6 18"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M16 14L20 14L18 18"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M10 18H14L12 21Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  ribbon: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M3 12L7 8L12 10L17 8L21 12L17 16L12 14L7 16Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.07}
      />
    ),
  },
  robot: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="5"
          y="8"
          width="14"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M12 4V8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <circle cx="12" cy="3" r="1" fill="currentColor" />
        <circle cx="9" cy="13" r="1.5" fill="currentColor" />
        <circle cx="15" cy="13" r="1.5" fill="currentColor" />
        <path d="M9 17H15" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  sad: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 10L9.01 10M15 10L15.01 10"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="M8 16C9 17 10 17 12 16C14 15 15 16 16 17"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  search: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={2} fill="none" />
        <path d="M16 16L21 21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  send: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M4 12L20 4L12 20L10 14Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.07}
      />
    ),
  },
  silver: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="9"
          r="6"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 15L8 22L12 20L16 22L15 15"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <text x="12" y="12" fontSize="8" fill="currentColor" textAnchor="middle" fontWeight="bold">
          2
        </text>
      </>
    ),
  },
  star: {
    vb: '0 0 24 24',
    body: (
      <path
        d="M12 4L14.5 9L20 10L16 14L17 19L12 16.5L7 19L8 14L4 10L9.5 9Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        fill="currentColor"
      />
    ),
  },
  'star-outline': {
    vb: '0 0 24 24',
    body: (
      <path
        d="M12 4L14.5 9L20 10L16 14L17 19L12 16.5L7 19L8 14L4 10L9.5 9Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  sun: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="12"
          r="4"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M12 3V5M12 19V21M3 12H5M19 12H21M5.5 5.5L7 7M17 17L18.5 18.5M5.5 18.5L7 17M17 7L18.5 5.5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </>
    ),
  },
  'thumbs-up': {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 11H8V20H4Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M8 11L12 4C14 4 14 6 13 8L12 11H18C19 11 20 12 20 13L19 18C19 19 18 20 17 20H8"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  'thumbs-down': {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 13H8V4H4Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M8 13L12 20C14 20 14 18 13 16L12 13H18C19 13 20 12 20 11L19 6C19 5 18 4 17 4H8"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  trash: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M5 7H19M10 7V4H14V7M6 7L7 20H17L18 7"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M10 11V17M14 11V17"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </>
    ),
  },
  trophy: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M8 4H16V12C16 14 14 16 12 16C10 16 8 14 8 12Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M4 6C3 6 2 7 2 8C2 10 3 11 4 11"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M20 6C21 6 22 7 22 8C22 10 21 11 20 11"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path d="M12 16V20M8 22H16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  vote: {
    vb: '0 0 24 24',
    body: (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="17"
          rx="2"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 4V2H15V4"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 11L10 13L16 8"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  warning: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M12 3L21 20H3Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M12 9V14M12 17V17.5"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </>
    ),
  },
  wrench: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M14 4L20 10L14 14L10 10Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M10 10L4 16L6 20L10 16L14 20"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
  },
  help: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M12 8V12M12 16V16.5"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </>
    ),
  },
  'hands-up': {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M8 4V10M16 4V10M6 10H18V14C18 17 15 20 12 20C9 20 6 17 6 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  handshake: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M4 12L8 8L12 10L16 8L20 12L16 16L12 14L8 16Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M12 10V14M8 8V12M16 8V12"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </>
    ),
  },
  bulb: {
    vb: '0 0 24 24',
    body: (
      <>
        <path d="M9 18H15M10 21H14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M12 3C8 3 5 6 5 9C5 12 8 14 8 16H16C16 14 19 12 19 9C19 6 16 3 12 3Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
      </>
    ),
  },
  plug: {
    vb: '0 0 24 24',
    body: (
      <>
        <path d="M10 4V8M14 4V8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M7 8H17V12C17 14 15 16 13 16H11C9 16 7 14 7 12Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path d="M12 16V21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </>
    ),
  },
  cat: {
    vb: '0 0 24 24',
    body: (
      <>
        <path
          d="M5 9L5 4L8 7M19 9L19 4L16 7"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M5 9C5 8 6 7 7 7H17C18 7 19 8 19 9V14C19 17 16 20 12 20C8 20 5 17 5 14Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 12L9.01 12M15 12L15.01 12"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="M10 15L12 17L14 15"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  teddy: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth={2} fill="none" />
        <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth={2} fill="none" />
        <circle
          cx="12"
          cy="13"
          r="7"
          stroke="currentColor"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.07}
        />
        <path
          d="M9 13L9.01 13M15 13L15.01 13"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M10 16L12 18L14 16"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  people: {
    vb: '0 0 24 24',
    body: (
      <>
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth={2} fill="none" />
        <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth={2} fill="none" />
        <path
          d="M3 20C3 16 5 14 8 14C11 14 13 16 13 20"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M11 20C11 16 13 14 16 14C19 14 21 16 21 20"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
};

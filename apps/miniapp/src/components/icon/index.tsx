import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

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

function makeSvg(paths: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SVG_ICONS: Record<IconName, string> = {
  back: makeSvg('<path d="M15 18l-6-6 6-6"/>'),
  bell: makeSvg(
    '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>',
  ),
  block: makeSvg('<circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/>'),
  books: makeSvg(
    '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  ),
  box: makeSvg(
    '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  ),
  bronze: makeSvg(
    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>',
  ),
  building: makeSvg(
    '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="12" y1="6" x2="12.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/>',
  ),
  camera: makeSvg(
    '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
  ),
  cart: makeSvg(
    '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>',
  ),
  chair: makeSvg(
    '<path d="M6 19v2"/><path d="M18 19v2"/><path d="M4 11h16a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2z"/><path d="M6 11V5a2 2 0 012-2h8a2 2 0 012 2v6"/>',
  ),
  chat: makeSvg('<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'),
  chart: makeSvg(
    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  ),
  check: makeSvg('<polyline points="20 6 9 17 4 12"/>'),
  'check-circle': makeSvg(
    '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  ),
  clock: makeSvg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  clipboard: makeSvg(
    '<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
  ),
  close: makeSvg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  community: makeSvg(
    '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  ),
  confused: makeSvg(
    '<circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  ),
  crown: makeSvg('<path d="M2 4l3 12h14l3-12-5 5-5-5-5 5-5-5z"/><path d="M5 20h14"/>'),
  document: makeSvg(
    '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
  ),
  documents: makeSvg(
    '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M18 18h4a2 2 0 002-2V4a2 2 0 00-2-2h-8a2 2 0 00-2 2v2"/>',
  ),
  door: makeSvg(
    '<path d="M18 20V6a2 2 0 00-2-2H8a2 2 0 00-2 2v14"/><path d="M2 20h20"/><circle cx="14" cy="12" r="1"/>',
  ),
  edit: makeSvg(
    '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  ),
  envelope: makeSvg(
    '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  ),
  eye: makeSvg(
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  ),
  flag: makeSvg(
    '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  ),
  flower: makeSvg(
    '<circle cx="12" cy="12" r="3"/><path d="M12 5a3 3 0 00-3 3c0 2 3 4 3 4s3-2 3-4a3 3 0 00-3-3z"/><path d="M19 12a3 3 0 00-3-3c-2 0-4 3-4 3s2 3 4 3a3 3 0 003-3z"/><path d="M12 19a3 3 0 003-3c0-2-3-4-3-4s-3 2-3 4a3 3 0 003 3z"/><path d="M5 12a3 3 0 003 3c2 0 4-3 4-3s-2-3-4-3a3 3 0 00-3 3z"/>',
  ),
  gear: makeSvg(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
  ),
  gift: makeSvg(
    '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>',
  ),
  heart: makeSvg(
    '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
  ),
  house: makeSvg(
    '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  ),
  inbox: makeSvg(
    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  ),
  key: makeSvg(
    '<path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6l7-7-2-2z"/>',
  ),
  leaf: makeSvg(
    '<path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  ),
  location: makeSvg(
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
  ),
  lock: makeSvg(
    '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  ),
  medal: makeSvg(
    '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  ),
  megaphone: makeSvg(
    '<path d="M3 11l15-7v16l-15-7z"/><path d="M11.6 16.8l2.4 4.2a1 1 0 001.4.4l1.6-.9a1 1 0 00.4-1.4L15 15"/>',
  ),
  memo: makeSvg(
    '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  ),
  party: makeSvg(
    '<path d="M5.8 11.3L2 22l10.7-3.8L5.8 11.3z"/><path d="M4 3h.01"/><path d="M20 7h.01"/><path d="M15 2h.01"/><path d="M18 15h.01"/><path d="M12 9h.01"/>',
  ),
  paw: makeSvg(
    '<circle cx="12" cy="14" r="3"/><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  ),
  person: makeSvg(
    '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  ),
  phone: makeSvg(
    '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>',
  ),
  plus: makeSvg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  recycle: makeSvg(
    '<path d="M7 19H4.81a2 2 0 01-1.73-3l1.1-1.9M17 19h2.19a2 2 0 001.73-3l-1.1-1.9M12 4.5l3.82 6.62M12 4.5L8.18 11.12"/>',
  ),
  ribbon: makeSvg('<circle cx="12" cy="8" r="6"/><path d="M15.5 13L17 22l-5-3-5 3 1.5-9"/>'),
  robot: makeSvg(
    '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/>',
  ),
  sad: makeSvg(
    '<circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  ),
  search: makeSvg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  send: makeSvg(
    '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  ),
  silver: makeSvg(
    '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>',
  ),
  star: makeSvg(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ),
  'star-outline': makeSvg(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ),
  sun: makeSvg(
    '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  ),
  'thumbs-up': makeSvg(
    '<path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>',
  ),
  'thumbs-down': makeSvg(
    '<path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/>',
  ),
  trash: makeSvg(
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
  ),
  trophy: makeSvg(
    '<path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2"/><path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8v4h8v-4h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/>',
  ),
  vote: makeSvg(
    '<path d="M18 8H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2z"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="4" x2="12" y2="12"/>',
  ),
  warning: makeSvg(
    '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  ),
  wrench: makeSvg(
    '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>',
  ),
  help: makeSvg(
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  ),
  'hands-up': makeSvg(
    '<path d="M7 11V7a2 2 0 014 0v4"/><path d="M13 11V6a2 2 0 014 0v5"/><path d="M4 14a8 8 0 0016 0"/>',
  ),
  handshake: makeSvg(
    '<path d="M11 17l-5-5a3.5 3.5 0 010-5 3.5 3.5 0 015 0l1 1 1-1a3.5 3.5 0 015 0 3.5 3.5 0 010 5l-5 5-2 2-2-2z"/>',
  ),
  bulb: makeSvg(
    '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .5 2.5 1.5 3.5.76.76 1.23 1.52 1.41 2.5h6.18z"/>',
  ),
  plug: makeSvg(
    '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 01-12 0V8z"/>',
  ),
  cat: makeSvg(
    '<path d="M12 5c-4 0-7 2.5-7 6 0 2 .8 4 2 5l-1 4 4-2c.6.3 1.3.5 2 .5s1.4-.2 2-.5l4 2-1-4c1.2-1 2-3 2-5 0-3.5-3-6-7-6z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>',
  ),
  teddy: makeSvg(
    '<circle cx="12" cy="13" r="6"/><circle cx="6" cy="7" r="3"/><circle cx="18" cy="7" r="3"/><circle cx="9.5" cy="12" r="1"/><circle cx="14.5" cy="12" r="1"/><circle cx="12" cy="15" r="1.5"/>',
  ),
  people: makeSvg(
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

function Icon({ name, size = 24, color = '#5B9E6F', className = '' }: IconProps) {
  const svgUri = SVG_ICONS[name];
  if (!svgUri) return null;

  const sizeTransform = Taro.pxTransform ? Taro.pxTransform(size) : `${size}px`;

  return (
    <View
      className={`xq-icon ${className}`}
      style={{
        width: sizeTransform,
        height: sizeTransform,
        WebkitMaskImage: `url("${svgUri}")`,
        maskImage: `url("${svgUri}")`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        backgroundColor: color,
      }}
    />
  );
}

export default Icon;

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

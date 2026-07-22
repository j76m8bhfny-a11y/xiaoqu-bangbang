import { PetSubType } from '@xiaoqu-bangbang/shared';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'radio' | 'checkbox' | 'switch' | 'date-range' | 'image';
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export const FEED_FIELDS: FieldConfig[] = [
  {
    name: 'petType',
    label: '宠物种类',
    type: 'radio',
    required: true,
    options: [
      { label: '猫', value: 'cat' },
      { label: '狗', value: 'dog' },
      { label: '鱼', value: 'fish' },
      { label: '其他', value: 'other' },
    ],
  },
  { name: 'petName', label: '宠物名字', type: 'text', required: false, placeholder: '可选' },
  { name: 'feedsPerDay', label: '喂食次数/天', type: 'number', required: true },
  { name: 'totalDays', label: '总天数', type: 'number', required: true },
  { name: 'dateRange', label: '起止日期', type: 'date-range', required: true },
  { name: 'needClean', label: '需要清理猫砂/粪便', type: 'switch', required: false },
  {
    name: 'rewardType',
    label: '报酬',
    type: 'radio',
    required: true,
    options: [
      { label: '免费', value: 'free' },
      { label: '面议', value: 'negotiable' },
      { label: '具体金额', value: 'paid' },
    ],
  },
  { name: 'note', label: '备注', type: 'textarea', required: false },
];

export const WALK_FIELDS: FieldConfig[] = [
  {
    name: 'dogSize',
    label: '狗的体型',
    type: 'radio',
    required: true,
    options: [
      { label: '小型', value: 'small' },
      { label: '中型', value: 'medium' },
      { label: '大型', value: 'large' },
    ],
  },
  { name: 'dogName', label: '狗的名字', type: 'text', required: false, placeholder: '可选' },
  { name: 'timesPerDay', label: '每天次数', type: 'number', required: true },
  { name: 'durationPerTime', label: '每次时长（分钟）', type: 'number', required: true },
  {
    name: 'timeSlots',
    label: '时间段要求',
    type: 'checkbox',
    required: true,
    options: [
      { label: '早上', value: 'morning' },
      { label: '中午', value: 'noon' },
      { label: '傍晚', value: 'evening' },
      { label: '夜间', value: 'night' },
    ],
  },
  { name: 'needGear', label: '需要牵引绳/尿垫', type: 'switch', required: false },
  {
    name: 'rewardType',
    label: '报酬',
    type: 'radio',
    required: true,
    options: [
      { label: '免费', value: 'free' },
      { label: '面议', value: 'negotiable' },
      { label: '具体金额', value: 'paid' },
    ],
  },
  { name: 'note', label: '备注', type: 'textarea', required: false },
];

export const LOST_FIELDS: FieldConfig[] = [
  { name: 'petType', label: '宠物种类', type: 'text', required: true, placeholder: '如：猫/狗' },
  { name: 'breed', label: '品种', type: 'text', required: false, placeholder: '可选' },
  { name: 'name', label: '名字', type: 'text', required: false, placeholder: '可选' },
  { name: 'lostLocation', label: '走丢地点', type: 'text', required: true },
  {
    name: 'lostTime',
    label: '走丢时间',
    type: 'text',
    required: true,
    placeholder: '如：2026-07-20 10:00',
  },
  {
    name: 'appearance',
    label: '外观特征',
    type: 'textarea',
    required: false,
    placeholder: '毛色/体型/特殊标记',
  },
  { name: 'photos', label: '照片', type: 'image', required: false },
  {
    name: 'rewardType',
    label: '酬谢',
    type: 'radio',
    required: true,
    options: [
      { label: '免费', value: 'free' },
      { label: '面议', value: 'negotiable' },
      { label: '具体金额', value: 'paid' },
    ],
  },
  { name: 'note', label: '备注', type: 'textarea', required: false },
];

export function getFields(subType: string): FieldConfig[] {
  switch (subType) {
    case PetSubType.FEED:
      return FEED_FIELDS;
    case PetSubType.WALK:
      return WALK_FIELDS;
    case PetSubType.LOST:
      return LOST_FIELDS;
    default:
      return [];
  }
}

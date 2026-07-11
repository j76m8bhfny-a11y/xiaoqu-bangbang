import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import './index.scss';
import Icon from '@/components/icon';

const STORAGE_KEY = 'xbb_onboarded';

const STEPS: { emoji: string; title: string; desc: string }[] = [
  {
    emoji: 'house',
    title: '加入你的小区',
    desc: '上传房产证或租房合同，1 分钟完成业主认证，解锁全部小区功能',
  },
  {
    emoji: 'handshake',
    title: '互助 · 闲置 · 反馈',
    desc: '发邻里求助、闲置交易、公共反馈，一个 App 搞定小区生活',
  },
  {
    emoji: 'medal',
    title: '积累贡献',
    desc: '帮助他人能赢得小红花与勋章，登上小区贡献榜',
  },
];

export function shouldShowOnboarding(): boolean {
  try {
    return !Taro.getStorageSync(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function markOnboarded() {
  try {
    Taro.setStorageSync(STORAGE_KEY, '1');
  } catch {
    /* noop */
  }
}

interface Props {
  onDone: () => void;
}

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    markOnboarded();
    onDone();
  };

  const handleNext = () => {
    if (isLast) finish();
    else setStep(step + 1);
  };

  return (
    <View className="onb__mask">
      <View className="onb__card" catchMove>
        <Text className="onb__skip" onClick={finish}>
          跳过
        </Text>
        <View className="onb__emoji">
          <Icon name={current.emoji as any} size={64} color="#5B9E6F" />
        </View>
        <Text className="onb__title">{current.title}</Text>
        <Text className="onb__desc">{current.desc}</Text>
        <View className="onb__dots">
          {STEPS.map((_, i) => (
            <View key={i} className={`onb__dot ${i === step ? 'onb__dot--active' : ''}`} />
          ))}
        </View>
        <View className="onb__btn" onClick={handleNext}>
          <Text className="onb__btn-text">{isLast ? '开始体验' : '下一步'}</Text>
        </View>
      </View>
    </View>
  );
}

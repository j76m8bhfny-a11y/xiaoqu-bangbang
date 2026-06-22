import { View, Text } from '@tarojs/components';
import type { ReactNode } from 'react';
import './index.scss';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <>
      <View
        className={`bottom-sheet-overlay ${visible ? '' : 'bottom-sheet-overlay--hidden'}`}
        onClick={onClose}
      />
      <View className={`bottom-sheet ${visible ? '' : 'bottom-sheet--hidden'}`}>
        <View className='bottom-sheet__handle'>
          <View className='bottom-sheet__handle-bar' />
        </View>
        {title && (
          <View className='bottom-sheet__header'>
            <Text className='bottom-sheet__title'>{title}</Text>
            <View className='bottom-sheet__close' onClick={onClose}>
              <Text className='bottom-sheet__close-text'>x</Text>
            </View>
          </View>
        )}
        <View className='bottom-sheet__body'>
          {children}
        </View>
      </View>
    </>
  );
}

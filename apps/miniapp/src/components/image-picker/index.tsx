import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { http } from '@/services';
import './index.scss';

interface ImagePickerProps {
  images: string[];
  maxCount?: number;
  onChange: (images: string[]) => void;
}

export default function ImagePicker({ images, maxCount = 9, onChange }: ImagePickerProps) {
  const handleChoose = async () => {
    const remain = maxCount - images.length;
    if (remain <= 0) return;

    try {
      const res = await Taro.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sizeType: ['compressed'],
      });

      const urls: string[] = [];
      for (const file of res.tempFiles) {
        try {
          const result = await http.upload(file.tempFilePath);
          urls.push(result.url);
        } catch {
          Taro.showToast({ title: '图片上传失败', icon: 'none' });
        }
      }

      if (urls.length > 0) {
        onChange([...images, ...urls]);
      }
    } catch {
      // user cancelled
    }
  };

  const handlePreview = (index: number) => {
    Taro.previewImage({ urls: images, current: images[index] });
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <View className='image-picker'>
      {images.map((img, idx) => (
        <View key={img} className='image-picker__item'>
          <Image className='image-picker__image' src={img} mode='aspectFill' onClick={() => handlePreview(idx)} />
          <View className='image-picker__remove' onClick={() => handleRemove(idx)}>
            <Text className='image-picker__remove-text'>×</Text>
          </View>
        </View>
      ))}
      {images.length < maxCount && (
        <View className='image-picker__add' onClick={handleChoose}>
          <Text className='image-picker__add-icon'>+</Text>
          <Text className='image-picker__add-label'>添加图片</Text>
        </View>
      )}
    </View>
  );
}

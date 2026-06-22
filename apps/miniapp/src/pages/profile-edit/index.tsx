import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { authService } from '@/services';
import { useAuthStore } from '@/store';
import './index.scss';

export default function ProfileEdit() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  const handleSubmit = async () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.updateMe({
        nickname: nickname.trim(),
        bio: bio.trim() || undefined,
      });
      updateUser(result);
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const avatarEmoji = nickname.trim() ? nickname.trim()[0] : '?';

  return (
    <View className='profile-edit'>
      <View className='profile-edit__avatar-section'>
        <View className='profile-edit__avatar'>
          <Text className='profile-edit__avatar-text'>{avatarEmoji}</Text>
        </View>
      </View>

      <View className='profile-edit__form'>
        <View className='profile-edit__field'>
          <Text className='profile-edit__label'>昵称</Text>
          <Input
            className='profile-edit__input'
            placeholder='请输入昵称'
            placeholderClass='profile-edit__placeholder'
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
            maxlength={20}
          />
        </View>

        <View className='profile-edit__field'>
          <Text className='profile-edit__label'>个人简介</Text>
          <Textarea
            className='profile-edit__textarea'
            placeholder='介绍一下自己吧...'
            placeholderClass='profile-edit__placeholder'
            value={bio}
            onInput={(e) => setBio(e.detail.value)}
            maxlength={200}
            autoHeight
          />
        </View>
      </View>

      <View
        className={`profile-edit__submit ${submitting ? 'profile-edit__submit--disabled' : ''}`}
        onClick={submitting ? undefined : handleSubmit}
      >
        <Text className='profile-edit__submit-text'>
          {submitting ? '保存中...' : '保存'}
        </Text>
      </View>
    </View>
  );
}

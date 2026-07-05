import { View, Text, Input, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useCallback } from 'react';
import { authService, http, userService } from '@/services';
import { useRequest } from '@/hooks';
import { useAuthStore } from '@/store';
import type { UserSkillDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

export default function ProfileEdit() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [wechatId, setWechatId] = useState((user as any)?.wechatId ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 技能管理
  const { data: skillsData, refresh: refreshSkills } = useRequest<{ items: UserSkillDto[] }>(
    () => userService.getMySkills(),
    [],
    { enabled: !!user },
  );
  const skills = skillsData?.items ?? [];
  const [skillFormVisible, setSkillFormVisible] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillTitle, setSkillTitle] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  const handleAddSkill = useCallback(() => {
    setEditingSkillId(null);
    setSkillTitle('');
    setSkillDesc('');
    setSkillFormVisible(true);
  }, []);

  const handleEditSkill = useCallback((skill: UserSkillDto) => {
    setEditingSkillId(skill.id);
    setSkillTitle(skill.title);
    setSkillDesc(skill.description ?? '');
    setSkillFormVisible(true);
  }, []);

  const handleDeleteSkill = useCallback(
    async (skillId: string) => {
      try {
        const res = await Taro.showModal({ title: '确认', content: '确定删除该技能吗？' });
        if (!res.confirm) return;
        await userService.deleteSkill(skillId);
        Taro.showToast({ title: '已删除', icon: 'success' });
        refreshSkills();
      } catch {
        Taro.showToast({ title: '删除失败', icon: 'none' });
      }
    },
    [refreshSkills],
  );

  const handleSaveSkill = useCallback(async () => {
    if (!skillTitle.trim()) {
      Taro.showToast({ title: '请填写技能标题', icon: 'none' });
      return;
    }
    setSkillSubmitting(true);
    try {
      const data = { title: skillTitle.trim(), description: skillDesc.trim() || undefined };
      if (editingSkillId) {
        await userService.updateSkill(editingSkillId, data);
      } else {
        await userService.createSkill(data);
      }
      Taro.showToast({ title: '保存成功', icon: 'success' });
      setSkillFormVisible(false);
      refreshSkills();
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      setSkillSubmitting(false);
    }
  }, [skillTitle, skillDesc, editingSkillId, refreshSkills]);

  if (!user) {
    Taro.redirectTo({ url: '/pages/login/index' });
    return null;
  }

  const handleAvatarChange = async () => {
    if (avatarUploading) return;
    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
      });
      const file = res.tempFiles[0];
      if (!file) return;
      setAvatarUploading(true);
      const result = await http.upload(file.tempFilePath);
      setAvatarUrl(result.url);
    } catch (err: any) {
      if (err?.errMsg?.includes('cancel')) return;
      Taro.showToast({ title: '图片上传失败', icon: 'none' });
    } finally {
      setAvatarUploading(false);
    }
  };

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
        avatarUrl: avatarUrl || undefined,
        wechatId: wechatId.trim() || undefined,
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
    <View className="profile-edit">
      <View className="profile-edit__avatar-section" onClick={handleAvatarChange}>
        {avatarUrl ? (
          <Image className="profile-edit__avatar" src={avatarUrl} mode="aspectFill" />
        ) : (
          <View className="profile-edit__avatar">
            <Text className="profile-edit__avatar-text">{avatarEmoji}</Text>
          </View>
        )}
        <Text className="profile-edit__avatar-hint">
          {avatarUploading ? '上传中...' : '点击更换头像'}
        </Text>
      </View>

      <View className="profile-edit__form">
        <View className="profile-edit__field">
          <Text className="profile-edit__label">昵称</Text>
          <Input
            className="profile-edit__input"
            placeholder="请输入昵称"
            placeholderClass="profile-edit__placeholder"
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
            maxlength={20}
          />
        </View>

        <View className="profile-edit__field">
          <Text className="profile-edit__label">个人简介</Text>
          <Textarea
            className="profile-edit__textarea"
            placeholder="介绍一下自己吧..."
            placeholderClass="profile-edit__placeholder"
            value={bio}
            onInput={(e) => setBio(e.detail.value)}
            maxlength={200}
            autoHeight
          />
        </View>

        <View className="profile-edit__field">
          <Text className="profile-edit__label">微信号</Text>
          <Input
            className="profile-edit__input"
            placeholder="选填，方便邻居联系你"
            placeholderClass="profile-edit__placeholder"
            value={wechatId}
            onInput={(e) => setWechatId(e.detail.value)}
            maxlength={50}
          />
        </View>
      </View>

      {/* 技能管理
         ponytail: 技能图片上传暂未实现，后端 UserSkill.images 字段已就绪。
         升级路径：在 skill-form 中添加 Image 上传组件，复用 http.upload。 */}
      <View className="profile-edit__skills">
        <View className="profile-edit__skills-header">
          <Text className="profile-edit__skills-title">我能帮忙</Text>
          <Text className="profile-edit__skills-add" onClick={handleAddSkill}>
            + 添加技能
          </Text>
        </View>

        {skillFormVisible && (
          <View className="profile-edit__skill-form">
            <Input
              className="profile-edit__skill-input"
              placeholder="技能标题（如：修电脑、代收快递）"
              placeholderClass="profile-edit__placeholder"
              value={skillTitle}
              onInput={(e) => setSkillTitle(e.detail.value)}
              maxlength={50}
            />
            <Textarea
              className="profile-edit__skill-textarea"
              placeholder="详细描述（可选）"
              placeholderClass="profile-edit__placeholder"
              value={skillDesc}
              onInput={(e) => setSkillDesc(e.detail.value)}
              maxlength={500}
              autoHeight
            />
            <View className="profile-edit__skill-form-actions">
              <Text
                className="profile-edit__skill-form-btn profile-edit__skill-form-btn--cancel"
                onClick={() => setSkillFormVisible(false)}
              >
                取消
              </Text>
              <Text
                className="profile-edit__skill-form-btn profile-edit__skill-form-btn--save"
                onClick={skillSubmitting ? undefined : handleSaveSkill}
              >
                {skillSubmitting ? '保存中...' : '保存'}
              </Text>
            </View>
          </View>
        )}

        {skills.length === 0 && !skillFormVisible && (
          <Text className="profile-edit__skills-empty">还没有添加技能，点击"添加技能"开始</Text>
        )}

        {skills.map((skill) => (
          <View key={skill.id} className="profile-edit__skill-item">
            <View className="profile-edit__skill-body">
              <Text className="profile-edit__skill-title">{skill.title}</Text>
              {skill.description && (
                <Text className="profile-edit__skill-desc">{skill.description}</Text>
              )}
            </View>
            <View className="profile-edit__skill-actions">
              <Text className="profile-edit__skill-action" onClick={() => handleEditSkill(skill)}>
                编辑
              </Text>
              <Text
                className="profile-edit__skill-action profile-edit__skill-action--danger"
                onClick={() => handleDeleteSkill(skill.id)}
              >
                删除
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        className={`profile-edit__submit ${submitting ? 'profile-edit__submit--disabled' : ''}`}
        onClick={submitting ? undefined : handleSubmit}
      >
        <Text className="profile-edit__submit-text">{submitting ? '保存中...' : '保存'}</Text>
      </View>
    </View>
  );
}

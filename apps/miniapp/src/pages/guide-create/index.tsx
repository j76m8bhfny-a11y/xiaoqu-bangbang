import { View, Text, Input, Textarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useRequest, useDraft } from '@/hooks';
import { guideService } from '@/services';
import { useAuthStore, useCommunityStore } from '@/store';
import { GuideCategory } from '@xiaoqu-bangbang/shared';
import type { GuideDetailDto } from '@xiaoqu-bangbang/shared';
import { GUIDE_CATEGORY_CONFIG } from '@/utils/mappers';
import ImagePicker from '@/components/image-picker';
import UnverifiedFormBanner from '@/components/unverified-form-banner';
import Loading from '@/components/loading';
import NavBar from '@/components/navbar';
import Icon from '@/components/icon';
import './index.scss';

const GUIDE_CATEGORIES = Object.keys(GUIDE_CATEGORY_CONFIG) as GuideCategory[];

export default function GuideCreate() {
  const id = Taro.getCurrentInstance().router?.params?.id;
  const isEdit = !!id;

  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const verifyStatus = useAuthStore((s) => s.user?.verifyStatus);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GuideCategory>(GuideCategory.OTHER);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit mode: fetch guide data
  const {
    data: guide,
    loading,
    error,
  } = useRequest<GuideDetailDto>(() => guideService.getById(id!), [id], { enabled: isEdit });

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (guide && !initialized) {
      setTitle(guide.title);
      setDescription(guide.description);
      setCategory(guide.category);
      setImages(guide.images ?? []);
      setInitialized(true);
    }
  }, [guide, initialized]);

  // Draft: only in create mode
  const [draftReady, setDraftReady] = useState(false);
  const draftState = { title, description, category, images };
  const { restore, clear, has } = useDraft('guide_create', draftState, {
    enabled: !isEdit && draftReady,
  });

  useEffect(() => {
    if (isEdit) {
      setDraftReady(true);
      return;
    }
    if (!has()) {
      setDraftReady(true);
      return;
    }
    Taro.showModal({
      title: '恢复草稿？',
      content: '上次填写的教程未提交，是否恢复？',
      confirmText: '恢复',
      cancelText: '丢弃',
      success: (res) => {
        if (res.confirm) {
          const d = restore();
          if (d) {
            setTitle(d.title ?? '');
            setDescription(d.description ?? '');
            setCategory(d.category ?? GuideCategory.OTHER);
            setImages(Array.isArray(d.images) ? d.images : []);
          }
        } else {
          clear();
        }
        setDraftReady(true);
      },
      fail: () => setDraftReady(true),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state in edit mode
  if (isEdit && loading) {
    return (
      <View className="guide-create">
        <View className="guide-create__loading">
          <Loading />
        </View>
      </View>
    );
  }

  // Error state in edit mode
  if (isEdit && (error || !guide)) {
    return (
      <View className="guide-create">
        <View className="guide-create__loading">
          <Text className="guide-create__loading-text">加载失败</Text>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!isEdit && verifyStatus !== 'verified') {
      Taro.showModal({
        title: '需要业主认证',
        content: '完成业主认证后才能发布教程，是否前往认证？',
        confirmText: '去认证',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/verify/index' });
        },
      });
      return;
    }
    if (!title.trim()) {
      Taro.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请填写描述', icon: 'none' });
      return;
    }
    if (!isEdit && !communityId) {
      Taro.showToast({ title: '请先选择小区', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await guideService.update(id!, {
          title: title.trim(),
          description: description.trim(),
          images,
          category,
        });
      } else {
        await guideService.create({
          title: title.trim(),
          description: description.trim(),
          images,
          category,
        });
        clear();
      }
      Taro.showToast({ title: isEdit ? '修改成功' : '发布成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : isEdit ? '修改失败' : '发布失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="guide-create">
      <NavBar title={isEdit ? '编辑指南' : '发布指南'} />
      <UnverifiedFormBanner tip="你尚未完成业主认证，无法发布教程" />
      <View className="guide-create__body">
        <View className="guide-create__card">
          <View className="guide-create__field">
            <Text className="guide-create__label">
              分类 <Text className="guide-create__required">*</Text>
            </Text>
            <View className="guide-create__category-list">
              {GUIDE_CATEGORIES.map((key) => {
                const cfg = GUIDE_CATEGORY_CONFIG[key];
                const isActive = category === key;
                return (
                  <View
                    key={key}
                    className={`guide-create__category-item ${isActive ? 'guide-create__category-item--active' : ''}`}
                    onClick={() => setCategory(key)}
                  >
                    <View className="guide-create__category-icon">
                      <Icon name={cfg.icon as any} size={24} />
                    </View>
                    <Text
                      className={`guide-create__category-label ${isActive ? 'guide-create__category-label--active' : ''}`}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="guide-create__field">
            <Text className="guide-create__label">
              标题 <Text className="guide-create__required">*</Text>
            </Text>
            <Input
              className="guide-create__input"
              placeholder="请输入教程标题"
              placeholderClass="guide-create__placeholder"
              value={title}
              onInput={(e) => setTitle(e.detail.value)}
              maxlength={50}
            />
          </View>

          <View className="guide-create__field">
            <Text className="guide-create__label">
              详细描述 <Text className="guide-create__required">*</Text>
            </Text>
            <Textarea
              className="guide-create__textarea"
              placeholder="请详细描述教程内容..."
              placeholderClass="guide-create__placeholder"
              value={description}
              onInput={(e) => setDescription(e.detail.value)}
              maxlength={2000}
              autoHeight
            />
          </View>

          <View className="guide-create__field">
            <Text className="guide-create__label">图片</Text>
            <ImagePicker images={images} onChange={setImages} maxCount={9} />
          </View>
        </View>
      </View>

      <View className="guide-create__footer">
        <View
          className={`guide-create__submit ${submitting ? 'guide-create__submit--disabled' : ''}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className="guide-create__submit-text">
            {submitting ? (isEdit ? '保存中...' : '发布中...') : isEdit ? '保存修改' : '发布'}
          </Text>
        </View>
      </View>
    </View>
  );
}

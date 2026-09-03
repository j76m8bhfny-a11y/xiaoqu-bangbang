import { useCallback } from 'react';
import Taro from '@tarojs/taro';
import { eventService, reportService } from '@/services';
import { EventType, ActionType, PetSubType } from '@xiaoqu-bangbang/shared';
import { EVENT_TYPE_TO_ACTION } from './constants';
import type { EventDto } from '@xiaoqu-bangbang/shared';
import { type ContactInfo } from './constants';

export interface EventDetailHandlersParams {
  id: string | undefined;
  event: EventDto | null;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setLiked: (v: boolean) => void;
  setFavorited: (v: boolean) => void;
  contactLoading: boolean;
  setContactLoading: (v: boolean) => void;
  setContactSheetVisible: (v: boolean) => void;
  setHasContacted: (v: boolean) => void;
  setContactInfo: (v: ContactInfo | null) => void;
  refresh: () => void;
  refreshComments: () => void;
  setHelperSheetVisible: (v: boolean) => void;
  ratingSubmitting: boolean;
  setRatingSubmitting: (v: boolean) => void;
  ratingStars: number;
  selectedTags: string[];
  ratingContent: string;
  ratingTargetUserId: string | null;
  setRatingTargetUserId: (v: string | null) => void;
  setHasRated: (v: boolean) => void;
  user: { id: string } | null;
}

export function useEventDetailHandlers(params: EventDetailHandlersParams) {
  const {
    id,
    event,
    submitting,
    setSubmitting,
    setLiked,
    setFavorited,
    contactLoading,
    setContactLoading,
    setContactSheetVisible,
    setHasContacted,
    setContactInfo,
    refresh,
    refreshComments,
    setHelperSheetVisible,
    ratingSubmitting,
    setRatingSubmitting,
    ratingStars,
    selectedTags,
    ratingContent,
    ratingTargetUserId,
    setRatingTargetUserId,
    setHasRated,
    user,
  } = params;

  const handleLike = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const result = await eventService.toggleLike(id);
      setLiked(result.liked);
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting]);

  const handleFavorite = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const result = await eventService.toggleFavorite(id);
      setFavorited(result.favorited);
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting]);

  const handleCta = useCallback(async () => {
    if (!event || submitting) return;
    // FE-2: pet_help 按 subType 取 actionType（feed/walk=HELP, lost=PROVIDE_CLUE）
    let actionType = EVENT_TYPE_TO_ACTION[event.type];
    if (event.type === EventType.PET_HELP) {
      actionType = event.subType === PetSubType.LOST ? ActionType.PROVIDE_CLUE : ActionType.HELP;
    }
    if (!actionType) return;
    setSubmitting(true);
    try {
      await eventService.respond(event.id, { actionType });
      Taro.showToast({ title: '已响应', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '响应失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [event, submitting]);

  const handleComment = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const res = (await Taro.showModal({
        title: '发表评论',
        editable: true,
        placeholderText: '说点什么...',
      } as any)) as any;
      if (res.confirm && res.content?.trim()) {
        await eventService.addComment(id, { content: res.content.trim() });
        Taro.showToast({ title: '评论成功', icon: 'success' });
        refreshComments();
        refresh();
      }
    } catch {
      Taro.showToast({ title: '评论失败', icon: 'none' });
    }
  }, [id, submitting, refreshComments, refresh]);

  const handleClose = useCallback(async () => {
    if (!id || submitting) return;
    try {
      const res = await Taro.showModal({ title: '确认', content: '确定要关闭此事件吗？' });
      if (res.confirm) {
        await eventService.close(id);
        Taro.showToast({ title: '已关闭', icon: 'success' });
        refresh();
      }
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  }, [id, submitting, refresh]);

  const handleSelectHelper = useCallback(
    async (applicationId: string) => {
      if (!id || submitting) return;
      setSubmitting(true);
      try {
        await eventService.selectHelper(id, applicationId);
        Taro.showToast({ title: '已选择帮手', icon: 'success' });
        setHelperSheetVisible(false);
        refresh();
      } catch {
        Taro.showToast({ title: '操作失败', icon: 'none' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting, refresh],
  );

  const handleSelectParticipant = useCallback(
    async (data: { applicationId: string }) => {
      if (!id || submitting) return;
      setSubmitting(true);
      try {
        await eventService.selectParticipant(id, data);
        Taro.showToast({ title: '已选择参与者', icon: 'success' });
        refresh();
      } catch (e: any) {
        const msg = e?.message ?? '操作失败';
        Taro.showToast({ title: msg, icon: 'none' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting, refresh],
  );

  const handleConfirmParticipant = useCallback(
    async (participantId: string) => {
      if (!id || submitting) return;
      setSubmitting(true);
      try {
        await eventService.confirmParticipant(id, participantId);
        Taro.showToast({ title: '已确认完成', icon: 'success' });
        refresh();
      } catch (e: any) {
        const msg = e?.message ?? '操作失败';
        Taro.showToast({ title: msg, icon: 'none' });
      } finally {
        setSubmitting(false);
      }
    },
    [id, submitting, refresh],
  );

  const handleRequestCompletion = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await eventService.requestCompletion(id);
      Taro.showToast({ title: '已申请完成', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, refresh]);

  const handleConfirmCompletion = useCallback(async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await eventService.confirmCompletion(id);
      Taro.showToast({ title: '已确认完成', icon: 'success' });
      refresh();
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, refresh]);

  const handleThanks = useCallback(
    async (toUserId?: string) => {
      if (!id || submitting) return;
      try {
        await eventService.sendThanks(id, toUserId);
        Taro.showToast({ title: '已送花感谢', icon: 'success' });
        refresh();
      } catch (e: any) {
        const msg = e?.message ?? '操作失败';
        Taro.showToast({ title: msg, icon: 'none' });
      }
    },
    [id, submitting, refresh],
  );

  const handleContact = useCallback(async () => {
    if (!id || contactLoading) return;
    setContactLoading(true);
    setContactSheetVisible(true);
    setHasContacted(true);
    try {
      const data = await eventService.getContactInfo(id);
      setContactInfo(data);
    } catch (e: any) {
      const msg = e?.message ?? '获取联系方式失败';
      Taro.showToast({ title: msg, icon: 'none' });
      setContactSheetVisible(false);
    } finally {
      setContactLoading(false);
    }
  }, [id, contactLoading]);

  const handleCallPhone = useCallback((phone: string) => {
    Taro.makePhoneCall({ phoneNumber: phone }).catch(() => {});
  }, []);

  const handleCopyWechat = useCallback((wechatId: string) => {
    Taro.setClipboardData({ data: wechatId });
  }, []);

  const handleReport = useCallback(async () => {
    if (!id) return;
    try {
      const res = await Taro.showActionSheet({
        itemList: ['隐私泄露', '虚假信息', '骚扰辱骂', '违法违规', '其他'],
      });
      const reasons = ['privacy', 'false_info', 'harassment', 'illegal', 'other'];
      await reportService.submit({
        targetType: 'event',
        targetId: id,
        reason: reasons[res.tapIndex],
      });
      Taro.showToast({ title: '举报成功', icon: 'success' });
    } catch {
      // cancelled or failed
    }
  }, [id]);

  const handleRateHelper = useCallback(async () => {
    if (!id || !event || ratingSubmitting) return;
    const isCreator = !!user?.id && user.id === event.creatorId;
    // 单帮手: creator -> selectedHelperId; 多帮手: creator -> ratingTargetUserId
    const targetUserId = isCreator
      ? (event.selectedHelperId ?? ratingTargetUserId)
      : event.creatorId;
    if (!targetUserId || ratingStars < 1) {
      Taro.showToast({ title: '请选择星级', icon: 'none' });
      return;
    }
    setRatingSubmitting(true);
    try {
      await eventService.rateEvent(id, {
        targetUserId,
        rating: ratingStars,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        content: ratingContent.trim() || undefined,
      });
      Taro.showToast({ title: '评价成功', icon: 'success' });
      setHasRated(true);
      setRatingTargetUserId(null);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('已评价过')) {
        setHasRated(true);
        setRatingTargetUserId(null);
        Taro.showToast({ title: '已评价过', icon: 'none' });
      } else {
        Taro.showToast({ title: msg || '评价失败', icon: 'none' });
      }
    } finally {
      setRatingSubmitting(false);
    }
  }, [
    id,
    event,
    user,
    ratingStars,
    selectedTags,
    ratingContent,
    ratingSubmitting,
    ratingTargetUserId,
  ]);

  return {
    handleLike,
    handleFavorite,
    handleCta,
    handleComment,
    handleClose,
    handleSelectHelper,
    handleSelectParticipant,
    handleConfirmParticipant,
    handleRequestCompletion,
    handleConfirmCompletion,
    handleThanks,
    handleContact,
    handleCallPhone,
    handleCopyWechat,
    handleReport,
    handleRateHelper,
  };
}

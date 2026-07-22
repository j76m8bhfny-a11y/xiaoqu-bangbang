import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import { groupBuyService } from '@/services';
import { useAuthStore } from '@/store';
import { GROUP_BUY_TYPE_LABELS, GROUP_BUY_STATUS_LABELS } from '@/utils/mappers';
import type { GroupBuyDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

// FE-9/10: 类型/状态文案复用 mappers，避免与卡片不一致；item 状态与交付方式为详情页特有
const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  purchased: '已采购',
  delivered: '已交付',
  rejected: '已拒绝',
};

const DELIVERY_LABELS: Record<string, string> = {
  self_pickup: '自取',
  door_drop: '送上门',
  spot: '集中点',
};

// 后端 departAt 返回 ISO，详情展示与编辑回填统一转 YYYY-MM-DD HH:mm
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const GroupBuyDetail = () => {
  const id = Taro.getCurrentInstance().router?.params?.id ?? '';
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [groupBuy, setGroupBuy] = useState<GroupBuyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [respondName, setRespondName] = useState('');
  const [respondQty, setRespondQty] = useState(1);
  const [respondNote, setRespondNote] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await groupBuyService.getById(id);
      setGroupBuy(data);
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRespond = async () => {
    if (!respondName.trim()) {
      Taro.showToast({ title: '请填写商品名', icon: 'none' });
      return;
    }
    setResponding(true);
    try {
      await groupBuyService.respond(id, {
        name: respondName.trim(),
        qty: respondQty,
        note: respondNote.trim() || undefined,
      });
      Taro.showToast({ title: '加入成功', icon: 'success' });
      setRespondName('');
      setRespondQty(1);
      setRespondNote('');
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    } finally {
      setResponding(false);
    }
  };

  const handleConfirmItem = async (itemId: string) => {
    try {
      await groupBuyService.confirmItem(id, itemId);
      Taro.showToast({ title: '已确认', icon: 'success' });
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const handleRejectItem = async (itemId: string) => {
    try {
      await groupBuyService.rejectItem(id, itemId);
      Taro.showToast({ title: '已拒绝', icon: 'success' });
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const handleDeliverItem = async (itemId: string) => {
    try {
      await groupBuyService.deliver(id, itemId);
      Taro.showToast({ title: '已交付', icon: 'success' });
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const handleCloseBid = async () => {
    try {
      await groupBuyService.closeBid(id);
      Taro.showToast({ title: '已截止接单', icon: 'success' });
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const handlePurchased = async () => {
    try {
      await groupBuyService.purchased(id);
      Taro.showToast({ title: '已标记采购', icon: 'success' });
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  const handleClose = async () => {
    try {
      await groupBuyService.close(id);
      Taro.showToast({ title: '已关闭', icon: 'success' });
      fetchDetail();
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '操作失败', icon: 'none' });
    }
  };

  if (loading) {
    return <View className="gb-detail">加载中...</View>;
  }

  if (!groupBuy) {
    return <View className="gb-detail">事件不存在</View>;
  }

  const isInitiator = groupBuy.initiatorId === currentUserId;
  // FE-5: hasResponded 排除 rejected（被拒后可重响应）
  const hasResponded = groupBuy.items.some(
    (it) => it.requesterId === currentUserId && it.status !== 'rejected',
  );
  // FE-6: offer 名额满则隐藏响应表单
  const activeCount = groupBuy.items.filter((it) => it.status !== 'rejected').length;
  const quotaFull = groupBuy.type === 'offer' && activeCount >= groupBuy.quota;
  const canRespond = !isInitiator && groupBuy.status === 'open' && !hasResponded && !quotaFull;
  const hasConfirmedItems = groupBuy.items.some((it) => it.status === 'confirmed');
  // 控制区整体在终态 closed/rejected 隐藏
  const isClosed = groupBuy.status === 'closed' || groupBuy.status === 'rejected';
  // FE-3: 编辑按钮仅 open/pending_review 可点（与后端 update 限制一致）
  const canEdit = ['pending_review', 'open'].includes(groupBuy.status);
  const typeLabel = GROUP_BUY_TYPE_LABELS[groupBuy.type]?.label || groupBuy.type;

  return (
    <View className="gb-detail">
      {/* 基本信息 */}
      <View className="gb-detail__header">
        <View className="gb-detail__tags">
          <View className="gb-detail__type-tag">
            <Text className="gb-detail__type-tag-text">{typeLabel}</Text>
          </View>
          <View className="gb-detail__status-tag">
            <Text className="gb-detail__status-tag-text">
              {GROUP_BUY_STATUS_LABELS[groupBuy.status] || groupBuy.status}
            </Text>
          </View>
        </View>

        <View className="gb-detail__info-card">
          <Text className="gb-detail__info-label">发起人</Text>
          <Text className="gb-detail__info-value">{groupBuy.initiator?.nickname || '邻居'}</Text>
        </View>

        <View className="gb-detail__info-card">
          <Text className="gb-detail__info-label">采购地点</Text>
          <Text className="gb-detail__info-value">{groupBuy.location}</Text>
        </View>

        {groupBuy.departAt && (
          <View className="gb-detail__info-card">
            <Text className="gb-detail__info-label">出发时间</Text>
            <Text className="gb-detail__info-value">{formatDateTime(groupBuy.departAt)}</Text>
          </View>
        )}

        {groupBuy.bidCloseAt && (
          <View className="gb-detail__info-card">
            <Text className="gb-detail__info-label">截止接单</Text>
            <Text className="gb-detail__info-value">{formatDateTime(groupBuy.bidCloseAt)}</Text>
          </View>
        )}

        {groupBuy.type === 'offer' && (
          <View className="gb-detail__info-card">
            <Text className="gb-detail__info-label">名额</Text>
            <Text className="gb-detail__info-value">{groupBuy.quota}</Text>
          </View>
        )}

        <View className="gb-detail__info-card">
          <Text className="gb-detail__info-label">交付方式</Text>
          <Text className="gb-detail__info-value">
            {DELIVERY_LABELS[groupBuy.deliveryMethod] || groupBuy.deliveryMethod}
          </Text>
        </View>

        {groupBuy.note && (
          <View className="gb-detail__info-card gb-detail__info-card--note">
            <Text className="gb-detail__info-label">备注</Text>
            <Text className="gb-detail__info-value">{groupBuy.note}</Text>
          </View>
        )}

        <View className="gb-detail__info-card">
          <Text className="gb-detail__info-label">创建时间</Text>
          <Text className="gb-detail__info-value">{groupBuy.createdAt}</Text>
        </View>
      </View>

      {/* 商品列表 */}
      <View className="gb-detail__items">
        <Text className="gb-detail__items-header">商品清单 ({groupBuy.items.length})</Text>
        {groupBuy.items.length === 0 ? (
          <Text className="gb-detail__items-empty">还没有人加入</Text>
        ) : (
          groupBuy.items.map((item) => (
            <View key={item.id} className="gb-detail__item">
              <View className="gb-detail__item-header">
                <Text className="gb-detail__item-name">{item.name}</Text>
                <Text className="gb-detail__item-status">
                  {ITEM_STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
              <View className="gb-detail__item-meta">
                <Text className="gb-detail__item-responder">
                  {item.requester?.nickname || '邻居'}
                </Text>
                <Text className="gb-detail__item-qty">x{item.qty}</Text>
              </View>
              {item.note && <Text className="gb-detail__item-note">{item.note}</Text>}
              {isInitiator && (
                <View className="gb-detail__item-actions">
                  {/* FE-8: 排除发起人自己的 item（seek 初始需求，无需确认/拒绝） */}
                  {item.requesterId !== currentUserId && item.status === 'pending' && (
                    <>
                      <Button size="mini" onClick={() => handleConfirmItem(item.id)}>
                        确认
                      </Button>
                      <Button size="mini" onClick={() => handleRejectItem(item.id)}>
                        拒绝
                      </Button>
                    </>
                  )}
                  {/* FE-4: 已交付按钮仅在 purchased 状态显示，避免跳过状态机 */}
                  {item.status === 'confirmed' && groupBuy.status === 'purchased' && (
                    <Button size="mini" onClick={() => handleDeliverItem(item.id)}>
                      已交付
                    </Button>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* 响应区域 */}
      {canRespond && (
        <View className="gb-detail__respond">
          <Text className="gb-detail__respond-title">我要加入</Text>
          <View className="gb-detail__respond-form">
            <Input
              className="gb-detail__respond-input"
              placeholder="商品名"
              value={respondName}
              onInput={(e) => setRespondName(e.detail.value)}
            />
            <View className="gb-detail__respond-row">
              <Text className="gb-detail__respond-label">数量</Text>
              <Input
                className="gb-detail__respond-qty"
                type="number"
                value={String(respondQty)}
                onInput={(e) => setRespondQty(Number(e.detail.value) || 1)}
              />
            </View>
            <Textarea
              className="gb-detail__respond-note"
              placeholder="备注（可选）"
              value={respondNote}
              onInput={(e) => setRespondNote(e.detail.value)}
            />
            <Button
              className="gb-detail__respond-btn"
              loading={responding}
              disabled={responding}
              onClick={handleRespond}
            >
              {responding ? '提交中...' : '我要加入'}
            </Button>
          </View>
        </View>
      )}

      {/* 发起人控制区 */}
      {isInitiator && !isClosed && (
        <View className="gb-detail__controls">
          <Text className="gb-detail__controls-title">发起人操作</Text>
          {groupBuy.status === 'open' && (
            <Button className="gb-detail__control-btn" onClick={handleCloseBid}>
              截止接单
            </Button>
          )}
          {groupBuy.status === 'closed_for_bid' && hasConfirmedItems && (
            <Button className="gb-detail__control-btn" onClick={handlePurchased}>
              已采购
            </Button>
          )}
          {canEdit && (
            <Button
              className="gb-detail__control-btn gb-detail__control-btn--edit"
              onClick={() => Taro.navigateTo({ url: `/pages/group-buy-edit/index?id=${id}` })}
            >
              编辑
            </Button>
          )}
          <Button
            className="gb-detail__control-btn gb-detail__control-btn--close"
            onClick={handleClose}
          >
            关闭拼单
          </Button>
        </View>
      )}
    </View>
  );
};

export default GroupBuyDetail;

import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Input, Textarea, Button } from '@tarojs/components';
import { groupBuyService } from '@/services';
import { useAuthStore } from '@/store';
import type { GroupBuyDto } from '@xiaoqu-bangbang/shared';
import './index.scss';

const STATUS_LABELS: Record<string, string> = {
  open: '进行中',
  bid_closed: '已截止',
  purchasing: '采购中',
  delivered: '已交付',
  closed: '已关闭',
  cancelled: '已取消',
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
  delivered: '已交付',
  cancelled: '已取消',
};

const DELIVERY_LABELS: Record<string, string> = {
  self_pickup: '自取',
  door_drop: '送上门',
  spot: '集中点',
};

const TYPE_LABELS: Record<string, string> = {
  seek: '求代购',
  offer: '代购方',
};

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
  const hasResponded = groupBuy.items.some((it) => it.requesterId === currentUserId);
  const canRespond = !isInitiator && groupBuy.status === 'open' && !hasResponded;
  const hasConfirmedItems = groupBuy.items.some((it) => it.status === 'confirmed');
  const isClosed = groupBuy.status === 'closed' || groupBuy.status === 'cancelled';

  return (
    <View className="gb-detail">
      {/* 基本信息 */}
      <View className="gb-detail__header">
        <View className="gb-detail__tags">
          <View className="gb-detail__type-tag">
            <Text className="gb-detail__type-tag-text">
              {TYPE_LABELS[groupBuy.type] || groupBuy.type}
            </Text>
          </View>
          <View className="gb-detail__status-tag">
            <Text className="gb-detail__status-tag-text">
              {STATUS_LABELS[groupBuy.status] || groupBuy.status}
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
            <Text className="gb-detail__info-value">{groupBuy.departAt}</Text>
          </View>
        )}

        {groupBuy.bidCloseAt && (
          <View className="gb-detail__info-card">
            <Text className="gb-detail__info-label">截止接单</Text>
            <Text className="gb-detail__info-value">{groupBuy.bidCloseAt}</Text>
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
                  {item.status === 'pending' && (
                    <>
                      <Button size="mini" onClick={() => handleConfirmItem(item.id)}>
                        确认
                      </Button>
                      <Button size="mini" onClick={() => handleRejectItem(item.id)}>
                        拒绝
                      </Button>
                    </>
                  )}
                  {item.status === 'confirmed' && (
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
          {groupBuy.status === 'bid_closed' && hasConfirmedItems && (
            <Button className="gb-detail__control-btn" onClick={handlePurchased}>
              已采购
            </Button>
          )}
          <Button
            className="gb-detail__control-btn gb-detail__control-btn--edit"
            onClick={() => Taro.navigateTo({ url: `/pages/group-buy-edit/index?id=${id}` })}
          >
            编辑
          </Button>
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

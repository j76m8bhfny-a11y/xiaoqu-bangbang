import { View, Text, ScrollView } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { eventService, marketService } from '@/services';
import { useAuthGuard } from '@/hooks';
import { useCommunityStore } from '@/store';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import './index.scss';

const EXCLUDE_TOPIC_TYPES = 'public_feedback,discussion';

type MixedItem =
  | {
      kind: 'event';
      id: string;
      title: string;
      description?: string;
      createdAt: string;
      type: string;
    }
  | {
      kind: 'market';
      id: string;
      title: string;
      description?: string;
      createdAt: string;
      price?: number | null;
    };

export default function Plaza() {
  useAuthGuard();
  const communityId = useCommunityStore((s) => s.currentCommunityId);
  const [tab, setTab] = useState<'all' | 'events' | 'market'>('all');
  const [items, setItems] = useState<MixedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (tab === 'all') {
          const [evRes, mkRes] = await Promise.all([
            eventService.list({ excludeTypes: EXCLUDE_TOPIC_TYPES, page: 1, pageSize: 20 }),
            marketService.list({ communityId, page: 1, pageSize: 20 }),
          ]);
          const events: MixedItem[] = evRes.items.map((e) => ({
            kind: 'event',
            id: e.id,
            title: e.title,
            description: e.description,
            createdAt: e.createdAt,
            type: e.type,
          }));
          const market: MixedItem[] = mkRes.items.map((m) => ({
            kind: 'market',
            id: m.id,
            title: m.title,
            description: m.description,
            createdAt: m.createdAt,
            price: m.price,
          }));
          const merged = [...events, ...market].sort((a, b) =>
            a.createdAt < b.createdAt ? 1 : -1,
          );
          if (!cancelled) setItems(merged);
        } else if (tab === 'events') {
          const res = await eventService.list({
            excludeTypes: EXCLUDE_TOPIC_TYPES,
            page: 1,
            pageSize: 30,
          });
          if (!cancelled)
            setItems(
              res.items.map((e) => ({
                kind: 'event',
                id: e.id,
                title: e.title,
                description: e.description,
                createdAt: e.createdAt,
                type: e.type,
              })),
            );
        } else {
          const res = await marketService.list({ communityId, page: 1, pageSize: 30 });
          if (!cancelled)
            setItems(
              res.items.map((m) => ({
                kind: 'market',
                id: m.id,
                title: m.title,
                description: m.description,
                createdAt: m.createdAt,
                price: m.price,
              })),
            );
        }
      } catch (e: any) {
        Taro.showToast({ title: e.message || '加载失败', icon: 'none' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [communityId, tab]);

  const handleClick = (item: MixedItem) => {
    const url =
      item.kind === 'event'
        ? `/pages/event-detail/index?id=${item.id}`
        : `/pages/market-detail/index?id=${item.id}`;
    Taro.navigateTo({ url });
  };

  return (
    <View className="plaza">
      <View className="plaza__tabs">
        {(['all', 'events', 'market'] as const).map((t) => (
          <View
            key={t}
            className={`plaza__tab ${tab === t ? 'plaza__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'all' ? '全部' : t === 'events' ? '事件' : '闲置'}
          </View>
        ))}
      </View>

      <ScrollView scrollY className="plaza__list">
        {loading && <Loading />}
        {!loading && items.length === 0 && <EmptyState icon="📭" text="暂无内容" />}
        {!loading &&
          items.map((it) => (
            <View
              key={`${it.kind}-${it.id}`}
              className="plaza__item"
              onClick={() => handleClick(it)}
            >
              <Text
                className={`plaza__item-kind ${it.kind === 'market' ? 'plaza__item-kind--market' : ''}`}
              >
                {it.kind === 'event' ? '事件' : '闲置'}
              </Text>
              <View className="plaza__item-title">{it.title}</View>
              {it.description && <View className="plaza__item-desc">{it.description}</View>}
              <View className="plaza__item-meta">
                {it.kind === 'market' && (it.price != null ? `¥${it.price}` : '免费')}
                {it.kind === 'market' ? ' · ' : ''}
                {new Date(it.createdAt).toLocaleDateString()}
              </View>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { communityApplicationService } from '@/services';
import { useAuthGuard } from '@/hooks';
import Loading from '@/components/loading';
import EmptyState from '@/components/empty-state';
import type { CommunityApplicationDto } from '@xiaoqu-bangbang/shared';
import './index.scss';
import Icon from '@/components/icon';

// 两 tab：我发起的 / 我助力的；进入页面/切 tab 时重新拉数据。
// ponytail: 不分页，账户里的申请通常 < 20 条，列表全量返回。

type Tab = 'mine' | 'supported';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: '审核中', cls: 'orange' },
  approved: { label: '已开通', cls: 'green' },
  rejected: { label: '已驳回', cls: 'red' },
};

export default function MyApplications() {
  useAuthGuard();

  const [tab, setTab] = useState<Tab>('mine');
  const [loading, setLoading] = useState(false);
  const [mine, setMine] = useState<CommunityApplicationDto[]>([]);
  const [supported, setSupported] = useState<CommunityApplicationDto[]>([]);

  const load = async (which: Tab) => {
    setLoading(true);
    try {
      if (which === 'mine') {
        const res = await communityApplicationService.listMine();
        setMine(res.items ?? []);
      } else {
        const res = await communityApplicationService.listSupported();
        setSupported(res.items ?? []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void load(tab);
  });

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    void load(t);
  };

  const items = tab === 'mine' ? mine : supported;

  return (
    <View className="myapp">
      <View className="myapp__tabs">
        {(['mine', 'supported'] as Tab[]).map((t) => (
          <View
            key={t}
            className={`myapp__tab ${tab === t ? 'myapp__tab--active' : ''}`}
            onClick={() => switchTab(t)}
          >
            <Text className="myapp__tab-text">{t === 'mine' ? '我发起的' : '我助力的'}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="myapp__body">
        {loading && <Loading />}

        {!loading && items.length === 0 && (
          <View className="myapp__empty">
            <EmptyState
              icon={tab === 'mine' ? 'community' : 'handshake'}
              text={tab === 'mine' ? '还没发起过小区申请' : '还没助力过任何申请'}
            />
            {tab === 'mine' && (
              <View
                className="myapp__empty-cta"
                onClick={() => Taro.navigateTo({ url: '/pages/community-apply/index' })}
              >
                <Text className="myapp__empty-cta-text">+ 申请开通你家小区</Text>
              </View>
            )}
          </View>
        )}

        {!loading &&
          items.map((it) => {
            const meta = STATUS_META[it.status] ?? { label: it.status, cls: 'gray' };
            return (
              <View
                key={it.id}
                className="myapp__item"
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages/community-application-detail/index?id=${it.id}`,
                  })
                }
              >
                <View className="myapp__item-top">
                  <Text className="myapp__item-name">{it.name}</Text>
                  <View className={`myapp__status myapp__status--${meta.cls}`}>
                    <Text className="myapp__status-text">{meta.label}</Text>
                  </View>
                </View>
                <Text className="myapp__item-location">
                  {it.city} · {it.district}
                </Text>
                <View className="myapp__item-meta">
                  <View>
                    <Icon name="thumbs-up" size={14} /> <Text>{it.supportCount} 助力</Text>
                  </View>
                  <Text>{new Date(it.createdAt).toLocaleDateString()}</Text>
                </View>
                {tab === 'mine' && it.status === 'rejected' && it.rejectReason && (
                  <Text className="myapp__item-reject">驳回：{it.rejectReason}</Text>
                )}
              </View>
            );
          })}

        {tab === 'mine' && items.length > 0 && (
          <View
            className="myapp__new-btn"
            onClick={() => Taro.navigateTo({ url: '/pages/community-apply/index' })}
          >
            <Text className="myapp__new-btn-text">+ 再申请一个小区</Text>
          </View>
        )}

        <View className="myapp__bottom-spacer" />
      </ScrollView>
    </View>
  );
}

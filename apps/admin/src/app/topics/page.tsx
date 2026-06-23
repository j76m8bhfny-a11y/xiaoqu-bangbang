'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Card,
  Tabs,
  Tag,
  Space,
  Button,
  Drawer,
  Descriptions,
  message,
  Modal,
  Input,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const { Search, TextArea } = Input;

const statusLabels: Record<string, string> = {
  open: '进行中',
  closed: '已完结',
  rejected: '已驳回',
};
const statusColors: Record<string, string> = {
  open: 'green',
  closed: 'default',
  rejected: 'red',
};

/** 议题列表子页面 */
function TopicTable() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ status?: string; search?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  // 完结弹窗
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeTopicId, setCloseTopicId] = useState('');
  const [closeSummary, setCloseSummary] = useState('');
  // 驳回弹窗
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTopicId, setRejectTopicId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  // 合并弹窗
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  // 移动事件弹窗
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveEventId, setMoveEventId] = useState('');
  const [moveSourceId, setMoveSourceId] = useState('');
  const [moveTargetId, setMoveTargetId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'topics', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/topics', {
        params: { ...filters, page, pageSize },
      }),
  });

  /** 完结 */
  const closeMut = useMutation({
    mutationFn: ({ id, summary }: { id: string; summary: string }) =>
      api.post(`/admin/topics/${id}/close`, { summary }),
    onSuccess: () => {
      message.success('已完结');
      setCloseOpen(false);
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });
  /** 重新开启 */
  const reopenMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/topics/${id}/reopen`),
    onSuccess: () => {
      message.success('已重新开启');
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });
  /** 驳回 */
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/topics/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已驳回');
      setRejectOpen(false);
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });
  /** 合并 */
  const mergeMut = useMutation({
    mutationFn: (body: { sourceTopicId: string; targetTopicId: string }) =>
      api.post('/admin/topics/merge', body),
    onSuccess: () => {
      message.success('已合并');
      setMergeOpen(false);
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });
  /** 移动事件 */
  const moveMut = useMutation({
    mutationFn: (body: { topicId: string; eventId: string; targetTopicId: string }) =>
      api.post(`/admin/topics/${body.topicId}/events/${body.eventId}/move`, {
        targetTopicId: body.targetTopicId,
      }),
    onSuccess: () => {
      message.success('已移动');
      setMoveOpen(false);
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] });

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 260 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
    },
    { title: '事件数', dataIndex: 'eventCount', width: 70 },
    { title: '点赞', dataIndex: 'likeCount', width: 60 },
    { title: '点踩', dataIndex: 'dislikeCount', width: 60 },
    {
      title: '平均星',
      dataIndex: 'avgRating',
      width: 70,
      render: (v: number) => (v ? v.toFixed(1) : '-'),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 300,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelected(record);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
          {record.status === 'open' && (
            <>
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setCloseTopicId(record.id);
                  setCloseOpen(true);
                }}
              >
                完结
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => {
                  setRejectTopicId(record.id);
                  setRejectOpen(true);
                }}
              >
                驳回
              </Button>
            </>
          )}
          {record.status === 'closed' && (
            <Button size="small" type="link" onClick={() => reopenMut.mutate(record.id)}>
              重新开启
            </Button>
          )}
          {record.status !== 'rejected' && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setMergeSourceId(record.id);
                setMergeOpen(true);
              }}
            >
              合并
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 130 }}
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Search
          placeholder="搜索标题"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => setFilters((f) => ({ ...f, search: v }))}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: data?.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      {/* 详情 Drawer */}
      <TopicDetailDrawer
        topicId={selected?.id}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onMoveEvent={(eventId: string) => {
          setMoveEventId(eventId);
          setMoveSourceId(selected?.id);
          setMoveOpen(true);
        }}
      />

      {/* 完结弹窗 */}
      <Modal
        title="完结议题"
        open={closeOpen}
        onCancel={() => setCloseOpen(false)}
        onOk={() => closeMut.mutate({ id: closeTopicId, summary: closeSummary })}
        confirmLoading={closeMut.isPending}
      >
        <TextArea
          placeholder="请输入完结总结"
          rows={3}
          value={closeSummary}
          onChange={(e) => setCloseSummary(e.target.value)}
        />
      </Modal>

      {/* 驳回弹窗 */}
      <Modal
        title="驳回议题"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() => rejectMut.mutate({ id: rejectTopicId, reason: rejectReason })}
        confirmLoading={rejectMut.isPending}
      >
        <Input
          placeholder="驳回原因（可选）"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* 合并弹窗 */}
      <Modal
        title="合并议题"
        open={mergeOpen}
        onCancel={() => setMergeOpen(false)}
        onOk={() => mergeMut.mutate({ sourceTopicId: mergeSourceId, targetTopicId: mergeTargetId })}
        confirmLoading={mergeMut.isPending}
      >
        <p style={{ marginBottom: 8 }}>
          源议题: <strong>{selected?.title || mergeSourceId}</strong>
        </p>
        <p>源议题的事件和评论将合并到目标议题，源议题将被删除。</p>
        <Input
          placeholder="目标议题 ID"
          value={mergeTargetId}
          onChange={(e) => setMergeTargetId(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </Modal>

      {/* 移动事件弹窗 */}
      <Modal
        title="移动事件到其他议题"
        open={moveOpen}
        onCancel={() => setMoveOpen(false)}
        onOk={() =>
          moveMut.mutate({
            topicId: moveSourceId,
            eventId: moveEventId,
            targetTopicId: moveTargetId,
          })
        }
        confirmLoading={moveMut.isPending}
      >
        <p>事件 ID: {moveEventId}</p>
        <Input
          placeholder="目标议题 ID"
          value={moveTargetId}
          onChange={(e) => setMoveTargetId(e.target.value)}
        />
      </Modal>
    </>
  );
}

/** 议题详情 Drawer */
function TopicDetailDrawer({ topicId, open, onClose, onMoveEvent }: any) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'topic-detail', topicId],
    queryFn: () => api.get<null, ApiResponse<any>>(`/admin/topics/${topicId}`),
    enabled: !!topicId,
  });
  const topic = data?.data;

  return (
    <Drawer title="议题详情" open={open} onClose={onClose} width={640}>
      {isLoading && <p>加载中...</p>}
      {topic && (
        <>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="ID">{topic.id}</Descriptions.Item>
            <Descriptions.Item label="标题">{topic.title}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[topic.status]}>
                {statusLabels[topic.status] || topic.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="事件数">{topic.eventCount}</Descriptions.Item>
            <Descriptions.Item label="点赞/点踩">
              {topic.likeCount}/{topic.dislikeCount}
            </Descriptions.Item>
            <Descriptions.Item label="平均评分">
              {topic.avgRating ? topic.avgRating.toFixed(1) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{topic.createdAt}</Descriptions.Item>
            {topic.closedSummary && (
              <Descriptions.Item label="完结总结">{topic.closedSummary}</Descriptions.Item>
            )}
          </Descriptions>
          <h4 style={{ marginBottom: 8 }}>关联事件</h4>
          {topic.events?.length === 0 && <p style={{ color: '#999' }}>暂无事件</p>}
          {topic.events?.map((ev: any) => (
            <Card key={ev.id} size="small" style={{ marginBottom: 8 }}>
              <p>
                <strong>{ev.title}</strong> <Tag>{ev.type}</Tag>
              </p>
              <p style={{ fontSize: 12, color: '#999' }}>{ev.createdAt}</p>
              <Button size="small" type="link" onClick={() => onMoveEvent?.(ev.id)}>
                移动到其他议题
              </Button>
            </Card>
          ))}
        </>
      )}
    </Drawer>
  );
}

/** 合并建议子页面 */
function MergeSuggestions() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'merge-suggestions', status],
    queryFn: () =>
      api.get<null, ApiResponse<any>>('/admin/topics/merge-suggestions', { params: { status } }),
  });
  const items: any[] = data?.data?.items ?? [];

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/topics/merge-suggestions/${id}/approve`),
    onSuccess: () => {
      message.success('已同意合并');
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/topics/merge-suggestions/${id}/reject`),
    onSuccess: () => {
      message.success('已驳回');
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });
  const scanMut = useMutation({
    mutationFn: () => api.post('/admin/topics/merge-suggestions/scan'),
    onSuccess: (res: any) => {
      message.success(`扫描完成，新增 ${res?.data?.created ?? 0} 条建议`);
      invalidate();
    },
    onError: () => message.error('扫描失败'),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'merge-suggestions'] });

  const columns: ColumnsType<any> = [
    { title: '源议题', dataIndex: ['sourceTopic', 'title'], ellipsis: true },
    { title: '目标议题', dataIndex: ['targetTopic', 'title'], ellipsis: true },
    {
      title: '相似度',
      dataIndex: 'similarity',
      width: 80,
      render: (v: number) => (v ? `${(v * 100).toFixed(0)}%` : '-'),
    },
    { title: '状态', dataIndex: 'status', width: 80 },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <>
              <Button size="small" type="link" onClick={() => approveMut.mutate(record.id)}>
                同意
              </Button>
              <Button size="small" type="link" danger onClick={() => rejectMut.mutate(record.id)}>
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: 130 }}
          options={[
            { value: 'pending', label: '待处理' },
            { value: 'approved', label: '已同意' },
            { value: 'rejected', label: '已驳回' },
          ]}
        />
        <Button type="primary" onClick={() => scanMut.mutate()} loading={scanMut.isPending}>
          手动扫描
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={isLoading}
        pagination={false}
      />
    </>
  );
}

/** 主页面 */
export default function TopicsPage() {
  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="议事管理">
          <Tabs
            items={[
              { key: 'topics', label: '议题列表', children: <TopicTable /> },
              { key: 'suggestions', label: '合并建议', children: <MergeSuggestions /> },
            ]}
          />
        </Card>
      </AdminLayout>
    </AuthGuard>
  );
}

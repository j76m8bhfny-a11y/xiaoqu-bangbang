'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Card, Select, Input, Tag, Space, Button, Drawer, Descriptions, message, Modal, Form, DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData, EventDto, EventType, EventStatus } from '@xiaoqu-bangbang/shared';

const { Search } = Input;

const eventTypeLabels: Record<string, string> = {
  help_request: '求助',
  help_offer: '提供帮助',
  public_welfare: '公益',
  lost_found: '寻物',
  public_feedback: '公共反馈',
  discussion: '讨论',
};

const eventStatusLabels: Record<string, string> = {
  pending_review: '待审核',
  open: '进行中',
  in_progress: '处理中',
  processing: '处理中',
  completed: '已完成',
  closed: '已关闭',
  rejected: '已拒绝',
};

const eventStatusColors: Record<string, string> = {
  pending_review: 'orange',
  open: 'green',
  in_progress: 'blue',
  processing: 'blue',
  completed: 'default',
  closed: 'default',
  rejected: 'red',
};

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ status?: string; type?: string; keyword?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackEventId, setFeedbackEventId] = useState('');
  const [feedbackForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'events', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/events', {
        params: { ...filters, page, pageSize },
      }),
  });

  const hideMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/events/${id}/hide`),
    onSuccess: () => { message.success('已隐藏'); queryClient.invalidateQueries({ queryKey: ['admin', 'events'] }); },
    onError: () => message.error('操作失败'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/events/${id}/restore`),
    onSuccess: () => { message.success('已恢复'); queryClient.invalidateQueries({ queryKey: ['admin', 'events'] }); },
    onError: () => message.error('操作失败'),
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ eventId, body }: { eventId: string; body: any }) =>
      api.post(`/admin/events/${eventId}/feedback-logs`, body),
    onSuccess: () => {
      message.success('反馈已添加');
      setFeedbackModalOpen(false);
      feedbackForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 200 },
    {
      title: '类型', dataIndex: 'type', width: 100,
      render: (v: string) => <Tag>{eventTypeLabels[v] || v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={eventStatusColors[v]}>{eventStatusLabels[v] || v}</Tag>,
    },
    {
      title: 'AI审核', dataIndex: 'aiReviewStatus', width: 100,
      render: (v: string) => {
        const colors: Record<string, string> = { pass: 'green', reject: 'red', manual_review: 'orange', pending: 'blue' };
        const labels: Record<string, string> = { pass: '通过', reject: '拒绝', manual_review: '人工', pending: '待审' };
        return <Tag color={colors[v]}>{labels[v] || v}</Tag>;
      },
    },
    {
      title: '创建者', dataIndex: ['creator', 'nickname'], width: 100,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作', width: 200, render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => { setSelected(record); setDrawerOpen(true); }}>详情</Button>
          {record.status !== 'closed' && (
            <Button size="small" type="link" danger onClick={() => hideMutation.mutate(record.id)}>隐藏</Button>
          )}
          {record.status === 'closed' && (
            <Button size="small" type="link" onClick={() => restoreMutation.mutate(record.id)}>恢复</Button>
          )}
          {record.type === 'public_feedback' && (
            <Button size="small" type="link" onClick={() => { setFeedbackEventId(record.id); setFeedbackModalOpen(true); }}>
              反馈日志
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="事件管理">
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              placeholder="事件类型" allowClear style={{ width: 130 }}
              value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              options={Object.entries(eventTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              placeholder="状态" allowClear style={{ width: 130 }}
              value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              options={Object.entries(eventStatusLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Search
              placeholder="搜索关键词" allowClear style={{ width: 200 }}
              onSearch={(v) => setFilters((f) => ({ ...f, keyword: v }))}
            />
          </Space>
          <Table
            rowKey="id" columns={columns} dataSource={data?.data?.items ?? []} loading={isLoading}
            pagination={{
              current: page, pageSize, total: data?.data?.total ?? 0, showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>

        <Drawer title="事件详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={600}>
          {selected && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="标题">{selected.title}</Descriptions.Item>
              <Descriptions.Item label="类型">{eventTypeLabels[selected.type] || selected.type}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={eventStatusColors[selected.status]}>{eventStatusLabels[selected.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="AI审核">{selected.aiReviewStatus}</Descriptions.Item>
              <Descriptions.Item label="创建者">{selected.creator?.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selected.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Modal
          title="添加反馈日志" open={feedbackModalOpen} onCancel={() => setFeedbackModalOpen(false)}
          onOk={() => feedbackForm.validateFields().then((values) =>
            feedbackMutation.mutate({ eventId: feedbackEventId, body: values })
          )}
          confirmLoading={feedbackMutation.isPending}
        >
          <Form form={feedbackForm} layout="vertical">
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select options={[
                { value: 'received', label: '已接收' },
                { value: 'processing', label: '处理中' },
                { value: 'contacted', label: '已联系' },
                { value: 'resolved', label: '已解决' },
                { value: 'cannot_resolve', label: '无法解决' },
                { value: 'closed', label: '已关闭' },
              ]} />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="visibleToPublic" label="对外可见" valuePropName="checked">
              <Select options={[{ value: true, label: '是' }, { value: false, label: '否' }]} />
            </Form.Item>
          </Form>
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

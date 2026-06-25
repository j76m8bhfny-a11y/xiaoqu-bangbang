'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Card,
  Select,
  Tag,
  Space,
  Button,
  Drawer,
  Typography,
  Descriptions,
  message,
  Modal,
  Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

interface ReviewItem {
  id: string;
  targetType: string;
  targetId: string;
  result: string;
  labels?: string[];
  score?: number;
  content?: string;
  operatorId?: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  // 策略：AI 通过即放行，此处默认只显示需人工复审项（manual_review）。
  // 历史 pass/reject 记录通过状态下拉的「全部」查看。
  const [filters, setFilters] = useState<{ targetType?: string; status?: string }>({
    status: 'manual_review',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reviews', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<ReviewItem>>>('/admin/reviews', {
        params: { ...filters, page, pageSize },
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/reviews/${id}/approve`),
    onSuccess: () => {
      message.success('已通过');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: () => message.error('操作失败'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/reviews/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已拒绝');
      setRejectModalOpen(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: () => message.error('操作失败'),
  });

  const adminOnlyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/reviews/${id}/manual-visible-admin-only`),
    onSuccess: () => {
      message.success('已设为仅管理员可见');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: () => message.error('操作失败'),
  });

  const statusColors: Record<string, string> = {
    pass: 'green',
    reject: 'red',
    manual_review: 'orange',
    pending: 'blue',
  };

  const statusLabels: Record<string, string> = {
    pass: '通过',
    reject: '拒绝',
    manual_review: '人工审核',
    pending: '待审核',
  };

  const columns: ColumnsType<ReviewItem> = [
    {
      title: '目标类型',
      dataIndex: 'targetType',
      width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '目标ID', dataIndex: 'targetId', width: 120, ellipsis: true },
    {
      title: 'AI标签',
      dataIndex: 'labels',
      width: 200,
      render: (labels: string[] | undefined) =>
        labels?.map((l, i) => (
          <Tag key={i} color="blue">
            {l}
          </Tag>
        )) || '-',
    },
    {
      title: 'AI评分',
      dataIndex: 'score',
      width: 100,
      render: (v: number | string | undefined) => {
        if (v === undefined || v === null) return '-';
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n.toFixed(2) : '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'result',
      width: 100,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space size="small">
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
          {record.result === 'manual_review' && (
            <>
              <Button size="small" type="link" onClick={() => approveMutation.mutate(record.id)}>
                通过
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => {
                  setRejectId(record.id);
                  setRejectModalOpen(true);
                }}
              >
                拒绝
              </Button>
              <Button size="small" type="link" onClick={() => adminOnlyMutation.mutate(record.id)}>
                仅管理员可见
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card
          title="内容审核"
          extra={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              AI 通过即放行，此处仅展示需人工复审项；查看历史请将状态切换为「全部」
            </Typography.Text>
          }
        >
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="目标类型"
              allowClear
              style={{ width: 150 }}
              value={filters.targetType}
              onChange={(v) => setFilters((f) => ({ ...f, targetType: v }))}
              options={[
                { value: 'event', label: '事件' },
                { value: 'market_item', label: '闲置' },
                { value: 'event_comment', label: '事件评论' },
                { value: 'market_comment', label: '闲置评论' },
              ]}
            />
            <Select
              placeholder="审核状态"
              style={{ width: 150 }}
              value={filters.status ?? 'all'}
              onChange={(v) => setFilters((f) => ({ ...f, status: v === 'all' ? 'all' : v }))}
              options={[
                { value: 'manual_review', label: '人工审核' },
                { value: 'pass', label: '通过' },
                { value: 'reject', label: '拒绝' },
                { value: 'pending', label: '待审核' },
                { value: 'all', label: '全部' },
              ]}
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
        </Card>

        <Drawer title="审核详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
          {selected && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="目标类型">{selected.targetType}</Descriptions.Item>
              <Descriptions.Item label="目标ID">{selected.targetId}</Descriptions.Item>
              <Descriptions.Item label="审核状态">
                <Tag color={statusColors[selected.result]}>{statusLabels[selected.result]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="AI评分">{selected.score ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="AI标签">
                {selected.labels?.map((l, i) => <Tag key={i}>{l}</Tag>) || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{selected.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Modal
          title="拒绝审核"
          open={rejectModalOpen}
          onOk={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
          onCancel={() => setRejectModalOpen(false)}
          confirmLoading={rejectMutation.isPending}
        >
          <Input.TextArea
            rows={3}
            placeholder="请输入拒绝原因"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

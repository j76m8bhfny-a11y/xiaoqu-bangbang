'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Card, Tag, Space, Select, Button, Drawer, Descriptions, Modal, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const categoryLabels: Record<string, string> = {
  free: '免费赠送', furniture: '家具', baby: '母婴', books: '书籍',
  pet: '宠物', digital: '数码', other: '其他',
};

const statusLabels: Record<string, string> = {
  pending_review: '待审核', on_sale: '在售', sold: '已售',
  hidden: '已隐藏', closed: '已关闭', rejected: '已拒绝',
};

const statusColors: Record<string, string> = {
  pending_review: 'orange', on_sale: 'green', sold: 'default',
  hidden: 'default', closed: 'default', rejected: 'red',
};

export default function MarketPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ status?: string; category?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'market', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/market', {
        params: { ...filters, page, pageSize },
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'market'] });

  const hideMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/market/${id}/hide`),
    onSuccess: () => { message.success('已隐藏'); invalidate(); },
    onError: () => message.error('操作失败'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/market/${id}/restore`),
    onSuccess: () => { message.success('已恢复'); invalidate(); },
    onError: () => message.error('操作失败'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/market/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已拒绝');
      setRejectModalOpen(false);
      setRejectReason('');
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 150 },
    {
      title: '分类', width: 100, render: (_, r) => <Tag>{categoryLabels[r.category] || r.category || '-'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作', width: 220, render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => { setSelected(record); setDrawerOpen(true); }}>详情</Button>
          {record.status === 'pending_review' && (
            <Button
              size="small" type="link" danger
              onClick={() => { setRejectingId(record.id); setRejectReason(''); setRejectModalOpen(true); }}
            >拒绝</Button>
          )}
          {record.status !== 'hidden' && record.status !== 'rejected' && (
            <Button size="small" type="link" danger onClick={() => hideMutation.mutate(record.id)}>隐藏</Button>
          )}
          {(record.status === 'hidden' || record.status === 'rejected') && (
            <Button size="small" type="link" onClick={() => restoreMutation.mutate(record.id)}>恢复</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="闲置管理">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="分类" allowClear style={{ width: 130 }}
              value={filters.category}
              onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
              options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              placeholder="状态" allowClear style={{ width: 130 }}
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
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

        <Drawer title="闲置详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
          {selected && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="标题">{selected.title}</Descriptions.Item>
              <Descriptions.Item label="分类">{categoryLabels[selected.category] || selected.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusLabels[selected.status] || selected.status}</Descriptions.Item>
              <Descriptions.Item label="价格">{selected.price ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selected.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Modal
          title="拒绝闲置"
          open={rejectModalOpen}
          onCancel={() => setRejectModalOpen(false)}
          onOk={() => rejectMutation.mutate({ id: rejectingId, reason: rejectReason })}
          confirmLoading={rejectMutation.isPending}
        >
          <Input.TextArea
            rows={3} placeholder="拒绝原因（选填）"
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
          />
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

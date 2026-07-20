'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Card, Tag, Space, Select, Button, Drawer, Descriptions, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const typeLabels: Record<string, string> = {
  seek: '求代购',
  offer: '代购方',
};

const statusLabels: Record<string, string> = {
  pending_review: '待审核',
  open: '进行中',
  closed_for_bid: '已截止',
  purchased: '已购回',
  completed: '已完成',
  rejected: '已拒绝',
  closed: '已关闭',
  cancelled: '已下架',
};

const statusColors: Record<string, string> = {
  pending_review: 'orange',
  open: 'green',
  closed_for_bid: 'orange',
  purchased: 'blue',
  completed: 'default',
  rejected: 'red',
  closed: 'default',
  cancelled: 'red',
};

const itemStatusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
  delivered: '已交付',
};

const itemStatusColors: Record<string, string> = {
  pending: 'orange',
  confirmed: 'green',
  rejected: 'red',
  delivered: 'blue',
};

export default function GroupBuysPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ status?: string; type?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'group-buys', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/group-buys', {
        params: { ...filters, page, pageSize },
      }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'group-buys', selectedId],
    queryFn: () => api.get<null, ApiResponse<any>>(`/admin/group-buys/${selectedId}`),
    enabled: !!selectedId && drawerOpen,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'group-buys'] });

  const takedownMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/group-buys/${id}/takedown`),
    onSuccess: () => {
      message.success('已下架');
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<any> = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (v: string) => <Tag>{typeLabels[v] || v}</Tag>,
    },
    { title: '地点', dataIndex: 'location', ellipsis: true, width: 150 },
    {
      title: '出发时间',
      dataIndex: 'departAt',
      width: 180,
      render: (v: string) => v || '-',
    },
    { title: '名额', dataIndex: 'quota', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
    },
    {
      title: '响应数',
      width: 80,
      render: (_, r) => r._count?.items ?? 0,
    },
    {
      title: '发起人',
      width: 100,
      render: (_, r) => r.initiator?.nickname || '-',
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelectedId(record.id);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
          {record.status !== 'cancelled' && record.status !== 'closed' && (
            <Button
              size="small"
              type="link"
              danger
              onClick={() => takedownMutation.mutate(record.id)}
            >
              下架
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const itemColumns: ColumnsType<any> = [
    { title: '商品名', dataIndex: 'name', width: 120 },
    { title: '数量', dataIndex: 'qty', width: 60 },
    { title: '备注', dataIndex: 'note', ellipsis: true, width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => (
        <Tag color={itemStatusColors[v] || 'default'}>{itemStatusLabels[v] || v}</Tag>
      ),
    },
    {
      title: '请求人',
      width: 100,
      render: (_, r) => r.requester?.nickname || '-',
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="拼单管理">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="类型"
              allowClear
              style={{ width: 130 }}
              value={filters.type}
              onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
              options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 130 }}
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
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

        <Drawer title="拼单详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={700}>
          {detailLoading && <p>加载中...</p>}
          {detail?.data && (
            <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="ID">{detail.data.id}</Descriptions.Item>
                <Descriptions.Item label="类型">
                  {typeLabels[detail.data.type] || detail.data.type}
                </Descriptions.Item>
                <Descriptions.Item label="地点">{detail.data.location}</Descriptions.Item>
                <Descriptions.Item label="出发时间">
                  {detail.data.departAt || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="截止时间">
                  {detail.data.bidCloseAt || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="名额">{detail.data.quota}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusColors[detail.data.status] || 'default'}>
                    {statusLabels[detail.data.status] || detail.data.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="备注">{detail.data.note || '-'}</Descriptions.Item>
                <Descriptions.Item label="发起人">
                  {detail.data.initiator?.nickname || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.data.createdAt}</Descriptions.Item>
              </Descriptions>
              <h4 style={{ marginTop: 16, marginBottom: 8 }}>响应列表</h4>
              <Table
                rowKey="id"
                columns={itemColumns}
                dataSource={detail.data.items ?? []}
                pagination={false}
                size="small"
                scroll={{ x: 400 }}
              />
            </>
          )}
        </Drawer>
      </AdminLayout>
    </AuthGuard>
  );
}

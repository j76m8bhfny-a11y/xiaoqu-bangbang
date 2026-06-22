'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Tag, Space, Select, Button, Drawer, Descriptions } from 'antd';
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
  closed: '已关闭', rejected: '已拒绝',
};

const statusColors: Record<string, string> = {
  pending_review: 'orange', on_sale: 'green', sold: 'default',
  closed: 'default', rejected: 'red',
};

export default function MarketPage() {
  const [filters, setFilters] = useState<{ status?: string; category?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'market', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/market', {
        params: { ...filters, page, pageSize },
      }),
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
      title: '操作', width: 80, render: (_, record) => (
        <Button size="small" type="link" onClick={() => { setSelected(record); setDrawerOpen(true); }}>详情</Button>
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
      </AdminLayout>
    </AuthGuard>
  );
}

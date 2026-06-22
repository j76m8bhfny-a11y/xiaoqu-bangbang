'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Select, Input, Space, Tag, Drawer, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData, AuditLogDto } from '@xiaoqu-bangbang/shared';

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<{ operatorId?: string; targetType?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AuditLogDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<AuditLogDto>>>('/admin/audit-logs', {
        params: { ...filters, page, pageSize },
      }),
  });

  const columns: ColumnsType<AuditLogDto> = [
    { title: '操作者', dataIndex: 'operatorId', width: 120, ellipsis: true },
    { title: '角色', dataIndex: 'operatorRole', width: 80 },
    { title: '动作', dataIndex: 'action', width: 150 },
    { title: '目标类型', dataIndex: 'targetType', width: 100 },
    { title: '目标ID', dataIndex: 'targetId', width: 120, ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作', width: 80, render: (_, record) => (
        <a onClick={() => { setSelected(record); setDrawerOpen(true); }}>详情</a>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="审计日志">
          <Space style={{ marginBottom: 16 }}>
            <Input
              placeholder="操作者ID" allowClear style={{ width: 200 }}
              onPressEnter={(e) => setFilters((f) => ({ ...f, operatorId: (e.target as HTMLInputElement).value }))}
              onBlur={(e) => { if (!e.target.value) setFilters((f) => ({ ...f, operatorId: undefined })); }}
            />
            <Select
              placeholder="目标类型" allowClear style={{ width: 150 }}
              value={filters.targetType} onChange={(v) => setFilters((f) => ({ ...f, targetType: v }))}
              options={[
                { value: 'event', label: '事件' },
                { value: 'market_item', label: '闲置' },
                { value: 'verification', label: '认证' },
                { value: 'committee_member', label: '业委会成员' },
                { value: 'committee_member_claim', label: '认领申请' },
                { value: 'banner', label: 'Banner' },
                { value: 'service_provider', label: '服务商' },
                { value: 'system_setting', label: '系统设置' },
              ]}
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

        <Drawer title="日志详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
          {selected && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="操作者">{selected.operatorId}</Descriptions.Item>
              <Descriptions.Item label="角色">{selected.operatorRole}</Descriptions.Item>
              <Descriptions.Item label="动作">{selected.action}</Descriptions.Item>
              <Descriptions.Item label="目标类型">{selected.targetType}</Descriptions.Item>
              <Descriptions.Item label="目标ID">{selected.targetId || '-'}</Descriptions.Item>
              <Descriptions.Item label="详情">
                <pre style={{ margin: 0, maxHeight: 300, overflow: 'auto', fontSize: 12 }}>
                  {selected.detailJson ? JSON.stringify(selected.detailJson, null, 2) : '-'}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{selected.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>
      </AdminLayout>
    </AuthGuard>
  );
}

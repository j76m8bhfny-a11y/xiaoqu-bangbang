'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Card, Tabs, Tag, Space, Button, Modal, Form, Input, Select, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

export default function RankingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [awardForm] = Form.useForm();

  const badgesQuery = useQuery({
    queryKey: ['admin', 'badges'],
    queryFn: () => api.get<null, ApiResponse<{ items: any[] }>>('/admin/badges'),
  });

  const contributionsQuery = useQuery({
    queryKey: ['admin', 'contributions', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/contributions', {
        params: { page, pageSize },
      }),
  });

  const awardMutation = useMutation({
    mutationFn: ({ userId, badgeId, communityId }: { userId: string; badgeId: string; communityId: string }) =>
      api.post(`/admin/users/${userId}/badges`, { badgeId, communityId }),
    onSuccess: () => { message.success('奖章已颁发'); setAwardModalOpen(false); awardForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['admin', 'badges'] }); },
    onError: () => message.error('操作失败'),
  });

  const recalculateMutation = useMutation({
    mutationFn: () => api.post('/admin/rankings/recalculate'),
    onSuccess: () => message.success('榜单已重新计算'),
    onError: () => message.error('操作失败'),
  });

  const badgeColumns: ColumnsType<any> = [
    { title: '代码', dataIndex: 'code', width: 100 },
    { title: '名称', dataIndex: 'name', width: 120 },
    { title: '描述', dataIndex: 'description', ellipsis: true, width: 200 },
    { title: '图标', dataIndex: 'iconUrl', width: 80, render: (v: string) => v ? <img src={v} alt="" style={{ width: 32, height: 32 }} /> : '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
    {
      title: '操作', width: 100, render: (_, record) => (
        <Button size="small" type="link" onClick={() => { awardForm.setFieldsValue({ badgeId: record.id }); setAwardModalOpen(true); }}>
          颁发
        </Button>
      ),
    },
  ];

  const contributionColumns: ColumnsType<any> = [
    { title: '用户ID', dataIndex: 'userId', width: 120, ellipsis: true },
    { title: '行为', dataIndex: 'action', width: 100 },
    { title: '分数', dataIndex: 'score', width: 80 },
    { title: '花朵数', dataIndex: 'flowerCount', width: 80 },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'valid' ? 'green' : 'default'}>{v}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card>
          <Tabs
            items={[
              {
                key: 'badges',
                label: '奖章管理',
                children: (
                  <>
                    <Space style={{ marginBottom: 16 }}>
                      <Button type="primary" onClick={() => recalculateMutation.mutate()} loading={recalculateMutation.isPending}>
                        重新计算榜单
                      </Button>
                    </Space>
                    <Table
                      rowKey="id" columns={badgeColumns} dataSource={badgesQuery.data?.data?.items ?? []}
                      loading={badgesQuery.isLoading}
                    />
                  </>
                ),
              },
              {
                key: 'contributions',
                label: '贡献记录',
                children: (
                  <Table
                    rowKey="id" columns={contributionColumns} dataSource={contributionsQuery.data?.data?.items ?? []}
                    loading={contributionsQuery.isLoading}
                    pagination={{
                      current: page, pageSize, total: contributionsQuery.data?.data?.total ?? 0, showSizeChanger: true,
                      onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                  />
                ),
              },
            ]}
          />
        </Card>

        <Modal title="颁发奖章" open={awardModalOpen} onCancel={() => setAwardModalOpen(false)}
          onOk={() => awardForm.validateFields().then((v) => awardMutation.mutate(v))}
          confirmLoading={awardMutation.isPending}
        >
          <Form form={awardForm} layout="vertical">
            <Form.Item name="userId" label="用户ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="badgeId" label="奖章" rules={[{ required: true }]}>
              <Select options={(badgesQuery.data?.data?.items ?? []).map((b: any) => ({ value: b.id, label: b.name }))} />
            </Form.Item>
            <Form.Item name="communityId" label="小区ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="reason" label="颁发原因" rules={[{ required: true }]}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

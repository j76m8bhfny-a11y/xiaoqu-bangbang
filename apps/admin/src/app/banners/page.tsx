'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下线',
};

const statusColors: Record<string, string> = {
  draft: 'default',
  published: 'green',
  offline: 'red',
};

const positionLabels: Record<string, string> = {
  home_top: '首页顶部',
  event_list: '事件列表',
  market_list: '闲置列表',
};

const linkTypeLabels: Record<string, string> = {
  event: '事件',
  market: '闲置',
  announcement: '公告',
  service_provider: '服务商',
  url: '链接',
  none: '无',
};

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'banners', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/banners', {
        params: { page, pageSize },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin/banners', values),
    onSuccess: () => {
      message.success('Banner已创建');
      setCreateModalOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: () => message.error('创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin/banners/${id}`, values),
    onSuccess: () => {
      message.success('Banner已更新');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: () => message.error('更新失败'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/banners/${id}/publish`),
    onSuccess: () => {
      message.success('已发布');
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: () => message.error('操作失败'),
  });

  const offlineMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/banners/${id}/offline`),
    onSuccess: () => {
      message.success('已下线');
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: () => message.error('操作失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => {
      message.success('Banner已删除');
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: () => message.error('删除失败'),
  });

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 150 },
    { title: '副标题', dataIndex: 'subtitle', ellipsis: true, width: 120 },
    {
      title: '位置',
      dataIndex: 'position',
      width: 100,
      render: (v: string) => positionLabels[v] || v,
    },
    {
      title: '链接类型',
      dataIndex: 'linkType',
      width: 80,
      render: (v: string) => linkTypeLabels[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v]}</Tag>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setEditingItem(record);
              editForm.setFieldsValue(record);
              setEditModalOpen(true);
            }}
          >
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button size="small" type="link" onClick={() => publishMutation.mutate(record.id)}>
              发布
            </Button>
          )}
          {record.status === 'published' && (
            <Button
              size="small"
              type="link"
              danger
              onClick={() => offlineMutation.mutate(record.id)}
            >
              下线
            </Button>
          )}
          <Popconfirm title="确定删除此Banner？" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="Banner广告">
          <Button
            type="primary"
            style={{ marginBottom: 16 }}
            onClick={() => setCreateModalOpen(true)}
          >
            新增Banner
          </Button>
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

        <Modal
          title="新增Banner"
          open={createModalOpen}
          onCancel={() => setCreateModalOpen(false)}
          onOk={() => createForm.validateFields().then((v) => createMutation.mutate(v))}
          confirmLoading={createMutation.isPending}
          width={600}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="subtitle" label="副标题">
              <Input />
            </Form.Item>
            <Form.Item name="imageUrl" label="图片URL" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="position" label="位置" initialValue="home_top">
              <Select
                options={Object.entries(positionLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Form.Item>
            <Form.Item name="linkType" label="链接类型" initialValue="none">
              <Select
                options={Object.entries(linkTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Form.Item>
            <Form.Item name="linkId" label="链接ID">
              <Input />
            </Form.Item>
            <Form.Item name="linkUrl" label="链接URL">
              <Input />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="编辑Banner"
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={() =>
            editForm
              .validateFields()
              .then((v) => updateMutation.mutate({ id: editingItem.id, ...v }))
          }
          confirmLoading={updateMutation.isPending}
          width={600}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="subtitle" label="副标题">
              <Input />
            </Form.Item>
            <Form.Item name="imageUrl" label="图片URL">
              <Input />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Form>
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

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
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

export default function SocialGroupsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'social-groups', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/community-social-groups', {
        params: { page, pageSize },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin/community-social-groups', values),
    onSuccess: () => {
      message.success('社群已创建');
      setCreateModalOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['admin', 'social-groups'] });
    },
    onError: () => message.error('创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) =>
      api.patch(`/admin/community-social-groups/${id}`, values),
    onSuccess: () => {
      message.success('社群已更新');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'social-groups'] });
    },
    onError: () => message.error('更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/community-social-groups/${id}`),
    onSuccess: () => {
      message.success('社群已删除');
      queryClient.invalidateQueries({ queryKey: ['admin', 'social-groups'] });
    },
    onError: () => message.error('删除失败'),
  });

  const visibleLabels: Record<string, string> = {
    verified_only: '仅认证用户',
    public: '所有人',
  };

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', width: 150 },
    { title: '描述', dataIndex: 'description', ellipsis: true, width: 200 },
    {
      title: '可见性',
      dataIndex: 'visibleTo',
      width: 100,
      render: (v: string) => <Tag>{visibleLabels[v] || v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '活跃' : '停用'}</Tag>
      ),
    },
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space size="small">
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
          <Button size="small" type="link" danger onClick={() => deleteMutation.mutate(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="社群入口">
          <Button
            type="primary"
            style={{ marginBottom: 16 }}
            onClick={() => setCreateModalOpen(true)}
          >
            新增社群
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
          title="新增社群"
          open={createModalOpen}
          onCancel={() => setCreateModalOpen(false)}
          onOk={() => createForm.validateFields().then((v) => createMutation.mutate(v))}
          confirmLoading={createMutation.isPending}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="communityId" label="小区ID" rules={[{ required: true }]}>
              <Input placeholder="输入小区 UUID" />
            </Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="qrImageUrl" label="二维码图片URL">
              <Input />
            </Form.Item>
            <Form.Item name="contactText" label="联系方式">
              <Input />
            </Form.Item>
            <Form.Item name="visibleTo" label="可见性" initialValue="verified_only">
              <Select
                options={[
                  { value: 'verified_only', label: '仅认证用户' },
                  { value: 'public', label: '所有人' },
                ]}
              />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="编辑社群"
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={() =>
            editForm
              .validateFields()
              .then((v) => updateMutation.mutate({ id: editingItem.id, ...v }))
          }
          confirmLoading={updateMutation.isPending}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="qrImageUrl" label="二维码图片URL">
              <Input />
            </Form.Item>
            <Form.Item name="contactText" label="联系方式">
              <Input />
            </Form.Item>
            <Form.Item name="visibleTo" label="可见性">
              <Select
                options={[
                  { value: 'verified_only', label: '仅认证用户' },
                  { value: 'public', label: '所有人' },
                ]}
              />
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

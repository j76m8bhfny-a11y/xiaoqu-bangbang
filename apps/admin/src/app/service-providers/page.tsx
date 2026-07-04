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

const categoryLabels: Record<string, string> = {
  repair: '维修',
  cleaning: '保洁',
  lock: '开锁',
  home_appliance: '家电',
  moving: '搬家',
  pet: '宠物',
  other: '其他',
};

const statusLabels: Record<string, string> = {
  pending_review: '待审核',
  published: '已发布',
  offline: '已下线',
  rejected: '已拒绝',
};

const statusColors: Record<string, string> = {
  pending_review: 'orange',
  published: 'green',
  offline: 'default',
  rejected: 'red',
};

const sourceLabels: Record<string, string> = {
  platform: '平台',
  committee: '业委会',
  community: '社区',
};

export default function ServiceProvidersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'service-providers', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/service-providers', {
        params: { page, pageSize },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin/service-providers', values),
    onSuccess: () => {
      message.success('服务商已创建');
      setCreateModalOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-providers'] });
    },
    onError: () => message.error('创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin/service-providers/${id}`, values),
    onSuccess: () => {
      message.success('服务商已更新');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-providers'] });
    },
    onError: () => message.error('更新失败'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/service-providers/${id}/publish`),
    onSuccess: () => {
      message.success('已发布');
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-providers'] });
    },
    onError: () => message.error('操作失败'),
  });

  const offlineMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/service-providers/${id}/offline`),
    onSuccess: () => {
      message.success('已下线');
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-providers'] });
    },
    onError: () => message.error('操作失败'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/service-providers/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已拒绝');
      setRejectModalOpen(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'service-providers'] });
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<any> = [
    { title: '名称', dataIndex: 'name', ellipsis: true, width: 120 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 80,
      render: (v: string) => categoryLabels[v] || v,
    },
    { title: '联系方式', dataIndex: 'contactText', width: 120, ellipsis: true },
    {
      title: '推荐来源',
      dataIndex: 'recommendationSource',
      width: 80,
      render: (v: string) => sourceLabels[v] || v,
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
      width: 250,
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
          {record.status === 'pending_review' && (
            <Button size="small" type="link" onClick={() => publishMutation.mutate(record.id)}>
              发布
            </Button>
          )}
          {record.status === 'pending_review' && (
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
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="服务商推荐">
          <Button
            type="primary"
            style={{ marginBottom: 16 }}
            onClick={() => setCreateModalOpen(true)}
          >
            新增服务商
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
          title="新增服务商"
          open={createModalOpen}
          onCancel={() => setCreateModalOpen(false)}
          onOk={() => createForm.validateFields().then((v) => createMutation.mutate(v))}
          confirmLoading={createMutation.isPending}
          width={600}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="communityId" label="小区ID" rules={[{ required: true }]}>
              <Input placeholder="输入小区 UUID" />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select
                options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="contactText" label="联系方式">
              <Input />
            </Form.Item>
            <Form.Item name="serviceArea" label="服务区域">
              <Input />
            </Form.Item>
            <Form.Item name="recommendationSource" label="推荐来源" initialValue="platform">
              <Select
                options={Object.entries(sourceLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Form.Item>
            <Form.Item name="logoUrl" label="Logo URL">
              <Input />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="编辑服务商"
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
            <Form.Item name="name" label="名称" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Select
                options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
              />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber min={0} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="拒绝服务商"
          open={rejectModalOpen}
          onOk={() => {
            if (rejectReason) rejectMutation.mutate({ id: rejectId, reason: rejectReason });
          }}
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

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Card, Tag, Space, Button, Modal, Form, Input, Upload, message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const statusLabels: Record<string, string> = {
  draft: '草稿', published: '已发布', hidden: '已隐藏',
};

const statusColors: Record<string, string> = {
  draft: 'default', published: 'green', hidden: 'red',
};

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'announcements', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/committee/announcements', {
        params: { page, pageSize },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin/committee/announcements', values),
    onSuccess: () => { message.success('公告已创建'); setCreateModalOpen(false); createForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }); },
    onError: () => message.error('创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin/committee/announcements/${id}`, values),
    onSuccess: () => { message.success('公告已更新'); setEditModalOpen(false); queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }); },
    onError: () => message.error('更新失败'),
  });

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 200 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
    },
    {
      title: '置顶', dataIndex: 'isPinned', width: 60,
      render: (v: boolean) => v ? <Tag color="blue">是</Tag> : '否',
    },
    { title: '发布者', dataIndex: 'publisherNickname', width: 100 },
    { title: '发布时间', dataIndex: 'publishedAt', width: 180 },
    {
      title: '操作', width: 250, render: (_, record) => (
        <Space size="small" wrap>
          <Button size="small" type="link" onClick={() => { setEditingItem(record); editForm.setFieldsValue(record); setEditModalOpen(true); }}>编辑</Button>
          {record.status === 'draft' && (
            <Button size="small" type="link" onClick={() => updateMutation.mutate({ id: record.id, status: 'published' })}>发布</Button>
          )}
          {!record.isPinned && record.status === 'published' && (
            <Button size="small" type="link" onClick={() => updateMutation.mutate({ id: record.id, isPinned: true })}>置顶</Button>
          )}
          {record.isPinned && (
            <Button size="small" type="link" onClick={() => updateMutation.mutate({ id: record.id, isPinned: false })}>取消置顶</Button>
          )}
          {record.status === 'published' && (
            <Button size="small" type="link" danger onClick={() => updateMutation.mutate({ id: record.id, status: 'hidden' })}>隐藏</Button>
          )}
          {record.status === 'hidden' && (
            <Button size="small" type="link" onClick={() => updateMutation.mutate({ id: record.id, status: 'published' })}>恢复</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="公告管理">
          <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setCreateModalOpen(true)}>
            新增公告
          </Button>
          <Table
            rowKey="id" columns={columns} dataSource={data?.data?.items ?? []} loading={isLoading}
            pagination={{
              current: page, pageSize, total: data?.data?.total ?? 0, showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>

        <Modal title="新增公告" open={createModalOpen} onCancel={() => setCreateModalOpen(false)}
          onOk={() => createForm.validateFields().then((v) => createMutation.mutate({ ...v, images: imageUrls }))}
          confirmLoading={createMutation.isPending} width={600}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true }]}>
              <Input.TextArea rows={6} />
            </Form.Item>
            <Form.Item label="图片">
              <Upload
                action="/api/v1/upload"
                listType="picture-card"
                maxCount={9}
                onChange={({ fileList }) => {
                  setImageUrls(fileList.filter((f) => f.status === 'done').map((f) => f.response?.data?.url || f.url).filter(Boolean) as string[]);
                }}
              >
                <UploadOutlined />
              </Upload>
            </Form.Item>
          </Form>
        </Modal>

        <Modal title="编辑公告" open={editModalOpen} onCancel={() => setEditModalOpen(false)}
          onOk={() => editForm.validateFields().then((v) => updateMutation.mutate({ id: editingItem.id, ...v, images: editImageUrls }))}
          confirmLoading={updateMutation.isPending} width={600}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true }]}>
              <Input.TextArea rows={6} />
            </Form.Item>
          </Form>
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

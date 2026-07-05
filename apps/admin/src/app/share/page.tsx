'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Card, Tabs, Tag, Space, Button, Modal, Form, Input, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type {
  ApiResponse,
  PaginatedData,
  ShareTemplateDto,
  ShareLogDto,
} from '@xiaoqu-bangbang/shared';

export default function SharePage() {
  const queryClient = useQueryClient();
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(20);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShareTemplateDto | null>(null);
  const [editForm] = Form.useForm();

  const templatesQuery = useQuery({
    queryKey: ['admin', 'share-templates'],
    queryFn: () =>
      api.get<null, ApiResponse<{ items: ShareTemplateDto[] }>>('/admin/share-templates'),
  });

  const logsQuery = useQuery({
    queryKey: ['admin', 'share-logs', logPage, logPageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<ShareLogDto>>>('/admin/share-logs', {
        params: { page: logPage, pageSize: logPageSize },
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin/share-templates/${id}`, values),
    onSuccess: () => {
      message.success('模板已更新');
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'share-templates'] });
    },
    onError: () => message.error('更新失败'),
  });

  const templateColumns: ColumnsType<ShareTemplateDto> = [
    { title: '目标类型', dataIndex: 'targetType', width: 120 },
    { title: '标题模板', dataIndex: 'titleTemplate', ellipsis: true, width: 200 },
    { title: '默认图片', dataIndex: 'defaultImageUrl', ellipsis: true, width: 200 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button
          size="small"
          type="link"
          onClick={() => {
            setEditingTemplate(record);
            editForm.setFieldsValue(record);
            setEditModalOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const logColumns: ColumnsType<ShareLogDto> = [
    { title: '用户', dataIndex: 'userId', width: 120, ellipsis: true },
    { title: '目标类型', dataIndex: 'targetType', width: 100 },
    { title: '目标ID', dataIndex: 'targetId', width: 120, ellipsis: true },
    { title: '渠道', dataIndex: 'channel', width: 80 },
    { title: '分享标题', dataIndex: 'shareTitle', width: 150, ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card>
          <Tabs
            items={[
              {
                key: 'templates',
                label: '分享模板',
                children: (
                  <Table
                    rowKey="id"
                    columns={templateColumns}
                    dataSource={templatesQuery.data?.data?.items ?? []}
                    loading={templatesQuery.isLoading}
                  />
                ),
              },
              {
                key: 'logs',
                label: '分享日志',
                children: (
                  <Table
                    rowKey="id"
                    columns={logColumns}
                    dataSource={logsQuery.data?.data?.items ?? []}
                    loading={logsQuery.isLoading}
                    pagination={{
                      current: logPage,
                      pageSize: logPageSize,
                      total: logsQuery.data?.data?.total ?? 0,
                      showSizeChanger: true,
                      onChange: (p, ps) => {
                        setLogPage(p);
                        setLogPageSize(ps);
                      },
                    }}
                  />
                ),
              },
            ]}
          />
        </Card>

        <Modal
          title="编辑分享模板"
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={() =>
            editForm
              .validateFields()
              .then((v) => updateMutation.mutate({ id: editingTemplate?.id, ...v }))
          }
          confirmLoading={updateMutation.isPending}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="titleTemplate" label="标题模板" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="defaultImageUrl" label="默认图片URL">
              <Input />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                options={[
                  { value: 'draft', label: '草稿' },
                  { value: 'published', label: '已发布' },
                  { value: 'disabled', label: '已禁用' },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

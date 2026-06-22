'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Card, Tag, Space, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Switch, message, Drawer,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const statusLabels: Record<string, string> = {
  draft: '草稿', published: '已发布', closed: '已关闭',
};

const statusColors: Record<string, string> = {
  draft: 'default', published: 'green', closed: 'default',
};

export default function VotesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [resultsDrawerOpen, setResultsDrawerOpen] = useState(false);
  const [resultsVoteId, setResultsVoteId] = useState('');
  const [options, setOptions] = useState<string[]>(['']);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'votes', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/votes', {
        params: { page, pageSize },
      }),
  });

  const resultsQuery = useQuery({
    queryKey: ['admin', 'votes', resultsVoteId, 'results'],
    queryFn: () => api.get<null, ApiResponse<{ items: any[] }>>(`/admin/votes/${resultsVoteId}/results`),
    enabled: !!resultsVoteId,
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin/votes', values),
    onSuccess: () => { message.success('投票已创建'); setCreateModalOpen(false); createForm.resetFields(); setOptions(['']); queryClient.invalidateQueries({ queryKey: ['admin', 'votes'] }); },
    onError: () => message.error('创建失败'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/votes/${id}/publish`),
    onSuccess: () => { message.success('已发布'); queryClient.invalidateQueries({ queryKey: ['admin', 'votes'] }); },
    onError: () => message.error('操作失败'),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/votes/${id}/close`),
    onSuccess: () => { message.success('已关闭'); queryClient.invalidateQueries({ queryKey: ['admin', 'votes'] }); },
    onError: () => message.error('操作失败'),
  });

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    createForm.validateFields().then((values) => {
      createMutation.mutate({
        ...values,
        startAt: values.startAt?.toISOString(),
        endAt: values.endAt?.toISOString(),
        options: options.filter((o) => o.trim()),
      });
    });
  };

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 200 },
    {
      title: '类型', dataIndex: 'voteType', width: 80,
      render: (v: string) => v === 'single' ? '单选' : '多选',
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v]}</Tag>,
    },
    { title: '开始时间', dataIndex: 'startAt', width: 180 },
    { title: '结束时间', dataIndex: 'endAt', width: 180 },
    {
      title: '操作', width: 220, render: (_, record) => (
        <Space size="small" wrap>
          {record.status === 'draft' && (
            <Button size="small" type="link" onClick={() => publishMutation.mutate(record.id)}>发布</Button>
          )}
          {record.status === 'published' && (
            <Button size="small" type="link" danger onClick={() => closeMutation.mutate(record.id)}>关闭</Button>
          )}
          <Button size="small" type="link" onClick={() => { setResultsVoteId(record.id); setResultsDrawerOpen(true); }}>
            查看结果
          </Button>
        </Space>
      ),
    },
  ];

  const maxCount = resultsQuery.data?.data?.items?.reduce((max: number, item: any) => Math.max(max, item.count), 0) || 1;

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="投票管理">
          <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setCreateModalOpen(true)}>
            新增投票
          </Button>
          <Table
            rowKey="id" columns={columns} dataSource={data?.data?.items ?? []} loading={isLoading}
            pagination={{
              current: page, pageSize, total: data?.data?.total ?? 0, showSizeChanger: true,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>

        <Modal title="新增投票" open={createModalOpen} onCancel={() => setCreateModalOpen(false)}
          onOk={handleCreate} confirmLoading={createMutation.isPending} width={600}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="voteType" label="投票类型" initialValue="single">
              <Select options={[{ value: 'single', label: '单选' }, { value: 'multiple', label: '多选' }]} />
            </Form.Item>
            <Form.Item name="resultVisibility" label="结果可见性" initialValue="after_vote">
              <Select options={[
                { value: 'always', label: '始终可见' },
                { value: 'after_vote', label: '投票后可见' },
                { value: 'after_end', label: '结束后可见' },
                { value: 'admin_only', label: '仅管理员' },
              ]} />
            </Form.Item>
            <Form.Item name="isAnonymous" label="匿名投票" valuePropName="checked">
              <Select options={[{ value: true, label: '是' }, { value: false, label: '否' }]} />
            </Form.Item>
            <Form.Item name="onlyVerified" label="仅认证用户" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="startAt" label="开始时间" rules={[{ required: true }]}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endAt" label="结束时间" rules={[{ required: true }]}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>选项</div>
              {options.map((opt, i) => (
                <Space key={i} style={{ display: 'flex', marginBottom: 8 }}>
                  <Input placeholder={`选项 ${i + 1}`} value={opt} onChange={(e) => updateOption(i, e.target.value)} />
                  {options.length > 1 && <Button danger onClick={() => removeOption(i)}>删除</Button>}
                </Space>
              ))}
              <Button type="dashed" onClick={addOption} block>添加选项</Button>
            </div>
          </Form>
        </Modal>

        <Drawer title="投票结果" open={resultsDrawerOpen} onClose={() => setResultsDrawerOpen(false)} width={500}>
          {resultsQuery.data?.data?.items?.map((item: any) => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4 }}>{item.content}</div>
              <div style={{
                background: '#f0f0f0', borderRadius: 4, height: 24, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  background: '#1890ff',
                  width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : '0%',
                  height: '100%',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>{item.count} 票</div>
            </div>
          )) || '暂无数据'}
        </Drawer>
      </AdminLayout>
    </AuthGuard>
  );
}

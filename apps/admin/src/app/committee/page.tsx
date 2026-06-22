'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Card, Tabs, Tag, Space, Button, Drawer, Descriptions, Modal, Form, Input, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const claimStatusLabels: Record<string, string> = {
  unclaimed: '未认领', pending: '待审核', claimed: '已认领', rejected: '已拒绝',
};

const claimStatusColors: Record<string, string> = {
  unclaimed: 'default', pending: 'orange', claimed: 'green', rejected: 'red',
};

export default function CommitteePage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [claimDrawerOpen, setClaimDrawerOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectClaimId, setRejectClaimId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const membersQuery = useQuery({
    queryKey: ['admin', 'committee', 'members', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/committee/members', {
        params: { page, pageSize },
      }),
  });

  const claimsQuery = useQuery({
    queryKey: ['admin', 'committee', 'claims', page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/committee-claims', {
        params: { page, pageSize },
      }),
  });

  const createMemberMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin/committee/members', values),
    onSuccess: () => { message.success('成员已创建'); setCreateModalOpen(false); createForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['admin', 'committee', 'members'] }); },
    onError: () => message.error('创建失败'),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin/committee/members/${id}`, values),
    onSuccess: () => { message.success('成员已更新'); setEditModalOpen(false); queryClient.invalidateQueries({ queryKey: ['admin', 'committee', 'members'] }); },
    onError: () => message.error('更新失败'),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/committee/members/${id}`),
    onSuccess: () => { message.success('成员已删除'); queryClient.invalidateQueries({ queryKey: ['admin', 'committee', 'members'] }); },
    onError: () => message.error('删除失败'),
  });

  const approveClaimMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/committee-claims/${id}/approve`),
    onSuccess: () => { message.success('认领已通过'); setClaimDrawerOpen(false); queryClient.invalidateQueries({ queryKey: ['admin', 'committee', 'claims'] }); },
    onError: () => message.error('操作失败'),
  });

  const rejectClaimMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/committee-claims/${id}/reject`, { reason }),
    onSuccess: () => { message.success('认领已拒绝'); setRejectModalOpen(false); setClaimDrawerOpen(false); queryClient.invalidateQueries({ queryKey: ['admin', 'committee', 'claims'] }); },
    onError: () => message.error('操作失败'),
  });

  const memberColumns: ColumnsType<any> = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '职位', dataIndex: 'position', width: 100 },
    { title: '职责', dataIndex: 'responsibility', width: 150, ellipsis: true },
    {
      title: '认领状态', dataIndex: 'claimStatus', width: 100,
      render: (v: string) => <Tag color={claimStatusColors[v]}>{claimStatusLabels[v] || v}</Tag>,
    },
    { title: '任期开始', dataIndex: 'termStart', width: 120 },
    { title: '任期结束', dataIndex: 'termEnd', width: 120 },
    {
      title: '操作', width: 150, render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => { setEditingMember(record); editForm.setFieldsValue(record); setEditModalOpen(true); }}>编辑</Button>
          <Button size="small" type="link" danger onClick={() => deleteMemberMutation.mutate(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const claimColumns: ColumnsType<any> = [
    { title: '用户ID', dataIndex: 'userId', width: 120, ellipsis: true },
    { title: '成员ID', dataIndex: 'committeeMemberId', width: 120, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={claimStatusColors[v]}>{claimStatusLabels[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作', width: 150, render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => { setSelectedClaim(record); setClaimDrawerOpen(true); }}>详情</Button>
          {record.status === 'pending' && (
            <>
              <Button size="small" type="link" onClick={() => approveClaimMutation.mutate(record.id)}>通过</Button>
              <Button size="small" type="link" danger onClick={() => { setRejectClaimId(record.id); setRejectModalOpen(true); }}>拒绝</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card>
          <Tabs
            items={[
              {
                key: 'members',
                label: '业委会成员',
                children: (
                  <>
                    <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setCreateModalOpen(true)}>
                      新增成员
                    </Button>
                    <Table
                      rowKey="id" columns={memberColumns} dataSource={membersQuery.data?.data?.items ?? []}
                      loading={membersQuery.isLoading}
                      pagination={{
                        current: page, pageSize, total: membersQuery.data?.data?.total ?? 0, showSizeChanger: true,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                      }}
                    />
                  </>
                ),
              },
              {
                key: 'claims',
                label: '认领申请',
                children: (
                  <Table
                    rowKey="id" columns={claimColumns} dataSource={claimsQuery.data?.data?.items ?? []}
                    loading={claimsQuery.isLoading}
                    pagination={{
                      current: page, pageSize, total: claimsQuery.data?.data?.total ?? 0, showSizeChanger: true,
                      onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                  />
                ),
              },
            ]}
          />
        </Card>

        <Modal title="新增成员" open={createModalOpen} onCancel={() => setCreateModalOpen(false)}
          onOk={() => createForm.validateFields().then((v) => createMemberMutation.mutate(v))}
          confirmLoading={createMemberMutation.isPending}
        >
          <Form form={createForm} layout="vertical">
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="position" label="职位" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="responsibility" label="职责">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="avatarUrl" label="头像URL">
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        <Modal title="编辑成员" open={editModalOpen} onCancel={() => setEditModalOpen(false)}
          onOk={() => editForm.validateFields().then((v) => updateMemberMutation.mutate({ id: editingMember.id, ...v }))}
          confirmLoading={updateMemberMutation.isPending}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="position" label="职位" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="responsibility" label="职责">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        <Drawer title="认领详情" open={claimDrawerOpen} onClose={() => setClaimDrawerOpen(false)} width={500}>
          {selectedClaim && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selectedClaim.id}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{selectedClaim.userId}</Descriptions.Item>
              <Descriptions.Item label="成员ID">{selectedClaim.committeeMemberId}</Descriptions.Item>
              <Descriptions.Item label="声明">{selectedClaim.statement || '-'}</Descriptions.Item>
              <Descriptions.Item label="材料">
                {selectedClaim.materialUrls?.map((url: string, i: number) => (
                  <div key={i}><a href={url} target="_blank" rel="noreferrer">{url}</a></div>
                )) || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={claimStatusColors[selectedClaim.status]}>{claimStatusLabels[selectedClaim.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{selectedClaim.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Modal title="拒绝认领" open={rejectModalOpen}
          onOk={() => { if (rejectReason) rejectClaimMutation.mutate({ id: rejectClaimId, reason: rejectReason }); }}
          onCancel={() => setRejectModalOpen(false)}
          confirmLoading={rejectClaimMutation.isPending}
        >
          <Input.TextArea rows={3} placeholder="请输入拒绝原因" value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)} />
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

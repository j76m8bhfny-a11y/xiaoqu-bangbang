'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Card,
  Select,
  Tag,
  Space,
  Button,
  Drawer,
  Descriptions,
  message,
  Modal,
  Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

interface VerificationItem {
  id: string;
  userId: string;
  communityId: string;
  materialType: string;
  status: string;
  createdAt: string;
  user?: { id: string; nickname: string };
}

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  manual_review: '人工审核',
};

const statusColors: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
  manual_review: 'blue',
};

const materialLabels: Record<string, string> = {
  property_cert: '房产证',
  rent_contract: '租赁合同',
  access_card: '门禁卡',
  other: '其他',
};

export default function VerificationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<VerificationItem | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'verifications', status, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<VerificationItem>>>('/admin/verifications', {
        params: { status, page, pageSize },
      }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'verifications', selected?.id],
    queryFn: () => api.get<null, ApiResponse<any>>(`/admin/verifications/${selected?.id}`),
    enabled: !!selected?.id,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/verifications/${id}/approve`),
    onSuccess: () => {
      message.success('已通过');
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      setDrawerOpen(false);
    },
    onError: () => message.error('操作失败'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/verifications/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已拒绝');
      setRejectModalOpen(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
      setDrawerOpen(false);
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<VerificationItem> = [
    { title: '用户', dataIndex: ['user', 'nickname'], width: 120 },
    { title: '小区ID', dataIndex: 'communityId', width: 120, ellipsis: true },
    {
      title: '材料类型',
      dataIndex: 'materialType',
      width: 100,
      render: (v: string) => materialLabels[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelected(record);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
          {record.status === 'pending' || record.status === 'manual_review' ? (
            <>
              <Button size="small" type="link" onClick={() => approveMutation.mutate(record.id)}>
                通过
              </Button>
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
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="用户与认证">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="审核状态"
              allowClear
              style={{ width: 150 }}
              value={status}
              onChange={setStatus}
              options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
          </Space>
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

        <Drawer title="认证详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={600}>
          {selected && detailQuery.data?.data && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{detailQuery.data.data.id}</Descriptions.Item>
              <Descriptions.Item label="用户">
                {detailQuery.data.data.user?.nickname}
              </Descriptions.Item>
              <Descriptions.Item label="材料类型">
                {materialLabels[detailQuery.data.data.materialType] ||
                  detailQuery.data.data.materialType}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[detailQuery.data.data.status]}>
                  {statusLabels[detailQuery.data.data.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="OCR结果">
                <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                  {detailQuery.data.data.ocrResultJson
                    ? JSON.stringify(detailQuery.data.data.ocrResultJson, null, 2)
                    : '-'}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="AI匹配">
                <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                  {detailQuery.data.data.aiResultJson
                    ? JSON.stringify(detailQuery.data.data.aiResultJson, null, 2)
                    : '-'}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="脱敏材料">
                {detailQuery.data.data.maskedFileUrl || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="同意快照">
                <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                  {detailQuery.data.data.consentSnapshot
                    ? JSON.stringify(detailQuery.data.data.consentSnapshot, null, 2)
                    : '-'}
                </pre>
              </Descriptions.Item>
              <Descriptions.Item label="拒绝原因">
                {detailQuery.data.data.rejectReason || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detailQuery.data.data.createdAt}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Modal
          title="拒绝认证"
          open={rejectModalOpen}
          onOk={() => {
            if (rejectReason) {
              rejectMutation.mutate({ id: rejectId, reason: rejectReason });
            } else {
              message.error('请输入拒绝原因');
            }
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

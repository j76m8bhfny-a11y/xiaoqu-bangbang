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
import type { ApiResponse, PaginatedData, ReportDto } from '@xiaoqu-bangbang/shared';

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processed: '已处理',
  rejected: '已驳回',
};

const statusColors: Record<string, string> = {
  pending: 'orange',
  processed: 'green',
  rejected: 'default',
};

const reasonLabels: Record<string, string> = {
  privacy: '隐私泄露',
  false_info: '虚假信息',
  harassment: '骚扰',
  illegal: '违法违规',
  ad_spam: '广告',
  other: '其他',
};

const targetTypeLabels: Record<string, string> = {
  event: '事件',
  event_comment: '事件评论',
  market_item: '闲置',
  market_comment: '闲置评论',
  user: '用户',
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ReportDto | null>(null);
  const [reasonModal, setReasonModal] = useState<{
    type: 'takedown' | 'warn' | 'ban';
    id: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', status, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<ReportDto>>>('/admin/reports', {
        params: { status, page, pageSize },
      }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/reports/${id}/dismiss`),
    onSuccess: () => {
      message.success('举报已驳回');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setDrawerOpen(false);
    },
    onError: () => message.error('操作失败'),
  });

  const takedownMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/reports/${id}/takedown`, { reason }),
    onSuccess: () => {
      message.success('内容已下架');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setDrawerOpen(false);
      setReasonModal(null);
      setReasonText('');
    },
    onError: () => message.error('操作失败'),
  });

  const warnMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/reports/${id}/warn`, { reason }),
    onSuccess: () => {
      message.success('已警告用户');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setDrawerOpen(false);
      setReasonModal(null);
      setReasonText('');
    },
    onError: () => message.error('操作失败'),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/reports/${id}/ban`, { reason }),
    onSuccess: () => {
      message.success('已封禁用户');
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      setDrawerOpen(false);
      setReasonModal(null);
      setReasonText('');
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<ReportDto> = [
    { title: '举报者', dataIndex: 'reporterId', width: 120, ellipsis: true },
    {
      title: '目标类型',
      dataIndex: 'targetType',
      width: 100,
      render: (v: string) => targetTypeLabels[v] || v,
    },
    { title: '目标ID', dataIndex: 'targetId', width: 120, ellipsis: true },
    {
      title: '原因',
      dataIndex: 'reason',
      width: 100,
      render: (v: string) => reasonLabels[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space size="small" wrap>
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
          {record.status === 'pending' && (
            <>
              <Button size="small" type="link" onClick={() => dismissMutation.mutate(record.id)}>
                驳回
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => {
                  setReasonModal({ type: 'takedown', id: record.id });
                  setReasonText('');
                }}
              >
                下架
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setReasonModal({ type: 'warn', id: record.id });
                  setReasonText('');
                }}
              >
                警告
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => {
                  setReasonModal({ type: 'ban', id: record.id });
                  setReasonText('');
                }}
              >
                封禁
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="举报管理">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 130 }}
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

        <Drawer title="举报详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
          {selected && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
              <Descriptions.Item label="举报者">{selected.reporterId}</Descriptions.Item>
              <Descriptions.Item label="目标类型">
                {targetTypeLabels[selected.targetType] || selected.targetType}
              </Descriptions.Item>
              <Descriptions.Item label="目标ID">{selected.targetId}</Descriptions.Item>
              <Descriptions.Item label="原因">
                {reasonLabels[selected.reason] || selected.reason}
              </Descriptions.Item>
              <Descriptions.Item label="描述">{selected.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[selected.status]}>{statusLabels[selected.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="处理人">{selected.handledBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="处理时间">{selected.handledAt || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{selected.createdAt}</Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Modal
          title={
            reasonModal?.type === 'takedown'
              ? '下架内容'
              : reasonModal?.type === 'warn'
                ? '警告用户'
                : '封禁用户'
          }
          open={!!reasonModal}
          onOk={() => {
            if (!reasonModal || !reasonText.trim()) {
              message.warning('请输入处理原因');
              return;
            }
            const mutation =
              reasonModal.type === 'takedown'
                ? takedownMutation
                : reasonModal.type === 'warn'
                  ? warnMutation
                  : banMutation;
            mutation.mutate({ id: reasonModal.id, reason: reasonText.trim() });
          }}
          onCancel={() => {
            setReasonModal(null);
            setReasonText('');
          }}
          confirmLoading={
            takedownMutation.isPending || warnMutation.isPending || banMutation.isPending
          }
          okText="确认"
          cancelText="取消"
        >
          <Input.TextArea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="请输入处理原因（必填）"
            rows={3}
            autoFocus
          />
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

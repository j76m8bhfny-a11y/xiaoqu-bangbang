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
  Image,
  Avatar,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type {
  ApiResponse,
  PaginatedData,
  AdminCommunityApplicationDto,
} from '@xiaoqu-bangbang/shared';

const statusColors: Record<string, string> = {
  pending: 'blue',
  approved: 'green',
  rejected: 'red',
};
const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};
const materialLabels: Record<string, string> = {
  property_cert: '房产证',
  rent_contract: '租房合同',
  access_card: '门禁卡',
  other: '其他',
};

export default function CommunityApplicationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | undefined>('pending');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'community-applications', status, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<AdminCommunityApplicationDto>>>(
        '/admin/community-applications',
        { params: { status, page, pageSize } },
      ),
  });

  const { data: detailData } = useQuery({
    queryKey: ['admin', 'community-applications', selectedId],
    queryFn: () =>
      api.get<null, ApiResponse<AdminCommunityApplicationDto>>(
        `/admin/community-applications/${selectedId}`,
      ),
    enabled: !!selectedId && drawerOpen,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'community-applications'] });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/community-applications/${id}/approve`),
    onSuccess: () => {
      message.success('已通过，小区已开通');
      invalidate();
      setDrawerOpen(false);
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '操作失败'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/community-applications/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已驳回');
      setRejectOpen(false);
      setRejectReason('');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '操作失败'),
  });

  const columns: ColumnsType<AdminCommunityApplicationDto> = [
    { title: '小区名', dataIndex: 'name', width: 200 },
    {
      title: '城市/区',
      width: 160,
      render: (_, r) => `${r.city} / ${r.district}`,
    },
    {
      title: '申请人',
      width: 140,
      render: (_, r) =>
        r.applicantNickname ? (
          <Space>
            {r.applicantAvatarUrl && <Avatar size="small" src={r.applicantAvatarUrl} />}
            <span>{r.applicantNickname}</span>
          </Space>
        ) : (
          r.applicantId.slice(0, 8)
        ),
    },
    { title: '助力数', dataIndex: 'supportCount', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
    {
      title: '操作',
      width: 240,
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelectedId(r.id);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
          {r.status === 'pending' && (
            <>
              <Button
                size="small"
                type="link"
                onClick={() => {
                  Modal.confirm({
                    title: '确认通过该小区申请？',
                    content:
                      '通过后会自动创建小区。申请人成为认证业主并获得「创始人」+「首批业主」徽章；所有助力人作为未认证成员加入，并获得「种子贡献者」徽章和贡献分。',
                    onOk: () => approveMut.mutate(r.id),
                  });
                }}
              >
                通过
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => {
                  setRejectId(r.id);
                  setRejectOpen(true);
                }}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const detail = detailData?.data;

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="小区申请">
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 150 }}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已驳回' },
              ]}
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

        <Drawer
          title="小区申请详情"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={640}
        >
          {detail && (
            <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="小区名">{detail.name}</Descriptions.Item>
                <Descriptions.Item label="城市">{detail.city}</Descriptions.Item>
                <Descriptions.Item label="区">{detail.district}</Descriptions.Item>
                <Descriptions.Item label="详细地址">{detail.address}</Descriptions.Item>
                <Descriptions.Item label="预估户数">
                  {detail.estimatedHouseholds ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="申请理由">{detail.reason || '-'}</Descriptions.Item>
                <Descriptions.Item label="申请人">
                  <Space>
                    {detail.applicantAvatarUrl && (
                      <Avatar size="small" src={detail.applicantAvatarUrl} />
                    )}
                    {detail.applicantNickname || detail.applicantId}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="材料类型">
                  {materialLabels[detail.materialType] || detail.materialType}
                </Descriptions.Item>
                <Descriptions.Item label="材料照片">
                  <Image src={detail.materialUrl} width={200} />
                </Descriptions.Item>
                {detail.doorPhotoUrl && (
                  <Descriptions.Item label="门牌照片">
                    <Image src={detail.doorPhotoUrl} width={200} />
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="助力数">{detail.supportCount}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusColors[detail.status]}>{statusLabels[detail.status]}</Tag>
                </Descriptions.Item>
                {detail.rejectReason && (
                  <Descriptions.Item label="驳回原因">{detail.rejectReason}</Descriptions.Item>
                )}
                <Descriptions.Item label="创建时间">{detail.createdAt}</Descriptions.Item>
              </Descriptions>

              {detail.supporters && detail.supporters.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>
                    助力人（{detail.supporters.length}）
                  </div>
                  <Space wrap>
                    {detail.supporters.map((s) => (
                      <Space key={s.userId} size={4}>
                        {s.avatarUrl && <Avatar size="small" src={s.avatarUrl} />}
                        <span>{s.nickname}</span>
                      </Space>
                    ))}
                  </Space>
                </div>
              )}

              {detail.status === 'pending' && (
                <Space style={{ marginTop: 24 }}>
                  <Button
                    type="primary"
                    onClick={() =>
                      Modal.confirm({
                        title: '确认通过该小区申请？',
                        content:
                          '通过后会自动创建小区。申请人成为认证业主并获得「创始人」+「首批业主」徽章；所有助力人作为未认证成员加入，并获得「种子贡献者」徽章和贡献分。',
                        onOk: () => approveMut.mutate(detail.id),
                      })
                    }
                  >
                    通过
                  </Button>
                  <Button
                    danger
                    onClick={() => {
                      setRejectId(detail.id);
                      setRejectOpen(true);
                    }}
                  >
                    驳回
                  </Button>
                </Space>
              )}
            </>
          )}
        </Drawer>

        <Modal
          title="驳回小区申请"
          open={rejectOpen}
          onOk={() => rejectMut.mutate({ id: rejectId, reason: rejectReason })}
          onCancel={() => setRejectOpen(false)}
          confirmLoading={rejectMut.isPending}
        >
          <Input.TextArea
            rows={3}
            placeholder="请输入驳回原因（不会通知申请人，仅用于审计）"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Modal>
      </AdminLayout>
    </AuthGuard>
  );
}

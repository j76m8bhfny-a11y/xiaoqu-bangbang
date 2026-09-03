'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Drawer,
  Descriptions,
  message,
  Modal,
  Input,
  Select,
  Image,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, PaginatedData } from '@xiaoqu-bangbang/shared';

const { Search, TextArea } = Input;

const statusLabels: Record<string, string> = {
  pending_review: '待审核',
  published: '已发布',
  rejected: '已驳回',
};
const statusColors: Record<string, string> = {
  pending_review: 'orange',
  published: 'green',
  rejected: 'red',
};

const categoryLabels: Record<string, string> = {
  usage_guide: '使用指南',
  repair: '维修排障',
  maintenance: '保养维护',
  other: '其他',
};

export default function GuidesPage() {
  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="教程管理">
          <GuideTable />
        </Card>
      </AdminLayout>
    </AuthGuard>
  );
}

function GuideTable() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ status?: string; category?: string; search?: string }>(
    {},
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'guides', filters, page, pageSize],
    queryFn: () =>
      api.get<null, ApiResponse<PaginatedData<any>>>('/admin/guides', {
        params: { ...filters, page, pageSize },
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'guides'] });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/guides/${id}/approve`),
    onSuccess: () => {
      message.success('已通过');
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/guides/${id}/reject`, { reason }),
    onSuccess: () => {
      message.success('已驳回');
      setRejectOpen(false);
      invalidate();
    },
    onError: () => message.error('操作失败'),
  });

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', ellipsis: true, width: 240 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (v: string) => categoryLabels[v] || v,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
    },
    { title: '作者', dataIndex: 'authorNickname', width: 100, ellipsis: true },
    { title: '浏览', dataIndex: 'viewCount', width: 70 },
    { title: '点赞', dataIndex: 'likeCount', width: 70 },
    { title: '收藏', dataIndex: 'favoriteCount', width: 70 },
    { title: '评论', dataIndex: 'commentCount', width: 70 },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelectedId(record.id);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
          {record.status === 'pending_review' && (
            <>
              <Button size="small" type="link" onClick={() => approveMut.mutate(record.id)}>
                通过
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => {
                  setRejectId(record.id);
                  setRejectReason('');
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

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 130 }}
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Select
          placeholder="分类"
          allowClear
          style={{ width: 130 }}
          value={filters.category}
          onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
          options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Search
          placeholder="搜索标题"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => setFilters((f) => ({ ...f, search: v }))}
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

      <GuideDetailDrawer
        guideId={selectedId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <Modal
        title="驳回教程"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() => rejectMut.mutate({ id: rejectId, reason: rejectReason || undefined })}
        confirmLoading={rejectMut.isPending}
      >
        <TextArea
          placeholder="驳回原因（可选）"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </>
  );
}

function GuideDetailDrawer({
  guideId,
  open,
  onClose,
}: {
  guideId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'guide-detail', guideId],
    queryFn: () => api.get<null, ApiResponse<any>>(`/admin/guides/${guideId}`),
    enabled: !!guideId,
  });
  const guide = data?.data;

  return (
    <Drawer title="教程详情" open={open} onClose={onClose} width={640}>
      {isLoading && <p>加载中...</p>}
      {guide && (
        <>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="ID">{guide.id}</Descriptions.Item>
            <Descriptions.Item label="标题">{guide.title}</Descriptions.Item>
            <Descriptions.Item label="分类">
              {categoryLabels[guide.category] || guide.category}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[guide.status]}>
                {statusLabels[guide.status] || guide.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="作者">{guide.authorNickname}</Descriptions.Item>
            <Descriptions.Item label="浏览/点赞/收藏">
              {guide.viewCount} / {guide.likeCount} / {guide.favoriteCount}
            </Descriptions.Item>
            <Descriptions.Item label="评论数">{guide.commentCount}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{guide.createdAt}</Descriptions.Item>
            {guide.reviewedAt && (
              <Descriptions.Item label="审核时间">{guide.reviewedAt}</Descriptions.Item>
            )}
            {guide.rejectedReason && (
              <Descriptions.Item label="驳回原因">{guide.rejectedReason}</Descriptions.Item>
            )}
          </Descriptions>

          <h4 style={{ marginBottom: 8 }}>描述</h4>
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: 16, color: '#333' }}>
            {guide.description || '无'}
          </div>

          <h4 style={{ marginBottom: 8 }}>图片</h4>
          {guide.images?.length > 0 ? (
            <Image.PreviewGroup>
              <Space wrap>
                {guide.images.map((src: string, idx: number) => (
                  <Image
                    key={idx}
                    src={src}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover' }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          ) : (
            <Empty description="无图片" />
          )}
        </>
      )}
    </Drawer>
  );
}

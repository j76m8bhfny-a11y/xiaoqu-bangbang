'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Form, Input, InputNumber, Button, message, Spin, Space } from 'antd';
import AuthGuard from '@/components/AuthGuard';
import AdminLayout from '@/components/Layout';
import api from '@/lib/api';
import type { ApiResponse, SystemSettingsDto } from '@xiaoqu-bangbang/shared';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<null, ApiResponse<Record<string, string>>>('/admin/settings'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => api.patch('/admin/settings', values),
    onSuccess: () => { message.success('设置已保存'); queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }); },
    onError: () => message.error('保存失败'),
  });

  // Populate form when data loads
  const settings = data?.data;
  if (settings && !form.isFieldsTouched()) {
    form.setFieldsValue({
      appName: settings.appName || '',
      defaultShareTitle: settings.defaultShareTitle || '',
      defaultShareImage: settings.defaultShareImage || '',
      bannerDisplayCount: Number(settings.bannerDisplayCount) || 5,
      providerDisplayCount: Number(settings.providerDisplayCount) || 10,
      privacyVersion: settings.privacyVersion || '',
      defaultReviewPolicy: settings.defaultReviewPolicy || 'auto',
    });
  }

  return (
    <AuthGuard>
      <AdminLayout>
        <Card title="系统设置">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
          ) : (
            <Form form={form} layout="vertical" onFinish={(values) => updateMutation.mutate(values)} style={{ maxWidth: 600 }}>
              <Form.Item name="appName" label="应用名称">
                <Input placeholder="小区帮榜棒" />
              </Form.Item>
              <Form.Item name="defaultShareTitle" label="默认分享标题">
                <Input placeholder="小区帮榜棒 - 邻里互助" />
              </Form.Item>
              <Form.Item name="defaultShareImage" label="默认分享图片URL">
                <Input placeholder="https://..." />
              </Form.Item>
              <Form.Item name="bannerDisplayCount" label="Banner展示数量">
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="providerDisplayCount" label="服务商展示数量">
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="privacyVersion" label="隐私协议版本">
                <Input placeholder="1.0.0" />
              </Form.Item>
              <Form.Item name="defaultReviewPolicy" label="默认审核策略">
                <Input placeholder="auto / manual" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>
      </AdminLayout>
    </AuthGuard>
  );
}

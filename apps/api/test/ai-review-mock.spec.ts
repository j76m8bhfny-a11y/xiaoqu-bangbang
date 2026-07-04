/**
 * Feature: AI审核 Mock服务
 * BDD Tests for AiReviewService
 */
import { describe, it, expect } from 'vitest';
import { AiReviewService } from '../src/modules/ai-review/ai-review.service';

// 可变设置，测试里动态修改
const settings = new Map<string, string>();
const mockPrisma = {
  aiReviewLog: { create: async () => ({ id: 'mock' }) },
  systemSetting: {
    findUnique: async ({ where: { key } }: { where: { key: string } }) =>
      settings.has(key) ? { value: settings.get(key) } : null,
  },
};

describe('Feature: AI审核 Mock服务', () => {
  let service: AiReviewService;

  beforeAll(() => {
    service = new AiReviewService(mockPrisma as any);
  });

  beforeEach(() => {
    settings.clear();
  });

  describe('Scenario: 普通内容审核通过', () => {
    it('should return pass for normal content', async () => {
      const result = await service.reviewText('周末有人能帮忙换灯泡吗？');
      expect(result.result).toBe('pass');
      expect(result.labels).toHaveLength(0);
    });
  });

  describe('Scenario: 违规内容被拦截', () => {
    it('should return reject for violation content', async () => {
      const result = await service.reviewText('这是色情内容');
      expect(result.result).toBe('reject');
      expect(result.labels).toContain('违规内容');
    });
  });

  describe('Scenario: 敏感内容转人工复核', () => {
    it('should return manual_review for sensitive content', async () => {
      const result = await service.reviewText('我要投诉物业');
      expect(result.result).toBe('manual_review');
      expect(result.labels).toContain('敏感内容');
    });
  });

  describe('Scenario: P-296 ai_content_review 开关关闭时跳过审核', () => {
    it('开关关闭时违规内容应返回 pass', async () => {
      settings.set('ai_content_review', 'false');
      const result = await service.reviewText('这是色情内容');
      expect(result.result).toBe('pass');
      expect(result.labels).toHaveLength(0);
    });

    it('开关关闭时图片审核应返回 pass', async () => {
      settings.set('ai_content_review', 'false');
      const result = await service.reviewImage('https://example.com/bad.jpg');
      expect(result.result).toBe('pass');
    });

    it('开关开启时保持原有审核行为', async () => {
      settings.set('ai_content_review', 'true');
      const result = await service.reviewText('这是色情内容');
      expect(result.result).toBe('reject');
    });

    it('无设置时默认开启审核', async () => {
      const result = await service.reviewText('这是色情内容');
      expect(result.result).toBe('reject');
    });
  });
});

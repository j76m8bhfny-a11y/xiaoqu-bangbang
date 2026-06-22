/**
 * Feature: AI审核 Mock服务
 * BDD Tests for AiReviewService
 */
import { describe, it, expect } from 'vitest';
import { AiReviewService } from '../src/modules/ai-review/ai-review.service';

const mockPrisma = {
  aiReviewLog: { create: async () => ({ id: 'mock' }) },
};

describe('Feature: AI审核 Mock服务', () => {
  let service: AiReviewService;

  beforeAll(() => {
    service = new AiReviewService(mockPrisma as any);
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
});

/**
 * Feature: OCR Mock服务
 * BDD Tests for OcrService
 */
import { describe, it, expect } from 'vitest';
import { OcrService } from '../src/modules/ocr/ocr.service';

describe('Feature: OCR Mock服务', () => {
  let service: OcrService;

  beforeAll(() => {
    service = new OcrService();
  });

  describe('Scenario: OCR识别房产证返回匹配结果', () => {
    it('should return recognized fields with confidence', async () => {
      const result = await service.recognizeMaterial('https://example.com/cert.jpg', 'property_cert');
      expect(result).toHaveProperty('communityName');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('ownerName');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Scenario: OCR识别结果与所选小区匹配', () => {
    it('should return approved when OCR matches community', async () => {
      const ocrResult = {
        communityName: '阳光花园小区',
        address: '南京市鼓楼区阳光路88号',
        ownerName: '张**',
        confidence: 0.85,
      };
      const result = await service.matchCommunity(
        ocrResult,
        'some-id',
        '阳光花园',
        '南京市鼓楼区阳光路88号',
      );
      expect(result.matched).toBe(true);
      expect(result.status).toBe('approved');
    });
  });

  describe('Scenario: OCR识别结果与所选小区不匹配', () => {
    it('should return manual_review or rejected when OCR does not match', async () => {
      const ocrResult = {
        communityName: '银河花园小区',
        address: '南京市玄武区银河路99号',
        ownerName: '李**',
        confidence: 0.85,
      };
      const result = await service.matchCommunity(
        ocrResult,
        'some-id',
        '阳光花园',
        '南京市鼓楼区阳光路88号',
      );
      expect(['manual_review', 'rejected']).toContain(result.status);
    });
  });
});

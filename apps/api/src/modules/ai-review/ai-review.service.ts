import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AiReviewResult {
  result: 'pass' | 'reject' | 'manual_review';
  labels: string[];
  score: number;
}

@Injectable()
export class AiReviewService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  private async isContentReviewEnabled(): Promise<boolean> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'ai_content_review' },
    });
    return setting ? setting.value === 'true' : true;
  }

  async reviewText(
    text: string,
    targetType: string,
    targetId: string,
    inputSummary: any = {},
  ): Promise<AiReviewResult> {
    // P-296: ai_content_review 开关关闭时跳过审核
    if (!(await this.isContentReviewEnabled())) {
      return { result: 'pass', labels: [], score: 0 };
    }

    // Mock: 检测明显违规关键词
    const violationKeywords = ['色情', '暴力', '赌博', '诈骗', '毒品'];
    const sensitiveKeywords = ['投诉', '举报', '冲突', '纠纷'];

    const hasViolation = violationKeywords.some((k) => text.includes(k));
    let result: AiReviewResult;
    if (hasViolation) {
      result = { result: 'reject', labels: ['违规内容'], score: 0.95 };
    } else {
      const hasSensitive = sensitiveKeywords.some((k) => text.includes(k));
      if (hasSensitive) {
        result = { result: 'manual_review', labels: ['敏感内容'], score: 0.6 };
      } else {
        result = { result: 'pass', labels: [], score: 0.1 };
      }
    }

    // Write AI review log
    await this.prisma.aiReviewLog.create({
      data: {
        targetType,
        targetId,
        inputSummary: inputSummary as any,
        result: result.result,
        labels: result.labels as any,
        score: result.score,
        rawResult: result as any,
      },
    });

    return result;
  }

  async reviewImage(
    _imageUrl: string,
    targetType: string,
    targetId: string,
    inputSummary: any = {},
  ): Promise<AiReviewResult> {
    // P-296: ai_content_review 开关关闭时跳过审核
    if (!(await this.isContentReviewEnabled())) {
      return { result: 'pass', labels: [], score: 0 };
    }

    // Mock: 图片审核默认通过
    const result: AiReviewResult = { result: 'pass', labels: [], score: 0.05 };

    // Write AI review log
    await this.prisma.aiReviewLog.create({
      data: {
        targetType,
        targetId,
        inputSummary: inputSummary as any,
        result: result.result,
        labels: result.labels as any,
        score: result.score,
        rawResult: result as any,
      },
    });

    return result;
  }
}

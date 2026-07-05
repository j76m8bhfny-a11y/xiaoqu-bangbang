import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from '../ocr/ocr.service';
import { AiReviewService } from '../ai-review/ai-review.service';

/**
 * 用户认证通过后，若是该小区前 30 名认证者，授予「首批业主 Top 30」徽章
 * 幂等：badge 用 upsert，userBadge 同小区同 badge 重复时由 createMany skipDuplicates 防重
 */
export async function maybeAwardFirstOwnerBadge(
  prisma: PrismaService,
  userId: string,
  communityId: string,
) {
  const verifiedCount = await prisma.communityMember.count({
    where: { communityId, verifyStatus: 'verified', role: 'resident' },
  });
  if (verifiedCount > 30) return;

  const badge = await prisma.badge.upsert({
    where: { code: 'first_owner_top30' },
    update: {},
    create: {
      code: 'first_owner_top30',
      name: '首批业主',
      description: '小区前 30 位认证业主',
      ruleJson: { type: 'first_owner', topN: 30 },
    },
  });

  // 避免重复发放
  const existed = await prisma.userBadge.findFirst({
    where: { userId, communityId, badgeId: badge.id },
  });
  if (existed) return;

  await prisma.userBadge.create({
    data: {
      userId,
      communityId,
      badgeId: badge.id,
      sourceType: 'first_owner',
    },
  });
}

@Injectable()
export class VerificationsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(OcrService) private ocrService: OcrService,
    @Inject(AiReviewService) private aiReviewService: AiReviewService,
  ) {}

  async submit(
    userId: string,
    dto: {
      communityId: string;
      materialType: string;
      fileUrl: string;
      consentAccepted: boolean;
      consentVersion: string;
    },
  ) {
    if (!dto.consentAccepted) {
      throw new BadRequestException('必须同意授权');
    }

    // P-214: 禁止重复提交待审核的认证
    const pending = await this.prisma.verification.findFirst({
      where: {
        userId,
        communityId: dto.communityId,
        status: { in: ['pending_review', 'manual_review'] },
      },
    });
    if (pending) {
      throw new BadRequestException('您已有待审核的认证申请，请等待审核结果');
    }

    // OCR 识别
    const ocrResult = await this.ocrService.recognizeMaterial(dto.fileUrl, dto.materialType);

    // 查询目标小区
    const community = await this.prisma.community.findUnique({
      where: { id: dto.communityId },
    });

    // AI 小区匹配
    const matchResult = community
      ? await this.ocrService.matchCommunity(
          ocrResult,
          community.id,
          community.name,
          community.address,
        )
      : { matched: false, confidence: 0, status: 'rejected' as const };

    // 确定认证状态
    let verificationStatus: string;
    if (matchResult.status === 'approved') {
      verificationStatus = 'approved';
    } else if (matchResult.status === 'manual_review') {
      verificationStatus = 'manual_review';
    } else {
      verificationStatus = 'rejected';
    }

    // 创建认证记录
    const verification = await this.prisma.verification.create({
      data: {
        userId,
        communityId: dto.communityId,
        materialType: dto.materialType,
        originalFileUrl: dto.fileUrl,
        ocrResultJson: ocrResult as any,
        aiResultJson: matchResult as any,
        consentSnapshot: {
          consentAccepted: dto.consentAccepted,
          consentVersion: dto.consentVersion,
          acceptedAt: new Date().toISOString(),
        },
        status: verificationStatus,
      },
    });

    // R5 红线: 仅 approved 时标记原图待删除
    // 如果认证通过，更新 community_members
    if (verificationStatus === 'approved') {
      await this.prisma.verification.update({
        where: { id: verification.id },
        data: { originalFileDeletedAt: new Date() },
      });
      await this.prisma.communityMember.upsert({
        where: { userId_communityId: { userId, communityId: dto.communityId } },
        update: { verifyStatus: 'verified' },
        create: {
          userId,
          communityId: dto.communityId,
          role: 'resident',
          verifyStatus: 'verified',
        },
      });
      await maybeAwardFirstOwnerBadge(this.prisma, userId, dto.communityId);
    }

    return {
      id: verification.id,
      status: verificationStatus,
      ocrSummary: {
        communityName: ocrResult.communityName,
        address: ocrResult.address,
        ownerName: ocrResult.ownerName,
        confidence: ocrResult.confidence,
      },
      matchResult: {
        matched: matchResult.matched,
        confidence: matchResult.confidence,
      },
    };
  }

  async getMyVerifications(userId: string) {
    const items = await this.prisma.verification.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        communityId: true,
        materialType: true,
        maskedFileUrl: true,
        status: true,
        rejectReason: true,
        reviewedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return items;
  }
}

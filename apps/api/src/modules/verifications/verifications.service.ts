import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from '../ocr/ocr.service';
import { AiReviewService } from '../ai-review/ai-review.service';

@Injectable()
export class VerificationsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(OcrService) private ocrService: OcrService,
    @Inject(AiReviewService) private aiReviewService: AiReviewService,
  ) {}

  async submit(userId: string, dto: {
    communityId: string;
    materialType: string;
    fileUrl: string;
    consentAccepted: boolean;
    consentVersion: string;
  }) {
    if (!dto.consentAccepted) {
      throw new BadRequestException('必须同意授权');
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

    // 标记原图为待删除
    await this.prisma.verification.update({
      where: { id: verification.id },
      data: { originalFileDeletedAt: new Date() },
    });

    // 如果认证通过，更新 community_members
    if (verificationStatus === 'approved') {
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

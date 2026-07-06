import { Injectable } from '@nestjs/common';

export interface OcrResult {
  communityName: string;
  address: string;
  ownerName: string;
  buildingNo: string;
  unitNo: string;
  roomNo: string;
  confidence: number;
}

export interface CommunityMatchResult {
  matched: boolean;
  confidence: number;
  status: 'approved' | 'manual_review' | 'rejected';
}

@Injectable()
export class OcrService {
  // ponytail: 上线前替换为真实 OCR API（百度/阿里房产证识别），接口签名不变
  async recognizeMaterial(_fileUrl: string, _materialType: string): Promise<OcrResult> {
    // Mock: 返回固定的房产证识别结果，用于和用户输入对比
    return {
      communityName: '阳光花园小区',
      address: '南京市鼓楼区阳光路88号',
      ownerName: '张**',
      buildingNo: '1',
      unitNo: '2',
      roomNo: '303',
      confidence: 0.85,
    };
  }

  async matchCommunity(
    ocrResult: OcrResult,
    targetCommunityId: string,
    targetCommunityName: string,
    targetCommunityAddress: string,
  ): Promise<CommunityMatchResult> {
    // Mock: 名字匹配则通过，不匹配则需复核
    const nameMatch =
      ocrResult.communityName.includes(targetCommunityName) ||
      targetCommunityName.includes(ocrResult.communityName);

    if (nameMatch && ocrResult.confidence >= 0.8) {
      return { matched: true, confidence: ocrResult.confidence, status: 'approved' };
    }

    if (ocrResult.confidence >= 0.5) {
      return { matched: false, confidence: ocrResult.confidence, status: 'manual_review' };
    }

    return { matched: false, confidence: ocrResult.confidence, status: 'rejected' };
  }
}

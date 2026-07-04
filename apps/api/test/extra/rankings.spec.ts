/**
 * P-01: 积分映射测试 — public_feedback/discussion 应为 1 朵花
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RankingsService } from '../../src/modules/rankings/rankings.service';

describe('P-01: 积分映射', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let rankingsService: RankingsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    rankingsService = app.get(RankingsService);
  });

  afterAll(async () => {
    await app.close();
  });

  const getEventAction = (type: string, rewardType = 'free') =>
    (rankingsService as any).getEventAction(type, rewardType);

  const getFlowerCount = (action: string) => (rankingsService as any).getFlowerCount(action);

  it('public_feedback → feedback → 1 朵花（不是 help_free 3 朵）', () => {
    const action = getEventAction('public_feedback');
    expect(action).toBe('feedback');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('discussion → feedback → 1 朵花（不是 help_free 3 朵）', () => {
    const action = getEventAction('discussion');
    expect(action).toBe('feedback');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('help_request (free) → help_free → 3 朵花（回归）', () => {
    const action = getEventAction('help_request', 'free');
    expect(action).toBe('help_free');
    expect(getFlowerCount(action)).toBe(3);
  });

  it('help_request (paid) → help_paid → 1 朵花（回归）', () => {
    const action = getEventAction('help_request', 'paid');
    expect(action).toBe('help_paid');
    expect(getFlowerCount(action)).toBe(1);
  });

  it('public_welfare → public_welfare → 5 朵花（回归）', () => {
    const action = getEventAction('public_welfare');
    expect(action).toBe('public_welfare');
    expect(getFlowerCount(action)).toBe(5);
  });
});

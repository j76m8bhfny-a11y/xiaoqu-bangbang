import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiReviewModule } from '../ai-review/ai-review.module';

@Module({
  imports: [PrismaModule, AiReviewModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}

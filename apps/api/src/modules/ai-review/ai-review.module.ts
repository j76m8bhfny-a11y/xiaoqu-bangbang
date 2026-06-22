import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiReviewService } from './ai-review.service';

@Module({
  imports: [PrismaModule],
  providers: [AiReviewService],
  exports: [AiReviewService],
})
export class AiReviewModule {}

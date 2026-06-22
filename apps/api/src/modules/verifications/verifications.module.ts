import { Module } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { VerificationsController } from './verifications.controller';
import { AuthModule } from '../auth/auth.module';
import { OcrModule } from '../ocr/ocr.module';
import { AiReviewModule } from '../ai-review/ai-review.module';

@Module({
  imports: [AuthModule, OcrModule, AiReviewModule],
  controllers: [VerificationsController],
  providers: [VerificationsService],
  exports: [VerificationsService],
})
export class VerificationsModule {}

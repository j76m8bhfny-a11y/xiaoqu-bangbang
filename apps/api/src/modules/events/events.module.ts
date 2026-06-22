import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiReviewModule } from '../ai-review/ai-review.module';
import { RankingsModule } from '../rankings/rankings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsService } from './events.service';
import { EventsController, ReportsController } from './events.controller';

@Module({
  imports: [PrismaModule, AiReviewModule, RankingsModule, NotificationsModule],
  controllers: [EventsController, ReportsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

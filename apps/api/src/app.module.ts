import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { VerificationsModule } from './modules/verifications/verifications.module';
import { AiReviewModule } from './modules/ai-review/ai-review.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { MarketModule } from './modules/market/market.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { CommitteeModule } from './modules/committee/committee.module';
import { VotesModule } from './modules/votes/votes.module';
import { BannersModule } from './modules/banners/banners.module';
import { ServiceProvidersModule } from './modules/serviceProviders/service-providers.module';
import { ShareModule } from './modules/share/share.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { TopicsModule } from './modules/topics/topics.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    CommunitiesModule,
    VerificationsModule,
    AiReviewModule,
    OcrModule,
    NotificationsModule,
    EventsModule,
    MarketModule,
    RankingsModule,
    CommitteeModule,
    VotesModule,
    BannersModule,
    ServiceProvidersModule,
    ShareModule,
    AdminModule,
    UploadModule,
    TopicsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}

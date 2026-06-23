import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { TopicsModule } from '../topics/topics.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [PrismaModule, NotificationsModule, AuthModule, TopicsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}

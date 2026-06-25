import { Module } from '@nestjs/common';
import { CommunityApplicationsController } from './community-applications.controller';
import { CommunityApplicationsService } from './community-applications.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CommunityApplicationsController],
  providers: [CommunityApplicationsService],
  exports: [CommunityApplicationsService],
})
export class CommunityApplicationsModule {}

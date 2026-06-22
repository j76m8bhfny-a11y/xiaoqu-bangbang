import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommitteeService } from './committee.service';
import { CommitteeController } from './committee.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommitteeController],
  providers: [CommitteeService],
  exports: [CommitteeService],
})
export class CommitteeModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}

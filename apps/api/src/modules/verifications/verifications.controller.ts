import { Controller, Post, Get, Body, UseGuards, Inject } from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class VerificationsController {
  constructor(@Inject(VerificationsService) private verificationsService: VerificationsService) {}

  @Post('verifications')
  async submit(
    @CurrentUser('userId') userId: string,
    @Body() dto: SubmitVerificationDto,
  ) {
    const result = await this.verificationsService.submit(userId, dto);
    return { code: 0, message: 'ok', data: result };
  }

  @Get('verifications/me')
  async getMine(@CurrentUser('userId') userId: string) {
    const items = await this.verificationsService.getMyVerifications(userId);
    return { code: 0, message: 'ok', data: { items } };
  }
}

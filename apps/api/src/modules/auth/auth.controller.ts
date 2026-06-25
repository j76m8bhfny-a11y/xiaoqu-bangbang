import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto) {
    const result = await this.authService.wechatLogin(dto.code, dto.phoneCode);
    return { code: 0, message: 'ok', data: result };
  }
}

@Controller()
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  @Get('me')
  async getMe(@CurrentUser('userId') userId: string) {
    const user = await this.authService.getMe(userId);
    return { code: 0, message: 'ok', data: user };
  }

  @Patch('me')
  async updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateUserDto) {
    const user = await this.authService.updateMe(userId, dto);
    return { code: 0, message: 'ok', data: user };
  }

  @Get('me/dashboard')
  async getMyDashboard(@CurrentUser('userId') userId: string) {
    const data = await this.authService.getDashboard(userId);
    return { code: 0, message: 'ok', data };
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  @Get(':id/profile')
  async getUserProfile(@CurrentUser('userId') viewerId: string, @Param('id') targetId: string) {
    const profile = await this.authService.getUserProfile(viewerId, targetId);
    if (!profile) throw new NotFoundException('用户不存在');
    return { code: 0, message: 'ok', data: profile };
  }
}

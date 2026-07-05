import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifiedMemberGuard } from '../../common/guards/verified-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @Get('skills')
  async getMySkills(@CurrentUser('userId') userId: string) {
    const items = await this.usersService.getMySkills(userId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Post('skills')
  @UseGuards(VerifiedMemberGuard)
  async createSkill(@CurrentUser('userId') userId: string, @Body() dto: CreateSkillDto) {
    const skill = await this.usersService.createSkill(userId, dto);
    return { code: 0, message: 'ok', data: skill };
  }

  @Patch('skills/:id')
  @UseGuards(VerifiedMemberGuard)
  async updateSkill(
    @CurrentUser('userId') userId: string,
    @Param('id') skillId: string,
    @Body() dto: UpdateSkillDto,
  ) {
    const skill = await this.usersService.updateSkill(userId, skillId, dto);
    return { code: 0, message: 'ok', data: skill };
  }

  @Delete('skills/:id')
  @UseGuards(VerifiedMemberGuard)
  async deleteSkill(@CurrentUser('userId') userId: string, @Param('id') skillId: string) {
    await this.usersService.deleteSkill(userId, skillId);
    return { code: 0, message: 'ok', data: null };
  }
}

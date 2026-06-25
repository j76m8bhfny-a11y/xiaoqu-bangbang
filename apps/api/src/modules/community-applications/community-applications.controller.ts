import { Controller, Get, Post, Param, Body, Query, UseGuards, Inject } from '@nestjs/common';
import { CommunityApplicationsService } from './community-applications.service';
import { CreateCommunityApplicationDto } from './dto/create-application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getPaginationParams } from '../../common/helpers/pagination';

@Controller('community-applications')
export class CommunityApplicationsController {
  constructor(
    @Inject(CommunityApplicationsService) private service: CommunityApplicationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser('userId') userId: string, @Body() dto: CreateCommunityApplicationDto) {
    const data = await this.service.create(userId, dto);
    return { code: 0, message: 'ok', data };
  }

  // ponytail: 公开端点，未注入 viewerId，故列表项的 hasSupported 恒为 false。
  // 当前小程序仅在详情页消费 hasSupported（走 /:id/me）。若将来列表页需要展示已助力状态，再加 OptionalJwtAuthGuard 或拆 /me-list 端点。
  @Get()
  async list(
    @Query()
    query: {
      status?: string;
      city?: string;
      keyword?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const { page, pageSize, skip, take } = getPaginationParams(
      Number(query.page),
      Number(query.pageSize),
    );
    const { items, total } = await this.service.list(query, { skip, take });
    return { code: 0, message: 'ok', data: { items, page, pageSize, total } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async listMine(@CurrentUser('userId') userId: string) {
    const items = await this.service.listMine(userId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get('supported')
  @UseGuards(JwtAuthGuard)
  async listSupported(@CurrentUser('userId') userId: string) {
    const items = await this.service.listSupported(userId);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.service.detail(id);
    return { code: 0, message: 'ok', data };
  }

  @Get(':id/me')
  @UseGuards(JwtAuthGuard)
  async detailForUser(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.service.detail(id, userId);
    return { code: 0, message: 'ok', data };
  }

  @Post(':id/support')
  @UseGuards(JwtAuthGuard)
  async support(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const data = await this.service.support(id, userId);
    return { code: 0, message: 'ok', data };
  }
}

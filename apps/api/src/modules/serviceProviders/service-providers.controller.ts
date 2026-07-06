import { Controller, Get, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ServiceProvidersService } from './service-providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { ErrorCodes } from '@xiaoqu-bangbang/shared';

@Controller('service-providers')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class ServiceProvidersController {
  constructor(
    @Inject(ServiceProvidersService) private serviceProvidersService: ServiceProvidersService,
  ) {}

  @Get()
  async list(@CurrentCommunityId() communityId: string, @Query() query?: { category?: string }) {
    const items = await this.serviceProvidersService.list(communityId, query);
    // P-153: ponytail: 返回静态分页字段满足前端 usePaginatedList，service-providers 无分页需求
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: 1, pageSize: items.length, total: items.length },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentCommunityId() communityId: string) {
    const data = await this.serviceProvidersService.findOne(id, communityId);
    return { code: ErrorCodes.SUCCESS, message: 'ok', data };
  }
}

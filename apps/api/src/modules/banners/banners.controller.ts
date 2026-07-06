import { Controller, Get, Query, Inject, Optional } from '@nestjs/common';
import { BannersService } from './banners.service';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';
import { ErrorCodes } from '@xiaoqu-bangbang/shared';

@Controller('banners')
export class BannersController {
  constructor(@Inject(BannersService) private bannersService: BannersService) {}

  @Get()
  async list(
    @CurrentCommunityId() @Optional() communityId?: string,
    @Query('position') position?: string,
  ) {
    const items = await this.bannersService.list(communityId, position);
    // P-151: ponytail: 返回静态分页字段满足前端 usePaginatedList，banners 无分页需求
    return {
      code: ErrorCodes.SUCCESS,
      message: 'ok',
      data: { items, page: 1, pageSize: items.length, total: items.length },
    };
  }
}

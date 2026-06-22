import { Controller, Get, Query, Inject, Optional } from '@nestjs/common';
import { BannersService } from './banners.service';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';

@Controller('banners')
export class BannersController {
  constructor(@Inject(BannersService) private bannersService: BannersService) {}

  @Get()
  async list(@CurrentCommunityId() @Optional() communityId?: string) {
    const items = await this.bannersService.list(communityId);
    return { code: 0, message: 'ok', data: { items } };
  }
}

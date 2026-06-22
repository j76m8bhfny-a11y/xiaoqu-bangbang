import { Controller, Get, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ServiceProvidersService } from './service-providers.service';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { CurrentCommunityId } from '../../common/decorators/current-community.decorator';

@Controller('service-providers')
@UseGuards(CurrentCommunityGuard)
export class ServiceProvidersController {
  constructor(@Inject(ServiceProvidersService) private serviceProvidersService: ServiceProvidersService) {}

  @Get()
  async list(
    @CurrentCommunityId() communityId: string,
    @Query() query?: { category?: string },
  ) {
    const items = await this.serviceProvidersService.list(communityId, query);
    return { code: 0, message: 'ok', data: { items } };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentCommunityId() communityId: string,
  ) {
    const data = await this.serviceProvidersService.findOne(id, communityId);
    return { code: 0, message: 'ok', data };
  }
}

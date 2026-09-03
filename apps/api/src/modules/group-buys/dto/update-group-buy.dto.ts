import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

// PATCH /group-buys/:id - 全部字段可选，复用 CreateGroupBuyDto 字段集
export class UpdateGroupBuyDto {
  @IsOptional()
  @IsEnum(['seek', 'offer'])
  type?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  departAt?: string;

  @IsOptional()
  @IsString()
  bidCloseAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quota?: number;

  @IsOptional()
  @IsString()
  serviceFee?: string;

  @IsOptional()
  @IsEnum(['self_pickup', 'door_drop', 'spot'])
  deliveryMethod?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

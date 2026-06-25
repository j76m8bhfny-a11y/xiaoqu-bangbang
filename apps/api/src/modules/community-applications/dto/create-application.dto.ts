import { IsString, IsOptional, IsInt, IsUrl, IsEnum, Min, MaxLength } from 'class-validator';

export class CreateCommunityApplicationDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(50)
  city!: string;

  @IsString()
  @MaxLength(50)
  district!: string;

  @IsString()
  @MaxLength(200)
  address!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedHouseholds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsEnum(['property_cert', 'rent_contract', 'access_card', 'other'])
  materialType!: 'property_cert' | 'rent_contract' | 'access_card' | 'other';

  @IsString()
  materialUrl!: string;

  @IsOptional()
  @IsString()
  doorPhotoUrl?: string;
}

import { IsString, IsEnum, IsBoolean, IsUrl, IsOptional } from 'class-validator';

export class SubmitVerificationDto {
  @IsString()
  communityId: string;

  @IsEnum(['property_cert', 'rent_contract', 'access_card', 'other'])
  materialType: string;

  @IsUrl()
  fileUrl: string;

  @IsString()
  buildingNo: string;

  @IsOptional()
  @IsString()
  unitNo?: string;

  @IsString()
  roomNo: string;

  @IsBoolean()
  consentAccepted: boolean;

  @IsString()
  consentVersion: string;
}

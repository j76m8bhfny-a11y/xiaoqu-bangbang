import { IsString, IsEnum, IsBoolean, IsUrl } from 'class-validator';

export class SubmitVerificationDto {
  @IsString()
  communityId: string;

  @IsEnum(['property_cert', 'rent_contract', 'access_card', 'other'])
  materialType: string;

  @IsUrl()
  fileUrl: string;

  @IsBoolean()
  consentAccepted: boolean;

  @IsString()
  consentVersion: string;
}

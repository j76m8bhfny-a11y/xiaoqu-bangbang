import { IsString, IsOptional } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  phoneCode?: string;
}

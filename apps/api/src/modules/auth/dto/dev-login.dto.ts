import { IsString } from 'class-validator';

// ponytail: 临时调试登录 DTO，发布前删除（上限: 仅 dev 环境用，升级路径: 删除此文件 + controller/service 对应方法 + 前端入口）
export class DevLoginDto {
  @IsString()
  userId: string;
}

import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { SkipCurrentCommunity } from '../../common/decorators/skip-current-community.decorator';
import { UploadService } from './upload.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @SkipCurrentCommunity()
  @UseInterceptors(FileInterceptor('file', UploadService.multerOptions()))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }
    // P-290: 手动检查文件大小（返回 400 而非 Multer 的 413）
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小超过限制（5MB）');
    }

    const url = this.uploadService.getFileUrl(file.filename);
    return { code: 0, message: 'ok', data: { url } };
  }
}

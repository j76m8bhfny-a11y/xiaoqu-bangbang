import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCommunityGuard } from '../../common/guards/current-community.guard';
import { UploadService } from './upload.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard, CurrentCommunityGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', UploadService.multerOptions()))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const url = this.uploadService.getFileUrl(file.filename);
    return { url };
  }
}

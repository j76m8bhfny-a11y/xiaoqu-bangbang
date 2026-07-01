import { Injectable } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as multer from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { Request } from 'express';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class UploadService {
  static multerOptions(): MulterOptions {
    return {
      storage: multer.diskStorage({
        destination: (
          _req: Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          cb(null, UPLOAD_DIR);
        },
        filename: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = path.extname(file.originalname) || '.jpg';
          const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
          cb(null, name);
        },
      }),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
        }
      },
    };
  }

  getFileUrl(filename: string): string {
    const base = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
    return `${base}/uploads/${filename}`;
  }
}

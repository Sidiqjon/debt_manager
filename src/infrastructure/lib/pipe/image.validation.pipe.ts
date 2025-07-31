import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  private readonly allowedExtensions = ['.jpeg', '.jpg', '.png', '.svg', '.heic', '.heif', '.webp'];

  transform(files: Express.Multer.File[]) {
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (!this.allowedExtensions.includes(ext)) {
        this.deleteFile(file.path);
        throw new BadRequestException(`Invalid file type: ${ext}. Allowed types: ${this.allowedExtensions.join(', ')}`);
      }
    }
    return files;
  }

  private deleteFile(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

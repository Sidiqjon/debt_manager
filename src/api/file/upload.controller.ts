import { 
    Controller, Post, Get, Param, Res, UploadedFiles, UseInterceptors, 
    BadRequestException
  } from '@nestjs/common';
  import { FilesInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { Response } from 'express';
  import { join } from 'path';
  import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
  import * as path from 'path';
  import { existsSync } from 'fs';
import { ImageValidationPipe } from 'src/infrastructure/lib/pipe/image.validation.pipe';
  
  @ApiTags('File Upload 📂')
  @Controller('upload')
  export class UploadController {

    @Post()
    @ApiOperation({ summary: 'Upload multiple files 🖼️' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
        },
      },
    })
    @ApiResponse({ status: 201, description: 'Files have been uploaded successfully!' })
    @UseInterceptors(
      FilesInterceptor('files', 10, {
        storage: diskStorage({
          destination: './uploads',
          filename(req, file, callback) {
            const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
            callback(null, uniqueName);
          },
        }),
        limits: {
          fileSize: 10 * 1024 * 1024, 
        },
        fileFilter(req, file, callback) {
          const allowedExtensions = ['.jpeg', '.jpg', '.png', '.svg', '.heic', '.heif', '.webp'];
          const ext = path.extname(file.originalname).toLowerCase();
          if (!allowedExtensions.includes(ext)) {
            return callback(new BadRequestException(`Invalid file type: ${ext}. Allowed types: ${allowedExtensions.join(', ')}`), false);
          }
        },
      }),
    )

    uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
      const uploadedFiles = files.map(file => file.filename);
      return { message: 'Files have been uploaded successfully!', fileNames: uploadedFiles };
    }

    @Get(':filename')
    @ApiOperation({ summary: 'Retrieve an uploaded file by filename 🏞️' })
    @ApiParam({ name: 'filename', required: true, description: 'The name of the file to retrieve' })
    @ApiResponse({ status: 200, description: 'File has been retrieved successfully!' })
    @ApiResponse({ status: 404, description: 'File not found!' })
    getFile(@Param('filename') filename: string, @Res() res: Response) {
      const filePath = join(__dirname, '..', '..', '..', 'uploads', filename);
  
      if (!existsSync(filePath)) {
        return res.status(404).json({
          message: `File ${filename} not found!`,
        });
      }
      return res.sendFile(filePath);
    }
  }
  
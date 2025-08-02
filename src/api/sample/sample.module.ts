import { Module } from '@nestjs/common';
import { SampleController } from './sample.controller';
import { SampleService } from './sample.service';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';

@Module({
  controllers: [SampleController],
  providers: [
    SampleService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [SampleService],
})
export class SampleModule {}
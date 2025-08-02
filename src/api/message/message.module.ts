import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { EskizService } from '../../common/services/eskiz.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';

@Module({
  controllers: [MessageController],
  providers: [
    MessageService,
    PrismaService,
    EskizService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [MessageService],
})
export class MessageModule {}
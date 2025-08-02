import { Module } from '@nestjs/common';
import { DebtController } from './debt.controller';
import { DebtService } from './debt.service';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';

@Module({
  controllers: [DebtController],
  providers: [
    DebtService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [DebtService],
})
export class DebtModule {}
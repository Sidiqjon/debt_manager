import { Module } from '@nestjs/common';
import { DebtorController } from './debtor.controller';
import { DebtorService } from './debtor.service';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';

@Module({
  controllers: [DebtorController],
  providers: [
    DebtorService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [DebtorService],
})
export class DebtorModule {}
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { OtpService } from '../../infrastructure/lib/services/otp.service';
import { PrismaService } from '../../common/database/prisma/prisma.service';
import { BcryptEncryption } from '../../infrastructure/lib/bcrypt';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';
import { RolesGuard } from '../../common/guard/roles.guard';
import { config } from '../../config';

@Module({
  imports: [
    JwtModule.register({
      secret: config.JWT_SECRET,
      signOptions: { expiresIn: config.JWT_ACCESS_EXPIRES_IN },
    }),
  ],
  controllers: [SellerController],
  providers: [
    SellerService,
    OtpService,
    PrismaService,
    BcryptEncryption,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [SellerService],
})
export class SellerModule {}
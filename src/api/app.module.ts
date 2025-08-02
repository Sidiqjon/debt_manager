import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/database/prisma/prisma.module';

import { AdminModule } from './admin/admin.module';
import { SellerModule } from './seller/seller.module';
import { DebtorModule } from './debtor/debtor.module';
import { DebtModule } from './debt/debt.module';
import { SampleModule } from './sample/sample.module';

import { UploadModule } from './file/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AdminModule,
    UploadModule,
    SellerModule,
    DebtorModule,
    DebtModule,
    SampleModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}



// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// controllers: [AppController],
// providers: [AppService],
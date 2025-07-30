import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/database/prisma/prisma.module';

import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}



// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// controllers: [AppController],
// providers: [AppService],
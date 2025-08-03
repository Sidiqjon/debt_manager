import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'src/config';
import * as cookieParser from 'cookie-parser';

export default class Application {
  public static async main(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', 
    methods: '*', 
    allowedHeaders: '*', 
    credentials: true, 
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  const config_swagger = new DocumentBuilder()
    .setTitle('Debt Manager API!!!')
    .setDescription('The Debt Manager API description!')
    .setVersion('1.0')
    .addSecurityRequirements('bearer', ['bearer'])
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config_swagger);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(config.API_PORT ?? 3000, () => {
    console.log('Server started on port', config.API_PORT, '🟢');
  });
  }
}




// const config = new DocumentBuilder()
//   .setTitle('Debt Manager API')
//   .setDescription('The Debt Manager API description')
//   .setVersion('1.0')
//   .addServer('http://localhost:3000', 'Development server')
//   .addServer('https://api.debtmanager.com', 'Production server')
//   .addBearerAuth(
//     {
//       type: 'http',
//       scheme: 'bearer',
//       bearerFormat: 'JWT',
//     },
//     'JWT-auth',
//   )
//   .build();
        // {
        //     type: 'http',
        //     scheme: 'Bearer',
        //     in: 'Header',
        // },
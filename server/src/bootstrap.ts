import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config';
export async function createApplication(){const app=await NestFactory.create(AppModule,{logger:false});const c=app.get(AppConfig);c.validate();app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useWebSocketAdapter(new WsAdapter(app));app.enableCors({origin:false,methods:['GET','POST','PATCH','DELETE']});const cfg=new DocumentBuilder().setTitle('庆喜儿平台 API').setVersion('2.0.0').addBearerAuth().build();SwaggerModule.setup('docs',app,SwaggerModule.createDocument(app,cfg));return app}

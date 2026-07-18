import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfig } from '@/config/app-config';
import { AuthGuard, AuthService, MfaGuard, RolesGuard } from '@/common/auth';
import { AllExceptionsFilter } from '@/common/exception.filter';
import { ResponseInterceptor } from '@/common/response.interceptor';
import { TraceMiddleware } from '@/common/trace.middleware';
import { dataStoreProvider } from '@/infrastructure/data-store';
import { aiProvider, eventBusProvider } from '@/infrastructure/integrations';
import { SpeechService } from '@/application/speech.service';
import { PlatformService } from '@/application/platform.service';
import { AdminController, CommerceController, DeviceSpeechController, HealthController, InteractionController, SocialContentController, UserController, WebhookController } from '@/api/controllers';
import { VoiceGateway } from '@/api/voice.gateway';
@Module({controllers:[HealthController,UserController,DeviceSpeechController,InteractionController,SocialContentController,CommerceController,AdminController,WebhookController],providers:[AppConfig,AuthService,dataStoreProvider,eventBusProvider,aiProvider,SpeechService,PlatformService,VoiceGateway,{provide:APP_GUARD,useClass:AuthGuard},{provide:APP_GUARD,useClass:RolesGuard},{provide:APP_GUARD,useClass:MfaGuard},{provide:APP_INTERCEPTOR,useClass:ResponseInterceptor},{provide:APP_FILTER,useClass:AllExceptionsFilter}]})
export class AppModule implements NestModule{configure(c:MiddlewareConsumer){c.apply(TraceMiddleware).forRoutes('*')}}

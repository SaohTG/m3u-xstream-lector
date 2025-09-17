import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Validation is handled in AppModule
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}

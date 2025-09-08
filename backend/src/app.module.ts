import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvisioningModule } from './provisioning/provisioning.module';
import { ProvidersModule } from './providers/providers.module';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Database connection
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    
    // Redis/Bull queue connection
    BullModule.forRootAsync({
      useFactory: redisConfig,
    }),
    
    // Feature modules
    AuthModule,
    UsersModule,
    ProvisioningModule,
    ProvidersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
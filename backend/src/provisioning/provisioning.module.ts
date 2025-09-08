import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvisioningController } from './provisioning.controller';
import { ProvisioningService } from './provisioning.service';
import { ProvisioningJob } from './provisioning-job.entity';
import { ProvisioningProcessor } from './provisioning.processor';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProvisioningJob]),
    BullModule.registerQueue({
      name: 'provisioning',
    }),
    ProvidersModule,
  ],
  controllers: [ProvisioningController],
  providers: [ProvisioningService, ProvisioningProcessor],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
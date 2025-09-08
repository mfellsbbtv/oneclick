import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';

@Controller('provisioning')
export class ProvisioningController {
  constructor(private readonly provisioningService: ProvisioningService) {}

  @Post('jobs')
  createJob(@Body() config: any) {
    return this.provisioningService.createProvisioningJob(config);
  }

  @Get('jobs')
  getJobs() {
    return this.provisioningService.getAllJobs();
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.provisioningService.getJob(id);
  }

  @Post('jobs/:id/cancel')
  cancelJob(@Param('id') id: string) {
    return this.provisioningService.cancelJob(id);
  }

  @Post('validate')
  validateConfig(@Body() config: any) {
    return this.provisioningService.validateConfiguration(config);
  }

  @Post('plan')
  createPlan(@Body() config: any) {
    return this.provisioningService.createPlan(config);
  }
}
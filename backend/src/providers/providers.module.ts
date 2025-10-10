import { Module } from '@nestjs/common';
import { GoogleWorkspaceProvisioner } from './google-workspace/google-workspace.provisioner';

@Module({
  providers: [
    GoogleWorkspaceProvisioner,
  ],
  exports: [
    GoogleWorkspaceProvisioner,
  ],
})
export class ProvidersModule {}
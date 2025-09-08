import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ProvisioningRequest, AppProvider } from './provisioning-request.entity';

@Entity('app_configs')
@Unique(['requestId', 'app'])
export class AppConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({
    type: 'enum',
    enum: AppProvider,
  })
  app: AppProvider;

  @Column({ type: 'jsonb' })
  fields: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ProvisioningRequest, request => request.appConfigs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  @Index('idx_app_configs_request_id')
  request: ProvisioningRequest;
}
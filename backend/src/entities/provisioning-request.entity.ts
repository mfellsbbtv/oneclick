import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { AppConfig } from './app-config.entity';
import { AppResult } from './app-result.entity';

export enum ProvisioningStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  PARTIAL = 'partial',
  ERROR = 'error',
}

export enum AppProvider {
  GOOGLE_WORKSPACE = 'google-workspace',
  SLACK = 'slack',
  MICROSOFT_365 = 'microsoft-365',
  CLICKUP = 'clickup',
  JIRA = 'jira',
  CONFLUENCE = 'confluence',
  GITHUB = 'github',
  ZOOM = 'zoom',
  HUBSPOT = 'hubspot',
}

@Entity('provisioning_requests')
export class ProvisioningRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'requested_apps',
    type: 'enum',
    enum: AppProvider,
    array: true,
  })
  requestedApps: AppProvider[];

  @Column({
    type: 'enum',
    enum: ProvisioningStatus,
    default: ProvisioningStatus.PENDING,
  })
  @Index('idx_provisioning_requests_status')
  status: ProvisioningStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => User, user => user.provisioningRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @Index('idx_provisioning_requests_user_id')
  user: User;

  @OneToMany(() => AppConfig, config => config.request)
  appConfigs: AppConfig[];

  @OneToMany(() => AppResult, result => result.request)
  appResults: AppResult[];
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProvisioningRequest, AppProvider, ProvisioningStatus } from './provisioning-request.entity';

@Entity('app_results')
export class AppResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({
    type: 'enum',
    enum: AppProvider,
  })
  @Index('idx_app_results_app')
  app: AppProvider;

  @Column({
    type: 'enum',
    enum: ProvisioningStatus,
    default: ProvisioningStatus.PENDING,
  })
  @Index('idx_app_results_status')
  status: ProvisioningStatus;

  @Column({ name: 'external_user_id', length: 255, nullable: true })
  externalUserId: string;

  @Column({ name: 'external_links', type: 'jsonb', default: {} })
  externalLinks: Record<string, string>;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: any;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @Column({ name: 'last_retry_at', type: 'timestamp', nullable: true })
  lastRetryAt: Date;

  // Relations
  @ManyToOne(() => ProvisioningRequest, request => request.appResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  @Index('idx_app_results_request_id')
  request: ProvisioningRequest;
}
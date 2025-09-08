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
import { ProvisioningRequest } from './provisioning-request.entity';

@Entity('job_status')
export class JobStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', length: 255, unique: true })
  @Index('idx_job_status_job_id')
  jobId: string;

  @Column({ name: 'queue_name', length: 100 })
  queueName: string;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId: string;

  @Column({ length: 50 })
  @Index('idx_job_status_status')
  status: string;

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ type: 'jsonb', nullable: true })
  data: any;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relations
  @ManyToOne(() => ProvisioningRequest, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'request_id' })
  @Index('idx_job_status_request_id')
  request: ProvisioningRequest;
}
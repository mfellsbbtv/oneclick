import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ProvisioningRequest } from './provisioning-request.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'work_email', length: 255, unique: true })
  @Index('idx_users_work_email')
  workEmail: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relations
  @OneToMany(() => ProvisioningRequest, request => request.user)
  provisioningRequests: ProvisioningRequest[];
}
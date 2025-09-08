import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('provisioning_jobs')
export class ProvisioningJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('jsonb')
  config: any;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column('jsonb', { nullable: true })
  result: any;

  @Column('jsonb', { nullable: true })
  error: any;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  provider: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
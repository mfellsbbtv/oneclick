import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_audit_logs_actor')
  actor: string;

  @Column({ name: 'actor_email', length: 255, nullable: true })
  actorEmail: string;

  @Column({ length: 100 })
  @Index('idx_audit_logs_action')
  action: string;

  @Column({ length: 255, nullable: true })
  target: string;

  @Column({ name: 'target_type', length: 50, nullable: true })
  targetType: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_audit_logs_created_at')
  createdAt: Date;
}
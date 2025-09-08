import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  @Index('idx_admin_users_email')
  email: string;

  @Column({ name: 'full_name', length: 255, nullable: true })
  fullName: string;

  @Column({ name: 'oidc_subject', length: 255, unique: true, nullable: true })
  @Index('idx_admin_users_oidc_subject')
  oidcSubject: string;

  @Column({ type: 'text', array: true, default: ['admin'] })
  roles: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Case } from './case.entity';
import { User } from '../../../../users/entities/user.entity';

@Entity('case_notes')
@Index('idx_case_notes_case_created', ['caseId', 'createdAt'])
export class CaseNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'case_id' })
  caseId: string;

  @ManyToOne(() => Case, (supportCase) => supportCase.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'case_id' })
  case: Case;

  @Column({ type: 'uuid', name: 'author_id', nullable: true })
  authorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author: User | null;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

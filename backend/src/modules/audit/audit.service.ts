import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../../users/entities/user.entity';

export interface AuditActor {
  id: string;
  email: string;
  role: string;
  adminRole?: string | null;
}

export interface AuditRequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditRecordInput {
  actor?: AuditActor | User | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditQuery {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|api[_-]?key|private[_-]?key)/i;

/**
 * Makes arbitrary values safe to persist and display in an audit record.
 * Audits must never contain credentials or raw session tokens.
 */
export function redactForAudit(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 8) return '[MAX_DEPTH]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => redactForAudit(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY.test(key)
        ? REDACTED
        : redactForAudit(child, depth + 1);
    }
    return result;
  }
  return value;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Persist one audit record. Pass the active transaction manager when the
   * audited write must be atomic with the audit row.
   */
  async record(
    input: AuditRecordInput,
    manager?: EntityManager,
  ): Promise<AuditLog> {
    const actor = input.actor as (AuditActor & { adminRole?: string | null }) | null | undefined;
    const repository = manager
      ? manager.getRepository(AuditLog)
      : this.auditRepository;

    const entry = repository.create({
      actorId: input.actorId ?? actor?.id ?? null,
      actorEmail: input.actorEmail ?? actor?.email ?? null,
      actorRole:
        input.actorRole ??
        (actor?.adminRole ? String(actor.adminRole) : actor?.role ?? null),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      beforeState: redactForAudit(input.before ?? null),
      afterState: redactForAudit(input.after ?? null),
      metadata: (redactForAudit(input.metadata ?? null) as Record<string, unknown> | null),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    try {
      return await repository.save(entry);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to persist audit action "${input.action}": ${message}`);
      throw error;
    }
  }

  async list(query: AuditQuery): Promise<PaginatedAuditLogs> {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 25, 100);
    const skip = (page - 1) * limit;

    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC');

    if (query.actorId) {
      qb.andWhere('audit.actorId = :actorId', { actorId: query.actorId });
    }
    if (query.action?.trim()) {
      qb.andWhere('audit.action = :action', { action: query.action.trim() });
    }
    if (query.entityType?.trim()) {
      qb.andWhere('audit.entityType = :entityType', {
        entityType: query.entityType.trim(),
      });
    }
    if (query.entityId?.trim()) {
      qb.andWhere('audit.entityId = :entityId', { entityId: query.entityId.trim() });
    }
    if (query.from) {
      qb.andWhere('audit.createdAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('audit.createdAt <= :to', { to: query.to });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

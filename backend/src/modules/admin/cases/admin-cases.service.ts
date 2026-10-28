import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  Case,
  CaseCategory,
  CasePriority,
  CaseSeverity,
  CaseStatus,
  CompensationStatus,
} from './entities/case.entity';
import {
  CaseMessage,
  CaseMessageChannel,
  CaseMessageDeliveryStatus,
  CaseMessageDirection,
} from './entities/case-message.entity';
import { CaseNote } from './entities/case-note.entity';
import { CaseAttachment } from './entities/case-attachment.entity';
import { CaseEvent } from './entities/case-event.entity';
import { CannedResponse } from './entities/canned-response.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Property } from '../../properties/entities/property.entity';
import { Report } from '../../reports/entities/report.entity';
import { User, UserRole } from '../../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { AuditRequestContext, AuditService } from '../../audit/audit.service';
import { escapeCsv } from '../utils/csv';
import { toMinorUnits, fromMinorUnits } from '../../../lib/money';
import { computeCaseSla, isResolutionOverdue } from './case-sla';
import {
  AddCaseMessageDto,
  AddCaseNoteDto,
  AssignCaseDto,
  CaseStatusDto,
  CreateCannedResponseDto,
  CreateCaseDto,
  DecideCompensationDto,
  LogInboundReplyDto,
  ProposeCompensationDto,
  QueryAdminCasesDto,
  UpdateCannedResponseDto,
  UpdateCaseDto,
  UploadCaseAttachmentDto,
} from './dto/admin-cases.dto';

const CSV_LIMIT = 5000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.OPEN]: [
    CaseStatus.IN_PROGRESS,
    CaseStatus.WAITING_ON_REQUESTER,
    CaseStatus.WAITING_ON_INTERNAL,
    CaseStatus.RESOLVED,
  ],
  [CaseStatus.IN_PROGRESS]: [
    CaseStatus.WAITING_ON_REQUESTER,
    CaseStatus.WAITING_ON_INTERNAL,
    CaseStatus.RESOLVED,
  ],
  [CaseStatus.WAITING_ON_REQUESTER]: [
    CaseStatus.IN_PROGRESS,
    CaseStatus.WAITING_ON_INTERNAL,
    CaseStatus.RESOLVED,
  ],
  [CaseStatus.WAITING_ON_INTERNAL]: [
    CaseStatus.IN_PROGRESS,
    CaseStatus.WAITING_ON_REQUESTER,
    CaseStatus.RESOLVED,
  ],
  [CaseStatus.RESOLVED]: [CaseStatus.CLOSED, CaseStatus.OPEN],
  [CaseStatus.CLOSED]: [CaseStatus.OPEN],
};

@Injectable()
export class AdminCasesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminCasesService.name);
  private sweepTimer?: NodeJS.Timeout;
  private initialSweepTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Case)
    private readonly caseRepository: Repository<Case>,
    @InjectRepository(CaseMessage)
    private readonly messageRepository: Repository<CaseMessage>,
    @InjectRepository(CaseNote)
    private readonly noteRepository: Repository<CaseNote>,
    @InjectRepository(CaseAttachment)
    private readonly attachmentRepository: Repository<CaseAttachment>,
    @InjectRepository(CaseEvent)
    private readonly eventRepository: Repository<CaseEvent>,
    @InjectRepository(CannedResponse)
    private readonly cannedResponseRepository: Repository<CannedResponse>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    this.initialSweepTimer = setTimeout(() => {
      void this.sweepSla().catch((error: unknown) => {
        this.logger.warn(
          `Initial case SLA sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, 15_000);
    this.initialSweepTimer.unref?.();

    this.sweepTimer = setInterval(() => {
      void this.sweepSla().catch((error: unknown) => {
        this.logger.warn(
          `Case SLA sweep failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }, 5 * 60_000);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    if (this.initialSweepTimer) clearTimeout(this.initialSweepTimer);
  }

  async list(dto: QueryAdminCasesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 30;
    const qb = this.caseRepository
      .createQueryBuilder('supportCase')
      .leftJoinAndSelect('supportCase.assignee', 'assignee')
      .leftJoinAndSelect('supportCase.requesterUser', 'requesterUser')
      .leftJoinAndSelect('supportCase.booking', 'booking')
      .leftJoinAndSelect('supportCase.property', 'property');

    this.applyFilters(qb, dto);
    qb.orderBy('supportCase.status', 'ASC')
      .addOrderBy('supportCase.priority', 'DESC')
      .addOrderBy('supportCase.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const stats = await this.getStats(dto);

    return {
      data: data.map((supportCase) => this.toSummary(supportCase)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts: stats.counts,
      overdue: stats.overdue,
      unassigned: stats.unassigned,
    };
  }

  async detail(id: string) {
    const supportCase = await this.requireCase(id);
    const [messages, notes, attachments, events] = await Promise.all([
      this.messageRepository.find({
        where: { caseId: id },
        relations: ['createdBy'],
        order: { createdAt: 'ASC' },
      }),
      this.noteRepository.find({
        where: { caseId: id },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      }),
      this.attachmentRepository.find({
        where: { caseId: id },
        relations: ['uploadedBy'],
        order: { createdAt: 'ASC' },
      }),
      this.eventRepository.find({
        where: { caseId: id },
        relations: ['actor'],
        order: { createdAt: 'DESC' },
        take: 100,
      }),
    ]);

    return {
      ...this.toSummary(supportCase),
      description: supportCase.description,
      context: supportCase.context,
      firstResponseDueAt: supportCase.firstResponseDueAt,
      resolutionDueAt: supportCase.resolutionDueAt,
      firstRespondedAt: supportCase.firstRespondedAt,
      resolvedAt: supportCase.resolvedAt,
      closedAt: supportCase.closedAt,
      firstResponseBreachedAt: supportCase.firstResponseBreachedAt,
      resolutionBreachedAt: supportCase.resolutionBreachedAt,
      escalationReason: supportCase.escalationReason,
      lastMessageAt: supportCase.lastMessageAt,
      compensation: {
        status: supportCase.compensationStatus,
        amount: supportCase.compensationAmount,
        currency: supportCase.compensationCurrency,
        note: supportCase.compensationNote,
        proposedBy: supportCase.compensationProposedBy
          ? {
              id: supportCase.compensationProposedBy.id,
              name: supportCase.compensationProposedBy.name,
            }
          : null,
        decidedBy: supportCase.compensationDecidedBy
          ? {
              id: supportCase.compensationDecidedBy.id,
              name: supportCase.compensationDecidedBy.name,
            }
          : null,
        decidedAt: supportCase.compensationDecidedAt,
      },
      messages: messages.map((message) => this.toMessage(message)),
      notes: notes.map((note) => ({
        id: note.id,
        body: note.body,
        author: note.author
          ? { id: note.author.id, name: note.author.name }
          : null,
        createdAt: note.createdAt,
      })),
      attachments: attachments.map((attachment) => this.toAttachment(attachment)),
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        fromValue: event.fromValue,
        toValue: event.toValue,
        reason: event.reason,
        metadata: event.metadata,
        actor: event.actor
          ? { id: event.actor.id, name: event.actor.name }
          : null,
        createdAt: event.createdAt,
      })),
      allowedTransitions: STATUS_TRANSITIONS[supportCase.status],
      notifyInApp: Boolean(this.getRequesterUserId(supportCase)),
    };
  }

  async create(
    dto: CreateCaseDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    if (dto.idempotencyKey) {
      const existing = await this.caseRepository.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.detail(existing.id);
    }

    const booking = dto.bookingId
      ? await this.bookingRepository.findOne({
          where: { id: dto.bookingId },
          relations: ['guest', 'property', 'property.host'],
        })
      : null;
    if (dto.bookingId && !booking) {
      throw new NotFoundException('Linked reservation not found');
    }

    const propertyId = dto.propertyId ?? booking?.propertyId ?? null;
    const property = propertyId
      ? booking?.property ?? (await this.propertyRepository.findOne({ where: { id: propertyId } }))
      : null;
    if (propertyId && !property) {
      throw new NotFoundException('Linked property not found');
    }

    const report = dto.reportId
      ? await this.reportRepository.findOne({ where: { id: dto.reportId } })
      : null;
    if (dto.reportId && !report) {
      throw new NotFoundException('Linked report not found');
    }

    let requesterUser: User | null = null;
    if (dto.requesterUserId) {
      requesterUser = await this.userRepository.findOne({
        where: { id: dto.requesterUserId },
      });
      if (!requesterUser) throw new NotFoundException('Requester account not found');
    } else if (booking?.guest) {
      requesterUser = booking.guest;
    }

    const requesterName =
      dto.requesterName?.trim() ||
      requesterUser?.name ||
      booking?.guest?.name ||
      'Guest';
    const requesterEmail =
      dto.requesterEmail?.trim() ||
      requesterUser?.email ||
      booking?.guest?.email ||
      null;

    if (!requesterUser && !dto.requesterName && !booking) {
      throw new BadRequestException(
        'Provide a requester account, requester name, or linked reservation',
      );
    }

    const assignee = dto.assigneeId
      ? await this.requireAssignableAdmin(dto.assigneeId)
      : null;

    const createdAt = new Date();
    const priority = dto.priority ?? CasePriority.NORMAL;
    const sla = computeCaseSla(priority, createdAt);
    const created = this.caseRepository.create({
      number: await this.nextCaseNumber(),
      type: dto.type,
      category: dto.category ?? CaseCategory.OTHER,
      priority,
      severity: dto.severity ?? CaseSeverity.MEDIUM,
      status: CaseStatus.OPEN,
      subject: dto.subject,
      description: dto.description,
      requesterUserId: requesterUser?.id ?? null,
      requesterName,
      requesterEmail,
      assigneeId: assignee?.id ?? null,
      bookingId: booking?.id ?? null,
      propertyId: property?.id ?? null,
      reportId: report?.id ?? null,
      context: {
        booking: booking
          ? {
              id: booking.id,
              reference: booking.reference,
              status: booking.status,
              checkInDate: booking.checkInDate,
              checkOutDate: booking.checkOutDate,
              guest: booking.guest
                ? { id: booking.guest.id, name: booking.guest.name }
                : null,
              host: booking.property?.host
                ? {
                    id: booking.property.host.id,
                    name: booking.property.host.name,
                  }
                : null,
            }
          : null,
        property: property
          ? {
              id: property.id,
              title: property.title,
              city: property.city,
              hostId: property.hostId,
            }
          : null,
        report: report
          ? { id: report.id, status: report.status, targetType: report.targetType }
          : null,
      },
      firstResponseDueAt: sla.firstResponseDueAt,
      resolutionDueAt: sla.resolutionDueAt,
      createdById: actor.id,
      idempotencyKey: dto.idempotencyKey ?? null,
    });

    const saved = await this.caseRepository.save(created);
    await this.recordEvent(saved.id, 'CASE_CREATED', actor.id, null, null, null, {
      priority,
      type: dto.type,
    });
    await this.auditService.record({
      actor,
      action: 'case.created',
      entityType: 'case',
      entityId: saved.id,
      after: {
        number: saved.number,
        type: saved.type,
        priority: saved.priority,
        assigneeId: saved.assigneeId,
      },
      ...context,
    });

    if (saved.assigneeId) {
      await this.notifyUser(
        saved.assigneeId,
        NotificationType.CASE_ASSIGNED,
        'Case assigned to you',
        `${saved.number} · ${saved.subject}`,
        `/admin/cases?case=${saved.id}`,
        saved.id,
        'assigned',
      );
    }

    return this.detail(saved.id);
  }

  async update(
    id: string,
    dto: UpdateCaseDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    const before = {
      category: supportCase.category,
      priority: supportCase.priority,
      severity: supportCase.severity,
    };

    if (dto.category !== undefined) supportCase.category = dto.category;
    if (dto.priority !== undefined) supportCase.priority = dto.priority;
    if (dto.severity !== undefined) supportCase.severity = dto.severity;

    if (
      supportCase.category === before.category &&
      supportCase.priority === before.priority &&
      supportCase.severity === before.severity
    ) {
      return this.detail(id);
    }

    await this.caseRepository.save(supportCase);

    if (before.category !== supportCase.category) {
      await this.recordEvent(
        id,
        'CATEGORY_CHANGED',
        actor.id,
        before.category,
        supportCase.category,
        null,
      );
    }
    if (before.priority !== supportCase.priority) {
      await this.recordEvent(
        id,
        'PRIORITY_CHANGED',
        actor.id,
        before.priority,
        supportCase.priority,
        null,
      );
    }
    if (before.severity !== supportCase.severity) {
      await this.recordEvent(
        id,
        'SEVERITY_CHANGED',
        actor.id,
        before.severity,
        supportCase.severity,
        null,
      );
    }

    await this.auditService.record({
      actor,
      action: 'case.updated',
      entityType: 'case',
      entityId: id,
      before,
      after: {
        category: supportCase.category,
        priority: supportCase.priority,
        severity: supportCase.severity,
      },
      ...context,
    });

    return this.detail(id);
  }

  async assign(
    id: string,
    dto: AssignCaseDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    const assignee = await this.requireAssignableAdmin(dto.assigneeId);
    const previousAssigneeId = supportCase.assigneeId;
    supportCase.assigneeId = assignee.id;
    await this.caseRepository.save(supportCase);

    await this.recordEvent(
      id,
      'ASSIGNED',
      actor.id,
      previousAssigneeId,
      assignee.id,
      dto.note ?? null,
    );
    await this.auditService.record({
      actor,
      action: 'case.assigned',
      entityType: 'case',
      entityId: id,
      before: { assigneeId: previousAssigneeId },
      after: { assigneeId: assignee.id },
      metadata: { note: dto.note ?? null },
      ...context,
    });
    await this.notifyUser(
      assignee.id,
      NotificationType.CASE_ASSIGNED,
      'Case assigned to you',
      `${supportCase.number} · ${supportCase.subject}`,
      `/admin/cases?case=${supportCase.id}`,
      supportCase.id,
      'assign',
    );

    return this.detail(id);
  }

  async updateStatus(
    id: string,
    dto: CaseStatusDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    if (supportCase.status === dto.status) {
      throw new BadRequestException('The case is already in that state');
    }
    if (!STATUS_TRANSITIONS[supportCase.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move a case from ${supportCase.status} to ${dto.status}`,
      );
    }

    const from = supportCase.status;
    supportCase.status = dto.status;
    const now = new Date();
    if (dto.status === CaseStatus.RESOLVED) {
      supportCase.resolvedAt = now;
      supportCase.closedAt = null;
    } else if (dto.status === CaseStatus.CLOSED) {
      supportCase.closedAt = now;
    } else if (dto.status === CaseStatus.OPEN) {
      supportCase.resolvedAt = null;
      supportCase.closedAt = null;
    }

    await this.caseRepository.save(supportCase);
    await this.recordEvent(id, 'STATUS_CHANGED', actor.id, from, dto.status, dto.reason);
    await this.auditService.record({
      actor,
      action: 'case.status_changed',
      entityType: 'case',
      entityId: id,
      before: { status: from },
      after: { status: dto.status },
      metadata: { reason: dto.reason },
      ...context,
    });

    return this.detail(id);
  }

  async addMessage(
    id: string,
    dto: AddCaseMessageDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    if (dto.idempotencyKey) {
      const existing = await this.messageRepository.findOne({
        where: { caseId: id, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.detail(id);
    }

    const recipientUserId = this.getRequesterUserId(supportCase);
    const channel =
      dto.channel ??
      (recipientUserId ? CaseMessageChannel.IN_APP : CaseMessageChannel.EMAIL);
    if (channel === CaseMessageChannel.IN_APP && !recipientUserId) {
      throw new BadRequestException(
        'This case has no requester account for an in-app reply. Log the message as an email instead.',
      );
    }

    const message = this.messageRepository.create({
      caseId: id,
      direction: CaseMessageDirection.OUTBOUND,
      channel,
      authorName: actor.name,
      authorEmail: actor.email,
      body: dto.body,
      deliveryStatus:
        channel === CaseMessageChannel.IN_APP
          ? CaseMessageDeliveryStatus.DELIVERED_IN_APP
          : CaseMessageDeliveryStatus.LOGGED,
      createdById: actor.id,
      idempotencyKey: dto.idempotencyKey ?? null,
    });
    let saved = await this.messageRepository.save(message);

    const now = new Date();
    supportCase.firstRespondedAt ??= now;
    supportCase.lastMessageAt = now;
    if (supportCase.status === CaseStatus.OPEN) {
      supportCase.status = CaseStatus.IN_PROGRESS;
    }
    await this.caseRepository.save(supportCase);

    if (channel === CaseMessageChannel.IN_APP && recipientUserId) {
      try {
        await this.notificationsService.createNotification({
          userId: recipientUserId,
          type: NotificationType.CASE_REPLY,
          title: 'Reply from ENGIDA support',
          message: `${supportCase.number}: ${truncate(dto.body, 180)}`,
          link: '/dashboard',
          metadata: { caseId: id, caseNumber: supportCase.number },
          idempotencyKey: `case_${id}_message_${saved.id}`,
        });
      } catch (error: unknown) {
        saved.deliveryStatus = CaseMessageDeliveryStatus.FAILED;
        saved = await this.messageRepository.save(saved);
        this.logger.warn(
          `Case ${supportCase.number} reply could not be delivered in-app: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await this.recordEvent(
      id,
      'MESSAGE_SENT',
      actor.id,
      null,
      channel,
      truncate(dto.body, 200),
      { messageId: saved.id, deliveryStatus: saved.deliveryStatus },
    );
    await this.auditService.record({
      actor,
      action: 'case.message_sent',
      entityType: 'case',
      entityId: id,
      after: { messageId: saved.id, channel, deliveryStatus: saved.deliveryStatus },
      ...context,
    });

    return this.detail(id);
  }

  async logInboundReply(
    id: string,
    dto: LogInboundReplyDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    if (dto.idempotencyKey) {
      const existing = await this.messageRepository.findOne({
        where: { caseId: id, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.detail(id);
    }

    const message = this.messageRepository.create({
      caseId: id,
      direction: CaseMessageDirection.INBOUND,
      channel: dto.channel ?? CaseMessageChannel.EMAIL,
      authorName: dto.authorName?.trim() || supportCase.requesterName,
      authorEmail:
        dto.authorEmail?.trim() || supportCase.requesterEmail || null,
      body: dto.body,
      deliveryStatus: CaseMessageDeliveryStatus.LOGGED,
      createdById: actor.id,
      idempotencyKey: dto.idempotencyKey ?? null,
    });
    const saved = await this.messageRepository.save(message);

    const now = new Date();
    const wasTerminal =
      supportCase.status === CaseStatus.RESOLVED ||
      supportCase.status === CaseStatus.CLOSED;
    supportCase.lastMessageAt = now;
    if (wasTerminal) {
      supportCase.status = CaseStatus.OPEN;
      supportCase.resolvedAt = null;
      supportCase.closedAt = null;
    } else if (
      supportCase.status === CaseStatus.WAITING_ON_REQUESTER ||
      supportCase.status === CaseStatus.WAITING_ON_INTERNAL
    ) {
      supportCase.status = CaseStatus.IN_PROGRESS;
    }
    await this.caseRepository.save(supportCase);

    await this.recordEvent(
      id,
      wasTerminal ? 'REOPENED' : 'REPLY_RECEIVED',
      actor.id,
      wasTerminal ? CaseStatus.RESOLVED : null,
      supportCase.status,
      truncate(dto.body, 200),
      { messageId: saved.id },
    );
    await this.auditService.record({
      actor,
      action: 'case.inbound_reply_logged',
      entityType: 'case',
      entityId: id,
      after: { messageId: saved.id, channel: saved.channel },
      metadata: { reopened: wasTerminal },
      ...context,
    });

    return this.detail(id);
  }

  async addNote(
    id: string,
    dto: AddCaseNoteDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    await this.requireCase(id);
    const note = await this.noteRepository.save(
      this.noteRepository.create({
        caseId: id,
        authorId: actor.id,
        body: dto.body,
      }),
    );
    await this.recordEvent(id, 'NOTE_ADDED', actor.id, null, null, null, {
      noteId: note.id,
    });
    await this.auditService.record({
      actor,
      action: 'case.note_added',
      entityType: 'case',
      entityId: id,
      after: { noteId: note.id },
      ...context,
    });
    return this.detail(id);
  }

  async addAttachment(
    id: string,
    file: Express.Multer.File | undefined,
    dto: UploadCaseAttachmentDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a file to attach');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('Attachments must be 10 MB or smaller');
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Attach a PDF, JPG, PNG, or WEBP file');
    }

    const extension = safeExtension(file.originalname, file.mimetype);
    const storageKey = path.posix.join(id, `${randomUUID()}${extension}`);
    const absolutePath = this.resolveStoragePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    const attachment = await this.attachmentRepository.save(
      this.attachmentRepository.create({
        caseId: id,
        uploadedById: actor.id,
        fileName: sanitizeFileName(file.originalname),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        caption: dto.caption ?? null,
      }),
    );
    await this.recordEvent(
      id,
      'ATTACHMENT_ADDED',
      actor.id,
      null,
      null,
      attachment.fileName,
      { attachmentId: attachment.id },
    );
    await this.auditService.record({
      actor,
      action: 'case.attachment_uploaded',
      entityType: 'case',
      entityId: id,
      metadata: {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
        caseNumber: supportCase.number,
      },
      ...context,
    });

    return this.detail(id);
  }

  async downloadAttachment(
    caseId: string,
    attachmentId: string,
    actor: User,
    context: AuditRequestContext,
  ) {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, caseId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const absolutePath = this.resolveStoragePath(attachment.storageKey);
    let buffer: Buffer;
    try {
      buffer = await readFile(absolutePath);
    } catch {
      throw new NotFoundException('Attachment file is unavailable');
    }

    await this.auditService.record({
      actor,
      action: 'case.attachment_downloaded',
      entityType: 'case',
      entityId: caseId,
      metadata: { attachmentId, fileName: attachment.fileName },
      ...context,
    });

    return {
      buffer,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  async proposeCompensation(
    id: string,
    dto: ProposeCompensationDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    if (toMinorUnits(dto.amount) <= 0n) {
      throw new BadRequestException('Compensation must be greater than zero');
    }
    if (supportCase.compensationStatus === CompensationStatus.PROPOSED) {
      throw new ConflictException('A compensation proposal is already awaiting a decision');
    }
    if (supportCase.status === CaseStatus.CLOSED) {
      throw new BadRequestException('Reopen the case before proposing compensation');
    }

    const amount = fromMinorUnits(toMinorUnits(dto.amount));
    supportCase.compensationAmount = amount;
    supportCase.compensationCurrency = dto.currency || 'ETB';
    supportCase.compensationStatus = CompensationStatus.PROPOSED;
    supportCase.compensationNote = dto.note;
    supportCase.compensationProposedById = actor.id;
    supportCase.compensationDecidedById = null;
    supportCase.compensationDecidedAt = null;
    await this.caseRepository.save(supportCase);

    await this.recordEvent(
      id,
      'COMPENSATION_PROPOSED',
      actor.id,
      null,
      `${supportCase.compensationCurrency} ${amount}`,
      dto.note,
    );
    await this.auditService.record({
      actor,
      action: 'case.compensation_proposed',
      entityType: 'case',
      entityId: id,
      after: {
        amount,
        currency: supportCase.compensationCurrency,
        note: dto.note,
      },
      ...context,
    });

    return this.detail(id);
  }

  async decideCompensation(
    id: string,
    decision: 'approve' | 'reject',
    dto: DecideCompensationDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const supportCase = await this.requireCase(id);
    if (supportCase.compensationStatus !== CompensationStatus.PROPOSED) {
      throw new BadRequestException('There is no compensation proposal awaiting a decision');
    }
    if (supportCase.compensationProposedById === actor.id) {
      throw new ForbiddenException('A compensation proposal must be decided by another administrator');
    }

    supportCase.compensationStatus =
      decision === 'approve'
        ? CompensationStatus.APPROVED
        : CompensationStatus.REJECTED;
    supportCase.compensationDecidedById = actor.id;
    supportCase.compensationDecidedAt = new Date();
    supportCase.compensationNote = dto.note;
    await this.caseRepository.save(supportCase);

    await this.recordEvent(
      id,
      decision === 'approve' ? 'COMPENSATION_APPROVED' : 'COMPENSATION_REJECTED',
      actor.id,
      CompensationStatus.PROPOSED,
      supportCase.compensationStatus,
      dto.note,
      {
        amount: supportCase.compensationAmount,
        currency: supportCase.compensationCurrency,
      },
    );
    await this.auditService.record({
      actor,
      action: `case.compensation_${decision}d`,
      entityType: 'case',
      entityId: id,
      after: {
        status: supportCase.compensationStatus,
        amount: supportCase.compensationAmount,
        currency: supportCase.compensationCurrency,
        note: dto.note,
      },
      metadata: { noMoneyMoved: true },
      ...context,
    });

    return this.detail(id);
  }

  async listAssignees() {
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
      select: ['id', 'name', 'email', 'adminRole'],
      order: { name: 'ASC' },
    });
    return admins.map((admin) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      adminRole: admin.adminRole,
    }));
  }

  async listCannedResponses() {
    return this.cannedResponseRepository.find({
      order: { isActive: 'DESC', title: 'ASC' },
    });
  }

  async createCannedResponse(
    dto: CreateCannedResponseDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const response = await this.cannedResponseRepository.save(
      this.cannedResponseRepository.create({
        title: dto.title,
        body: dto.body,
        category: dto.category ?? null,
        createdById: actor.id,
      }),
    );
    await this.auditService.record({
      actor,
      action: 'case.canned_response_created',
      entityType: 'canned_response',
      entityId: response.id,
      after: { title: response.title, category: response.category },
      ...context,
    });
    return response;
  }

  async updateCannedResponse(
    id: string,
    dto: UpdateCannedResponseDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const response = await this.cannedResponseRepository.findOne({ where: { id } });
    if (!response) throw new NotFoundException('Canned response not found');
    const before = {
      title: response.title,
      category: response.category,
      isActive: response.isActive,
    };
    if (dto.title !== undefined) response.title = dto.title;
    if (dto.body !== undefined) response.body = dto.body;
    if (dto.category !== undefined) response.category = dto.category;
    if (dto.isActive !== undefined) response.isActive = dto.isActive;
    const saved = await this.cannedResponseRepository.save(response);

    await this.auditService.record({
      actor,
      action: 'case.canned_response_updated',
      entityType: 'canned_response',
      entityId: id,
      before,
      after: { title: saved.title, category: saved.category, isActive: saved.isActive },
      ...context,
    });
    return saved;
  }

  async exportCsv(
    dto: QueryAdminCasesDto,
    actor: User,
    context: AuditRequestContext,
  ): Promise<string> {
    const qb = this.caseRepository
      .createQueryBuilder('supportCase')
      .leftJoinAndSelect('supportCase.assignee', 'assignee')
      .leftJoinAndSelect('supportCase.booking', 'booking');
    this.applyFilters(qb, dto);
    qb.orderBy('supportCase.createdAt', 'DESC').take(CSV_LIMIT);
    const cases = await qb.getMany();

    const rows = cases.map((supportCase) => [
      supportCase.number,
      supportCase.subject,
      supportCase.type,
      supportCase.category,
      supportCase.priority,
      supportCase.severity,
      supportCase.status,
      supportCase.requesterName,
      supportCase.requesterEmail ?? '',
      supportCase.assignee?.name ?? '',
      supportCase.booking?.reference ?? '',
      supportCase.firstResponseDueAt.toISOString(),
      supportCase.resolutionDueAt.toISOString(),
      supportCase.compensationStatus,
      supportCase.compensationAmount ?? '',
      supportCase.createdAt.toISOString(),
    ]);
    const header = [
      'Case',
      'Subject',
      'Type',
      'Category',
      'Priority',
      'Severity',
      'Status',
      'Requester',
      'Requester email',
      'Assignee',
      'Booking',
      'First response due',
      'Resolution due',
      'Compensation status',
      'Compensation amount',
      'Created',
    ];

    await this.auditService.record({
      actor,
      action: 'case.list_exported',
      entityType: 'case',
      metadata: { rows: rows.length, filters: this.safeFilters(dto) },
      ...context,
    });

    return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  }

  /**
   * Lazy SLA sweeper. It is idempotent because breach timestamps and escalation
   * are only written once, and notifications use stable idempotency keys.
   */
  async sweepSla(now: Date = new Date()): Promise<{ updated: number }> {
    const candidates = await this.caseRepository
      .createQueryBuilder('supportCase')
      .where('supportCase.status NOT IN (:...terminal)', {
        terminal: [CaseStatus.RESOLVED, CaseStatus.CLOSED],
      })
      .andWhere(
        '(supportCase.resolutionDueAt < :now OR (supportCase.firstRespondedAt IS NULL AND supportCase.firstResponseDueAt < :now))',
        { now },
      )
      .orderBy('supportCase.resolutionDueAt', 'ASC')
      .take(200)
      .getMany();

    let updated = 0;
    for (const supportCase of candidates) {
      let changed = false;
      if (
        !supportCase.firstResponseBreachedAt &&
        !supportCase.firstRespondedAt &&
        supportCase.firstResponseDueAt < now
      ) {
        supportCase.firstResponseBreachedAt = now;
        changed = true;
      }
      if (!supportCase.resolutionBreachedAt && isResolutionOverdue(supportCase, now)) {
        supportCase.resolutionBreachedAt = now;
        changed = true;
      }
      if (changed && !supportCase.escalatedAt) {
        supportCase.escalatedAt = now;
        supportCase.escalationReason = 'Resolution SLA breached; escalated automatically';
        await this.recordEvent(
          supportCase.id,
          'SLA_ESCALATED',
          null,
          null,
          supportCase.status,
          supportCase.escalationReason,
          {
            firstResponseBreachedAt: supportCase.firstResponseBreachedAt,
            resolutionBreachedAt: supportCase.resolutionBreachedAt,
          },
        );
        await this.notifySlaEscalation(supportCase);
        await this.auditService.record({
          actorId: null,
          actorEmail: null,
          actorRole: 'SYSTEM',
          action: 'case.sla_escalated',
          entityType: 'case',
          entityId: supportCase.id,
          after: {
            escalatedAt: supportCase.escalatedAt,
            reason: supportCase.escalationReason,
          },
        });
      }
      if (changed) {
        await this.caseRepository.save(supportCase);
        updated += 1;
      }
    }

    if (updated > 0) {
      this.logger.log(`Case SLA sweep escalated ${updated} case(s)`);
    }
    return { updated };
  }

  private async notifySlaEscalation(supportCase: Case): Promise<void> {
    if (supportCase.assigneeId) {
      await this.notifyUser(
        supportCase.assigneeId,
        NotificationType.CASE_ESCALATED,
        'Case escalated',
        `${supportCase.number} has breached its resolution SLA.`,
        `/admin/cases?case=${supportCase.id}`,
        supportCase.id,
        'escalated',
      );
      return;
    }

    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
      select: ['id'],
      take: 20,
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifyUser(
          admin.id,
          NotificationType.CASE_ESCALATED,
          'Unassigned case escalated',
          `${supportCase.number} has breached its resolution SLA.`,
          `/admin/cases?case=${supportCase.id}`,
          supportCase.id,
          'escalated',
        ),
      ),
    );
  }

  private async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link: string,
    caseId: string,
    event: string,
  ): Promise<void> {
    try {
      await this.notificationsService.createNotification({
        userId,
        type,
        title,
        message,
        link,
        metadata: { caseId },
        idempotencyKey: `case_${caseId}_${event}_${userId}`,
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Could not notify ${userId} about case ${caseId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async recordEvent(
    caseId: string,
    type: string,
    actorId: string | null,
    fromValue: string | null,
    toValue: string | null,
    reason: string | null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.eventRepository.save(
      this.eventRepository.create({
        caseId,
        type,
        actorId,
        fromValue,
        toValue,
        reason,
        metadata,
      }),
    );
  }

  private async requireCase(id: string): Promise<Case> {
    const supportCase = await this.caseRepository.findOne({
      where: { id },
      relations: [
        'assignee',
        'requesterUser',
        'booking',
        'booking.guest',
        'booking.property',
        'booking.property.host',
        'property',
        'report',
        'createdBy',
        'compensationProposedBy',
        'compensationDecidedBy',
      ],
    });
    if (!supportCase) throw new NotFoundException('Case not found');
    return supportCase;
  }

  private async requireAssignableAdmin(id: string): Promise<User> {
    const admin = await this.userRepository.findOne({
      where: { id, role: UserRole.ADMIN, isActive: true },
    });
    if (!admin) {
      throw new BadRequestException('Choose an active administrator');
    }
    return admin;
  }

  private getRequesterUserId(supportCase: Case): string | null {
    return supportCase.requesterUserId ?? supportCase.booking?.guestId ?? null;
  }

  private async nextCaseNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const rows = (await this.caseRepository.query(
      `SELECT nextval('case_number_seq') AS value`,
    )) as Array<{ value: string | number }>;
    const sequence = Number(rows?.[0]?.value);
    return `CASE-${year}-${String(
      Number.isFinite(sequence) && sequence > 0 ? sequence : Date.now() % 1_000_000,
    ).padStart(6, '0')}`;
  }

  private resolveStoragePath(storageKey: string): string {
    const baseDir = path.resolve(
      process.env.CASE_ATTACHMENT_DIR || path.join(process.cwd(), 'storage', 'cases'),
    );
    const resolved = path.resolve(baseDir, storageKey);
    if (resolved !== baseDir && !resolved.startsWith(`${baseDir}${path.sep}`)) {
      throw new BadRequestException('Invalid attachment path');
    }
    return resolved;
  }

  private applyFilters(
    qb: SelectQueryBuilder<Case>,
    dto: QueryAdminCasesDto,
  ): void {
    if (dto.q) {
      qb.andWhere(
        '(supportCase.number ILIKE :q OR supportCase.subject ILIKE :q OR supportCase.requesterName ILIKE :q OR supportCase.requesterEmail ILIKE :q OR booking.reference ILIKE :q)',
        { q: `%${dto.q}%` },
      );
    }
    if (dto.status) qb.andWhere('supportCase.status = :status', { status: dto.status });
    if (dto.type) qb.andWhere('supportCase.type = :type', { type: dto.type });
    if (dto.priority) {
      qb.andWhere('supportCase.priority = :priority', { priority: dto.priority });
    }
    if (dto.severity) {
      qb.andWhere('supportCase.severity = :severity', { severity: dto.severity });
    }
    if (dto.assigneeId) {
      qb.andWhere('supportCase.assigneeId = :assigneeId', {
        assigneeId: dto.assigneeId,
      });
    }
    if (dto.bookingId) {
      qb.andWhere('supportCase.bookingId = :bookingId', { bookingId: dto.bookingId });
    }
    if (dto.overdue) {
      qb.andWhere(
        '(supportCase.status NOT IN (:...terminal) AND supportCase.resolutionDueAt < :now)',
        {
          terminal: [CaseStatus.RESOLVED, CaseStatus.CLOSED],
          now: new Date(),
        },
      );
    }
  }

  private async getStats(dto: QueryAdminCasesDto) {
    const countsQb = this.caseRepository
      .createQueryBuilder('supportCase')
      .leftJoin('supportCase.booking', 'booking');
    this.applyFilters(countsQb, { ...dto, status: undefined, overdue: undefined });
    countsQb
      .select('supportCase.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('supportCase.status');
    const rows = await countsQb.getRawMany<{ status: CaseStatus; count: string }>();
    const counts: Record<CaseStatus, number> = {
      [CaseStatus.OPEN]: 0,
      [CaseStatus.IN_PROGRESS]: 0,
      [CaseStatus.WAITING_ON_REQUESTER]: 0,
      [CaseStatus.WAITING_ON_INTERNAL]: 0,
      [CaseStatus.RESOLVED]: 0,
      [CaseStatus.CLOSED]: 0,
    };
    for (const row of rows) counts[row.status] = Number(row.count);

    const overdueQb = this.caseRepository
      .createQueryBuilder('supportCase')
      .leftJoin('supportCase.booking', 'booking');
    this.applyFilters(overdueQb, { ...dto, status: undefined, overdue: undefined });
    overdueQb.andWhere(
      '(supportCase.status NOT IN (:...terminal) AND supportCase.resolutionDueAt < :now)',
      {
        terminal: [CaseStatus.RESOLVED, CaseStatus.CLOSED],
        now: new Date(),
      },
    );
    const overdue = await overdueQb.getCount();

    const unassignedQb = this.caseRepository
      .createQueryBuilder('supportCase')
      .leftJoin('supportCase.booking', 'booking');
    this.applyFilters(unassignedQb, { ...dto, status: undefined, overdue: undefined });
    unassignedQb
      .andWhere('supportCase.assigneeId IS NULL')
      .andWhere('supportCase.status NOT IN (:...terminal)', {
        terminal: [CaseStatus.RESOLVED, CaseStatus.CLOSED],
      });
    const unassigned = await unassignedQb.getCount();

    return { counts, overdue, unassigned };
  }

  private toSummary(supportCase: Case) {
    const now = new Date();
    return {
      id: supportCase.id,
      number: supportCase.number,
      type: supportCase.type,
      category: supportCase.category,
      priority: supportCase.priority,
      severity: supportCase.severity,
      status: supportCase.status,
      subject: supportCase.subject,
      requesterName: supportCase.requesterName,
      requesterEmail: supportCase.requesterEmail,
      requesterUserId: supportCase.requesterUserId,
      createdAt: supportCase.createdAt,
      updatedAt: supportCase.updatedAt,
      escalatedAt: supportCase.escalatedAt,
      firstResponseBreachedAt: supportCase.firstResponseBreachedAt,
      resolutionBreachedAt: supportCase.resolutionBreachedAt,
      firstResponseDueAt: supportCase.firstResponseDueAt,
      resolutionDueAt: supportCase.resolutionDueAt,
      overdue:
        supportCase.status !== CaseStatus.RESOLVED &&
        supportCase.status !== CaseStatus.CLOSED &&
        supportCase.resolutionDueAt < now,
      assignee: supportCase.assignee
        ? {
            id: supportCase.assignee.id,
            name: supportCase.assignee.name,
            email: supportCase.assignee.email,
            adminRole: supportCase.assignee.adminRole,
          }
        : null,
      booking: supportCase.booking
        ? {
            id: supportCase.booking.id,
            reference: supportCase.booking.reference,
            status: supportCase.booking.status,
            checkInDate: supportCase.booking.checkInDate,
            checkOutDate: supportCase.booking.checkOutDate,
          }
        : null,
      property: supportCase.property
        ? {
            id: supportCase.property.id,
            title: supportCase.property.title,
            city: supportCase.property.city,
          }
        : null,
      compensationStatus: supportCase.compensationStatus,
      compensationAmount: supportCase.compensationAmount,
      compensationCurrency: supportCase.compensationCurrency,
    };
  }

  private toMessage(message: CaseMessage) {
    return {
      id: message.id,
      direction: message.direction,
      channel: message.channel,
      authorName: message.authorName,
      authorEmail: message.authorEmail,
      body: message.body,
      deliveryStatus: message.deliveryStatus,
      createdBy: message.createdBy
        ? { id: message.createdBy.id, name: message.createdBy.name }
        : null,
      createdAt: message.createdAt,
    };
  }

  private toAttachment(attachment: CaseAttachment) {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      caption: attachment.caption,
      uploadedBy: attachment.uploadedBy
        ? { id: attachment.uploadedBy.id, name: attachment.uploadedBy.name }
        : null,
      createdAt: attachment.createdAt,
    };
  }

  private safeFilters(dto: QueryAdminCasesDto) {
    return {
      hasSearch: Boolean(dto.q?.trim()),
      status: dto.status ?? null,
      type: dto.type ?? null,
      priority: dto.priority ?? null,
      severity: dto.severity ?? null,
      assigneeId: dto.assigneeId ?? null,
      bookingId: dto.bookingId ?? null,
      overdue: dto.overdue ?? null,
    };
  }
}


function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function sanitizeFileName(name: string): string {
  return path.basename(name).replace(/[^\w.\- ()]/g, '_').slice(0, 255) || 'attachment';
}

function safeExtension(originalName: string, mimeType: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(ext)) return ext;
  return {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }[mimeType] ?? '';
}

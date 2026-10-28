import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminCasesService } from './admin-cases.service';
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

@Controller('admin/cases')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminCasesController {
  constructor(private readonly adminCasesService: AdminCasesService) {}

  @Get()
  @RequirePermissions(Permission.CASES_VIEW)
  list(@Query() query: QueryAdminCasesDto) {
    return this.adminCasesService.list(query);
  }

  @Get('export.csv')
  @RequirePermissions(Permission.CASES_VIEW)
  async export(
    @Query() query: QueryAdminCasesDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.adminCasesService.exportCsv(query, actor, {
      ipAddress,
      userAgent,
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="engida-cases-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }

  @Get('assignees')
  @RequirePermissions(Permission.CASES_VIEW)
  assignees() {
    return this.adminCasesService.listAssignees();
  }

  @Get('canned-responses')
  @RequirePermissions(Permission.CASES_VIEW)
  cannedResponses() {
    return this.adminCasesService.listCannedResponses();
  }

  @Post('canned-responses')
  @RequirePermissions(Permission.CASES_MANAGE)
  createCannedResponse(
    @Body() dto: CreateCannedResponseDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.createCannedResponse(dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Patch('canned-responses/:id')
  @RequirePermissions(Permission.CASES_MANAGE)
  updateCannedResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCannedResponseDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.updateCannedResponse(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post('sla/sweep')
  @RequirePermissions(Permission.CASES_MANAGE)
  sweepSla() {
    return this.adminCasesService.sweepSla();
  }

  @Get(':id')
  @RequirePermissions(Permission.CASES_VIEW)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCasesService.detail(id);
  }

  @Post()
  @RequirePermissions(Permission.CASES_MANAGE)
  create(
    @Body() dto: CreateCaseDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.create(dto, actor, { ipAddress, userAgent });
  }

  @Patch(':id')
  @RequirePermissions(Permission.CASES_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.update(id, dto, actor, { ipAddress, userAgent });
  }

  @Post(':id/assign')
  @RequirePermissions(Permission.CASES_MANAGE)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCaseDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.assign(id, dto, actor, { ipAddress, userAgent });
  }

  @Post(':id/status')
  @RequirePermissions(Permission.CASES_MANAGE)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseStatusDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.updateStatus(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/messages')
  @RequirePermissions(Permission.CASES_MANAGE)
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCaseMessageDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.addMessage(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/inbound-replies')
  @RequirePermissions(Permission.CASES_MANAGE)
  logInboundReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogInboundReplyDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.logInboundReply(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/notes')
  @RequirePermissions(Permission.CASES_MANAGE)
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCaseNoteDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.addNote(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/attachments')
  @RequirePermissions(Permission.CASES_MANAGE)
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadCaseAttachmentDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.addAttachment(id, file, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Get(':id/attachments/:attachmentId')
  @RequirePermissions(Permission.CASES_VIEW)
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.adminCasesService.downloadAttachment(
      id,
      attachmentId,
      actor,
      { ipAddress, userAgent },
    );
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    return new StreamableFile(file.buffer);
  }

  @Post(':id/compensation')
  @RequirePermissions(Permission.CASES_COMPENSATE)
  proposeCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeCompensationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.proposeCompensation(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/compensation/approve')
  @RequirePermissions(Permission.CASES_COMPENSATE)
  approveCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideCompensationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.decideCompensation(id, 'approve', dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/compensation/reject')
  @RequirePermissions(Permission.CASES_COMPENSATE)
  rejectCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideCompensationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminCasesService.decideCompensation(id, 'reject', dto, actor, {
      ipAddress,
      userAgent,
    });
  }
}

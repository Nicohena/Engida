'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MessageSquare,
  Paperclip,
  Pencil,
  ShieldAlert,
  Sparkles,
  UserRound,
} from 'lucide-react';
import AdminStatusBadge from '../../../components/admin/AdminStatusBadge';
import {
  CASE_CATEGORY_LABELS,
  CASE_CHANNEL_LABELS,
  CASE_DELIVERY_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_SEVERITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  COMPENSATION_STATUS_LABELS,
  formatMoney,
  relativeTime,
  shortDate,
  shortDateTime,
  type AdminCaseDetail,
  type AdminCaseSummary,
  type CannedResponse,
  type CaseMessage,
  type CaseStatus,
  type CaseAttachment,
} from '../../../types/admin-phase2';

export const CASE_STATUS_TONES: Record<
  CaseStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'danger'
> = {
  OPEN: 'warning',
  IN_PROGRESS: 'accent',
  WAITING_ON_REQUESTER: 'neutral',
  WAITING_ON_INTERNAL: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const CASE_PRIORITY_TONES: Record<
  AdminCaseSummary['priority'],
  'neutral' | 'accent' | 'warning' | 'danger'
> = {
  LOW: 'neutral',
  NORMAL: 'neutral',
  HIGH: 'warning',
  URGENT: 'danger',
};

export const CASE_SEVERITY_TONES: Record<
  AdminCaseSummary['severity'],
  'neutral' | 'warning' | 'danger'
> = {
  LOW: 'neutral',
  MEDIUM: 'neutral',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export type CaseDetailTab = 'conversation' | 'notes' | 'files' | 'activity';

export function initials(name: string | null | undefined): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function caseEventLabel(type: string): string {
  return (
    {
      CASE_CREATED: 'Case created',
      STATUS_CHANGED: 'Status changed',
      ASSIGNED: 'Assignment updated',
      CATEGORY_CHANGED: 'Category updated',
      PRIORITY_CHANGED: 'Priority updated',
      SEVERITY_CHANGED: 'Severity updated',
      MESSAGE_SENT: 'Reply sent',
      REPLY_RECEIVED: 'Reply received',
      REOPENED: 'Case reopened',
      NOTE_ADDED: 'Internal note added',
      ATTACHMENT_ADDED: 'Attachment added',
      SLA_ESCALATED: 'SLA breached — escalated',
      COMPENSATION_PROPOSED: 'Compensation proposed',
      COMPENSATION_APPROVED: 'Compensation approved',
      COMPENSATION_REJECTED: 'Compensation declined',
    }[type] || type.replaceAll('_', ' ').toLowerCase()
  );
}

interface CaseQueueRowProps {
  supportCase: AdminCaseSummary;
  selected: boolean;
  now: Date;
  onSelect: (supportCase: AdminCaseSummary) => void;
}

export function CaseQueueRow({
  supportCase,
  selected,
  now,
  onSelect,
}: CaseQueueRowProps) {
  const overdue = supportCase.overdue && new Date(supportCase.resolutionDueAt) < now;
  const waiting =
    supportCase.status === 'WAITING_ON_REQUESTER' ||
    supportCase.status === 'WAITING_ON_INTERNAL';

  return (
    <button
      type="button"
      className="admin-case-row"
      aria-current={selected}
      onClick={() => onSelect(supportCase)}
    >
      <div className="admin-case-row-top">
        <span className="admin-case-number">{supportCase.number}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {supportCase.escalatedAt ? (
            <ShieldAlert className="h-3.5 w-3.5 text-[#9a3f33]" aria-label="Escalated" />
          ) : null}
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                supportCase.priority === 'URGENT'
                  ? '#9a3f33'
                  : supportCase.priority === 'HIGH'
                    ? '#95631f'
                    : '#a99c90',
            }}
            title={`${CASE_PRIORITY_LABELS[supportCase.priority]} priority`}
          />
        </span>
      </div>
      <p className="admin-case-subject">{supportCase.subject}</p>
      <div className="admin-case-row-meta">
        <span className="truncate">{supportCase.requesterName}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{CASE_TYPE_LABELS[supportCase.type]}</span>
      </div>
      <div className="admin-case-row-meta">
        <AdminStatusBadge
          label={CASE_STATUS_LABELS[supportCase.status]}
          tone={CASE_STATUS_TONES[supportCase.status]}
          dot
        />
        {overdue ? (
          <span className="inline-flex items-center gap-1 font-bold text-[#9a3f33]">
            <AlertTriangle className="h-3 w-3" />
            SLA due
          </span>
        ) : waiting ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            Waiting
          </span>
        ) : (
          <span>{relativeTime(supportCase.updatedAt)}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          {supportCase.assignee ? (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3a302a] text-[8px] font-bold text-[#faf5ee]"
              title={supportCase.assignee.name}
            >
              {initials(supportCase.assignee.name)}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#95631f]">
              Unassigned
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

interface CaseWorkspaceProps {
  detail: AdminCaseDetail;
  activeTab: CaseDetailTab;
  onTabChange: (tab: CaseDetailTab) => void;
  canManage: boolean;
  replyBody: string;
  onReplyBodyChange: (value: string) => void;
  onSendReply: () => void;
  sendingReply: boolean;
  cannedResponses: CannedResponse[];
  cannedId: string;
  onCannedChange: (id: string) => void;
  onManageCanned: () => void;
  noteBody: string;
  onNoteBodyChange: (value: string) => void;
  onAddNote: () => void;
  addingNote: boolean;
  attachmentFile: File | null;
  onAttachmentFileChange: (file: File | null) => void;
  attachmentCaption: string;
  onAttachmentCaptionChange: (value: string) => void;
  onUploadAttachment: () => void;
  uploadingAttachment: boolean;
  onDownloadAttachment: (attachment: CaseAttachment) => void;
  onLogInbound: () => void;
  onAssign: () => void;
  onStatus: () => void;
  onEdit: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export function CaseWorkspace({
  detail,
  activeTab,
  onTabChange,
  canManage,
  replyBody,
  onReplyBodyChange,
  onSendReply,
  sendingReply,
  cannedResponses,
  cannedId,
  onCannedChange,
  onManageCanned,
  noteBody,
  onNoteBodyChange,
  onAddNote,
  addingNote,
  attachmentFile,
  onAttachmentFileChange,
  attachmentCaption,
  onAttachmentCaptionChange,
  onUploadAttachment,
  uploadingAttachment,
  onDownloadAttachment,
  onLogInbound,
  onAssign,
  onStatus,
  onEdit,
  onBack,
  backLabel = 'Case queue',
}: CaseWorkspaceProps) {
  const terminal = detail.status === 'RESOLVED' || detail.status === 'CLOSED';

  return (
    <div className="admin-case-workspace">
      <div className="admin-case-head">
        {onBack ? (
          <button
            type="button"
            className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b3541e] lg:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </button>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="admin-case-number">{detail.number}</span>
              <AdminStatusBadge
                label={CASE_STATUS_LABELS[detail.status]}
                tone={CASE_STATUS_TONES[detail.status]}
                dot
              />
              <AdminStatusBadge
                label={`${CASE_PRIORITY_LABELS[detail.priority]} priority`}
                tone={CASE_PRIORITY_TONES[detail.priority]}
              />
              {detail.escalatedAt ? (
                <AdminStatusBadge label="Escalated" tone="danger" dot />
              ) : null}
            </div>
            <h2 className="mt-1.5 max-w-[42rem] font-headline text-[1.5rem] font-semibold leading-tight tracking-[-0.01em] text-[#3a302a]">
              {detail.subject}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#78706a]">
              <span>{detail.requesterName}</span>
              {detail.requesterEmail ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{detail.requesterEmail}</span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>{CASE_TYPE_LABELS[detail.type]}</span>
              {detail.booking ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-semibold text-[#605850]">
                    {detail.booking.reference}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="admin-btn admin-btn-secondary h-8 min-h-8 px-2.5 text-[11px]" onClick={onAssign}>
                <UserRound className="h-3 w-3" />
                {detail.assignee ? 'Reassign' : 'Assign'}
              </button>
              <button type="button" className="admin-btn admin-btn-secondary h-8 min-h-8 px-2.5 text-[11px]" onClick={onEdit}>
                <Pencil className="h-3 w-3" />
                Adjust
              </button>
              <button type="button" className="admin-btn admin-btn-primary h-8 min-h-8 px-2.5 text-[11px]" onClick={onStatus}>
                <Sparkles className="h-3 w-3" />
                Update status
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#78706a]">Read only</span>
          )}
        </div>
      </div>

      <div className="admin-tabs px-3" role="tablist" aria-label="Case workspace sections">
        {(
          [
            ['conversation', 'Conversation', detail.messages.length],
            ['notes', 'Internal notes', detail.notes.length],
            ['files', 'Files', detail.attachments.length],
            ['activity', 'Activity', detail.events.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            className="admin-tab"
            onClick={() => onTabChange(value)}
          >
            {label}
            <span className="admin-tab-count ml-1.5 text-[9px] text-[#a99c90]">{count}</span>
          </button>
        ))}
      </div>

      <div className="admin-case-scroll">
        {activeTab === 'conversation' ? (
          <div>
            <div className="admin-message-list">
              <div className="admin-message" data-direction="INBOUND">
                <div className="admin-message-meta">
                  <span className="font-bold text-[#605850]">{detail.requesterName}</span>
                  <span aria-hidden>·</span>
                  <span>Original request</span>
                  <span aria-hidden>·</span>
                  <span>{shortDateTime(detail.createdAt)}</span>
                </div>
                <div className="admin-message-body">{detail.description}</div>
              </div>

              {detail.messages.map((message) => (
                <CaseMessageBubble key={message.id} message={message} />
              ))}
            </div>

            {terminal ? (
              <div className="mt-5 flex items-start gap-2 border border-[#d6dfcd] bg-[#edf1e8] px-3 py-2.5 text-xs leading-5 text-[#536b4a]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  This case is {CASE_STATUS_LABELS[detail.status].toLowerCase()}. Reopen it
                  from the status controls before sending another reply.
                </p>
              </div>
            ) : canManage ? (
              <div className="admin-composer mt-5 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 lg:-mx-6">
                <div className="admin-composer-toolbar">
                  <select
                    className="admin-select h-8 min-h-8 w-auto max-w-[16rem] py-1 text-[11px]"
                    value={cannedId}
                    onChange={(event) => onCannedChange(event.target.value)}
                    aria-label="Insert a canned reply"
                  >
                    <option value="">Insert a canned reply…</option>
                    {cannedResponses
                      .filter((response) => response.isActive)
                      .map((response) => (
                        <option key={response.id} value={response.id}>
                          {response.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b3541e]"
                    onClick={onManageCanned}
                  >
                    Manage
                  </button>
                  <span className="ml-auto text-[10px] text-[#78706a]">
                    {detail.notifyInApp
                      ? 'Delivers to the requester’s in-app inbox'
                      : 'No linked account · delivery will be logged, not emailed'}
                  </span>
                </div>
                <textarea
                  className="admin-textarea bg-white"
                  rows={3}
                  value={replyBody}
                  onChange={(event) => onReplyBodyChange(event.target.value)}
                  placeholder="Write a clear reply to the requester…"
                  aria-label="Reply to requester"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#605850] hover:text-[#b3541e]"
                    onClick={onLogInbound}
                  >
                    Log an inbound reply
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary h-8 min-h-8 px-3 text-[11px]"
                    onClick={onSendReply}
                    disabled={sendingReply || replyBody.trim().length < 2}
                  >
                    {sendingReply ? 'Sending…' : 'Send reply'}
                    <MessageSquare className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div>
            {detail.notes.length ? (
              <ul className="space-y-4">
                {detail.notes.map((note) => (
                  <li key={note.id} className="border-b border-[#e9e1d8] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-[10px] text-[#78706a]">
                      <span className="font-bold text-[#605850]">{note.author?.name || 'Admin'}</span>
                      <span aria-hidden>·</span>
                      <span>{shortDateTime(note.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[#3a302a]">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-empty min-h-[10rem]">
                <p className="admin-empty-title text-[1.15rem]">No internal notes</p>
                <p className="admin-empty-copy">
                  Use notes for context that should never reach the requester.
                </p>
              </div>
            )}

            {canManage ? (
              <div className="mt-5 border-t border-[#d8d0c8] pt-4">
                <label className="admin-field-label" htmlFor="case-note">
                  Add an internal note
                </label>
                <textarea
                  id="case-note"
                  className="admin-textarea"
                  rows={3}
                  value={noteBody}
                  onChange={(event) => onNoteBodyChange(event.target.value)}
                  placeholder="What should the next administrator know?"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary h-8 min-h-8 px-3 text-[11px]"
                    onClick={onAddNote}
                    disabled={addingNote || noteBody.trim().length < 2}
                  >
                    {addingNote ? 'Saving…' : 'Add note'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'files' ? (
          <div>
            {detail.attachments.length ? (
              <ul className="divide-y divide-[#e9e1d8] border-y border-[#e9e1d8]">
                {detail.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-start gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2ece4] text-[#605850]">
                      {attachment.mimeType.startsWith('image/') ? (
                        <Paperclip className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#3a302a]">{attachment.fileName}</p>
                      <p className="mt-0.5 text-[10px] text-[#78706a]">
                        {formatFileSize(attachment.sizeBytes)} · {attachment.uploadedBy?.name || 'Admin'} · {shortDate(attachment.createdAt)}
                      </p>
                      {attachment.caption ? (
                        <p className="mt-1 text-[11px] leading-5 text-[#605850]">{attachment.caption}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary h-7 min-h-7 px-2 text-[10px]"
                      onClick={() => onDownloadAttachment(attachment)}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-empty min-h-[10rem]">
                <p className="admin-empty-title text-[1.15rem]">No attachments</p>
                <p className="admin-empty-copy">
                  Add a PDF or image for evidence. Files are stored privately and
                  download access is audited.
                </p>
              </div>
            )}

            {canManage ? (
              <div className="mt-5 border-t border-[#d8d0c8] pt-4">
                <p className="admin-field-label">Add a private attachment</p>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
                  <div>
                    <label className="sr-only" htmlFor="case-file">File</label>
                    <input
                      id="case-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      className="admin-input py-1.5 text-xs"
                      onChange={(event) => onAttachmentFileChange(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <label className="sr-only" htmlFor="case-file-caption">Caption</label>
                    <input
                      id="case-file-caption"
                      className="admin-input"
                      value={attachmentCaption}
                      onChange={(event) => onAttachmentCaptionChange(event.target.value)}
                      placeholder="Optional caption"
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary h-10 min-h-10 px-3 text-[11px]"
                    onClick={onUploadAttachment}
                    disabled={uploadingAttachment || !attachmentFile}
                  >
                    {uploadingAttachment ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                <p className="admin-reply-hint mt-2">PDF, JPG, PNG or WEBP · maximum 10 MB.</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'activity' ? (
          <div>
            {detail.events.length ? (
              <ol className="admin-timeline">
                {detail.events.map((event) => (
                  <li key={event.id} className="admin-timeline-item">
                    <span className="admin-timeline-dot" />
                    <div className="admin-timeline-copy">
                      <p className="admin-timeline-title">{caseEventLabel(event.type)}</p>
                      <p className="admin-timeline-meta">
                        {shortDateTime(event.createdAt)} · {event.actor?.name || 'System'}
                        {event.toValue && event.type === 'STATUS_CHANGED'
                          ? ` · ${CASE_STATUS_LABELS[event.toValue as CaseStatus] || event.toValue}`
                          : ''}
                      </p>
                      {event.reason ? (
                        <p className="mt-1 text-[11px] leading-5 text-[#605850]">{event.reason}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#605850]">No activity has been recorded yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CaseMessageBubble({ message }: { message: CaseMessage }) {
  return (
    <div className="admin-message" data-direction={message.direction} data-channel={message.channel}>
      <div className="admin-message-meta">
        <span className="font-bold text-[#605850]">{message.authorName}</span>
        <span aria-hidden>·</span>
        <span>{shortDateTime(message.createdAt)}</span>
        <span aria-hidden>·</span>
        <span>{CASE_CHANNEL_LABELS[message.channel]}</span>
        {message.direction === 'OUTBOUND' ? (
          <>
            <span aria-hidden>·</span>
            <span
              className={
                message.deliveryStatus === 'FAILED'
                  ? 'font-bold text-[#9a3f33]'
                  : message.deliveryStatus === 'LOGGED'
                    ? 'font-bold text-[#95631f]'
                    : ''
              }
            >
              {CASE_DELIVERY_LABELS[message.deliveryStatus]}
            </span>
          </>
        ) : null}
      </div>
      <div className="admin-message-body">{message.body}</div>
    </div>
  );
}

interface CaseContextProps {
  detail: AdminCaseDetail;
  now: Date;
  canManage: boolean;
  canCompensate: boolean;
  currentUserId?: string;
  onAssign: () => void;
  onStatus: () => void;
  onEdit: () => void;
  onProposeCompensation: () => void;
  onDecideCompensation: (action: 'approve' | 'reject') => void;
}

export function CaseContext({
  detail,
  now,
  canManage,
  canCompensate,
  currentUserId,
  onAssign,
  onStatus,
  onEdit,
  onProposeCompensation,
  onDecideCompensation,
}: CaseContextProps) {
  const resolutionDue = new Date(detail.resolutionDueAt);
  const createdAt = new Date(detail.createdAt);
  const total = Math.max(1, resolutionDue.getTime() - createdAt.getTime());
  const elapsed = now.getTime() - createdAt.getTime();
  const percent = Math.max(2, Math.min(100, (elapsed / total) * 100));
  const terminal = detail.status === 'RESOLVED' || detail.status === 'CLOSED';
  const breached = Boolean(detail.resolutionBreachedAt);
  const tone = terminal ? 'success' : breached || percent >= 100 ? 'danger' : percent >= 72 ? 'warning' : 'success';
  const firstResponseDue = new Date(detail.firstResponseDueAt);
  const firstResponseLate =
    !detail.firstRespondedAt &&
    !terminal &&
    firstResponseDue.getTime() < now.getTime();

  const canDecideCompensation =
    detail.compensation.status === 'PROPOSED' &&
    currentUserId !== detail.compensation.proposedBy?.id;

  return (
    <aside className="admin-context" aria-label="Case context and controls">
      <div className="admin-context-section">
        <div className="flex items-center justify-between gap-2">
          <p className="admin-context-title">Service level</p>
          <span className="admin-sla-dot" data-tone={tone} />
        </div>
        <p className="mt-2 text-xs font-bold text-[#3a302a]">
          {terminal
            ? detail.resolutionBreachedAt
              ? 'Resolved after the deadline'
              : 'Closed within the service window'
            : `Resolution due ${relativeTime(detail.resolutionDueAt)}`}
        </p>
        <p className="mt-0.5 text-[10px] text-[#78706a]">
          {shortDateTime(detail.resolutionDueAt)} · {CASE_PRIORITY_LABELS[detail.priority]} priority
        </p>
        <div className="admin-sla-track">
          <div className="admin-sla-fill" data-tone={tone} style={{ width: `${terminal ? 100 : percent}%` }} />
        </div>
        <div className="mt-3 flex items-start gap-2">
          <span
            className="admin-sla-dot mt-1"
            data-tone={detail.firstRespondedAt ? 'success' : firstResponseLate ? 'danger' : 'warning'}
          />
          <p className="text-[10px] leading-4 text-[#605850]">
            {detail.firstRespondedAt
              ? `First reply ${shortDateTime(detail.firstRespondedAt)}`
              : `First reply due ${shortDateTime(detail.firstResponseDueAt)}`}
          </p>
        </div>
        {detail.escalatedAt ? (
          <div className="mt-3 flex items-start gap-2 bg-[#f8e9e5] px-2.5 py-2 text-[10px] leading-4 text-[#7d3328]">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{detail.escalationReason || 'This case has been escalated.'}</span>
          </div>
        ) : null}
      </div>

      <div className="admin-context-section">
        <p className="admin-context-title">Requester</p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eae2da] text-[10px] font-bold text-[#3a302a]">
            {initials(detail.requesterName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#3a302a]">{detail.requesterName}</p>
            <p className="truncate text-[10px] text-[#78706a]">{detail.requesterEmail || 'No email on file'}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[#78706a]">
          {detail.notifyInApp ? 'Has an in-app notification inbox' : 'No linked account for in-app delivery'}
        </p>
      </div>

      {detail.booking ? (
        <div className="admin-context-section">
          <div className="flex items-center justify-between gap-2">
            <p className="admin-context-title">Linked booking</p>
            <a href={`/admin/bookings?booking=${detail.booking.id}`} className="text-[10px] font-bold text-[#b3541e]">
              Open ledger
            </a>
          </div>
          <p className="mt-2 font-headline text-lg font-semibold leading-none text-[#3a302a]">
            {detail.booking.reference}
          </p>
          <p className="mt-1.5 text-[10px] text-[#78706a]">
            {shortDate(detail.booking.checkInDate)} → {shortDate(detail.booking.checkOutDate)}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[#605850]">
            {detail.booking.status.replaceAll('_', ' ').toLowerCase()}
          </p>
          {detail.property ? (
            <p className="mt-2 border-t border-[#e9e1d8] pt-2 text-[10px] leading-4 text-[#605850]">
              {detail.property.title} · {detail.property.city}
            </p>
          ) : null}
        </div>
      ) : detail.property ? (
        <div className="admin-context-section">
          <p className="admin-context-title">Property</p>
          <p className="mt-2 text-xs font-bold text-[#3a302a]">{detail.property.title}</p>
          <p className="mt-0.5 text-[10px] text-[#78706a]">{detail.property.city}</p>
        </div>
      ) : null}

      <div className="admin-context-section">
        <div className="flex items-center justify-between gap-2">
          <p className="admin-context-title">Case facts</p>
          {canManage ? (
            <button type="button" className="text-[10px] font-bold text-[#b3541e]" onClick={onEdit}>
              Adjust
            </button>
          ) : null}
        </div>
        <dl className="mt-2 space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#78706a]">Type</dt>
            <dd className="font-semibold text-[#3a302a]">{CASE_TYPE_LABELS[detail.type]}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#78706a]">Category</dt>
            <dd className="font-semibold text-[#3a302a]">{CASE_CATEGORY_LABELS[detail.category]}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#78706a]">Severity</dt>
            <dd>
              <AdminStatusBadge
                label={CASE_SEVERITY_LABELS[detail.severity]}
                tone={CASE_SEVERITY_TONES[detail.severity]}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#78706a]">Created</dt>
            <dd className="font-semibold text-[#3a302a]">{shortDate(detail.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="admin-context-section">
        <div className="flex items-center justify-between gap-2">
          <p className="admin-context-title">Assignment</p>
          {canManage ? (
            <button type="button" className="text-[10px] font-bold text-[#b3541e]" onClick={onAssign}>
              {detail.assignee ? 'Change' : 'Assign'}
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs font-bold text-[#3a302a]">
          {detail.assignee?.name || 'Unassigned'}
        </p>
        <p className="mt-0.5 text-[10px] text-[#78706a]">
          {detail.assignee?.adminRole?.replaceAll('_', ' ').toLowerCase() || 'No owner yet'}
        </p>
      </div>

      <div className="admin-context-section">
        <div className="flex items-center justify-between gap-2">
          <p className="admin-context-title">Compensation intent</p>
          <AdminStatusBadge
            label={COMPENSATION_STATUS_LABELS[detail.compensation.status]}
            tone={
              detail.compensation.status === 'APPROVED'
                ? 'success'
                : detail.compensation.status === 'REJECTED'
                  ? 'danger'
                  : detail.compensation.status === 'PROPOSED'
                    ? 'warning'
                    : 'neutral'
            }
          />
        </div>
        {detail.compensation.status !== 'NONE' ? (
          <>
            <p className="mt-2 font-headline text-xl font-semibold text-[#3a302a]">
              {formatMoney(detail.compensation.amount, detail.compensation.currency)}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[#605850]">{detail.compensation.note}</p>
            <p className="mt-1 text-[10px] text-[#78706a]">
              Proposed by {detail.compensation.proposedBy?.name || 'admin'}
              {detail.compensation.decidedBy
                ? ` · decided by ${detail.compensation.decidedBy.name}`
                : ''}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[10px] leading-4 text-[#78706a]">
            Record an operational gesture for review. Approval is a decision only.
          </p>
        )}

        {canCompensate && detail.compensation.status === 'PROPOSED' ? (
          canDecideCompensation ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                className="admin-btn admin-btn-primary h-7 min-h-7 px-2 text-[10px]"
                onClick={() => onDecideCompensation('approve')}
              >
                Approve
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary h-7 min-h-7 px-2 text-[10px]"
                onClick={() => onDecideCompensation('reject')}
              >
                Decline
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[10px] leading-4 text-[#95631f]">
              A second administrator must decide this proposal.
            </p>
          )
        ) : null}

        {canCompensate &&
        (detail.compensation.status === 'NONE' || detail.compensation.status === 'REJECTED') &&
        detail.status !== 'CLOSED' ? (
          <button
            type="button"
            className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b3541e]"
            onClick={onProposeCompensation}
          >
            Propose compensation
          </button>
        ) : null}

        <p className="mt-2 border-t border-[#e9e1d8] pt-2 text-[9px] uppercase tracking-[0.08em] text-[#a99c90]">
          Decision only · no money moves
        </p>
      </div>

      <div className="admin-context-section">
        <p className="admin-context-title">Desk actions</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {canManage ? (
            <>
              <button type="button" className="admin-btn admin-btn-secondary h-8 min-h-8 justify-start px-2.5 text-[11px]" onClick={onStatus}>
                Update case status
              </button>
              <button type="button" className="admin-btn admin-btn-secondary h-8 min-h-8 justify-start px-2.5 text-[11px]" onClick={onAssign}>
                Change assignee
              </button>
            </>
          ) : null}
          <p className="mt-1 text-[9px] leading-4 text-[#a99c90]">
            Every status, assignment, note, message and file action is audited.
          </p>
        </div>
      </div>
    </aside>
  );
}

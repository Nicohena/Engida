'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminDialog from '../../../components/admin/AdminDialog';
import AdminEmptyState from '../../../components/admin/AdminEmptyState';
import AdminStatusBadge from '../../../components/admin/AdminStatusBadge';
import { apiFetch, downloadAuthedFile } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { ADMIN_PERMISSIONS, can } from '../../../types/admin';
import {
  CASE_CATEGORY_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_SEVERITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  formatMoney,
  shortDate,
  type AdminBookingSummary,
  type AdminBookingsResponse,
  type AdminCaseDetail,
  type AdminCaseSummary,
  type AdminCasesResponse,
  type CannedResponse,
  type CaseAssignee,
  type CaseAttachment,
  type CaseCategory,
  type CaseMessageChannel,
  type CasePriority,
  type CaseSeverity,
  type CaseStatus,
  type CaseType,
} from '../../../types/admin-phase2';
import {
  CASE_PRIORITY_TONES,
  CASE_SEVERITY_TONES,
  CASE_STATUS_TONES,
  CaseContext,
  CaseQueueRow,
  CaseWorkspace,
  type CaseDetailTab,
} from './case-parts';

const PAGE_SIZE = 30;

const CASE_TYPES: CaseType[] = [
  'COMPLAINT',
  'DISPUTE',
  'SAFETY',
  'SUPPORT',
  'CANCELLATION',
];
const CASE_CATEGORIES: CaseCategory[] = [
  'BOOKING',
  'LISTING',
  'ACCOUNT',
  'REVIEW',
  'PAYMENT',
  'OTHER',
];
const CASE_PRIORITIES: CasePriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const CASE_SEVERITIES: CaseSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CASE_STATUSES: CaseStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_REQUESTER',
  'WAITING_ON_INTERNAL',
  'RESOLVED',
  'CLOSED',
];
type StatusFilter = 'all' | CaseStatus;
type ToastState = { message: string; tone: 'success' | 'danger' } | null;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminCasesPage() {
  const { user } = useAuth();
  const canManage = can(user?.permissions, ADMIN_PERMISSIONS.CASES_MANAGE);
  const canCompensate = can(user?.permissions, ADMIN_PERMISSIONS.CASES_COMPENSATE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CaseType>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<AdminCasesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CaseDetailTab>('conversation');
  const [toast, setToast] = useState<ToastState>(null);
  const [now, setNow] = useState(() => new Date());
  const queueRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);

  const [assignees, setAssignees] = useState<CaseAssignee[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [cannedId, setCannedId] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newCaseType, setNewCaseType] = useState<CaseType>('COMPLAINT');
  const [newCaseCategory, setNewCaseCategory] = useState<CaseCategory>('BOOKING');
  const [newCasePriority, setNewCasePriority] = useState<CasePriority>('NORMAL');
  const [newCaseSeverity, setNewCaseSeverity] = useState<CaseSeverity>('MEDIUM');
  const [newCaseSubject, setNewCaseSubject] = useState('');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [newCaseRequesterName, setNewCaseRequesterName] = useState('');
  const [newCaseRequesterEmail, setNewCaseRequesterEmail] = useState('');
  const [createKey, setCreateKey] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingResults, setBookingResults] = useState<AdminBookingSummary[]>([]);
  const [bookingSearching, setBookingSearching] = useState(false);
  const [linkedBooking, setLinkedBooking] = useState<AdminBookingSummary | null>(null);
  const [creatingCase, setCreatingCase] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignNote, setAssignNote] = useState('');

  const [statusOpen, setStatusOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CaseStatus>('IN_PROGRESS');
  const [statusReason, setStatusReason] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CaseCategory>('OTHER');
  const [editPriority, setEditPriority] = useState<CasePriority>('NORMAL');
  const [editSeverity, setEditSeverity] = useState<CaseSeverity>('MEDIUM');

  const [inboundOpen, setInboundOpen] = useState(false);
  const [inboundBody, setInboundBody] = useState('');
  const [inboundAuthorName, setInboundAuthorName] = useState('');
  const [inboundAuthorEmail, setInboundAuthorEmail] = useState('');
  const [inboundChannel, setInboundChannel] = useState<CaseMessageChannel>('EMAIL');

  const [compensationOpen, setCompensationOpen] = useState(false);
  const [compensationAmount, setCompensationAmount] = useState('');
  const [compensationNote, setCompensationNote] = useState('');
  const [compensationCurrency, setCompensationCurrency] = useState('ETB');
  const [compensationDecision, setCompensationDecision] = useState<'approve' | 'reject' | null>(null);
  const [compensationDecisionNote, setCompensationDecisionNote] = useState('');

  const [cannedOpen, setCannedOpen] = useState(false);
  const [cannedEditingId, setCannedEditingId] = useState<string | null>(null);
  const [cannedTitle, setCannedTitle] = useState('');
  const [cannedBody, setCannedBody] = useState('');
  const [cannedCategory, setCannedCategory] = useState('');
  const [savingCanned, setSavingCanned] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void apiFetch<CaseAssignee[]>('/admin/cases/assignees')
      .then(setAssignees)
      .catch(() => undefined);
    void apiFetch<CannedResponse[]>('/admin/cases/canned-responses')
      .then(setCannedResponses)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!createOpen || bookingSearch.trim().length < 2 || linkedBooking) {
      const timer = window.setTimeout(() => setBookingResults([]), 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setBookingSearching(true);
      void apiFetch<AdminBookingsResponse>(
        `/admin/bookings?q=${encodeURIComponent(bookingSearch.trim())}&limit=5`,
      )
        .then((response) => {
          if (!cancelled) setBookingResults(response.data);
        })
        .catch(() => {
          if (!cancelled) setBookingResults([]);
        })
        .finally(() => {
          if (!cancelled) setBookingSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bookingSearch, createOpen, linkedBooking]);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (overdueOnly) params.set('overdue', 'true');
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    return params.toString();
  }, [debouncedSearch, statusFilter, typeFilter, overdueOnly, page]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await apiFetch<AdminCasesResponse>(`/admin/cases?${listQuery}`);
      setResult(data);
    } catch (error) {
      setListError(errorMessage(error, 'The support queue could not be loaded'));
    } finally {
      setLoading(false);
    }
  }, [listQuery]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) void loadList();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadList]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedId(null);
      setDetail(null);
      setActiveTab('conversation');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, statusFilter, typeFilter, overdueOnly, page]);

  useEffect(() => {
    const linkedCase = new URLSearchParams(window.location.search).get('case');
    if (!linkedCase) return;
    const timer = window.setTimeout(() => {
      setSelectedId(linkedCase);
      if (window.matchMedia('(max-width: 1023px)').matches) {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await apiFetch<AdminCaseDetail>(`/admin/cases/${id}`);
      setDetail(data);
      setActiveTab('conversation');
    } catch (error) {
      setDetail(null);
      setDetailError(errorMessage(error, 'The case could not be loaded'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      const timer = window.setTimeout(() => setDetail(null), 0);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => void loadDetail(selectedId), 0);
    return () => window.clearTimeout(timer);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (loading || !result?.data.length) return;
    if (selectedId && result.data.some((supportCase) => supportCase.id === selectedId)) {
      return;
    }
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches;
    const timer = window.setTimeout(() => {
      if (isDesktop) {
        setSelectedId(result.data[0].id);
      } else if (selectedId) {
        setSelectedId(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [result, selectedId, loading]);

  const applyDetail = useCallback(
    (updated: AdminCaseDetail) => {
      setDetail(updated);
      setSelectedId(updated.id);
      void loadList();
      void apiFetch<CannedResponse[]>('/admin/cases/canned-responses')
        .then(setCannedResponses)
        .catch(() => undefined);
    },
    [loadList],
  );

  const refresh = async () => {
    await loadList();
    if (selectedId) await loadDetail(selectedId);
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams(listQuery);
      params.delete('page');
      params.delete('limit');
      await downloadAuthedFile(
        `/admin/cases/export.csv?${params.toString()}`,
        'engida-cases.csv',
      );
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The export could not be prepared'),
        tone: 'danger',
      });
    }
  };

  const openCreate = () => {
    setNewCaseType('COMPLAINT');
    setNewCaseCategory('BOOKING');
    setNewCasePriority('NORMAL');
    setNewCaseSeverity('MEDIUM');
    setNewCaseSubject('');
    setNewCaseDescription('');
    setNewCaseRequesterName('');
    setNewCaseRequesterEmail('');
    setBookingSearch('');
    setBookingResults([]);
    setLinkedBooking(null);
    setCreateKey(crypto.randomUUID());
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreatingCase(true);
    try {
      const created = await apiFetch<AdminCaseDetail>('/admin/cases', {
        method: 'POST',
        body: JSON.stringify({
          type: newCaseType,
          category: newCaseCategory,
          priority: newCasePriority,
          severity: newCaseSeverity,
          subject: newCaseSubject.trim(),
          description: newCaseDescription.trim(),
          requesterName: newCaseRequesterName.trim() || undefined,
          requesterEmail: newCaseRequesterEmail.trim() || undefined,
          bookingId: linkedBooking?.id,
          idempotencyKey: createKey,
        }),
      });
      setCreateOpen(false);
      setActiveTab('conversation');
      applyDetail(created);
      setToast({ message: `${created.number} is open in the desk.`, tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The support case could not be created'),
        tone: 'danger',
      });
    } finally {
      setCreatingCase(false);
    }
  };

  const selectCase = (supportCase: AdminCaseSummary) => {
    setSelectedId(supportCase.id);
    setActiveTab('conversation');
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      window.setTimeout(
        () => workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80,
      );
    }
  };

  const backToQueue = () => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches;
    setSelectedId(null);
    setDetail(null);
    if (isMobile) {
      window.setTimeout(
        () => queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80,
      );
    }
  };

  const openAssign = () => {
    if (!detail) return;
    setAssigneeId(detail.assignee?.id || assignees[0]?.id || '');
    setAssignNote('');
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!detail || !assigneeId) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(`/admin/cases/${detail.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assigneeId, note: assignNote.trim() || undefined }),
      });
      setAssignOpen(false);
      applyDetail(updated);
      setToast({ message: 'Case assignment updated.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The case could not be assigned'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openStatus = () => {
    if (!detail) return;
    setTargetStatus(detail.allowedTransitions[0] || detail.status);
    setStatusReason('');
    setStatusOpen(true);
  };

  const submitStatus = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(`/admin/cases/${detail.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: targetStatus, reason: statusReason.trim() }),
      });
      setStatusOpen(false);
      applyDetail(updated);
      setToast({
        message: `Case moved to ${CASE_STATUS_LABELS[targetStatus].toLowerCase()}.`,
        tone: 'success',
      });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The status could not be changed'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = () => {
    if (!detail) return;
    setEditCategory(detail.category);
    setEditPriority(detail.priority);
    setEditSeverity(detail.severity);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(`/admin/cases/${detail.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category: editCategory,
          priority: editPriority,
          severity: editSeverity,
        }),
      });
      setEditOpen(false);
      applyDetail(updated);
      setToast({ message: 'Case details updated.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The case details could not be updated'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const changeCanned = (id: string) => {
    setCannedId(id);
    const selected = cannedResponses.find((response) => response.id === id);
    if (selected) setReplyBody(selected.body);
  };

  const sendReply = async () => {
    if (!detail) return;
    setSendingReply(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(`/admin/cases/${detail.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          body: replyBody.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setReplyBody('');
      setCannedId('');
      applyDetail(updated);
      setToast({ message: 'Reply recorded.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The reply could not be sent'),
        tone: 'danger',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const addNote = async () => {
    if (!detail) return;
    setAddingNote(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(`/admin/cases/${detail.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setNoteBody('');
      applyDetail(updated);
      setToast({ message: 'Internal note saved.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The note could not be saved'),
        tone: 'danger',
      });
    } finally {
      setAddingNote(false);
    }
  };

  const uploadAttachment = async () => {
    if (!detail || !attachmentFile) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', attachmentFile);
      if (attachmentCaption.trim()) formData.append('caption', attachmentCaption.trim());
      const updated = await apiFetch<AdminCaseDetail>(
        `/admin/cases/${detail.id}/attachments`,
        { method: 'POST', body: formData },
      );
      setAttachmentFile(null);
      setAttachmentCaption('');
      applyDetail(updated);
      setToast({ message: 'Attachment added privately.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The attachment could not be uploaded'),
        tone: 'danger',
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const downloadAttachment = async (attachment: CaseAttachment) => {
    if (!detail) return;
    try {
      await downloadAuthedFile(
        `/admin/cases/${detail.id}/attachments/${attachment.id}`,
        attachment.fileName,
      );
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The file could not be downloaded'),
        tone: 'danger',
      });
    }
  };

  const openInbound = () => {
    if (!detail) return;
    setInboundBody('');
    setInboundAuthorName(detail.requesterName);
    setInboundAuthorEmail(detail.requesterEmail || '');
    setInboundChannel('EMAIL');
    setInboundOpen(true);
  };

  const submitInbound = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(
        `/admin/cases/${detail.id}/inbound-replies`,
        {
          method: 'POST',
          body: JSON.stringify({
            body: inboundBody.trim(),
            channel: inboundChannel,
            authorName: inboundAuthorName.trim() || undefined,
            authorEmail: inboundAuthorEmail.trim() || undefined,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      setInboundOpen(false);
      applyDetail(updated);
      setToast({ message: 'Inbound reply logged.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The inbound reply could not be logged'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openCompensation = () => {
    setCompensationAmount('');
    setCompensationNote('');
    setCompensationCurrency('ETB');
    setCompensationOpen(true);
  };

  const submitCompensation = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(
        `/admin/cases/${detail.id}/compensation`,
        {
          method: 'POST',
          body: JSON.stringify({
            amount: compensationAmount.trim(),
            currency: compensationCurrency,
            note: compensationNote.trim(),
          }),
        },
      );
      setCompensationOpen(false);
      applyDetail(updated);
      setToast({ message: 'Compensation intent proposed for review.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The proposal could not be recorded'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitCompensationDecision = async () => {
    if (!detail || !compensationDecision) return;
    setSubmitting(true);
    try {
      const updated = await apiFetch<AdminCaseDetail>(
        `/admin/cases/${detail.id}/compensation/${compensationDecision}`,
        {
          method: 'POST',
          body: JSON.stringify({ note: compensationDecisionNote.trim() }),
        },
      );
      setCompensationDecision(null);
      setCompensationDecisionNote('');
      applyDetail(updated);
      setToast({
        message:
          compensationDecision === 'approve'
            ? 'Compensation intent approved. No money moved.'
            : 'Compensation intent declined.',
        tone: 'success',
      });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The compensation decision could not be recorded'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openCanned = () => {
    resetCannedForm();
    setCannedOpen(true);
  };

  const resetCannedForm = () => {
    setCannedEditingId(null);
    setCannedTitle('');
    setCannedBody('');
    setCannedCategory('');
  };

  const editCanned = (response: CannedResponse) => {
    setCannedEditingId(response.id);
    setCannedTitle(response.title);
    setCannedBody(response.body);
    setCannedCategory(response.category || '');
  };

  const saveCanned = async () => {
    setSavingCanned(true);
    try {
      if (cannedEditingId) {
        await apiFetch<CannedResponse>(`/admin/cases/canned-responses/${cannedEditingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: cannedTitle.trim(),
            body: cannedBody.trim(),
            category: cannedCategory.trim() || undefined,
          }),
        });
      } else {
        await apiFetch<CannedResponse>('/admin/cases/canned-responses', {
          method: 'POST',
          body: JSON.stringify({
            title: cannedTitle.trim(),
            body: cannedBody.trim(),
            category: cannedCategory.trim() || undefined,
          }),
        });
      }
      const refreshed = await apiFetch<CannedResponse[]>('/admin/cases/canned-responses');
      setCannedResponses(refreshed);
      resetCannedForm();
      setToast({ message: 'Canned reply saved.', tone: 'success' });
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The canned reply could not be saved'),
        tone: 'danger',
      });
    } finally {
      setSavingCanned(false);
    }
  };

  const toggleCanned = async (response: CannedResponse) => {
    try {
      const updated = await apiFetch<CannedResponse>(
        `/admin/cases/canned-responses/${response.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !response.isActive }),
        },
      );
      setCannedResponses((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (error) {
      setToast({
        message: errorMessage(error, 'The canned reply could not be updated'),
        tone: 'danger',
      });
    }
  };

  const counts = result?.counts;
  const statusFilters: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: 'all', label: 'All cases', count: result?.total ?? 0 },
    ...CASE_STATUSES.map((value) => ({
      value: value as StatusFilter,
      label: CASE_STATUS_LABELS[value],
      count: counts?.[value] ?? 0,
    })),
  ];

  const canCreate = Boolean(
    newCaseSubject.trim().length >= 5 &&
      newCaseDescription.trim().length >= 20 &&
      (linkedBooking || newCaseRequesterName.trim().length >= 2),
  );

  const detailNode = detail ? (
    <CaseWorkspace
      detail={detail}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      canManage={canManage}
      replyBody={replyBody}
      onReplyBodyChange={setReplyBody}
      onSendReply={() => void sendReply()}
      sendingReply={sendingReply}
      cannedResponses={cannedResponses}
      cannedId={cannedId}
      onCannedChange={changeCanned}
      onManageCanned={openCanned}
      noteBody={noteBody}
      onNoteBodyChange={setNoteBody}
      onAddNote={() => void addNote()}
      addingNote={addingNote}
      attachmentFile={attachmentFile}
      onAttachmentFileChange={setAttachmentFile}
      attachmentCaption={attachmentCaption}
      onAttachmentCaptionChange={setAttachmentCaption}
      onUploadAttachment={() => void uploadAttachment()}
      uploadingAttachment={uploadingAttachment}
      onDownloadAttachment={(attachment) => void downloadAttachment(attachment)}
      onLogInbound={openInbound}
      onAssign={openAssign}
      onStatus={openStatus}
      onEdit={openEdit}
      onBack={backToQueue}
      backLabel="Back to case queue"
    />
  ) : null;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Support cases"
        description="One desk for complaints, disputes, safety concerns and guest support. Assign ownership, answer with context, watch the service clock, and keep every decision on the record."
        actions={
          <>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void exportCsv()}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            {canManage ? (
              <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                New case
              </button>
            ) : null}
          </>
        }
      />

      <section className="admin-stats-strip" aria-label="Support desk summary">
        <div className="admin-stat">
          <p className="admin-stat-label">Open</p>
          <p className="admin-stat-value">{counts?.OPEN ?? '—'}</p>
          <p className="admin-stat-note">Not yet picked up</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">In progress</p>
          <p className="admin-stat-value">{counts?.IN_PROGRESS ?? '—'}</p>
          <p className="admin-stat-note">Actively owned</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Overdue</p>
          <p className="admin-stat-value text-[#9a3f33]">{result?.overdue ?? '—'}</p>
          <p className="admin-stat-note">Past resolution SLA</p>
        </div>
        <div className="admin-stat">
          <p className="admin-stat-label">Unassigned</p>
          <p className="admin-stat-value">{result?.unassigned ?? '—'}</p>
          <p className="admin-stat-note">Need an owner</p>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search />
          <input
            className="admin-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search case number, subject, requester or booking"
            aria-label="Search support cases"
          />
        </div>
        <select
          className="admin-select w-auto min-w-[9rem]"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value as 'all' | CaseType);
            setPage(1);
          }}
          aria-label="Filter by case type"
        >
          <option value="all">All types</option>
          {CASE_TYPES.map((value) => (
            <option key={value} value={value}>{CASE_TYPE_LABELS[value]}</option>
          ))}
        </select>
        <button
          type="button"
          className={`admin-btn ${overdueOnly ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          aria-pressed={overdueOnly}
          onClick={() => {
            setOverdueOnly((current) => !current);
            setPage(1);
          }}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Overdue
          <span className="admin-numeric text-[10px] opacity-75">{result?.overdue ?? 0}</span>
        </button>
      </div>

      <div className="admin-filter-row" role="group" aria-label="Case status filters">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className="admin-filter"
            aria-pressed={statusFilter === filter.value}
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
            <span className="admin-filter-count">{filter.count}</span>
          </button>
        ))}
      </div>

      {listError ? (
        <div className="flex items-start gap-3 border border-[#ebd0c9] bg-[#f8e9e5] px-4 py-3 text-sm text-[#7d3328]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-bold">The support queue could not be loaded</p>
            <p className="mt-0.5 text-xs leading-5">{listError}</p>
          </div>
        </div>
      ) : null}

      <div className="admin-case-shell">
        <section className={`admin-case-queue scroll-mt-20 ${selectedId ? 'hidden lg:block' : ''}`} ref={queueRef} aria-label="Case queue">
          <div className="border-b border-[#d8d0c8] px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#78706a]">Queue</p>
                <p className="mt-0.5 text-xs font-bold text-[#3a302a]">
                  {result?.total?.toLocaleString('en-US') ?? '—'} cases
                </p>
              </div>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#78706a]" /> : null}
            </div>
          </div>

          {loading && !result ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="admin-skeleton h-20 w-full" />
              ))}
            </div>
          ) : result?.data.length ? (
            <>
              <div className="admin-case-queue-list">
                {result.data.map((supportCase) => (
                  <CaseQueueRow
                    key={supportCase.id}
                    supportCase={supportCase}
                    selected={supportCase.id === selectedId}
                    now={now}
                    onSelect={selectCase}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-[#d8d0c8] px-2.5 py-2 text-[10px] text-[#78706a]">
                <button
                  type="button"
                  className="font-bold disabled:opacity-35"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span>
                  {result.page} / {result.totalPages}
                </span>
                <button
                  type="button"
                  className="font-bold disabled:opacity-35"
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <AdminEmptyState
              title="No cases in this view"
              copy="Clear the filters or create a case when a guest or host needs help."
              icon={<MessageSquare className="h-4 w-4" />}
              action={
                canManage ? (
                  <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5" /> New case
                  </button>
                ) : null
              }
            />
          )}
        </section>

        <section
          className={`admin-case-workspace scroll-mt-20 ${selectedId ? 'flex' : 'hidden lg:flex'}`}
          ref={workspaceRef}
          aria-label="Selected support case"
        >
          {detailLoading && !detail ? (
            <div className="space-y-3 p-5">
              <div className="admin-skeleton h-8 w-2/3" />
              <div className="admin-skeleton h-4 w-1/2" />
              <div className="admin-skeleton mt-6 h-64 w-full" />
            </div>
          ) : detailError ? (
            <div className="p-5">
              <div className="flex items-start gap-3 border border-[#ebd0c9] bg-[#f8e9e5] px-4 py-3 text-sm text-[#7d3328]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold">The case could not be opened</p>
                  <p className="mt-0.5 text-xs leading-5">{detailError}</p>
                </div>
              </div>
            </div>
          ) : detail ? (
            detailNode
          ) : (
            <AdminEmptyState
              title="Select a case"
              copy="The conversation, internal notes, files, service clock and desk controls open here."
              icon={<MessageSquare className="h-4 w-4" />}
            />
          )}
        </section>

        {detail ? (
          <CaseContext
            detail={detail}
            now={now}
            canManage={canManage}
            canCompensate={canCompensate}
            currentUserId={user?.id}
            onAssign={openAssign}
            onStatus={openStatus}
            onEdit={openEdit}
            onProposeCompensation={openCompensation}
            onDecideCompensation={(action) => {
              setCompensationDecision(action);
              setCompensationDecisionNote('');
            }}
          />
        ) : null}
      </div>

      <AdminDialog
        open={createOpen}
        onClose={() => {
          if (creatingCase) return;
          setCreateOpen(false);
        }}
        title="Open a support case"
        description="Capture the request, link a booking when relevant, and set the first service target."
        width="lg"
        footer={
          <>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creatingCase}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitCreate()}
              disabled={creatingCase || !canCreate}
            >
              {creatingCase ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Open case
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-field-label" htmlFor="new-case-type">Type</label>
            <select
              id="new-case-type"
              className="admin-select"
              value={newCaseType}
              onChange={(event) => setNewCaseType(event.target.value as CaseType)}
            >
              {CASE_TYPES.map((value) => (
                <option key={value} value={value}>{CASE_TYPE_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-field-label" htmlFor="new-case-category">Category</label>
            <select
              id="new-case-category"
              className="admin-select"
              value={newCaseCategory}
              onChange={(event) => setNewCaseCategory(event.target.value as CaseCategory)}
            >
              {CASE_CATEGORIES.map((value) => (
                <option key={value} value={value}>{CASE_CATEGORY_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-field-label" htmlFor="new-case-priority">Priority</label>
            <select
              id="new-case-priority"
              className="admin-select"
              value={newCasePriority}
              onChange={(event) => setNewCasePriority(event.target.value as CasePriority)}
            >
              {CASE_PRIORITIES.map((value) => (
                <option key={value} value={value}>{CASE_PRIORITY_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-field-label" htmlFor="new-case-severity">Severity</label>
            <select
              id="new-case-severity"
              className="admin-select"
              value={newCaseSeverity}
              onChange={(event) => setNewCaseSeverity(event.target.value as CaseSeverity)}
            >
              {CASE_SEVERITIES.map((value) => (
                <option key={value} value={value}>{CASE_SEVERITY_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="admin-field-label" htmlFor="new-case-subject">Subject</label>
            <input
              id="new-case-subject"
              className="admin-input"
              value={newCaseSubject}
              onChange={(event) => setNewCaseSubject(event.target.value)}
              placeholder="A short, specific summary"
              maxLength={255}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-field-label" htmlFor="new-case-description">What happened?</label>
            <textarea
              id="new-case-description"
              className="admin-textarea"
              rows={5}
              value={newCaseDescription}
              onChange={(event) => setNewCaseDescription(event.target.value)}
              placeholder="At least 20 characters. Include dates, names and the outcome the requester wants."
              maxLength={10000}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-[#d8d0c8] pt-4">
          <label className="admin-field-label" htmlFor="booking-lookup">Link a reservation (optional)</label>
          {linkedBooking ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border border-[#d8d0c8] bg-[#f6f0e8] px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#3a302a]">{linkedBooking.reference}</p>
                <p className="mt-0.5 truncate text-[10px] text-[#78706a]">
                  {linkedBooking.guest?.name || 'Guest'} · {linkedBooking.property?.title || 'Property'} · {shortDate(linkedBooking.checkInDate)}
                </p>
              </div>
              <button
                type="button"
                className="text-[10px] font-bold text-[#b3541e]"
                onClick={() => {
                  setLinkedBooking(null);
                  setBookingSearch('');
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                id="booking-lookup"
                className="admin-input"
                value={bookingSearch}
                onChange={(event) => setBookingSearch(event.target.value)}
                placeholder="Search booking reference, guest or property"
              />
              {bookingSearching ? (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#78706a]" />
              ) : null}
              {bookingResults.length ? (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto border border-[#d8d0c8] bg-white shadow-[0_16px_40px_-24px_rgba(58,48,42,0.45)]">
                  {bookingResults.map((booking) => (
                    <button
                      key={booking.id}
                      type="button"
                      className="block w-full border-b border-[#e9e1d8] px-3 py-2 text-left last:border-0 hover:bg-[#f6f0e8]"
                      onClick={() => {
                        setLinkedBooking(booking);
                        setBookingSearch(booking.reference);
                        setBookingResults([]);
                        if (!newCaseRequesterName) setNewCaseRequesterName(booking.guest?.name || '');
                        if (!newCaseRequesterEmail) setNewCaseRequesterEmail(booking.guest?.email || '');
                      }}
                    >
                      <p className="text-xs font-bold text-[#3a302a]">{booking.reference} · {booking.guest?.name || 'Guest'}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#78706a]">
                        {booking.property?.title || 'Property'} · {shortDate(booking.checkInDate)} · {booking.status.replaceAll('_', ' ').toLowerCase()}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 border-t border-[#d8d0c8] pt-4 sm:grid-cols-2">
          <div>
            <label className="admin-field-label" htmlFor="new-case-requester">Requester name</label>
            <input
              id="new-case-requester"
              className="admin-input"
              value={newCaseRequesterName}
              onChange={(event) => setNewCaseRequesterName(event.target.value)}
              placeholder={linkedBooking ? 'From the reservation' : 'Required without a booking'}
            />
          </div>
          <div>
            <label className="admin-field-label" htmlFor="new-case-email">Requester email</label>
            <input
              id="new-case-email"
              type="email"
              className="admin-input"
              value={newCaseRequesterEmail}
              onChange={(event) => setNewCaseRequesterEmail(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <p className="admin-reply-hint mt-2">
          No email is sent from this console. Replies use the requester’s in-app inbox
          when an account exists; otherwise delivery is logged for the record.
        </p>
      </AdminDialog>

      <AdminDialog
        open={assignOpen}
        onClose={() => {
          if (!submitting) setAssignOpen(false);
        }}
        title="Assign this case"
        description="Give the case a clear owner. The assignee receives an in-app notification."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setAssignOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitAssign()}
              disabled={submitting || !assigneeId}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Assign case
            </button>
          </>
        }
      >
        <label className="admin-field-label" htmlFor="case-assignee">Administrator</label>
        <select
          id="case-assignee"
          className="admin-select"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          {assignees.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name} · {admin.adminRole?.replaceAll('_', ' ').toLowerCase() || 'admin'}
            </option>
          ))}
        </select>
        {!assignees.length ? (
          <p className="mt-2 text-xs text-[#9a3f33]">No active administrators are available to assign.</p>
        ) : null}
        <div className="mt-4">
          <label className="admin-field-label" htmlFor="case-assign-note">Handoff note (optional)</label>
          <textarea
            id="case-assign-note"
            className="admin-textarea"
            rows={3}
            value={assignNote}
            onChange={(event) => setAssignNote(event.target.value)}
            placeholder="What should the new owner know first?"
          />
        </div>
      </AdminDialog>

      <AdminDialog
        open={statusOpen}
        onClose={() => {
          if (!submitting) setStatusOpen(false);
        }}
        title="Update case status"
        description="Move the case through the desk. The reason is kept in the activity log and audit trail."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setStatusOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitStatus()}
              disabled={submitting || !targetStatus || statusReason.trim().length < 5}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save status
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-field-label" htmlFor="case-target-status">Next state</label>
            <select
              id="case-target-status"
              className="admin-select"
              value={targetStatus}
              onChange={(event) => setTargetStatus(event.target.value as CaseStatus)}
            >
              {(detail?.allowedTransitions.length ? detail.allowedTransitions : [detail?.status || 'OPEN']).map((value) => (
                <option key={value} value={value}>
                  {CASE_STATUS_LABELS[value as CaseStatus]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:pt-5">
            <div className="flex flex-wrap gap-1.5">
              {detail?.allowedTransitions.map((value) => (
                <AdminStatusBadge
                  key={value}
                  label={CASE_STATUS_LABELS[value]}
                  tone={CASE_STATUS_TONES[value]}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="admin-field-label" htmlFor="case-status-reason">Reason</label>
          <textarea
            id="case-status-reason"
            className="admin-textarea"
            rows={4}
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
            placeholder="At least 5 characters. Explain the change for the next administrator."
          />
        </div>
        {detail?.status === 'RESOLVED' || detail?.status === 'CLOSED' ? (
          <p className="admin-reply-hint mt-2">
            Reopening returns the case to Open. Existing SLA breach history is kept.
          </p>
        ) : null}
      </AdminDialog>

      <AdminDialog
        open={editOpen}
        onClose={() => {
          if (!submitting) setEditOpen(false);
        }}
        title="Adjust case details"
        description="Priority and severity guide the queue order and service target. Existing deadlines are kept."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitEdit()}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save details
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="admin-field-label" htmlFor="edit-category">Category</label>
            <select
              id="edit-category"
              className="admin-select"
              value={editCategory}
              onChange={(event) => setEditCategory(event.target.value as CaseCategory)}
            >
              {CASE_CATEGORIES.map((value) => (
                <option key={value} value={value}>{CASE_CATEGORY_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-field-label" htmlFor="edit-priority">Priority</label>
            <select
              id="edit-priority"
              className="admin-select"
              value={editPriority}
              onChange={(event) => setEditPriority(event.target.value as CasePriority)}
            >
              {CASE_PRIORITIES.map((value) => (
                <option key={value} value={value}>{CASE_PRIORITY_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-field-label" htmlFor="edit-severity">Severity</label>
            <select
              id="edit-severity"
              className="admin-select"
              value={editSeverity}
              onChange={(event) => setEditSeverity(event.target.value as CaseSeverity)}
            >
              {CASE_SEVERITIES.map((value) => (
                <option key={value} value={value}>{CASE_SEVERITY_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <AdminStatusBadge label={`${CASE_PRIORITY_LABELS[editPriority]} priority`} tone={CASE_PRIORITY_TONES[editPriority]} />
          <AdminStatusBadge label={`${CASE_SEVERITY_LABELS[editSeverity]} severity`} tone={CASE_SEVERITY_TONES[editSeverity]} />
        </div>
      </AdminDialog>

      <AdminDialog
        open={inboundOpen}
        onClose={() => {
          if (!submitting) setInboundOpen(false);
        }}
        title="Log an inbound reply"
        description="Record a reply that arrived outside this console. No email or SMS is sent."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setInboundOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitInbound()}
              disabled={submitting || inboundBody.trim().length < 2}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Log reply
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="admin-field-label" htmlFor="inbound-author">From</label>
            <input
              id="inbound-author"
              className="admin-input"
              value={inboundAuthorName}
              onChange={(event) => setInboundAuthorName(event.target.value)}
              placeholder="Requester name"
            />
          </div>
          <div>
            <label className="admin-field-label" htmlFor="inbound-email">Email</label>
            <input
              id="inbound-email"
              type="email"
              className="admin-input"
              value={inboundAuthorEmail}
              onChange={(event) => setInboundAuthorEmail(event.target.value)}
              placeholder="Requester email"
            />
          </div>
          <div>
            <label className="admin-field-label" htmlFor="inbound-channel">Channel</label>
            <select
              id="inbound-channel"
              className="admin-select"
              value={inboundChannel}
              onChange={(event) => setInboundChannel(event.target.value as CaseMessageChannel)}
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="admin-field-label" htmlFor="inbound-body">Reply</label>
            <textarea
              id="inbound-body"
              className="admin-textarea"
              rows={5}
              value={inboundBody}
              onChange={(event) => setInboundBody(event.target.value)}
              placeholder="Paste or summarize what the requester said."
            />
          </div>
        </div>
        <p className="admin-reply-hint mt-2">
          Replying to a resolved or closed case reopens it automatically.
        </p>
      </AdminDialog>

      <AdminDialog
        open={compensationOpen}
        onClose={() => {
          if (!submitting) setCompensationOpen(false);
        }}
        title="Propose a compensation intent"
        description="Record a gesture for a second administrator to review. This does not issue a refund or move money."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setCompensationOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void submitCompensation()}
              disabled={submitting || !/^\d{1,8}(\.\d{1,2})?$/.test(compensationAmount) || compensationNote.trim().length < 10}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Propose intent
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <div>
            <label className="admin-field-label" htmlFor="compensation-amount">Amount</label>
            <input
              id="compensation-amount"
              className="admin-input admin-numeric"
              value={compensationAmount}
              onChange={(event) => setCompensationAmount(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="admin-field-label" htmlFor="compensation-currency">Currency</label>
            <input
              id="compensation-currency"
              className="admin-input"
              value={compensationCurrency}
              onChange={(event) => setCompensationCurrency(event.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="admin-field-label" htmlFor="compensation-note">Why this gesture?</label>
          <textarea
            id="compensation-note"
            className="admin-textarea"
            rows={4}
            value={compensationNote}
            onChange={(event) => setCompensationNote(event.target.value)}
            placeholder="At least 10 characters. Explain the service failure and the proposed gesture."
          />
        </div>
        <p className="admin-reply-hint mt-2">
          Approval is an operational decision only. Finance follow-up happens outside this console.
        </p>
      </AdminDialog>

      <AdminDialog
        open={Boolean(compensationDecision)}
        onClose={() => {
          if (!submitting) setCompensationDecision(null);
        }}
        title={compensationDecision === 'approve' ? 'Approve compensation intent' : 'Decline compensation intent'}
        description="A second administrator must decide. No payment or refund is executed here."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setCompensationDecision(null)} disabled={submitting}>
              Back
            </button>
            <button
              type="button"
              className={`admin-btn ${compensationDecision === 'approve' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => void submitCompensationDecision()}
              disabled={submitting || compensationDecisionNote.trim().length < 5}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {compensationDecision === 'approve' ? 'Approve intent' : 'Decline intent'}
            </button>
          </>
        }
      >
        {detail?.compensation.amount ? (
          <div className="mb-4 border-l-2 border-[#b3541e] pl-3">
            <p className="admin-numeric text-sm font-bold text-[#3a302a]">
              {formatMoney(detail.compensation.amount, detail.compensation.currency)}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#605850]">{detail.compensation.note}</p>
            <p className="mt-1 text-[10px] text-[#78706a]">
              Proposed by {detail.compensation.proposedBy?.name || 'admin'}
            </p>
          </div>
        ) : null}
        <label className="admin-field-label" htmlFor="compensation-decision-note">Decision note</label>
        <textarea
          id="compensation-decision-note"
          className="admin-textarea"
          rows={4}
          value={compensationDecisionNote}
          onChange={(event) => setCompensationDecisionNote(event.target.value)}
          placeholder="Explain the decision for the record."
        />
      </AdminDialog>

      <AdminDialog
        open={cannedOpen}
        onClose={() => {
          if (!savingCanned) setCannedOpen(false);
        }}
        title="Canned replies"
        description="Reusable wording for common support answers. Archive without deleting so history stays clear."
        width="lg"
        footer={
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setCannedOpen(false)} disabled={savingCanned}>
            Done
          </button>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="admin-field-label mb-0">Library</p>
              <span className="text-[10px] text-[#78706a]">{cannedResponses.filter((response) => response.isActive).length} active</span>
            </div>
            <ul className="mt-2 max-h-[22rem] divide-y divide-[#e9e1d8] overflow-y-auto border-y border-[#e9e1d8]">
              {cannedResponses.map((response) => (
                <li key={response.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#3a302a]">{response.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#78706a]">
                        {response.category || 'General'} · {response.isActive ? 'Active' : 'Archived'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" className="text-[10px] font-bold text-[#b3541e]" onClick={() => editCanned(response)}>
                        Edit
                      </button>
                      <button type="button" className="text-[10px] font-bold text-[#605850]" onClick={() => void toggleCanned(response)}>
                        {response.isActive ? 'Archive' : 'Restore'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#78706a]">{response.body}</p>
                </li>
              ))}
              {!cannedResponses.length ? (
                <li className="py-5 text-center text-xs text-[#78706a]">No canned replies yet.</li>
              ) : null}
            </ul>
          </div>

          <div className="border-t border-[#d8d0c8] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <p className="admin-field-label">{cannedEditingId ? 'Edit reply' : 'New reply'}</p>
            <div className="space-y-3">
              <div>
                <label className="sr-only" htmlFor="canned-title">Title</label>
                <input
                  id="canned-title"
                  className="admin-input"
                  value={cannedTitle}
                  onChange={(event) => setCannedTitle(event.target.value)}
                  placeholder="Short title"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="canned-category">Category</label>
                <input
                  id="canned-category"
                  className="admin-input"
                  value={cannedCategory}
                  onChange={(event) => setCannedCategory(event.target.value)}
                  placeholder="Category (optional)"
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="canned-body">Reply body</label>
                <textarea
                  id="canned-body"
                  className="admin-textarea"
                  rows={6}
                  value={cannedBody}
                  onChange={(event) => setCannedBody(event.target.value)}
                  placeholder="The reusable reply"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="admin-btn admin-btn-primary h-8 min-h-8 px-3 text-[11px]"
                  onClick={() => void saveCanned()}
                  disabled={savingCanned || cannedTitle.trim().length < 3 || cannedBody.trim().length < 5}
                >
                  {savingCanned ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {cannedEditingId ? 'Save changes' : 'Add reply'}
                </button>
                {cannedEditingId ? (
                  <button type="button" className="admin-btn admin-btn-secondary h-8 min-h-8 px-3 text-[11px]" onClick={resetCannedForm}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </AdminDialog>

      {toast ? (
        <div className="admin-toast" data-tone={toast.tone} role="status">
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

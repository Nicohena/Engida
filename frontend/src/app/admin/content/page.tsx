'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  ContentBlockRecord,
  FaqCategory,
  FaqItemRecord,
} from '../../../types/admin-growth';

type ContentTab = 'faqs' | 'policies' | 'banner';

const FAQ_CATEGORIES: FaqCategory[] = [
  'GENERAL',
  'BOOKING',
  'PAYMENTS',
  'HOSTING',
  'SAFETY',
];

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('faqs');
  const [faqs, setFaqs] = useState<FaqItemRecord[]>([]);
  const [blocks, setBlocks] = useState<ContentBlockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FAQ Modal
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItemRecord | null>(null);
  const [faqForm, setFaqForm] = useState({
    category: 'GENERAL' as FaqCategory,
    question: '',
    questionAmharic: '',
    answer: '',
    answerAmharic: '',
    displayOrder: 0,
    isPublished: true,
  });

  // Content Block Modal
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlockRecord | null>(null);
  const [blockForm, setBlockForm] = useState({
    slug: '',
    title: '',
    content: '',
    metaDescription: '',
    isPublished: true,
  });

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [faqData, blockData] = await Promise.all([
        apiFetch<FaqItemRecord[]>('/admin/content/faqs'),
        apiFetch<ContentBlockRecord[]>('/admin/content/blocks'),
      ]);
      setFaqs(faqData);
      setBlocks(blockData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load content items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Save FAQ
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaq) {
        await apiFetch(`/admin/content/faqs/${editingFaq.id}`, {
          method: 'PATCH',
          body: JSON.stringify(faqForm),
        });
      } else {
        await apiFetch('/admin/content/faqs', {
          method: 'POST',
          body: JSON.stringify(faqForm),
        });
      }
      setFaqModalOpen(false);
      setEditingFaq(null);
      await loadContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save FAQ');
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await apiFetch(`/admin/content/faqs/${id}`, { method: 'DELETE' });
      await loadContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  // Save Content Block
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBlock) {
        await apiFetch(`/admin/content/blocks/${editingBlock.id}`, {
          method: 'PATCH',
          body: JSON.stringify(blockForm),
        });
      } else {
        await apiFetch('/admin/content/blocks', {
          method: 'POST',
          body: JSON.stringify(blockForm),
        });
      }
      setBlockModalOpen(false);
      setEditingBlock(null);
      await loadContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save content block');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Management & Policies"
        description="Edit platform FAQs with bilingual support, publish legal policies, and curate homepage hero text."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadContent()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#605850] bg-white border border-[#d8d0c8] rounded-lg hover:text-[#3a302a] hover:bg-[#faf5ee] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {activeTab === 'faqs' && (
              <button
                onClick={() => {
                  setEditingFaq(null);
                  setFaqForm({
                    category: 'GENERAL',
                    question: '',
                    questionAmharic: '',
                    answer: '',
                    answerAmharic: '',
                    displayOrder: faqs.length + 1,
                    isPublished: true,
                  });
                  setFaqModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add FAQ Item
              </button>
            )}
            {activeTab === 'policies' && (
              <button
                onClick={() => {
                  setEditingBlock(null);
                  setBlockForm({
                    slug: '',
                    title: '',
                    content: '',
                    metaDescription: '',
                    isPublished: true,
                  });
                  setBlockModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Policy Document
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#d8d0c8] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('faqs')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'faqs'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Bilingual FAQs ({faqs.length})
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'policies'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Policies & Terms ({blocks.length})
        </button>
      </div>

      {/* ================= TAB 1: FAQS ================= */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#b3541e] uppercase tracking-wider bg-[#faf5ee] border border-[#d8d0c8] px-2 py-0.5 rounded">
                      {faq.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        faq.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {faq.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-[#3a302a] mt-3">
                    {faq.question}
                  </h3>
                  {faq.questionAmharic && (
                    <p className="text-xs font-medium text-[#b3541e] mt-0.5">
                      {faq.questionAmharic}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-[#605850] leading-relaxed line-clamp-3">
                    {faq.answer}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                  <span>Order: {faq.displayOrder}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingFaq(faq);
                        setFaqForm({
                          category: faq.category,
                          question: faq.question,
                          questionAmharic: faq.questionAmharic || '',
                          answer: faq.answer,
                          answerAmharic: faq.answerAmharic || '',
                          displayOrder: faq.displayOrder,
                          isPublished: faq.isPublished,
                        });
                        setFaqModalOpen(true);
                      }}
                      className="p-1 text-[#605850] hover:text-[#b3541e] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="p-1 text-[#605850] hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 2: POLICIES & TERMS ================= */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#605850] bg-[#faf5ee] border border-[#d8d0c8] px-2 py-0.5 rounded">
                      {block.slug}
                    </span>
                    <span className="text-[10px] font-semibold text-[#605850]">
                      v{block.version}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#3a302a] mt-3">
                    {block.title}
                  </h3>
                  {block.metaDescription && (
                    <p className="mt-1 text-xs text-[#605850] line-clamp-2">
                      {block.metaDescription}
                    </p>
                  )}

                  <div className="mt-3 p-3 bg-[#faf5ee] rounded-lg border border-[#f2ece4] text-[11px] font-mono text-[#605850] max-h-24 overflow-hidden">
                    {block.content.slice(0, 160)}...
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                  <span>
                    {block.publishedAt
                      ? `Published ${new Date(block.publishedAt).toLocaleDateString()}`
                      : 'Draft'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingBlock(block);
                      setBlockForm({
                        slug: block.slug,
                        title: block.title,
                        content: block.content,
                        metaDescription: block.metaDescription || '',
                        isPublished: block.isPublished,
                      });
                      setBlockModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#b3541e] hover:underline"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Document
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: FAQ ================= */}
      {faqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#d8d0c8] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                {editingFaq ? 'Edit FAQ Item' : 'Create FAQ Item'}
              </h3>
              <button
                onClick={() => setFaqModalOpen(false)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFaq} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Category
                </label>
                <select
                  value={faqForm.category}
                  onChange={(e) =>
                    setFaqForm({ ...faqForm, category: e.target.value as FaqCategory })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                >
                  {FAQ_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Question (English)
                </label>
                <input
                  type="text"
                  required
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Question (Amharic)
                </label>
                <input
                  type="text"
                  placeholder="ጥያቄዎን በአማርኛ ያስገቡ..."
                  value={faqForm.questionAmharic}
                  onChange={(e) =>
                    setFaqForm({ ...faqForm, questionAmharic: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Answer (English)
                </label>
                <textarea
                  rows={3}
                  required
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Answer (Amharic)
                </label>
                <textarea
                  rows={3}
                  placeholder="መልስዎን በአማርኛ ያስገቡ..."
                  value={faqForm.answerAmharic}
                  onChange={(e) =>
                    setFaqForm({ ...faqForm, answerAmharic: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={faqForm.isPublished}
                    onChange={(e) =>
                      setFaqForm({ ...faqForm, isPublished: e.target.checked })
                    }
                    className="accent-[#b3541e]"
                  />
                  <span className="font-semibold text-[#3a302a]">
                    Published on Website
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  onClick={() => setFaqModalOpen(false)}
                  className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215] font-semibold"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONTENT BLOCK ================= */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#d8d0c8] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                {editingBlock ? `Edit: ${editingBlock.title}` : 'Create Policy Document'}
              </h3>
              <button
                onClick={() => setBlockModalOpen(false)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBlock} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Slug Identifier
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBlock}
                    placeholder="e.g. guest-cancellation-policy"
                    value={blockForm.slug}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={blockForm.title}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Meta Description
                </label>
                <input
                  type="text"
                  placeholder="Summary for search engines and preview snippets"
                  value={blockForm.metaDescription}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, metaDescription: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Markdown Content
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder="## Section Heading&#10;Write policy content in markdown..."
                  value={blockForm.content}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, content: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockForm.isPublished}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, isPublished: e.target.checked })
                    }
                    className="accent-[#b3541e]"
                  />
                  <span className="font-semibold text-[#3a302a]">
                    Published and Visible to Public
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215] font-semibold"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

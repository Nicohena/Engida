'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Castle,
  Check,
  ChevronRight,
  Flame,
  Globe2,
  Home,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Trees,
  Waves,
  Wifi,
  X,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  AmenityCategory,
  AmenityItem,
  Destination,
  PropertyCategory,
} from '../../../types/admin-growth';

type ActiveTab = 'categories' | 'destinations' | 'amenities';

const AMENITY_CATEGORIES: AmenityCategory[] = [
  'ESSENTIALS',
  'KITCHEN',
  'SAFETY',
  'OUTDOOR',
  'WELLNESS',
  'SERVICES',
];

export default function AdminCategoriesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  const [categories, setCategories] = useState<PropertyCategory[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenityCategory, setSelectedAmenityCategory] = useState<string>('ALL');

  // Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PropertyCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    slug: '',
    name: '',
    nameAmharic: '',
    description: '',
    icon: 'Building2',
    displayOrder: 0,
    isActive: true,
  });

  const [destinationModalOpen, setDestinationModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [destinationForm, setDestinationForm] = useState({
    slug: '',
    name: '',
    nameAmharic: '',
    region: '',
    tagline: '',
    imageUrl: '',
    latitude: 9.03,
    longitude: 38.74,
    isFeatured: true,
    displayOrder: 0,
    isActive: true,
  });

  const [amenityModalOpen, setAmenityModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityItem | null>(null);
  const [amenityForm, setAmenityForm] = useState({
    name: '',
    nameAmharic: '',
    category: 'ESSENTIALS' as AmenityCategory,
    icon: 'Wifi',
    displayOrder: 0,
    isActive: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cats, dests, amens] = await Promise.all([
        apiFetch<PropertyCategory[]>('/admin/catalog/categories'),
        apiFetch<Destination[]>('/admin/catalog/destinations'),
        apiFetch<AmenityItem[]>('/admin/catalog/amenities'),
      ]);
      setCategories(cats);
      setDestinations(dests);
      setAmenities(amens);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await apiFetch(`/admin/catalog/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify(categoryForm),
        });
      } else {
        await apiFetch('/admin/catalog/categories', {
          method: 'POST',
          body: JSON.stringify(categoryForm),
        });
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving category');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the category "${name}"?`)) return;
    try {
      await apiFetch(`/admin/catalog/categories/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  // Save Destination
  const handleSaveDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDestination) {
        await apiFetch(`/admin/catalog/destinations/${editingDestination.id}`, {
          method: 'PATCH',
          body: JSON.stringify(destinationForm),
        });
      } else {
        await apiFetch('/admin/catalog/destinations', {
          method: 'POST',
          body: JSON.stringify(destinationForm),
        });
      }
      setDestinationModalOpen(false);
      setEditingDestination(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving destination');
    }
  };

  // Delete Destination
  const handleDeleteDestination = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the destination "${name}"?`)) return;
    try {
      await apiFetch(`/admin/catalog/destinations/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete destination');
    }
  };

  // Save Amenity
  const handleSaveAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAmenity) {
        await apiFetch(`/admin/catalog/amenities/${editingAmenity.id}`, {
          method: 'PATCH',
          body: JSON.stringify(amenityForm),
        });
      } else {
        await apiFetch('/admin/catalog/amenities', {
          method: 'POST',
          body: JSON.stringify(amenityForm),
        });
      }
      setAmenityModalOpen(false);
      setEditingAmenity(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving amenity');
    }
  };

  // Delete Amenity
  const handleDeleteAmenity = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the amenity "${name}"?`)) return;
    try {
      await apiFetch(`/admin/catalog/amenities/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete amenity');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categories & Locations"
        description="Curate dynamic property categories, featured Ethiopian destination regions, and categorized amenities."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#605850] bg-white border border-[#d8d0c8] rounded-lg hover:text-[#3a302a] hover:bg-[#faf5ee] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {activeTab === 'categories' && (
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({
                    slug: '',
                    name: '',
                    nameAmharic: '',
                    description: '',
                    icon: 'Building2',
                    displayOrder: categories.length + 1,
                    isActive: true,
                  });
                  setCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            )}
            {activeTab === 'destinations' && (
              <button
                onClick={() => {
                  setEditingDestination(null);
                  setDestinationForm({
                    slug: '',
                    name: '',
                    nameAmharic: '',
                    region: '',
                    tagline: '',
                    imageUrl: '',
                    latitude: 9.03,
                    longitude: 38.74,
                    isFeatured: true,
                    displayOrder: destinations.length + 1,
                    isActive: true,
                  });
                  setDestinationModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Destination
              </button>
            )}
            {activeTab === 'amenities' && (
              <button
                onClick={() => {
                  setEditingAmenity(null);
                  setAmenityForm({
                    name: '',
                    nameAmharic: '',
                    category: 'ESSENTIALS',
                    icon: 'Wifi',
                    displayOrder: amenities.length + 1,
                    isActive: true,
                  });
                  setAmenityModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Amenity
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

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b border-[#d8d0c8] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Property Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('destinations')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'destinations'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          Featured Destinations ({destinations.length})
        </button>
        <button
          onClick={() => setActiveTab('amenities')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'amenities'
              ? 'border-[#b3541e] text-[#b3541e]'
              : 'border-transparent text-[#605850] hover:text-[#3a302a]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Grouped Amenities ({amenities.length})
        </button>
      </div>

      {/* ================= TAB 1: CATEGORIES ================= */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#faf5ee] border border-[#d8d0c8] flex items-center justify-center text-[#b3541e]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#3a302a]">
                      {cat.name}
                    </h3>
                    {cat.nameAmharic && (
                      <span className="text-xs font-medium text-[#b3541e]">
                        {cat.nameAmharic}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    cat.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                  }`}
                >
                  {cat.isActive ? 'Active' : 'Hidden'}
                </span>
              </div>

              {cat.description && (
                <p className="mt-3 text-xs text-[#605850] line-clamp-2">
                  {cat.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                <span className="font-mono text-[11px] bg-[#faf5ee] px-2 py-0.5 rounded border border-[#d8d0c8]">
                  slug: {cat.slug}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({
                        slug: cat.slug,
                        name: cat.name,
                        nameAmharic: cat.nameAmharic || '',
                        description: cat.description || '',
                        icon: cat.icon || 'Building2',
                        displayOrder: cat.displayOrder,
                        isActive: cat.isActive,
                      });
                      setCategoryModalOpen(true);
                    }}
                    className="p-1 hover:text-[#b3541e] text-[#605850] transition-colors"
                    title="Edit category"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 2: DESTINATIONS ================= */}
      {activeTab === 'destinations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white border border-[#d8d0c8] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full bg-[#f2ece4] relative overflow-hidden">
                  {dest.imageUrl ? (
                    <img
                      src={dest.imageUrl}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#605850]">
                      <MapPin className="w-8 h-8 opacity-40" />
                    </div>
                  )}
                  {dest.isFeatured && (
                    <span className="absolute top-3 right-3 bg-[#b3541e] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                      Featured
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-md font-medium">
                    {dest.region}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                      {dest.name}
                    </h3>
                    {dest.nameAmharic && (
                      <span className="text-sm font-semibold text-[#b3541e]">
                        {dest.nameAmharic}
                      </span>
                    )}
                  </div>
                  {dest.tagline && (
                    <p className="mt-2 text-xs text-[#605850] leading-relaxed line-clamp-2">
                      {dest.tagline}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-3 border-t border-[#f2ece4] flex items-center justify-between text-xs text-[#605850]">
                <span className="font-mono text-[11px] text-[#605850]">
                  {dest.latitude?.toFixed(2)}°N, {dest.longitude?.toFixed(2)}°E
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingDestination(dest);
                      setDestinationForm({
                        slug: dest.slug,
                        name: dest.name,
                        nameAmharic: dest.nameAmharic || '',
                        region: dest.region,
                        tagline: dest.tagline || '',
                        imageUrl: dest.imageUrl || '',
                        latitude: dest.latitude || 9.03,
                        longitude: dest.longitude || 38.74,
                        isFeatured: dest.isFeatured,
                        displayOrder: dest.displayOrder,
                        isActive: dest.isActive,
                      });
                      setDestinationModalOpen(true);
                    }}
                    className="p-1 hover:text-[#b3541e] text-[#605850] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDestination(dest.id, dest.name)}
                    className="p-1 hover:text-red-600 text-[#605850] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 3: AMENITIES ================= */}
      {activeTab === 'amenities' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#d8d0c8]">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedAmenityCategory('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedAmenityCategory === 'ALL'
                    ? 'bg-[#3a302a] text-white'
                    : 'bg-[#faf5ee] text-[#605850] hover:text-[#3a302a]'
                }`}
              >
                All Categories
              </button>
              {AMENITY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedAmenityCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedAmenityCategory === cat
                      ? 'bg-[#b3541e] text-white'
                      : 'bg-[#faf5ee] text-[#605850] hover:text-[#3a302a]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#605850]" />
              <input
                type="text"
                placeholder="Search amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#faf5ee] border border-[#d8d0c8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {amenities
              .filter(
                (a) =>
                  (selectedAmenityCategory === 'ALL' ||
                    a.category === selectedAmenityCategory) &&
                  (searchQuery === '' ||
                    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (a.nameAmharic &&
                      a.nameAmharic
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()))),
              )
              .map((amenity) => (
                <div
                  key={amenity.id}
                  className="bg-white border border-[#d8d0c8] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#faf5ee] border border-[#d8d0c8] flex items-center justify-center text-[#b3541e]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#3a302a]">
                        {amenity.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-[#b3541e] uppercase tracking-wider">
                          {amenity.category}
                        </span>
                        {amenity.nameAmharic && (
                          <span className="text-xs text-[#605850]">
                            • {amenity.nameAmharic}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingAmenity(amenity);
                        setAmenityForm({
                          name: amenity.name,
                          nameAmharic: amenity.nameAmharic || '',
                          category: amenity.category,
                          icon: amenity.icon || 'Wifi',
                          displayOrder: amenity.displayOrder,
                          isActive: amenity.isActive,
                        });
                        setAmenityModalOpen(true);
                      }}
                      className="p-1 text-[#605850] hover:text-[#b3541e] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAmenity(amenity.id, amenity.name)}
                      className="p-1 text-[#605850] hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: CATEGORY ================= */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#d8d0c8] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                {editingCategory ? 'Edit Category' : 'Create Property Category'}
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Unique Slug (e.g. villas, eco-lodges)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCategory}
                  value={categoryForm.slug}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Name (English)
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Name (Amharic)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ቪላዎች"
                    value={categoryForm.nameAmharic}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, nameAmharic: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, isActive: e.target.checked })
                    }
                    className="accent-[#b3541e]"
                  />
                  <span className="font-semibold text-[#3a302a]">
                    Active on Marketplace
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215]"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DESTINATION ================= */}
      {destinationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#d8d0c8] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                {editingDestination ? 'Edit Destination' : 'Add Featured Destination'}
              </h3>
              <button
                onClick={() => setDestinationModalOpen(false)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDestination} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Slug (e.g. bishoftu)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingDestination}
                    value={destinationForm.slug}
                    onChange={(e) =>
                      setDestinationForm({ ...destinationForm, slug: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    City Name (English)
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationForm.name}
                    onChange={(e) =>
                      setDestinationForm({ ...destinationForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Name (Amharic)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ቢሾፍቱ"
                    value={destinationForm.nameAmharic}
                    onChange={(e) =>
                      setDestinationForm({
                        ...destinationForm,
                        nameAmharic: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Region / Province
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oromia / Rift Valley"
                    value={destinationForm.region}
                    onChange={(e) =>
                      setDestinationForm({
                        ...destinationForm,
                        region: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Tagline / Highlights
                </label>
                <input
                  type="text"
                  placeholder="e.g. Volcanic crater lakes and tranquil resorts"
                  value={destinationForm.tagline}
                  onChange={(e) =>
                    setDestinationForm({ ...destinationForm, tagline: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  High-Resolution Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={destinationForm.imageUrl}
                  onChange={(e) =>
                    setDestinationForm({ ...destinationForm, imageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={destinationForm.isFeatured}
                    onChange={(e) =>
                      setDestinationForm({
                        ...destinationForm,
                        isFeatured: e.target.checked,
                      })
                    }
                    className="accent-[#b3541e]"
                  />
                  <span className="font-semibold text-[#3a302a]">
                    Feature on Homepage
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={destinationForm.isActive}
                    onChange={(e) =>
                      setDestinationForm({
                        ...destinationForm,
                        isActive: e.target.checked,
                      })
                    }
                    className="accent-[#b3541e]"
                  />
                  <span className="font-semibold text-[#3a302a]">Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  onClick={() => setDestinationModalOpen(false)}
                  className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215]"
                >
                  Save Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AMENITY ================= */}
      {amenityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#d8d0c8] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                {editingAmenity ? 'Edit Amenity' : 'Add Amenity'}
              </h3>
              <button
                onClick={() => setAmenityModalOpen(false)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAmenity} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Amenity Name (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dedicated Workspace"
                  value={amenityForm.name}
                  onChange={(e) =>
                    setAmenityForm({ ...amenityForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Amenity Name (Amharic)
                </label>
                <input
                  type="text"
                  placeholder="e.g. የሥራ ጠረጴዛ"
                  value={amenityForm.nameAmharic}
                  onChange={(e) =>
                    setAmenityForm({ ...amenityForm, nameAmharic: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>
              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Category Group
                </label>
                <select
                  value={amenityForm.category}
                  onChange={(e) =>
                    setAmenityForm({
                      ...amenityForm,
                      category: e.target.value as AmenityCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                >
                  {AMENITY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  onClick={() => setAmenityModalOpen(false)}
                  className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215]"
                >
                  Save Amenity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

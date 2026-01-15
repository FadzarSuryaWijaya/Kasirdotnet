'use client';

import { useState, useEffect } from 'react';
import { type CategoryDto } from '@/app/lib/api';

// Preset icons for categories
const ICON_PRESETS = [
  { value: 'coffee', label: 'Kopi' },
  { value: 'local_cafe', label: 'Cafe' },
  { value: 'bakery_dining', label: 'Roti' },
  { value: 'lunch_dining', label: 'Makanan' },
  { value: 'icecream', label: 'Es Krim' },
  { value: 'local_bar', label: 'Minuman' },
  { value: 'cake', label: 'Kue' },
  { value: 'fastfood', label: 'Fast Food' },
  { value: 'ramen_dining', label: 'Mie' },
  { value: 'rice_bowl', label: 'Nasi' },
  { value: 'egg_alt', label: 'Telur' },
  { value: 'kebab_dining', label: 'Snack' },
];

interface CategoryFormData {
  name: string;
  iconPreset: string;
  iconCustom: string;
  isActive: boolean;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  category?: CategoryDto | null;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  category,
}: CategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    iconPreset: 'coffee',
    iconCustom: '',
    isActive: true,
  });
  const [iconMode, setIconMode] = useState<'preset' | 'custom'>('preset');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!category;

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        iconPreset: category.iconPreset || 'coffee',
        iconCustom: category.iconCustom || '',
        isActive: category.isActive,
      });
      setIconMode(category.iconCustom ? 'custom' : 'preset');
    } else {
      setFormData({ name: '', iconPreset: 'coffee', iconCustom: '', isActive: true });
      setIconMode('preset');
    }
    setError('');
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nama kategori wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name: formData.name,
        iconPreset: iconMode === 'preset' ? formData.iconPreset : '',
        iconCustom: iconMode === 'custom' ? formData.iconCustom : '',
        isActive: formData.isActive,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const currentIcon = iconMode === 'preset' ? formData.iconPreset : formData.iconCustom;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Icon Preview */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center">
              {iconMode === 'preset' ? (
                <span className="material-symbols-outlined text-4xl text-blue-600">
                  {formData.iconPreset || 'category'}
                </span>
              ) : formData.iconCustom ? (
                <i className={`${formData.iconCustom} text-3xl text-blue-600`}></i>
              ) : (
                <span className="material-symbols-outlined text-4xl text-gray-300">category</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Kategori
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Kopi, Teh, Snack"
              disabled={submitting}
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
            />
          </div>

          {/* Icon Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ikon Kategori
            </label>
            <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
              <button
                type="button"
                onClick={() => setIconMode('preset')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  iconMode === 'preset'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => setIconMode('custom')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  iconMode === 'custom'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Custom
              </button>
            </div>

            {iconMode === 'preset' ? (
              <div className="grid grid-cols-4 gap-2">
                {ICON_PRESETS.map((icon) => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, iconPreset: icon.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      formData.iconPreset === icon.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl text-gray-700">
                      {icon.value}
                    </span>
                    <span className="text-xs text-gray-500">{icon.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={formData.iconCustom}
                  onChange={(e) => setFormData({ ...formData, iconCustom: e.target.value })}
                  placeholder="fa-solid fa-mug-saucer"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gunakan class Font Awesome atau icon library lainnya
                </p>
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="catIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              disabled={submitting}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="catIsActive" className="text-sm text-gray-700">
              Kategori Aktif
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
            >
              {submitting ? 'Menyimpan...' : isEdit ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

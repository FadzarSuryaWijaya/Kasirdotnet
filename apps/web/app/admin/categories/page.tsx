'use client';

import { useEffect, useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { categoriesApi, type CategoryDto } from '@/app/lib/api';
import { DataTable } from '@/app/components/ui/DataTable';
import CategoryModal from '@/app/components/CategoryModal';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category: CategoryDto) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleSave = async (data: { 
    name: string; 
    iconPreset: string; 
    iconCustom: string; 
    isActive: boolean 
  }) => {
    if (editingCategory) {
      await categoriesApi.update(editingCategory.id, { 
        name: data.name,
        iconPreset: data.iconPreset || '',
        iconCustom: data.iconCustom || '',
      });
    } else {
      await categoriesApi.create({ 
        name: data.name,
        iconPreset: data.iconPreset || '',
        iconCustom: data.iconCustom || '',
      });
    }
    await loadCategories();
  };

  const handleDelete = async (category: CategoryDto) => {
    if (!confirm(`Hapus kategori "${category.name}"?`)) return;
    try {
      await categoriesApi.delete(category.id);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  const columns = useMemo<ColumnDef<CategoryDto, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nama Kategori',
        cell: ({ row }) => {
          const cat = row.original;
          const hasIcon = cat.iconPreset || cat.iconCustom;
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                {cat.iconCustom ? (
                  <i className={`${cat.iconCustom} text-lg text-blue-600`}></i>
                ) : (
                  <span className="material-symbols-outlined text-blue-600">
                    {cat.iconPreset || 'category'}
                  </span>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-900">{cat.name}</span>
                {!hasIcon && (
                  <p className="text-xs text-gray-400">Klik edit untuk pilih icon</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              row.original.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${row.original.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {row.original.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Aksi',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEdit(row.original)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button
              onClick={() => handleDelete(row.original)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola kategori produk</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <DataTable
        data={categories}
        columns={columns}
        searchPlaceholder="Cari kategori..."
        onAdd={handleAdd}
        addButtonText="Tambah Kategori"
      />

      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        category={editingCategory}
      />
    </div>
  );
}

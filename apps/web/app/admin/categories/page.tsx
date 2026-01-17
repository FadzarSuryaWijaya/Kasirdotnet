'use client';

import { useEffect, useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { categoriesApi, type CategoryDto } from '@/app/lib/api';
import { DataTable } from '@/app/components/ui/DataTable';
import CategoryModal from '@/app/components/CategoryModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

interface DeleteCheckResult {
  canDelete: boolean;
  hasTransactions: boolean;
  hasStockHistory: boolean; // reused for hasProducts
  transactionCount: number;
  stockHistoryCount: number; // reused for productCount
  message: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null);

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDto | CategoryDto[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteCheckResult, setDeleteCheckResult] = useState<DeleteCheckResult | null>(null);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'select' | 'confirm'>('select');
  const [selectedAction, setSelectedAction] = useState<'deactivate' | 'permanent' | null>(null);

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

  const handleDeleteClick = async (category: CategoryDto) => {
    setDeleteTarget(category);
    setShowDeleteModal(true);
    setCheckingDelete(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/categories/${category.id}/check-delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeleteCheckResult(data);
      }
    } catch (err) {
      console.error('Failed to check delete:', err);
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleDeleteSelected = async (selectedCategories: CategoryDto[]) => {
    setDeleteTarget(selectedCategories);
    setShowDeleteModal(true);
    setCheckingDelete(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/categories/check-delete-batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: selectedCategories.map(c => c.id) }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeleteCheckResult(data);
      }
    } catch (err) {
      console.error('Failed to check delete:', err);
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleConfirmDelete = async (action: 'deactivate' | 'permanent') => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      const forceDelete = action === 'permanent';
      
      if (Array.isArray(deleteTarget)) {
        // Multi delete
        const ids = deleteTarget.map(c => c.id);
        const res = await fetch(`${API_BASE_URL}/api/categories/delete-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids, forceDelete }),
        });
        if (!res.ok) throw new Error('Failed to delete categories');
        const data = await res.json();
        alert(data.message);
      } else {
        // Single delete
        const res = await fetch(`${API_BASE_URL}/api/categories/${deleteTarget.id}?forceDelete=${forceDelete}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete category');
        const data = await res.json();
        alert(data.message);
      }

      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteCheckResult(null);
      await loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus kategori');
    } finally {
      setDeleting(false);
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
              onClick={() => handleDeleteClick(row.original)}
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

  const deleteCount = Array.isArray(deleteTarget) ? deleteTarget.length : 1;
  const deleteNames = Array.isArray(deleteTarget) 
    ? deleteTarget.slice(0, 3).map(c => c.name).join(', ') + (deleteTarget.length > 3 ? ` dan ${deleteTarget.length - 3} lainnya` : '')
    : deleteTarget?.name;

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
        enableSelection={true}
        onDeleteSelected={handleDeleteSelected}
        deleteButtonText="Hapus"
        getRowId={(row) => row.id}
        renderMobileCard={(category, isSelected, onToggleSelect) => (
          <div className={`bg-white rounded-lg shadow-sm border p-4 ${isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex-shrink-0 flex items-center justify-center">
                {category.iconCustom ? (
                  <i className={`${category.iconCustom} text-lg text-blue-600`}></i>
                ) : (
                  <span className="material-symbols-outlined text-blue-600">{category.iconPreset || 'category'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${category.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${category.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {category.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(category)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
                <button onClick={() => handleDeleteClick(category)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      />

      <CategoryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        category={editingCategory}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">warning</span>
              <h3 className="font-bold text-gray-900">Hapus Kategori</h3>
            </div>
            <div className="p-4">
              {deleteStep === 'select' ? (
                <>
                  <p className="text-gray-600 mb-2">
                    Kategori yang akan dihapus:
                  </p>
                  <p className="font-medium text-gray-900 mb-4">
                    {deleteNames}
                  </p>

                  {checkingDelete ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span>
                      <span className="ml-2 text-gray-500">Memeriksa data terkait...</span>
                    </div>
                  ) : deleteCheckResult && (
                    <div className="space-y-3">
                      {/* Info data terkait */}
                      {(deleteCheckResult.hasTransactions || deleteCheckResult.hasStockHistory) && (
                        <div className={`p-3 rounded-lg border ${deleteCheckResult.hasTransactions ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                          <p className={`text-sm font-medium ${deleteCheckResult.hasTransactions ? 'text-red-800' : 'text-amber-800'}`}>
                            <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                            Data Terkait Ditemukan:
                          </p>
                          <ul className={`text-sm mt-1 ml-6 list-disc ${deleteCheckResult.hasTransactions ? 'text-red-700' : 'text-amber-700'}`}>
                            {deleteCheckResult.hasStockHistory && (
                              <li>{deleteCheckResult.stockHistoryCount} produk dalam kategori ini (di menu Produk)</li>
                            )}
                            {deleteCheckResult.hasTransactions && (
                              <li>{deleteCheckResult.transactionCount} riwayat transaksi (di menu Transaksi)</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Opsi aksi */}
                      <div className="border rounded-lg divide-y">
                        {/* Opsi Nonaktifkan - hanya jika kategori masih aktif */}
                        {Array.isArray(deleteTarget) ? (
                          // Multi-delete: tampilkan nonaktifkan jika ada kategori aktif
                          deleteTarget.some(c => c.isActive) && (
                            <button
                              onClick={() => { setSelectedAction('deactivate'); setDeleteStep('confirm'); }}
                              disabled={deleting}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                            >
                              <span className="material-symbols-outlined text-amber-600 mt-0.5">visibility_off</span>
                              <div>
                                <p className="font-medium text-gray-900">Nonaktifkan</p>
                                <p className="text-sm text-gray-500">Kategori tidak akan muncul di kasir, produk tetap ada.</p>
                              </div>
                            </button>
                          )
                        ) : (
                          // Single delete: tampilkan nonaktifkan jika kategori masih aktif
                          deleteTarget.isActive && (
                            <button
                              onClick={() => { setSelectedAction('deactivate'); setDeleteStep('confirm'); }}
                              disabled={deleting}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                            >
                              <span className="material-symbols-outlined text-amber-600 mt-0.5">visibility_off</span>
                              <div>
                                <p className="font-medium text-gray-900">Nonaktifkan</p>
                                <p className="text-sm text-gray-500">Kategori tidak akan muncul di kasir, produk tetap ada.</p>
                              </div>
                            </button>
                          )
                        )}

                        {/* Opsi Hapus Permanen - hanya jika tidak ada transaksi */}
                        {deleteCheckResult.canDelete ? (
                          <button
                            onClick={() => { setSelectedAction('permanent'); setDeleteStep('confirm'); }}
                            disabled={deleting}
                            className="w-full p-3 text-left hover:bg-red-50 transition-colors flex items-start gap-3"
                          >
                            <span className="material-symbols-outlined text-red-600 mt-0.5">delete_forever</span>
                            <div>
                              <p className="font-medium text-red-700">Hapus Permanen</p>
                              <p className="text-sm text-gray-500">
                                {deleteCheckResult.hasStockHistory 
                                  ? 'Kategori dan semua produknya akan dihapus permanen. Tidak bisa dikembalikan!'
                                  : 'Kategori akan dihapus permanen dari database. Tidak bisa dikembalikan!'}
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full p-3 bg-gray-50 flex items-start gap-3 opacity-60">
                            <span className="material-symbols-outlined text-gray-400 mt-0.5">block</span>
                            <div>
                              <p className="font-medium text-gray-500">Hapus Permanen</p>
                              <p className="text-sm text-gray-400">Tidak tersedia karena produk dalam kategori memiliki riwayat transaksi.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                      Anda akan <span className="font-bold">{selectedAction === 'deactivate' ? 'NONAKTIFKAN' : 'HAPUS PERMANEN'}</span> kategori berikut:
                    </p>
                    <p className="text-sm font-medium text-blue-900 mt-2">{deleteNames}</p>
                  </div>

                  {selectedAction === 'permanent' && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">
                        <span className="material-symbols-outlined text-base align-middle mr-1">warning</span>
                        Perhatian: Tindakan ini TIDAK BISA DIKEMBALIKAN!
                      </p>
                      <p className="text-sm text-red-700 mt-1">Data kategori dan produknya akan dihapus permanen dari database.</p>
                    </div>
                  )}

                  <p className="text-gray-600 text-sm">
                    Apakah Anda yakin ingin {selectedAction === 'deactivate' ? 'nonaktifkan' : 'hapus permanen'} kategori ini?
                  </p>
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => {
                  if (deleteStep === 'confirm') {
                    setDeleteStep('select');
                    setSelectedAction(null);
                  } else {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                    setDeleteCheckResult(null);
                  }
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                disabled={deleting}
              >
                {deleteStep === 'confirm' ? 'Kembali' : 'Batal'}
              </button>
              {deleteStep === 'confirm' && (
                <button
                  onClick={() => handleConfirmDelete(selectedAction!)}
                  disabled={deleting}
                  className={`px-4 py-2 text-white rounded-lg ${
                    selectedAction === 'permanent'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  } disabled:opacity-50`}
                >
                  {deleting ? 'Memproses...' : (selectedAction === 'deactivate' ? 'Nonaktifkan' : 'Hapus Permanen')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

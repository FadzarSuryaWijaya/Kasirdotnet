'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';
import { usersApi, type UserResponse } from '@/app/lib/api';

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'Kasir', isActive: true });
  const [saving, setSaving] = useState(false);

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', role: 'Kasir', isActive: true });
    setShowModal(true);
  };

  const openEditModal = (user: UserResponse) => {
    setEditingUser(user);
    setFormData({ name: user.name, username: user.username, password: '', role: user.role, isActive: user.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username) {
      alert('Nama dan username wajib diisi');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('Password wajib diisi untuk user baru');
      return;
    }
    try {
      setSaving(true);
      if (editingUser) {
        await usersApi.update(editingUser.id, { name: formData.name, role: formData.role, isActive: formData.isActive });
      } else {
        await usersApi.create({ name: formData.name, username: formData.username, password: formData.password, role: formData.role });
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserResponse) => {
    if (user.id === currentUser?.id) {
      alert('Tidak bisa menonaktifkan diri sendiri');
      return;
    }
    try {
      await usersApi.toggleActive(user.id);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengubah status');
    }
  };

  const handleDelete = async (user: UserResponse) => {
    if (user.id === currentUser?.id) {
      alert('Tidak bisa menghapus diri sendiri');
      return;
    }
    if (!confirm(`Yakin ingin menghapus kasir "${user.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    try {
      await usersApi.delete(user.id);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus user');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      alert('Password minimal 4 karakter');
      return;
    }
    try {
      setSaving(true);
      await usersApi.resetPassword(resetUserId, newPassword);
      setShowResetModal(false);
      setNewPassword('');
      alert('Password berhasil direset');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal reset password');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!currentUser || currentUser.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Manajemen Kasir</h1>
          <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">person_add</span>
            Tambah Kasir
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span></div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-center">Role</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.username}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditModal(user)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button onClick={() => { setResetUserId(user.id); setShowResetModal(true); }} className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded" title="Reset Password">
                            <span className="material-symbols-outlined text-lg">key</span>
                          </button>
                          <button onClick={() => handleToggleActive(user)} disabled={user.id === currentUser?.id} className={`p-1.5 rounded ${user.id === currentUser?.id ? 'text-gray-300 cursor-not-allowed' : user.isActive ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`} title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                            <span className="material-symbols-outlined text-lg">{user.isActive ? 'person_off' : 'person'}</span>
                          </button>
                          <button onClick={() => handleDelete(user)} disabled={user.id === currentUser?.id} className={`p-1.5 rounded ${user.id === currentUser?.id ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`} title="Hapus">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">group</span>
              <p>Belum ada user</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">{editingUser ? 'Edit User' : 'Tambah Kasir Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} disabled={!!editingUser} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                  <option value="Kasir">Kasir</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {editingUser && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
                  <label htmlFor="isActive" className="text-sm">Aktif</label>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold">Reset Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium mb-1">Password Baru</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Minimal 4 karakter" />
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button onClick={() => setShowResetModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button onClick={handleResetPassword} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Mereset...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

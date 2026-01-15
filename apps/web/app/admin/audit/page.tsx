'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

interface AuditLogResponse {
  id: string;
  action: string;
  actionName: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  userName?: string;
  createdAt: string;
}

const formatTimeWIB = (dateStr: string) => {
  const date = new Date(dateStr);
  date.setHours(date.getHours() + 7);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getActionColor = (action: string) => {
  if (action.includes('Void') || action.includes('Delete')) return 'bg-red-100 text-red-700';
  if (action.includes('Create') || action.includes('Deposit')) return 'bg-green-100 text-green-700';
  if (action.includes('Update') || action.includes('Adjust')) return 'bg-orange-100 text-orange-700';
  if (action.includes('Reset') || action.includes('Withdraw')) return 'bg-yellow-100 text-yellow-700';
  if (action.includes('Session') || action.includes('Login')) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};

export default function AuditPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [page, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '50');
      params.append('dateFrom', selectedDate);
      params.append('dateTo', selectedDate);

      const res = await fetch(`${API_BASE_URL}/api/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load audit logs');
      
      const data = await res.json();
      setLogs(data.items);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  if (!user || user.role !== 'Admin') return <div className="flex min-h-screen items-center justify-center text-red-600">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Audit Log</h1>
            <p className="text-sm text-gray-500">Jejak aktivitas sistem</p>
          </div>
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span></div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Waktu</th>
                    <th className="px-4 py-3 text-left">Aksi</th>
                    <th className="px-4 py-3 text-left">Entitas</th>
                    <th className="px-4 py-3 text-left">Deskripsi</th>
                    <th className="px-4 py-3 text-left">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTimeWIB(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.actionName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.entityType && <span className="text-gray-500">{log.entityType}</span>}
                        {log.entityId && <span className="text-gray-400 ml-1 font-mono">#{log.entityId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[300px] truncate" title={log.description || ''}>
                        {log.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{log.userName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Tidak ada log pada tanggal ini</div>
          )}

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

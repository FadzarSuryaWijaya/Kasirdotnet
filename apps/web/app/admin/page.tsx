'use client';

import { useEffect, useState } from 'react';
import { reportsApi, type DailyReportResponse } from '@/app/lib/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

// Format currency
const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

const formatShortRupiah = (number: number) => {
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)}jt`;
    if (number >= 1000) return `${(number / 1000).toFixed(0)}rb`;
    return number.toString();
};

interface DashboardData {
    todaySales: number;
    todayTransactions: number;
    cashTotal: number;
    qrisTotal: number;
    topProducts: { name: string; qty: number; sales: number }[];
}

interface WeeklySalesData {
    day: string;
    sales: number;
    transactions: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData>({
        todaySales: 0,
        todayTransactions: 0,
        cashTotal: 0,
        qrisTotal: 0,
        topProducts: [],
    });
    const [weeklySales, setWeeklySales] = useState<WeeklySalesData[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // Load today's report
                const today = new Date().toISOString().split('T')[0];
                const report = await reportsApi.getDailyReport(today);

                const cashData = report.byPaymentMethod.find(p => p.method === 'Cash');
                const qrisData = report.byPaymentMethod.find(p => p.method === 'QRIS');

                setData({
                    todaySales: report.totalSales,
                    todayTransactions: report.totalTransactions,
                    cashTotal: cashData?.amount || 0,
                    qrisTotal: qrisData?.amount || 0,
                    topProducts: report.topProducts?.slice(0, 5).map(p => ({
                        name: p.productName,
                        qty: p.qtySold,
                        sales: p.totalSales,
                    })) || [],
                });

                // Load last 7 days
                const weeklyData: WeeklySalesData[] = [];
                const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    try {
                        const dayReport = await reportsApi.getDailyReport(dateStr);
                        weeklyData.push({
                            day: dayNames[date.getDay()],
                            sales: dayReport.totalSales,
                            transactions: dayReport.totalTransactions,
                        });
                    } catch {
                        weeklyData.push({
                            day: dayNames[date.getDay()],
                            sales: 0,
                            transactions: 0,
                        });
                    }
                }
                
                setWeeklySales(weeklyData);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const insightCards = [
        {
            title: 'Omset Hari Ini',
            value: formatRupiah(data.todaySales),
            icon: 'payments',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-500',
        },
        {
            title: 'Total Transaksi',
            value: data.todayTransactions.toString(),
            subtitle: 'transaksi',
            icon: 'receipt_long',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-500',
        },
        {
            title: 'Pembayaran Cash',
            value: formatRupiah(data.cashTotal),
            icon: 'local_atm',
            bgColor: 'bg-amber-50',
            iconColor: 'text-amber-500',
        },
        {
            title: 'Pembayaran QRIS',
            value: formatRupiah(data.qrisTotal),
            icon: 'qr_code_2',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-500',
        },
    ];

    // Payment method pie data
    const paymentPieData = [
        { name: 'Cash', value: data.cashTotal },
        { name: 'QRIS', value: data.qrisTotal },
    ].filter(d => d.value > 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="material-symbols-outlined animate-spin text-3xl text-blue-500">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] rounded-2xl p-6 text-white">
                <h1 className="text-xl font-bold mb-1">Selamat Datang di Dashboard 👋</h1>
                <p className="text-gray-300 text-sm">
                    Ringkasan aktivitas bisnis Anda hari ini ({new Date().toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })})
                </p>
            </div>

            {/* Insight Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {insightCards.map((card, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                                <span className={`material-symbols-outlined text-xl ${card.iconColor}`}>
                                    {card.icon}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{card.title}</p>
                        <p className="text-xl font-bold text-gray-900">{card.value}</p>
                        {card.subtitle && (
                            <p className="text-xs text-gray-400">{card.subtitle}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Aksi Cepat</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <a href="/admin/products" className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors group">
                        <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-blue-500">add_circle</span>
                        <span className="text-xs font-medium">Tambah Produk</span>
                    </a>
                    <a href="/admin/categories" className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 transition-colors group">
                        <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-emerald-500">category</span>
                        <span className="text-xs font-medium">Kelola Kategori</span>
                    </a>
                    <a href="/admin/reports/daily" className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors group">
                        <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-amber-500">analytics</span>
                        <span className="text-xs font-medium">Lihat Laporan</span>
                    </a>
                    <a href="/kasir" className="flex flex-col items-center gap-1 p-3 rounded-lg bg-gray-50 hover:bg-purple-50 hover:text-purple-600 transition-colors group">
                        <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-purple-500">point_of_sale</span>
                        <span className="text-xs font-medium">Buka Kasir</span>
                    </a>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Weekly Sales Chart */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Penjualan 7 Hari Terakhir</h3>
                    {weeklySales.some(d => d.sales > 0) ? (
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklySales} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatShortRupiah} />
                                    <Tooltip
                                        formatter={(value) => [formatRupiah(Number(value) || 0), 'Penjualan']}
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                    <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-52 flex items-center justify-center bg-gray-50 rounded-lg">
                            <div className="text-center text-gray-400">
                                <span className="material-symbols-outlined text-3xl mb-1">bar_chart</span>
                                <p className="text-xs">Belum ada data penjualan</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Payment Method Pie Chart */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Metode Pembayaran Hari Ini</h3>
                    {paymentPieData.length > 0 ? (
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {paymentPieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatRupiah(Number(value) || 0)} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-52 flex items-center justify-center bg-gray-50 rounded-lg">
                            <div className="text-center text-gray-400">
                                <span className="material-symbols-outlined text-3xl mb-1">pie_chart</span>
                                <p className="text-xs">Belum ada transaksi hari ini</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Produk Terlaris Hari Ini</h3>
                {data.topProducts.length > 0 ? (
                    <div className="space-y-2">
                        {data.topProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                                    idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-gray-300'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.qty} terjual</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">{formatRupiah(product.sales)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center bg-gray-50 rounded-lg">
                        <div className="text-center text-gray-400">
                            <span className="material-symbols-outlined text-3xl mb-1">trending_up</span>
                            <p className="text-xs">Belum ada produk terjual hari ini</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    filterSheetData,
    normalizeDate,
    addMonths,
    daysBetween,
    formatDateDisplay
} from '@/lib/helpers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
// Import icon đồng bộ từ lucide-react
import {
    LayoutDashboard,
    ClipboardList,
    ShieldCheck,
    AlertTriangle,
    XOctagon,
    Activity,
    PieChart as PieChartIcon,
    ArrowRight,
    RefreshCw
} from 'lucide-react';
import './style.css';

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, expiringSoon: 0, expired: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [lastSync, setLastSync] = useState(null);

    // Kiểm tra đăng nhập
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    // Fetch dữ liệu
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await fetch('/api/sheets?type=main');
                const data = await res.json();
                const rows = data.values || [];
                const filtered = filterSheetData(rows);

                const today = new Date();
                let total = filtered.length;
                let active = 0, expiringSoon = 0, expired = 0;

                const orderList = filtered.map(row => {
                    const maHopDong = row[4] || '';
                    const tenKH = row[1] || '';
                    const ngayBanGiao = row[5] || '';
                    let ngayHetHan = null;
                    let soNgayConLai = Infinity;

                    const delivery = normalizeDate(ngayBanGiao);
                    if (delivery) {
                        ngayHetHan = addMonths(delivery, 12);
                        soNgayConLai = daysBetween(today, ngayHetHan);
                    }

                    return { maHopDong, tenKH, ngayBanGiao, ngayHetHan, soNgayConLai };
                });

                orderList.forEach(order => {
                    if (order.soNgayConLai === Infinity) return;
                    if (order.soNgayConLai < 0) expired++;
                    else if (order.soNgayConLai <= 30) expiringSoon++;
                    else active++;
                });

                setStats({ total, active, expiringSoon, expired });

                const sorted = orderList
                    .filter(o => o.ngayBanGiao)
                    .sort((a, b) => new Date(b.ngayBanGiao) - new Date(a.ngayBanGiao))
                    .slice(0, 5);
                setRecentOrders(sorted);

                const monthCounts = {};
                orderList.forEach(order => {
                    if (!order.ngayBanGiao) return;
                    const d = new Date(order.ngayBanGiao);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    monthCounts[key] = (monthCounts[key] || 0) + 1;
                });
                const monthData = Object.keys(monthCounts)
                    .sort()
                    .map(key => ({ month: key, count: monthCounts[key] }));
                setMonthlyData(monthData);

                setLastSync(Date.now());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Màu sắc hiện đại cho biểu đồ
    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

    if (loading) {
        return <div className="page-shell" style={{ paddingTop: '50px' }}><div className="content"><div className="status-box">Đang tải dữ liệu...</div></div></div>;
    }

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <div className="page-header">
                    <h1><LayoutDashboard size={28} className="text-accent" /> DASHBOARD QUẢN LÝ</h1>
                    <div className="sync-status">
                        <RefreshCw size={14} /> Đồng bộ lúc: {lastSync ? new Date(lastSync).toLocaleString('vi-VN', { hour12: false }) : 'Chưa đồng bộ'}
                    </div>
                </div>

                {/* Thống kê Card Mới */}
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-blue"><ClipboardList size={26} /></div>
                        <div className="stat-info">
                            <h3>Tổng đơn hàng</h3>
                            <p className="stat-number">{stats.total}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-green"><ShieldCheck size={26} /></div>
                        <div className="stat-info">
                            <h3>Còn bảo hành</h3>
                            <p className="stat-number">{stats.active}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-amber"><AlertTriangle size={26} /></div>
                        <div className="stat-info">
                            <h3>Sắp hết hạn</h3>
                            <p className="stat-number">{stats.expiringSoon}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-red"><XOctagon size={26} /></div>
                        <div className="stat-info">
                            <h3>Đã hết hạn</h3>
                            <p className="stat-number">{stats.expired}</p>
                        </div>
                    </div>
                </div>

                {/* Biểu đồ */}
                <div className="chart-grid">
                    <div className="chart-box">
                        <div className="chart-header">
                            <Activity size={20} className="text-blue" />
                            <h4>Số đơn hàng theo tháng</h4>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="chart-box">
                        <div className="chart-header">
                            <PieChartIcon size={20} className="text-blue" />
                            <h4>Tình trạng bảo hành</h4>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Còn hạn', value: stats.active },
                                        { name: 'Sắp hết hạn', value: stats.expiringSoon },
                                        { name: 'Hết hạn', value: stats.expired },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.active + stats.expiringSoon + stats.expired > 0 &&
                                        ['Còn hạn', 'Sắp hết hạn', 'Hết hạn'].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))
                                    }
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Danh sách đơn hàng gần đây */}
                <div className="recent-orders-section mt-24">
                    <div className="section-head-row">
                        <h3><ClipboardList size={20} className="text-accent" /> Đơn hàng gần đây</h3>
                        <button onClick={() => router.push('/bao-hanh')} className="guide-link btn-sm">
                            Xem tất cả <ArrowRight size={16} />
                        </button>
                    </div>
                    <div className="table-wrap">
                        <table className="bordered-table">
                            <thead>
                                <tr>
                                    <th>Mã hợp đồng</th>
                                    <th>Tên khách hàng</th>
                                    <th>Ngày bàn giao</th>
                                    <th>Ngày hết hạn (dự kiến)</th>
                                    <th>Tình trạng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.length === 0 ? (
                                    <tr><td colSpan="5" className="cell-center">Không có dữ liệu</td></tr>
                                ) : (
                                    recentOrders.map((order, idx) => {
                                        let statusBadge = '';
                                        if (order.soNgayConLai === Infinity) {
                                            statusBadge = <span className="status-badge gray">-</span>;
                                        } else if (order.soNgayConLai < 0) {
                                            statusBadge = <span className="status-badge red">Hết hạn</span>;
                                        } else if (order.soNgayConLai <= 30) {
                                            statusBadge = <span className="status-badge amber">Còn {order.soNgayConLai} ngày</span>;
                                        } else {
                                            statusBadge = <span className="status-badge green">Còn {order.soNgayConLai} ngày</span>;
                                        }
                                        return (
                                            <tr key={idx}>
                                                <td className="font-medium">{order.maHopDong}</td>
                                                <td>{order.tenKH}</td>
                                                <td>{formatDateDisplay(order.ngayBanGiao)}</td>
                                                <td>{order.ngayHetHan ? formatDateDisplay(order.ngayHetHan) : '-'}</td>
                                                <td>{statusBadge}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
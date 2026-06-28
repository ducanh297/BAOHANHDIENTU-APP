'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    filterSheetData,
    normalizeDate,
    addMonths,
    daysBetween,
    formatDateDisplay,
    parseDetailRow,
} from '@/lib/helpers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    LayoutDashboard,
    ClipboardList,
    Package,
    ShieldCheck,
    AlertTriangle,
    XOctagon,
    Activity,
    PieChart as PieChartIcon,
    ArrowRight,
    RefreshCw,
    TrendingUp,
    Clock,
    AlertCircle
} from 'lucide-react';
import './style.css';

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalProducts: 0,
        activeProducts: 0,
        expiringProducts: 0,
        expiredProducts: 0,
        expiredRate: 0,
    });
    const [productSummary, setProductSummary] = useState([]);
    const [topExpiredProducts, setTopExpiredProducts] = useState([]);
    const [urgentOrders, setUrgentOrders] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [lastSync, setLastSync] = useState(null);

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [mainRes, detailRes, ruleRes] = await Promise.all([
                fetch('/api/sheets?type=main'),
                fetch('/api/sheets?type=detail'),
                fetch('/api/sheets?type=rule'),
            ]);
            if (!mainRes.ok || !detailRes.ok || !ruleRes.ok) {
                throw new Error('Không thể tải dữ liệu');
            }

            const mainData = await mainRes.json();
            const detailData = await detailRes.json();
            const ruleData = await ruleRes.json();

            const mainRows = mainData.values || [];
            const detailRows = detailData.values || [];
            const ruleRows = ruleData.values || [];

            // 1. Xử lý đơn hàng - lọc đơn có mã hợp đồng và ngày bàn giao hợp lệ
            const filteredMain = filterSheetData(mainRows);
            const allOrders = filteredMain
                .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
                .map(row => ({
                    maDonHang: row[0] || '',
                    tenNguoiLienHe: row[1] || '',
                    diaChiChiTiet: row[2] || '',
                    sdtKhachHang: row[3] || '',
                    maHopDong: row[4] || '',
                    ngayBanGiao: row[5] || '',
                }));

            // Lọc đơn có mã hợp đồng và ngày bàn giao hợp lệ
            const orders = allOrders.filter(o => {
                if (!o.maHopDong || o.maHopDong.trim() === '') return false;
                if (!o.ngayBanGiao) return false;
                const date = normalizeDate(o.ngayBanGiao);
                return date !== null;
            });

            const totalOrders = orders.length;

            // orderMap
            const orderMap = new Map();
            orders.forEach(o => {
                if (o.maDonHang && o.ngayBanGiao) {
                    orderMap.set(o.maDonHang, o.ngayBanGiao);
                }
            });

            // 2. Rule map
            const ruleDataMap = new Map();
            ruleRows.forEach((row, index) => {
                if (index === 0 && row.some(cell =>
                    typeof cell === 'string' &&
                    (cell.toLowerCase().includes('mã') || cell.toLowerCase().includes('thời gian'))
                )) {
                    return;
                }
                const ma = row[1]?.toString().trim();
                if (!ma) return;
                const times = [row[3], row[5], row[7], row[9], row[11]]
                    .map(v => parseInt(v?.toString().trim(), 10))
                    .filter(t => !isNaN(t) && t >= 0);
                if (times.length === 0) return;
                const maxTime = Math.max(...times);
                const thoiDiemApDungStr = row[14]?.toString().trim();
                const thoiDiemApDung = normalizeDate(thoiDiemApDungStr);
                if (!thoiDiemApDung) return;
                if (!ruleDataMap.has(ma)) {
                    ruleDataMap.set(ma, []);
                }
                ruleDataMap.get(ma).push({ thoiDiemApDung, maxTime });
            });

            for (const [ma, rules] of ruleDataMap) {
                rules.sort((a, b) => a.thoiDiemApDung - b.thoiDiemApDung);
            }

            // 3. Xử lý chi tiết
            const today = new Date();
            let totalProducts = 0;
            let activeProducts = 0;
            let expiringProducts = 0;
            let expiredProducts = 0;
            const productMap = new Map();
            // Lưu thông tin chi tiết cho từng sản phẩm (để tính top)
            const productDetails = [];

            detailRows.forEach((row) => {
                const item = parseDetailRow(row);
                if (!item) return;
                const { maDonHang, maSanPham, soLuongParsed } = item;
                if (!maDonHang || !maSanPham) return;

                const rules = ruleDataMap.get(maSanPham);
                if (!rules || rules.length === 0) return;

                if (!orderMap.has(maDonHang)) return;
                const ngayBanGiao = orderMap.get(maDonHang);
                const delivery = normalizeDate(ngayBanGiao);
                if (!delivery) return;

                let selectedRule = null;
                for (const rule of rules) {
                    if (rule.thoiDiemApDung <= delivery) {
                        if (rule.maxTime > 0) {
                            selectedRule = rule;
                        }
                    } else {
                        break;
                    }
                }
                if (!selectedRule) return;

                const thoiGianBH = selectedRule.maxTime;
                const expiry = addMonths(delivery, thoiGianBH);
                const days = daysBetween(today, expiry);

                let status = 'active';
                if (days < 0) status = 'expired';
                else if (days <= 30) status = 'expiring';

                const qty = typeof soLuongParsed === 'number' ? soLuongParsed : 0;

                totalProducts += qty;
                if (status === 'active') activeProducts += qty;
                else if (status === 'expiring') expiringProducts += qty;
                else if (status === 'expired') expiredProducts += qty;

                if (!productMap.has(maSanPham)) {
                    productMap.set(maSanPham, { total: 0, active: 0, expiring: 0, expired: 0 });
                }
                const entry = productMap.get(maSanPham);
                entry.total += qty;
                if (status === 'active') entry.active += qty;
                else if (status === 'expiring') entry.expiring += qty;
                else if (status === 'expired') entry.expired += qty;

                // Lưu chi tiết để tính top hết hạn
                if (status === 'expired') {
                    productDetails.push({ maSanPham, qty, ngayBanGiao, expiry });
                }
            });

            const productSummaryArray = Array.from(productMap.entries()).map(([maSanPham, data]) => ({
                maSanPham,
                ...data,
            }));
            productSummaryArray.sort((a, b) => a.maSanPham.localeCompare(b.maSanPham));

            // Tính top 5 sản phẩm hết hạn nhiều nhất
            const expiredMap = new Map();
            productDetails.forEach(item => {
                const current = expiredMap.get(item.maSanPham) || 0;
                expiredMap.set(item.maSanPham, current + item.qty);
            });
            const topExpired = Array.from(expiredMap.entries())
                .map(([maSanPham, count]) => ({ maSanPham, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setTopExpiredProducts(topExpired);

            // Tính các đơn hàng sắp hết hạn trong 7 ngày tới (dựa trên sản phẩm)
            const urgentMap = new Map();
            detailRows.forEach((row) => {
                const item = parseDetailRow(row);
                if (!item) return;
                const { maDonHang, maSanPham, soLuongParsed } = item;
                if (!maDonHang || !maSanPham) return;

                const rules = ruleDataMap.get(maSanPham);
                if (!rules || rules.length === 0) return;
                if (!orderMap.has(maDonHang)) return;
                const ngayBanGiao = orderMap.get(maDonHang);
                const delivery = normalizeDate(ngayBanGiao);
                if (!delivery) return;

                let selectedRule = null;
                for (const rule of rules) {
                    if (rule.thoiDiemApDung <= delivery) {
                        if (rule.maxTime > 0) {
                            selectedRule = rule;
                        }
                    } else {
                        break;
                    }
                }
                if (!selectedRule) return;

                const thoiGianBH = selectedRule.maxTime;
                const expiry = addMonths(delivery, thoiGianBH);
                const days = daysBetween(today, expiry);
                if (days >= 0 && days <= 7) {
                    if (!urgentMap.has(maDonHang)) {
                        const order = orders.find(o => o.maDonHang === maDonHang);
                        if (order) {
                            urgentMap.set(maDonHang, {
                                maDonHang,
                                maHopDong: order.maHopDong,
                                tenNguoiLienHe: order.tenNguoiLienHe,
                                sdtKhachHang: order.sdtKhachHang,
                                ngayBanGiao: order.ngayBanGiao,
                                daysLeft: days,
                            });
                        }
                    }
                }
            });

            const urgentList = Array.from(urgentMap.values())
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 5);
            setUrgentOrders(urgentList);

            const expiredRate = totalProducts > 0 ? Math.round((expiredProducts / totalProducts) * 100) : 0;

            setStats({
                totalOrders,
                totalProducts,
                activeProducts,
                expiringProducts,
                expiredProducts,
                expiredRate,
            });
            setProductSummary(productSummaryArray);

            // 4. Đơn hàng gần đây (5 đơn)
            const sortedOrders = orders
                .filter(o => o.ngayBanGiao)
                .sort((a, b) => new Date(b.ngayBanGiao) - new Date(a.ngayBanGiao))
                .slice(0, 5);
            setRecentOrders(sortedOrders);

            // 5. Biểu đồ cột theo tháng
            const monthCounts = {};
            orders.forEach(order => {
                if (!order.maHopDong || order.maHopDong.trim() === '' || !order.ngayBanGiao) return;
                const delivery = normalizeDate(order.ngayBanGiao);
                if (!delivery) return;
                const key = `${delivery.getFullYear()}-${String(delivery.getMonth() + 1).padStart(2, '0')}`;
                monthCounts[key] = (monthCounts[key] || 0) + 1;
            });
            const monthData = Object.keys(monthCounts)
                .sort()
                .map(key => ({ month: key, count: monthCounts[key] }));
            setMonthlyData(monthData);

            setLastSync(Date.now());
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

    // Dữ liệu cho biểu đồ tròn
    const pieData = [
        { name: 'Còn hạn', value: stats.activeProducts },
        { name: 'Sắp hết hạn', value: stats.expiringProducts },
        { name: 'Hết hạn', value: stats.expiredProducts },
    ].filter(item => item.value > 0);

    // Custom label bên ngoài có line chỉ
    const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 20;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const percentText = `${(percent * 100).toFixed(1)}%`;

        return (
            <text
                x={x}
                y={y}
                fill="#333"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize={12}
                fontWeight="600"
            >
                {`${name} ${percentText}`}
            </text>
        );
    };

    if (loading && !refreshing) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content"><div className="status-box">Đang tải dữ liệu...</div></div>
            </div>
        );
    }

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                {/* Header */}
                <div className="page-header">
                    <h1><LayoutDashboard size={28} className="text-accent" /> DASHBOARD QUẢN LÝ</h1>
                    <div className="header-right">
                        <span>Đồng bộ lúc: {lastSync ? new Date(lastSync).toLocaleString('vi-VN', { hour12: false }) : 'Chưa đồng bộ'}</span>
                        <button
                            onClick={handleRefresh}
                            className="btn-refresh"
                            disabled={refreshing}
                        >
                            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                            {refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
                        </button>
                    </div>
                </div>

                {/* 6 Card thống kê */}
                <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-blue"><ClipboardList size={26} /></div>
                        <div className="stat-info">
                            <h3>Tổng đơn hàng</h3>
                            <p className="stat-number">{stats.totalOrders}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-indigo"><Package size={26} /></div>
                        <div className="stat-info">
                            <h3>Tổng sản phẩm</h3>
                            <p className="stat-number">{stats.totalProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-green"><ShieldCheck size={26} /></div>
                        <div className="stat-info">
                            <h3>Còn bảo hành</h3>
                            <p className="stat-number">{stats.activeProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-amber"><AlertTriangle size={26} /></div>
                        <div className="stat-info">
                            <h3>Sắp hết hạn</h3>
                            <p className="stat-number">{stats.expiringProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-red"><XOctagon size={26} /></div>
                        <div className="stat-info">
                            <h3>Đã hết hạn</h3>
                            <p className="stat-number">{stats.expiredProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-purple"><TrendingUp size={26} /></div>
                        <div className="stat-info">
                            <h3>Tỷ lệ hết hạn</h3>
                            <p className="stat-number">{stats.expiredRate}%</p>
                        </div>
                    </div>
                </div>

                {/* Biểu đồ */}
                <div className="chart-grid">
                    <div className="chart-box">
                        <div className="chart-header">
                            <Activity size={20} className="text-blue" />
                            <h4>Số đơn hàng theo tháng</h4>
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
                            <h4>Tình trạng bảo hành (sản phẩm)</h4>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                    labelLine={true}
                                    label={renderCustomizedLabel}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} sản phẩm`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hai bảng cảnh báo và top sản phẩm */}
                <div className="chart-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 32 }}>
                    <div className="chart-box">
                        <div className="chart-header">
                            <AlertCircle size={20} className="text-red" />
                            <h4>⚠️ Đơn hàng sắp hết hạn (7 ngày)</h4>
                        </div>
                        {urgentOrders.length === 0 ? (
                            <p className="cell-center" style={{ padding: '20px 0', color: '#64748b' }}>Không có đơn hàng nào sắp hết hạn</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {urgentOrders.map((order, idx) => (
                                    <li key={idx} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{order.maHopDong}</strong> - {order.tenNguoiLienHe}
                                        </div>
                                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {order.daysLeft} ngày
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="chart-box">
                        <div className="chart-header">
                            <Clock size={20} className="text-amber" />
                            <h4>Top 5 sản phẩm hết hạn nhiều nhất</h4>
                        </div>
                        {topExpiredProducts.length === 0 ? (
                            <p className="cell-center" style={{ padding: '20px 0', color: '#64748b' }}>Không có sản phẩm hết hạn</p>
                        ) : (
                            <div>
                                {topExpiredProducts.map((item, idx) => {
                                    const max = topExpiredProducts[0]?.count || 1;
                                    const pct = (item.count / max) * 100;
                                    return (
                                        <div key={idx} style={{ marginBottom: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <span>{item.maSanPham}</span>
                                                <span>{item.count} sp</span>
                                            </div>
                                            <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 6, height: 8 }}>
                                                <div style={{ width: `${pct}%`, background: '#ef4444', borderRadius: 6, height: 8 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bảng tổng hợp sản phẩm */}
                <div className="recent-orders-section mt-24">
                    <div className="section-head-row">
                        <h3><Package size={20} className="text-accent" /> Tổng hợp số lượng theo mã sản phẩm</h3>
                    </div>
                    <div className="table-wrap">
                        <table className="bordered-table">
                            <thead>
                                <tr>
                                    <th>Mã sản phẩm</th>
                                    <th>Tổng số lượng</th>
                                    <th>Còn bảo hành</th>
                                    <th>Sắp hết hạn</th>
                                    <th>Đã hết hạn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productSummary.length === 0 ? (
                                    <tr><td colSpan="5" className="cell-center">Không có sản phẩm nào</td></tr>
                                ) : (
                                    productSummary.map((item) => (
                                        <tr key={item.maSanPham}>
                                            <td className="font-medium">{item.maSanPham}</td>
                                            <td className="cell-center">{item.total}</td>
                                            <td className="cell-center">{item.active}</td>
                                            <td className="cell-center">{item.expiring}</td>
                                            <td className="cell-center">{item.expired}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bảng đơn hàng gần đây */}
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
                                    <th>Số điện thoại</th>
                                    <th>Địa chỉ</th>
                                    <th>Ngày bàn giao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.length === 0 ? (
                                    <tr><td colSpan="5" className="cell-center">Không có dữ liệu</td></tr>
                                ) : (
                                    recentOrders.map((order, idx) => (
                                        <tr key={idx}>
                                            <td className="font-medium">{order.maHopDong}</td>
                                            <td>{order.tenNguoiLienHe}</td>
                                            <td>{order.sdtKhachHang}</td>
                                            <td>{order.diaChiChiTiet}</td>
                                            <td>{formatDateDisplay(order.ngayBanGiao)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
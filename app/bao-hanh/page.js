'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateDisplay, escapeHtml, normalizeDate, filterSheetData, parseDetailRow } from '@/lib/helpers';
import ChiTietDonHang from '@/components/chitietdonhang/page';// Import bộ icon đồng bộ từ lucide-react
import {
    ShieldCheck,
    RefreshCw,
    Search,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    Calendar,
    User,
    FileText,
    Eye
} from 'lucide-react';
import './style.css'; // 👈 import CSS riêng

const PAGE_SIZE = 50;
const CACHE_KEY_ORDERS = 'baoHanhOrders';
const CACHE_TIMESTAMP_KEY = 'baoHanhTimestamp';
const CACHE_TTL = 2 * 60 * 1000;

export default function BaoHanhPage() {
    const router = useRouter();

    // Kiểm tra đăng nhập
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
        const now = Date.now();
        const expireTime = 8 * 60 * 60 * 1000;
        if (now - loginTime > expireTime) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('loginTime');
            router.push('/login');
            return;
        }
    }, [router]);

    const [orders, setOrders] = useState([]);
    const [detailRows, setDetailRows] = useState([]);
    const [ruleRows, setRuleRows] = useState([]);
    const [historyRows, setHistoryRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false); // thêm dòng này
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal state
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Filter states
    const [filterMaHopDong, setFilterMaHopDong] = useState('');
    const [filterTenKH, setFilterTenKH] = useState('');
    const [filterSDT, setFilterSDT] = useState('');
    const [filterNgayBanGiao, setFilterNgayBanGiao] = useState('');
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const chucDanh = localStorage.getItem('chucDanh') || '';
        setUserRole(chucDanh.toLowerCase());
    }, []);

    // Fetch cả 3 sheet + history, chỉ cache orders
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const [mainRes, detailRes, ruleRes, historyRes] = await Promise.all([
                fetch('/api/sheets?type=main'),
                fetch('/api/sheets?type=detail'),
                fetch('/api/sheets?type=rule'),
                fetch('/api/sheets?type=history'),
            ]);
            if (!mainRes.ok || !detailRes.ok || !ruleRes.ok || !historyRes.ok) {
                throw new Error('Không thể tải dữ liệu');
            }

            const mainData = await mainRes.json();
            const detailData = await detailRes.json();
            const ruleData = await ruleRes.json();
            const historyData = await historyRes.json();

            const mainRows = mainData.values || [];
            const detailRowsRaw = detailData.values || [];
            const ruleRowsRaw = ruleData.values || [];
            const historyRowsRaw = historyData.values || [];

            const filteredMain = filterSheetData(mainRows);
            const orderList = filteredMain
                .filter(row => row.some(cell => cell && cell.toString().trim() !== ''))
                .map(row => ({
                    maDonHang: row[0] || '',
                    tenNguoiLienHe: row[1] || '',
                    diaChiChiTiet: row[2] || '',
                    sdtKhachHang: row[3] || '',
                    maHopDong: row[4] || '',
                    ngayBanGiao: row[5] || '',
                }))
                .filter(order => order.maDonHang.trim() !== '');

            setOrders(orderList);
            setDetailRows(detailRowsRaw);
            setRuleRows(ruleRowsRaw);
            setHistoryRows(historyRowsRaw);

            try {
                localStorage.setItem(CACHE_KEY_ORDERS, JSON.stringify(orderList));
                localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
            } catch (e) {
                console.warn('Không thể cache orders:', e);
            }
            setLastSync(Date.now());

            return { orders: orderList, detailRows: detailRowsRaw, ruleRows: ruleRowsRaw, historyRows: historyRowsRaw };
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Load từ cache (chỉ orders) và fetch detail+rule+history nếu cần
    const loadData = useCallback(async () => {
        try {
            const cachedOrders = localStorage.getItem(CACHE_KEY_ORDERS);
            const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            const now = Date.now();

            if (cachedOrders && timestamp && (now - parseInt(timestamp, 10)) < CACHE_TTL) {
                const ordersList = JSON.parse(cachedOrders);
                setOrders(ordersList);
                setLastSync(parseInt(timestamp, 10));
                setLoading(false);

                try {
                    const [detailRes, ruleRes, historyRes] = await Promise.all([
                        fetch('/api/sheets?type=detail'),
                        fetch('/api/sheets?type=rule'),
                        fetch('/api/sheets?type=history'),
                    ]);
                    if (detailRes.ok && ruleRes.ok && historyRes.ok) {
                        const detailData = await detailRes.json();
                        const ruleData = await ruleRes.json();
                        const historyData = await historyRes.json();
                        setDetailRows(detailData.values || []);
                        setRuleRows(ruleData.values || []);
                        setHistoryRows(historyData.values || []);
                        setLastSync(Date.now());
                    }
                } catch (e) {
                    // không sao, vẫn dùng orders từ cache
                }
            } else {
                await fetchAllData();
            }
        } catch (err) {
            await fetchAllData();
        }
    }, [fetchAllData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchAllData().catch(() => { });
        }, CACHE_TTL);
        return () => clearInterval(interval);
    }, [fetchAllData]);

    // Lọc và phân trang
    const filteredOrders = useMemo(() => {
        let result = orders;
        if (filterMaHopDong.trim()) {
            const keyword = filterMaHopDong.trim().toLowerCase();
            result = result.filter(o => o.maHopDong.toLowerCase().includes(keyword));
        }
        if (filterTenKH.trim()) {
            const keyword = filterTenKH.trim().toLowerCase();
            result = result.filter(o => o.tenNguoiLienHe.toLowerCase().includes(keyword));
        }
        if (filterSDT.trim()) {
            const keyword = filterSDT.trim();
            result = result.filter(o => o.sdtKhachHang.includes(keyword));
        }
        if (filterNgayBanGiao.trim()) {
            const filterDate = normalizeDate(filterNgayBanGiao);
            if (filterDate) {
                result = result.filter(o => {
                    const orderDate = normalizeDate(o.ngayBanGiao);
                    return orderDate && orderDate.getTime() === filterDate.getTime();
                });
            }
        }
        return result;
    }, [orders, filterMaHopDong, filterTenKH, filterSDT, filterNgayBanGiao]);

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredOrders.slice(start, start + PAGE_SIZE);
    }, [filteredOrders, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterMaHopDong, filterTenKH, filterSDT, filterNgayBanGiao]);

    const handleClearFilters = () => {
        setFilterMaHopDong('');
        setFilterTenKH('');
        setFilterSDT('');
        setFilterNgayBanGiao('');
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchAllData();
        } finally {
            setRefreshing(false);
        }
    };

    const formatSyncTime = (timestamp) => {
        if (!timestamp) return 'Chưa đồng bộ';
        return new Date(timestamp).toLocaleString('vi-VN', { hour12: false });
    };

    const handleViewDetail = (maDonHang) => {
        const mainData = orders.find(o => o.maDonHang === maDonHang);
        if (!mainData) return;

        const detailRowsForOrder = detailRows
            .filter(row => String(row[1] || '').trim() === maDonHang)
            .sort((a, b) => String(a[2] || '').localeCompare(String(b[2] || ''), undefined, { numeric: true }));

        const parsedDetails = detailRowsForOrder.map(parseDetailRow);

        setSelectedOrder({
            main: mainData,
            details: parsedDetails,
            rules: ruleRows,
            history: historyRows,
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    if (loading && orders.length === 0) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content">
                    <div className="status-box">Đang tải danh sách đơn hàng...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                {/* Header */}
                <div className="header-row">
                    <h2><ShieldCheck size={28} className="text-accent" />QUẢN LÝ THÔNG TIN BẢO HÀNH</h2>
                    <div className="header-right">
                        <span>Đồng bộ lúc: {formatSyncTime(lastSync)}</span>
                        <button onClick={handleRefresh} className="btn-refresh" disabled={refreshing}>
                            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                            {refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="error-box">{error}</div>
                )}

                {/* Bộ lọc */}
                <div className="filter-container">
                    <div className="filter-group">
                        <label>Mã hợp đồng</label>
                        <input
                            type="text"
                            value={filterMaHopDong}
                            onChange={e => setFilterMaHopDong(e.target.value)}
                            placeholder="Nhập mã hợp đồng..."
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Tên khách hàng</label>
                        <input
                            type="text"
                            value={filterTenKH}
                            onChange={e => setFilterTenKH(e.target.value)}
                            placeholder="Nhập tên..."
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Số điện thoại</label>
                        <input
                            type="text"
                            value={filterSDT}
                            onChange={e => setFilterSDT(e.target.value)}
                            placeholder="Nhập số điện thoại..."
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Ngày bàn giao</label>
                        <input
                            type="date"
                            value={filterNgayBanGiao}
                            onChange={e => setFilterNgayBanGiao(e.target.value)}
                            className="filter-input"
                        />
                    </div>
                    <div className="filter-actions">
                        <button onClick={handleClearFilters} className="btn-clear-filters">
                            Xoá lọc
                        </button>
                    </div>
                </div>

                {/* Bảng */}
                <div className="table-wrap">
                    <table className="bordered-table">
                        <thead>
                            <tr>
                                <th style={{ width: '18%' }}>Mã hợp đồng</th>
                                <th style={{ width: '16%' }}>Tên khách hàng</th>
                                <th style={{ width: '16%' }}>Số điện thoại</th>
                                <th style={{ width: '28%' }}>Địa chỉ</th>
                                <th style={{ width: '12%' }}>Ngày bàn giao</th>
                                <th style={{ width: '10%' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="cell-center">Không tìm thấy đơn hàng nào</td>
                                </tr>
                            ) : (
                                paginatedItems.map((order, idx) => (
                                    <tr key={idx}>
                                        <td className="cell-left">{escapeHtml(order.maHopDong)}</td>
                                        <td className="cell-left">{escapeHtml(order.tenNguoiLienHe)}</td>
                                        <td className="cell-center">{escapeHtml(order.sdtKhachHang)}</td>
                                        <td className="cell-left">{escapeHtml(order.diaChiChiTiet)}</td>
                                        <td className="cell-center">{formatDateDisplay(order.ngayBanGiao)}</td>
                                        <td className="cell-center">
                                            <button
                                                onClick={() => handleViewDetail(order.maDonHang)}
                                                className="guide-link btn-view"
                                            >
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang */}
                <div className="pagination-container">
                    <div className="pagination-info">
                        Hiển thị {paginatedItems.length} / {filteredOrders.length} đơn hàng
                    </div>
                    <div className="pagination-controls">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            <ChevronLeft size={16} /> Trước
                        </button>
                        <span className="pagination-page">
                            Trang {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            Sau <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="sync-info">
                    Dữ liệu được tự động cập nhật mỗi 2 phút.
                </div>
            </div>

            {/* Modal */}
            {showModal && selectedOrder && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <ChiTietDonHang
                            maDonHang={selectedOrder.main.maDonHang}
                            mainData={selectedOrder.main}
                            detailItems={selectedOrder.details}
                            ruleRows={selectedOrder.rules}
                            historyRows={selectedOrder.history}
                            userRole={userRole}
                            onClose={handleCloseModal}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
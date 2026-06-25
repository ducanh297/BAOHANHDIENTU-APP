'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateDisplay, escapeHtml, normalizeDate, filterSheetData, parseDetailRow } from '@/lib/helpers';
import ChiTietDonHang from '@/components/ChiTietDonHang';

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
        // (Tuỳ chọn) kiểm tra thời gian hết hạn (ví dụ 8 giờ)
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
        const now = Date.now();
        const expireTime = 8 * 60 * 60 * 1000; // 8 giờ
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

            // Chỉ cache orders
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

                // Vẫn fetch detail, rule, history để có sẵn (không chặn loading)
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

    // Lọc và phân trang (giữ nguyên)
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
        await fetchAllData();
    };

    const formatSyncTime = (timestamp) => {
        if (!timestamp) return 'Chưa đồng bộ';
        return new Date(timestamp).toLocaleString('vi-VN', { hour12: false });
    };

    // Khi bấm Xem – dùng dữ liệu đã có trong state
    const handleViewDetail = (maDonHang) => {
        const mainData = orders.find(o => o.maDonHang === maDonHang);
        if (!mainData) return;

        // Lọc detail từ state
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
            <div className="page-shell">
                <div className="content">
                    <div className="status-box">Đang tải danh sách đơn hàng...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="content">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ margin: 0 }}>Quản lý đơn hàng bảo hành</h2>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        <span>Đồng bộ lúc: {formatSyncTime(lastSync)}</span>
                        <button
                            onClick={handleRefresh}
                            style={{
                                marginLeft: '12px',

                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',

                                padding: '8px 16px',

                                borderRadius: '999px',

                                border: '1px solid rgba(37,99,235,0.25)',

                                background:
                                    'linear-gradient(135deg,#eff6ff,#dbeafe)',

                                color: '#1d4ed8',

                                fontSize: '13px',

                                fontWeight: '700',

                                cursor: 'pointer',

                                boxShadow:
                                    '0 6px 16px rgba(37,99,235,0.15)',

                                transition:
                                    'all 0.25s ease',

                                whiteSpace: 'nowrap',
                            }}

                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow =
                                    '0 10px 22px rgba(37,99,235,0.25)';
                            }}

                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow =
                                    '0 6px 16px rgba(37,99,235,0.15)';
                            }}

                        >
                            🔄 Làm mới
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '10px', background: '#fee', color: '#b91c1c', borderRadius: '8px', marginTop: '12px' }}>
                        {error}
                    </div>
                )}

                {/* Bộ lọc */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginTop: '16px',
                    padding: '16px',
                    background: 'var(--bg-2)',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                }}>
                    <div style={{ flex: '1 1 180px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Mã hợp đồng</label>
                        <input
                            type="text"
                            value={filterMaHopDong}
                            onChange={e => setFilterMaHopDong(e.target.value)}
                            placeholder="Nhập mã hợp đồng..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Tên khách hàng</label>
                        <input
                            type="text"
                            value={filterTenKH}
                            onChange={e => setFilterTenKH(e.target.value)}
                            placeholder="Nhập tên..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Số điện thoại</label>
                        <input
                            type="text"
                            value={filterSDT}
                            onChange={e => setFilterSDT(e.target.value)}
                            placeholder="Nhập số điện thoại..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Ngày bàn giao</label>
                        <input
                            type="date"
                            value={filterNgayBanGiao}
                            onChange={e => setFilterNgayBanGiao(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', fontSize: '14px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <button
                            onClick={handleClearFilters}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',

                                padding: '9px 18px',

                                borderRadius: '999px',

                                border: '1px solid rgba(239,68,68,0.25)',

                                background:
                                    'linear-gradient(135deg, #fee2e2, #fecaca)',

                                color: '#dc2626',

                                fontWeight: '700',

                                fontSize: '14px',

                                cursor: 'pointer',

                                boxShadow:
                                    '0 6px 16px rgba(239,68,68,0.15)',

                                transition:
                                    'all 0.25s ease',

                                whiteSpace: 'nowrap',

                            }}

                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow =
                                    '0 10px 22px rgba(239,68,68,0.25)';
                            }}

                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow =
                                    '0 6px 16px rgba(239,68,68,0.15)';
                            }}

                        >
                            Xoá lọc
                        </button>
                    </div>
                </div>

                {/* Bảng */}
                <div className="table-wrap" style={{ marginTop: '16px' }}>
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
                                                className="guide-link"
                                                style={{ fontSize: '12px', padding: '4px 12px', cursor: 'pointer' }}
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
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '16px',
                    flexWrap: 'wrap',
                    gap: '8px',
                }}>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        Hiển thị {paginatedItems.length} / {filteredOrders.length} đơn
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid var(--line-strong)',
                                background: '#fff',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1,
                            }}
                        >
                            ◀ Trang trước
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                            Trang {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid var(--line-strong)',
                                background: '#fff',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.5 : 1,
                            }}
                        >
                            Trang sau ▶
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('isLoggedIn');
                                localStorage.removeItem('username');
                                localStorage.removeItem('loginTime');
                                router.push('/login');
                            }}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: '#fff',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)', textAlign: 'right' }}>
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

            <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-container {
          background: white;
          border-radius: 20px;
          max-width: 1100px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 20px;
          position: relative;
        }
        @media (max-width: 640px) {
          .modal-overlay { padding: 10px; }
          .modal-container { padding: 12px; }
        }
      `}</style>
        </div>
    );
}
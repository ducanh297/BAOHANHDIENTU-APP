'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { filterSheetData, parseHistoryRow, formatDateDisplay, escapeHtml, normalizeDate } from '@/lib/helpers';
import './style.css';

export default function WarrantyHistoryPopup({
    maSanPham,
    detailIds = [],
    detailIdToMaDonHang = new Map(),
    maDonHangToMaHopDong = new Map(),
    onClose
}) {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState([]);
    const [error, setError] = useState(null);

    // Filter states
    const [filterMaHopDong, setFilterMaHopDong] = useState('');
    const [filterNgayTiepNhan, setFilterNgayTiepNhan] = useState('');
    const [filterNgayBaoHanh, setFilterNgayBaoHanh] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        const fetchHistory = async () => {
            if (!detailIds || detailIds.length === 0) {
                setHistoryData([]);
                setLoading(false);
                return;
            }
            try {
                const res = await fetch('/api/sheets/history');
                if (!res.ok) throw new Error('Không thể tải lịch sử bảo hành');
                const data = await res.json();
                const rows = data.values || [];
                const filtered = filterSheetData(rows);
                const parsed = filtered.map(parseHistoryRow);
                const idSet = new Set(detailIds);
                const result = parsed.filter(h => idSet.has(h.idRef));
                setHistoryData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [detailIds]);

    // Thêm dữ liệu maHopDong và các trường ngày tháng để lọc
    const historyWithExtra = useMemo(() => {
        return historyData.map(h => {
            const maDonHang = detailIdToMaDonHang.get(h.idRef) || '';
            const maHopDong = maDonHangToMaHopDong.get(maDonHang) || '';
            return { ...h, maDonHang, maHopDong };
        });
    }, [historyData, detailIdToMaDonHang, maDonHangToMaHopDong]);

    // Lọc dữ liệu
    const filteredData = useMemo(() => {
        let result = historyWithExtra;

        // Lọc theo mã hợp đồng
        if (filterMaHopDong.trim()) {
            const keyword = filterMaHopDong.trim().toLowerCase();
            result = result.filter(h => h.maHopDong.toLowerCase().includes(keyword));
        }

        // Lọc theo ngày tiếp nhận
        if (filterNgayTiepNhan) {
            const filterDate = normalizeDate(filterNgayTiepNhan);
            if (filterDate) {
                result = result.filter(h => {
                    const date = normalizeDate(h.ngayTiepNhan);
                    return date && date.getTime() === filterDate.getTime();
                });
            }
        }

        // Lọc theo ngày bảo hành
        if (filterNgayBaoHanh) {
            const filterDate = normalizeDate(filterNgayBaoHanh);
            if (filterDate) {
                result = result.filter(h => {
                    const date = normalizeDate(h.ngayBaoHanh);
                    return date && date.getTime() === filterDate.getTime();
                });
            }
        }

        return result;
    }, [historyWithExtra, filterMaHopDong, filterNgayTiepNhan, filterNgayBaoHanh]);

    // Phân trang
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Reset về trang 1 khi thay đổi bộ lọc
    useEffect(() => {
        setCurrentPage(1);
    }, [filterMaHopDong, filterNgayTiepNhan, filterNgayBaoHanh]);

    // Xóa tất cả bộ lọc
    const clearFilters = () => {
        setFilterMaHopDong('');
        setFilterNgayTiepNhan('');
        setFilterNgayBaoHanh('');
    };

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-container" onClick={e => e.stopPropagation()}>
                <div className="popup-header">
                    <h4>Lịch sử bảo hành mã sản phẩm {maSanPham}</h4>
                    <button className="popup-close" onClick={onClose}>✕</button>
                </div>

                <div className="popup-body">
                    {/* Bộ lọc */}
                    <div className="filter-container">
                        <div className="filter-group">
                            <label>Mã hợp đồng</label>
                            <input
                                type="text"
                                value={filterMaHopDong}
                                onChange={(e) => setFilterMaHopDong(e.target.value)}
                                placeholder="Nhập mã hợp đồng..."
                                className="filter-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Ngày tiếp nhận</label>
                            <input
                                type="date"
                                value={filterNgayTiepNhan}
                                onChange={(e) => setFilterNgayTiepNhan(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Ngày bảo hành</label>
                            <input
                                type="date"
                                value={filterNgayBaoHanh}
                                onChange={(e) => setFilterNgayBaoHanh(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <div className="filter-actions">
                            <button onClick={clearFilters} className="btn-clear-filters">
                                Xóa lọc
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="status-box">Đang tải...</div>
                    ) : error ? (
                        <div className="error-box">{error}</div>
                    ) : filteredData.length === 0 ? (
                        <div className="status-box">Không có lịch sử bảo hành cho sản phẩm này</div>
                    ) : (
                        <>
                            <div className="table-wrap">
                                <table className="bordered-table history-table">
                                    <thead>
                                        <tr>
                                            <th>Mã hợp đồng</th>
                                            <th>Nội dung</th>
                                            <th>Người thực hiện</th>
                                            <th>Kết quả</th>
                                            <th>Trạng thái</th>
                                            <th>Ngày tiếp nhận</th>
                                            <th>Ngày bảo hành</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((h, idx) => (
                                            <tr key={idx}>
                                                <td>{h.maHopDong}</td>
                                                <td>{escapeHtml(h.noiDungBaoHanh)}</td>
                                                <td>{escapeHtml(h.nguoiThucHien)}</td>
                                                <td>{escapeHtml(h.ketQua)}</td>
                                                <td>{escapeHtml(h.trangThai)}</td>
                                                <td>{formatDateDisplay(h.ngayTiepNhan)}</td>
                                                <td>{formatDateDisplay(h.ngayBaoHanh)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phân trang */}
                            {totalPages > 1 && (
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Hiển thị {paginatedData.length} / {filteredData.length} bản ghi
                                    </div>
                                    <div className="pagination-controls">
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="pagination-btn"
                                        >
                                            <ChevronLeft size={16} /> Trước
                                        </button>
                                        <span className="pagination-page">
                                            Trang {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="pagination-btn"
                                        >
                                            Sau <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
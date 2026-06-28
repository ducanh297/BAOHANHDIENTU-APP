'use client';

import React, { useEffect, useState } from 'react';
import {
    escapeHtml,
    normalizeDate,
    formatDateDisplay,
    getValue,
    addMonths,
    daysBetween,
    formatDescription,
    sanitizeUrl,
    getWarrantyStatusClass,
    filterSheetData,
    parseDetailRow,
    parseHistoryRow,
    formatDateForSheet,
} from '@/lib/helpers';
import './style.css';

const formatDateInput = (dateStr) => {
    if (!dateStr) return '';
    const date = normalizeDate(dateStr);
    if (!date) return '';
    return date.toISOString().split('T')[0];
};

export default function ChiTietDonHang({
    maDonHang,
    mainData,
    detailItems,
    ruleRows,
    historyRows: initialHistoryRows,
    userRole = '',
    onClose,
}) {
    const isAdmin = userRole === 'cskh';
    const [loading, setLoading] = useState(!mainData || !detailItems);
    const [error, setError] = useState(null);
    const [warrantyMain, setWarrantyMain] = useState(mainData || null);
    const [warrantyItems, setWarrantyItems] = useState(detailItems || []);
    const [warrantyRules, setWarrantyRules] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [expandedHistory, setExpandedHistory] = useState({});

    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [showFormPopup, setShowFormPopup] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        noi_dung_bao_hanh: '',
        nguoi_thuc_hien: '',
        ket_qua: '',
        trang_thai: 'Đã tiếp nhận thông tin',
        ngay_tiep_nhan: '',
        ngay_bao_hanh: '',
    });
    const [currentIdRef, setCurrentIdRef] = useState(null);

    // Parse history
    useEffect(() => {
        if (initialHistoryRows && initialHistoryRows.length) {
            const filtered = filterSheetData(initialHistoryRows);
            const parsed = filtered.map(parseHistoryRow);
            setHistoryData(parsed);
        }
    }, [initialHistoryRows]);

    // Xử lý ruleRows
    useEffect(() => {
        if (ruleRows && ruleRows.length) {
            const headers = ruleRows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
            const rules = ruleRows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, idx) => { obj[header] = row[idx] ?? ''; });
                return obj;
            });
            setWarrantyRules(rules);
        }
    }, [ruleRows]);

    // Fallback fetch
    useEffect(() => {
        if (mainData && detailItems) {
            setLoading(false);
            return;
        }
        if (!maDonHang) return;

        const fetchFallback = async () => {
            try {
                setLoading(true);
                setError(null);

                const [mainRes, detailRes, ruleRes] = await Promise.all([
                    fetch(`/api/sheets?type=main`),
                    fetch(`/api/sheets?type=detail`),
                    fetch(`/api/sheets?type=rule`),
                ]);
                if (!mainRes.ok || !detailRes.ok || !ruleRes.ok) throw new Error('Không thể tải dữ liệu');

                const mainDataRaw = await mainRes.json();
                const detailDataRaw = await detailRes.json();
                const ruleDataRaw = await ruleRes.json();

                const mainRows = mainDataRaw.values || [];
                const detailRowsRaw = detailDataRaw.values || [];
                const ruleRowsRaw = ruleDataRaw.values || [];

                const filteredMain = filterSheetData(mainRows);
                const mainRow = filteredMain.find(r => (r[0] || '') === maDonHang);
                if (!mainRow) {
                    setError(`Không tìm thấy đơn hàng: ${escapeHtml(maDonHang)}`);
                    setLoading(false);
                    return;
                }
                setWarrantyMain({
                    maDonHang: mainRow[0] || '',
                    tenNguoiLienHe: mainRow[1] || '',
                    diaChiChiTiet: mainRow[2] || '',
                    sdtKhachHang: mainRow[3] || '',
                    maHopDong: mainRow[4] || '',
                    ngayBanGiao: mainRow[5] || '',
                });

                const filteredRule = filterSheetData(ruleRowsRaw);
                if (filteredRule.length) {
                    const headers = filteredRule[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
                    const rules = filteredRule.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, idx) => { obj[header] = row[idx] ?? ''; });
                        return obj;
                    });
                    setWarrantyRules(rules);
                }

                const filteredDetail = filterSheetData(detailRowsRaw);
                const detailRowsForOrder = filteredDetail
                    .filter(row => String(row[1] || '').trim() === maDonHang)
                    .sort((a, b) => String(a[2] || '').localeCompare(String(b[2] || ''), undefined, { numeric: true }));
                const items = detailRowsForOrder.map(parseDetailRow);
                setWarrantyItems(items);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFallback();
    }, [maDonHang, mainData, detailItems]);

    // Helper functions
    const getApplicableRule = (maSanPham, ngayBanGiao) => {
        const productCode = String(maSanPham || '').trim();
        if (!productCode || !warrantyRules.length) return null;

        const targetDate = normalizeDate(ngayBanGiao);

        const matched = warrantyRules
            .filter((rule) => String(getValue(rule, 'ma_san_pham', 'masanpham')).trim() === productCode)
            .map((rule) => ({
                ...rule,
                _applyDate: normalizeDate(getValue(rule, 'thoi_diem_ap_dung', 'thoi_diemap_dung')),
            }))
            .filter((rule) => rule._applyDate);

        if (!matched.length) return null;

        if (targetDate) {
            const validRules = matched
                .filter((rule) => rule._applyDate <= targetDate)
                .sort((a, b) => b._applyDate - a._applyDate);
            if (validRules.length) return validRules[0];
        }

        return matched.sort((a, b) => b._applyDate - a._applyDate)[0];
    };

    const buildGuideButton = (url) => {
        const safeUrl = sanitizeUrl(url);
        if (!safeUrl) return '<span style="color:var(--muted);">—</span>';
        return `<a class="guide-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Xem</a>`;
    };

    const buildWarrantyMiniTable = (rule, ngayBanGiao) => {
        if (!rule) return '';

        const deliveryDate = normalizeDate(ngayBanGiao);
        const rowsHtml = [];

        for (let index = 1; index <= 5; index++) {
            const criterion = getValue(rule, `tieu_chi_bao_hanh_${index}`, `tieu_chi_bao_hanh${index}`, `tieu_chi_${index}`);
            const monthsRaw = getValue(rule, `time_${index}`, `time${index}`);
            const monthsParsed = parseFloat(String(monthsRaw).replace(',', '.'));

            if (!criterion && (monthsRaw === '' || monthsRaw === null || monthsRaw === undefined)) {
                continue;
            }

            let expiryText = '';
            let remainingText = '-';
            let statusClass = '';

            if (!deliveryDate) {
                expiryText = 'Chưa kích hoạt';
                remainingText = '-';
                statusClass = 'is-warning';
            } else if (!isNaN(monthsParsed)) {
                const expiryDate = addMonths(deliveryDate, monthsParsed);
                const remainingDays = daysBetween(new Date(), expiryDate);
                expiryText = formatDateDisplay(expiryDate);
                statusClass = getWarrantyStatusClass(remainingDays);

                if (remainingDays > 0) {
                    remainingText = `<span class="warranty-icon">⏰</span><span>${remainingDays} ngày</span>`;
                } else if (remainingDays === 0) {
                    remainingText = `<span class="warranty-icon">⚠️</span><span>Hết hạn hôm nay</span>`;
                    statusClass = 'is-warning';
                } else {
                    remainingText = `<span class="warranty-icon">❌</span><span>Hết hạn bảo hành</span>`;
                    statusClass = 'is-expired';
                }
            } else {
                expiryText = '-';
            }

            rowsHtml.push(`
        <tr>
          <td>${criterion ? `<span class="warranty-criterion">${escapeHtml(criterion)}</span>` : '<span style="color:var(--muted);">—</span>'}</td>
          <td class="cell-center"><span class="warranty-date ${statusClass}">${escapeHtml(expiryText)}</span></td>
          <td class="cell-center">${remainingText !== '-' ? `<span class="warranty-remaining ${statusClass}">${remainingText}</span>` : '<span class="warranty-remaining">-</span>'}</td>
        </tr>
      `);
        }

        if (!rowsHtml.length) return '';

        return `
      <div class="warranty-panel">
        <table>
          <thead>
            <tr>
              <th class="cell-left">Tiêu chí bảo hành</th>
              <th style="width: 20%;" class="cell-center">Hạn bảo hành</th>
              <th style="width: 20%;" class="cell-center">Còn lại</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.join('')}
          </tbody>
        </table>
      </div>
    `;
    };

    // ---- CRUD ----
    const fetchHistoryData = async (idRef) => {
        if (!idRef) return;
        try {
            setHistoryLoading(true);
            const res = await fetch('/api/sheets/history');
            if (res.ok) {
                const data = await res.json();
                const rows = data.values || [];
                const filtered = filterSheetData(rows);
                const parsed = filtered.map(parseHistoryRow);
                const filteredById = parsed.filter(h => h.idRef === idRef);
                setHistoryData(filteredById);
            }
        } catch (err) {
            console.error('Lỗi tải lịch sử:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const toggleHistory = (id, idRef) => {
        const isOpen = expandedHistory[id];
        if (!isOpen) {
            setCurrentIdRef(idRef);
            fetchHistoryData(idRef);
        }
        setExpandedHistory(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
        if (isOpen) {
            setShowFormPopup(false);
            setEditingId(null);
        }
    };

    const handleAddNew = (idRef) => {
        setCurrentIdRef(idRef);
        setEditingId(null);
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            noi_dung_bao_hanh: '',
            nguoi_thuc_hien: '',
            ket_qua: '',
            trang_thai: 'Đã tiếp nhận thông tin',
            ngay_tiep_nhan: today,
            ngay_bao_hanh: '',
        });
        setShowFormPopup(true);
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            noi_dung_bao_hanh: item.noiDungBaoHanh,
            nguoi_thuc_hien: item.nguoiThucHien,
            ket_qua: item.ketQua,
            trang_thai: item.trangThai || 'Đã tiếp nhận thông tin',
            ngay_tiep_nhan: formatDateInput(item.ngayTiepNhan),
            ngay_bao_hanh: formatDateInput(item.ngayBaoHanh),
        });
        setShowFormPopup(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
        try {
            const res = await fetch(`/api/sheets/history?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (currentIdRef) fetchHistoryData(currentIdRef);
            } else {
                alert('Xóa thất bại');
            }
        } catch (err) {
            alert('Lỗi xóa: ' + err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            id_ref: currentIdRef,
            noi_dung_bao_hanh: formData.noi_dung_bao_hanh,
            nguoi_thuc_hien: formData.nguoi_thuc_hien,
            ket_qua: formData.ket_qua,
            trang_thai: formData.trang_thai,
            ngay_tiep_nhan: formData.ngay_tiep_nhan,
            ngay_bao_hanh: formatDateForSheet(formData.ngay_bao_hanh),
        };

        try {
            let url = '/api/sheets/history';
            let options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            };
            if (editingId) {
                options.method = 'PUT';
                options.body = JSON.stringify({ id: editingId, ...payload });
            }

            const res = await fetch(url, options);
            if (res.ok) {
                setShowFormPopup(false);
                setEditingId(null);
                if (currentIdRef) fetchHistoryData(currentIdRef);
            } else {
                const err = await res.json();
                alert('Lỗi: ' + err.error);
            }
        } catch (err) {
            alert('Lỗi gửi dữ liệu: ' + err.message);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const getHistoryForItem = (itemId) => {
        return historyData.filter(h => h.idRef === itemId);
    };

    // Render
    if (loading) {
        return <div className="status-box">Đang tải chi tiết...</div>;
    }

    if (error) {
        return (
            <div className="status-box" style={{ color: 'red' }}>
                <span dangerouslySetInnerHTML={{ __html: error }} />
            </div>
        );
    }

    if (!warrantyMain) {
        return <div className="status-box">Không có thông tin</div>;
    }

    const deliveryText = formatDateDisplay(warrantyMain.ngayBanGiao) || warrantyMain.ngayBanGiao || '';

    return (
        <div className="modal-body">
            <div className="modal-header">
                <h3>THÔNG TIN CHI TIẾT</h3>
                <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="modal-content">
                {/* Thông tin khách hàng */}
                <div className="section-card" style={{ marginBottom: '16px' }}>
                    <div className="section-head">Thông tin khách hàng</div>
                    <table className="info-table">
                        <tbody>
                            <tr><td className="info-label">Tên khách hàng</td><td className="info-value">{warrantyMain.tenNguoiLienHe}</td></tr>
                            <tr><td className="info-label">Số điện thoại</td><td className="info-value">{warrantyMain.sdtKhachHang}</td></tr>
                            <tr><td className="info-label">Địa chỉ</td><td className="info-value">{warrantyMain.diaChiChiTiet}</td></tr>
                            <tr><td className="info-label">Mã hợp đồng</td><td className="info-value">{warrantyMain.maHopDong}</td></tr>
                            <tr><td className="info-label">Ngày bàn giao</td><td className="info-value">{deliveryText}</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="table-wrap">
                    <table className="bordered-table">
                        <thead>
                            <tr>
                                <th style={{ width: '4%' }}>TT</th>
                                <th style={{ width: '12%' }}>Mã sản phẩm</th>
                                <th style={{ width: '25%' }}>Diễn giải</th>
                                <th style={{ width: '7%' }}>Rộng</th>
                                <th style={{ width: '7%' }}>Cao (Mở)</th>
                                <th style={{ width: '6%' }}>SL</th>
                                <th style={{ width: '6%' }}>HD Sử dụng</th>
                                <th style={{ width: '6%' }}>HD Lắp đặt</th>
                                <th style={{ width: '6%' }}>TT Bảo hành</th>
                                <th style={{ width: '6%' }}>Lịch sử BH</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warrantyItems.length === 0 ? (
                                <tr><td colSpan="10" className="cell-center">Không có sản phẩm</td></tr>
                            ) : (
                                warrantyItems.map((item, index) => {
                                    const effectiveDeliveryDate = item.ngayBanGiao || warrantyMain.ngayBanGiao || '';
                                    const rule = getApplicableRule(item.maSanPham, effectiveDeliveryDate);
                                    const warrantyHtml = buildWarrantyMiniTable(rule, effectiveDeliveryDate);
                                    const hdsdHtml = rule ? buildGuideButton(getValue(rule, 'hdsd_url')) : '<span style="color:var(--muted);">—</span>';
                                    const hdldHtml = rule ? buildGuideButton(getValue(rule, 'hdld_url')) : '<span style="color:var(--muted);">—</span>';
                                    const isExpanded = expanded[index] || false;
                                    const isHistoryExpanded = expandedHistory[item.id] || false;
                                    const historyList = getHistoryForItem(item.id);

                                    return (
                                        <React.Fragment key={index}>
                                            <tr className="item-main-row">
                                                <td className="cell-center">{escapeHtml(item.stt)}</td>
                                                <td className="cell-left">{escapeHtml(item.maSanPham)}</td>
                                                <td className="cell-left" dangerouslySetInnerHTML={{ __html: formatDescription(item.dienGiai) }} />
                                                <td className="cell-center">{escapeHtml(item.chieuRong)}</td>
                                                <td className="cell-center">{escapeHtml(item.chieuCao)}</td>
                                                <td className="cell-center">{escapeHtml(item.soLuong)}</td>
                                                <td className="cell-center" dangerouslySetInnerHTML={{ __html: hdsdHtml }} />
                                                <td className="cell-center" dangerouslySetInnerHTML={{ __html: hdldHtml }} />
                                                <td className="cell-center">
                                                    {warrantyHtml ? (
                                                        <button
                                                            type="button"
                                                            className="warranty-toggle"
                                                            onClick={() => setExpanded(prev => ({ ...prev, [index]: !prev[index] }))}
                                                            aria-expanded={isExpanded}
                                                        >
                                                            {isExpanded ? 'Ẩn' : 'Xem'}
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: 'var(--muted)' }}>—</span>
                                                    )}
                                                </td>
                                                <td className="cell-center">
                                                    <button
                                                        type="button"
                                                        className="warranty-toggle"
                                                        onClick={() => toggleHistory(item.id, item.id)}
                                                        aria-expanded={isHistoryExpanded}
                                                    >
                                                        {isHistoryExpanded ? 'Ẩn' : 'Xem'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Hàng mở rộng bảo hành */}
                                            {warrantyHtml && (
                                                <tr className="warranty-detail-row" style={{ display: isExpanded ? 'table-row' : 'none' }}>
                                                    <td colSpan="10" className="warranty-detail-cell">
                                                        <div dangerouslySetInnerHTML={{ __html: warrantyHtml }} />
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Hàng mở rộng lịch sử bảo hành */}
                                            {isHistoryExpanded && (
                                                <tr className="warranty-detail-row">
                                                    <td colSpan="10" className="warranty-detail-cell">
                                                        <div className="history-panel">
                                                            <div className="history-panel-head">
                                                                <span>Lịch sử bảo hành</span>
                                                                {isAdmin && (
                                                                    <button className="history-add-btn" onClick={() => handleAddNew(item.id)}>
                                                                        + Thêm mới
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {historyLoading ? (
                                                                <div className="status-box">Đang tải...</div>
                                                            ) : (
                                                                <>
                                                                    <table className="history-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th style={{ width: '12%' }}>Ngày tiếp nhận</th>
                                                                                <th style={{ width: '12%' }}>Ngày bảo hành</th>
                                                                                <th style={{ width: '15%' }}>Nội dung</th>
                                                                                <th style={{ width: '12%' }}>Người thực hiện</th>
                                                                                <th style={{ width: '23%' }}>Kết quả</th>
                                                                                <th style={{ width: '12%' }}>Trạng thái</th>
                                                                                <th style={{ width: '12%' }}></th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {historyList.length === 0 ? (
                                                                                <tr><td colSpan="7" className="cell-center">Chưa có lịch sử bảo hành</td></tr>
                                                                            ) : (
                                                                                historyList.map((h, idx) => (
                                                                                    <tr key={idx}>
                                                                                        <td>{formatDateDisplay(h.ngayTiepNhan)}</td>
                                                                                        <td>{formatDateDisplay(h.ngayBaoHanh)}</td>
                                                                                        <td>{escapeHtml(h.noiDungBaoHanh)}</td>
                                                                                        <td>{escapeHtml(h.nguoiThucHien)}</td>
                                                                                        <td>{escapeHtml(h.ketQua)}</td>
                                                                                        <td>{escapeHtml(h.trangThai)}</td>
                                                                                        <td>
                                                                                            {isAdmin && (
                                                                                                <>
                                                                                                    <button className="history-edit-btn" onClick={() => handleEdit(h)}>Sửa</button>
                                                                                                    <button className="history-delete-btn" onClick={() => handleDelete(h.id)}>Xóa</button>
                                                                                                </>
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Popup Form */}
            {showFormPopup && (
                <div className="popup-overlay" onClick={() => { setShowFormPopup(false); setEditingId(null); }}>
                    <div className="popup-container" onClick={e => e.stopPropagation()}>
                        <div className="popup-header">
                            <h4>{editingId ? '✏️ Sửa lịch sử bảo hành' : '➕ Thêm lịch sử bảo hành'}</h4>
                            <button className="popup-close" onClick={() => { setShowFormPopup(false); setEditingId(null); }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="popup-form">
                            <div className="popup-form-row">
                                <div className="popup-form-group">
                                    <label>Nội dung bảo hành <span className="required">*</span></label>
                                    <textarea
                                        name="noi_dung_bao_hanh"
                                        value={formData.noi_dung_bao_hanh}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nhập nội dung chi tiết..."
                                        rows={3}
                                    />
                                </div>
                                <div className="popup-form-group">
                                    <label>Người thực hiện <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="nguoi_thuc_hien"
                                        value={formData.nguoi_thuc_hien}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nhập tên người thực hiện"
                                    />
                                </div>
                            </div>
                            <div className="popup-form-row">
                                <div className="popup-form-group">
                                    <label>Kết quả</label>
                                    <textarea
                                        name="ket_qua"
                                        value={formData.ket_qua}
                                        onChange={handleChange}
                                        placeholder="Nhập kết quả (nếu có)..."
                                        rows={3}
                                    />
                                </div>
                                <div className="popup-form-group">
                                    <label>Trạng thái <span className="required">*</span></label>
                                    <select
                                        name="trang_thai"
                                        value={formData.trang_thai}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="Đã tiếp nhận thông tin">✅ Đã tiếp nhận thông tin</option>
                                        <option value="Chưa thực hiện">⏳ Chưa thực hiện</option>
                                        <option value="Đã thực hiện">✔️ Đã thực hiện</option>
                                    </select>
                                </div>
                            </div>
                            <div className="popup-form-row">
                                <div className="popup-form-group">
                                    <label>Ngày tiếp nhận</label>
                                    <input
                                        type="date"
                                        name="ngay_tiep_nhan"
                                        value={formData.ngay_tiep_nhan}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="popup-form-group">
                                    <label>Ngày bảo hành <span className="required">*</span></label>
                                    <input
                                        type="date"
                                        name="ngay_bao_hanh"
                                        value={formData.ngay_bao_hanh}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="popup-form-actions">
                                <button type="submit" className="btn-submit">{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
                                <button type="button" className="btn-cancel" onClick={() => { setShowFormPopup(false); setEditingId(null); }}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
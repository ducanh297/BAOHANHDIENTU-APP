'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    escapeHtml,
    normalizeDate,
    formatDateDisplay,
    parseNumberFromSheet,
    formatNumberForDisplay,
    getValue,
    addMonths,
    daysBetween,
    formatDescription,
    sanitizeUrl,
    getWarrantyStatusClass,
} from '@/lib/helpers';

export default function Home() {
    const searchParams = useSearchParams();
    const idURI = searchParams.get('id') || '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [warrantyMain, setWarrantyMain] = useState(null);
    const [warrantyItems, setWarrantyItems] = useState([]);
    const [warrantyRules, setWarrantyRules] = useState([]);
    const [expanded, setExpanded] = useState({}); // key: index, value: boolean

    // --- Helper functions (từ script.js) ---
    const fetchSheetValues = async (type) => {
        const response = await fetch(`/api/sheets?type=${encodeURIComponent(type)}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load sheet data');
        }
        return data.values || [];
    };

    const rowToObject = (headers, row) => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] ?? '';
        });
        return obj;
    };

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

        const deliveryLabel = deliveryDate ? formatDateDisplay(deliveryDate) : '-';
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

    // --- Fetch dữ liệu ---
    useEffect(() => {
        if (!idURI) {
            setError('Thiếu tham số id trên URL.');
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch main
                const mainRows = await fetchSheetValues('main');
                const mainRow = mainRows.find((r) => (r[0] || '') === idURI);
                if (!mainRow) {
                    setError(`Không tìm thấy dữ liệu bảo hành cho mã đơn hàng: ${escapeHtml(idURI)}`);
                    setLoading(false);
                    return;
                }

                const mainData = {
                    maDonHang: mainRow[0] || '',
                    tenNguoiLienHe: mainRow[1] || '',
                    diaChiChiTiet: mainRow[2] || '',
                    sdtKhachHang: mainRow[3] || '',
                    maHopDong: mainRow[4] || '',
                    ngayBanGiao: mainRow[5] || '',
                };
                setWarrantyMain(mainData);

                // 2. Fetch rules
                const ruleRows = await fetchSheetValues('rule');
                let rules = [];
                if (ruleRows.length) {
                    const headers = ruleRows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
                    rules = ruleRows.slice(1).map((row) => rowToObject(headers, row));
                }
                setWarrantyRules(rules);

                // 3. Fetch detail
                const detailRows = await fetchSheetValues('detail');
                const filtered = detailRows
                    .filter((row) => String(row[1] || '').trim() === String(idURI).trim())
                    .sort((a, b) => String(a[2] || '').localeCompare(String(b[2] || ''), undefined, { numeric: true }));

                const items = filtered.map((row) => {
                    const qtyRaw = row[7];
                    const qtyParsed = parseNumberFromSheet(qtyRaw);
                    return {
                        maDonHang: row[1] || '',
                        stt: row[2] || '',
                        maSanPham: row[3] || '',
                        dienGiai: row[4] || '',
                        chieuRong: row[5] || '',
                        chieuCao: row[6] || '',
                        soLuong: formatNumberForDisplay(qtyParsed),
                        soLuongParsed: qtyParsed,
                        ngayBanGiao: row[8] || '',
                    };
                });
                setWarrantyItems(items);
            } catch (err) {
                setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [idURI]);

    // Hàm toggle expand
    const toggleExpand = (index) => {
        setExpanded((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    // Render trạng thái loading / error
    if (loading) {
        return (
            <div className="page-shell">
                <div className="content">
                    <div className="status-box">Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-shell">
                <div className="content">
                    <div className="status-box" dangerouslySetInnerHTML={{ __html: error }} />
                </div>
            </div>
        );
    }

    // Nếu không có dữ liệu chính (vẫn có thể không có sản phẩm)
    if (!warrantyMain) {
        return (
            <div className="page-shell">
                <div className="content">
                    <div className="status-box">Không có thông tin</div>
                </div>
            </div>
        );
    }

    const deliveryText = formatDateDisplay(warrantyMain.ngayBanGiao) || warrantyMain.ngayBanGiao || '';

    return (
        <div className="page-shell">
            <div className="content">
                {/* Hero */}
                <div className="hero">
                    <div className="brand-mark">
                        <img src="/logo.png" alt="Logo" />
                    </div>
                    <div className="hero-copy">
                        <h2>THÔNG TIN BẢO HÀNH</h2>
                        <div className="eyebrow">Sản phẩm được bảo hành chính hãng bởi Quang Minh</div>
                    </div>
                </div>

                {/* Hotline */}
                <div className="hotline-banner">
                    <div className="hotline-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </div>
                    <div className="hotline-content">
                        <div className="hotline-title">Hotline hỗ trợ khách hàng</div>
                        <div className="hotline-number">
                            <a href="tel:19000282">1900 0282</a>
                        </div>
                        <div className="hotline-note">Liên hệ ngay khi cần hỗ trợ bảo hành, bảo trì hoặc tư vấn kỹ thuật.</div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid-layout">
                    {/* Thông tin đơn hàng */}
                    <div className="section-card">
                        <div className="section-head">
                            <span>Thông tin đơn hàng</span>
                        </div>
                        <table className="info-table">
                            <tbody>
                                <tr>
                                    <td className="info-label">Tên khách hàng</td>
                                    <td className="info-value">{warrantyMain.tenNguoiLienHe}</td>
                                </tr>
                                <tr>
                                    <td className="info-label">Số điện thoại</td>
                                    <td className="info-value">{warrantyMain.sdtKhachHang}</td>
                                </tr>
                                <tr>
                                    <td className="info-label">Địa chỉ</td>
                                    <td className="info-value">{warrantyMain.diaChiChiTiet}</td>
                                </tr>
                                <tr>
                                    <td className="info-label">Mã hợp đồng</td>
                                    <td className="info-value">{warrantyMain.maHopDong}</td>
                                </tr>
                                <tr>
                                    <td className="info-label">Ngày bàn giao</td>
                                    <td className="info-value">{deliveryText}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Danh sách sản phẩm */}
                    <div className="table-wrap">
                        <div className="table-toolbar">
                            <div className="title">
                                <strong>Danh sách sản phẩm</strong>
                            </div>
                        </div>
                        <table className="bordered-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '4%' }}>TT</th>
                                    <th style={{ width: '15%' }}>Mã sản phẩm</th>
                                    <th style={{ width: '35%' }}>Diễn giải</th>
                                    <th style={{ width: '9%' }}>Rộng</th>
                                    <th style={{ width: '9%' }}>Cao (Mở)</th>
                                    <th style={{ width: '7%' }}>Số lượng</th>
                                    <th style={{ width: '7%' }}>HD Sử dụng</th>
                                    <th style={{ width: '7%' }}>HD Lắp đặt</th>
                                    <th style={{ width: '7%' }}>TT Bảo hành</th>
                                </tr>
                            </thead>
                            <tbody>
                                {warrantyItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="cell-center">Không có sản phẩm</td>
                                    </tr>
                                ) : (
                                    warrantyItems.map((item, index) => {
                                        const effectiveDeliveryDate = item.ngayBanGiao || warrantyMain.ngayBanGiao || '';
                                        const rule = getApplicableRule(item.maSanPham, effectiveDeliveryDate);
                                        const warrantyHtml = buildWarrantyMiniTable(rule, effectiveDeliveryDate);
                                        const hdsdHtml = rule ? buildGuideButton(getValue(rule, 'hdsd_url')) : '<span style="color:var(--muted);">—</span>';
                                        const hdldHtml = rule ? buildGuideButton(getValue(rule, 'hdld_url')) : '<span style="color:var(--muted);">—</span>';
                                        const isExpanded = expanded[index] || false;

                                        return (
                                            <React.Fragment key={index}>
                                                <tr className="item-main-row">
                                                    <td className="cell-center">{escapeHtml(item.stt)}</td>
                                                    <td className="cell-left">{escapeHtml(item.maSanPham)}</td>
                                                    <td
                                                        className="cell-left"
                                                        dangerouslySetInnerHTML={{ __html: formatDescription(item.dienGiai) }}
                                                    />
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
                                                                onClick={() => toggleExpand(index)}
                                                                aria-expanded={isExpanded}
                                                            >
                                                                {isExpanded ? 'Ẩn' : 'Xem'}
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--muted)' }}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {warrantyHtml && (
                                                    <tr className="warranty-detail-row" style={{ display: isExpanded ? 'table-row' : 'none' }}>
                                                        <td colSpan="9" className="warranty-detail-cell">
                                                            <div dangerouslySetInnerHTML={{ __html: warrantyHtml }} />
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
            </div>
        </div>
    );
}
// app/thong-tin/page.js
'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
// Import các Icon đồng bộ hệ thống từ lucide-react
import {
    PhoneCall,
    QrCode,
    XCircle
} from 'lucide-react';
import './style.css';

function ThongTinContent() {
    const searchParams = useSearchParams();
    const idURI = searchParams.get('id') || '';

    // State cho dữ liệu
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [warrantyMain, setWarrantyMain] = useState(null);
    const [warrantyItems, setWarrantyItems] = useState([]);
    const [warrantyRules, setWarrantyRules] = useState([]);
    const [expanded, setExpanded] = useState({});

    // State cho QR Scanner
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');

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

    // Hàm build button hướng dẫn sử dụng / lắp đặt sạch sẽ với Lucide Icon
    const buildGuideButton = (url) => {
        const safeUrl = sanitizeUrl(url);
        if (!safeUrl) return '<span style="color:var(--muted);">—</span>';
        return `
            <a class="guide-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">
            Xem
            </a>
        `;
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
                    remainingText = `
                        <span class="warranty-remaining-badge ${statusClass}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="warranty-icon"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            <span>Còn ${remainingDays} ngày</span>
                        </span>`;
                } else if (remainingDays === 0) {
                    remainingText = `
                        <span class="warranty-remaining-badge ${statusClass}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="warranty-icon"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            <span>Hết hạn hôm nay</span>
                        </span>`;
                    statusClass = 'is-warning';
                } else {
                    remainingText = `
                        <span class="warranty-remaining-badge ${statusClass}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="warranty-icon"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            <span>Hết bảo hành</span>
                        </span>`;
                    statusClass = 'is-expired';
                }
            } else {
                expiryText = '-';
            }

            rowsHtml.push(`
                <tr>
                    <td>${criterion ? `<span class="warranty-criterion">${escapeHtml(criterion)}</span>` : '<span style="color:var(--muted);">—</span>'}</td>
                    <td class="cell-center"><span class="warranty-date ${statusClass}">${escapeHtml(expiryText)}</span></td>
                    <td class="cell-center">${remainingText}</td>
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
                            <th style="width: 25%;" class="cell-center">Hạn bảo hành</th>
                            <th style="width: 25%;" class="cell-center">Còn lại</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml.join('')}
                    </tbody>
                </table>
            </div>
        `;
    };

    useEffect(() => {
        if (!idURI) {
            setLoading(false);
            setError(null);
            setWarrantyMain(null);
            setWarrantyItems([]);
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [mainRows, detailRows, ruleRows] = await Promise.all([
                    fetchSheetValues('main'),
                    fetchSheetValues('detail'),
                    fetchSheetValues('rule'),
                ]);

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

                let rules = [];
                if (ruleRows.length) {
                    const headers = ruleRows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
                    rules = ruleRows.slice(1).map((row) => rowToObject(headers, row));
                }
                setWarrantyRules(rules);

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

    const startScan = async () => {
        if (isScanning) return;
        try {
            setScanError('');
            setIsScanning(true);

            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode('qr-reader');
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Khi quét XONG và lấy được text thành công:
                    scanner.stop().then(() => {
                        // 1. Ẩn ngay lập tức ô Quét mã QR trên giao diện
                        setIsScanning(false);
                        setScanError('');

                        // 2. Tách lấy ID từ URL quét được
                        const match = decodedText.match(/[?&]id=([^&]+)/);
                        if (match && match[1]) {
                            const newId = match[1];
                            // Chuyển trang sang URL mới chứa ID vừa quét
                            window.location.href = `/thong-tin?id=${encodeURIComponent(newId)}`;
                        } else {
                            // Nếu QR hợp lệ nhưng cấu trúc không chứa mã ID như mong muốn
                            setScanError('Không tìm thấy mã đơn hàng trong QR code');
                        }
                    }).catch((err) => {
                        console.error("Lỗi khi dừng scanner:", err);
                        setIsScanning(false);
                    });
                },
                (errorMessage) => {
                    // Log nội bộ hoặc bỏ qua để tránh gây phiền nhiễu cho người dùng khi camera đang quét liên tục
                }
            );
        } catch (err) {
            console.error(err);
            setScanError('Không thể mở camera: ' + err.message);
            setIsScanning(false);
        }
    };

    const stopScan = async () => {
        setIsScanning(false);
        setScanError('');
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const scannerInstance = Html5Qrcode.getScannerInstance?.();
            if (scannerInstance) {
                await scannerInstance.stop();
                await scannerInstance.clear();
            }
        } catch (e) { }
    };

    useEffect(() => {
        return () => {
            if (isScanning) {
                stopScan();
            }
        };
    }, [isScanning]);

    if (loading && idURI) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content">
                    <div className="status-box">Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
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

                {/* Hotline hỗ trợ kết hợp Lucide Icon */}
                <div className="hotline-banner">
                    <div className="hotline-icon">
                        <PhoneCall size={28} strokeWidth={2} />
                    </div>
                    <div className="hotline-content">
                        <div className="hotline-title">Hotline hỗ trợ khách hàng</div>
                        <div className="hotline-number"><a href="tel:19000282">1900 0282</a></div>
                        <div className="hotline-note">Liên hệ ngay khi cần hỗ trợ bảo hành, bảo trì hoặc tư vấn kỹ thuật.</div>
                    </div>
                </div>

                {/* Thanh tìm kiếm + QR Button: Chỉ hiển thị khi CHƯA có dữ liệu đơn hàng hiển thị */}
                {!warrantyMain && (
                    <div className="search-row">
                        <button
                            onClick={isScanning ? stopScan : startScan}
                            className={`qr-button ${isScanning ? 'scanning' : ''}`}
                        >
                            {isScanning ? (
                                <>
                                    <XCircle size={16} /> Dừng quét
                                </>
                            ) : (
                                <>
                                    <QrCode size={16} /> Quét mã QR đơn hàng
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Khu vực hiển thị camera */}
                {isScanning && (
                    <div className="qr-reader-container">
                        <div id="qr-reader"></div>
                        {scanError && <div className="qr-error">{scanError}</div>}
                    </div>
                )}

                {/* Hiển thị lỗi */}
                {error && <div className="error-box">{error}</div>}

                {/* Nội dung chi tiết */}
                {warrantyMain && (
                    <div className="grid-layout" style={{ marginTop: '16px' }}>
                        {/* Thông tin đơn hàng kèm icons cột đầu */}
                        <div className="section-card">
                            <div className="section-head">Thông tin đơn hàng</div>
                            <table className="info-table">
                                <tbody>
                                    <tr>
                                        <td className="info-label">
                                            <div className="label-with-icon"> Tên khách hàng</div>
                                        </td>
                                        <td className="info-value">{warrantyMain.tenNguoiLienHe}</td>
                                    </tr>
                                    <tr>
                                        <td className="info-label">
                                            <div className="label-with-icon"> Số điện thoại</div>
                                        </td>
                                        <td className="info-value">{warrantyMain.sdtKhachHang}</td>
                                    </tr>
                                    <tr>
                                        <td className="info-label">
                                            <div className="label-with-icon"> Địa chỉ</div>
                                        </td>
                                        <td className="info-value">{warrantyMain.diaChiChiTiet}</td>
                                    </tr>
                                    <tr>
                                        <td className="info-label">
                                            <div className="label-with-icon"> Mã hợp đồng</div>
                                        </td>
                                        <td className="info-value">{warrantyMain.maHopDong}</td>
                                    </tr>
                                    <tr>
                                        <td className="info-label">
                                            <div className="label-with-icon"> Ngày bàn giao</div>
                                        </td>
                                        <td className="info-value">{formatDateDisplay(warrantyMain.ngayBanGiao) || warrantyMain.ngayBanGiao}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Danh sách sản phẩm */}
                        <div className="table-wrap">
                            <div className="table-toolbar">
                                <div className="title">
                                    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Danh sách sản phẩm
                                    </strong>
                                </div>
                            </div>
                            <div className="responsive-table-scroll">
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
                                            <tr><td colSpan="9" className="cell-center">Không có sản phẩm</td></tr>
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
                                                                        {isExpanded ? (
                                                                            <>Ẩn</>
                                                                        ) : (
                                                                            <>Xem</>
                                                                        )}
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
                )}
            </div>
        </div>
    );
}

export default function ThongTinPage() {
    return (
        <Suspense fallback={<div className="page-shell"><div className="content"><div className="status-box">Đang tải...</div></div></div>}>
            <ThongTinContent />
        </Suspense>
    );
}
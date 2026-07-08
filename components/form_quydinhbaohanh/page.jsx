'use client';

import React, { useState, useEffect } from 'react';
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
import { Edit, Trash2, ClipboardList, Edit2 } from 'lucide-react';
import './style.css';

export default function QuyDinhFormPopup({ initialData, existingData = [], onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        nhom_san_pham: '',
        mau_cua: '',
        he_cua: '',
        ma_san_pham: '',
        tieu_chi_1: '',
        time_1: '',
        tieu_chi_2: '',
        time_2: '',
        tieu_chi_3: '',
        time_3: '',
        tieu_chi_4: '',
        time_4: '',
        tieu_chi_5: '',
        time_5: '',
        hdsd_url: '',
        hdld_url: '',
        thoi_diem_ap_dung: '',
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            // Hàm chuyển đổi từ DD/MM/YYYY sang DD/MM/YYYY để hiển thị (giữ nguyên)
            const formatDisplayDate = (dateStr) => {
                if (!dateStr) return '';
                // Nếu đã là DD/MM/YYYY thì giữ nguyên
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                    return dateStr;
                }
                // Nếu là YYYY-MM-DD, chuyển về DD/MM/YYYY
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const year = parts[0];
                    const month = parts[1];
                    const day = parts[2];
                    return `${day}/${month}/${year}`;
                }
                // Fallback: dùng normalizeDate để parse và format
                const dateObj = normalizeDate(dateStr);
                if (dateObj && !isNaN(dateObj)) {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    return `${day}/${month}/${year}`;
                }
                return dateStr;
            };

            setFormData({
                nhom_san_pham: initialData.nhom_san_pham || '',
                mau_cua: initialData.mau_cua || '',
                he_cua: initialData.he_cua || '',
                ma_san_pham: initialData.ma_san_pham || '',
                tieu_chi_1: initialData.tieu_chi_1 || '',
                time_1: initialData.time_1 || '',
                tieu_chi_2: initialData.tieu_chi_2 || '',
                time_2: initialData.time_2 || '',
                tieu_chi_3: initialData.tieu_chi_3 || '',
                time_3: initialData.time_3 || '',
                tieu_chi_4: initialData.tieu_chi_4 || '',
                time_4: initialData.time_4 || '',
                tieu_chi_5: initialData.tieu_chi_5 || '',
                time_5: initialData.time_5 || '',
                hdsd_url: initialData.hdsd_url || '',
                hdld_url: initialData.hdld_url || '',
                thoi_diem_ap_dung: formatDisplayDate(initialData.thoi_diem_ap_dung),
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Chuyển đổi ngày từ DD/MM/YYYY sang YYYY-MM-DD trước khi submit
            const submitData = { ...formData };
            if (submitData.thoi_diem_ap_dung) {
                const parts = submitData.thoi_diem_ap_dung.split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    // Kiểm tra hợp lệ
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year.length === 4) {
                        submitData.thoi_diem_ap_dung = `${year}-${month}-${day}`;
                    } else {
                        // Nếu không hợp lệ, để nguyên hoặc xử lý fallback
                        submitData.thoi_diem_ap_dung = '';
                    }
                } else {
                    // Nếu đã ở định dạng khác (ví dụ YYYY-MM-DD), giữ nguyên
                    // Hoặc có thể dùng normalizeDate để chuẩn hóa
                    const dateObj = normalizeDate(submitData.thoi_diem_ap_dung);
                    if (dateObj && !isNaN(dateObj)) {
                        submitData.thoi_diem_ap_dung = dateObj.toISOString().split('T')[0];
                    } else {
                        submitData.thoi_diem_ap_dung = '';
                    }
                }
            }
            await onSubmit(submitData);
            onClose();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getUniqueValues = (field) => {
        const values = existingData.map(item => item[field] || '').filter(Boolean);
        return [...new Set(values)].sort();
    };

    const nhomOptions = getUniqueValues('nhom_san_pham');
    const mauOptions = getUniqueValues('mau_cua');
    const heOptions = getUniqueValues('he_cua');
    const maSPOptions = getUniqueValues('ma_san_pham');

    const criteriaPairs = [1, 2, 3, 4, 5].map(i => ({
        index: i,
        key: `tieu_chi_${i}`,
        timeKey: `time_${i}`,
    }));

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-container" onClick={e => e.stopPropagation()}>
                <div className="popup-header">
                    <h4>{initialData ? 'Sửa quy định' : 'Thêm quy định'}</h4>
                    <button className="popup-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit} className="popup-form" autoComplete="off">
                    <div className="form-group">
                        <label>Nhóm</label>
                        <input
                            list="nhom-list"
                            name="nhom_san_pham"
                            value={formData.nhom_san_pham}
                            onChange={handleChange}
                            placeholder="Chọn hoặc nhập nhóm"
                            autoComplete="off"
                        />
                        <datalist id="nhom-list">
                            {nhomOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>

                    <div className="form-group">
                        <label>mẫu cửa</label>
                        <input
                            list="mau-list"
                            name="mau_cua"
                            value={formData.mau_cua}
                            onChange={handleChange}
                            placeholder="Chọn hoặc nhập mẫu"
                            autoComplete="off"
                        />
                        <datalist id="mau-list">
                            {mauOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>

                    <div className="form-group">
                        <label>Hệ</label>
                        <input
                            list="he-list"
                            name="he_cua"
                            value={formData.he_cua}
                            onChange={handleChange}
                            placeholder="Chọn hoặc nhập hệ"
                            autoComplete="off"
                        />
                        <datalist id="he-list">
                            {heOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>

                    <div className="form-group">
                        <label>Mã<span className="required">*</span></label>
                        <input
                            list="masp-list"
                            name="ma_san_pham"
                            value={formData.ma_san_pham}
                            onChange={handleChange}
                            required
                            placeholder="Chọn hoặc nhập mã"
                            autoComplete="off"
                        />
                        <datalist id="masp-list">
                            {maSPOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>

                    <div className="form-group">
                        <label>Tiêu chí bảo hành</label>
                        <div className="criteria-grid">
                            {criteriaPairs.map(({ index, key, timeKey }) => (
                                <div key={index} className="criteria-pair">
                                    <div className="criteria-item">
                                        <label htmlFor={key}>Tiêu chí {index}</label>
                                        <textarea
                                            id={key}
                                            name={key}
                                            value={formData[key]}
                                            onChange={handleChange}
                                            placeholder="Hạng mục bảo hành"
                                            rows={3}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="criteria-item">
                                        <label htmlFor={timeKey}></label>
                                        <input
                                            id={timeKey}
                                            name={timeKey}
                                            type="number"
                                            value={formData[timeKey]}
                                            onChange={handleChange}
                                            placeholder="Số tháng bảo hành"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>HDSD URL</label>
                        <input
                            name="hdsd_url"
                            value={formData.hdsd_url}
                            onChange={handleChange}
                            placeholder="https://example.com/hdsd"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label>HDLĐ URL</label>
                        <input
                            name="hdld_url"
                            value={formData.hdld_url}
                            onChange={handleChange}
                            placeholder="https://example.com/hdld"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group">
                        <label>Thời điểm áp dụng <span className="hint">(DD/MM/YYYY)</span></label>
                        <input
                            type="text"
                            name="thoi_diem_ap_dung"
                            value={formData.thoi_diem_ap_dung}
                            onChange={handleChange}
                            placeholder="DD/MM/YYYY"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Đang xử lý...' : initialData ? 'Cập nhật' : 'Thêm mới'}
                        </button>
                        <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
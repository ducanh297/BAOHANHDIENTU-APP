'use client';

import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import './style.css';

export default function QuyDinhDetailPopup({ data, userRole = '', onClose, onEditClick, onDelete }) {
    if (!data) return null;

    const isAdmin = ['admin', 'administrator'].includes(userRole.toLowerCase());

    const formatDate = (val) => {
        if (!val) return '';
        return val.split('T')[0];
    };

    const criteriaPairs = [1, 2, 3, 4, 5].map(i => ({
        tieuChi: data[`tieu_chi_${i}`],
        time: data[`time_${i}`],
    })).filter(p => p.tieuChi || p.time);

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-container" onClick={e => e.stopPropagation()}>
                <div className="popup-header">
                    <h4>📋 Chi tiết quy định</h4>
                    <button className="popup-close" onClick={onClose}>✕</button>
                </div>
                <div className="popup-body">
                    <div className="detail-grid">
                        <div className="detail-item"><label>Mã sản phẩm</label><span>{data.ma_san_pham}</span></div>
                        <div className="detail-item"><label>Nhóm sản phẩm</label><span>{data.nhom_san_pham}</span></div>
                        <div className="detail-item"><label>Màu cửa</label><span>{data.mau_cua}</span></div>
                        <div className="detail-item"><label>Hệ cửa</label><span>{data.he_cua}</span></div>
                        <div className="detail-item"><label>HDSD URL</label><span>{data.hdsd_url || '—'}</span></div>
                        <div className="detail-item"><label>HDLĐ URL</label><span>{data.hdld_url || '—'}</span></div>
                        <div className="detail-item"><label>Thời điểm áp dụng</label><span>{formatDate(data.thoi_diem_ap_dung)}</span></div>
                    </div>
                    <div className="criteria-section">
                        <h5>Tiêu chí bảo hành</h5>
                        <table className="criteria-table">
                            <thead><tr><th>Tiêu chí</th><th>Thời gian (tháng)</th></tr></thead>
                            <tbody>
                                {criteriaPairs.length === 0 ? (
                                    <tr><td colSpan="2" className="cell-center">Không có tiêu chí</td></tr>
                                ) : (
                                    criteriaPairs.map((p, idx) => (
                                        <tr key={idx}>
                                            <td>{p.tieuChi || '—'}</td>
                                            <td>{p.time || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {isAdmin && (
                    <div className="popup-footer">
                        <button className="btn-edit" onClick={() => onEditClick(data)}>
                            <Edit size={16} /> Sửa
                        </button>
                        <button className="btn-delete" onClick={() => onDelete(data.id)}>
                            <Trash2 size={16} /> Xóa
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
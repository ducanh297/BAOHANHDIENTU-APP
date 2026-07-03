'use client';

import React from 'react';
import { Edit, Trash2, ClipboardList } from 'lucide-react';
import { formatDateDisplay } from '@/lib/helpers';
import './style.css';

export default function QuyDinhDetailPopup({ data, canAdd = false, canEdit = false, canDelete = false, onClose, onEditClick, onDelete }) {
    if (!data) return null;

    const criteriaPairs = [1, 2, 3, 4, 5].map(i => ({
        tieuChi: data[`tieu_chi_${i}`],
        time: data[`time_${i}`],
    })).filter(p => p.tieuChi || p.time);

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-container" onClick={e => e.stopPropagation()}>
                <div className="popup-header">
                    <h4>Chi tiết quy định</h4>
                    <button className="popup-close" onClick={onClose}>✕</button>
                </div>

                <div className="popup-body">
                    {/* Thông tin chung */}
                    <div className="detail-section">
                        <div className="section-title">Thông tin chung</div>
                        <div className="detail-list">
                            <div className="detail-row">
                                <span className="detail-label">Mã sản phẩm</span>
                                <span className="detail-value highlight">{data.ma_san_pham}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Nhóm sản phẩm</span>
                                <span className="detail-value">{data.nhom_san_pham || '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Màu cửa</span>
                                <span className="detail-value">{data.mau_cua || '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Hệ cửa</span>
                                <span className="detail-value">{data.he_cua || '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">HDSD URL</span>
                                <span className="detail-value">
                                    {data.hdsd_url ? (
                                        <a href={data.hdsd_url} target="_blank" rel="noopener noreferrer" className="link">Xem</a>
                                    ) : '—'}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">HDLĐ URL</span>
                                <span className="detail-value">
                                    {data.hdld_url ? (
                                        <a href={data.hdld_url} target="_blank" rel="noopener noreferrer" className="link">Xem</a>
                                    ) : '—'}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Thời điểm áp dụng</span>
                                <span className="detail-value">{formatDateDisplay(data.thoi_diem_ap_dung)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tiêu chí bảo hành */}
                    <div className="detail-section">
                        <div className="section-title">Tiêu chí bảo hành</div>
                        {criteriaPairs.length === 0 ? (
                            <div className="empty-state">Không có tiêu chí bảo hành</div>
                        ) : (
                            <ul className="criteria-list">
                                {criteriaPairs.map((p, idx) => (
                                    <div key={idx} className="criteria-row">
                                        <span className="criteria-name">{p.tieuChi || '—'}</span>
                                        <span className="criteria-time">{p.time ? `${p.time} tháng` : '—'}</span>
                                    </div>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {(canEdit || canDelete) && (
                    <div className="popup-footer">
                        {canEdit && (
                            <button className="btn-edit" onClick={() => { onClose(); onEditClick(data); }}>
                                <Edit size={16} /> Sửa
                            </button>
                        )}
                        {canDelete && (
                            <button className="btn-delete" onClick={() => { onClose(); onDelete(data.id); }}>
                                <Trash2 size={16} /> Xóa
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
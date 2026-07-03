'use client';

import React, { useState, useEffect } from 'react';
import './style.css';

export default function PhanQuyenFormPopup({ initialData, userList = [], onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        ma_trang: '',
        ten_trang: '',
        mo_ta: '',
        show_tren_slide_bar: 'No',
        nhom_slidebar: '',
        ten_slidebar: '',
        quyen_admin: [],
        quyen_xem: [],
        quyen_them: [],
        quyen_sua: [],
        quyen_xoa: [],
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ma_trang: initialData.ma_trang || '',
                ten_trang: initialData.ten_trang || '',
                mo_ta: initialData.mo_ta || '',
                show_tren_slide_bar: initialData.show_tren_slide_bar || 'No',
                nhom_slidebar: initialData.nhom_slidebar || '',
                ten_slidebar: initialData.ten_slidebar || '',
                quyen_admin: initialData.quyen_admin ? initialData.quyen_admin.split(',').filter(Boolean) : [],
                quyen_xem: initialData.quyen_xem ? initialData.quyen_xem.split(',').filter(Boolean) : [],
                quyen_them: initialData.quyen_them ? initialData.quyen_them.split(',').filter(Boolean) : [],
                quyen_sua: initialData.quyen_sua ? initialData.quyen_sua.split(',').filter(Boolean) : [],
                quyen_xoa: initialData.quyen_xoa ? initialData.quyen_xoa.split(',').filter(Boolean) : [],
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'show_tren_slide_bar') {
            setFormData(prev => ({ ...prev, show_tren_slide_bar: checked ? 'Yes' : 'No' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCheckboxGroupChange = (field, userId, checked) => {
        setFormData(prev => {
            const newArr = checked
                ? [...prev[field], userId]
                : prev[field].filter(id => id !== userId);
            return { ...prev, [field]: newArr };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                quyen_admin: formData.quyen_admin.join(','),
                quyen_xem: formData.quyen_xem.join(','),
                quyen_them: formData.quyen_them.join(','),
                quyen_sua: formData.quyen_sua.join(','),
                quyen_xoa: formData.quyen_xoa.join(','),
            };
            await onSubmit(payload);
            onClose();
        } catch (error) {
            alert('Lỗi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-container" onClick={e => e.stopPropagation()}>
                <div className="popup-header">
                    <h4>{initialData ? '✏️ Sửa phân quyền' : '➕ Thêm phân quyền'}</h4>
                    <button className="popup-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit} className="popup-form" autoComplete="off">
                    <div className="form-group">
                        <label>Mã trang <span className="required">*</span></label>
                        <input name="ma_trang" value={formData.ma_trang} onChange={handleChange} required placeholder="vd: dashboard" />
                    </div>
                    <div className="form-group">
                        <label>Tên trang <span className="required">*</span></label>
                        <input name="ten_trang" value={formData.ten_trang} onChange={handleChange} required placeholder="vd: DASHBOARD QUẢN LÝ" />
                    </div>
                    <div className="form-group">
                        <label>Mô tả</label>
                        <textarea name="mo_ta" value={formData.mo_ta} onChange={handleChange} rows={2} placeholder="Mô tả ngắn" />
                    </div>
                    <div className="form-group checkbox-group">
                        <label>Hiển thị trên slidebar</label>
                        <label className="checkbox-label">
                            <input type="checkbox" name="show_tren_slide_bar" checked={formData.show_tren_slide_bar === 'Yes'} onChange={handleChange} />
                            Yes
                        </label>
                        <label className="checkbox-label">
                            <input type="checkbox" name="show_tren_slide_bar" checked={formData.show_tren_slide_bar === 'No'} onChange={handleChange} />
                            No
                        </label>
                    </div>
                    <div className="form-group">
                        <label>Nhóm slidebar</label>
                        <input name="nhom_slidebar" value={formData.nhom_slidebar} onChange={handleChange} placeholder="vd: Hệ thống" />
                    </div>
                    <div className="form-group">
                        <label>Tên hiển thị trên slidebar</label>
                        <input name="ten_slidebar" value={formData.ten_slidebar} onChange={handleChange} placeholder="vd: Phân quyền" />
                    </div>

                    {/* Quyền dạng checkbox */}
                    <div className="form-group">
                        <label>Quyền admin</label>
                        <div className="checkbox-grid">
                            {userList.length === 0 ? (
                                <span className="hint">Chưa có người dùng</span>
                            ) : (
                                userList.map(u => (
                                    <label key={u.id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.quyen_admin.includes(u.id)}
                                            onChange={(e) => handleCheckboxGroupChange('quyen_admin', u.id, e.target.checked)}
                                        />
                                        {u.ten_nguoi_dung} ({u.chuc_danh} - {u.phong_ban})
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Quyền xem</label>
                        <div className="checkbox-grid">
                            {userList.length === 0 ? (
                                <span className="hint">Chưa có người dùng</span>
                            ) : (
                                userList.map(u => (
                                    <label key={u.id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.quyen_xem.includes(u.id)}
                                            onChange={(e) => handleCheckboxGroupChange('quyen_xem', u.id, e.target.checked)}
                                        />
                                        {u.ten_nguoi_dung} ({u.chuc_danh} - {u.phong_ban})
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Quyền thêm</label>
                        <div className="checkbox-grid">
                            {userList.length === 0 ? (
                                <span className="hint">Chưa có người dùng</span>
                            ) : (
                                userList.map(u => (
                                    <label key={u.id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.quyen_them.includes(u.id)}
                                            onChange={(e) => handleCheckboxGroupChange('quyen_them', u.id, e.target.checked)}
                                        />
                                        {u.ten_nguoi_dung} ({u.chuc_danh} - {u.phong_ban})
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Quyền sửa</label>
                        <div className="checkbox-grid">
                            {userList.length === 0 ? (
                                <span className="hint">Chưa có người dùng</span>
                            ) : (
                                userList.map(u => (
                                    <label key={u.id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.quyen_sua.includes(u.id)}
                                            onChange={(e) => handleCheckboxGroupChange('quyen_sua', u.id, e.target.checked)}
                                        />
                                        {u.ten_nguoi_dung} ({u.chuc_danh} - {u.phong_ban})
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Quyền xóa</label>
                        <div className="checkbox-grid">
                            {userList.length === 0 ? (
                                <span className="hint">Chưa có người dùng</span>
                            ) : (
                                userList.map(u => (
                                    <label key={u.id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={formData.quyen_xoa.includes(u.id)}
                                            onChange={(e) => handleCheckboxGroupChange('quyen_xoa', u.id, e.target.checked)}
                                        />
                                        {u.ten_nguoi_dung} ({u.chuc_danh} - {u.phong_ban})
                                    </label>
                                ))
                            )}
                        </div>
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
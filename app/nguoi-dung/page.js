'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/lib/hooks/usePermission';
import { filterSheetData, escapeHtml } from '@/lib/helpers';
import {
    Users,
    RefreshCw,
    Plus,
    ChevronLeft,
    ChevronRight,
    Eye,
    Edit,
    Trash2,
    X,
    Search,
} from 'lucide-react';
import './style.css';

const PAGE_SIZE = 10;

export default function NguoiDungPage() {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchKeyword, setSearchKeyword] = useState('');

    // Permission
    const { loading: permLoading, canView, canAdd, canEdit, canDelete } = usePermission('nguoi-dung');

    // Popup states
    const [showFormPopup, setShowFormPopup] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        ten_nguoi_dung: '',
        chuc_danh: '',
        phong_ban: '',
        ten_dang_nhap: '',
        mat_khau: '',
    });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // Detail popup
    const [showDetailPopup, setShowDetailPopup] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Check login
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/sheets/users');
            if (!res.ok) throw new Error('Không thể tải dữ liệu');
            const data = await res.json();
            const rows = data.values || [];
            const filtered = filterSheetData(rows);
            const headers = ['id', 'ten_nguoi_dung', 'chuc_danh', 'phong_ban', 'ten_dang_nhap', 'mat_khau'];
            const mapped = filtered.map(row => {
                const obj = {};
                headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
                return obj;
            });
            setUsers(mapped);
            setLastSync(Date.now());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    // Filter & pagination
    const filteredUsers = useMemo(() => {
        let result = users;
        if (searchKeyword.trim()) {
            const kw = searchKeyword.trim().toLowerCase();
            result = result.filter(u =>
                u.ten_nguoi_dung.toLowerCase().includes(kw) ||
                u.ten_dang_nhap.toLowerCase().includes(kw) ||
                u.chuc_danh.toLowerCase().includes(kw) ||
                u.phong_ban.toLowerCase().includes(kw)
            );
        }
        return result;
    }, [users, searchKeyword]);

    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchKeyword]);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // CRUD handlers
    const handleAdd = () => {
        setEditingUser(null);
        setFormData({ ten_nguoi_dung: '', chuc_danh: '', phong_ban: '', ten_dang_nhap: '', mat_khau: '' });
        setFormError('');
        setShowFormPopup(true);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            ten_nguoi_dung: user.ten_nguoi_dung,
            chuc_danh: user.chuc_danh,
            phong_ban: user.phong_ban,
            ten_dang_nhap: user.ten_dang_nhap,
            mat_khau: user.mat_khau,
        });
        setFormError('');
        setShowFormPopup(true);
        if (showDetailPopup) setShowDetailPopup(false);
    };

    const handleView = (user) => {
        setSelectedUser(user);
        setShowDetailPopup(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
        try {
            const res = await fetch(`/api/sheets/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchData();
                if (showDetailPopup) setShowDetailPopup(false);
            } else {
                alert('Xóa thất bại');
            }
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        // Basic validation
        if (!formData.ten_nguoi_dung.trim()) {
            setFormError('Vui lòng nhập họ tên');
            setFormLoading(false);
            return;
        }
        if (!formData.ten_dang_nhap.trim()) {
            setFormError('Vui lòng nhập tên đăng nhập');
            setFormLoading(false);
            return;
        }
        if (!formData.mat_khau.trim()) {
            setFormError('Vui lòng nhập mật khẩu');
            setFormLoading(false);
            return;
        }

        try {
            const url = '/api/sheets/users';
            const method = editingUser ? 'PUT' : 'POST';
            const payload = editingUser
                ? { id: editingUser.id, ...formData }
                : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                setShowFormPopup(false);
                setEditingUser(null);
                await fetchData();
            } else {
                setFormError(data.error || 'Có lỗi xảy ra');
            }
        } catch (err) {
            setFormError('Lỗi kết nối server');
        } finally {
            setFormLoading(false);
        }
    };

    // Permission check
    if (!canView && !permLoading) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content">
                    <div className="status-box" style={{ color: 'red' }}>
                        Bạn không có quyền truy cập trang này.
                    </div>
                </div>
            </div>
        );
    }

    if (loading && !refreshing) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content"><div className="status-box">Đang tải dữ liệu...</div></div>
            </div>
        );
    }

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                {/* Header */}
                <div className="page-header">
                    <h2><Users size={28} className="text-accent" /> QUẢN LÝ NGƯỜI DÙNG</h2>
                    <div className="header-right">
                        <span>Đồng bộ lúc: {lastSync ? new Date(lastSync).toLocaleString('vi-VN', { hour12: false }) : 'Chưa đồng bộ'}</span>
                        <button onClick={handleRefresh} className="btn-refresh" disabled={refreshing}>
                            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                            {refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
                        </button>
                        {canAdd && (
                            <button onClick={handleAdd} className="btn-add">
                                <Plus size={16} /> Thêm mới
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="error-box">{error}</div>}

                {/* Search & filter */}
                <div className="toolbar">
                    <div className="search-group">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, username, chức danh, phòng ban..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="search-input"
                        />
                        {searchKeyword && (
                            <button className="clear-search" onClick={() => setSearchKeyword('')}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrap">
                    <table className="bordered-table">
                        <thead>
                            <tr>
                                <th style={{ width: '5%' }}>STT</th>
                                <th style={{ width: '20%' }}>Họ tên</th>
                                <th style={{ width: '15%' }}>Chức danh</th>
                                <th style={{ width: '15%' }}>Phòng ban</th>
                                <th style={{ width: '15%' }}>Tên đăng nhập</th>
                                <th style={{ width: '15%' }}>Mật khẩu</th>
                                <th style={{ width: '15%' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.length === 0 ? (
                                <tr><td colSpan="7" className="cell-center">Không có người dùng nào</td></tr>
                            ) : (
                                paginatedUsers.map((user, idx) => (
                                    <tr key={user.id || idx}>
                                        <td className="cell-center">{startIndex + idx + 1}</td>
                                        <td>{escapeHtml(user.ten_nguoi_dung)}</td>
                                        <td>{escapeHtml(user.chuc_danh)}</td>
                                        <td>{escapeHtml(user.phong_ban)}</td>
                                        <td>{escapeHtml(user.ten_dang_nhap)}</td>
                                        <td className="cell-center">
                                            <span className="password-mask">••••••••</span>
                                        </td>
                                        <td className="cell-center">
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleView(user)}
                                                    className="action-btn view"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="action-btn edit"
                                                        title="Sửa"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="action-btn delete"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Hiển thị {paginatedUsers.length} / {filteredUsers.length} người dùng
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
            </div>

            {/* Form Popup (Thêm/Sửa) */}
            {showFormPopup && (
                <div className="popup-overlay" onClick={() => setShowFormPopup(false)}>
                    <div className="popup-container" onClick={e => e.stopPropagation()}>
                        <div className="popup-header">
                            <h4>{editingUser ? '✏️ Sửa người dùng' : '➕ Thêm người dùng'}</h4>
                            <button className="popup-close" onClick={() => setShowFormPopup(false)}>✕</button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="popup-form">
                            <div className="form-group">
                                <label>Họ tên <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="ten_nguoi_dung"
                                    value={formData.ten_nguoi_dung}
                                    onChange={handleFormChange}
                                    placeholder="Nhập họ tên"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Chức danh</label>
                                <input
                                    type="text"
                                    name="chuc_danh"
                                    value={formData.chuc_danh}
                                    onChange={handleFormChange}
                                    placeholder="Nhập chức danh"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phòng ban</label>
                                <input
                                    type="text"
                                    name="phong_ban"
                                    value={formData.phong_ban}
                                    onChange={handleFormChange}
                                    placeholder="Nhập phòng ban"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tên đăng nhập <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="ten_dang_nhap"
                                    value={formData.ten_dang_nhap}
                                    onChange={handleFormChange}
                                    placeholder="Nhập tên đăng nhập"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Mật khẩu <span className="required">*</span></label>
                                <input
                                    type="password"
                                    name="mat_khau"
                                    value={formData.mat_khau}
                                    onChange={handleFormChange}
                                    placeholder="Nhập mật khẩu"
                                    required
                                />
                            </div>
                            {formError && <div className="error-text">{formError}</div>}
                            <div className="form-actions">
                                <button type="submit" className="btn-submit" disabled={formLoading}>
                                    {formLoading ? 'Đang xử lý...' : editingUser ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                                <button type="button" className="btn-cancel" onClick={() => setShowFormPopup(false)}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Popup */}
            {showDetailPopup && selectedUser && (
                <div className="popup-overlay" onClick={() => setShowDetailPopup(false)}>
                    <div className="popup-container" onClick={e => e.stopPropagation()}>
                        <div className="popup-header">
                            <h4>👤 Chi tiết người dùng</h4>
                            <button className="popup-close" onClick={() => setShowDetailPopup(false)}>✕</button>
                        </div>
                        <div className="detail-body">
                            <div className="detail-row">
                                <span className="detail-label">Họ tên</span>
                                <span className="detail-value">{escapeHtml(selectedUser.ten_nguoi_dung)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Chức danh</span>
                                <span className="detail-value">{escapeHtml(selectedUser.chuc_danh) || '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Phòng ban</span>
                                <span className="detail-value">{escapeHtml(selectedUser.phong_ban) || '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Tên đăng nhập</span>
                                <span className="detail-value">{escapeHtml(selectedUser.ten_dang_nhap)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Mật khẩu</span>
                                <span className="detail-value">{escapeHtml(selectedUser.mat_khau)}</span>
                            </div>
                        </div>
                        <div className="popup-footer">
                            {canEdit && (
                                <button
                                    className="btn-edit"
                                    onClick={() => handleEdit(selectedUser)}
                                >
                                    <Edit size={16} /> Sửa
                                </button>
                            )}
                            {canDelete && (
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDelete(selectedUser.id)}
                                >
                                    <Trash2 size={16} /> Xóa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
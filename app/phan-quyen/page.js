'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { filterSheetData } from '@/lib/helpers';
import { ShieldCheck, RefreshCw, Plus, ChevronLeft, ChevronRight, Edit, Trash2, KeyRound } from 'lucide-react';
import PhanQuyenFormPopup from '@/components/PhanQuyenFormPopup/page';
import { usePermission } from '@/lib/hooks/usePermission';
import './style.css';

export default function PhanQuyenPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [userList, setUserList] = useState([]);
    const [lastSync, setLastSync] = useState(null);

    // Kiểm tra quyền cho trang phan-quyen
    const { loading: permLoading, canView, canAdd, canEdit, canDelete, refresh } = usePermission('phan-quyen');

    // Popup state
    const [showFormPopup, setShowFormPopup] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Điều hướng nếu chưa login
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    // Nếu không có quyền xem, hiển thị thông báo
    useEffect(() => {
        if (!permLoading && !canView) {
            // Có thể hiển thị thông báo thay vì redirect
        }
    }, [permLoading, canView]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // Lấy dữ liệu phân quyền
            const res = await fetch('/api/sheets/phan-quyen');
            if (!res.ok) throw new Error('Không thể tải dữ liệu phân quyền');
            const json = await res.json();
            const rows = json.values || [];
            let filtered = filterSheetData(rows);
            if (filtered.length > 0 && filtered[0].some(cell => String(cell).toLowerCase().includes('ma_trang'))) {
                filtered = filtered.slice(1);
            }
            const headers = ['id', 'ma_trang', 'ten_trang', 'mo_ta', 'show_tren_slide_bar', 'nhom_slidebar', 'ten_slidebar', 'quyen_admin', 'quyen_xem', 'quyen_them', 'quyen_sua', 'quyen_xoa'];
            const mapped = filtered.map(row => {
                const obj = {};
                headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
                return obj;
            });
            setData(mapped);

            // Lấy danh sách người dùng
            const userRes = await fetch('/api/sheets?type=users');
            if (userRes.ok) {
                const userJson = await userRes.json();
                const userRows = userJson.values || [];
                const userFiltered = filterSheetData(userRows);
                let userData = userFiltered;
                if (userData.length > 0 && userData[0].some(cell => String(cell).toLowerCase().includes('ten_nguoi_dung'))) {
                    userData = userData.slice(1);
                }
                const userHeaders = ['id', 'ten_nguoi_dung', 'chuc_danh', 'phong_ban', 'ten_dang_nhap', 'mat_khau'];
                const userMapped = userData.map(row => {
                    const obj = {};
                    userHeaders.forEach((h, idx) => { obj[h] = row[idx] || ''; });
                    return obj;
                });
                setUserList(userMapped);
            }

            setLastSync(Date.now());
        } catch (err) {
            console.error(err);
            alert('Lỗi tải dữ liệu');
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

    const handleAdd = () => {
        setEditingItem(null);
        setShowFormPopup(true);
    };

    const handleEdit = (item) => {
        if (!canEdit) {
            alert('Bạn không có quyền sửa');
            return;
        }
        setEditingItem(item);
        setShowFormPopup(true);
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            alert('Bạn không có quyền xóa');
            return;
        }
        if (!confirm('Bạn có chắc muốn xóa phân quyền này?')) return;
        try {
            const res = await fetch(`/api/sheets/phan-quyen?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchData();
            } else {
                alert('Xóa thất bại');
            }
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleSubmitPopup = async (formData) => {
        const payload = { ...formData };
        if (editingItem) {
            if (!canEdit) throw new Error('Bạn không có quyền sửa');
            const res = await fetch('/api/sheets/phan-quyen', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingItem.id, ...payload }),
            });
            if (!res.ok) throw new Error('Cập nhật thất bại');
        } else {
            if (!canAdd) throw new Error('Bạn không có quyền thêm');
            const res = await fetch('/api/sheets/phan-quyen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Thêm mới thất bại');
        }
        await fetchData();
        refresh();
    };

    // Pagination
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const paginatedData = data.slice(start, start + rowsPerPage);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    if (loading || permLoading) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content"><div className="status-box">Đang tải dữ liệu...</div></div>
            </div>
        );
    }

    if (!canView) {
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

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <div className="page-header">
                    <h2><KeyRound size={28} className="text-accent" /> PHÂN QUYỀN HỆ THỐNG</h2>
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

                <div className="table-wrap">
                    <table className="bordered-table">
                        <thead>
                            <tr>
                                <th style={{ width: '20%' }}>Tên trang</th>
                                <th style={{ width: '14%' }}>Admin</th>
                                <th style={{ width: '14%' }}>Xem</th>
                                <th style={{ width: '14%' }}>Thêm</th>
                                <th style={{ width: '14%' }}>Sửa</th>
                                <th style={{ width: '14%' }}>Xóa</th>
                                <th style={{ width: '10%' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan="8" className="cell-center">Không có dữ liệu</td></tr>
                            ) : (
                                paginatedData.map((row) => {
                                    const adminNames = row.quyen_admin ? row.quyen_admin.split(',').map(id => {
                                        const u = userList.find(user => user.id === id);
                                        return u ? u.ten_nguoi_dung : id;
                                    }).join(', ') : '';
                                    const xemNames = row.quyen_xem ? row.quyen_xem.split(',').map(id => {
                                        const u = userList.find(user => user.id === id);
                                        return u ? u.ten_nguoi_dung : id;
                                    }).join(', ') : '';
                                    const themNames = row.quyen_them ? row.quyen_them.split(',').map(id => {
                                        const u = userList.find(user => user.id === id);
                                        return u ? u.ten_nguoi_dung : id;
                                    }).join(', ') : '';
                                    const suaNames = row.quyen_sua ? row.quyen_sua.split(',').map(id => {
                                        const u = userList.find(user => user.id === id);
                                        return u ? u.ten_nguoi_dung : id;
                                    }).join(', ') : '';
                                    const xoaNames = row.quyen_xoa ? row.quyen_xoa.split(',').map(id => {
                                        const u = userList.find(user => user.id === id);
                                        return u ? u.ten_nguoi_dung : id;
                                    }).join(', ') : '';
                                    return (
                                        <tr key={row.id}>
                                            <td>{row.ten_trang}</td>
                                            <td>{adminNames || '—'}</td>
                                            <td>{xemNames || '—'}</td>
                                            <td>{themNames || '—'}</td>
                                            <td>{suaNames || '—'}</td>
                                            <td>{xoaNames || '—'}</td>
                                            <td className="cell-center">
                                                {canEdit && (
                                                    <button className="action-btn edit" onClick={() => handleEdit(row)} title="Sửa">
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button className="action-btn delete" onClick={() => handleDelete(row.id)} title="Xóa">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="pagination-container">
                        <div className="pagination-info">
                            Hiển thị {paginatedData.length} / {data.length} bản ghi
                        </div>
                        <div className="pagination-controls">
                            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">
                                <ChevronLeft size={16} /> Trước
                            </button>
                            <span className="pagination-page">Trang {currentPage} / {totalPages}</span>
                            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-btn">
                                Sau <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showFormPopup && (
                <PhanQuyenFormPopup
                    initialData={editingItem}
                    userList={userList}
                    onClose={() => {
                        setShowFormPopup(false);
                        setEditingItem(null);
                    }}
                    onSubmit={handleSubmitPopup}
                />
            )}
        </div>
    );
}
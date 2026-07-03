'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { filterSheetData } from '@/lib/helpers';
import { ShieldCheck, RefreshCw, Plus, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import QuyDinhFormPopup from '@/components/form_quydinhbaohanh/page';
import QuyDinhDetailPopup from '@/components/detail_quydinhbaohanh/page';
import { usePermission } from '@/lib/hooks/usePermission';
import './style.css';

export default function QuyDinhPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState([]);
    const [lastSync, setLastSync] = useState(null);

    // Kiểm tra quyền
    const { loading: permLoading, canView, canAdd, canEdit, canDelete } = usePermission('quy-dinh');

    // Popup states
    const [showDetailPopup, setShowDetailPopup] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showFormPopup, setShowFormPopup] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemBeforeEdit, setItemBeforeEdit] = useState(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Điều hướng nếu chưa login
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    // Hàm fetch dữ liệu - không phụ thuộc vào state nào
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/sheets/rule');
            if (!res.ok) throw new Error('Không thể tải dữ liệu');
            const json = await res.json();
            const rows = json.values || [];
            const filtered = filterSheetData(rows);
            const headers = [
                'id', 'nhom_san_pham', 'mau_cua', 'he_cua', 'ma_san_pham',
                'tieu_chi_1', 'time_1', 'tieu_chi_2', 'time_2',
                'tieu_chi_3', 'time_3', 'tieu_chi_4', 'time_4',
                'tieu_chi_5', 'time_5', 'hdsd_url', 'hdld_url', 'thoi_diem_ap_dung'
            ];
            const mapped = filtered.map(row => {
                const obj = {};
                headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
                return obj;
            });
            setData(mapped);
            setLastSync(Date.now());
            return mapped; // trả về dữ liệu mới
        } catch (err) {
            console.error(err);
            alert('Lỗi tải dữ liệu: ' + err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Fetch lần đầu
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    const handleView = (item) => {
        setSelectedItem(item);
        setShowDetailPopup(true);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setShowFormPopup(true);
        if (showDetailPopup) {
            setShowDetailPopup(false);
            setSelectedItem(null);
        }
    };

    const handleEditClick = (item) => {
        setItemBeforeEdit(item);
        setEditingItem(item);
        setShowFormPopup(true);
        setShowDetailPopup(false);
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            alert('Bạn không có quyền xóa');
            return;
        }
        if (!confirm('Bạn có chắc muốn xóa quy định này?')) return;
        try {
            const res = await fetch(`/api/sheets/rule?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setShowDetailPopup(false);
                setSelectedItem(null);
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
        try {
            if (editingItem) {
                if (!canEdit) throw new Error('Bạn không có quyền sửa');
                const res = await fetch('/api/sheets/rule', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingItem.id, ...payload }),
                });
                if (!res.ok) throw new Error('Cập nhật thất bại');
            } else {
                if (!canAdd) throw new Error('Bạn không có quyền thêm');
                const res = await fetch('/api/sheets/rule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Thêm mới thất bại');
            }

            // Fetch lại dữ liệu và nhận kết quả
            const newData = await fetchData();

            // Nếu là sửa, mở lại detail với dữ liệu mới
            if (editingItem && newData) {
                const updated = newData.find(item => item.id === editingItem.id);
                if (updated) {
                    setSelectedItem(updated);
                    setShowDetailPopup(true);
                } else {
                    setShowDetailPopup(false);
                    setSelectedItem(null);
                }
            }

            setShowFormPopup(false);
            setEditingItem(null);
            setItemBeforeEdit(null);
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    const handleFormCancel = () => {
        setShowFormPopup(false);
        if (itemBeforeEdit) {
            setSelectedItem(itemBeforeEdit);
            setShowDetailPopup(true);
            setItemBeforeEdit(null);
        }
        setEditingItem(null);
    };

    // Pagination
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const paginatedData = data.slice(start, start + rowsPerPage);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const formatDateDisplay = (val) => {
        if (!val) return '';
        return val.split('T')[0];
    };

    // Kiểm tra quyền
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
                    <h2><ShieldCheck size={28} className="text-accent" /> QUY ĐỊNH BẢO HÀNH & BẢO TRÌ</h2>
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
                                <th style={{ width: '20%' }}>Nhóm sản phẩm</th>
                                <th style={{ width: '20%' }}>Mẫu sản phẩm</th>
                                <th style={{ width: '20%' }}>Hệ sản phẩm</th>
                                <th style={{ width: '30%' }}>Mã sản phẩm</th>
                                <th style={{ width: '10%' }} className="cell-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan="5" className="cell-center">Không có dữ liệu</td></tr>
                            ) : (
                                paginatedData.map((row) => (
                                    <tr key={row.id}>
                                        <td>{row.ma_san_pham}</td>
                                        <td>{row.nhom_san_pham}</td>
                                        <td>{row.mau_cua}</td>
                                        <td>{row.he_cua}</td>
                                        <td className="cell-center">
                                            <button className="view-btn" onClick={() => handleView(row)} title="Xem chi tiết">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
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

            {showDetailPopup && selectedItem && (
                <QuyDinhDetailPopup
                    data={selectedItem}
                    canAdd={canAdd}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onClose={() => { setShowDetailPopup(false); setSelectedItem(null); }}
                    onEditClick={handleEditClick}
                    onDelete={handleDelete}
                />
            )}

            {showFormPopup && (
                <QuyDinhFormPopup
                    initialData={editingItem}
                    existingData={data}
                    onClose={handleFormCancel}
                    onSubmit={handleSubmitPopup}
                />
            )}
        </div>
    );
}
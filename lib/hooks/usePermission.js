import { useEffect, useState, useCallback } from 'react';

export function usePermission(maTrang) {
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState({
        isAdmin: false,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
    });

    const checkPermission = useCallback(async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const url = `/api/sheets/phan-quyen?_=${Date.now()}`;
            const res = await fetch(url, {
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (!res.ok) throw new Error('Không thể tải phân quyền');
            const json = await res.json();
            const rows = json.values || [];

            const row = rows.find(r => r[1] === maTrang);
            if (!row) {
                setPermissions({ isAdmin: false, canView: false, canAdd: false, canEdit: false, canDelete: false });
                setLoading(false);
                return;
            }

            const adminIds = row[7] ? row[7].split(',').filter(Boolean) : [];
            const viewIds = row[8] ? row[8].split(',').filter(Boolean) : [];
            const addIds = row[9] ? row[9].split(',').filter(Boolean) : [];
            const editIds = row[10] ? row[10].split(',').filter(Boolean) : [];
            const deleteIds = row[11] ? row[11].split(',').filter(Boolean) : [];

            const isAdmin = adminIds.includes(userId);
            const canView = isAdmin || viewIds.includes(userId);
            const canAdd = isAdmin || addIds.includes(userId);
            const canEdit = isAdmin || editIds.includes(userId);
            const canDelete = isAdmin || deleteIds.includes(userId);

            setPermissions({ isAdmin, canView, canAdd, canEdit, canDelete });
        } catch (err) {
            console.error('Permission check error:', err);
        } finally {
            setLoading(false);
        }
    }, [maTrang]);

    // Hàm refresh để gọi từ bên ngoài
    const refresh = useCallback(() => {
        checkPermission();
    }, [checkPermission]);

    useEffect(() => {
        // Lần đầu
        checkPermission();

        // Chỉ gọi khi focus/visibility change (không polling)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkPermission();
            }
        };
        const handleFocus = () => {
            checkPermission();
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkPermission]);

    return { ...permissions, loading, refresh };
}
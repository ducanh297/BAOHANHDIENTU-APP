'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HuongDanPage() {
    const router = useRouter();

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <h1>📘 Hướng dẫn sử dụng</h1>
                <ul>
                    <li><strong>Dashboard:</strong> Xem tổng quan và biểu đồ.</li>
                    <li><strong>Bảo hành:</strong> Quản lý danh sách đơn hàng, xem chi tiết.</li>
                    <li><strong>Tra cứu:</strong> Tra cứu thông tin bảo hành theo mã đơn hàng.</li>
                    <li><strong>Hồ sơ:</strong> Xem thông tin cá nhân.</li>
                </ul>
                <p>Mọi thắc mắc vui lòng liên hệ bộ phận IT.</p>
            </div>
        </div>
    );
}
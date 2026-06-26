'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState({ name: '', chucDanh: '', phongBan: '', loginTime: '' });

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
        setUser({
            name: localStorage.getItem('fullName') || '',
            chucDanh: localStorage.getItem('chucDanh') || '',
            phongBan: localStorage.getItem('phongBan') || '',
            loginTime: localStorage.getItem('loginTime') || '',
        });
    }, [router]);

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <h1>👤 Hồ sơ của tôi</h1>
                <div className="profile-card">
                    <p><strong>Họ và tên:</strong> {user.name}</p>
                    <p><strong>Chức danh:</strong> {user.chucDanh}</p>
                    <p><strong>Phòng ban:</strong> {user.phongBan}</p>
                    <p><strong>Đăng nhập lúc:</strong> {user.loginTime ? new Date(parseInt(user.loginTime)).toLocaleString('vi-VN') : ''}</p>
                </div>
            </div>
        </div>
    );
}
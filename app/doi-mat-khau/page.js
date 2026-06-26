'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const router = useRouter();

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <h1>🔒 Đổi mật khẩu</h1>
                <p>Chức năng đang được phát triển. Vui lòng liên hệ quản trị để được hỗ trợ.</p>
            </div>
        </div>
    );
}
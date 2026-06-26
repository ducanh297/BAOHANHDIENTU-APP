'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LienHePage() {
    const router = useRouter();

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) router.push('/login');
    }, [router]);

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <h1>📞 Liên hệ hỗ trợ</h1>
                <p><strong>Hotline:</strong> 1900 0282</p>
                <p><strong>Email:</strong> support@quangminhpro.com</p>
                <p><strong>Giờ làm việc:</strong> 8:00 – 17:30, Thứ 2 – Thứ 6</p>
            </div>
        </div>
    );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { filterSheetData, normalizeDate, addMonths, daysBetween } from '@/lib/helpers';
// Import các icon chuyên nghiệp từ lucide-react
import {
    LayoutDashboard,
    BookOpen,
    PhoneCall,
    ShieldCheck,
    BrickWallShield,
    User,
    KeyRound,
    LogOut,
    X,
    Menu as MenuIcon
} from 'lucide-react';
import './style.css';

export default function SlideBar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState({ name: '', chucDanh: '', phongBan: '', loginTime: '' });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [expiringCount, setExpiringCount] = useState(0);

    useEffect(() => {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
        if (loggedIn) {
            setUser({
                name: localStorage.getItem('fullName') || '',
                chucDanh: localStorage.getItem('chucDanh') || '',
                phongBan: localStorage.getItem('phongBan') || '',
                loginTime: localStorage.getItem('loginTime') || '',
            });
            fetchExpiringCount();
        } else {
            setUser({ name: '', chucDanh: '', phongBan: '', loginTime: '' });
            setExpiringCount(0);
        }
    }, [pathname]);

    const fetchExpiringCount = async () => {
        try {
            const res = await fetch('/api/sheets?type=main');
            const data = await res.json();
            const rows = data.values || [];
            const filtered = filterSheetData(rows);
            let count = 0;
            const today = new Date();
            filtered.forEach(row => {
                const delivery = normalizeDate(row[5]);
                if (!delivery) return;
                const expiry = addMonths(delivery, 12);
                const days = daysBetween(today, expiry);
                if (days >= 0 && days <= 30) count++;
            });
            setExpiringCount(count);
        } catch (e) {
            console.error('Lỗi lấy số đơn sắp hết hạn:', e);
        }
    };

    if (pathname === '/login' || pathname === '/thong-tin') return null;

    const toggleSlideBar = () => setIsOpen(!isOpen);

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('fullName');
        localStorage.removeItem('chucDanh');
        localStorage.removeItem('phongBan');
        localStorage.removeItem('loginTime');
        window.location.href = '/login';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleString('vi-VN', { hour12: false });
    };

    // Định nghĩa Menu với Component Icon thay vì Emoji
    const mainMenus = [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { path: '/bao-hanh', label: 'Thông tin bảo hành', icon: <ShieldCheck size={18} /> },
    ];

    const supportMenus = [
        { path: '/huong-dan', label: 'Hướng dẫn', icon: <BookOpen size={18} /> },
        { path: '/lien-he', label: 'Liên hệ hỗ trợ', icon: <PhoneCall size={18} /> },
        { path: '/quy-dinh', label: 'Quy định bảo hành', icon: <BrickWallShield size={18} /> },
    ];

    const accountMenus = [
        { path: '/profile', label: 'Hồ sơ', icon: <User size={18} /> },
        { path: '/doi-mat-khau', label: 'Đổi mật khẩu', icon: <KeyRound size={18} /> },
    ];

    return (
        <>
            {/* Nút hamburger chuyên nghiệp hơn */}
            <button className="hamburger-btn" onClick={toggleSlideBar}>
                <MenuIcon size={24} color="#f1f5f9" />
            </button>

            {isOpen && <div className="slide-overlay" onClick={toggleSlideBar}></div>}

            <nav className={`slide-bar ${isOpen ? 'slide-bar-open' : ''}`}>
                {/* Header */}
                <div className="slide-bar-header">
                    <h2>MENU</h2>
                    <button className="close-btn" onClick={toggleSlideBar}>
                        <X size={22} />
                    </button>
                </div>

                {/* Thông tin người dùng */}
                {isLoggedIn && (
                    <div className="user-profile">
                        <div className="avatar-circle">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-role">Chức danh: {user.chucDanh}</div>
                            <div className="user-role">Phòng ban: {user.phongBan}</div>
                        </div>
                    </div>
                )}

                <ul className="slide-nav-list">
                    {/* Điều hướng */}
                    <li className="nav-group-title">ĐIỀU HƯỚNG</li>
                    {mainMenus.map((item) => (
                        <li key={item.path}>
                            <Link
                                href={item.path}
                                className={`slide-nav-link ${pathname === item.path ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="nav-icon">{item.icon}</span> {item.label}
                                {item.path === '/bao-hanh' && expiringCount > 0 && (
                                    <span className="badge">{expiringCount}</span>
                                )}
                            </Link>
                        </li>
                    ))}

                    {/* Hỗ trợ */}
                    <li className="nav-group-title">HỖ TRỢ</li>
                    {supportMenus.map((item) => (
                        <li key={item.path}>
                            <Link
                                href={item.path}
                                className={`slide-nav-link ${pathname === item.path ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="nav-icon">{item.icon}</span> {item.label}
                            </Link>
                        </li>
                    ))}

                    {/* Tài khoản */}
                    <li className="nav-group-title">TÀI KHOẢN</li>
                    {accountMenus.map((item) => (
                        <li key={item.path}>
                            <Link
                                href={item.path}
                                className={`slide-nav-link ${pathname === item.path ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="nav-icon">{item.icon}</span> {item.label}
                            </Link>
                        </li>
                    ))}

                    {/* Trạng thái đăng nhập */}
                    {isLoggedIn && (
                        <>
                            <li className="nav-group-title">TRẠNG THÁI</li>
                            <li>
                                <div className="status-item">
                                    <div className="status-header">
                                        <span className="status-dot online"></span>
                                        <span className="status-label">Đã đăng nhập</span>
                                    </div>
                                    <span className="status-time">Lúc: {formatTime(user.loginTime)}</span>
                                </div>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="logout-btn">
                                    <span className="nav-icon"><LogOut size={18} /></span> Đăng xuất
                                </button>
                            </li>
                        </>
                    )}
                </ul>

                {/* Footer */}
                <div className="slide-bar-footer">
                    <div className="app-version">Phiên bản 1.0.0</div>
                    <div className="app-copyright">© 2026 Quang Minh Pro</div>
                </div>
            </nav>
        </>
    );
}
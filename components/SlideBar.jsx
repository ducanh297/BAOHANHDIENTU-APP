'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
    { path: '/dashboard', label: '📊 Dashboard', icon: '📊' },
    { path: '/bao-hanh', label: '🛠 Bảo hành', icon: '🛠' },
    { path: '/thong-tin', label: 'ℹ️ Thông tin', icon: 'ℹ️' },
    { path: '/login', label: '🔑 Đăng nhập', icon: '🔑' },
];

export default function SlideBar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSlideBar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Nút hamburger để mở/đóng Slide Bar */}
            <button className="hamburger-btn" onClick={toggleSlideBar}>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
            </button>

            {/* Overlay nền mờ */}
            {isOpen && <div className="slide-overlay" onClick={toggleSlideBar}></div>}

            {/* Slide Bar */}
            <nav className={`slide-bar ${isOpen ? 'slide-bar-open' : ''}`}>
                <div className="slide-bar-header">
                    <h2>📱 Menu</h2>
                    <button className="close-btn" onClick={toggleSlideBar}>✕</button>
                </div>
                <ul className="slide-nav-list">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <Link
                                href={item.path}
                                className={`slide-nav-link ${pathname === item.path ? 'active' : ''}`}
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </>
    );
}
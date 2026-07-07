'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { filterSheetData, normalizeDate, addMonths, daysBetween } from '@/lib/helpers';
import {
    LayoutDashboard,
    BookOpen,
    PhoneCall,
    ShieldCheck,
    BrickWallShield,
    User,
    LogOut,
    X,
    Menu as MenuIcon,
    KeyRound,
} from 'lucide-react';
import './style.css';

export default function SlideBar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState({ name: '', chucDanh: '', phongBan: '', loginTime: '' });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [expiringCount, setExpiringCount] = useState(0);
    const [allowedMenus, setAllowedMenus] = useState([]);
    const [loadingMenus, setLoadingMenus] = useState(true);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        setIsLoggedIn(loggedIn);
        const uid = localStorage.getItem('userId');
        setUserId(uid);
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

    // Lấy danh sách menu theo quyền
    useEffect(() => {
        if (!isLoggedIn) {
            setLoadingMenus(false);
            return;
        }
        const fetchPermissions = async () => {
            try {
                const res = await fetch('/api/sheets/phan-quyen', {
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (!res.ok) throw new Error('Failed to fetch permissions');
                const json = await res.json();
                const rows = json.values || [];
                const data = filterSheetData(rows);
                const visibleMenus = data.filter(row => row[4] && row[4].toLowerCase() === 'yes');
                const menus = visibleMenus.map(row => {
                    const maTrang = row[1] || '';
                    const tenSlidebar = row[6] || '';
                    const nhomSlidebar = row[5] || '';
                    const adminIds = row[7] ? row[7].split(',').filter(Boolean) : [];
                    const viewIds = row[8] ? row[8].split(',').filter(Boolean) : [];
                    const isAdmin = userId && adminIds.includes(userId);
                    const canView = isAdmin || (userId && viewIds.includes(userId));
                    const path = maTrang.startsWith('/') ? maTrang : '/' + maTrang;
                    return { maTrang: path, tenSlidebar, nhomSlidebar, canView };
                });
                const allowed = menus.filter(m => m.canView);
                setAllowedMenus(allowed);
            } catch (err) {
                console.error('Lỗi lấy phân quyền slidebar:', err);
            } finally {
                setLoadingMenus(false);
            }
        };
        fetchPermissions();
    }, [isLoggedIn, userId]);

    // Nhóm menu theo nhom_slidebar
    const groupedMenus = () => {
        const groups = {};
        allowedMenus.forEach(item => {
            const group = item.nhomSlidebar || 'Khác';
            if (!groups[group]) groups[group] = [];
            groups[group].push({ path: item.maTrang, label: item.tenSlidebar });
        });
        return groups;
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
        localStorage.removeItem('userId');
        window.location.href = '/login';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleString('vi-VN', { hour12: false });
    };

    const getIcon = (path) => {
        const iconMap = {
            '/dashboard': <LayoutDashboard size={18} />,
            '/bao-hanh': <ShieldCheck size={18} />,
            '/quy-dinh': <BrickWallShield size={18} />,
            '/huong-dan': <BookOpen size={18} />,
            '/lien-he': <PhoneCall size={18} />,
            '/profile': <User size={18} />,
            '/phan-quyen': <KeyRound size={18} />,
        };
        return iconMap[path] || <LayoutDashboard size={18} />;
    };

    const groups = groupedMenus();

    if (loadingMenus && isLoggedIn) {
        return (
            <>
                <button className="hamburger-btn" onClick={toggleSlideBar}>
                    <MenuIcon size={24} color="#f1f5f9" />
                </button>
                {isOpen && <div className="slide-overlay" onClick={toggleSlideBar}></div>}
                <nav className={`slide-bar ${isOpen ? 'slide-bar-open' : ''}`}>
                    <div className="slide-bar-header">
                        <h2>MENU</h2>
                        <button className="close-btn" onClick={toggleSlideBar}>
                            <X size={22} />
                        </button>
                    </div>
                    <div style={{ padding: '20px', color: '#94a3b8' }}>Đang tải menu...</div>
                </nav>
            </>
        );
    }

    return (
        <>
            <button className="hamburger-btn" onClick={toggleSlideBar}>
                <MenuIcon size={24} color="#f1f5f9" />
            </button>

            {isOpen && <div className="slide-overlay" onClick={toggleSlideBar}></div>}

            <nav className={`slide-bar ${isOpen ? 'slide-bar-open' : ''}`}>
                <div className="slide-bar-header">
                    <h2>MENU</h2>
                    <button className="close-btn" onClick={toggleSlideBar}>
                        <X size={22} />
                    </button>
                </div>

                {isLoggedIn && (
                    <div className="user-profile">
                        <div className="avatar-circle">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-role">Chức danh: {user.chucDanh}</div>
                            <div className="user-role">Phòng ban: {user.phongBan}</div>
                            <div className="user-role login-time">Đã đăng nhập lúc: {formatTime(user.loginTime)}</div>
                        </div>
                    </div>
                )}

                <ul className="slide-nav-list">
                    {Object.keys(groups).map((groupName) => (
                        <li key={groupName} className="nav-group">
                            <div className="nav-group-title">{groupName.toUpperCase()}</div>
                            <ul className="nav-group-items">
                                {groups[groupName].map((item) => {
                                    const isActive = pathname === item.path;
                                    return (
                                        <li key={item.path}>
                                            <Link
                                                href={item.path}
                                                className={`slide-nav-link ${isActive ? 'active' : ''}`}
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <span className="nav-icon">{getIcon(item.path)}</span> {item.label}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}

                    {isLoggedIn && (
                        <li className="nav-group-last" >
                            <div className="nav-group-title"></div>
                            <ul className="nav-group-items">
                                <li>
                                    <button onClick={handleLogout} className="logout-btn">
                                        <span className="nav-icon"><LogOut size={18} /></span> Đăng xuất
                                    </button>
                                </li>
                            </ul>
                        </li>
                    )}
                </ul>

                <div className="slide-bar-footer">
                    <div className="app-version">Phiên bản 1.0.0</div>
                    <div className="app-copyright">© 2026 Quang Minh Pro</div>
                </div>
            </nav>
        </>
    );
}
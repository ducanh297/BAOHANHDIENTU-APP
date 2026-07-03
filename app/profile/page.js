'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Clock, KeyRound, Eye, EyeOff, Lock, LogOut, Edit2 } from 'lucide-react';
import './style.css';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState({ fullName: '', username: '', chucDanh: '', phongBan: '', loginTime: '' });
    const [loading, setLoading] = useState(true);

    // Popup xem password
    const [showViewPasswordPopup, setShowViewPasswordPopup] = useState(false);
    const [viewPasswordInput, setViewPasswordInput] = useState('');
    const [viewPasswordError, setViewPasswordError] = useState('');
    const [viewPasswordLoading, setViewPasswordLoading] = useState(false);
    const [revealedPassword, setRevealedPassword] = useState('');

    // Popup đổi mật khẩu & tên đăng nhập
    const [showChangePasswordPopup, setShowChangePasswordPopup] = useState(false);
    const [changePasswordForm, setChangePasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        newUsername: '',
    });
    const [changePasswordError, setChangePasswordError] = useState('');
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }
        const fullName = localStorage.getItem('fullName') || '';
        const username = localStorage.getItem('username') || '';
        const chucDanh = localStorage.getItem('chucDanh') || '';
        const phongBan = localStorage.getItem('phongBan') || '';
        const loginTime = localStorage.getItem('loginTime') || '';
        setUser({ fullName, username, chucDanh, phongBan, loginTime });
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('fullName');
        localStorage.removeItem('chucDanh');
        localStorage.removeItem('phongBan');
        localStorage.removeItem('loginTime');
        router.push('/login');
    };

    // Xem password
    const handleViewPasswordSubmit = async (e) => {
        e.preventDefault();
        setViewPasswordError('');
        setViewPasswordLoading(true);
        try {
            const res = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, password: viewPasswordInput }),
            });
            const data = await res.json();
            if (data.success) {
                setRevealedPassword(data.password);
                setViewPasswordInput('');
                setViewPasswordError('');
                setTimeout(() => {
                    setRevealedPassword('');
                    setShowViewPasswordPopup(false);
                }, 8000);
            } else {
                setViewPasswordError(data.error || 'Sai mật khẩu');
            }
        } catch (err) {
            setViewPasswordError('Lỗi kết nối server');
        } finally {
            setViewPasswordLoading(false);
        }
    };

    const closeViewPasswordPopup = () => {
        setShowViewPasswordPopup(false);
        setRevealedPassword('');
        setViewPasswordInput('');
        setViewPasswordError('');
    };

    // Đổi mật khẩu + tên đăng nhập
    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setChangePasswordError('');
        if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
            setChangePasswordError('Mật khẩu mới không khớp');
            return;
        }
        if (changePasswordForm.newPassword.length < 4) {
            setChangePasswordError('Mật khẩu mới phải có ít nhất 4 ký tự');
            return;
        }
        setChangePasswordLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    newUsername: changePasswordForm.newUsername || user.username,
                    oldPassword: changePasswordForm.oldPassword,
                    newPassword: changePasswordForm.newPassword,
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.newUsername && data.newUsername !== user.username) {
                    localStorage.setItem('username', data.newUsername);
                    setUser(prev => ({ ...prev, username: data.newUsername }));
                }
                alert('Cập nhật thành công!');
                setShowChangePasswordPopup(false);
                setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '', newUsername: '' });
            } else {
                setChangePasswordError(data.error || 'Cập nhật thất bại');
            }
        } catch (err) {
            setChangePasswordError('Lỗi kết nối server');
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const handleChangePasswordChange = (e) => {
        const { name, value } = e.target;
        setChangePasswordForm(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="page-shell" style={{ paddingTop: '50px' }}>
                <div className="content"><div className="status-box">Đang tải...</div></div>
            </div>
        );
    }

    const formatLoginTime = (timestamp) => {
        if (!timestamp) return 'Chưa có dữ liệu';
        const date = new Date(parseInt(timestamp));
        return date.toLocaleString('vi-VN', { hour12: false });
    };

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <div className="profile-card">
                    {/* Avatar & thông tin cơ bản */}
                    <div className="profile-header">
                        <div className="profile-avatar-large">
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="profile-name-title">
                            <h1>{user.fullName}</h1>
                            <div className="profile-badge">{user.chucDanh || 'Nhân viên'}</div>
                            <div className="profile-login-time">
                                <Clock size={14} className="icon-muted" />
                                Đăng nhập gần nhất: {formatLoginTime(user.loginTime)}
                            </div>
                        </div>
                    </div>

                    {/* Thông tin tài khoản hệ thống */}
                    <div className="profile-details">
                        <div className="section-label">
                            <User size={18} className="icon-accent" />
                            THÔNG TIN TÀI KHOẢN HỆ THỐNG
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Họ và tên</span>
                            <span className="detail-value">{user.fullName}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Phòng ban công tác</span>
                            <span className="detail-value">{user.phongBan || '---'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Chức danh / Vị trí</span>
                            <span className="detail-value">{user.chucDanh || 'Nhân viên'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Tên tài khoản (Username)</span>
                            <span className="detail-value">{user.username}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Mật khẩu</span>
                            <div className="password-field">
                                <span>{revealedPassword || '••••••••'}</span>
                                <button
                                    className="icon-btn"
                                    onClick={() => setShowViewPasswordPopup(true)}
                                    title="Xem mật khẩu"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    className="icon-btn"
                                    onClick={() => setShowChangePasswordPopup(true)}
                                    title="Đổi mật khẩu / tên đăng nhập"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popup xem password */}
            {showViewPasswordPopup && (
                <div className="popup-overlay" onClick={closeViewPasswordPopup}>
                    <div className="popup-container" onClick={e => e.stopPropagation()}>
                        <div className="popup-header">
                            <h4>🔐 Xác thực mật khẩu</h4>
                            <button className="popup-close" onClick={closeViewPasswordPopup}>✕</button>
                        </div>
                        <form onSubmit={handleViewPasswordSubmit} className="popup-form">
                            {!revealedPassword ? (
                                <>
                                    <p className="popup-desc">Nhập mật khẩu hiện tại để xem mật khẩu của bạn.</p>
                                    <div className="form-group">
                                        <label>Mật khẩu hiện tại</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={viewPasswordInput}
                                            onChange={(e) => setViewPasswordInput(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    {viewPasswordError && (
                                        <div className="error-text">{viewPasswordError}</div>
                                    )}
                                    <div className="form-actions">
                                        <button type="submit" className="btn-submit" disabled={viewPasswordLoading}>
                                            {viewPasswordLoading ? 'Đang xác thực...' : 'Xác thực'}
                                        </button>
                                        <button type="button" className="btn-cancel" onClick={closeViewPasswordPopup}>Hủy</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="revealed-password">
                                        <p>Mật khẩu của bạn:</p>
                                        <div className="password-box">
                                            <span>{revealedPassword}</span>
                                            <button
                                                type="button"
                                                className="icon-btn"
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(revealedPassword);
                                                    alert('Đã sao chép mật khẩu!');
                                                }}
                                                title="Sao chép"
                                            >
                                                <Lock size={16} />
                                            </button>
                                        </div>
                                        <p className="hint">Mật khẩu sẽ tự động ẩn sau 8 giây.</p>
                                        <button type="button" className="btn-cancel" onClick={closeViewPasswordPopup}>Đóng</button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Popup đổi mật khẩu & tên đăng nhập */}
            {showChangePasswordPopup && (
                <div className="popup-overlay" onClick={() => setShowChangePasswordPopup(false)}>
                    <div className="popup-container" onClick={e => e.stopPropagation()}>
                        <div className="popup-header">
                            <h4>🔑 Đổi mật khẩu & tên đăng nhập</h4>
                            <button className="popup-close" onClick={() => setShowChangePasswordPopup(false)}>✕</button>
                        </div>
                        <form onSubmit={handleChangePasswordSubmit} className="popup-form">
                            <div className="form-group">
                                <label>Tên đăng nhập mới <span className="hint">(để trống nếu không đổi)</span></label>
                                <input
                                    type="text"
                                    name="newUsername"
                                    placeholder={user.username}
                                    value={changePasswordForm.newUsername}
                                    onChange={handleChangePasswordChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    name="oldPassword"
                                    placeholder="••••••••"
                                    value={changePasswordForm.oldPassword}
                                    onChange={handleChangePasswordChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Mật khẩu mới</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    placeholder="••••••••"
                                    value={changePasswordForm.newPassword}
                                    onChange={handleChangePasswordChange}
                                    required
                                    minLength={4}
                                />
                            </div>
                            <div className="form-group">
                                <label>Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    value={changePasswordForm.confirmPassword}
                                    onChange={handleChangePasswordChange}
                                    required
                                />
                            </div>
                            {changePasswordError && (
                                <div className="error-text">{changePasswordError}</div>
                            )}
                            <div className="form-actions">
                                <button type="submit" className="btn-submit" disabled={changePasswordLoading}>
                                    {changePasswordLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                                </button>
                                <button type="button" className="btn-cancel" onClick={() => setShowChangePasswordPopup(false)}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
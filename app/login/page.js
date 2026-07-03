'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; import { User, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './style.css';

export default function LoginPage() {
    const [tenDangNhap, setTenDangNhap] = useState('');
    const [matKhau, setMatKhau] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ten_dang_nhap: tenDangNhap, mat_khau: matKhau }),
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('username', data.user.ten_dang_nhap);
                localStorage.setItem('fullName', data.user.ten_nguoi_dung);
                localStorage.setItem('chucDanh', data.user.chuc_danh || '');
                localStorage.setItem('phongBan', data.user.phong_ban || '')
                localStorage.setItem('loginTime', Date.now().toString());

                router.push('/dashboard');
            } else {
                setError(data.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
            }
        } catch (err) {
            setError('Lỗi kết nối server. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                {/* Logo */}
                <div className="logo-wrapper">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={130}
                        height={90}
                        priority
                        className="brand-logo"
                    />
                </div>

                <div className="login-header">
                    <h1>HỆ THỐNG THÔNG TIN<br></br>BẢO HÀNH ĐIỆN TỬ</h1>
                </div>

                {error && (
                    <div className="login-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <div className="input-with-icon">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                value={tenDangNhap}
                                onChange={(e) => setTenDangNhap(e.target.value)}
                                placeholder="Điền thông tin"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <div className="input-with-icon">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"} // 👈 Thay đổi type động
                                value={matKhau}
                                onChange={(e) => setMatKhau(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            {/* Nút con mắt được đặt ở cuối ô nhập liệu */}
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1" /* Để không ảnh hưởng đến phím Tab khi gõ form */
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? (
                            <span className="loader-text">Đang xử lý...</span>
                        ) : (
                            <>
                                Đăng nhập <LogIn size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Footer */}
            <div className="login-footer">
                <div className="footer-credit">
                    Phát triển bởi <strong>Quang Minh Pro &copy; {new Date().getFullYear()}</strong> <br />
                    Website: <a href="https://quangminhpro.com" target="_blank" rel="noopener noreferrer">quangminhpro.com</a>
                </div>
            </div>
        </div>
    );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const [tenDangNhap, setTenDangNhap] = useState('');
    const [matKhau, setMatKhau] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
                localStorage.setItem('username', data.user.ten_dang_nhap);
                localStorage.setItem('fullName', data.user.ten_nguoi_dung);
                localStorage.setItem('chucDanh', data.user.chuc_danh || '');
                localStorage.setItem('loginTime', Date.now().toString());

                router.push('/bao-hanh');
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Lỗi kết nối server');
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
                        width={120}
                        height={84}
                        priority
                    />
                </div>

                <h1>Đăng nhập</h1>
                <p className="login-sub">Vui lòng nhập thông tin đăng nhập để tiếp tục</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <input
                            type="text"
                            value={tenDangNhap}
                            onChange={(e) => setTenDangNhap(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <input
                            type="password"
                            value={matKhau}
                            onChange={(e) => setMatKhau(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>

            {/* Footer */}
            <div className="login-footer">
                <div>Hệ thống tra cứu bảo hành điện tử</div>
                <div>
                    Phát triển bởi <strong>Quang Minh Pro</strong> |
                    Website: <a href="https://quangminhpro.com" target="_blank" rel="noopener noreferrer">quangminhpro.com</a>
                </div>
            </div>

            <style jsx>{`
        .login-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #eef2ff, #dbeafe);
          padding: 20px;
        }
        .login-box {
          background: #fff;
          padding: 40px 40px 32px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }
        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .logo-wrapper img {
          height: auto;
          width: 100%;
          max-width: 120px;
          object-fit: contain;
        }
        .login-box h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: #0f172a;
          text-align: center;
        }
        .login-sub {
          color: #64748b;
          font-size: 14px;
          text-align: center;
          margin-bottom: 24px;
        }
        .login-error {
          background: #fee2e2;
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .form-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        button[type="submit"] {
          width: 100%;
          padding: 12px;
          background: #0f4c81;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        button[type="submit"]:hover {
          opacity: 0.9;
        }
        button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-footer {
          margin-top: 24px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(4px);
          border-radius: 12px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
          max-width: 400px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .login-footer a {
          color: #0f4c81;
          font-weight: 600;
          text-decoration: none;
        }
        .login-footer a:hover {
          text-decoration: underline;
        }
        .login-footer strong {
          color: #0f172a;
        }
        @media (max-width: 480px) {
          .login-box {
            padding: 24px 20px;
          }
          .login-footer {
            font-size: 12px;
            padding: 12px 16px;
          }
        }
      `}</style>
        </div>
    );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, PhoneCall, CheckCircle, AlertCircle } from 'lucide-react';
import './style.css';

export default function LienHePage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        hoTen: '',
        email: '',
        noiDung: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

    // Kiểm tra đăng nhập
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn) {
            router.push('/login');
        }
    }, [router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            // Gửi email qua API (nếu có) hoặc mở mailto
            // Hiện tại tôi sẽ mở mailto với nội dung soạn sẵn
            const subject = `Hỗ trợ từ ${formData.hoTen}`;
            const body = `Họ tên: ${formData.hoTen}\nEmail: ${formData.email}\n\nNội dung:\n${formData.noiDung}`;
            const mailtoLink = `mailto:support@quangminhpro.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(mailtoLink, '_blank');

            // Giả lập gửi thành công (do mailto không trả về kết quả)
            setSubmitStatus('success');
            setFormData({ hoTen: '', email: '', noiDung: '' });
            setTimeout(() => setSubmitStatus(null), 5000);
        } catch (error) {
            setSubmitStatus('error');
            setTimeout(() => setSubmitStatus(null), 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-shell" style={{ paddingTop: '50px' }}>
            <div className="content">
                <div className="page-header">
                    <h1><PhoneCall size={28} className="text-accent" /> LIÊN HỆ HỖ TRỢ</h1>
                </div>

                <div className="contact-grid">
                    {/* Cột trái: Thông tin liên hệ */}
                    <div className="contact-info">
                        <h2>Thông tin</h2>

                        <div className="contact-item">
                            <div className="contact-icon phone">
                                <Phone size={20} />
                            </div>
                            <div>
                                <div className="contact-label">Hotline hỗ trợ</div>
                                <a href="tel:+84987654321" className="contact-value">0915 842 996</a>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon email">
                                <Mail size={20} />
                            </div>
                            <div>
                                <div className="contact-label">Email</div>
                                <a href="mailto:support@quangminhpro.com" className="contact-value">ducanh-rd@quangminhpro.com</a>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon address">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <div className="contact-label">Địa chỉ</div>
                                <div className="contact-value">Cửa lưới Quang Minh, Km8+500, Đại lộ Thăng Long, Sơn Đồng, Hà Nội, Việt Nam</div>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon clock">
                                <Clock size={20} />
                            </div>
                            <div>
                                <div className="contact-label">Giờ làm việc</div>
                                <div className="contact-value">Thứ 2 - Thứ 7: Từ 8:00 đến 17:00</div>
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: Form liên hệ */}
                    <div className="map-wrapper">
                        <h2>Vị trí</h2>
                        <div className="map-container">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1107.305121236827!2d105.72601077331365!3d21.01204477068852!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1svi!2s!4v1783066640235!5m2!1svi!2s"
                                width="40%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
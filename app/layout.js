// app/layout.js
import './globals.css';
import SlideBar from '@/components/slidebar/page';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Thông tin bảo hành',
    description: 'Tra cứu bảo hành sản phẩm Quang Minh',
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi">
            <body className={inter.className}>
                <main>{children}</main>
                <SlideBar />
            </body>
        </html>
    );
}
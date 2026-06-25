import { getSheetData } from '@/lib/googleSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = 'nguoi_dung!A:F'; // id, ten_nguoi_dung, chuc_danh, phong_ban, ten_dang_nhap, mat_khau

export async function POST(request) {
    try {
        const { ten_dang_nhap, mat_khau } = await request.json();

        if (!ten_dang_nhap || !mat_khau) {
            return Response.json(
                { success: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' },
                { status: 400 }
            );
        }

        // Đọc dữ liệu từ sheet
        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        // Bỏ dòng header (nếu có)
        const dataRows = rows.slice(1);

        // Tìm người dùng khớp
        const user = dataRows.find(
            row => row[4]?.trim() === ten_dang_nhap.trim() && row[5]?.trim() === mat_khau.trim()
        );

        if (user) {
            return Response.json({
                success: true,
                user: {
                    ten_dang_nhap: user[4],
                    ten_nguoi_dung: user[1],
                    chuc_danh: user[2],
                    phong_ban: user[3],
                },
            });
        } else {
            return Response.json(
                { success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
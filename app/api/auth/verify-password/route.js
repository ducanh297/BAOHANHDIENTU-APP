import { getSheetData } from '@/lib/googleSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'your-sheet-id';
const RANGE = 'nguoi_dung!A:F'; // A:id, B:ten_nguoi_dung, C:chuc_danh, D:phong_ban, E:ten_dang_nhap, F:mat_khau

export async function POST(request) {
    try {
        const { username, password } = await request.json();
        if (!username || !password) {
            return Response.json({ error: 'Thiếu thông tin' }, { status: 400 });
        }

        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        // username ở cột 4 (E), password ở cột 5 (F)
        const filtered = rows.filter(row => row[4] === username && row[5] === password);
        if (filtered.length === 0) {
            return Response.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 });
        }

        // Trả về password (plaintext)
        return Response.json({ success: true, password: filtered[0][5] });
    } catch (error) {
        console.error('Verify password error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
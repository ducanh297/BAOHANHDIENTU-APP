import { getSheetData, updateSheetRow } from '@/lib/googleSheets';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'your-sheet-id';
const RANGE = 'nguoi_dung!A:F';

export async function POST(request) {
    try {
        const { username, newUsername, oldPassword, newPassword } = await request.json();
        if (!username || !oldPassword || !newPassword) {
            return Response.json({ error: 'Thiếu thông tin' }, { status: 400 });
        }

        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        // Tìm user hiện tại
        const currentIndex = rows.findIndex(row => row[4] === username && row[5] === oldPassword);
        if (currentIndex === -1) {
            return Response.json({ error: 'Sai mật khẩu hiện tại' }, { status: 401 });
        }

        // Nếu có thay đổi username, kiểm tra trùng lặp
        if (newUsername && newUsername !== username) {
            const exists = rows.some(row => row[4] === newUsername && row[4] !== username);
            if (exists) {
                return Response.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
            }
        }

        // Cập nhật dữ liệu
        const rowIndex = currentIndex + 1;
        const updatedRow = [...rows[currentIndex]];
        if (newUsername) updatedRow[4] = newUsername; // cột E: ten_dang_nhap
        updatedRow[5] = newPassword; // cột F: mat_khau

        await updateSheetRow(SPREADSHEET_ID, RANGE, rowIndex, updatedRow);

        return Response.json({
            success: true,
            newUsername: updatedRow[4] // trả về username mới để cập nhật localStorage
        });
    } catch (error) {
        console.error('Change password error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
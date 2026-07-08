import { getSheetData, appendSheetRow, updateSheetRow, deleteSheetRow } from '@/lib/googleSheets';
import { randomBytes } from 'crypto';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = 'nguoi_dung!A:F'; // 6 cột: id, ten_nguoi_dung, chuc_danh, phong_ban, ten_dang_nhap, mat_khau

// GET: lấy tất cả người dùng (cả header)
export async function GET() {
    try {
        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        return Response.json({ values: rows });
    } catch (error) {
        console.error('GET users error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// POST: thêm mới người dùng
export async function POST(request) {
    try {
        const body = await request.json();
        const newId = randomBytes(8).toString('hex'); // hoặc dùng Date.now()

        // Kiểm tra trùng tên đăng nhập
        const allRows = await getSheetData(SPREADSHEET_ID, RANGE);
        const existing = allRows.slice(1).find(row => row[4] === body.ten_dang_nhap);
        if (existing) {
            return Response.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
        }

        const rowData = [
            newId,
            body.ten_nguoi_dung || '',
            body.chuc_danh || '',
            body.phong_ban || '',
            body.ten_dang_nhap || '',
            body.mat_khau || '', // Nên mã hóa password trước khi lưu
        ];

        await appendSheetRow(SPREADSHEET_ID, RANGE, rowData);
        return Response.json({ success: true, id: newId });
    } catch (error) {
        console.error('POST user error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// PUT: cập nhật người dùng theo id
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        const allRows = await getSheetData(SPREADSHEET_ID, RANGE);
        const rowIndex = allRows.findIndex(row => row[0] === String(id));
        if (rowIndex === -1) {
            return Response.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
        }

        // Kiểm tra trùng tên đăng nhập (trừ chính nó)
        const existing = allRows.slice(1).find((row, idx) => row[4] === updateData.ten_dang_nhap && (idx + 1) !== rowIndex);
        if (existing) {
            return Response.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
        }

        const sheetRowNumber = rowIndex + 1;
        const newRow = [
            String(id),
            updateData.ten_nguoi_dung || '',
            updateData.chuc_danh || '',
            updateData.phong_ban || '',
            updateData.ten_dang_nhap || '',
            updateData.mat_khau || '',
        ];

        await updateSheetRow(SPREADSHEET_ID, RANGE, sheetRowNumber, newRow);
        return Response.json({ success: true });
    } catch (error) {
        console.error('PUT user error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: xóa người dùng theo id
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return Response.json({ error: 'Thiếu id' }, { status: 400 });
        }

        const allRows = await getSheetData(SPREADSHEET_ID, RANGE);
        const rowIndex = allRows.findIndex(row => row[0] === String(id));
        if (rowIndex === -1) {
            return Response.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
        }

        const sheetName = RANGE.split('!')[0];
        const sheetRowNumber = rowIndex + 1;
        await deleteSheetRow(SPREADSHEET_ID, sheetName, sheetRowNumber);
        return Response.json({ success: true });
    } catch (error) {
        console.error('DELETE user error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
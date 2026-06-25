import { getSheetData, appendSheetRow, updateSheetRow, deleteSheetRow } from '@/lib/googleSheets';
import { randomBytes } from 'crypto';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'your-sheet-id';
const HISTORY_RANGE = 'lich_su_bao_hanh!A:F';

// GET: lấy tất cả lịch sử
export async function GET() {
    try {
        const rows = await getSheetData(SPREADSHEET_ID, HISTORY_RANGE);
        return Response.json({ values: rows });
    } catch (error) {
        console.error('GET error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// POST: thêm mới một bản ghi
export async function POST(request) {
    try {
        const body = await request.json();
        // body: { id_ref, noi_dung_bao_hanh, nguoi_thuc_hien, ket_qua, ngay_bao_hanh }

        // Tạo ID ngẫu nhiên 20 ký tự
        const newId = randomBytes(10).toString('hex'); // 20 hex chars

        const rowData = [
            newId,
            body.id_ref,
            body.noi_dung_bao_hanh,
            body.nguoi_thuc_hien,
            body.ket_qua || '',
            body.ngay_bao_hanh,
        ];

        await appendSheetRow(SPREADSHEET_ID, HISTORY_RANGE, rowData);
        return Response.json({ success: true, id: newId });
    } catch (error) {
        console.error('POST error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// PUT: cập nhật một bản ghi (theo id)
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        // Tìm dòng có id tương ứng
        const allRows = await getSheetData(SPREADSHEET_ID, HISTORY_RANGE);
        const rowIndex = allRows.findIndex(row => row[0] === String(id));
        if (rowIndex === -1) {
            return Response.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
        }

        const newRow = [
            String(id),
            updateData.id_ref,
            updateData.noi_dung_bao_hanh,
            updateData.nguoi_thuc_hien,
            updateData.ket_qua || '',
            updateData.ngay_bao_hanh,
        ];

        await updateSheetRow(SPREADSHEET_ID, HISTORY_RANGE, rowIndex + 1, newRow);
        return Response.json({ success: true });
    } catch (error) {
        console.error('PUT error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: xóa bản ghi (theo id)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return Response.json({ error: 'Thiếu id' }, { status: 400 });
        }

        const allRows = await getSheetData(SPREADSHEET_ID, HISTORY_RANGE);
        const rowIndex = allRows.findIndex(row => row[0] === String(id));
        if (rowIndex === -1) {
            return Response.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
        }

        const sheetName = HISTORY_RANGE.split('!')[0];
        await deleteSheetRow(SPREADSHEET_ID, sheetName, rowIndex + 1);
        return Response.json({ success: true });
    } catch (error) {
        console.error('DELETE error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
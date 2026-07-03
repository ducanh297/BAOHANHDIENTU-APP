import { getSheetData, appendSheetRow, updateSheetRow, deleteSheetRow } from '@/lib/googleSheets';
import { randomBytes } from 'crypto';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'your-sheet-id';
const RANGE = 'phan_quyen!A:M';

// GET: lấy tất cả
export async function GET() {
    try {
        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        return new Response(JSON.stringify({ values: rows }), {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('GET error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// POST: thêm mới
export async function POST(request) {
    try {
        const body = await request.json();
        const newId = randomBytes(10).toString('hex');

        const rowData = [
            newId,
            body.ma_trang || '',
            body.ten_trang || '',
            body.mo_ta || '',
            body.show_tren_slide_bar || 'No',
            body.nhom_slidebar || '',
            body.ten_slidebar || '',
            body.quyen_admin || '',
            body.quyen_xem || '',
            body.quyen_them || '',
            body.quyen_sua || '',
            body.quyen_xoa || '',
        ];

        await appendSheetRow(SPREADSHEET_ID, RANGE, rowData);
        return Response.json({ success: true, id: newId });
    } catch (error) {
        console.error('POST error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// PUT: cập nhật
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        const allRows = await getSheetData(SPREADSHEET_ID, RANGE);
        const rowIndex = allRows.findIndex(row => row[0] === String(id));
        if (rowIndex === -1) {
            return Response.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
        }

        const newRow = [
            String(id),
            updateData.ma_trang || '',
            updateData.ten_trang || '',
            updateData.mo_ta || '',
            updateData.show_tren_slide_bar || 'No',
            updateData.nhom_slidebar || '',
            updateData.ten_slidebar || '',
            updateData.quyen_admin || '',
            updateData.quyen_xem || '',
            updateData.quyen_them || '',
            updateData.quyen_sua || '',
            updateData.quyen_xoa || '',
        ];

        await updateSheetRow(SPREADSHEET_ID, RANGE, rowIndex + 1, newRow);
        return Response.json({ success: true });
    } catch (error) {
        console.error('PUT error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: xóa
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
            return Response.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
        }

        const sheetName = RANGE.split('!')[0];
        await deleteSheetRow(SPREADSHEET_ID, sheetName, rowIndex + 1);
        return Response.json({ success: true });
    } catch (error) {
        console.error('DELETE error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
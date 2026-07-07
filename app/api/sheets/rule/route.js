import { getSheetData, appendSheetRow, updateSheetRow, deleteSheetRow } from '@/lib/googleSheets';
import { randomBytes } from 'crypto';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const RANGE = 'quy_dinh_bh_hdsd_hdld!A:R'; // có header

// GET: lấy tất cả dữ liệu (cả header)
export async function GET() {
    try {
        const rows = await getSheetData(SPREADSHEET_ID, RANGE);
        return Response.json({ values: rows });
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
            body.nhom_san_pham || '',
            body.mau_cua || '',
            body.he_cua || '',
            body.ma_san_pham || '',
            body.tieu_chi_1 || '',
            body.time_1 || '',
            body.tieu_chi_2 || '',
            body.time_2 || '',
            body.tieu_chi_3 || '',
            body.time_3 || '',
            body.tieu_chi_4 || '',
            body.time_4 || '',
            body.tieu_chi_5 || '',
            body.time_5 || '',
            body.hdsd_url || '',
            body.hdld_url || '',
            body.thoi_diem_ap_dung || '',
        ];

        await appendSheetRow(SPREADSHEET_ID, RANGE, rowData);
        return Response.json({ success: true, id: newId });
    } catch (error) {
        console.error('POST error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// PUT: cập nhật bằng id
export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        // 1. Lấy toàn bộ dữ liệu (có header)
        const allRows = await getSheetData(SPREADSHEET_ID, RANGE);

        // 2. Tìm vị trí (index) của dòng có id cần sửa
        const rowIndex = allRows.findIndex(row => row[0] === String(id));
        if (rowIndex === -1) {
            return Response.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
        }

        // 3. Số dòng thực tế trong sheet (1-based, dòng 1 là header)
        const sheetRowNumber = rowIndex + 1; // vì rowIndex là vị trí trong mảng, header ở index 0

        // 4. Chuẩn bị dữ liệu mới cho dòng đó
        const newRow = [
            String(id),
            updateData.nhom_san_pham || '',
            updateData.mau_cua || '',
            updateData.he_cua || '',
            updateData.ma_san_pham || '',
            updateData.tieu_chi_1 || '',
            updateData.time_1 || '',
            updateData.tieu_chi_2 || '',
            updateData.time_2 || '',
            updateData.tieu_chi_3 || '',
            updateData.time_3 || '',
            updateData.tieu_chi_4 || '',
            updateData.time_4 || '',
            updateData.tieu_chi_5 || '',
            updateData.time_5 || '',
            updateData.hdsd_url || '',
            updateData.hdld_url || '',
            updateData.thoi_diem_ap_dung || '',
        ];

        // 5. Log để kiểm tra (xóa sau khi ổn)
        console.log(`PUT: id=${id}, rowIndex=${rowIndex}, sheetRowNumber=${sheetRowNumber}`);

        // 6. Gọi update với đúng số dòng (sheetRowNumber)
        await updateSheetRow(SPREADSHEET_ID, RANGE, sheetRowNumber, newRow);

        return Response.json({ success: true });
    } catch (error) {
        console.error('PUT error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: xóa bằng id
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

        const sheetRowNumber = rowIndex + 1; // vì header ở dòng 1
        const sheetName = RANGE.split('!')[0];

        console.log(`DELETE: id=${id}, rowIndex=${rowIndex}, sheetRowNumber=${sheetRowNumber}`);

        await deleteSheetRow(SPREADSHEET_ID, sheetName, sheetRowNumber);

        return Response.json({ success: true });
    } catch (error) {
        console.error('DELETE error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
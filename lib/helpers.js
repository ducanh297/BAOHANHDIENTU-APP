export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function normalizeDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value)) return value;

    const s = String(value).trim();
    if (!s) return null;

    // 1. ISO (YYYY-MM-DD)
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) {
        const date = new Date(+m[1], +m[2] - 1, +m[3]);
        if (!isNaN(date) && date.getFullYear() === +m[1] && date.getMonth() === +m[2] - 1) {
            return date;
        }
    }

    // 2. DD/MM/YYYY (ưu tiên) – định dạng chuẩn của sheet
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);

        // Kiểm tra hợp lệ (ngày từ 1-31, tháng 1-12)
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date) && date.getDate() === day && date.getMonth() === month - 1) {
                return date;
            }
        }

        // Nếu không hợp lệ, thử hoán đổi (MM/DD/YYYY) nhưng không ưu tiên
        const dateAlt = new Date(year, day - 1, month);
        if (!isNaN(dateAlt) && dateAlt.getDate() === month && dateAlt.getMonth() === day - 1) {
            return dateAlt;
        }
    }

    // Fallback: new Date
    const parsed = new Date(s);
    if (!isNaN(parsed)) return parsed;

    return null;
}

export function formatDateDisplay(dateString) {
    if (!dateString) return '';
    const date = normalizeDate(dateString);
    if (!date) return String(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function parseNumberFromSheet(value) {
    if (value === '' || value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    const normalized = String(value).replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? '' : num;
}

export function formatNumberForDisplay(number) {
    if (number === '' || number === null || number === undefined) return '';
    return String(number).replace('.', ',');
}

export function normalizeKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

export function rowToObject(headers, row) {
    const obj = {};
    headers.forEach((header, index) => {
        obj[header] = row[index] ?? '';
    });
    return obj;
}

export function getValue(obj, ...keys) {
    for (const key of keys) {
        const normalized = normalizeKey(key);
        if (Object.prototype.hasOwnProperty.call(obj, normalized)) {
            return obj[normalized];
        }
    }
    return '';
}

export function addMonths(date, months) {
    const result = new Date(date.getTime());
    const desiredDay = result.getDate();
    result.setMonth(result.getMonth() + months);
    if (result.getDate() < desiredDay) {
        result.setDate(0);
    }
    return result;
}

export function startOfDay(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
}

export function daysBetween(startDate, endDate) {
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function formatDescription(text) {
    return escapeHtml(text)
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '<br>');
}

export function sanitizeUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (e) {
        return '';
    }
    return '';
}

export function getWarrantyStatusClass(remainingDays) {
    if (remainingDays < 0) return 'is-expired';
    if (remainingDays <= 30) return 'is-warning';
    return 'is-ok';
}

export function filterSheetData(rows) {
    if (!rows || rows.length === 0) return [];
    const headerRow = rows[0];
    // Kiểm tra nếu dòng đầu tiên chứa các từ khóa của header
    const isHeader = headerRow.some(cell => {
        const val = String(cell).toLowerCase();
        return val.includes('id') ||
            val.includes('ma_don_hang') ||
            val.includes('ma_hop_dong') ||
            val.includes('ten_nguoi_lien_he') ||
            val.includes('sdt_khach_hang') ||
            val.includes('ngay_ban_giao');
    });
    if (isHeader) {
        return rows.slice(1); // bỏ dòng header
    }
    return rows;
}

export function parseDetailRow(row) {
    return {
        id: row[0] || '',
        maDonHang: row[1] || '',
        stt: row[2] || '',
        maSanPham: row[3] || '',
        dienGiai: row[4] || '',
        chieuRong: row[5] || '',
        chieuCao: row[6] || '',
        soLuong: formatNumberForDisplay(parseNumberFromSheet(row[7])),
        soLuongParsed: parseNumberFromSheet(row[7]),
        ngayBanGiao: row[8] || '',
    };
}

// Parse history row
export function parseHistoryRow(row) {
    return {
        id: row[0] || '',
        idRef: row[1] || '',
        noiDungBaoHanh: row[2] || '',
        nguoiThucHien: row[3] || '',
        ketQua: row[4] || '',
        trangThai: row[5] || '',
        ngayTiepNhan: row[6] || '',
        ngayBaoHanh: row[7] || '',
    };
}

// Chuyển đổi từ YYYY-MM-DD sang DD/MM/YYYY
export function formatDateForSheet(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr; // nếu đã đúng định dạng hoặc không xác định
}

// Thêm ở đầu file
const formatDateInput = (dateStr) => {
    if (!dateStr) return '';
    const date = normalizeDate(dateStr);
    if (!date) return '';
    return date.toISOString().split('T')[0];
};
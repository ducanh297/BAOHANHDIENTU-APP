import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Lấy credentials từ biến môi trường (base64)
const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS, 'base64').toString('utf8')
);

const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function getSheetData(spreadsheetId, range) {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    return response.data.values || [];
}

export async function appendSheetRow(spreadsheetId, range, rowData) {
    const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            values: [rowData],
        },
    });
    return response.data;
}

export async function updateSheetRow(spreadsheetId, range, rowIndex, rowData) {
    const sheetName = range.split('!')[0];
    const updateRange = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
    const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [rowData],
        },
    });
    return response.data;
}

export async function updateSheetRowByRange(spreadsheetId, range, rowData) {
    const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowData] },
    });
    return response.data;
}

export async function deleteSheetRow(spreadsheetId, sheetName, rowIndex) {
    // Lấy sheetId của sheet
    const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetInfo.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    const sheetId = sheet.properties.sheetId;

    const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1, // 0-based
                            endIndex: rowIndex,
                        },
                    },
                },
            ],
        },
    });
    return response.data;
}
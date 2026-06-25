export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        const spreadsheetId =
            process.env.SPREADSHEET_ID ||
            '1BrEXyW5M9Sild-C0qFHmGxYaXq8Jfown0LiykKMTuhA';
        const apiKey =
            process.env.GOOGLE_SHEETS_API_KEY ||
            'AIzaSyA9g2qFUolpsu3_HVHOebdZb0NXnQgXlFM';

        if (!spreadsheetId || !apiKey) {
            return new Response(
                JSON.stringify({ error: 'Missing environment variables' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const ranges = {
            main: 'du_lieu_bao_hanh!A:Z',
            detail: 'du_lieu_bao_hanh_chi_tiet!A:Z',
            rule: 'quy_dinh_bh_hdsd_hdld!A:Z',
            history: 'lich_su_bao_hanh!A:Z',
        };

        const range = ranges[type];
        if (!range) {
            return new Response(
                JSON.stringify({ error: 'Invalid type. Use main, detail, or rule.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const url =
            `https://sheets.googleapis.com/v4/spreadsheets/` +
            `${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify(data), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message || 'Server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
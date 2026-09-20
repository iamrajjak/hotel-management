process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

const tursoUrl = 'https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg';

const statements = [
  // 1. Update hotel_id from hotel-1 to hotel-5
  "UPDATE pos_categories SET hotel_id = 'hotel-5' WHERE hotel_id = 'hotel-1' OR hotel_id IS NULL OR hotel_id = '';",
  "UPDATE pos_menu_items SET hotel_id = 'hotel-5' WHERE hotel_id = 'hotel-1' OR hotel_id IS NULL OR hotel_id = '';",
  "UPDATE pos_orders SET hotel_id = 'hotel-5' WHERE hotel_id = 'hotel-1' OR hotel_id IS NULL OR hotel_id = '';",

  // 2. Populate sequential trainid numbers (1, 2, 3...)
  "UPDATE pos_categories SET trainid = (SELECT COUNT(*) FROM pos_categories c2 WHERE c2.rowid <= pos_categories.rowid);",
  "UPDATE pos_menu_items SET trainid = (SELECT COUNT(*) FROM pos_menu_items m2 WHERE m2.rowid <= pos_menu_items.rowid);",
  "UPDATE pos_orders SET trainid = (SELECT COUNT(*) FROM pos_orders o2 WHERE o2.rowid <= pos_orders.rowid) WHERE trainid IS NULL OR trainid = 0;",
  "UPDATE pos_order_items SET trainid = (SELECT COUNT(*) FROM pos_order_items oi2 WHERE oi2.rowid <= pos_order_items.rowid) WHERE trainid IS NULL OR trainid = 0;"
];

const payload = JSON.stringify({
  requests: statements.map(sql => ({
    type: 'execute',
    stmt: { sql }
  }))
});

const urlObj = new URL(tursoUrl);

const req = https.request({
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(payload);
req.end();

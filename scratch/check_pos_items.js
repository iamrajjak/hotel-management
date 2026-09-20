process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

const tursoUrl = 'https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg';

const payload = JSON.stringify({
  requests: [
    { type: 'execute', stmt: { sql: 'SELECT id, category_id, name, description, price, is_available FROM pos_menu_items LIMIT 3;' } }
  ]
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
    console.log('Raw Turso Response:', JSON.stringify(JSON.parse(body), null, 2));
  });
});

req.write(payload);
req.end();

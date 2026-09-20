process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');

const tursoUrl = 'https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline';
const token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg';

const statements = [
  // 1. Create tables if not exist
  `CREATE TABLE IF NOT EXISTS pos_categories (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    trainid INTEGER PRIMARY KEY AUTOINCREMENT
  );`,
  `CREATE TABLE IF NOT EXISTS pos_menu_items (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    trainid INTEGER PRIMARY KEY AUTOINCREMENT,
    FOREIGN KEY (category_id) REFERENCES pos_categories(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS pos_orders (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    reservation_id TEXT,
    room_id TEXT,
    table_number TEXT,
    order_type TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    order_status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    trainid INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS pos_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    notes TEXT,
    trainid INTEGER,
    FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE
  );`,

  // 2. Insert Categories
  `INSERT OR REPLACE INTO pos_categories (id, hotel_id, name, slug, display_order) VALUES
  ('cat-starters', 'hotel-1', 'Starters & Appetizers', 'starters', 1),
  ('cat-main', 'hotel-1', 'Main Course', 'main-course', 2),
  ('cat-drinks', 'hotel-1', 'Beverages & Drinks', 'beverages', 3),
  ('cat-desserts', 'hotel-1', 'Desserts & Breads', 'desserts', 4);`,

  // 3. Insert Menu Items
  `INSERT OR REPLACE INTO pos_menu_items (id, hotel_id, category_id, name, description, price, is_available) VALUES
  ('m-1', 'hotel-1', 'cat-starters', 'Paneer Tikka Grill', 'Cottage cheese marinated in Indian spices and grilled in clay oven', 340.00, 1),
  ('m-2', 'hotel-1', 'cat-starters', 'Crispy Chicken Wings', 'Deep fried tossed in spicy BBQ sauce', 380.00, 1),
  ('m-3', 'hotel-1', 'cat-starters', 'Hara Bhara Kebab', 'Spinach and green peas patties served with mint chutney', 290.00, 1),
  ('m-4', 'hotel-1', 'cat-starters', 'Tandoori Malai Broccoli', 'Broccoli florets in rich creamy cheese marinade', 360.00, 1),
  ('m-5', 'hotel-1', 'cat-main', 'Butter Chicken Special', 'Tandoori chicken in rich tomato butter gravy', 480.00, 1),
  ('m-6', 'hotel-1', 'cat-main', 'Dal Makhani & Naan Combo', 'Slow cooked black lentils with 2 butter garlic naans', 390.00, 1),
  ('m-7', 'hotel-1', 'cat-main', 'Shahi Paneer Handi', 'Fresh cottage cheese in royal cashew gravy', 420.00, 1),
  ('m-8', 'hotel-1', 'cat-main', 'Hyderabadi Dum Biryani', 'Fragrant basmati rice cooked with authentic spices', 450.00, 1),
  ('m-9', 'hotel-1', 'cat-drinks', 'Fresh Mango Lassi', 'Sweet chilled yogurt mango smoothie', 140.00, 1),
  ('m-10', 'hotel-1', 'cat-drinks', 'Cold Coffee Ice Cream', 'Creamy espresso shake topped with vanilla ice cream', 180.00, 1),
  ('m-11', 'hotel-1', 'cat-drinks', 'Fresh Lime Soda', 'Refreshing sparkling lime juice (Sweet/Salted)', 110.00, 1),
  ('m-12', 'hotel-1', 'cat-desserts', 'Gulab Jamun with Ice Cream', 'Hot gulab jamun served with vanilla ice cream', 160.00, 1),
  ('m-13', 'hotel-1', 'cat-desserts', 'Garlic Butter Naan', 'Freshly baked tandoori naan brushed with garlic butter', 70.00, 1);`
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

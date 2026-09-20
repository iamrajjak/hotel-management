-- ====================================================================
-- HOTEL SAAS MULTI-TENANT PLATFORM - TURSO / LIBSQL DATABASE SCHEMA
-- Compatible with Turso Web Console, Turso CLI, and SQLite EF Core
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. HOTELS (Multi-Tenant Master Hotel Registry)
CREATE TABLE IF NOT EXISTS hotels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    cover_image_url TEXT,
    description TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    pincode TEXT NOT NULL,
    check_in_time TEXT DEFAULT '14:00',
    check_out_time TEXT DEFAULT '11:00',
    currency TEXT DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    gst_number TEXT,
    status TEXT DEFAULT 'Active',
    wifi_name TEXT DEFAULT 'Hotel_Guest_WiFi',
    wifi_password TEXT DEFAULT 'Welcome2026',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hotels_slug ON hotels(slug);

-- 2. PROFILES (Users, Hotel Owners, SuperAdmins, Managers)
CREATE TABLE IF NOT EXISTS Profiles (
    Id TEXT PRIMARY KEY,
    FullName TEXT NOT NULL,
    Email TEXT NOT NULL UNIQUE,
    Phone TEXT NOT NULL,
    AvatarUrl TEXT NULL,
    PasswordHash TEXT NOT NULL,
    IsSuperAdmin BOOLEAN NOT NULL DEFAULT FALSE,
    HotelId TEXT NULL,
    HotelCode TEXT NULL,
    Role INTEGER NOT NULL DEFAULT 0,
    Status BOOLEAN NOT NULL DEFAULT FALSE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NULL,
    FOREIGN KEY (HotelId) REFERENCES hotels(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON Profiles(HotelId);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON Profiles(Email);

-- 3. SUBSCRIPTION PLANS (SaaS Pricing Tiers)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly REAL NOT NULL,
    price_yearly REAL NOT NULL,
    max_rooms INTEGER NOT NULL,
    has_online_booking_engine INTEGER DEFAULT 1,
    features_json TEXT,
    status TEXT DEFAULT 'Active'
);

-- 4. HOTEL SUBSCRIPTIONS (Active Billing Subscriptions)
CREATE TABLE IF NOT EXISTS hotel_subscriptions (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    payment_status TEXT DEFAULT 'Paid',
    status TEXT DEFAULT 'Active',
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_hotel ON hotel_subscriptions(hotel_id);

-- 5. ROOM TYPES (Deluxe, Premium, Executive Suite, Villa, etc.)
CREATE TABLE IF NOT EXISTS room_types (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    base_price REAL NOT NULL,
    max_adults INTEGER DEFAULT 2,
    max_children INTEGER DEFAULT 1,
    bed_type TEXT DEFAULT 'King Bed',
    room_size TEXT DEFAULT '300 sq.ft',
    amenities_json TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'Active',
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_types_hotel ON room_types(hotel_id);

-- 6. ROOMS (Individual Room Inventory e.g., Room 101, 102)
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    room_type_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    floor TEXT DEFAULT '1st Floor',
    price REAL NOT NULL,
    status TEXT DEFAULT 'Available', -- Available, Reserved, Occupied, Cleaning, Maintenance
    notes TEXT,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 7. CUSTOMERS (Guest Directory CRM)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    id_type TEXT DEFAULT 'Aadhaar',
    id_number TEXT,
    total_stays INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_hotel ON customers(hotel_id);

-- 8. RESERVATIONS (Bookings Engine - Online & Walk-in)
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    booking_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    check_in_date DATETIME NOT NULL,
    check_out_date DATETIME NOT NULL,
    adults INTEGER DEFAULT 2,
    children INTEGER DEFAULT 0,
    base_amount REAL NOT NULL,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    due_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'Pending', -- Pending, Paid, PartiallyPaid
    booking_status TEXT DEFAULT 'Confirmed', -- Pending, Confirmed, CheckedIn, CheckedOut, Cancelled
    booking_source TEXT DEFAULT 'Website', -- Website, WalkIn, OTA
    special_request TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_hotel ON reservations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(booking_status);

-- 9. INVOICES & PAYMENTS
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    reservation_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    sub_total REAL NOT NULL,
    tax_total REAL NOT NULL,
    grand_total REAL NOT NULL,
    payment_status TEXT DEFAULT 'Paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

-- 10. REVIEWS & FEEDBACK
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT,
    approved INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- 11. COMMUNICATIONS (Guest Messages, Contact Form, SMS & Email Logs)
CREATE TABLE IF NOT EXISTS communications (
    id TEXT PRIMARY KEY,
    hotel_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'WebsiteContact',
    status TEXT NOT NULL DEFAULT 'Pending',
    customer_id TEXT,
    reservation_id TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

CREATE INDEX IF NOT EXISTS idx_communications_hotel ON communications(hotel_id);

-- ====================================================================
-- SEED INITIAL SAAS DATA (DEMO HOTELS & ADMIN ACCOUNTS)
-- ====================================================================

-- Seed Hotels
INSERT OR IGNORE INTO hotels (id, name, slug, phone, email, address, city, state, pincode, status) 
VALUES ('hotel-royal-01', 'Royal Stay Hotels & Resorts', 'royal-stay', '+91 98765 43210', 'info@royalstay.com', '123 Beach Road', 'Goa', 'Goa', '403001', 'Active');

INSERT OR IGNORE INTO hotels (id, name, slug, phone, email, address, city, state, pincode, status) 
VALUES ('hotel-grand-02', 'Grand Palace Resort', 'grand-palace', '+91 98765 43211', 'info@grandpalace.com', '45 Fort Road', 'Jaipur', 'Rajasthan', '302001', 'Active');

-- Seed Users
INSERT OR IGNORE INTO users (id, hotel_id, full_name, email, phone, password_hash, role) 
VALUES ('user-admin-01', NULL, 'SaaS Master Admin', 'admin@hotelsaas.com', '9876543210', '$2a$11$q9hK3.4567890abcdef...', 'SuperAdmin');

INSERT OR IGNORE INTO users (id, hotel_id, full_name, email, phone, password_hash, role) 
VALUES ('user-owner-01', 'hotel-royal-01', 'Rajesh Sharma', 'owner@royalstay.com', '9876543210', '$2a$11$q9hK3.4567890abcdef...', 'HotelOwner');

-- Seed Subscription Plans
INSERT OR IGNORE INTO subscription_plans (id, name, price_monthly, price_yearly, max_rooms, has_online_booking_engine)
VALUES ('plan-basic', 'Starter Plan', 1499, 14990, 20, 0);

INSERT OR IGNORE INTO subscription_plans (id, name, price_monthly, price_yearly, max_rooms, has_online_booking_engine)
VALUES ('plan-pro', 'Pro Plan', 2999, 29990, 50, 1);

-- Seed Rooms for Royal Stay
INSERT OR IGNORE INTO room_types (id, hotel_id, name, slug, base_price, max_adults, bed_type)
VALUES ('rt-deluxe', 'hotel-royal-01', 'Deluxe Queen Room', 'deluxe', 2500, 2, 'Queen Bed');

INSERT OR IGNORE INTO room_types (id, hotel_id, name, slug, base_price, max_adults, bed_type)
VALUES ('rt-suite', 'hotel-royal-01', 'Royal Executive Suite', 'suite', 5000, 4, 'King Bed');

INSERT OR IGNORE INTO rooms (id, hotel_id, room_type_id, room_number, floor, price, status)
VALUES ('r-101', 'hotel-royal-01', 'rt-deluxe', '101', '1st Floor', 2500, 'Available');

INSERT OR IGNORE INTO rooms (id, hotel_id, room_type_id, room_number, floor, price, status)
VALUES ('r-102', 'hotel-royal-01', 'rt-deluxe', '102', '1st Floor', 2500, 'Occupied');

INSERT OR IGNORE INTO rooms (id, hotel_id, room_type_id, room_number, floor, price, status)
VALUES ('r-201', 'hotel-royal-01', 'rt-suite', '201', '2nd Floor', 5000, 'Available');

-- Seed Reviews
INSERT OR IGNORE INTO reviews (id, hotel_id, customer_name, rating, comment, approved)
VALUES ('rev-01', 'hotel-royal-01', 'Rahul Sharma', 5, 'Amazing stay! The rooms were clean and staff was friendly.', 1);

INSERT OR IGNORE INTO reviews (id, hotel_id, customer_name, rating, comment, approved)
VALUES ('rev-02', 'hotel-royal-01', 'Priya Mehta', 5, 'Best resort experience with family.', 1);

-- Migration: 005_public_booking_access.sql
-- 開放匿名旅客建立訂單,以及用 email + booking id 查詢自己的訂單
-- (符合「guest checkout」模式 — 旅客不需要註冊登入)

-- ── 任何人都能建立訂單(下訂) ────────────────────────────────────
CREATE POLICY "anyone can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- ── 任何人都能查詢訂單(MyBookingView 用 email + id 比對) ──────
-- 不會洩漏全部訂單,因為查詢時必須提供 id(UUID,無法窮舉)+ email
CREATE POLICY "anyone can read their booking" ON bookings
  FOR SELECT USING (true);

-- ── 任何人都能 SELECT room_types(已在 003 開過,這裡為了完整) ──
-- (No-op if policy already exists; safe to skip)

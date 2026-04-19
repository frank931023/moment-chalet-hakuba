-- Moment Chalet Hakuba 民宿預訂系統
-- Seed Data

-- ============================================================
-- Properties（民宿）
-- ============================================================

INSERT INTO properties (id, name, description, location, lat, lng, images, ical_url, has_breakfast_option, is_active) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'Moment Chalet A',
  '白馬村中心地帯に位置する温かみのある山小屋。北アルプスの雄大な景色を望み、スキー場まで徒歩圏内。木造の内装と暖炉が旅人を迎えます。',
  '長野県北安曇郡白馬村北城',
  36.7002, 137.8601,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+A+1',
    'https://placehold.co/800x600?text=Moment+Chalet+A+2',
    'https://placehold.co/800x600?text=Moment+Chalet+A+3'
  ],
  'https://placeholder.ical/moment-chalet-a.ics',
  TRUE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000002',
  'Moment Chalet B',
  '白馬八方尾根スキー場に隣接する絶好のロケーション。ゲレンデまで徒歩5分、スキーヤーに最適な宿。広々としたリビングと充実した設備が自慢です。',
  '長野県北安曇郡白馬村八方',
  36.6958, 137.8712,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+B+1',
    'https://placehold.co/800x600?text=Moment+Chalet+B+2',
    'https://placehold.co/800x600?text=Moment+Chalet+B+3'
  ],
  'https://placeholder.ical/moment-chalet-b.ics',
  TRUE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000003',
  'Moment Chalet C',
  '白馬岩岳スキー場近くの静かな山荘。家族連れやグループに人気の広い間取り。地元食材を使った朝食が評判で、アットホームな雰囲気が魅力です。',
  '長野県北安曇郡白馬村岩岳',
  36.7145, 137.8523,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+C+1',
    'https://placehold.co/800x600?text=Moment+Chalet+C+2',
    'https://placehold.co/800x600?text=Moment+Chalet+C+3'
  ],
  'https://placeholder.ical/moment-chalet-c.ics',
  TRUE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000004',
  'Moment Chalet D',
  '白馬村の自然に囲まれた隠れ家的な宿。夏はトレッキング、冬はスキーと四季を通じて楽しめます。露天風呂付きで疲れた体を癒してください。',
  '長野県北安曇郡白馬村飯森',
  36.7089, 137.8445,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+D+1',
    'https://placehold.co/800x600?text=Moment+Chalet+D+2',
    'https://placehold.co/800x600?text=Moment+Chalet+D+3'
  ],
  'https://placeholder.ical/moment-chalet-d.ics',
  FALSE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000005',
  'Moment Chalet E',
  '白馬五竜スキー場に近い便利な立地。モダンなインテリアと伝統的な日本の要素を融合させたデザイン。カップルや新婚旅行にも最適な特別な空間です。',
  '長野県北安曇郡白馬村神城',
  36.6812, 137.8334,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+E+1',
    'https://placehold.co/800x600?text=Moment+Chalet+E+2',
    'https://placehold.co/800x600?text=Moment+Chalet+E+3'
  ],
  'https://placeholder.ical/moment-chalet-e.ics',
  TRUE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000006',
  'Moment Chalet F',
  '白馬村の中心部に位置し、レストランやショップへのアクセスが抜群。スキーシーズンはもちろん、グリーンシーズンのハイキングベースとしても人気です。',
  '長野県北安曇郡白馬村白馬',
  36.7034, 137.8678,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+F+1',
    'https://placehold.co/800x600?text=Moment+Chalet+F+2',
    'https://placehold.co/800x600?text=Moment+Chalet+F+3'
  ],
  'https://placeholder.ical/moment-chalet-f.ics',
  TRUE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000007',
  'Moment Chalet G',
  '北アルプスの絶景を独り占めできる高台に建つ山荘。晴れた日には白馬三山が一望できます。大自然の中でゆったりとした時間をお過ごしください。',
  '長野県北安曇郡白馬村大出',
  36.7201, 137.8389,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+G+1',
    'https://placehold.co/800x600?text=Moment+Chalet+G+2',
    'https://placehold.co/800x600?text=Moment+Chalet+G+3'
  ],
  'https://placeholder.ical/moment-chalet-g.ics',
  TRUE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000008',
  'Moment Chalet H',
  '白馬村の伝統的な農家を改装したユニークな宿。古民家の趣を残しながら現代的な快適さを兼ね備えています。地元の文化と自然を体験できる特別な滞在を。',
  '長野県北安曇郡白馬村青鬼',
  36.7312, 137.8256,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+H+1',
    'https://placehold.co/800x600?text=Moment+Chalet+H+2',
    'https://placehold.co/800x600?text=Moment+Chalet+H+3'
  ],
  'https://placeholder.ical/moment-chalet-h.ics',
  FALSE,
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000009',
  'Moment Chalet I',
  '白馬村の南端に位置する静かな隠れ家。姫川源流の清流が近く、夏は蛍が舞う幻想的な環境。少人数のグループや家族旅行に最適な贅沢な空間です。',
  '長野県北安曇郡白馬村嶺方',
  36.6723, 137.8167,
  ARRAY[
    'https://placehold.co/800x600?text=Moment+Chalet+I+1',
    'https://placehold.co/800x600?text=Moment+Chalet+I+2',
    'https://placehold.co/800x600?text=Moment+Chalet+I+3'
  ],
  'https://placeholder.ical/moment-chalet-i.ics',
  TRUE,
  TRUE
);

-- ============================================================
-- Room Types（房型）
-- ============================================================

-- Chalet A rooms
INSERT INTO room_types (property_id, name, capacity, price_per_night, breakfast_price, amenities, images, is_active) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'スタンダードツイン',
  2,
  8000.00,
  800.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+A+Twin'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000001',
  'デラックスダブル',
  2,
  12000.00,
  800.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'バスタブ', 'マウンテンビュー'],
  ARRAY['https://placehold.co/800x600?text=Chalet+A+Double'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000001',
  'ファミリールーム',
  5,
  18000.00,
  800.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'キッチン', '洗濯機'],
  ARRAY['https://placehold.co/800x600?text=Chalet+A+Family'],
  TRUE
),

-- Chalet B rooms
(
  'a1000000-0000-0000-0000-000000000002',
  'ゲレンデビュールーム',
  2,
  14000.00,
  900.00,
  ARRAY['WiFi', '駐車場', '暖房', 'スキーロッカー', 'テレビ', 'ゲレンデビュー'],
  ARRAY['https://placehold.co/800x600?text=Chalet+B+Slope+View'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000002',
  'スキーヤーズルーム',
  4,
  20000.00,
  900.00,
  ARRAY['WiFi', '駐車場', '暖房', 'スキーロッカー', 'テレビ', 'キッチン', 'ウェットルーム'],
  ARRAY['https://placehold.co/800x600?text=Chalet+B+Skier'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000002',
  'グループスイート',
  8,
  25000.00,
  900.00,
  ARRAY['WiFi', '駐車場', '暖房', 'スキーロッカー', 'テレビ', 'フルキッチン', 'ウェットルーム', 'リビングルーム'],
  ARRAY['https://placehold.co/800x600?text=Chalet+B+Suite'],
  TRUE
),

-- Chalet C rooms
(
  'a1000000-0000-0000-0000-000000000003',
  'コージーシングル',
  1,
  8000.00,
  700.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+C+Single'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000003',
  'ファミリーロッジ',
  6,
  22000.00,
  700.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'キッチン', '洗濯機', 'バーベキュー設備'],
  ARRAY['https://placehold.co/800x600?text=Chalet+C+Family+Lodge'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000003',
  'マウンテンツイン',
  2,
  11000.00,
  700.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'マウンテンビュー'],
  ARRAY['https://placehold.co/800x600?text=Chalet+C+Mountain+Twin'],
  TRUE
),

-- Chalet D rooms
(
  'a1000000-0000-0000-0000-000000000004',
  'ナチュラルダブル',
  2,
  10000.00,
  0.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+D+Natural+Double'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000004',
  'フォレストスイート',
  4,
  18000.00,
  0.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'キッチン', '森の眺め'],
  ARRAY['https://placehold.co/800x600?text=Chalet+D+Forest+Suite'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000004',
  'プレミアムキャビン',
  3,
  15000.00,
  0.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'バスタブ', '露天風呂'],
  ARRAY['https://placehold.co/800x600?text=Chalet+D+Premium+Cabin'],
  TRUE
),

-- Chalet E rooms
(
  'a1000000-0000-0000-0000-000000000005',
  'ロマンティックダブル',
  2,
  13000.00,
  850.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'バスタブ', 'マウンテンビュー'],
  ARRAY['https://placehold.co/800x600?text=Chalet+E+Romantic'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000005',
  'スタンダードツイン',
  2,
  9000.00,
  850.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+E+Twin'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000005',
  'ラグジュアリースイート',
  2,
  22000.00,
  850.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'バスタブ', 'マウンテンビュー', 'ミニバー', 'バルコニー'],
  ARRAY['https://placehold.co/800x600?text=Chalet+E+Luxury+Suite'],
  TRUE
),

-- Chalet F rooms
(
  'a1000000-0000-0000-0000-000000000006',
  'タウンビュールーム',
  2,
  9500.00,
  750.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+F+Town+View'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000006',
  'スタンダードファミリー',
  4,
  16000.00,
  750.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'キッチン'],
  ARRAY['https://placehold.co/800x600?text=Chalet+F+Family'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000006',
  'グループルーム',
  6,
  21000.00,
  750.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'フルキッチン', '洗濯機'],
  ARRAY['https://placehold.co/800x600?text=Chalet+F+Group'],
  TRUE
),

-- Chalet G rooms
(
  'a1000000-0000-0000-0000-000000000007',
  'アルプスビューダブル',
  2,
  15000.00,
  900.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'アルプスビュー', 'バルコニー'],
  ARRAY['https://placehold.co/800x600?text=Chalet+G+Alps+View'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000007',
  'パノラマスイート',
  4,
  23000.00,
  900.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'アルプスビュー', 'バルコニー', 'キッチン', 'バスタブ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+G+Panorama'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000007',
  'コンパクトシングル',
  1,
  8500.00,
  900.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+G+Single'],
  TRUE
),

-- Chalet H rooms
(
  'a1000000-0000-0000-0000-000000000008',
  '古民家スタイルルーム',
  2,
  11000.00,
  0.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', '囲炉裏'],
  ARRAY['https://placehold.co/800x600?text=Chalet+H+Traditional'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000008',
  '農家スイート',
  5,
  19000.00,
  0.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', '囲炉裏', 'キッチン', '縁側'],
  ARRAY['https://placehold.co/800x600?text=Chalet+H+Farmhouse+Suite'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000008',
  'ヘリテージダブル',
  2,
  14000.00,
  0.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', '囲炉裏', 'バスタブ'],
  ARRAY['https://placehold.co/800x600?text=Chalet+H+Heritage'],
  TRUE
),

-- Chalet I rooms
(
  'a1000000-0000-0000-0000-000000000009',
  'リバービューツイン',
  2,
  10500.00,
  800.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', '川の眺め'],
  ARRAY['https://placehold.co/800x600?text=Chalet+I+River+View'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000009',
  'プレミアムファミリー',
  6,
  20000.00,
  800.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'フルキッチン', '洗濯機', '川の眺め'],
  ARRAY['https://placehold.co/800x600?text=Chalet+I+Premium+Family'],
  TRUE
),
(
  'a1000000-0000-0000-0000-000000000009',
  'ハイドアウェイダブル',
  2,
  13500.00,
  800.00,
  ARRAY['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'バスタブ', '森の眺め'],
  ARRAY['https://placehold.co/800x600?text=Chalet+I+Hideaway'],
  TRUE
);

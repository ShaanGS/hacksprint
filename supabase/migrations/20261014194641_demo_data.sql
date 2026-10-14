-- The demo shop as a function, so `pnpm db:reset` (supabase/seed.sql calls it) and the
-- presenter's Reset button load exactly the same rows.
-- Prices are approximate retail prices (MRP) in rupees as of October 2026, stored as paise.
-- Phone numbers are deliberately invalid placeholders.
-- Set on purpose for the demo: sugar is out of stock (the "jaggery instead?" moment) and Gold
-- Winner sunflower oil is below its threshold (the nightly low-stock report). Earlier orders are
-- placed relative to now, so "today" always has history.
create function public.seed_demo()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_shop uuid;
  -- Start of today in India, so the report's "today" matches the shop's day.
  v_today timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  insert into public.shops (
    name, owner_name, owner_phone, owner_language, distributor_name, distributor_phone
  )
  values ('Lakshmi Stores', 'Murugan', '+910000000001', 'ta-IN', 'Sri Balaji Agencies', '+910000000002')
  returning id into v_shop;

  insert into public.products (
    shop_id, code, name, brand, pack_size, category, unit, price_paise, stock_qty,
    low_stock_threshold, art
  )
  select
    v_shop, p.code, p.name, p.brand, p.pack_size, p.category, p.unit::public.product_unit,
    p.price_rupees * 100, p.stock_qty, p.low_stock_threshold, p.art
  from (values
    -- code, name, brand, pack size, category, unit, price (Rs), stock, low-stock threshold, art
    ('ponni-rice', 'Ponni Raw Rice', null, null, 'rice', 'kg', 62, 50, 10, 'rice'),
    ('idli-rice', 'Idli Rice', null, null, 'rice', 'kg', 48, 30, 10, 'rice'),
    ('toor-dal', 'Toor Dal', null, null, 'dal', 'kg', 160, 20, 5, 'dal'),
    ('moong-dal', 'Moong Dal', null, null, 'dal', 'kg', 130, 15, 5, 'dal'),
    ('urad-dal', 'Urad Dal', null, null, 'dal', 'kg', 140, 15, 5, 'dal'),
    ('sugar', 'Sugar', null, null, 'sweetener', 'kg', 46, 0, 5, 'sugar'),
    ('jaggery', 'Jaggery', null, null, 'sweetener', 'kg', 70, 10, 3, 'jaggery'),
    ('atta', 'Aashirvaad Shudh Chakki Atta', 'Aashirvaad', '5 kg', 'atta', 'pack', 295, 12, 3, 'atta'),
    ('rava', 'Bombay Rava', null, null, 'rava', 'kg', 50, 10, 3, 'atta'),
    ('salt', 'Tata Salt', 'Tata', '1 kg', 'salt', 'pack', 28, 40, 10, 'salt'),
    ('gold-winner-oil', 'Gold Winner Sunflower Oil', 'Gold Winner', '1 litre', 'sunflower_oil', 'pack', 165, 2, 6, 'oil'),
    ('fortune-oil', 'Fortune Sunflower Oil', 'Fortune', '1 litre', 'sunflower_oil', 'pack', 170, 10, 4, 'oil'),
    ('gingelly-oil', 'Idhayam Gingelly Oil', 'Idhayam', '500 ml', 'gingelly_oil', 'pack', 230, 6, 2, 'oil'),
    ('sambar-powder', 'Aachi Sambar Powder', 'Aachi', '100 g', 'sambar_powder', 'pack', 45, 15, 4, 'bag'),
    ('chilli-powder', 'Aachi Chilli Powder', 'Aachi', '100 g', 'chilli_powder', 'pack', 40, 15, 4, 'bag'),
    ('turmeric', 'Aachi Turmeric Powder', 'Aachi', '100 g', 'turmeric_powder', 'pack', 35, 12, 4, 'bag'),
    ('tea', 'Tata Tea Premium', 'Tata Tea', '250 g', 'tea', 'pack', 150, 10, 3, 'bag'),
    ('coffee', 'Narasu''s Filter Coffee', 'Narasu''s', '200 g', 'coffee', 'pack', 170, 8, 2, 'bag'),
    ('aavin-milk', 'Aavin Toned Milk', 'Aavin', '500 ml', 'milk', 'pack', 22, 30, 10, 'milk'),
    ('arokya-milk', 'Arokya Toned Milk', 'Arokya', '500 ml', 'milk', 'pack', 28, 20, 8, 'milk'),
    ('butter', 'Amul Butter', 'Amul', '100 g', 'butter', 'pack', 58, 12, 4, 'butter'),
    ('curd', 'Aavin Curd', 'Aavin', '500 g', 'curd', 'pack', 30, 15, 5, 'bag'),
    ('ghee', 'Aavin Ghee', 'Aavin', '200 ml', 'ghee', 'pack', 150, 6, 2, 'bag'),
    ('eggs', 'Eggs', null, null, 'eggs', 'piece', 6, 90, 30, 'bag'),
    ('bread', 'Britannia Milk Bread', 'Britannia', '400 g', 'bread', 'pack', 50, 8, 3, 'bag'),
    ('batter', 'Idli Dosa Batter', null, '1 kg', 'batter', 'pack', 60, 10, 4, 'bag'),
    ('maggi', 'Maggi Masala Noodles', 'Maggi', '70 g', 'noodles', 'pack', 14, 48, 12, 'noodles'),
    ('chips', 'Lay''s Classic Salted', 'Lay''s', '50 g', 'chips', 'pack', 20, 24, 8, 'bag'),
    ('biscuits', 'Parle-G Biscuits', 'Parle', null, 'biscuits', 'pack', 10, 40, 12, 'bag'),
    ('coke', 'Coca-Cola', 'Coca-Cola', '750 ml', 'soft_drink', 'pack', 40, 12, 4, 'bag'),
    ('water', 'Bisleri Water', 'Bisleri', '1 litre', 'water', 'pack', 20, 24, 8, 'bag'),
    ('toothpaste', 'Colgate Strong Teeth', 'Colgate', '100 g', 'toothpaste', 'pack', 55, 10, 3, 'bag'),
    ('soap', 'Hamam Neem Soap', 'Hamam', '100 g', 'soap', 'pack', 38, 12, 4, 'bag'),
    ('coconut-oil', 'Parachute Coconut Oil', 'Parachute', '200 ml', 'coconut_oil', 'pack', 100, 10, 3, 'oil'),
    ('detergent', 'Surf Excel Easy Wash', 'Surf Excel', '1 kg', 'detergent', 'pack', 140, 8, 3, 'bag'),
    ('dishwash', 'Vim Dishwash Bar', 'Vim', '300 g', 'dishwash', 'pack', 30, 12, 4, 'bag'),
    ('matchbox', 'Ship Matchbox', 'Ship', '10 boxes', 'matchbox', 'pack', 20, 15, 5, 'bag'),
    ('onion', 'Onion', null, null, 'onion', 'kg', 40, 20, 5, 'bag'),
    ('tomato', 'Tomato', null, null, 'tomato', 'kg', 30, 15, 5, 'bag'),
    ('coconut', 'Coconut', null, null, 'coconut', 'piece', 35, 20, 6, 'bag')
  ) as p (code, name, brand, pack_size, category, unit, price_rupees, stock_qty, low_stock_threshold, art);

  -- Every product is searchable by its own name...
  insert into public.product_aliases (product_id, alias, lang)
  select id, lower(name), 'en' from public.products where shop_id = v_shop;

  -- ...and by what customers actually say: English, Tamil and Hindi in script and romanized,
  -- plus Kannada for the products in the demo flow (the demo is judged in Bengaluru).
  insert into public.product_aliases (product_id, alias, lang)
  select product.id, a.alias, a.lang
  from public.products product
  join (values
    ('ponni-rice', 'rice', 'en'),
    ('ponni-rice', 'ponni rice', 'en'),
    ('ponni-rice', 'அரிசி', 'ta'),
    ('ponni-rice', 'பொன்னி அரிசி', 'ta'),
    ('ponni-rice', 'arisi', 'ta'),
    ('ponni-rice', 'ponni arisi', 'ta'),
    ('ponni-rice', 'चावल', 'hi'),
    ('ponni-rice', 'chawal', 'hi'),
    ('ponni-rice', 'ಅಕ್ಕಿ', 'kn'),
    ('ponni-rice', 'akki', 'kn'),
    ('idli-rice', 'இட்லி அரிசி', 'ta'),
    ('idli-rice', 'idli arisi', 'ta'),
    ('idli-rice', 'इडली चावल', 'hi'),
    ('idli-rice', 'idli chawal', 'hi'),
    ('toor-dal', 'dal', 'en'),
    ('toor-dal', 'arhar dal', 'en'),
    ('toor-dal', 'துவரம் பருப்பு', 'ta'),
    ('toor-dal', 'பருப்பு', 'ta'),
    ('toor-dal', 'thuvaram paruppu', 'ta'),
    ('toor-dal', 'paruppu', 'ta'),
    ('toor-dal', 'अरहर दाल', 'hi'),
    ('toor-dal', 'तूर दाल', 'hi'),
    ('moong-dal', 'பாசிப் பருப்பு', 'ta'),
    ('moong-dal', 'paasi paruppu', 'ta'),
    ('moong-dal', 'मूंग दाल', 'hi'),
    ('urad-dal', 'உளுத்தம் பருப்பு', 'ta'),
    ('urad-dal', 'உளுந்து', 'ta'),
    ('urad-dal', 'ulutham paruppu', 'ta'),
    ('urad-dal', 'ulundhu', 'ta'),
    ('urad-dal', 'उड़द दाल', 'hi'),
    ('sugar', 'சர்க்கரை', 'ta'),
    ('sugar', 'சீனி', 'ta'),
    ('sugar', 'sakkarai', 'ta'),
    ('sugar', 'seeni', 'ta'),
    ('sugar', 'चीनी', 'hi'),
    ('sugar', 'शक्कर', 'hi'),
    ('sugar', 'cheeni', 'hi'),
    ('sugar', 'shakkar', 'hi'),
    ('sugar', 'ಸಕ್ಕರೆ', 'kn'),
    ('sugar', 'sakkare', 'kn'),
    ('jaggery', 'வெல்லம்', 'ta'),
    ('jaggery', 'vellam', 'ta'),
    ('jaggery', 'गुड़', 'hi'),
    ('jaggery', 'gud', 'hi'),
    ('jaggery', 'gur', 'hi'),
    ('jaggery', 'ಬೆಲ್ಲ', 'kn'),
    ('jaggery', 'bella', 'kn'),
    ('atta', 'atta', 'en'),
    ('atta', 'wheat flour', 'en'),
    ('atta', 'aashirvaad atta', 'en'),
    ('atta', 'கோதுமை மாவு', 'ta'),
    ('atta', 'gothumai maavu', 'ta'),
    ('atta', 'आटा', 'hi'),
    ('atta', 'गेहूं का आटा', 'hi'),
    ('atta', 'gehun ka atta', 'hi'),
    ('atta', 'ಗೋಧಿ ಹಿಟ್ಟು', 'kn'),
    ('atta', 'godhi hittu', 'kn'),
    ('rava', 'rava', 'en'),
    ('rava', 'sooji', 'en'),
    ('rava', 'semolina', 'en'),
    ('rava', 'ரவை', 'ta'),
    ('rava', 'ravai', 'ta'),
    ('rava', 'सूजी', 'hi'),
    ('rava', 'रवा', 'hi'),
    ('salt', 'salt', 'en'),
    ('salt', 'உப்பு', 'ta'),
    ('salt', 'uppu', 'ta'),
    ('salt', 'नमक', 'hi'),
    ('salt', 'namak', 'hi'),
    ('salt', 'ಉಪ್ಪು', 'kn'),
    ('salt', 'uppu', 'kn'),
    ('gold-winner-oil', 'oil', 'en'),
    ('gold-winner-oil', 'sunflower oil', 'en'),
    ('gold-winner-oil', 'gold winner', 'en'),
    ('gold-winner-oil', 'எண்ணெய்', 'ta'),
    ('gold-winner-oil', 'சூரியகாந்தி எண்ணெய்', 'ta'),
    ('gold-winner-oil', 'ennai', 'ta'),
    ('gold-winner-oil', 'तेल', 'hi'),
    ('gold-winner-oil', 'सूरजमुखी तेल', 'hi'),
    ('gold-winner-oil', 'tel', 'hi'),
    ('gold-winner-oil', 'ಎಣ್ಣೆ', 'kn'),
    ('gold-winner-oil', 'ಸೂರ್ಯಕಾಂತಿ ಎಣ್ಣೆ', 'kn'),
    ('gold-winner-oil', 'enne', 'kn'),
    ('gold-winner-oil', 'suryakanthi enne', 'kn'),
    ('fortune-oil', 'oil', 'en'),
    ('fortune-oil', 'sunflower oil', 'en'),
    ('fortune-oil', 'fortune', 'en'),
    ('fortune-oil', 'எண்ணெய்', 'ta'),
    ('fortune-oil', 'ennai', 'ta'),
    ('fortune-oil', 'तेल', 'hi'),
    ('fortune-oil', 'tel', 'hi'),
    ('fortune-oil', 'ಎಣ್ಣೆ', 'kn'),
    ('fortune-oil', 'enne', 'kn'),
    ('gingelly-oil', 'gingelly oil', 'en'),
    ('gingelly-oil', 'sesame oil', 'en'),
    ('gingelly-oil', 'நல்லெண்ணெய்', 'ta'),
    ('gingelly-oil', 'nallennai', 'ta'),
    ('gingelly-oil', 'तिल का तेल', 'hi'),
    ('gingelly-oil', 'til ka tel', 'hi'),
    ('sambar-powder', 'sambar powder', 'en'),
    ('sambar-powder', 'சாம்பார் பொடி', 'ta'),
    ('sambar-powder', 'sambar podi', 'ta'),
    ('sambar-powder', 'सांभर मसाला', 'hi'),
    ('sambar-powder', 'sambhar masala', 'hi'),
    ('chilli-powder', 'chilli powder', 'en'),
    ('chilli-powder', 'மிளகாய் தூள்', 'ta'),
    ('chilli-powder', 'milagai thool', 'ta'),
    ('chilli-powder', 'लाल मिर्च पाउडर', 'hi'),
    ('chilli-powder', 'mirchi powder', 'hi'),
    ('turmeric', 'turmeric', 'en'),
    ('turmeric', 'மஞ்சள் தூள்', 'ta'),
    ('turmeric', 'manjal thool', 'ta'),
    ('turmeric', 'हल्दी', 'hi'),
    ('turmeric', 'haldi', 'hi'),
    ('tea', 'tea', 'en'),
    ('tea', 'tea powder', 'en'),
    ('tea', 'டீ தூள்', 'ta'),
    ('tea', 'tea thool', 'ta'),
    ('tea', 'चाय पत्ती', 'hi'),
    ('tea', 'chai patti', 'hi'),
    ('coffee', 'coffee', 'en'),
    ('coffee', 'filter coffee', 'en'),
    ('coffee', 'காபி தூள்', 'ta'),
    ('coffee', 'kaapi thool', 'ta'),
    ('coffee', 'kaapi', 'ta'),
    ('coffee', 'कॉफी', 'hi'),
    ('aavin-milk', 'milk', 'en'),
    ('aavin-milk', 'aavin milk', 'en'),
    ('aavin-milk', 'பால்', 'ta'),
    ('aavin-milk', 'ஆவின் பால்', 'ta'),
    ('aavin-milk', 'paal', 'ta'),
    ('aavin-milk', 'aavin paal', 'ta'),
    ('aavin-milk', 'दूध', 'hi'),
    ('aavin-milk', 'doodh', 'hi'),
    ('aavin-milk', 'ಹಾಲು', 'kn'),
    ('aavin-milk', 'haalu', 'kn'),
    ('arokya-milk', 'milk', 'en'),
    ('arokya-milk', 'arokya milk', 'en'),
    ('arokya-milk', 'பால்', 'ta'),
    ('arokya-milk', 'ஆரோக்யா பால்', 'ta'),
    ('arokya-milk', 'paal', 'ta'),
    ('arokya-milk', 'arokya paal', 'ta'),
    ('arokya-milk', 'दूध', 'hi'),
    ('arokya-milk', 'doodh', 'hi'),
    ('arokya-milk', 'ಹಾಲು', 'kn'),
    ('arokya-milk', 'haalu', 'kn'),
    ('butter', 'butter', 'en'),
    ('butter', 'வெண்ணெய்', 'ta'),
    ('butter', 'vennai', 'ta'),
    ('butter', 'मक्खन', 'hi'),
    ('butter', 'makkhan', 'hi'),
    ('butter', 'ಬೆಣ್ಣೆ', 'kn'),
    ('butter', 'benne', 'kn'),
    ('curd', 'curd', 'en'),
    ('curd', 'yogurt', 'en'),
    ('curd', 'தயிர்', 'ta'),
    ('curd', 'thayir', 'ta'),
    ('curd', 'दही', 'hi'),
    ('curd', 'dahi', 'hi'),
    ('ghee', 'ghee', 'en'),
    ('ghee', 'நெய்', 'ta'),
    ('ghee', 'nei', 'ta'),
    ('ghee', 'घी', 'hi'),
    ('eggs', 'egg', 'en'),
    ('eggs', 'முட்டை', 'ta'),
    ('eggs', 'muttai', 'ta'),
    ('eggs', 'अंडा', 'hi'),
    ('eggs', 'anda', 'hi'),
    ('bread', 'bread', 'en'),
    ('bread', 'ரொட்டி', 'ta'),
    ('bread', 'rotti', 'ta'),
    ('bread', 'डबल रोटी', 'hi'),
    ('bread', 'double roti', 'hi'),
    ('batter', 'idli batter', 'en'),
    ('batter', 'dosa batter', 'en'),
    ('batter', 'இட்லி மாவு', 'ta'),
    ('batter', 'தோசை மாவு', 'ta'),
    ('batter', 'idli maavu', 'ta'),
    ('batter', 'dosai maavu', 'ta'),
    ('batter', 'इडली बैटर', 'hi'),
    ('maggi', 'maggi', 'en'),
    ('maggi', 'noodles', 'en'),
    ('maggi', 'மேகி', 'ta'),
    ('maggi', 'मैगी', 'hi'),
    ('maggi', 'ಮ್ಯಾಗಿ', 'kn'),
    ('maggi', 'maggi', 'kn'),
    ('chips', 'lays', 'en'),
    ('chips', 'chips', 'en'),
    ('chips', 'சிப்ஸ்', 'ta'),
    ('chips', 'चिप्स', 'hi'),
    ('biscuits', 'parle g', 'en'),
    ('biscuits', 'biscuit', 'en'),
    ('biscuits', 'பிஸ்கட்', 'ta'),
    ('biscuits', 'बिस्कुट', 'hi'),
    ('biscuits', 'biskut', 'hi'),
    ('coke', 'coke', 'en'),
    ('coke', 'cool drink', 'en'),
    ('coke', 'cold drink', 'en'),
    ('coke', 'கூல் ட்ரிங்க்', 'ta'),
    ('coke', 'कोल्ड ड्रिंक', 'hi'),
    ('water', 'water', 'en'),
    ('water', 'water bottle', 'en'),
    ('water', 'தண்ணீர் பாட்டில்', 'ta'),
    ('water', 'thanni bottle', 'ta'),
    ('water', 'पानी की बोतल', 'hi'),
    ('water', 'paani bottle', 'hi'),
    ('toothpaste', 'colgate', 'en'),
    ('toothpaste', 'toothpaste', 'en'),
    ('toothpaste', 'பற்பசை', 'ta'),
    ('toothpaste', 'parpasai', 'ta'),
    ('toothpaste', 'टूथपेस्ट', 'hi'),
    ('toothpaste', 'manjan', 'hi'),
    ('soap', 'hamam', 'en'),
    ('soap', 'soap', 'en'),
    ('soap', 'சோப்பு', 'ta'),
    ('soap', 'soppu', 'ta'),
    ('soap', 'साबुन', 'hi'),
    ('soap', 'sabun', 'hi'),
    ('coconut-oil', 'coconut oil', 'en'),
    ('coconut-oil', 'parachute', 'en'),
    ('coconut-oil', 'தேங்காய் எண்ணெய்', 'ta'),
    ('coconut-oil', 'thengai ennai', 'ta'),
    ('coconut-oil', 'नारियल तेल', 'hi'),
    ('coconut-oil', 'nariyal tel', 'hi'),
    ('detergent', 'surf', 'en'),
    ('detergent', 'washing powder', 'en'),
    ('detergent', 'சலவைத் தூள்', 'ta'),
    ('detergent', 'salavai thool', 'ta'),
    ('detergent', 'सर्फ', 'hi'),
    ('dishwash', 'vim', 'en'),
    ('dishwash', 'vim bar', 'en'),
    ('dishwash', 'பாத்திரம் தேய்க்கும் சோப்பு', 'ta'),
    ('dishwash', 'बर्तन साबुन', 'hi'),
    ('dishwash', 'bartan sabun', 'hi'),
    ('matchbox', 'matchbox', 'en'),
    ('matchbox', 'matches', 'en'),
    ('matchbox', 'தீப்பெட்டி', 'ta'),
    ('matchbox', 'theepetti', 'ta'),
    ('matchbox', 'माचिस', 'hi'),
    ('matchbox', 'maachis', 'hi'),
    ('onion', 'வெங்காயம்', 'ta'),
    ('onion', 'vengayam', 'ta'),
    ('onion', 'प्याज', 'hi'),
    ('onion', 'pyaaz', 'hi'),
    ('tomato', 'தக்காளி', 'ta'),
    ('tomato', 'thakkali', 'ta'),
    ('tomato', 'टमाटर', 'hi'),
    ('tomato', 'tamatar', 'hi'),
    ('coconut', 'தேங்காய்', 'ta'),
    ('coconut', 'thengai', 'ta'),
    ('coconut', 'नारियल', 'hi'),
    ('coconut', 'nariyal', 'hi')
  ) as a (code, alias, lang) on a.code = product.code and product.shop_id = v_shop
  on conflict (product_id, alias, lang) do nothing;

  -- Regular customers. Fixed ids keep the history below readable.
  insert into public.customers (id, shop_id, name, phone)
  values
    ('00000000-0000-4000-8000-0000000000c1', v_shop, 'Lakshmi Raman', '+910000000011'),
    ('00000000-0000-4000-8000-0000000000c2', v_shop, 'Rahul Sharma', '+910000000012'),
    ('00000000-0000-4000-8000-0000000000c3', v_shop, 'Meena Krishnan', '+910000000013'),
    ('00000000-0000-4000-8000-0000000000c4', v_shop, 'Arjun Reddy', '+910000000014');

  -- Past credit orders (who owes what) and today's orders (the report's numbers).
  insert into public.orders (id, shop_id, customer_id, status, payment_mode, created_at, submitted_at)
  select
    x.id::uuid, v_shop, x.customer_id::uuid, x.status::public.order_status,
    x.payment_mode::public.payment_mode, x.placed_at, x.placed_at
  from (values
    ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000c1', 'delivered', 'credit',
      v_today - interval '5 days' + interval '11 hours'),
    ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000c1', 'delivered', 'credit',
      v_today - interval '2 days' + interval '18 hours'),
    ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000c2', 'delivered', 'credit',
      v_today - interval '3 days' + interval '19 hours'),
    ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1', 'delivered', 'link',
      greatest(v_today + interval '1 minute', now() - interval '200 minutes')),
    ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000c2', 'delivered', 'link',
      greatest(v_today + interval '2 minutes', now() - interval '150 minutes')),
    ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000c3', 'on_credit', 'credit',
      greatest(v_today + interval '3 minutes', now() - interval '80 minutes')),
    ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000c4', 'paid', 'link',
      greatest(v_today + interval '4 minutes', now() - interval '30 minutes'))
  ) as x (id, customer_id, status, payment_mode, placed_at);

  insert into public.order_items (order_id, product_id, qty, unit_price_paise)
  select x.order_id::uuid, p.id, x.qty, p.price_paise
  from (values
    ('00000000-0000-4000-8000-0000000000a1', 'ponni-rice', 5),
    ('00000000-0000-4000-8000-0000000000a1', 'gold-winner-oil', 1),
    ('00000000-0000-4000-8000-0000000000a1', 'salt', 1),
    ('00000000-0000-4000-8000-0000000000a1', 'aavin-milk', 2),
    ('00000000-0000-4000-8000-0000000000a2', 'toor-dal', 1),
    ('00000000-0000-4000-8000-0000000000a2', 'atta', 1),
    ('00000000-0000-4000-8000-0000000000a2', 'tea', 1),
    ('00000000-0000-4000-8000-0000000000a2', 'maggi', 2),
    ('00000000-0000-4000-8000-0000000000a2', 'batter', 1),
    ('00000000-0000-4000-8000-0000000000a3', 'detergent', 1),
    ('00000000-0000-4000-8000-0000000000a3', 'soap', 2),
    ('00000000-0000-4000-8000-0000000000a3', 'toothpaste', 1),
    ('00000000-0000-4000-8000-0000000000a3', 'bread', 1),
    ('00000000-0000-4000-8000-0000000000b1', 'aavin-milk', 1),
    ('00000000-0000-4000-8000-0000000000b1', 'bread', 1),
    ('00000000-0000-4000-8000-0000000000b2', 'maggi', 2),
    ('00000000-0000-4000-8000-0000000000b2', 'chips', 1),
    ('00000000-0000-4000-8000-0000000000b3', 'ponni-rice', 1),
    ('00000000-0000-4000-8000-0000000000b3', 'salt', 1),
    ('00000000-0000-4000-8000-0000000000b4', 'butter', 1),
    ('00000000-0000-4000-8000-0000000000b4', 'eggs', 6)
  ) as x (order_id, code, qty)
  join public.products p on p.shop_id = v_shop and p.code = x.code;

  -- Seed history only; live orders get their totals from lib/orders.
  update public.orders o
  set total_paise = t.total
  from (
    select order_id, sum(round(qty * unit_price_paise))::integer as total
    from public.order_items
    group by order_id
  ) t
  where o.id = t.order_id and o.shop_id = v_shop;

  insert into public.payments (order_id, provider, provider_link_id, amount_paise, status, provider_txn_id, paid_at, created_at)
  select id, 'test', 'seed-link-' || number, total_paise, 'paid', 'seed-txn-' || number,
    submitted_at + interval '4 minutes', submitted_at
  from public.orders
  where shop_id = v_shop and payment_mode = 'link';

  insert into public.credit_ledger (shop_id, customer_id, order_id, kind, amount_paise, created_at)
  select shop_id, customer_id, id, 'credit_sale', total_paise, submitted_at
  from public.orders
  where shop_id = v_shop and payment_mode = 'credit';
end;
$$;

-- Wipes every row and loads the demo shop again. For the presenter page and dev only: run the
-- stage demo on its own Supabase project. `where true` keeps Supabase's safe-update guard happy.
create function public.reset_demo()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.audit_log where true;
  delete from public.voice_turns where true;
  delete from public.payments where true;
  delete from public.credit_ledger where true;
  delete from public.order_items where true;
  delete from public.orders where true;
  delete from public.reorders where true;
  delete from public.bills where true;
  delete from public.customers where true;
  delete from public.product_aliases where true;
  delete from public.products where true;
  delete from public.shops where true;
  perform public.seed_demo();
end;
$$;

revoke execute on function public.seed_demo() from public, anon, authenticated;
revoke execute on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.seed_demo() to service_role;
grant execute on function public.reset_demo() to service_role;

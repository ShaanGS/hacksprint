-- Demo data: one Chennai kirana with 40 everyday products.
-- Prices are approximate retail prices (MRP) in rupees as of October 2026; the insert converts
-- them to paise. The owner corrects them by scanning a distributor bill (milestone 5).
-- Phone numbers are deliberately invalid placeholders.
-- Two states are set on purpose:
--   Sugar is out of stock, for the spec's "do you want jaggery instead?" moment.
--   Gold Winner sunflower oil is below its threshold, for the nightly low-stock report.

insert into public.shops (
  name, owner_name, owner_phone, owner_language, distributor_name, distributor_phone
)
values ('Lakshmi Stores', 'Murugan', '+910000000001', 'ta-IN', 'Sri Balaji Agencies', '+910000000002');

insert into public.products (
  shop_id, name, brand, pack_size, category, unit, price_paise, stock_qty, low_stock_threshold
)
select
  shop.id, p.name, p.brand, p.pack_size, p.category, p.unit::public.product_unit,
  p.price_rupees * 100, p.stock_qty, p.low_stock_threshold
from public.shops shop
cross join (values
  -- name, brand, pack size, category, unit, price (Rs), stock, low-stock threshold
  ('Ponni Raw Rice', null, null, 'rice', 'kg', 62, 50, 10),
  ('Idli Rice', null, null, 'rice', 'kg', 48, 30, 10),
  ('Toor Dal', null, null, 'dal', 'kg', 160, 20, 5),
  ('Moong Dal', null, null, 'dal', 'kg', 130, 15, 5),
  ('Urad Dal', null, null, 'dal', 'kg', 140, 15, 5),
  ('Sugar', null, null, 'sweetener', 'kg', 46, 0, 5),
  ('Jaggery', null, null, 'sweetener', 'kg', 70, 10, 3),
  ('Aashirvaad Shudh Chakki Atta', 'Aashirvaad', '5 kg', 'atta', 'pack', 295, 12, 3),
  ('Bombay Rava', null, null, 'rava', 'kg', 50, 10, 3),
  ('Tata Salt', 'Tata', '1 kg', 'salt', 'pack', 28, 40, 10),
  ('Gold Winner Sunflower Oil', 'Gold Winner', '1 litre', 'sunflower_oil', 'pack', 165, 2, 6),
  ('Fortune Sunflower Oil', 'Fortune', '1 litre', 'sunflower_oil', 'pack', 170, 10, 4),
  ('Idhayam Gingelly Oil', 'Idhayam', '500 ml', 'gingelly_oil', 'pack', 230, 6, 2),
  ('Aachi Sambar Powder', 'Aachi', '100 g', 'sambar_powder', 'pack', 45, 15, 4),
  ('Aachi Chilli Powder', 'Aachi', '100 g', 'chilli_powder', 'pack', 40, 15, 4),
  ('Aachi Turmeric Powder', 'Aachi', '100 g', 'turmeric_powder', 'pack', 35, 12, 4),
  ('Tata Tea Premium', 'Tata Tea', '250 g', 'tea', 'pack', 150, 10, 3),
  ('Narasu''s Filter Coffee', 'Narasu''s', '200 g', 'coffee', 'pack', 170, 8, 2),
  ('Aavin Toned Milk', 'Aavin', '500 ml', 'milk', 'pack', 22, 30, 10),
  ('Arokya Toned Milk', 'Arokya', '500 ml', 'milk', 'pack', 28, 20, 8),
  ('Amul Butter', 'Amul', '100 g', 'butter', 'pack', 58, 12, 4),
  ('Aavin Curd', 'Aavin', '500 g', 'curd', 'pack', 30, 15, 5),
  ('Aavin Ghee', 'Aavin', '200 ml', 'ghee', 'pack', 150, 6, 2),
  ('Eggs', null, null, 'eggs', 'piece', 6, 90, 30),
  ('Britannia Milk Bread', 'Britannia', '400 g', 'bread', 'pack', 50, 8, 3),
  ('Idli Dosa Batter', null, '1 kg', 'batter', 'pack', 60, 10, 4),
  ('Maggi Masala Noodles', 'Maggi', '70 g', 'noodles', 'pack', 14, 48, 12),
  ('Lay''s Classic Salted', 'Lay''s', '50 g', 'chips', 'pack', 20, 24, 8),
  ('Parle-G Biscuits', 'Parle', null, 'biscuits', 'pack', 10, 40, 12),
  ('Coca-Cola', 'Coca-Cola', '750 ml', 'soft_drink', 'pack', 40, 12, 4),
  ('Bisleri Water', 'Bisleri', '1 litre', 'water', 'pack', 20, 24, 8),
  ('Colgate Strong Teeth', 'Colgate', '100 g', 'toothpaste', 'pack', 55, 10, 3),
  ('Hamam Neem Soap', 'Hamam', '100 g', 'soap', 'pack', 38, 12, 4),
  ('Parachute Coconut Oil', 'Parachute', '200 ml', 'coconut_oil', 'pack', 100, 10, 3),
  ('Surf Excel Easy Wash', 'Surf Excel', '1 kg', 'detergent', 'pack', 140, 8, 3),
  ('Vim Dishwash Bar', 'Vim', '300 g', 'dishwash', 'pack', 30, 12, 4),
  ('Ship Matchbox', 'Ship', '10 boxes', 'matchbox', 'pack', 20, 15, 5),
  ('Onion', null, null, 'onion', 'kg', 40, 20, 5),
  ('Tomato', null, null, 'tomato', 'kg', 30, 15, 5),
  ('Coconut', null, null, 'coconut', 'piece', 35, 20, 6)
) as p (name, brand, pack_size, category, unit, price_rupees, stock_qty, low_stock_threshold)
where shop.name = 'Lakshmi Stores';

-- Every product is searchable by its own name.
insert into public.product_aliases (product_id, alias, lang)
select id, lower(name), 'en' from public.products;

-- What customers actually say: English, Tamil and Hindi in script and romanized, plus Kannada
-- for the products in the demo flow (the demo is judged in Bengaluru).
insert into public.product_aliases (product_id, alias, lang)
select product.id, a.alias, a.lang
from public.products product
join (values
  ('Ponni Raw Rice', 'rice', 'en'), ('Ponni Raw Rice', 'ponni rice', 'en'),
  ('Ponni Raw Rice', 'அரிசி', 'ta'), ('Ponni Raw Rice', 'பொன்னி அரிசி', 'ta'),
  ('Ponni Raw Rice', 'arisi', 'ta'), ('Ponni Raw Rice', 'ponni arisi', 'ta'),
  ('Ponni Raw Rice', 'चावल', 'hi'), ('Ponni Raw Rice', 'chawal', 'hi'),
  ('Ponni Raw Rice', 'ಅಕ್ಕಿ', 'kn'), ('Ponni Raw Rice', 'akki', 'kn'),

  ('Idli Rice', 'இட்லி அரிசி', 'ta'), ('Idli Rice', 'idli arisi', 'ta'),
  ('Idli Rice', 'इडली चावल', 'hi'), ('Idli Rice', 'idli chawal', 'hi'),

  ('Toor Dal', 'dal', 'en'), ('Toor Dal', 'arhar dal', 'en'),
  ('Toor Dal', 'துவரம் பருப்பு', 'ta'), ('Toor Dal', 'பருப்பு', 'ta'),
  ('Toor Dal', 'thuvaram paruppu', 'ta'), ('Toor Dal', 'paruppu', 'ta'),
  ('Toor Dal', 'अरहर दाल', 'hi'), ('Toor Dal', 'तूर दाल', 'hi'),

  ('Moong Dal', 'பாசிப் பருப்பு', 'ta'), ('Moong Dal', 'paasi paruppu', 'ta'),
  ('Moong Dal', 'मूंग दाल', 'hi'),

  ('Urad Dal', 'உளுத்தம் பருப்பு', 'ta'), ('Urad Dal', 'உளுந்து', 'ta'),
  ('Urad Dal', 'ulutham paruppu', 'ta'), ('Urad Dal', 'ulundhu', 'ta'),
  ('Urad Dal', 'उड़द दाल', 'hi'),

  ('Sugar', 'சர்க்கரை', 'ta'), ('Sugar', 'சீனி', 'ta'),
  ('Sugar', 'sakkarai', 'ta'), ('Sugar', 'seeni', 'ta'),
  ('Sugar', 'चीनी', 'hi'), ('Sugar', 'शक्कर', 'hi'),
  ('Sugar', 'cheeni', 'hi'), ('Sugar', 'shakkar', 'hi'),
  ('Sugar', 'ಸಕ್ಕರೆ', 'kn'), ('Sugar', 'sakkare', 'kn'),

  ('Jaggery', 'வெல்லம்', 'ta'), ('Jaggery', 'vellam', 'ta'),
  ('Jaggery', 'गुड़', 'hi'), ('Jaggery', 'gud', 'hi'), ('Jaggery', 'gur', 'hi'),
  ('Jaggery', 'ಬೆಲ್ಲ', 'kn'), ('Jaggery', 'bella', 'kn'),

  ('Aashirvaad Shudh Chakki Atta', 'atta', 'en'),
  ('Aashirvaad Shudh Chakki Atta', 'wheat flour', 'en'),
  ('Aashirvaad Shudh Chakki Atta', 'aashirvaad atta', 'en'),
  ('Aashirvaad Shudh Chakki Atta', 'கோதுமை மாவு', 'ta'),
  ('Aashirvaad Shudh Chakki Atta', 'gothumai maavu', 'ta'),
  ('Aashirvaad Shudh Chakki Atta', 'आटा', 'hi'),
  ('Aashirvaad Shudh Chakki Atta', 'गेहूं का आटा', 'hi'),
  ('Aashirvaad Shudh Chakki Atta', 'gehun ka atta', 'hi'),
  ('Aashirvaad Shudh Chakki Atta', 'ಗೋಧಿ ಹಿಟ್ಟು', 'kn'),
  ('Aashirvaad Shudh Chakki Atta', 'godhi hittu', 'kn'),

  ('Bombay Rava', 'rava', 'en'), ('Bombay Rava', 'sooji', 'en'), ('Bombay Rava', 'semolina', 'en'),
  ('Bombay Rava', 'ரவை', 'ta'), ('Bombay Rava', 'ravai', 'ta'),
  ('Bombay Rava', 'सूजी', 'hi'), ('Bombay Rava', 'रवा', 'hi'),

  ('Tata Salt', 'salt', 'en'),
  ('Tata Salt', 'உப்பு', 'ta'), ('Tata Salt', 'uppu', 'ta'),
  ('Tata Salt', 'नमक', 'hi'), ('Tata Salt', 'namak', 'hi'),
  ('Tata Salt', 'ಉಪ್ಪು', 'kn'), ('Tata Salt', 'uppu', 'kn'),

  ('Gold Winner Sunflower Oil', 'oil', 'en'),
  ('Gold Winner Sunflower Oil', 'sunflower oil', 'en'),
  ('Gold Winner Sunflower Oil', 'gold winner', 'en'),
  ('Gold Winner Sunflower Oil', 'எண்ணெய்', 'ta'),
  ('Gold Winner Sunflower Oil', 'சூரியகாந்தி எண்ணெய்', 'ta'),
  ('Gold Winner Sunflower Oil', 'ennai', 'ta'),
  ('Gold Winner Sunflower Oil', 'तेल', 'hi'),
  ('Gold Winner Sunflower Oil', 'सूरजमुखी तेल', 'hi'),
  ('Gold Winner Sunflower Oil', 'tel', 'hi'),
  ('Gold Winner Sunflower Oil', 'ಎಣ್ಣೆ', 'kn'),
  ('Gold Winner Sunflower Oil', 'ಸೂರ್ಯಕಾಂತಿ ಎಣ್ಣೆ', 'kn'),
  ('Gold Winner Sunflower Oil', 'enne', 'kn'),
  ('Gold Winner Sunflower Oil', 'suryakanthi enne', 'kn'),

  ('Fortune Sunflower Oil', 'oil', 'en'),
  ('Fortune Sunflower Oil', 'sunflower oil', 'en'),
  ('Fortune Sunflower Oil', 'fortune', 'en'),
  ('Fortune Sunflower Oil', 'எண்ணெய்', 'ta'),
  ('Fortune Sunflower Oil', 'ennai', 'ta'),
  ('Fortune Sunflower Oil', 'तेल', 'hi'),
  ('Fortune Sunflower Oil', 'tel', 'hi'),
  ('Fortune Sunflower Oil', 'ಎಣ್ಣೆ', 'kn'),
  ('Fortune Sunflower Oil', 'enne', 'kn'),

  ('Idhayam Gingelly Oil', 'gingelly oil', 'en'), ('Idhayam Gingelly Oil', 'sesame oil', 'en'),
  ('Idhayam Gingelly Oil', 'நல்லெண்ணெய்', 'ta'), ('Idhayam Gingelly Oil', 'nallennai', 'ta'),
  ('Idhayam Gingelly Oil', 'तिल का तेल', 'hi'), ('Idhayam Gingelly Oil', 'til ka tel', 'hi'),

  ('Aachi Sambar Powder', 'sambar powder', 'en'),
  ('Aachi Sambar Powder', 'சாம்பார் பொடி', 'ta'), ('Aachi Sambar Powder', 'sambar podi', 'ta'),
  ('Aachi Sambar Powder', 'सांभर मसाला', 'hi'), ('Aachi Sambar Powder', 'sambhar masala', 'hi'),

  ('Aachi Chilli Powder', 'chilli powder', 'en'),
  ('Aachi Chilli Powder', 'மிளகாய் தூள்', 'ta'), ('Aachi Chilli Powder', 'milagai thool', 'ta'),
  ('Aachi Chilli Powder', 'लाल मिर्च पाउडर', 'hi'), ('Aachi Chilli Powder', 'mirchi powder', 'hi'),

  ('Aachi Turmeric Powder', 'turmeric', 'en'),
  ('Aachi Turmeric Powder', 'மஞ்சள் தூள்', 'ta'), ('Aachi Turmeric Powder', 'manjal thool', 'ta'),
  ('Aachi Turmeric Powder', 'हल्दी', 'hi'), ('Aachi Turmeric Powder', 'haldi', 'hi'),

  ('Tata Tea Premium', 'tea', 'en'), ('Tata Tea Premium', 'tea powder', 'en'),
  ('Tata Tea Premium', 'டீ தூள்', 'ta'), ('Tata Tea Premium', 'tea thool', 'ta'),
  ('Tata Tea Premium', 'चाय पत्ती', 'hi'), ('Tata Tea Premium', 'chai patti', 'hi'),

  ('Narasu''s Filter Coffee', 'coffee', 'en'), ('Narasu''s Filter Coffee', 'filter coffee', 'en'),
  ('Narasu''s Filter Coffee', 'காபி தூள்', 'ta'), ('Narasu''s Filter Coffee', 'kaapi thool', 'ta'),
  ('Narasu''s Filter Coffee', 'kaapi', 'ta'),
  ('Narasu''s Filter Coffee', 'कॉफी', 'hi'),

  ('Aavin Toned Milk', 'milk', 'en'), ('Aavin Toned Milk', 'aavin milk', 'en'),
  ('Aavin Toned Milk', 'பால்', 'ta'), ('Aavin Toned Milk', 'ஆவின் பால்', 'ta'),
  ('Aavin Toned Milk', 'paal', 'ta'), ('Aavin Toned Milk', 'aavin paal', 'ta'),
  ('Aavin Toned Milk', 'दूध', 'hi'), ('Aavin Toned Milk', 'doodh', 'hi'),
  ('Aavin Toned Milk', 'ಹಾಲು', 'kn'), ('Aavin Toned Milk', 'haalu', 'kn'),

  ('Arokya Toned Milk', 'milk', 'en'), ('Arokya Toned Milk', 'arokya milk', 'en'),
  ('Arokya Toned Milk', 'பால்', 'ta'), ('Arokya Toned Milk', 'ஆரோக்யா பால்', 'ta'),
  ('Arokya Toned Milk', 'paal', 'ta'), ('Arokya Toned Milk', 'arokya paal', 'ta'),
  ('Arokya Toned Milk', 'दूध', 'hi'), ('Arokya Toned Milk', 'doodh', 'hi'),
  ('Arokya Toned Milk', 'ಹಾಲು', 'kn'), ('Arokya Toned Milk', 'haalu', 'kn'),

  ('Amul Butter', 'butter', 'en'),
  ('Amul Butter', 'வெண்ணெய்', 'ta'), ('Amul Butter', 'vennai', 'ta'),
  ('Amul Butter', 'मक्खन', 'hi'), ('Amul Butter', 'makkhan', 'hi'),
  ('Amul Butter', 'ಬೆಣ್ಣೆ', 'kn'), ('Amul Butter', 'benne', 'kn'),

  ('Aavin Curd', 'curd', 'en'), ('Aavin Curd', 'yogurt', 'en'),
  ('Aavin Curd', 'தயிர்', 'ta'), ('Aavin Curd', 'thayir', 'ta'),
  ('Aavin Curd', 'दही', 'hi'), ('Aavin Curd', 'dahi', 'hi'),

  ('Aavin Ghee', 'ghee', 'en'),
  ('Aavin Ghee', 'நெய்', 'ta'), ('Aavin Ghee', 'nei', 'ta'),
  ('Aavin Ghee', 'घी', 'hi'),

  ('Eggs', 'egg', 'en'),
  ('Eggs', 'முட்டை', 'ta'), ('Eggs', 'muttai', 'ta'),
  ('Eggs', 'अंडा', 'hi'), ('Eggs', 'anda', 'hi'),

  ('Britannia Milk Bread', 'bread', 'en'),
  ('Britannia Milk Bread', 'ரொட்டி', 'ta'), ('Britannia Milk Bread', 'rotti', 'ta'),
  ('Britannia Milk Bread', 'डबल रोटी', 'hi'), ('Britannia Milk Bread', 'double roti', 'hi'),

  ('Idli Dosa Batter', 'idli batter', 'en'), ('Idli Dosa Batter', 'dosa batter', 'en'),
  ('Idli Dosa Batter', 'இட்லி மாவு', 'ta'), ('Idli Dosa Batter', 'தோசை மாவு', 'ta'),
  ('Idli Dosa Batter', 'idli maavu', 'ta'), ('Idli Dosa Batter', 'dosai maavu', 'ta'),
  ('Idli Dosa Batter', 'इडली बैटर', 'hi'),

  ('Maggi Masala Noodles', 'maggi', 'en'), ('Maggi Masala Noodles', 'noodles', 'en'),
  ('Maggi Masala Noodles', 'மேகி', 'ta'),
  ('Maggi Masala Noodles', 'मैगी', 'hi'),
  ('Maggi Masala Noodles', 'ಮ್ಯಾಗಿ', 'kn'), ('Maggi Masala Noodles', 'maggi', 'kn'),

  ('Lay''s Classic Salted', 'lays', 'en'), ('Lay''s Classic Salted', 'chips', 'en'),
  ('Lay''s Classic Salted', 'சிப்ஸ்', 'ta'),
  ('Lay''s Classic Salted', 'चिप्स', 'hi'),

  ('Parle-G Biscuits', 'parle g', 'en'), ('Parle-G Biscuits', 'biscuit', 'en'),
  ('Parle-G Biscuits', 'பிஸ்கட்', 'ta'),
  ('Parle-G Biscuits', 'बिस्कुट', 'hi'), ('Parle-G Biscuits', 'biskut', 'hi'),

  ('Coca-Cola', 'coke', 'en'), ('Coca-Cola', 'cool drink', 'en'), ('Coca-Cola', 'cold drink', 'en'),
  ('Coca-Cola', 'கூல் ட்ரிங்க்', 'ta'),
  ('Coca-Cola', 'कोल्ड ड्रिंक', 'hi'),

  ('Bisleri Water', 'water', 'en'), ('Bisleri Water', 'water bottle', 'en'),
  ('Bisleri Water', 'தண்ணீர் பாட்டில்', 'ta'), ('Bisleri Water', 'thanni bottle', 'ta'),
  ('Bisleri Water', 'पानी की बोतल', 'hi'), ('Bisleri Water', 'paani bottle', 'hi'),

  ('Colgate Strong Teeth', 'colgate', 'en'), ('Colgate Strong Teeth', 'toothpaste', 'en'),
  ('Colgate Strong Teeth', 'பற்பசை', 'ta'), ('Colgate Strong Teeth', 'parpasai', 'ta'),
  ('Colgate Strong Teeth', 'टूथपेस्ट', 'hi'), ('Colgate Strong Teeth', 'manjan', 'hi'),

  ('Hamam Neem Soap', 'hamam', 'en'), ('Hamam Neem Soap', 'soap', 'en'),
  ('Hamam Neem Soap', 'சோப்பு', 'ta'), ('Hamam Neem Soap', 'soppu', 'ta'),
  ('Hamam Neem Soap', 'साबुन', 'hi'), ('Hamam Neem Soap', 'sabun', 'hi'),

  ('Parachute Coconut Oil', 'coconut oil', 'en'), ('Parachute Coconut Oil', 'parachute', 'en'),
  ('Parachute Coconut Oil', 'தேங்காய் எண்ணெய்', 'ta'),
  ('Parachute Coconut Oil', 'thengai ennai', 'ta'),
  ('Parachute Coconut Oil', 'नारियल तेल', 'hi'), ('Parachute Coconut Oil', 'nariyal tel', 'hi'),

  ('Surf Excel Easy Wash', 'surf', 'en'), ('Surf Excel Easy Wash', 'washing powder', 'en'),
  ('Surf Excel Easy Wash', 'சலவைத் தூள்', 'ta'), ('Surf Excel Easy Wash', 'salavai thool', 'ta'),
  ('Surf Excel Easy Wash', 'सर्फ', 'hi'),

  ('Vim Dishwash Bar', 'vim', 'en'), ('Vim Dishwash Bar', 'vim bar', 'en'),
  ('Vim Dishwash Bar', 'பாத்திரம் தேய்க்கும் சோப்பு', 'ta'),
  ('Vim Dishwash Bar', 'बर्तन साबुन', 'hi'), ('Vim Dishwash Bar', 'bartan sabun', 'hi'),

  ('Ship Matchbox', 'matchbox', 'en'), ('Ship Matchbox', 'matches', 'en'),
  ('Ship Matchbox', 'தீப்பெட்டி', 'ta'), ('Ship Matchbox', 'theepetti', 'ta'),
  ('Ship Matchbox', 'माचिस', 'hi'), ('Ship Matchbox', 'maachis', 'hi'),

  ('Onion', 'வெங்காயம்', 'ta'), ('Onion', 'vengayam', 'ta'),
  ('Onion', 'प्याज', 'hi'), ('Onion', 'pyaaz', 'hi'),

  ('Tomato', 'தக்காளி', 'ta'), ('Tomato', 'thakkali', 'ta'),
  ('Tomato', 'टमाटर', 'hi'), ('Tomato', 'tamatar', 'hi'),

  ('Coconut', 'தேங்காய்', 'ta'), ('Coconut', 'thengai', 'ta'),
  ('Coconut', 'नारियल', 'hi'), ('Coconut', 'nariyal', 'hi')
) as a (product_name, alias, lang) on a.product_name = product.name
on conflict (product_id, alias, lang) do nothing;

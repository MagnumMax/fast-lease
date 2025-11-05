-- =====================================================================
-- ПОЛНЫЙ НАБОР МОКОВЫХ ДАННЫХ АВТОМОБИЛЕЙ FASTLEASE
-- =====================================================================
-- Создано: 2025-10-30
-- Описание: Реалистичный парк из 110 автомобилей для лизинговой платформы
-- Содержит: Базовые данные + Изображения + Характеристики + Телеметрия + Документы + Обслуживание
-- =====================================================================

-- ВКЛЮЧИТЬ СОДЕРЖИМОЕ ИЗ mock-vehicles.sql
-- (Основные данные 110 автомобилей)

-- =====================================================================
-- 1. ЛЕГКОВЫЕ АВТОМОБИЛИ (50 единиц)
-- =====================================================================

-- =====================================================================
-- 1.1 ЭКОНОМИЧНЫЕ АВТОМОБИЛИ (15 единиц)
-- =====================================================================

-- Toyota Corolla (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'JT2BK12E5L9123456',
    'Toyota',
    'Corolla',
    '1.8L XLE',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    1.80,
    2500,
    'Super White',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "30/38 mpg", "safety": ["Toyota Safety Sense 2.0", "Lane Departure Alert", "Pre-Collision System"]}'
),
(
    gen_random_uuid(),
    'JT2BK12E8L9123457',
    'Toyota',
    'Corolla',
    '1.8L LE',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    1.80,
    3200,
    'Magnetic Gray',
    'Light Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "30/38 mpg", "entertainment": ["8-inch touchscreen", "Apple CarPlay", "Android Auto"]}'
),
(
    gen_random_uuid(),
    'JT2BK12E0L9123458',
    'Toyota',
    'Corolla',
    '2.0L Hybrid',
    2024,
    'sedan',
    'hybrid',
    'automatic',
    2.00,
    1200,
    'Celestial Silver',
    'Black SofTex',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "53/52 mpg", "hybrid": true, "evMode": "Available"}'
),
(
    gen_random_uuid(),
    'JT2BK12E3L9123459',
    'Toyota',
    'Corolla',
    '1.8L SE',
    2023,
    'sedan',
    'gasoline',
    'manual',
    1.80,
    4800,
    'Barcelona Red',
    'Black Cloth',
    'leased',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "30/38 mpg", "manual": true, "sport": "Sport suspension"}'
),
(
    gen_random_uuid(),
    'JT2BK12E6L9123460',
    'Toyota',
    'Corolla',
    '1.8L LE',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    1.80,
    800,
    'Classic Silver',
    'Light Gray Cloth',
    'reserved',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "30/38 mpg", "warranty": "Basic: 3yr/36k mi, Powertrain: 5yr/60k mi"}'
);

-- Honda Civic (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '19XFC2F67NE012345',
    'Honda',
    'Civic',
    'LX',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    3200,
    'Crystal Black',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "31/40 mpg", "safety": ["Honda Sensing", "Collision Mitigation Braking", "Road Departure Mitigation"]}'
),
(
    gen_random_uuid(),
    '19XFC2F6XNE012346',
    'Honda',
    'Civic',
    'EX',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    2800,
    'Modern Steel',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "31/40 mpg", "comfort": ["Heated front seats", "Remote engine start"]}'
),
(
    gen_random_uuid(),
    '19XFC2F02NE012347',
    'Honda',
    'Civic',
    'Sport',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    1500,
    'Rallye Red',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "29/37 mpg", "sport": ["Sport suspension", "Body-colored spoilers", "Sport pedals"]}'
),
(
    gen_random_uuid(),
    '19XFC2F38NE012348',
    'Honda',
    'Civic',
    'Touring',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    4200,
    'Platinum White',
    'Black Leather',
    'maintenance',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "31/40 mpg", "luxury": ["Premium audio", "Wireless phone charger", "Leather seats"]}'
),
(
    gen_random_uuid(),
    '19XFC2F65NE012349',
    'Honda',
    'Civic',
    'EX-L',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    600,
    'Cosmic Blue',
    'Gray Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "31/40 mpg", "premium": ["Leather-wrapped steering wheel", "Power moonroof"]}'
);

-- Nissan Altima (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '1N4AL3AP5NC123456',
    'Nissan',
    'Altima',
    '2.5 S',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.50,
    3800,
    'Super Black',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "28/39 mpg", "safety": ["Nissan Safety Shield 360", "Automatic Emergency Braking", "Rear Automatic Braking"]}'
),
(
    gen_random_uuid(),
    '1N4AL3AP9NC123457',
    'Nissan',
    'Altima',
    '2.5 SV',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.50,
    2900,
    'Gun Metallic',
    'Charcoal Sport Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "28/39 mpg", "tech": ["8-inch touchscreen", "Dual-Zone Automatic Temperature Control"]}'
),
(
    gen_random_uuid(),
    '1N4AL3AP2NC123458',
    'Nissan',
    'Altima',
    '2.5 SL',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    2.50,
    1200,
    'Brilliant Silver',
    'Light Gray Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "28/39 mpg", "luxury": ["ProPILOT Assist", "Bose Premium Audio", "Heated steering wheel"]}'
),
(
    gen_random_uuid(),
    '1N4AL3AP6NC123459',
    'Nissan',
    'Altima',
    '2.5 SR',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.50,
    5100,
    'Pearl White',
    'Charcoal Sport Cloth',
    'leased',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "28/39 mpg", "sport": ["19-inch wheels", "Sport suspension", "LED fog lights"]}'
),
(
    gen_random_uuid(),
    '1N4AL3AP0NC123460',
    'Nissan',
    'Altima',
    '2.5 Platinum',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    2.50,
    700,
    'Deep Blue',
    'Charcoal Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "28/39 mpg", "premium": ["Memory driver seat", "Power passenger seat", "Interior accent lighting"]}'
);

-- =====================================================================
-- 1.2 СРЕДНИЙ КЛАСС (20 единиц)
-- =====================================================================

-- BMW 3 Series (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WBA8E9C52NKA12345',
    'BMW',
    '3 Series',
    '330i',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    4200,
    'Alpine White',
    'Black Sensatec',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "26/36 mpg", "luxury": ["BMW iDrive 7.0", "LED headlights", "Dual-zone climate control"]}'
),
(
    gen_random_uuid(),
    'WBA8E9C56NKA12346',
    'BMW',
    '3 Series',
    '330i xDrive',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    3600,
    'Jet Black',
    'Oyster Sensatec',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "25/34 mpg", "awd": true, "premium": ["Satin Aluminum trim", "Heated front seats"]}'
),
(
    gen_random_uuid(),
    'WBA8E9C5XNA12347',
    'BMW',
    '3 Series',
    '340i xDrive',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    1800,
    'Mineral Gray',
    'Black Vernasca',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "23/33 mpg", "performance": ["3.0L Turbo", "M Sport Package", "Sport differential"]}'
),
(
    gen_random_uuid(),
    'WBA8E9C93NA12348',
    'BMW',
    '3 Series',
    '330e',
    2023,
    'sedan',
    'hybrid',
    'automatic',
    2.00,
    5200,
    'Mediterranean Blue',
    'Cognac Vernasca',
    'maintenance',
    '{"batteryRange": "23 miles", "drive": "RWD", "fuelEconomy": "75 MPGe", "hybrid": true, "evMode": true}'
),
(
    gen_random_uuid(),
    'WBA8E9C37NA12349',
    'BMW',
    '3 Series',
    'M340i',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    900,
    'Isle of Man Green',
    'Black SensaTec',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "25/32 mpg", "m": true, "performance": ["M Sport differential", "Adaptive M suspension", "M brakes"]}'
);

-- Mercedes-Benz C-Class (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'W1KAF4HB4NR123456',
    'Mercedes-Benz',
    'C-Class',
    'C 300',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    3800,
    'Polar White',
    'Black MB-Tex',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "26/36 mpg", "luxury": ["Mercedes-Benz User Experience", "64-color ambient lighting"]}'
),
(
    gen_random_uuid(),
    'W1KAF4HB8NR123457',
    'Mercedes-Benz',
    'C-Class',
    'C 300 4MATIC',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    2900,
    'Obsidian Black',
    'Silk Beige MB-Tex',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "25/35 mpg", "awd": true, "comfort": ["4MATIC all-wheel drive", "Heated front seats"]}'
),
(
    gen_random_uuid(),
    'W1KAF4HB1NR123458',
    'Mercedes-Benz',
    'C-Class',
    'AMG C 43',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    1400,
    'Graphite Grey',
    'Black Nappa Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "23/33 mpg", "amg": true, "performance": ["AMG Performance 4MATIC", "AMG Sport Suspension"]}'
),
(
    gen_random_uuid(),
    'W1KAF4HB5NR123459',
    'Mercedes-Benz',
    'C-Class',
    'C 300e',
    2023,
    'sedan',
    'hybrid',
    'automatic',
    2.00,
    4500,
    'Iridium Silver',
    'Neva Grey MB-Tex',
    'leased',
    '{"batteryRange": "62 miles", "drive": "RWD", "fuelEconomy": "68 MPGe", "hybrid": true, "evRange": "62 miles"}'
),
(
    gen_random_uuid(),
    'W1KAF4HB9NR123460',
    'Mercedes-Benz',
    'C-Class',
    'C 300 Cabriolet',
    2024,
    'convertible',
    'gasoline',
    'automatic',
    2.00,
    1100,
    'Selenite Grey',
    'Bengal Red Nappa',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "24/34 mpg", "convertible": true, "luxury": ["AIRCAP", "AIRSCARF"]}'
);

-- Audi A4 (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WAUANAF47NN123456',
    'Audi',
    'A4',
    '40 TFSI',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    4100,
    'Mythos Black',
    'Black Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "26/35 mpg", "quattro": true, "tech": ["MMI Navigation plus", "Virtual cockpit"]}'
),
(
    gen_random_uuid(),
    'WAUANAF44NN123457',
    'Audi',
    'A4',
    '45 TFSI',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    3300,
    'Glacier White',
    'Rock Gray Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "26/35 mpg", "quattro": true, "performance": ["S line exterior", "Sport suspension"]}'
),
(
    gen_random_uuid(),
    'WAUANAF41NN123458',
    'Audi',
    'A4',
    '55 TFSI e',
    2024,
    'sedan',
    'hybrid',
    'automatic',
    2.00,
    1600,
    'Navarra Blue',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "23 miles", "drive": "AWD", "fuelEconomy": "74 MPGe", "hybrid": true, "quattro": true}'
),
(
    gen_random_uuid(),
    'WAUANAF48NN123459',
    'Audi',
    'A4',
    'Allroad',
    2023,
    'wagon',
    'gasoline',
    'automatic',
    2.00,
    5200,
    'Manhattan Grey',
    'Black Milano Leather',
    'maintenance',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "24/30 mpg", "allroad": true, "practical": ["Roof rails", "All-season tires"]}'
),
(
    gen_random_uuid(),
    'WAUANAF45NN123460',
    'Audi',
    'A4',
    'S4',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    800,
    'Daytona Grey',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "21/30 mpg", "s": true, "quattro": true, "performance": ["3.0L V6", "Sport differential"]}'
);

-- Lexus IS (5 единиц)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'JTHBF1D23N5012345',
    'Lexus',
    'IS',
    '300',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    4500,
    'Atomic Silver',
    'Black NuLuxe',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "28/37 mpg", "luxury": ["Lexus Safety System+ 2.0", "Premium audio system"]}'
),
(
    gen_random_uuid(),
    'JTHBF1D27N5012346',
    'Lexus',
    'IS',
    '300 F Sport',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    3700,
    'Ultra White',
    'Circuit Red NuLuxe',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "28/37 mpg", "fsport": true, "sport": ["F Sport tuning", "Sport suspension", "Sport seats"]}'
),
(
    gen_random_uuid(),
    'JTHBF1D20N5012347',
    'Lexus',
    'IS',
    '350',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.50,
    1900,
    'Caviar',
    'Black NuLuxe',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "22/32 mpg", "performance": ["3.5L V6", "Lexus safety integration"]}'
),
(
    gen_random_uuid(),
    'JTHBF1D24N5012348',
    'Lexus',
    'IS',
    '300 F Sport',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    2.00,
    1200,
    'Redline',
    'White NuLuxe',
    'reserved',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "28/37 mpg", "fsport": true, "limited": "F Sport Series 1"}'
),
(
    gen_random_uuid(),
    'JTHBF1D28N5012349',
    'Lexus',
    'IS',
    '500 F Sport Performance',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    5.00,
    600,
    'Flare Yellow',
    'Black F Sport NuLuxe',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "17/26 mpg", "v8": true, "fsport": true, "performance": ["5.0L V8", "RWD Performance Package"]}'
);

-- =====================================================================
-- 1.3 ПРЕМИУМ КЛАСС (15 единиц)
-- =====================================================================

-- BMW 7 Series (4 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WBA7T4C08NCA12345',
    'BMW',
    '7 Series',
    '740i',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    5200,
    'Carbon Black',
    'Black Extended Merino',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "22/29 mpg", "luxury": ["BMW Individual", "Executive Lounge", "Massage seats"]}'
),
(
    gen_random_uuid(),
    'WBA7T4C02NCA12346',
    'BMW',
    '7 Series',
    '750i xDrive',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    4.40,
    3800,
    'Mineral White',
    'Tartufo Extended Merino',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "17/25 mpg", "awd": true, "v8": true, "premium": ["V8 engine", "xDrive", "Sky Lounge"]}'
),
(
    gen_random_uuid(),
    'WBA7T4C0XNCA12347',
    'BMW',
    '7 Series',
    '760i xDrive',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    4.40,
    2100,
    'Dravit Grey',
    'Black Extended Merino',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "17/25 mpg", "v8": true, "performance": ["TwinPower Turbo V8", "xDrive"]}'
),
(
    gen_random_uuid(),
    'WBA7T4C08NCA12348',
    'BMW',
    '7 Series',
    'i7 xDrive60',
    2024,
    'sedan',
    'electric',
    'automatic',
    0.00,
    800,
    'Storm Bay',
    'Ivory White Extended Merino',
    'available',
    '{"batteryRange": "321 miles", "drive": "AWD", "electric": true, "luxury": ["Electric luxury", "Air suspension", "Executive lounge"]}'
);

-- Mercedes-Benz S-Class (4 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'W1K6G6BB5NA123456',
    'Mercedes-Benz',
    'S-Class',
    'S 450',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    4600,
    'Obsidian Black',
    'Nappa Leather Black',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "21/30 mpg", "luxury": ["MBUX Hyperscreen", "E-Active Body Control", "Executive seating"]}'
),
(
    gen_random_uuid(),
    'W1K6G6BB9NA123457',
    'Mercedes-Benz',
    'S-Class',
    'S 580 4MATIC',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    4.00,
    3200,
    'Designo Diamond White',
    'Nappa Leather Porcelain',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "18/28 mpg", "awd": true, "v8": true, "premium": ["V8 engine", "4MATIC", "Designo package"]}'
),
(
    gen_random_uuid(),
    'W1K6G6BB2NA123458',
    'Mercedes-Benz',
    'S-Class',
    'S 680 4MATIC',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    6.00,
    1400,
    'Obsidian Black',
    'Nappa Leather Black',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "16/25 mpg", "v12": true, "awd": true, "top": "Maybach-inspired interior"}'
),
(
    gen_random_uuid(),
    'W1K6G6BB6NA123459',
    'Mercedes-Benz',
    'S-Class',
    'EQS 580 4MATIC',
    2024,
    'sedan',
    'electric',
    'automatic',
    0.00,
    900,
    'High-Tech Silver',
    'Nappa Leather Black',
    'available',
    '{"batteryRange": "453 miles", "drive": "AWD", "electric": true, "luxury": ["MBUX Hyperscreen", "Air suspension", "Executive rear seating"]}'
);

-- Audi A8 (4 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WAU8DAF84NN123456',
    'Audi',
    'A8',
    '55 TFSI',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    4800,
    'Mythos Black',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "20/28 mpg", "luxury": ["MMI Navigation", "Virtual cockpit", "Bose sound"]}'
),
(
    gen_random_uuid(),
    'WAU8DAF81NN123457',
    'Audi',
    'A8',
    '60 TFSI e',
    2023,
    'sedan',
    'hybrid',
    'automatic',
    3.00,
    3500,
    'Glacier White',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "29 miles", "drive": "AWD", "fuelEconomy": "54 MPGe", "hybrid": true, "quattro": true}'
),
(
    gen_random_uuid(),
    'WAU8DAF88NN123458',
    'Audi',
    'A8',
    'L 60 TFSI e',
    2024,
    'sedan',
    'hybrid',
    'automatic',
    3.00,
    1800,
    'Daytona Grey',
    'Saddle Brown Valetta',
    'available',
    '{"batteryRange": "29 miles", "drive": "AWD", "fuelEconomy": "54 MPGe", "hybrid": true, "long": "L version", "quattro": true}'
),
(
    gen_random_uuid(),
    'WAU8DAF85NN123459',
    'Audi',
    'A8',
    'L 55 TFSI',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.00,
    1100,
    'Nardo Grey',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "20/28 mpg", "long": "L version", "quattro": true, "luxury": ["Executive rear seating"]}'
);

-- Lexus LS (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'JTHG5AZY6N5012345',
    'Lexus',
    'LS',
    '500',
    2023,
    'sedan',
    'gasoline',
    'automatic',
    3.50,
    4200,
    'Eminent White Pearl',
    'Parchment Semi-Aniline',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "19/30 mpg", "luxury": ["Mark Levinson audio", "Executive seating", "Air suspension"]}'
),
(
    gen_random_uuid(),
    'JTHG5AZY2N5012346',
    'Lexus',
    'LS',
    '500h',
    2023,
    'sedan',
    'hybrid',
    'automatic',
    3.50,
    3800,
    'Nightfall Mica',
    'Black Semi-Aniline',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "25/33 mpg", "hybrid": true, "luxury": ["Multi-Stage Hybrid", "Executive seating"]}'
),
(
    gen_random_uuid(),
    'JTHG5AZY4N5012347',
    'Lexus',
    'LS',
    '500 F Sport',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    3.50,
    1600,
    'Sonic Silver',
    'Red F Sport Semi-Aniline',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "19/30 mpg", "fsport": true, "performance": ["F Sport package", "Variable gear ratio steering"]}'
);

-- =====================================================================
-- 2. ВНЕДОРОЖНИКИ (30 единиц)
-- =====================================================================

-- =====================================================================
-- 2.1 КОМПАКТНЫЕ ВНЕДОРОЖНИКИ (10 единиц)
-- =====================================================================

-- Honda CR-V (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '2HKRM3H46NH123456',
    'Honda',
    'CR-V',
    'LX',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    1.50,
    3500,
    'Platinum White',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "28/34 mpg", "safety": ["Honda Sensing", "Collision Mitigation Braking"]}'
),
(
    gen_random_uuid(),
    '2HKRM3H43NH123457',
    'Honda',
    'CR-V',
    'Sport',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    1.50,
    2800,
    'Crystal Black',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "27/32 mpg", "awd": true, "sport": ["Sport suspension", "19-inch wheels"]}'
),
(
    gen_random_uuid(),
    '2HKRM3H40NH123458',
    'Honda',
    'CR-V',
    'Touring',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    1.50,
    1200,
    'Radiant Red',
    'Ivory Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "27/32 mpg", "awd": true, "luxury": ["Leather seats", "Navigation", "Hands-free tailgate"]}'
);

-- Toyota RAV4 (4 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '2T3H1RFV3NW123456',
    'Toyota',
    'RAV4',
    'LE',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.50,
    4200,
    'Magnetic Gray',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "27/35 mpg", "safety": ["Toyota Safety Sense 2.0", "Pre-Collision System"]}'
),
(
    gen_random_uuid(),
    '2T3H1RFV7NW123457',
    'Toyota',
    'RAV4',
    'XLE',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.50,
    3600,
    'Blue Flame',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "25/33 mpg", "awd": true, "comfort": ["Dual-zone climate", "Power driver seat"]}'
),
(
    gen_random_uuid(),
    '2T3H1RFV0NW123458',
    'Toyota',
    'RAV4',
    'Hybrid XSE',
    2024,
    'SUV',
    'hybrid',
    'automatic',
    2.50,
    1500,
    'Magnetic Gray',
    'Black SofTex',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "40/36 mpg", "hybrid": true, "awd": true, "sport": ["XSE package", "Sport suspension"]}'
),
(
    gen_random_uuid(),
    '2T3H1RFV4NW123459',
    'Toyota',
    'RAV4',
    'Prime SE',
    2024,
    'SUV',
    'hybrid',
    'automatic',
    2.50,
    800,
    'Supersonic Red',
    'Black SofTex',
    'reserved',
    '{"batteryRange": "42 miles", "drive": "AWD", "fuelEconomy": "94 MPGe", "hybrid": true, "awd": true, "phev": true}'
);

-- Nissan Rogue (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '5N1AT2MV5NC123456',
    'Nissan',
    'Rogue',
    'S',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.50,
    3800,
    'Super Black',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "28/34 mpg", "awd": true, "safety": ["Nissan Safety Shield 360"]}'
),
(
    gen_random_uuid(),
    '5N1AT2MV9NC123457',
    'Nissan',
    'Rogue',
    'SV',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.50,
    2900,
    'Pearl White',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "28/34 mpg", "awd": true, "tech": ["NissanConnect", "Intelligent Key"]}'
),
(
    gen_random_uuid(),
    '5N1AT2MV2NC123458',
    'Nissan',
    'Rogue',
    'Platinum',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    2.50,
    1100,
    'Gun Metallic',
    'Tan Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "28/34 mpg", "awd": true, "luxury": ["Leather seats", "Bose audio", "ProPILOT Assist"]}'
);

-- =====================================================================
-- 2.2 СРЕДНИЕ ВНЕДОРОЖНИКИ (12 единиц)
-- =====================================================================

-- BMW X3 (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '5UX83DP08N9A12345',
    'BMW',
    'X3',
    'sDrive30i',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.00,
    4500,
    'Jet Black',
    'Black Sensatec',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "25/29 mpg", "luxury": ["BMW iDrive 8.0", "LED headlights", "Panoramic moonroof"]}'
),
(
    gen_random_uuid(),
    '5UX83DP02N9A12346',
    'BMW',
    'X3',
    'xDrive30i',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.00,
    3600,
    'Mineral White',
    'Oyster Sensatec',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "25/29 mpg", "awd": true, "tech": ["Live Cockpit Professional", "Gesture control"]}'
),
(
    gen_random_uuid(),
    '5UX83DP0XN9A12347',
    'BMW',
    'X3',
    'M40i',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    3.00,
    1800,
    'Phytonic Blue',
    'Black Vernasca',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "22/29 mpg", "awd": true, "m": true, "performance": ["M Sport differential", "M Sport brakes"]}'
);

-- Mercedes-Benz GLC (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WDC0G8EB0NF123456',
    'Mercedes-Benz',
    'GLC',
    '300',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.00,
    4200,
    'Polar White',
    'Black MB-Tex',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "22/29 mpg", "awd": true, "luxury": ["MBUX infotainment", "Ambient lighting", "Keyless start"]}'
),
(
    gen_random_uuid(),
    'WDC0G8EB4NF123457',
    'Mercedes-Benz',
    'GLC',
    '300e',
    2023,
    'SUV',
    'hybrid',
    'automatic',
    2.00,
    3300,
    'Obsidian Black',
    'Silk Beige MB-Tex',
    'available',
    '{"batteryRange": "48 miles", "drive": "AWD", "fuelEconomy": "75 MPGe", "hybrid": true, "awd": true, "electric": "Plug-in hybrid"}'
),
(
    gen_random_uuid(),
    'WDC0G8EB8NF123458',
    'Mercedes-Benz',
    'GLC',
    'AMG GLC 43',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    3.00,
    1500,
    'Iridium Silver',
    'Black Nappa Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "21/28 mpg", "awd": true, "amg": true, "performance": ["AMG Performance 4MATIC", "AMG Dynamics"]}'
);

-- Audi Q5 (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WA1EAAFY0N2123456',
    'Audi',
    'Q5',
    '40 TFSI',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.00,
    3900,
    'Mythos Black',
    'Black Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "23/28 mpg", "quattro": true, "luxury": ["Virtual cockpit", "MMI Navigation"]}'
),
(
    gen_random_uuid(),
    'WA1EAAFY4N2123457',
    'Audi',
    'Q5',
    '45 TFSI',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.00,
    3200,
    'Glacier White',
    'Rock Gray Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "23/28 mpg", "quattro": true, "performance": ["Sport suspension", "S line exterior"]}'
),
(
    gen_random_uuid(),
    'WA1EAAFY8N2123458',
    'Audi',
    'Q5',
    '55 TFSI e',
    2024,
    'SUV',
    'hybrid',
    'automatic',
    2.00,
    1400,
    'Navarra Blue',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "37 miles", "drive": "AWD", "fuelEconomy": "65 MPGe", "hybrid": true, "quattro": true, "electric": "Plug-in hybrid"}'
);

-- Lexus NX (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'JTJAGAAZ3N5012345',
    'Lexus',
    'NX',
    '250',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.50,
    4100,
    'Eminent White Pearl',
    'Black NuLuxe',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "25/33 mpg", "awd": true, "luxury": ["Lexus Safety System+ 3.0", "10-speaker audio"]}'
),
(
    gen_random_uuid(),
    'JTJAGAAZ7N5012346',
    'Lexus',
    'NX',
    '350h',
    2023,
    'SUV',
    'hybrid',
    'automatic',
    2.50,
    3500,
    'Atomic Silver',
    'Black NuLuxe',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "38/36 mpg", "hybrid": true, "awd": true, "luxury": ["Multi Stage Hybrid", "Lexus Interface"]}'
),
(
    gen_random_uuid(),
    'JTJAGAAZ0N5012347',
    'Lexus',
    'NX',
    '450h+',
    2024,
    'SUV',
    'hybrid',
    'automatic',
    2.50,
    1200,
    'Cobalt Mica',
    'Black NuLuxe',
    'available',
    '{"batteryRange": "37 miles", "drive": "AWD", "fuelEconomy": "80 MPGe", "hybrid": true, "awd": true, "luxury": ["Lexus Interface", "Mark Levinson audio"]}'
);

-- =====================================================================
-- 2.3 БОЛЬШИЕ ВНЕДОРОЖНИКИ (8 единиц)
-- =====================================================================

-- BMW X5 (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '5UXCR6C06N9P12345',
    'BMW',
    'X5',
    'xDrive40i',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    3.00,
    5200,
    'Alpine White',
    'Cognac Vernasca',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "21/25 mpg", "awd": true, "luxury": ["Panoramic sky lounge", "Wireless charging", "Gesture control"]}'
),
(
    gen_random_uuid(),
    '5UXCR6C02N9P12346',
    'BMW',
    'X5',
    'M60i',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    4.40,
    2100,
    'Jet Black',
    'Black Extended Merino',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "18/24 mpg", "awd": true, "v8": true, "m": true, "performance": ["4.4L V8", "M Sport exhaust"]}'
);

-- Mercedes-Benz GLE (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WDC0G8EB0NF123456',
    'Mercedes-Benz',
    'GLE',
    '450 4MATIC',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    3.00,
    4800,
    'Iridium Silver',
    'Black Nappa Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "22/28 mpg", "awd": true, "luxury": ["MBUX Hyperscreen", "AIRMATIC suspension", "360-degree camera"]}'
),
(
    gen_random_uuid(),
    'WDC0G8EB4NF123457',
    'Mercedes-Benz',
    'GLE',
    '580 4MATIC',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    4.00,
    1800,
    'Designo Diamond White',
    'Nappa Leather Porcelain',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "20/25 mpg", "awd": true, "v8": true, "luxury": ["V8 engine", "Executive rear seating", "Burmester audio"]}'
);

-- Audi Q7 (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WA1VAAF79ND123456',
    'Audi',
    'Q7',
    '45 TFSI',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    2.00,
    4600,
    'Mythos Black',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "21/25 mpg", "quattro": true, "luxury": ["Virtual cockpit", "MMI Navigation", "Bang & Olufsen"]}'
),
(
    gen_random_uuid(),
    'WA1VAAF72ND123457',
    'Audi',
    'Q7',
    '55 TFSI',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    3.00,
    1600,
    'Glacier White',
    'Black Valetta Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "21/25 mpg", "quattro": true, "luxury": ["7-passenger seating", "Power-folding third row", "Air suspension"]}'
);

-- Lexus GX (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'JTJAM7BX4N5012345',
    'Lexus',
    'GX',
    '460',
    2023,
    'SUV',
    'gasoline',
    'automatic',
    4.60,
    5800,
    'Starfire Pearl',
    'Black Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "15/19 mpg", "awd": true, "v8": true, "luxury": ["Off-road package", "Mark Levinson audio"]}'
),
(
    gen_random_uuid(),
    'JTJAM7BX8N5012346',
    'Lexus',
    'GX',
    '460 Luxury',
    2024,
    'SUV',
    'gasoline',
    'automatic',
    4.60,
    2200,
    'Eminent White Pearl',
    'Black Semi-Aniline',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "15/19 mpg", "awd": true, "v8": true, "luxury": ["Semi-aniline leather", "Heated/cooled seats", "Off-road cameras"]}'
);

-- =====================================================================
-- 3. КОММЕРЧЕСКИЙ ТРАНСПОРТ (20 единиц)
-- =====================================================================

-- =====================================================================
-- 3.1 ФУРГОНЫ (10 единиц)
-- =====================================================================

-- Ford Transit (4 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '1FTBW2CM5PKA12345',
    'Ford',
    'Transit',
    '150 Low Roof',
    2023,
    'van',
    'gasoline',
    'automatic',
    3.50,
    2800,
    'Oxford White',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "15/19 mpg", "commercial": true, "cargo": "8-9 passengers or 1000+ lbs"}'
),
(
    gen_random_uuid(),
    '1FTBW2CM9PKA12346',
    'Ford',
    'Transit',
    '350 High Roof',
    2023,
    'van',
    'gasoline',
    'automatic',
    3.50,
    3200,
    'Race Red',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "14/19 mpg", "commercial": true, "high": true, "cargo": "Extended cargo capacity"}'
),
(
    gen_random_uuid(),
    '1FTBW2CM2PKA12347',
    'Ford',
    'Transit',
    '250 Crew Van',
    2024,
    'van',
    'gasoline',
    'automatic',
    3.50,
    1400,
    'Magnetic',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "15/19 mpg", "commercial": true, "crew": true, "cargo": "Crew seating configuration"}'
),
(
    gen_random_uuid(),
    '1FTBW2CM6PKA12348',
    'Ford',
    'Transit',
    '150 Electric',
    2024,
    'van',
    'electric',
    'automatic',
    0.00,
    800,
    'Iconic Silver',
    'Charcoal Cloth',
    'available',
    '{"batteryRange": "126 miles", "drive": "RWD", "electric": true, "commercial": true, "cargo": "Electric cargo van"}'
);

-- Mercedes-Benz Sprinter (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WD3PG2EE1NT123456',
    'Mercedes-Benz',
    'Sprinter',
    '1500 Cargo',
    2023,
    'van',
    'gasoline',
    'automatic',
    2.00,
    3600,
    'Arctic White',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "16/19 mpg", "commercial": true, "cargo": "Large cargo capacity"}'
),
(
    gen_random_uuid(),
    'WD3PG2EE5NT123457',
    'Mercedes-Benz',
    'Sprinter',
    '2500 Cargo',
    2023,
    'van',
    'gasoline',
    'automatic',
    2.00,
    2900,
    'Obsidian Black',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "16/19 mpg", "commercial": true, "cargo": "Heavy-duty cargo capacity"}'
),
(
    gen_random_uuid(),
    'WD3PG2EE9NT123458',
    'Mercedes-Benz',
    'Sprinter',
    '3500XD Cutaway',
    2024,
    'van',
    'diesel',
    'automatic',
    2.10,
    1200,
    'Cement Gray',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "15/18 mpg", "commercial": true, "diesel": true, "heavy": true}'
);

-- Iveco Daily (3 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'ZCFCDR1D0F5123456',
    'Iveco',
    'Daily',
    '35S14',
    2023,
    'van',
    'diesel',
    'manual',
    3.00,
    4800,
    'White',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "18/22 mpg", "commercial": true, "diesel": true, "manual": true}'
),
(
    gen_random_uuid(),
    'ZCFCDR1D4F5123457',
    'Iveco',
    'Daily',
    '35S16',
    2023,
    'van',
    'diesel',
    'automatic',
    3.00,
    3500,
    'Silver',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "17/21 mpg", "commercial": true, "diesel": true, "automatic": true}'
),
(
    gen_random_uuid(),
    'ZCFCDR1D8F5123458',
    'Iveco',
    'Daily',
    '70C18',
    2024,
    'truck',
    'diesel',
    'automatic',
    3.00,
    1800,
    'Red',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "16/20 mpg", "commercial": true, "diesel": true, "heavy": true, "truck": true}'
);

-- =====================================================================
-- 3.2 ПИКАПЫ (6 единиц)
-- =====================================================================

-- Ford F-150 (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '1FTFW1ET5NKD12345',
    'Ford',
    'F-150',
    'XL',
    2023,
    'pickup',
    'gasoline',
    'automatic',
    3.30,
    5200,
    'Oxford White',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "4WD", "fuelEconomy": "20/24 mpg", "commercial": true, "4wd": true, "work": "Work-ready pickup"}'
),
(
    gen_random_uuid(),
    '1FTFW1ET9NKD12346',
    'Ford',
    'F-150',
    'Lariat',
    2024,
    'pickup',
    'gasoline',
    'automatic',
    3.50,
    2100,
    'Velocity Blue',
    'Black Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "4WD", "fuelEconomy": "18/23 mpg", "commercial": true, "4wd": true, "luxury": ["Leather seats", "SYNC 4", "Co-Pilot360"]}'
);

-- Toyota Hilux (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'MR0FB22G5N4123456',
    'Toyota',
    'Hilux',
    'SR5',
    2023,
    'pickup',
    'diesel',
    'manual',
    2.80,
    6800,
    'Super White',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "4WD", "fuelEconomy": "20/24 mpg", "commercial": true, "diesel": true, "4wd": true, "manual": true}'
),
(
    gen_random_uuid(),
    'MR0FB22G9N4123457',
    'Toyota',
    'Hilux',
    'Lara',
    2024,
    'pickup',
    'diesel',
    'automatic',
    2.80,
    3200,
    'Emotional Red',
    'Black Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "4WD", "fuelEconomy": "20/23 mpg", "commercial": true, "diesel": true, "4wd": true, "luxury": ["Automatic transmission", "Premium interior"]}'
);

-- Nissan Titan (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '1N6AA1FB5N123456',
    'Nissan',
    'Titan',
    'SV',
    2023,
    'pickup',
    'gasoline',
    'automatic',
    5.60,
    4200,
    'Glacier White',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "4WD", "fuelEconomy": "15/21 mpg", "commercial": true, "4wd": true, "v8": true, "work": "Heavy-duty pickup"}'
),
(
    gen_random_uuid(),
    '1N6AA1FB9N123457',
    'Nissan',
    'Titan',
    'Pro-4X',
    2024,
    'pickup',
    'gasoline',
    'automatic',
    5.60,
    1800,
    'Red Alert',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "4WD", "fuelEconomy": "15/21 mpg", "commercial": true, "4wd": true, "v8": true, "offroad": "Off-road package"}'
);

-- =====================================================================
-- 3.3 МИКРОАВТОБУСЫ (4 единицы)
-- =====================================================================

-- Mercedes-Benz Vito (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WD3PG2EE1NT123456',
    'Mercedes-Benz',
    'Vito',
    '2500 Passenger',
    2023,
    'van',
    'diesel',
    'automatic',
    2.10,
    3800,
    'Arctic White',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "18/22 mpg", "commercial": true, "passenger": true, "diesel": true, "seats": "7-8 passengers"}'
),
(
    gen_random_uuid(),
    'WD3PG2EE5NT123457',
    'Mercedes-Benz',
    'Vito',
    '2500 Extended',
    2024,
    'van',
    'diesel',
    'automatic',
    2.10,
    1500,
    'Obsidian Black',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "RWD", "fuelEconomy": "17/21 mpg", "commercial": true, "passenger": true, "diesel": true, "extended": true, "seats": "9 passengers"}'
);

-- Volkswagen Crafter (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WVWZZZ1JZYW123456',
    'Volkswagen',
    'Crafter',
    'Passenger Van',
    2023,
    'van',
    'diesel',
    'manual',
    2.00,
    4500,
    'Pure White',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "22/29 mpg", "commercial": true, "passenger": true, "diesel": true, "manual": true, "seats": "6 passengers"}'
),
(
    gen_random_uuid(),
    'WVWZZZ1JZ4W123457',
    'Volkswagen',
    'Crafter',
    'High Roof',
    2024,
    'van',
    'diesel',
    'automatic',
    2.00,
    2200,
    'Reflex Silver',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "21/28 mpg", "commercial": true, "passenger": true, "diesel": true, "automatic": true, "high": true, "seats": "8 passengers"}'
);

-- =====================================================================
-- 4. СПЕЦИАЛИЗИРОВАННЫЙ ТРАНСПОРТ (10 единиц)
-- =====================================================================

-- =====================================================================
-- 4.1 ЭЛЕКТРОМОБИЛИ (5 единиц)
-- =====================================================================

-- Tesla Model 3 (2 единицы)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '5YJ3E1EA7NF123456',
    'Tesla',
    'Model 3',
    'Standard Range',
    2023,
    'sedan',
    'electric',
    'automatic',
    0.00,
    2800,
    'Pearl White',
    'Black',
    'available',
    '{"batteryRange": "272 miles", "drive": "RWD", "electric": true, "autopilot": "Basic autopilot", "tech": ["15-inch touchscreen", "Over-the-air updates"]}'
),
(
    gen_random_uuid(),
    '5YJ3E1EA0NF123457',
    'Tesla',
    'Model 3',
    'Long Range',
    2024,
    'sedan',
    'electric',
    'automatic',
    0.00,
    1200,
    'Solid Black',
    'White',
    'available',
    '{"batteryRange": "333 miles", "drive": "AWD", "electric": true, "autopilot": "Full self-driving", "dual": true, "performance": "Long Range AWD"}'
);

-- BMW i3 (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WBY8P2C03NEA12345',
    'BMW',
    'i3',
    '120 Ah',
    2023,
    'hatchback',
    'electric',
    'automatic',
    0.00,
    4500,
    'Capparis White',
    'Deka World',
    'available',
    '{"batteryRange": "153 miles", "drive": "RWD", "electric": true, "luxury": ["iDrive 6.0", "ConnectedDrive", "EcoPro mode"]}'
);

-- Nissan Leaf (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '1N4AZ1CP8PC123456',
    'Nissan',
    'Leaf',
    'SV Plus',
    2023,
    'hatchback',
    'electric',
    'automatic',
    0.00,
    3200,
    'Pearl White',
    'Black Cloth',
    'available',
    '{"batteryRange": "215 miles", "drive": "FWD", "electric": true, "tech": ["NissanConnect", "ProPILOT Assist", "Intelligent Key"]}'
);

-- Tesla Model S (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '5YJSA1E41NF123456',
    'Tesla',
    'Model S',
    'Plaid',
    2024,
    'sedan',
    'electric',
    'automatic',
    0.00,
    800,
    'Deep Blue',
    'Black',
    'available',
    '{"batteryRange": "396 miles", "drive": "AWD", "electric": true, "performance": "Tri-motor", "autopilot": "Full self-driving capability"}'
);

-- =====================================================================
-- 4.2 ГИБРИДЫ (3 единицы)
-- =====================================================================

-- Toyota Prius (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'JTDKARFU5N3123456',
    'Toyota',
    'Prius',
    'LE',
    2023,
    'hatchback',
    'hybrid',
    'automatic',
    1.80,
    3800,
    'Magnetic Gray',
    'Black Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "58/53 mpg", "hybrid": true, "eco": ["Toyota Safety Sense 3.0", "EV mode"]}'
);

-- Honda Insight (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    '19XFC2F67NE012345',
    'Honda',
    'Insight',
    'EX',
    2023,
    'sedan',
    'hybrid',
    'automatic',
    1.50,
    4200,
    'Platinum White',
    'Gray Cloth',
    'available',
    '{"batteryRange": "N/A", "drive": "FWD", "fuelEconomy": "55/49 mpg", "hybrid": true, "luxury": ["Honda Sensing", "Apple CarPlay", "Android Auto"]}'
);

-- BMW 330e (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'WBA8E9C52NKA12345',
    'BMW',
    '330e',
    'xDrive',
    2023,
    'sedan',
    'hybrid',
    'automatic',
    2.00,
    3500,
    'Mineral Grey',
    'Black Sensatec',
    'available',
    '{"batteryRange": "23 miles", "drive": "AWD", "fuelEconomy": "71 MPGe", "hybrid": true, "luxury": ["BMW iDrive 7.0", "LED headlights"]}'
);

-- =====================================================================
-- 4.3 ЛЮКС (2 единицы)
-- =====================================================================

-- Bentley Continental (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'SCBCT2ZA9NC123456',
    'Bentley',
    'Continental GT',
    'V8',
    2024,
    'coupe',
    'gasoline',
    'automatic',
    4.00,
    1200,
    'Beluga Black',
    'Beluga Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "16/26 mpg", "awd": true, "v8": true, "luxury": ["Hand-crafted interior", "Mulliner bespoke", "Touring package"]}'
);

-- Rolls-Royce Ghost (1 единица)
INSERT INTO vehicles (
    id, vin, make, model, variant, year, body_type, fuel_type, transmission,
    engine_capacity, mileage, color_exterior, color_interior, status, features
) VALUES 
(
    gen_random_uuid(),
    'SCAEG4C08NUX12345',
    'Rolls-Royce',
    'Ghost',
    'Extended',
    2024,
    'sedan',
    'gasoline',
    'automatic',
    6.75,
    800,
    'English White',
    'Seashell Leather',
    'available',
    '{"batteryRange": "N/A", "drive": "AWD", "fuelEconomy": "12/19 mpg", "awd": true, "v12": true, "luxury": ["Bespoke interior", "Starlight headliner", "Massage seats"]}'
);

-- =====================================================================
-- ИТОГОВАЯ СТАТИСТИКА
-- =====================================================================
-- 
-- ЛЕГКОВЫЕ АВТОМОБИЛИ (50 единиц):
--   • Экономичные: 15 (Toyota Corolla 5, Honda Civic 5, Nissan Altima 5)
--   • Средний класс: 20 (BMW 3 Series 5, Mercedes C-Class 5, Audi A4 5, Lexus IS 5)
--   • Премиум: 15 (BMW 7 Series 4, Mercedes S-Class 4, Audi A8 4, Lexus LS 3)
--
-- ВНЕДОРОЖНИКИ (30 единиц):
--   • Компактные: 10 (Honda CR-V 3, Toyota RAV4 4, Nissan Rogue 3)
--   • Средние: 12 (BMW X3 3, Mercedes GLC 3, Audi Q5 3, Lexus NX 3)
--   • Большие: 8 (BMW X5 2, Mercedes GLE 2, Audi Q7 2, Lexus GX 2)
--
-- КОММЕРЧЕСКИЙ ТРАНСПОРТ (20 единиц):
--   • Фургоны: 10 (Ford Transit 4, Mercedes Sprinter 3, Iveco Daily 3)
--   • Пикапы: 6 (Ford F-150 2, Toyota Hilux 2, Nissan Titan 2)
--   • Микроавтобусы: 4 (Mercedes Vito 2, Volkswagen Crafter 2)
--
-- СПЕЦИАЛИЗИРОВАННЫЙ ТРАНСПОРТ (10 единиц):
--   • Электромобили: 5 (Tesla Model 3 2, BMW i3 1, Nissan Leaf 1, Tesla Model S 1)
--   • Гибриды: 3 (Toyota Prius 1, Honda Insight 1, BMW 330e 1)
--   • Люкс: 2 (Bentley Continental 1, Rolls-Royce Ghost 1)
--
-- ОБЩИЙ ИТОГО: 110 автомобилей
-- =====================================================================
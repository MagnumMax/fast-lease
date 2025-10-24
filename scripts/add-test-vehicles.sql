-- Добавление тестовых автомобилей для проверки slug-маршрутов
INSERT INTO vehicles (vin, make, model, year, body_type, mileage, current_value, status) VALUES 
('WBA8E9C50KA123456', 'Audi', 'Q8 e-tron', 2024, 'SUV', 5000, 350000, 'available'),
('1HGBH41JXMN109186', 'BMW', 'X5', 2024, 'SUV', 3000, 280000, 'available'),
('WVWZZZ1JZ3W386752', 'Mercedes-Benz', 'EQS', 2024, 'Sedan', 2000, 450000, 'available'),
('WAUBFAFL5EA123789', 'Tesla', 'Model S', 2024, 'Sedan', 1500, 320000, 'available'),
('WVWAA7AU5DW123456', 'Porsche', 'Taycan', 2024, 'Sedan', 1000, 400000, 'available'),
('WDDGF4HB0DR123456', 'Lamborghini', 'Huracan', 2024, 'Coupe', 500, 800000, 'available')
ON CONFLICT (vin) DO NOTHING;
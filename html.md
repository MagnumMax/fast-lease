<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal ERP - Интерактивный прототип</title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Lucide Icons CDN -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <!-- SortableJS for Drag-and-Drop Kanban -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>

    <style>
        /* Custom styles to match shadcn look and feel */
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 222.2 47.4% 11.2%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 222.2 84% 4.9%;
            --radius: 0.5rem;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
        }

        .page-content { display: none; }
        .page-content.active { display: block; }
        
        .nav-link.active {
            background-color: hsl(var(--accent));
            color: hsl(var(--accent-foreground));
        }
        
        /* Custom scrollbar for a cleaner look */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: hsl(var(--background)); }
        ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
        
        .kanban-card {
            cursor: grab;
        }
        .kanban-card:active {
            cursor: grabbing;
        }
        .sortable-ghost {
            opacity: 0.4;
            background: hsl(var(--accent));
        }
    </style>
</head>
<body class="bg-gray-50 text-gray-900">

    <div class="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <!-- SIDEBAR -->
        <div id="sidebar" class="hidden border-r bg-gray-100/40 lg:block">
            <div class="flex h-full max-h-screen flex-col gap-2">
                <div class="flex h-[60px] items-center justify-between border-b px-6">
                    <a href="#" class="flex items-center gap-2 font-semibold">
                        <svg id="logo-icon" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        <span id="logo-text">Portal ERP</span>
                    </a>
                    <!-- Кнопка закрытия мобильного меню -->
                    <button id="mobile-menu-close" class="lg:hidden rounded-md border w-8 h-8 flex items-center justify-center hover:bg-gray-100" aria-label="Закрыть меню">
                        <i data-lucide="x" class="h-4 w-4"></i>
                    </button>
                </div>
                <div id="sidebar-nav" class="flex-1 overflow-auto py-2">
                    <!-- Navigation links will be injected here by JS -->
                </div>
            </div>
        </div>

        <!-- Mobile menu overlay -->
        <div id="mobile-menu-overlay" class="hidden lg:hidden fixed inset-0 bg-black/50 z-30"></div>

        <!-- MAIN CONTENT -->
        <div class="flex flex-col">
            <header class="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6">
                <button id="mobile-menu-btn" class="lg:hidden rounded-md border w-8 h-8 flex items-center justify-center" aria-label="Открыть меню">
                    <i data-lucide="menu" class="h-4 w-4"></i>
                </button>
                <span class="lg:hidden text-lg font-semibold" id="mobile-header-title">Dashboard</span>
                <div class="w-full flex-1">
                    <!-- Can be used for search bar if needed -->
                </div>
                <div class="flex items-center gap-4">
                    <!-- Role Dropdown -->
                    <div class="relative">
                        <button id="role-dropdown-btn" class="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <span id="current-role-text">Клиент</span>
                            <i data-lucide="chevron-down" class="h-4 w-4"></i>
                        </button>
                        <div id="role-dropdown-menu" class="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 hidden">
                            <div class="py-1">
                                <button data-role="client" class="role-dropdown-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                    <i data-lucide="user" class="h-4 w-4"></i>
                                    Клиент
                                </button>
                                <button data-role="investor" class="role-dropdown-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                    <i data-lucide="trending-up" class="h-4 w-4"></i>
                                    Инвестор
                                </button>
                                <button data-role="manager" class="role-dropdown-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                    <i data-lucide="briefcase" class="h-4 w-4"></i>
                                    Менеджер
                                </button>
                                <button data-role="admin" class="role-dropdown-item w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                    <i data-lucide="shield" class="h-4 w-4"></i>
                                    Администратор
                                </button>
                            </div>
                        </div>
                    </div>
                    <button class="rounded-full border w-8 h-8">
                        <img src="https://i.pravatar.cc/32" class="rounded-full" alt="Avatar">
                    </button>
                </div>
            </header>

            <main id="main-content" class="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <!-- Page content will be injected here by JS -->
            </main>
        </div>
    </div>
    
<script>
    // --- MOCK DATA ---
    const mockData = {
        cars: [
            { id: 1, name: 'Mercedes-Benz S-Class', year: 2023, mileage: 15000, price: '3,500 AED/mo', image: 'https://images.unsplash.com/photo-1617093219159-4a26d15a7b21?q=80&w=640&auto=format&fit=crop' },
            { id: 2, name: 'BMW X7', year: 2023, mileage: 22000, price: '4,200 AED/mo', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=640&auto=format&fit=crop' },
            { id: 3, name: 'Audi Q8', year: 2022, mileage: 35000, price: '3,800 AED/mo', image: 'https://images.unsplash.com/photo-1612883584883-e23b4f65d1d2?q=80&w=640&auto=format&fit=crop' },
            { id: 4, name: 'Toyota Land Cruiser', year: 2024, mileage: 5000, price: '3,900 AED/mo', image: 'https://images.unsplash.com/photo-1623759502288-004a8b79e398?q=80&w=640&auto=format&fit=crop' },
            { id: 5, name: 'Porsche Cayenne', year: 2023, mileage: 18000, price: '5,500 AED/mo', image: 'https://images.unsplash.com/photo-1603386329095-f75a64344487?q=80&w=640&auto=format&fit=crop' },
            { id: 6, name: 'Range Rover Vogue', year: 2023, mileage: 12000, price: '6,200 AED/mo', image: 'https://images.unsplash.com/photo-1628102603399-768f50c371f4?q=80&w=640&auto=format&fit=crop' },
        ],
        deals: [
            { id: 'DXB-001', car: 'Mercedes-Benz S-Class', status: 'Активна', date: '2023-11-01', statusColor: 'bg-green-100 text-green-800' },
            { id: 'DXB-002', car: 'Audi Q8', status: 'На рассмотрении', date: '2024-03-15', statusColor: 'bg-yellow-100 text-yellow-800' },
            { id: 'DXB-003', car: 'BMW X7', status: 'Архив', date: '2021-05-20', statusColor: 'bg-gray-100 text-gray-800' },
        ],
        investorPortfolio: [
            { id: 'VIN123', car: 'Mercedes-Benz S-Class', status: 'В лизинге', cost: 350000, income: 42000 },
            { id: 'VIN456', car: 'BMW X7', status: 'Свободен', cost: 420000, income: 0 },
            { id: 'VIN789', car: 'Audi Q8', status: 'В лизинге', cost: 380000, income: 22800 },
            { id: 'VIN101', car: 'Toyota Land Cruiser', status: 'На обслуживании', cost: 290000, income: 78000 },
            { id: 'VIN112', car: 'Porsche Cayenne', status: 'В лизинге', cost: 550000, income: 132000 },
        ],
        kanbanTasks: {
            new: [
                { id: 1, client: 'Ahmed Al Maktoum', car: 'Range Rover Vogue' },
                { id: 2, client: 'Fatima Al Fahim', car: 'Porsche Cayenne' },
            ],
            scoring: [
                { id: 3, client: 'John Smith', car: 'Toyota Land Cruiser' },
            ],
            approval: [
                { id: 4, client: 'Anastasia Volkova', car: 'Audi Q8' },
            ],
            signing: [],
            active: [
                { id: 5, client: 'Omar bin Zayed', car: 'Mercedes-Benz S-Class' },
            ]
        },
        registryClients: [
            { id: 'C001', name: 'Ahmed Al Maktoum', email: 'ahmed.m@email.com', phone: '+971 50 123 4567', status: 'Активный клиент' },
            { id: 'C002', name: 'John Smith', email: 'j.smith@email.com', phone: '+971 55 987 6543', status: 'Скоринг' },
            { id: 'C003', name: 'Fatima Al Fahim', email: 'fatima.f@email.com', phone: '+971 52 111 2233', status: 'Новый лид' },
            { id: 'C004', name: 'Anastasia Volkova', email: 'a.volkova@email.com', phone: '+971 56 444 5566', status: 'Одобрение' },
            { id: 'C005', name: 'Omar bin Zayed', email: 'omar.z@email.com', phone: '+971 50 777 8899', status: 'Активный клиент' },
        ],
        users: [
            { id: 1, name: 'Ivan Ivanov', email: 'ivanov@portal.erp', role: 'Операционный менеджер' },
            { id: 2, name: 'Elena Petrova', email: 'petrova@portal.erp', role: 'Администратор' },
            { id: 3, name: 'Sergey Smirnov', email: 'smirnov@portal.erp', role: 'Руководство' },
        ],
        invoices: [
            { id: 'INV-001', dealId: 'DXB-001', amount: 3500, date: '2024-04-01', status: 'Оплачен', dueDate: '2024-04-01' },
            { id: 'INV-002', dealId: 'DXB-001', amount: 3500, date: '2024-03-01', status: 'Оплачен', dueDate: '2024-03-01' },
            { id: 'INV-003', dealId: 'DXB-002', amount: 3800, date: '2024-04-15', status: 'Ожидает', dueDate: '2024-04-15' },
        ],
        supportTickets: [
            { id: 'T-001', subject: 'Вопрос по документам', status: 'Открыт', date: '2024-03-20', priority: 'Средний' },
            { id: 'T-002', subject: 'Статус заявки', status: 'Закрыт', date: '2024-03-18', priority: 'Высокий' },
        ],
        tasks: [
            { id: 1, title: 'Проверить документы клиента', client: 'Ahmed Al Maktoum', priority: 'Высокий', status: 'В процессе', dueDate: '2024-03-28' },
            { id: 2, title: 'Одобрить заявку', client: 'Fatima Al Fahim', priority: 'Средний', status: 'Новая', dueDate: '2024-03-29' },
            { id: 3, title: 'Подготовить договор', client: 'John Smith', priority: 'Высокий', status: 'Новая', dueDate: '2024-03-27' },
        ],
        applications: [
            { id: 'APP-001', client: 'Ahmed Al Maktoum', car: 'Range Rover Vogue', status: 'Черновик', createdAt: '2024-03-25' },
            { id: 'APP-002', client: 'Fatima Al Fahim', car: 'Porsche Cayenne', status: 'Отправлена', createdAt: '2024-03-24' },
        ]
    };

    // --- NAVIGATION STRUCTURE ---
    const navConfig = {
        client: [
            { id: 'client-dashboard', icon: 'home', text: 'Главная' },
            { id: 'catalog', icon: 'car', text: 'Каталог автомобилей' },
            { id: 'new-application', icon: 'file-plus', text: 'Заявка' },
            { id: 'deal-details', icon: 'file-text', text: 'Детали сделки' },
            { id: 'my-invoices', icon: 'credit-card', text: 'Инвойсы' },
            { id: 'client-support', icon: 'life-buoy', text: 'Поддержка' },
            { id: 'client-profile', icon: 'user', text: 'Профиль' },
        ],
        investor: [
            { id: 'investor-dashboard', icon: 'bar-chart-2', text: 'Дашборд' },
            { id: 'investor-portfolio', icon: 'briefcase', text: 'Мой портфель' },
            { id: 'investor-reports', icon: 'download', text: 'Финансовые отчеты' },
            { id: 'investor-profile', icon: 'user', text: 'Профиль' },
        ],
        manager: [
            { id: 'ops-dashboard', icon: 'layout-dashboard', text: 'Дашборд' },
            { id: 'ops-kanban', icon: 'trello', text: 'Сделки (Канбан)' },
            { id: 'ops-tasks', icon: 'check-square', text: 'Таск-менеджер' },
            { text: 'Справочники', isHeading: true },
            { id: 'ops-registry-clients', icon: 'users', text: 'Клиенты' },
            { id: 'ops-registry-fleet', icon: 'car', text: 'Автопарк' },
            { id: 'ops-registry-investors', icon: 'briefcase', text: 'Инвесторы' },
        ],
        admin: [
            { id: 'admin-bpm', icon: 'git-merge', text: 'Управление процессами' },
            { id: 'admin-users', icon: 'users', text: 'Управление пользователями' },
            { id: 'admin-integrations', icon: 'plug', text: 'Интеграции' },
            { id: 'admin-settings', icon: 'settings', text: 'Настройки' },
        ]
    };

    // --- PAGE TEMPLATES ---
    const pageTemplates = {
        // --- Client Pages ---
        'client-dashboard': `
            <h1 class="text-2xl font-bold mb-6">Добро пожаловать, Клиент!</h1>
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div class="lg:col-span-2 rounded-xl border bg-white text-gray-900 shadow p-6">
                    <h3 class="font-semibold mb-4">Статус текущей заявки</h3>

                    <!-- Быстрый возврат к заявке -->
                    <div class="mb-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                        <button data-page="new-application" class="text-sm text-yellow-800 hover:underline">Продолжить оформление →</button>
                    </div>

                    <div class="relative pl-6">
                        <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                        <!-- Этап 1: Заявка подана -->
                        <div class="relative mb-8">
                            <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-600 ring-4 ring-white flex items-center justify-center">
                                <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="font-semibold text-green-600">✓ Заявка подана</p>
                                <p class="text-sm text-gray-500">15 Марта, 2024</p>
                            </div>
                        </div>

                        <!-- Этап 2: На рассмотрении -->
                        <div class="relative mb-8">
                            <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white flex items-center justify-center">
                                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            </div>
                            <div>
                                <button data-page="client-profile" class="font-semibold text-blue-600 hover:underline">🔄 На рассмотрении</button>
                                <p class="text-sm text-gray-500">Документы проверяются</p>
                                <div class="mt-2 p-2 bg-blue-50 rounded-md border-l-4 border-blue-400">
                                    <p class="text-xs text-blue-700">⏱️ Ожидаемое время обработки: 1-2 рабочих дня</p>
                                </div>
                            </div>
                        </div>

                        <!-- Этап 3: Одобрение -->
                        <div class="relative mb-8">
                            <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-300 ring-4 ring-white"></div>
                            <div>
                                <button data-page="deal-details" class="font-semibold text-gray-600 hover:underline">⏳ Одобрение</button>
                                <p class="text-sm text-gray-400">Ожидает решения</p>
                            </div>
                        </div>

                        <!-- Этап 4: Подписание договора -->
                        <div class="relative">
                            <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-200 ring-4 ring-white"></div>
                            <div>
                                <button data-page="deal-details" class="font-semibold text-gray-600 hover:underline">📄 Подписание договора</button>
                                <p class="text-sm text-gray-400">Ожидает одобрения</p>
                            </div>
                        </div>
                    </div>

                    <!-- Прогресс-бар -->
                    <div class="mt-6 pt-6 border-t">
                        <div class="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Прогресс</span>
                            <span>2 из 4 этапов</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: 50%"></div>
                        </div>
                    </div>
                </div>

                <div class="rounded-xl border bg-white text-gray-900 shadow p-6">
                     <h3 class="font-semibold mb-4">Предстоящий платеж</h3>
                     <p class="text-3xl font-bold text-green-600">3,500 AED</p>
                     <p class="text-sm text-gray-500 mb-1">по сделке DXB-001 до 01 Апреля, 2024</p>
                     <p class="text-xs text-gray-400 mb-4">Visa/Mastercard • Без комиссии</p>
                     <button id="client-pay-now" class="w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700 transition-colors">💳 Оплатить</button>

                     <div class="mt-6 pt-6 border-t">
                         <h3 class="font-semibold mb-4">🔔 Уведомления</h3>
                         <ul class="space-y-3 text-sm">
                            <li class="p-3 rounded-md bg-green-50 border-l-4 border-green-400">
                                <p class="text-green-700">✓ Ваша заявка на Audi Q8 принята в обработку</p>
                                <p class="text-xs text-green-600 mt-1">2 часа назад</p>
                            </li>
                            <li class="p-3 rounded-md bg-blue-50 border-l-4 border-blue-400">
                                <p class="text-blue-700">📋 Документы проходят автоматическую проверку</p>
                                <p class="text-xs text-blue-600 mt-1">15 мин назад</p>
                            </li>
                            <li class="p-3 rounded-md bg-gray-50">
                                <p class="text-gray-600">💳 Платеж по сделке DXB-001 успешно получен</p>
                                <p class="text-xs text-gray-500 mt-1">2 дня назад</p>
                            </li>
                         </ul>
                     </div>
                </div>
            </div>

            <!-- Рекомендованные авто -->
            <div class="mt-8">
                <h3 class="font-semibold mb-4">Рекомендовано для вас</h3>
                <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    ${mockData.cars.slice(0,3).map(car => `
                        <a href="#" data-page="car-details" data-car-id="${car.id}" class="block rounded-xl border bg-white text-gray-900 shadow hover:shadow-lg transition hover:scale-105">
                            <img src="${car.image}" alt="${car.name}" class="rounded-t-xl aspect-[4/3] object-cover w-full">
                            <div class="p-4">
                                <h4 class="font-medium">${car.name}</h4>
                                <p class="text-sm text-gray-500">${car.year} • ${car.mileage.toLocaleString()} км</p>
                                <p class="font-bold text-green-600 mt-2">${car.price}</p>
                                <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">Взнос от 20%</div>
                                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700">Срок до 36 мес</div>
                                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">APR от 5.9%</div>
                                    <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700">Страховка включена</div>
                                </div>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `,
        'catalog': `
            <h1 class="text-2xl font-bold mb-6">Каталог автомобилей</h1>

            <!-- Фильтры -->
            <div class="rounded-xl border bg-white p-6 shadow mb-6">
                <div class="grid gap-4 md:grid-cols-3">
                    <div>
                        <label class="block text-sm font-medium mb-2">Марка автомобиля</label>
                        <select id="brand-filter" class="w-full p-2 border rounded-md">
                            <option value="">Все марки</option>
                            <option value="mercedes">Mercedes-Benz</option>
                            <option value="bmw">BMW</option>
                            <option value="audi">Audi</option>
                            <option value="toyota">Toyota</option>
                            <option value="porsche">Porsche</option>
                            <option value="rangerover">Range Rover</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Ценовой диапазон</label>
                        <div class="flex items-center space-x-2">
                            <input type="number" id="price-min" placeholder="от 2,000" class="w-full p-2 border rounded-md">
                            <span>-</span>
                            <input type="number" id="price-max" placeholder="до 8,000" class="w-full p-2 border rounded-md">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Год выпуска</label>
                        <select id="year-filter" class="w-full p-2 border rounded-md">
                            <option value="">Любой год</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-4">
                    <button id="apply-filters" class="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">Применить фильтры</button>
                    <button id="reset-filters" class="text-gray-600 hover:text-gray-800 text-sm underline">Сбросить</button>
                </div>
            </div>

            <!-- Результаты поиска -->
            <div class="flex justify-between items-center mb-4">
                <p id="results-count" class="text-gray-600">Найдено автомобилей: ${mockData.cars.length}</p>
                <div class="flex items-center space-x-2">
                    <label class="text-sm">Сортировка:</label>
                    <select id="sort-select" class="p-2 border rounded-md text-sm">
                        <option value="price-asc">Цена: по возрастанию</option>
                        <option value="price-desc">Цена: по убыванию</option>
                        <option value="year-desc">Сначала новые</option>
                        <option value="year-asc">Сначала старые</option>
                    </select>
                </div>
            </div>

            <!-- Сетка автомобилей -->
            <div id="cars-grid" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                ${mockData.cars.map(car => `
                    <a href="#" data-page="car-details" data-car-id="${car.id}" class="car-card block rounded-xl border bg-white text-gray-900 shadow hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105">
                        <img src="${car.image}" alt="${car.name}" class="rounded-t-xl aspect-[4/3] object-cover w-full">
                        <div class="p-4">
                            <h3 class="font-semibold">${car.name}</h3>
                            <p class="text-sm text-gray-500">${car.year} - ${car.mileage.toLocaleString()} км</p>
                            <p class="font-bold my-2 text-green-600">${car.price}</p>
                            <div class="flex items-center text-xs text-gray-500">
                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">Лизинг</span>
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full">Доступен</span>
                            </div>
                        </div>
                    </a>
                `).join('')}
            </div>
        `,
        'my-deals': `
             <h1 class="text-2xl font-bold mb-6">Мои Сделки</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Автомобиль</th><th class="px-6 py-3">Статус</th><th class="px-6 py-3">Дата</th><th class="px-6 py-3">Действия</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.deals.map(deal => `
                            <tr class="bg-white border-b hover:bg-gray-50">
                                <td class="px-6 py-4 font-medium">${deal.id}</td>
                                <td class="px-6 py-4">${deal.car}</td>
                                <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${deal.statusColor}">${deal.status}</span></td>
                                <td class="px-6 py-4">${deal.date}</td>
                                <td class="px-6 py-4">
                                    <button data-page="deal-details" data-deal-id="${deal.id}" class="text-blue-600 hover:underline text-sm">Детали</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
             </div>
        `,
        // --- Investor Pages ---
        'investor-dashboard': `
            <h1 class="text-2xl font-bold mb-6">Дашборд Инвестора</h1>
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Общий ROI</h3><p class="text-3xl font-bold">14.2%</p></div>
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Сумма инвестиций</h3><p class="text-3xl font-bold">1,990,000 AED</p></div>
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Утилизация активов</h3><p class="text-3xl font-bold">80%</p></div>
            </div>
            <div class="grid gap-6 mt-6 md:grid-cols-5">
                <div class="md:col-span-3 rounded-xl border bg-white p-6 shadow"><h3 class="font-semibold mb-4">Динамика доходности</h3><canvas id="investorChart"></canvas></div>
                <div class="md:col-span-2 rounded-xl border bg-white p-6 shadow"><h3 class="font-semibold mb-4">Статус портфеля</h3>
                    <ul class="space-y-3">
                        <li class="flex justify-between"><span>В лизинге</span><span class="font-medium">4 авто</span></li>
                        <li class="flex justify-between"><span>Свободно</span><span class="font-medium">1 авто</span></li>
                        <li class="flex justify-between"><span>На обслуживании</span><span class="font-medium">0 авто</span></li>
                    </ul>
                </div>
            </div>
        `,
        'investor-portfolio': `
             <h1 class="text-2xl font-bold mb-6">Мой портфель</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">VIN</th><th class="px-6 py-3">Автомобиль</th><th class="px-6 py-3">Статус</th><th class="px-6 py-3">Закуп. стоимость</th><th class="px-6 py-3">Накопленный доход</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.investorPortfolio.map(asset => `
                            <tr class="bg-white border-b"><td class="px-6 py-4 font-medium">${asset.id}</td><td class="px-6 py-4">${asset.car}</td><td class="px-6 py-4">${asset.status}</td><td class="px-6 py-4">${asset.cost.toLocaleString()} AED</td><td class="px-6 py-4">${asset.income.toLocaleString()} AED</td></tr>
                        `).join('')}
                    </tbody>
                </table>
             </div>
        `,
        'investor-reports': `
             <h1 class="text-2xl font-bold mb-6">Финансовые отчеты</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow p-6 max-w-md mx-auto">
                 <h3 class="font-semibold mb-4">Сформировать отчет</h3>
                 <div class="space-y-4">
                    <div><label class="text-sm font-medium">Начало периода</label><input type="date" class="w-full mt-1 p-2 border rounded-md"></div>
                    <div><label class="text-sm font-medium">Конец периода</label><input type="date" class="w-full mt-1 p-2 border rounded-md"></div>
                    <button class="w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700">Сформировать и скачать (PDF)</button>
                 </div>
            </div>
        `,
        'investor-profile': `
             <h1 class="text-2xl font-bold mb-6">Профиль Инвестора</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow p-6 max-w-2xl mx-auto">
                 <h3 class="font-semibold mb-4">Контактные данные</h3>
                 <p><strong>Имя:</strong> Investor Name</p>
                 <p><strong>Email:</strong> investor@example.com</p>
             </div>
        `,
        // --- Manager Pages ---
        'ops-dashboard': `
            <h1 class="text-2xl font-bold mb-6">Дашборд Менеджера</h1>
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Новые заявки сегодня</h3><p class="text-3xl font-bold">2</p></div>
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Сделок в работе</h3><p class="text-3xl font-bold">3</p></div>
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Просрочено задач</h3><p class="text-3xl font-bold text-red-600">0</p></div>
                <div class="rounded-xl border bg-white p-6 shadow"><h3 class="text-sm font-medium text-gray-500">Среднее время сделки</h3><p class="text-3xl font-bold">2.5 дня</p></div>
            </div>
            <div class="rounded-xl border bg-white p-6 shadow mt-6">
                <h3 class="font-semibold mb-4">Воронка сделок</h3>
                <canvas id="managerChart"></canvas>
            </div>
        `,
        'ops-kanban': `
            <h1 class="text-2xl font-bold mb-6">Сделки (Канбан)</h1>
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                ${['Новые', 'Скоринг', 'Одобрение', 'Подписание', 'Активна'].map(stage => {
                    const key = stage === 'Новые' ? 'new' : stage.toLowerCase();
                    return `
                    <div class="bg-gray-100 rounded-lg p-4">
                        <h3 class="font-semibold mb-4 text-center">${stage} (${mockData.kanbanTasks[key]?.length || 0})</h3>
                        <div id="kanban-${key}" class="space-y-4 min-h-[200px]">
                            ${(mockData.kanbanTasks[key] || []).map(task => `
                                <div class="kanban-card bg-white p-4 rounded-lg shadow border">
                                    <p class="font-semibold">${task.client}</p>
                                    <p class="text-sm text-gray-500">${task.car}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `}).join('')}
            </div>
        `,
        'ops-registry-clients': `
            <h1 class="text-2xl font-bold mb-6">Справочник: Клиенты</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Имя</th><th class="px-6 py-3">Email</th><th class="px-6 py-3">Телефон</th><th class="px-6 py-3">Статус</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.registryClients.map(client => `
                            <tr class="bg-white border-b"><td class="px-6 py-4 font-medium">${client.id}</td><td class="px-6 py-4">${client.name}</td><td class="px-6 py-4">${client.email}</td><td class="px-6 py-4">${client.phone}</td><td class="px-6 py-4">${client.status}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
             </div>
        `,
        'ops-registry-fleet': `
            <h1 class="text-2xl font-bold mb-6">Справочник: Автопарк</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Автомобиль</th><th class="px-6 py-3">Год</th><th class="px-6 py-3">Пробег</th><th class="px-6 py-3">Статус</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.cars.map(car => `
                            <tr class="bg-white border-b"><td class="px-6 py-4 font-medium">VIN${car.id}</td><td class="px-6 py-4">${car.name}</td><td class="px-6 py-4">${car.year}</td><td class="px-6 py-4">${car.mileage.toLocaleString()} км</td><td class="px-6 py-4">${car.id % 2 === 0 ? 'В лизинге' : 'Свободен'}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
             </div>
        `,
        'ops-registry-investors': `
            <h1 class="text-2xl font-bold mb-6">Справочник: Инвесторы</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                     <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Имя/Название</th><th class="px-6 py-3">Email</th><th class="px-6 py-3">Объем инвестиций</th></tr>
                    </thead>
                    <tbody>
                       <tr class="bg-white border-b"><td class="px-6 py-4 font-medium">INV001</td><td class="px-6 py-4">Dubai Investment Fund</td><td class="px-6 py-4">contact@dif.ae</td><td class="px-6 py-4">10,000,000 AED</td></tr>
                       <tr class="bg-white border-b"><td class="px-6 py-4 font-medium">INV002</td><td class="px-6 py-4">Private Investor A</td><td class="px-6 py-4">investor.a@private.com</td><td class="px-6 py-4">2,500,000 AED</td></tr>
                    </tbody>
                </table>
             </div>
        `,
        // --- Admin Pages ---
        'admin-bpm': `
            <h1 class="text-2xl font-bold mb-6">Управление процессами (BPMN)</h1>
            <div class="rounded-xl border bg-white text-gray-900 shadow p-6">
                <h3 class="font-semibold mb-4">Бизнес-процесс "Лизинговая сделка"</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="font-mono text-sm">
                        StartEvent -> Task (Получение лида из Kommo) -> Task (Скоринг клиента) -> ExclusiveGateway (Одобрено?) -> Task (Подписание договора) -> Task (Выдача авто) -> EndEvent
                    </p>
                </div>
                 <button class="mt-4 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700">Редактировать в Camunda</button>
            </div>
        `,
         'admin-users': `
            <h1 class="text-2xl font-bold mb-6">Управление пользователями</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Имя</th><th class="px-6 py-3">Email</th><th class="px-6 py-3">Роль</th><th class="px-6 py-3">Действия</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.users.map(user => `
                            <tr class="bg-white border-b"><td class="px-6 py-4 font-medium">${user.id}</td><td class="px-6 py-4">${user.name}</td><td class="px-6 py-4">${user.email}</td><td class="px-6 py-4">${user.role}</td><td class="px-6 py-4"><button class="text-blue-600 hover:underline">Редактировать</button></td></tr>
                        `).join('')}
                    </tbody>
                </table>
             </div>
        `,
        'admin-integrations': `
            <h1 class="text-2xl font-bold mb-6">Статус интеграций</h1>
            <div class="grid gap-6 md:grid-cols-3">
                <div class="rounded-xl border bg-white p-6 shadow flex items-center justify-between"><h3 class="font-semibold">Odoo ERP</h3><span class="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Online</span></div>
                <div class="rounded-xl border bg-white p-6 shadow flex items-center justify-between"><h3 class="font-semibold">Kommo CRM</h3><span class="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Online</span></div>
                <div class="rounded-xl border bg-white p-6 shadow flex items-center justify-between"><h3 class="font-semibold">Stripe Gateway</h3><span class="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Offline</span></div>
            </div>
        `,
        'admin-settings': `
             <h1 class="text-2xl font-bold mb-6">Настройки системы</h1>
             <div class="rounded-xl border bg-white text-gray-900 shadow p-6 max-w-2xl">
                 <h3 class="font-semibold text-lg border-b pb-2 mb-4">Общие</h3>
                 <div class="space-y-4">
                    <div><label class="text-sm font-medium">Название портала</label><input type="text" value="Portal ERP" class="w-full mt-1 p-2 border rounded-md"></div>
                    <div><label class="text-sm font-medium">Основной email для уведомлений</label><input type="email" value="notify@portal.erp" class="w-full mt-1 p-2 border rounded-md"></div>
                 </div>
                 <h3 class="font-semibold text-lg border-b pb-2 mt-8 mb-4">Безопасность</h3>
                 <div class="flex items-center justify-between">
                    <label class="text-sm font-medium">Включить двухфакторную аутентификацию (2FA)</label>
                    <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200"><span class="inline-block h-4 w-4 transform rounded-full bg-white transition"></span></button>
                 </div>
            </div>
        `,
        // --- Dummy pages for placeholders ---
        'client-profile': `
            <h1 class="text-2xl font-bold mb-6">Профиль клиента</h1>
            <div class="grid gap-6 lg:grid-cols-3">
                <!-- Личные данные -->
                <div class="lg:col-span-2 rounded-xl border bg-white text-gray-900 shadow p-6">
                    <h3 class="font-semibold mb-4">Личные данные</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="block text-sm font-medium mb-2">Полное имя</label>
                            <input id="cp-name" type="text" class="w-full p-3 border rounded-md" placeholder="Ваше полное имя">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Email</label>
                            <input id="cp-email" type="email" class="w-full p-3 border rounded-md" placeholder="your.email@example.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Телефон</label>
                            <input id="cp-phone" type="tel" class="w-full p-3 border rounded-md" placeholder="+971 XX XXX XXXX">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Гражданство</label>
                            <input id="cp-nationality" type="text" class="w-full p-3 border rounded-md" placeholder="UAE / Russia / ...">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium mb-2">Адрес</label>
                            <input id="cp-address" type="text" class="w-full p-3 border rounded-md" placeholder="Город, улица, дом, квартира">
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button id="cp-save" class="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Сохранить</button>
                    </div>
                </div>

                <!-- Безопасность -->
                <div class="rounded-xl border bg-white text-gray-900 shadow p-6">
                    <h3 class="font-semibold mb-4">Безопасность</h3>
                    <div class="flex items-center justify-between py-2">
                        <span class="text-sm">Двухфакторная аутентификация (2FA)</span>
                        <button id="cp-2fa" class="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition">
                            <span id="cp-2fa-thumb" class="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1"></span>
                        </button>
                    </div>
                    <div class="mt-4 space-y-3">
                        <label class="text-sm font-medium">Смена пароля</label>
                        <input id="cp-pass1" type="password" class="w-full p-3 border rounded-md" placeholder="Новый пароль (мин. 8 символов)">
                        <input id="cp-pass2" type="password" class="w-full p-3 border rounded-md" placeholder="Повторите пароль">
                        <button id="cp-change-pass" class="w-full bg-gray-100 text-gray-800 py-2 rounded-md hover:bg-gray-200">Обновить пароль</button>
                        <div id="cp-pass-msg" class="text-xs mt-1 hidden"></div>
                    </div>
                </div>

                <!-- Настройки -->
                <div class="lg:col-span-2 rounded-xl border bg-white text-gray-900 shadow p-6">
                    <h3 class="font-semibold mb-4">Настройки</h3>
                    <div class="grid gap-4 md:grid-cols-3">
                        <div>
                            <label class="block text-sm font-medium mb-2">Язык интерфейса</label>
                            <select id="cp-language" class="w-full p-2 border rounded-md">
                                <option value="ru">Русский</option>
                                <option value="en">English</option>
                                <option value="ar">العربية</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Часовой пояс</label>
                            <select id="cp-timezone" class="w-full p-2 border rounded-md">
                                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                                <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-2 pt-6">
                            <input id="cp-news" type="checkbox" class="rounded border-gray-300 text-blue-600">
                            <label for="cp-news" class="text-sm">Получать новости и предложения</label>
                        </div>
                    </div>
                </div>

                <!-- Аватар -->
                <div class="rounded-xl border bg-white text-gray-900 shadow p-6">
                    <h3 class="font-semibold mb-4">Аватар</h3>
                    <div class="flex items-center gap-4">
                        <img id="cp-avatar-preview" src="https://i.pravatar.cc/96" class="w-16 h-16 rounded-full object-cover border" alt="Avatar">
                        <div>
                            <input id="cp-avatar" type="file" accept="image/*" class="text-sm">
                            <p class="text-xs text-gray-500 mt-1">PNG/JPG, до 1MB</p>
                        </div>
                    </div>
                </div>

                <!-- Документы -->
                <div class="lg:col-span-2 rounded-xl border bg-white text-gray-900 shadow p-6">
                    <h3 class="font-semibold mb-4">Документы</h3>
                    <div class="flex items-center gap-4">
                        <input id="cp-docs-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" class="text-sm">
                        <select id="cp-docs-category" class="text-sm border rounded px-2 py-1">
                            <option value="emirates_id">Эмиратская ID (Emirates ID)</option>
                            <option value="passport">Паспорт</option>
                            <option value="residency_visa">Резидентская виза</option>
                            <option value="drivers_license">Водительское удостоверение</option>
                            <option value="salary_certificate">Справка о зарплате</option>
                            <option value="bank_statement">Банковская выписка (3 мес)</option>
                            <option value="address_proof">Подтверждение адреса (DEWA/Etisalat)</option>
                            <option value="insurance">Страховка</option>
                            <option value="noc">NOC от работодателя</option>
                            <option value="trade_license">Trade License (для компании)</option>
                            <option value="other" selected>Другое</option>
                        </select>
                        <p class="text-xs text-gray-500">PDF/JPG/PNG, до 2MB на файл</p>
                    </div>
                    <ul id="cp-docs-list" class="mt-4 divide-y"></ul>
                    <div class="mt-4">
                        <h4 class="font-medium mb-2 text-sm">Рекомендуемые документы для лизинга</h4>
                        <ul id="cp-docs-recommended" class="text-sm space-y-1"></ul>
                    </div>
                </div>
            </div>
        `,
        'admin-ai-settings': `<h1 class="text-2xl font-bold mb-6">Страница в разработке: Настройки AI</h1>`,
        'admin-templates': `<h1 class="text-2xl font-bold mb-6">Страница в разработке: Шаблоны</h1>`,
        'admin-logs': `<h1 class="text-2xl font-bold mb-6">Страница в разработке: Логирование</h1>`,
        'car-details': `
            <h1 class="text-2xl font-bold mb-6">Mercedes-Benz S-Class 2023</h1>
            <div class="grid gap-6 lg:grid-cols-2">
                <div class="space-y-6">
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Галерея изображений</h3>
                        <div class="aspect-[4/3] bg-gray-200 rounded-lg flex items-center justify-center">
                            <img src="${mockData.cars[0].image}" alt="Mercedes-Benz S-Class" class="w-full h-full object-cover rounded-lg">
                        </div>
                    </div>
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Характеристики автомобиля</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between"><span>Год выпуска:</span><span class="font-medium">2023</span></div>
                            <div class="flex justify-between"><span>Пробег:</span><span class="font-medium">15,000 км</span></div>
                            <div class="flex justify-between"><span>Двигатель:</span><span class="font-medium">3.0L V6 Turbo</span></div>
                            <div class="flex justify-between"><span>Трансмиссия:</span><span class="font-medium">Автомат</span></div>
                            <div class="flex justify-between"><span>Привод:</span><span class="font-medium">Полный</span></div>
                        </div>
                    </div>
                </div>
                <div class="space-y-6">
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Лизинговый калькулятор</h3>
                        <div class="space-y-4">
                            <div class="flex justify-between text-lg"><span>Ежемесячный платеж:</span><span class="font-bold text-green-600">3,500 AED</span></div>
                            <div class="flex justify-between"><span>Срок лизинга:</span><span class="font-medium">36 месяцев</span></div>
                            <div class="flex justify-between"><span>Сумма выкупа:</span><span class="font-medium">150,000 AED</span></div>
                            <div class="flex justify-between"><span>Первоначальный взнос:</span><span class="font-medium">50,000 AED</span></div>
                        </div>
                        <button class="w-full mt-6 bg-gray-800 text-white py-3 rounded-md hover:bg-gray-700">Оформить лизинг</button>
                    </div>
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Документы автомобиля</h3>
                        <div class="space-y-2">
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span class="text-sm">Свидетельство о регистрации</span>
                                <button class="text-blue-600 text-sm hover:underline">Скачать</button>
                            </div>
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span class="text-sm">Страховой полис</span>
                                <button class="text-blue-600 text-sm hover:underline">Скачать</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        'new-application': `
            <h1 class="text-2xl font-bold mb-6">Подача заявки на лизинг</h1>
            <div class="max-w-4xl mx-auto">
                <div class="rounded-xl border bg-white p-6 shadow">
                    <div class="flex items-center mb-6">
                        <div class="flex items-center space-x-4">
                            <div class="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold">1</div>
                            <span class="font-medium">Личные данные</span>
                        </div>
                        <div class="flex-1 mx-4 h-px bg-gray-200"></div>
                        <div class="flex items-center space-x-4 text-gray-400">
                            <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm">2</div>
                            <span>Документы</span>
                        </div>
                        <div class="flex-1 mx-4 h-px bg-gray-200"></div>
                        <div class="flex items-center space-x-4 text-gray-400">
                            <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm">3</div>
                            <span>Подтверждение</span>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium mb-2">Полное имя</label>
                            <input type="text" class="w-full p-3 border rounded-md" placeholder="Введите ваше полное имя">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Email</label>
                            <input type="email" class="w-full p-3 border rounded-md" placeholder="your.email@example.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Телефон</label>
                            <input type="tel" class="w-full p-3 border rounded-md" placeholder="+971 XX XXX XXXX">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Emirates ID</label>
                            <input type="text" class="w-full p-3 border rounded-md" placeholder="784-XXXX-XXXXXXX-X">
                        </div>

                        <div class="border-t pt-6">
                            <h3 class="font-semibold mb-4">Загрузка документов</h3>
                            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <div class="space-y-4">
                                    <div class="flex items-center justify-center">
                                        <div class="text-green-600 text-2xl">✓</div>
                                        <span class="ml-2 text-green-600 font-medium">Паспорт загружен</span>
                                    </div>
                                    <div class="flex items-center justify-center">
                                        <div class="text-yellow-600 text-2xl">⏳</div>
                                        <span class="ml-2 text-yellow-600">Анализ Emirates ID...</span>
                                    </div>
                                </div>
                                <button class="mt-4 bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200">Добавить еще</button>
                            </div>
                        </div>

                        <div class="flex justify-between pt-6">
                            <button class="px-6 py-2 border rounded-md hover:bg-gray-50">Назад</button>
                            <button class="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Продолжить</button>
                        </div>
                    </div>
                </div>
            </div>
        `,
        'deal-details': `
            <h1 id="deal-title" class="text-2xl font-bold mb-6">Детали сделки</h1>
            <div class="grid gap-6 lg:grid-cols-3">
                <div class="lg:col-span-2 space-y-6">
                    <!-- Summary -->
                    <div id="deal-summary" class="rounded-xl border bg-white p-6 shadow">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm text-gray-500">ID сделки</span>
                                    <span id="deal-id" class="text-sm font-mono px-2 py-1 rounded bg-gray-100">—</span>
                                </div>
                                <div class="mt-1">
                                    <span id="deal-status" class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">—</span>
                                </div>
                            </div>
                        </div>

                        <!-- Car info integrated -->
                        <div class="mt-6 pt-4 border-t border-gray-100">
                            <h4 class="font-semibold mb-3 text-sm text-gray-700">Информация об автомобиле</h4>
                            <div class="flex items-start space-x-4">
                                <img id="deal-car-image" src="" alt="" class="w-20 h-20 object-cover rounded-lg">
                                <div class="flex-1">
                                    <h5 id="deal-car-name" class="font-medium text-sm mb-2">—</h5>
                                    <div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div><span class="text-gray-400">Год:</span> <span id="deal-car-year">—</span></div>
                                        <div><span class="text-gray-400">Пробег:</span> <span id="deal-car-mileage">—</span> км</div>
                                        <div><span class="text-gray-400">Двигатель:</span> <span id="deal-car-engine">—</span></div>
                                        <div><span class="text-gray-400">Коробка:</span> <span id="deal-car-transmission">—</span></div>
                                        <div><span class="text-gray-400">Привод:</span> <span id="deal-car-drive">—</span></div>
                                        <div><span class="text-gray-400">Цвет:</span> <span id="deal-car-color">—</span></div>
                                        <div><span class="text-gray-400">VIN:</span> <span id="deal-car-vin" class="font-mono">—</span></div>
                                        <div><span class="text-gray-400">Гос. номер:</span> <span id="deal-car-plate">—</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Application Status -->
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Статус текущей заявки</h3>

                        <!-- Быстрый возврат к заявке -->
                        <div class="mb-4 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                            <button data-page="new-application" class="text-sm text-yellow-800 hover:underline">Продолжить оформление →</button>
                        </div>

                        <div class="relative pl-6">
                            <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                            <!-- Этап 1: Заявка подана -->
                            <div class="relative mb-8">
                                <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-600 ring-4 ring-white flex items-center justify-center">
                                    <svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                    </svg>
                                </div>
                                <div>
                                    <p class="font-semibold text-green-600">✓ Заявка подана</p>
                                    <p class="text-sm text-gray-500">15 Марта, 2024</p>
                                </div>
                            </div>

                            <!-- Этап 2: На рассмотрении -->
                            <div class="relative mb-8">
                                <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white flex items-center justify-center">
                                    <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                </div>
                                <div>
                                    <button data-page="client-profile" class="font-semibold text-blue-600 hover:underline">🔄 На рассмотрении</button>
                                    <p class="text-sm text-gray-500">Документы проверяются</p>
                                    <div class="mt-2 p-2 bg-blue-50 rounded-md border-l-4 border-blue-400">
                                        <p class="text-xs text-blue-700">⏱️ Ожидаемое время обработки: 1-2 рабочих дня</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Этап 3: Одобрение -->
                            <div class="relative mb-8">
                                <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-300 ring-4 ring-white"></div>
                                <div>
                                    <button data-page="deal-details" class="font-semibold text-gray-600 hover:underline">⏳ Одобрение</button>
                                    <p class="text-sm text-gray-400">Ожидает решения</p>
                                </div>
                            </div>

                            <!-- Этап 4: Подписание договора -->
                            <div class="relative">
                                <div class="absolute -left-[34px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-200 ring-4 ring-white"></div>
                                <div>
                                    <button data-page="deal-details" class="font-semibold text-gray-600 hover:underline">📄 Подписание договора</button>
                                    <p class="text-sm text-gray-400">Ожидает одобрения</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Документы сделки</h3>
                        <div id="deal-documents-list" class="space-y-2"></div>
                    </div>
                </div>
            </div>
        `,
        'my-invoices': `
            <h1 class="text-2xl font-bold mb-6">Мои инвойсы</h1>
            <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Сделка</th><th class="px-6 py-3">Сумма</th><th class="px-6 py-3">Дата</th><th class="px-6 py-3">Статус</th><th class="px-6 py-3">Действия</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.invoices.map(invoice => `
                            <tr class="bg-white border-b">
                                <td class="px-6 py-4 font-medium">${invoice.id}</td>
                                <td class="px-6 py-4">${invoice.dealId}</td>
                                <td class="px-6 py-4">${invoice.amount.toLocaleString()} AED</td>
                                <td class="px-6 py-4">${invoice.date}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full ${invoice.status === 'Оплачен' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${invoice.status}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <button class="text-blue-600 hover:underline text-sm">Оплатить</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `,
        'client-support': `
            <h1 class="text-2xl font-bold mb-6">Поддержка</h1>
            <div class="grid gap-6 lg:grid-cols-2">
                <div class="rounded-xl border bg-white p-6 shadow">
                    <h3 class="font-semibold mb-4">Создать обращение</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Тема</label>
                            <input type="text" class="w-full p-2 border rounded-md" placeholder="Кратко опишите проблему">
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Описание</label>
                            <textarea rows="4" class="w-full p-2 border rounded-md" placeholder="Подробное описание вопроса"></textarea>
                        </div>
                        <button class="w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700">Отправить</button>
                    </div>
                </div>
                <div class="rounded-xl border bg-white p-6 shadow">
                    <h3 class="font-semibold mb-4">История обращений</h3>
                    <div class="space-y-3">
                        ${mockData.supportTickets.map(ticket => `
                            <div class="p-3 border rounded-lg">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-medium text-sm">${ticket.subject}</h4>
                                    <span class="px-2 py-1 text-xs font-medium rounded-full ${ticket.status === 'Открыт' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${ticket.status}</span>
                                </div>
                                <p class="text-xs text-gray-500">${ticket.date} • Приоритет: ${ticket.priority}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `,
        'investor-asset-details': `
            <h1 class="text-2xl font-bold mb-6">Детали актива VIN123</h1>
            <div class="grid gap-6 lg:grid-cols-2">
                <div class="space-y-6">
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Информация об автомобиле</h3>
                        <div class="flex items-center space-x-4">
                            <img src="${mockData.cars[0].image}" alt="Mercedes-Benz S-Class" class="w-20 h-20 object-cover rounded-lg">
                            <div>
                                <h4 class="font-medium">${mockData.cars[0].name}</h4>
                                <p class="text-sm text-gray-500">VIN: VIN123</p>
                            </div>
                        </div>
                    </div>
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Текущая сделка</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between"><span>Клиент:</span><span class="font-medium">Omar bin Zayed</span></div>
                            <div class="flex justify-between"><span>Статус:</span><span class="font-medium text-green-600">Активна</span></div>
                            <div class="flex justify-between"><span>Ежемесячный платеж:</span><span class="font-medium">3,500 AED</span></div>
                        </div>
                    </div>
                </div>
                <div class="space-y-6">
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">Финансовая информация</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between"><span>Стоимость приобретения:</span><span class="font-medium">350,000 AED</span></div>
                            <div class="flex justify-between"><span>Накопленный доход:</span><span class="font-medium">42,000 AED</span></div>
                            <div class="flex justify-between"><span>Текущая доходность:</span><span class="font-medium text-green-600">12%</span></div>
                        </div>
                    </div>
                    <div class="rounded-xl border bg-white p-6 shadow">
                        <h3 class="font-semibold mb-4">История обслуживания</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between"><span>ТО 15,000 км</span><span>15.03.2024</span></div>
                            <div class="flex justify-between"><span>Замена масла</span><span>20.02.2024</span></div>
                            <div class="flex justify-between"><span>Технический осмотр</span><span>15.01.2024</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        'ops-tasks': `
            <h1 class="text-2xl font-bold mb-6">Таск-менеджер</h1>
            <div class="rounded-xl border bg-white text-gray-900 shadow">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr><th class="px-6 py-3">ID</th><th class="px-6 py-3">Задача</th><th class="px-6 py-3">Клиент</th><th class="px-6 py-3">Приоритет</th><th class="px-6 py-3">Статус</th><th class="px-6 py-3">Срок</th></tr>
                    </thead>
                    <tbody>
                        ${mockData.tasks.map(task => `
                            <tr class="bg-white border-b">
                                <td class="px-6 py-4 font-medium">${task.id}</td>
                                <td class="px-6 py-4">${task.title}</td>
                                <td class="px-6 py-4">${task.client}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full ${task.priority === 'Высокий' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${task.priority}</span>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 text-xs font-medium rounded-full ${task.status === 'В процессе' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">${task.status}</span>
                                </td>
                                <td class="px-6 py-4">${task.dueDate}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `,
        'login': `
            <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div class="max-w-md w-full space-y-8 p-8">
                    <div class="text-center">
                        <div class="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                            <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                            </svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Portal ERP</h2>
                        <p class="text-gray-600 mt-2">Автоматизация лизинга автомобилей</p>
                    </div>

                    <!-- Tab Navigation -->
                    <div class="bg-white rounded-xl shadow-sm">
                        <div class="flex border-b">
                            <button id="login-tab" class="flex-1 py-3 px-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600">Вход</button>
                            <button id="register-tab" class="flex-1 py-3 px-4 text-sm font-medium text-gray-500 hover:text-gray-700">Регистрация</button>
                        </div>

                        <!-- Login Form -->
                        <div id="login-form" class="p-6 space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Email адрес</label>
                                <input type="email" id="login-email" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="your.email@example.com">
                                <div id="login-email-error" class="text-red-500 text-xs mt-1 hidden">Пожалуйста, введите корректный email</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                                <div class="relative">
                                    <input type="password" id="login-password" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10" placeholder="••••••••">
                                    <button type="button" id="toggle-login-password" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div id="login-password-error" class="text-red-500 text-xs mt-1 hidden">Пароль должен содержать минимум 8 символов</div>
                            </div>
                            <div class="flex items-center justify-between">
                                <label class="flex items-center">
                                    <input type="checkbox" id="remember-me" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-600">Запомнить меня</span>
                                </label>
                                <a href="#" class="text-sm text-blue-600 hover:text-blue-700 hover:underline">Забыли пароль?</a>
                            </div>
                            <button id="login-btn" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium">
                                <span id="login-text">Войти в систему</span>
                                <div id="login-spinner" class="hidden">
                                    <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </button>
                        </div>

                        <!-- Register Form -->
                        <div id="register-form" class="hidden p-6 space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Полное имя</label>
                                <input type="text" id="register-name" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Иванов Иван Иванович">
                                <div id="register-name-error" class="text-red-500 text-xs mt-1 hidden">Введите ваше полное имя</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Email адрес</label>
                                <input type="email" id="register-email" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="your.email@example.com">
                                <div id="register-email-error" class="text-red-500 text-xs mt-1 hidden">Пожалуйста, введите корректный email</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                                <input type="password" id="register-password" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Минимум 8 символов">
                                <div id="register-password-error" class="text-red-500 text-xs mt-1 hidden">Пароль должен содержать минимум 8 символов, включая буквы и цифры</div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Подтверждение пароля</label>
                                <input type="password" id="register-confirm-password" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" placeholder="Повторите пароль">
                                <div id="register-confirm-error" class="text-red-500 text-xs mt-1 hidden">Пароли не совпадают</div>
                            </div>
                            <div class="flex items-start">
                                <input type="checkbox" id="register-terms" class="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                <label class="ml-2 text-sm text-gray-600">
                                    Я согласен с <a href="#" class="text-blue-600 hover:underline">условиями использования</a> и <a href="#" class="text-blue-600 hover:underline">политикой конфиденциальности</a>
                                </label>
                            </div>
                            <button id="register-btn" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                <span id="register-text">Создать аккаунт</span>
                                <div id="register-spinner" class="hidden">
                                    <svg class="animate-spin h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div class="text-center text-sm text-gray-500">
                        <p>Безопасная авторизация с защитой данных</p>
                    </div>
                </div>
            </div>
        `,
        'onboarding': `<h1 class="text-2xl font-bold mb-6">Страница в разработке: Онбординг</h1>`,
        
    };

    // --- APPLICATION LOGIC ---
    document.addEventListener('DOMContentLoaded', () => {
        const sidebarNav = document.getElementById('sidebar-nav');
        const mainContent = document.getElementById('main-content');
        const mobileHeaderTitle = document.getElementById('mobile-header-title');
        const roleDropdownBtn = document.getElementById('role-dropdown-btn');
        const roleDropdownMenu = document.getElementById('role-dropdown-menu');
        const currentRoleText = document.getElementById('current-role-text');
        
        let currentRole = 'client';
        let currentCarId = null;
        let currentDealId = null;
        let charts = {};
        let isHashChange = false; // Флаг для предотвращения двойной навигации

        // Mobile sidebar toggle
        const sidebarEl = document.getElementById('sidebar');
        const overlayEl = document.getElementById('mobile-menu-overlay');

        function openMobileMenu() {
            sidebarEl.classList.remove('hidden');
            sidebarEl.classList.add('fixed','inset-y-0','left-0','z-40','w-64','bg-white','shadow-xl');
            overlayEl.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function closeMobileMenu() {
            sidebarEl.classList.add('hidden');
            sidebarEl.classList.remove('fixed','inset-y-0','left-0','z-40','w-64','bg-white','shadow-xl');
            overlayEl.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
        }

        // Toggle mobile menu
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            const isHidden = sidebarEl.classList.contains('hidden');
            if (isHidden) {
                openMobileMenu();
            } else {
                closeMobileMenu();
            }
        });

        // Close mobile menu button
        document.getElementById('mobile-menu-close')?.addEventListener('click', closeMobileMenu);

        // Close menu when clicking overlay
        overlayEl?.addEventListener('click', closeMobileMenu);

        // --- HASH NAVIGATION FUNCTIONS ---
        function parseHash() {
            const hash = window.location.hash.substring(1); // Remove the '#'
            if (!hash) return { role: 'client', page: 'client-dashboard' };

            const parts = hash.split('/');
            const result = { role: 'client', page: 'client-dashboard' };

            if (parts.length >= 1 && parts[0]) {
                // Check if first part is a role
                const possibleRole = parts[0];
                if (['client', 'investor', 'manager', 'admin'].includes(possibleRole)) {
                    result.role = possibleRole;
                    if (parts.length >= 2 && parts[1]) {
                        result.page = parts[1];
                        // Handle additional parameters like car ID or deal ID
                        if (parts.length >= 3) {
                            const param = parts[2];
                            if (result.page === 'car-details') {
                                result.carId = param;
                            } else if (result.page === 'deal-details') {
                                result.dealId = param;
                            }
                        }
                    } else {
                        // Set default page for the role
                        const navItems = navConfig[possibleRole];
                        result.page = navItems.find(item => !item.isHeading)?.id || 'client-dashboard';
                    }
                } else {
                    // First part is a page, use current role
                    result.page = parts[0];
                    if (parts.length >= 2) {
                        const param = parts[1];
                        if (result.page === 'car-details') {
                            result.carId = param;
                        } else if (result.page === 'deal-details') {
                            result.dealId = param;
                        }
                    }
                }
            }

            return result;
        }

        function createHash(role, page, param = null) {
            let hash = role;
            if (page && page !== navConfig[role].find(item => !item.isHeading)?.id) {
                hash += '/' + page;
                if (param) {
                    hash += '/' + param;
                }
            }
            return hash;
        }

        function updateHash(role, page, param = null) {
            const hash = createHash(role, page, param);
            if (window.location.hash.substring(1) !== hash) {
                window.location.hash = hash;
            }
        }

        function handleHashChange() {
            if (isHashChange) return;
            isHashChange = true;

            const { role, page, carId, dealId } = parseHash();

            // Update state from hash
            currentRole = role;
            currentCarId = carId || null;
            currentDealId = dealId || null;

            // Ensure UI reflects role without navigating to default page
            updateUIForRole(role, true);

            // Render target page without pushing another hash
            renderPage(page, false);

            isHashChange = false;
        }

        function initCharts(role) {
            // Destroy previous charts if they exist
            Object.values(charts).forEach(chart => chart.destroy());
            charts = {};
            
            if (role === 'investor') {
                const ctx = document.getElementById('investorChart')?.getContext('2d');
                if (ctx) {
                    charts.investor = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
                            datasets: [{
                                label: 'Доходность',
                                data: [12000, 19000, 15000, 25000, 22000, 30000],
                                borderColor: 'rgb(31, 41, 55)',
                                tension: 0.1
                            }]
                        },
                    });
                }
            }
            if (role === 'manager') {
                const ctx = document.getElementById('managerChart')?.getContext('2d');
                 if (ctx) {
                    charts.manager = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['Новые', 'Скоринг', 'Одобрение', 'Подписание', 'Активна'],
                            datasets: [{
                                label: 'Кол-во сделок',
                                data: [2, 1, 1, 0, 1],
                                backgroundColor: 'rgba(31, 41, 55, 0.8)',
                            }]
                        },
                         options: { indexAxis: 'y' }
                    });
                }
            }
        }
        
        function initKanban() {
            const kanbanCols = ['new', 'scoring', 'approval', 'signing', 'active'];
            kanbanCols.forEach(col => {
                const el = document.getElementById(`kanban-${col}`);
                if (el) {
                    new Sortable(el, {
                        group: 'kanban',
                        animation: 150,
                        ghostClass: 'sortable-ghost'
                    });
                }
            });
        }

        function initCatalogFilters() {
            const brandFilter = document.getElementById('brand-filter');
            const priceMin = document.getElementById('price-min');
            const priceMax = document.getElementById('price-max');
            const yearFilter = document.getElementById('year-filter');
            const sortSelect = document.getElementById('sort-select');
            const applyButton = document.getElementById('apply-filters');
            const resetButton = document.getElementById('reset-filters');
            const carsGrid = document.getElementById('cars-grid');
            const resultsCount = document.getElementById('results-count');

            let filteredCars = [...mockData.cars];

            function applyFilters() {
                const brand = brandFilter.value.toLowerCase();
                const minPrice = parseInt(priceMin.value) || 0;
                const maxPrice = parseInt(priceMax.value) || 10000;
                const year = parseInt(yearFilter.value) || 0;

                filteredCars = mockData.cars.filter(car => {
                    const carBrand = car.name.toLowerCase();
                    const carPrice = parseInt(car.price.replace(/[^0-9]/g, ''));

                    return (!brand || carBrand.includes(brand)) &&
                           (carPrice >= minPrice) && (carPrice <= maxPrice) &&
                           (!year || car.year >= year);
                });

                // Apply sorting
                const sortValue = sortSelect.value;
                filteredCars.sort((a, b) => {
                    switch(sortValue) {
                        case 'price-asc':
                            return parseInt(a.price.replace(/[^0-9]/g, '')) - parseInt(b.price.replace(/[^0-9]/g, ''));
                        case 'price-desc':
                            return parseInt(b.price.replace(/[^0-9]/g, '')) - parseInt(a.price.replace(/[^0-9]/g, ''));
                        case 'year-desc':
                            return b.year - a.year;
                        case 'year-asc':
                            return a.year - b.year;
                        default:
                            return 0;
                    }
                });

                renderFilteredCars();
            }

            function renderFilteredCars() {
                carsGrid.innerHTML = filteredCars.map(car => `
                    <a href="#" data-page="car-details" data-car-id="${car.id}" class="car-card block rounded-xl border bg-white text-gray-900 shadow hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105">
                        <img src="${car.image}" alt="${car.name}" class="rounded-t-xl aspect-[4/3] object-cover w-full">
                        <div class="p-4">
                            <h3 class="font-semibold">${car.name}</h3>
                            <p class="text-sm text-gray-500">${car.year} - ${car.mileage.toLocaleString()} км</p>
                            <p class="font-bold my-2 text-green-600">${car.price}</p>
                            <div class="flex items-center text-xs text-gray-500">
                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">Лизинг</span>
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full">Доступен</span>
                            </div>
                        </div>
                    </a>
                `).join('');

                resultsCount.textContent = `Найдено автомобилей: ${filteredCars.length}`;
            }

            function resetFilters() {
                brandFilter.value = '';
                priceMin.value = '';
                priceMax.value = '';
                yearFilter.value = '';
                sortSelect.value = 'price-asc';
                filteredCars = [...mockData.cars];
                renderFilteredCars();
            }

            applyButton.addEventListener('click', applyFilters);
            resetButton.addEventListener('click', resetFilters);
            brandFilter.addEventListener('change', applyFilters);
            yearFilter.addEventListener('change', applyFilters);
            sortSelect.addEventListener('change', applyFilters);

            // Real-time price filtering
            priceMin.addEventListener('input', applyFilters);
            priceMax.addEventListener('input', applyFilters);
        }

        function initAuthForms() {
            const loginTab = document.getElementById('login-tab');
            const registerTab = document.getElementById('register-tab');
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const toggleLoginPassword = document.getElementById('toggle-login-password');

            // Tab switching
            loginTab.addEventListener('click', () => {
                loginTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                loginTab.classList.remove('text-gray-500');
                registerTab.classList.add('text-gray-500');
                registerTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            });

            registerTab.addEventListener('click', () => {
                registerTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                registerTab.classList.remove('text-gray-500');
                loginTab.classList.add('text-gray-500');
                loginTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            });

            // Toggle password visibility
            toggleLoginPassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('login-password');
                const icon = toggleLoginPassword.querySelector('svg');

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>';
                } else {
                    passwordInput.type = 'password';
                    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
                }
            });

            // Form validation and submission
            document.getElementById('login-btn').addEventListener('click', handleLogin);
            document.getElementById('register-btn').addEventListener('click', handleRegister);

            // Real-time validation
            document.getElementById('login-email').addEventListener('blur', validateLoginEmail);
            document.getElementById('login-password').addEventListener('blur', validateLoginPassword);
            document.getElementById('register-name').addEventListener('blur', validateRegisterName);
            document.getElementById('register-email').addEventListener('blur', validateRegisterEmail);
            document.getElementById('register-password').addEventListener('blur', validateRegisterPassword);
            document.getElementById('register-confirm-password').addEventListener('blur', validateRegisterConfirm);
            document.getElementById('register-terms').addEventListener('change', validateRegisterTerms);
        }

        function validateLoginEmail() {
            const email = document.getElementById('login-email').value;
            const error = document.getElementById('login-email-error');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                error.classList.remove('hidden');
                return false;
            }
            error.classList.add('hidden');
            return true;
        }

        function validateLoginPassword() {
            const password = document.getElementById('login-password').value;
            const error = document.getElementById('login-password-error');

            if (password.length < 8) {
                error.classList.remove('hidden');
                return false;
            }
            error.classList.add('hidden');
            return true;
        }

        function validateRegisterName() {
            const name = document.getElementById('register-name').value;
            const error = document.getElementById('register-name-error');

            if (name.trim().length < 2) {
                error.classList.remove('hidden');
                return false;
            }
            error.classList.add('hidden');
            return true;
        }

        function validateRegisterEmail() {
            const email = document.getElementById('register-email').value;
            const error = document.getElementById('register-email-error');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                error.classList.remove('hidden');
                return false;
            }
            error.classList.add('hidden');
            return true;
        }

        function validateRegisterPassword() {
            const password = document.getElementById('register-password').value;
            const error = document.getElementById('register-password-error');
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

            if (!passwordRegex.test(password)) {
                error.classList.remove('hidden');
                return false;
            }
            error.classList.add('hidden');
            return true;
        }

        function validateRegisterConfirm() {
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-confirm-password').value;
            const error = document.getElementById('register-confirm-error');

            if (password !== confirm) {
                error.classList.remove('hidden');
                return false;
            }
            error.classList.add('hidden');
            return true;
        }

        function validateRegisterTerms() {
            const terms = document.getElementById('register-terms');
            const button = document.getElementById('register-btn');

            button.disabled = !terms.checked;
        }

        function handleLogin() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const loginBtn = document.getElementById('login-btn');
            const loginText = document.getElementById('login-text');
            const loginSpinner = document.getElementById('login-spinner');

            if (!validateLoginEmail() || !validateLoginPassword()) {
                return;
            }

            // Show loading state
            loginBtn.disabled = true;
            loginText.classList.add('hidden');
            loginSpinner.classList.remove('hidden');

            // Simulate API call
            setTimeout(() => {
                // Mock authentication - accept any valid email/password
                if (email.includes('@') && password.length >= 8) {
                    // Successful login
                    loginBtn.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'hover:from-blue-700', 'hover:to-indigo-700');
                    loginBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                    loginText.textContent = '✓ Успешный вход!';
                    loginSpinner.classList.add('hidden');

                    setTimeout(() => {
                        // Redirect to dashboard
                        renderPage('client-dashboard');
                    }, 1000);
                } else {
                    // Failed login
                    loginBtn.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'hover:from-blue-700', 'hover:to-indigo-700');
                    loginBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                    loginText.textContent = '✗ Ошибка входа';
                    loginSpinner.classList.add('hidden');

                    setTimeout(() => {
                        loginBtn.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'hover:from-blue-700', 'hover:to-indigo-700');
                        loginBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                        loginText.textContent = 'Войти в систему';
                        loginBtn.disabled = false;
                    }, 2000);
                }
            }, 1500);
        }

        function handleRegister() {
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const terms = document.getElementById('register-terms').checked;
            const registerBtn = document.getElementById('register-btn');
            const registerText = document.getElementById('register-text');
            const registerSpinner = document.getElementById('register-spinner');

            if (!validateRegisterName() || !validateRegisterEmail() || !validateRegisterPassword() || !validateRegisterConfirm() || !terms) {
                return;
            }

            // Show loading state
            registerBtn.disabled = true;
            registerText.classList.add('hidden');
            registerSpinner.classList.remove('hidden');

            // Simulate API call
            setTimeout(() => {
                // Mock registration - accept any valid data
                registerBtn.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'hover:from-blue-700', 'hover:to-indigo-700');
                registerBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                registerText.textContent = '✓ Аккаунт создан!';
                registerSpinner.classList.add('hidden');

                setTimeout(() => {
                    // Switch to login tab
                    document.getElementById('login-tab').click();
                    registerBtn.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-indigo-600', 'hover:from-blue-700', 'hover:to-indigo-700');
                    registerBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    registerText.textContent = 'Создать аккаунт';
                    registerBtn.disabled = false;

                    // Clear form
                    document.getElementById('register-name').value = '';
                    document.getElementById('register-email').value = '';
                    document.getElementById('register-password').value = '';
                    document.getElementById('register-confirm-password').value = '';
                    document.getElementById('register-terms').checked = false;
                }, 1500);
            }, 1500);
        }
        

        // Initialize dynamic content for Deal Details page (moved into scope to access state)
        function initDealDetails() {
            try {
                // Fallback to first deal if none selected
                let dealId = currentDealId || (mockData.deals[0]?.id);
                if (!dealId) return;

                const deal = mockData.deals.find(d => d.id === dealId) || mockData.deals[0];
                const car = mockData.cars.find(c => c.name === deal.car) || mockData.cars[0];

                // Header/title
                const dealTitle = document.getElementById('deal-title');
                if (dealTitle) dealTitle.textContent = `Детали сделки ${deal.id}`;

                const dealIdEl = document.getElementById('deal-id');
                if (dealIdEl) dealIdEl.textContent = deal.id;

                const statusEl = document.getElementById('deal-status');
                if (statusEl) {
                    statusEl.textContent = deal.status || '—';
                    statusEl.className = `px-2 py-1 text-xs font-medium rounded-full ${deal.statusColor || 'bg-gray-100 text-gray-800'}`;
                }

                // Car info
                const img = document.getElementById('deal-car-image');
                if (img) {
                    img.src = car?.image || '';
                    img.alt = car?.name || '';
                    img.onerror = () => {
                        // graceful fallback placeholder (inline SVG)
                        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial" font-size="12">no image</text></svg>';
                    };
                }
                const nameEl = document.getElementById('deal-car-name');
                if (nameEl) nameEl.textContent = car?.name || '—';
                const yearEl = document.getElementById('deal-car-year');
                if (yearEl) yearEl.textContent = car?.year ?? '—';
                const mileageEl = document.getElementById('deal-car-mileage');
                if (mileageEl) mileageEl.textContent = (car?.mileage ?? 0).toLocaleString('ru-RU');

                // Invoices for this deal
                const invoices = (mockData.invoices || [])
                    .filter(inv => inv.dealId === deal.id)
                    .sort((a,b) => new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date));

                // Next payment
                const now = new Date();
                const next = invoices.find(inv => inv.status !== 'Оплачен' && new Date(inv.dueDate || inv.date) >= new Date(now.toDateString()))
                            || invoices.find(inv => inv.status !== 'Оплачен');
                const amount = next?.amount;
                const due = next ? new Date(next.dueDate || next.date) : null;

                const nextAmountEl = document.getElementById('deal-next-amount');
                const nextDateEl = document.getElementById('deal-next-date');
                const daysLeftEl = document.getElementById('deal-days-left');

                if (nextAmountEl) nextAmountEl.textContent = amount ? amount.toLocaleString('ru-RU') : '—';
                if (nextDateEl) nextDateEl.textContent = due ? due.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
                if (daysLeftEl) {
                    if (!due) {
                        daysLeftEl.textContent = '';
                    } else {
                        const diffDays = Math.ceil((due - now) / (1000*60*60*24));
                        daysLeftEl.textContent = diffDays > 0 ? `через ${diffDays} д.` : (diffDays === 0 ? 'сегодня' : `просрочено ${Math.abs(diffDays)} д.`);
                    }
                }

                // Payments list
                const list = document.getElementById('deal-payments-list');
                if (list) {
                    list.innerHTML = invoices.map(inv => {
                        const d = new Date(inv.dueDate || inv.date);
                        const month = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                        let status = inv.status;
                        if (status !== 'Оплачен') {
                            status = d < new Date() ? 'Просрочен' : 'Ожидает';
                        }
                        const badge = status === 'Оплачен'
                            ? 'bg-green-100 text-green-800'
                            : (status === 'Просрочен' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                        const action = status === 'Оплачен' ? '' : `<button data-invoice-id="${inv.id}" class="text-blue-600 hover:underline text-xs">Оплатить</button>`;
                        return `
                            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span class="capitalize">${month}</span>
                                <span class="font-medium">${inv.amount.toLocaleString('ru-RU')} AED</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${badge}">${status}</span>
                                ${action}
                            </div>
                        `;
                    }).join('');
                }

                // Documents (mock)
                let docs = [
                    { name: 'Договор лизинга', status: 'Подписан', badge: 'bg-green-100 text-green-800', updatedAt: new Date().toISOString() },
                    { name: 'Акт приема-передачи', status: 'Ожидает', badge: 'bg-yellow-100 text-yellow-800', updatedAt: new Date().toISOString() },
                    { name: 'Страховой полис', status: 'Действует', badge: 'bg-blue-100 text-blue-800', updatedAt: new Date().toISOString() },
                ];
                function renderDocs() {
                    const docsEl = document.getElementById('deal-documents-list');
                    if (!docsEl) return;
                    docsEl.innerHTML = docs.map(d => `
                        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                                <div class="text-sm">${d.name}</div>
                                <div class="text-xs text-gray-500">обновлено ${new Date(d.updatedAt).toLocaleDateString('ru-RU')}</div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${d.badge}">${d.status}</span>
                                <button class="text-blue-600 text-sm hover:underline">Скачать</button>
                            </div>
                        </div>
                    `).join('');
                    // Progress (removed)
                    // Reupload handlers (removed)
                }
                renderDocs();

                // Activity timeline
                const timeline = document.getElementById('deal-activity-timeline');
                if (timeline) {
                    const events = [];
                    invoices.filter(i => i.status === 'Оплачен').slice(-3).forEach(i => {
                        events.push({ text: `Оплата ${i.id} на ${i.amount.toLocaleString('ru-RU')} AED`, date: i.date });
                    });
                    events.unshift({ text: `Статус сделки: ${deal.status}`, date: deal.date || invoices[0]?.date || new Date().toISOString() });
                    timeline.innerHTML = events.map(ev => `
                        <div class="flex items-start gap-3">
                            <div class="w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                            <div>
                                <div class="text-sm">${ev.text}</div>
                                <div class="text-xs text-gray-500">${new Date(ev.date).toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric' })}</div>
                            </div>
                        </div>
                    `).join('');
                }

                // Actions
                document.querySelectorAll('[data-invoice-id]')?.forEach(btn => {
                    btn.addEventListener('click', () => renderPage('my-invoices'));
                });
            } catch (e) {
                console.error('initDealDetails error', e);
            }
        }

        function renderPage(pageId, updateHashFlag = true) {
            let content = pageTemplates[pageId] || `<h1 class="text-2xl font-bold">Страница не найдена: ${pageId}</h1>`;

            // Handle dynamic content for car details
            if (pageId === 'car-details' && currentCarId) {
                const car = mockData.cars.find(c => c.id == currentCarId);
                if (car) {
                    content = content.replace(/\${mockData\.cars\[0\]/g, '${mockData.cars.find(c => c.id == ' + currentCarId + ')');
                    content = content.replace(/Mercedes-Benz S-Class/g, car.name);
                }
            }

            mainContent.innerHTML = content;

            document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
            const newPage = document.getElementById(`page-${pageId}`);
            if (newPage) newPage.classList.add('active');

            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.page === pageId);
            });

            const activeLink = navConfig[currentRole].find(link => link.id === pageId);
            mobileHeaderTitle.textContent = activeLink ? activeLink.text : 'Dashboard';

            // Update hash if flag is set (default behavior)
            if (updateHashFlag) {
                let param = null;
                if (pageId === 'car-details' && currentCarId) {
                    param = currentCarId;
                } else if (pageId === 'deal-details' && currentDealId) {
                    param = currentDealId;
                }
                updateHash(currentRole, pageId, param);
            }

            // Re-initialize dynamic components
            if (pageId === 'client-dashboard') {
                document.getElementById('client-pay-now')?.addEventListener('click', () => {
                    renderPage('my-invoices');
                });
            }
            initCharts(currentRole);
            if(pageId === 'ops-kanban') {
                initKanban();
            }
            if(pageId === 'catalog') {
                initCatalogFilters();
            }
            if(pageId === 'login') {
                initAuthForms();
            }
            if(pageId === 'client-profile') {
                initClientProfile();
            }
            if(pageId === 'deal-details') {
                initDealDetails();
            }
            lucide.createIcons();
        }

        function updateUIForRole(role, skipNavigate = false) {
            currentRole = role;
            
            // Обновляем текст текущей роли в выпадающем списке
            const roleNames = {
                'client': 'Клиент',
                'investor': 'Инвестор', 
                'manager': 'Менеджер',
                'admin': 'Администратор'
            };
            currentRoleText.textContent = roleNames[role] || 'Клиент';

            // Update sidebar navigation
            const navItems = navConfig[role];
            sidebarNav.innerHTML = `
                <nav class="grid items-start px-4 text-sm font-medium">
                    ${navItems.map(item => item.isHeading ?
                        `<h3 class="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase">${item.text}</h3>` :
                        `<a href="#" data-page="${item.id}" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900">
                            <i data-lucide="${item.icon}" class="h-4 w-4"></i>
                            ${item.text}
                        </a>`
                    ).join('')}
                    
                    <!-- Manager Block -->
                    <div class="mt-6 p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center gap-3 mb-3">
                            <img src="https://i.pravatar.cc/40" class="w-8 h-8 rounded-full border" alt="Manager">
                            <div>
                                <div class="font-medium text-xs" id="sidebar-manager-name">Anna Petrova</div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <a href="mailto:manager@portal.erp" class="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="Написать">
                                <i data-lucide="mail" class="h-4 w-4"></i>
                            </a>
                            <a href="tel:+971500000001" class="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Позвонить">
                                <i data-lucide="phone" class="h-4 w-4"></i>
                            </a>
                            <button data-page="client-support" class="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="Открыть тикет">
                                <i data-lucide="message-circle" class="h-4 w-4"></i>
                            </button>
                        </div>
                    </div>
                </nav>
            `;

            // Navigate to the first page of the new role unless explicitly skipped
            if (!skipNavigate) {
                const defaultPage = navItems.find(item => !item.isHeading).id;
                renderPage(defaultPage);
            }
        }

        // --- Event Listeners ---
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            if (link && link.dataset.page) {
                e.preventDefault();
                // Close mobile menu when clicking on navigation link
                closeMobileMenu();
                renderPage(link.dataset.page, true);
            }
        });

         // Handle clicks on car cards in catalog and deal details
         mainContent.addEventListener('click', (e) => {
             const carCard = e.target.closest('[data-car-id]');
             if (carCard && carCard.dataset.page === 'car-details') {
                 e.preventDefault();
                 currentCarId = carCard.dataset.carId;
                 renderPage('car-details', true);
             }

             const dealButton = e.target.closest('[data-deal-id]');
             if (dealButton && dealButton.dataset.page === 'deal-details') {
                 e.preventDefault();
                 currentDealId = dealButton.dataset.dealId;
                 renderPage('deal-details', true);
             }
         });

        // Role dropdown functionality
        roleDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            roleDropdownMenu.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!roleDropdownBtn.contains(e.target) && !roleDropdownMenu.contains(e.target)) {
                roleDropdownMenu.classList.add('hidden');
            }
        });

        // Handle role selection
        roleDropdownMenu.addEventListener('click', (e) => {
            const button = e.target.closest('.role-dropdown-item');
            if (button && button.dataset.role) {
                const newRole = button.dataset.role;
                updateUIForRole(newRole);
                roleDropdownMenu.classList.add('hidden');
            }
        });

        // --- Event Listeners ---
        window.addEventListener('hashchange', handleHashChange);

        // --- Initial Load ---
        // Check if there's a hash in the URL, otherwise use default
        if (window.location.hash) {
            handleHashChange();
        } else {
            updateUIForRole('client');
            updateHash('client', 'client-dashboard');
        }
    });

// --- CLIENT PROFILE MODULE ---
const CLIENT_PROFILE_KEY = 'client_profile';

function getDefaultClientProfile() {
    return {
        name: 'Иван Иванов',
        email: 'client@example.com',
        phone: '+971 50 000 0000',
        nationality: 'UAE',
        address: '',
        language: 'ru',
        timezone: 'Asia/Dubai',
        news: true,
        twoFactor: false,
        avatarDataUrl: 'https://i.pravatar.cc/96',
        documents: []
    };
}

function loadClientProfile() {
    try {
        const raw = localStorage.getItem(CLIENT_PROFILE_KEY);
        const stored = raw ? JSON.parse(raw) : null;
        return { ...getDefaultClientProfile(), ...(stored || {}) };
    } catch {
        return getDefaultClientProfile();
    }
}

function saveClientProfile(profile) {
    try {
        localStorage.setItem(CLIENT_PROFILE_KEY, JSON.stringify(profile));
    } catch {}
}

function initClientProfile() {
    const nameEl = document.getElementById('cp-name');
    const emailEl = document.getElementById('cp-email');
    const phoneEl = document.getElementById('cp-phone');
    const nationalityEl = document.getElementById('cp-nationality');
    const addressEl = document.getElementById('cp-address');
    const saveBtn = document.getElementById('cp-save');

    const twoFAButton = document.getElementById('cp-2fa');
    const twoFAThumb = document.getElementById('cp-2fa-thumb');

    const pass1El = document.getElementById('cp-pass1');
    const pass2El = document.getElementById('cp-pass2');
    const passBtn = document.getElementById('cp-change-pass');
    const passMsg = document.getElementById('cp-pass-msg');

    const langEl = document.getElementById('cp-language');
    const tzEl = document.getElementById('cp-timezone');
    const newsEl = document.getElementById('cp-news');

    const avatarInput = document.getElementById('cp-avatar');
    const avatarPreview = document.getElementById('cp-avatar-preview');
    const docsInput = document.getElementById('cp-docs-input');
    const docsList = document.getElementById('cp-docs-list');
    const docsCategory = document.getElementById('cp-docs-category');
    const docsRecommended = document.getElementById('cp-docs-recommended');

    // Если элементов нет (страница не та) — выходим
    if (!saveBtn || !nameEl) return;

    // Загрузка профиля
    let profile = loadClientProfile();

    // Проставляем значения
    nameEl.value = profile.name || '';
    emailEl.value = profile.email || '';
    phoneEl.value = profile.phone || '';
    nationalityEl.value = profile.nationality || '';
    addressEl.value = profile.address || '';
    langEl.value = profile.language || 'ru';
    tzEl.value = profile.timezone || 'Asia/Dubai';
    newsEl.checked = !!profile.news;
    if (avatarPreview && profile.avatarDataUrl) {
        avatarPreview.src = profile.avatarDataUrl;
    }

    // 2FA визуализация
    function set2FAUI(enabled) {
        if (!twoFAButton || !twoFAThumb) return;
        if (enabled) {
            twoFAButton.classList.add('bg-green-500');
            twoFAButton.classList.remove('bg-gray-200');
            twoFAThumb.classList.remove('translate-x-1');
            twoFAThumb.classList.add('translate-x-6');
        } else {
            twoFAButton.classList.remove('bg-green-500');
            twoFAButton.classList.add('bg-gray-200');
            twoFAThumb.classList.add('translate-x-1');
            twoFAThumb.classList.remove('translate-x-6');
        }
    }
    set2FAUI(!!profile.twoFactor);

    // Сохранение профиля
    saveBtn.addEventListener('click', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Простая валидация
        let valid = true;
        if (!emailRegex.test(emailEl.value)) {
            emailEl.classList.add('border-red-500');
            valid = false;
        } else {
            emailEl.classList.remove('border-red-500');
        }
        if ((nameEl.value || '').trim().length < 2) {
            nameEl.classList.add('border-red-500');
            valid = false;
        } else {
            nameEl.classList.remove('border-red-500');
        }
        if (!valid) return;

        profile = {
            ...profile,
            name: nameEl.value.trim(),
            email: emailEl.value.trim(),
            phone: phoneEl.value.trim(),
            nationality: nationalityEl.value.trim(),
            address: addressEl.value.trim(),
            language: langEl.value,
            timezone: tzEl.value,
            news: !!newsEl.checked
        };
        saveClientProfile(profile);

        // Обновляем роль в выпадающем списке, если роль клиент
        if (currentRole === 'client') {
            // Роль уже обновлена в updateUIForRole
        }

        const original = saveBtn.textContent;
        saveBtn.textContent = '✓ Сохранено';
        saveBtn.classList.remove('bg-gray-800');
        saveBtn.classList.add('bg-green-600');
        setTimeout(() => {
            saveBtn.textContent = original;
            saveBtn.classList.add('bg-gray-800');
            saveBtn.classList.remove('bg-green-600');
        }, 1500);
    });

    // Переключение 2FA
    twoFAButton?.addEventListener('click', () => {
        profile.twoFactor = !profile.twoFactor;
        set2FAUI(profile.twoFactor);
        saveClientProfile(profile);
    });

    // Смена пароля
    passBtn?.addEventListener('click', () => {
        const p1 = pass1El.value;
        const p2 = pass2El.value;
        const ok = p1.length >= 8 && p1 === p2;
        passMsg.classList.remove('hidden', 'text-red-600', 'text-green-600');
        if (ok) {
            passMsg.textContent = 'Пароль обновлен ✅';
            passMsg.classList.add('text-green-600');
            pass1El.value = '';
            pass2El.value = '';
        } else {
            passMsg.textContent = 'Ошибка: проверьте длину (мин. 8) и совпадение паролей';
            passMsg.classList.add('text-red-600');
        }
        setTimeout(() => passMsg.classList.add('hidden'), 2500);
    });

    // Смена аватара
    avatarInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { // 1MB
            // Простейшее уведомление
            const original = saveBtn.textContent;
            saveBtn.textContent = 'Файл > 1MB';
            saveBtn.classList.remove('bg-gray-800');
            saveBtn.classList.add('bg-red-600');
            setTimeout(() => {
                saveBtn.textContent = original;
                saveBtn.classList.add('bg-gray-800');
                saveBtn.classList.remove('bg-red-600');
            }, 1500);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            avatarPreview.src = reader.result;
            profile.avatarDataUrl = reader.result;
            saveClientProfile(profile);
        };
        reader.readAsDataURL(file);
    });

    function humanCategory(cat) {
        switch (cat) {
            case 'emirates_id': return 'Emirates ID';
            case 'passport': return 'Паспорт';
            case 'residency_visa': return 'Резидентская виза';
            case 'drivers_license': return 'Водительское удостоверение';
            case 'salary_certificate': return 'Справка о зарплате';
            case 'bank_statement': return 'Банковская выписка (3 мес)';
            case 'address_proof': return 'Подтверждение адреса';
            case 'insurance': return 'Страховка';
            case 'noc': return 'NOC от работодателя';
            case 'trade_license': return 'Trade License';
            default: return 'Другое';
        }
    }

    // Документы: рендер списка
    function renderDocs() {
        if (!docsList) return;
        docsList.innerHTML = '';
        (profile.documents || []).forEach((doc, idx) => {
            const li = document.createElement('li');
            li.className = 'py-2 flex items-center justify-between';
            li.innerHTML = `<div class=\"flex items-center gap-3\">\n                <span class=\"inline-block w-6 h-6 rounded bg-gray-200 text-gray-700 text-xs flex items-center justify-center\">${doc.type === 'pdf' ? 'PDF' : 'IMG'}</span>\n                <a href=\"${doc.url}\" target=\"_blank\" class=\"text-blue-600 hover:underline\">${doc.name}</a>\n                <span class=\"text-xs text-gray-500\">${Math.round(doc.size/1024)} KB</span>\n                <span class=\"text-xs px-2 py-1 rounded bg-blue-50 text-blue-700\">${humanCategory(doc.category)}</span>\n            </div>\n            <button data-idx=\"${idx}\" class=\"text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200\">Удалить</button>`;
            docsList.appendChild(li);
        });
        // remove handlers
        docsList.querySelectorAll('button[data-idx]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                if (!isNaN(i)) {
                    profile.documents.splice(i, 1);
                    saveClientProfile(profile);
                    renderDocs();
                    renderRecommendedDocs();
                }
            });
        });
    }

    // Инициализация рендера документов
    renderDocs();

    function renderRecommendedDocs() {
        if (!docsRecommended) return;
        const required = [
            'emirates_id', 'passport', 'residency_visa', 'drivers_license',
            'salary_certificate', 'bank_statement', 'address_proof',
            'insurance', 'noc', 'trade_license'
        ];
        const have = new Set((profile.documents || []).map(d => d.category));
        docsRecommended.innerHTML = '';
        required.forEach(cat => {
            const li = document.createElement('li');
            const ok = have.has(cat);
            li.className = 'flex items-center justify-between';
            li.innerHTML = `<span>${humanCategory(cat)}</span>\n            <span class=\"text-xs px-2 py-1 rounded ${ok ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}\">${ok ? 'загружен' : 'ожидается'}</span>`;
            docsRecommended.appendChild(li);
        });
    }

    renderRecommendedDocs();

    // Загрузка документов
    docsInput?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        const maxSize = 2 * 1024 * 1024; // 2MB
        files.forEach(file => {
            if (!allowed.includes(file.type)) return;
            if (file.size > maxSize) return;
            const reader = new FileReader();
            reader.onload = () => {
                const url = reader.result;
                const ext = file.type === 'application/pdf' ? 'pdf' : 'img';
                const cat = docsCategory?.value || 'other';
                profile.documents = [...(profile.documents || []), {
                    name: file.name,
                    size: file.size,
                    type: ext,
                    url,
                    category: cat
                }];
                saveClientProfile(profile);
                renderDocs();
                renderRecommendedDocs();
            };
            reader.readAsDataURL(file);
        });
        // очистка инпута
        e.target.value = '';
    });

    // Автосохранение настроек при изменении
    langEl.addEventListener('change', () => {
        profile.language = langEl.value;
        saveClientProfile(profile);
    });
    tzEl.addEventListener('change', () => {
        profile.timezone = tzEl.value;
        saveClientProfile(profile);
    });
    newsEl.addEventListener('change', () => {
        profile.news = !!newsEl.checked;
        saveClientProfile(profile);
    });
}
/**
 * Initialize dynamic content for Deal Details page
 */
function initDealDetails_legacy() {
    try {
        // Fallback to first deal if none selected
        let dealId = currentDealId || (mockData.deals[0]?.id);
        if (!dealId) return;

        const deal = mockData.deals.find(d => d.id === dealId) || mockData.deals[0];
        const car = mockData.cars.find(c => c.name === deal.car) || mockData.cars[0];

        // Header/title
        const dealTitle = document.getElementById('deal-title');
        if (dealTitle) dealTitle.textContent = `Детали сделки ${deal.id}`;

        const dealIdEl = document.getElementById('deal-id');
        if (dealIdEl) dealIdEl.textContent = deal.id;

        const statusEl = document.getElementById('deal-status');
        if (statusEl) {
            statusEl.textContent = deal.status || '—';
            statusEl.className = `px-2 py-1 text-xs font-medium rounded-full ${deal.statusColor || 'bg-gray-100 text-gray-800'}`;
        }

        // Car info
        const img = document.getElementById('deal-car-image');
        if (img && car?.image) { img.src = car.image; img.alt = car.name; }
        const nameEl = document.getElementById('deal-car-name');
        if (nameEl) nameEl.textContent = car?.name || '—';
        const yearEl = document.getElementById('deal-car-year');
        if (yearEl) yearEl.textContent = car?.year ?? '—';
        const mileageEl = document.getElementById('deal-car-mileage');
        if (mileageEl) mileageEl.textContent = (car?.mileage ?? 0).toLocaleString('ru-RU');

        // Invoices for this deal
        const invoices = (mockData.invoices || [])
            .filter(inv => inv.dealId === deal.id)
            .sort((a,b) => new Date(a.dueDate || a.date) - new Date(b.dueDate || b.date));

        // Next payment
        const now = new Date();
        const next = invoices.find(inv => inv.status !== 'Оплачен' && new Date(inv.dueDate || inv.date) >= new Date(now.toDateString()))
                    || invoices.find(inv => inv.status !== 'Оплачен');
        const amount = next?.amount;
        const due = next ? new Date(next.dueDate || next.date) : null;

        const nextAmountEl = document.getElementById('deal-next-amount');
        const nextDateEl = document.getElementById('deal-next-date');
        const daysLeftEl = document.getElementById('deal-days-left');

        if (nextAmountEl) nextAmountEl.textContent = amount ? amount.toLocaleString('ru-RU') : '—';
        if (nextDateEl) nextDateEl.textContent = due ? due.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
        if (daysLeftEl) {
            if (!due) {
                daysLeftEl.textContent = '';
            } else {
                const diffDays = Math.ceil((due - now) / (1000*60*60*24));
                daysLeftEl.textContent = diffDays > 0 ? `через ${diffDays} д.` : (diffDays === 0 ? 'сегодня' : `просрочено ${Math.abs(diffDays)} д.`);
            }
        }

        // Payments list
        const list = document.getElementById('deal-payments-list');
        if (list) {
            list.innerHTML = invoices.map(inv => {
                const d = new Date(inv.dueDate || inv.date);
                const month = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                let status = inv.status;
                if (status !== 'Оплачен') {
                    status = d < now ? 'Просрочен' : 'Ожидает';
                }
                const badge = status === 'Оплачен'
                    ? 'bg-green-100 text-green-800'
                    : (status === 'Просрочен' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');
                const action = status === 'Оплачен' ? '' : `<button data-invoice-id="${inv.id}" class="text-blue-600 hover:underline text-xs">Оплатить</button>`;
                return `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span class="capitalize">${month}</span>
                        <span class="font-medium">${inv.amount.toLocaleString('ru-RU')} AED</span>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${badge}">${status}</span>
                        ${action}
                    </div>
                `;
            }).join('');
        }

        // Documents (mock)
        const docs = [
            { name: 'Договор лизинга', status: 'Подписан', badge: 'bg-green-100 text-green-800' },
            { name: 'Акт приема-передачи', status: 'Ожидает', badge: 'bg-yellow-100 text-yellow-800' },
            { name: 'Страховой полис', status: 'Действует', badge: 'bg-blue-100 text-blue-800' },
        ];
        const docsEl = document.getElementById('deal-documents-list');
        if (docsEl) {
            docsEl.innerHTML = docs.map(d => `
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                        <div class="text-sm">${d.name}</div>
                        <div class="text-xs text-gray-500">обновлено недавно</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${d.badge}">${d.status}</span>
                        <button class="text-blue-600 text-sm hover:underline">Скачать</button>
                    </div>
                </div>
            `).join('');
        }

        // Activity timeline
        const timeline = document.getElementById('deal-activity-timeline');
        if (timeline) {
            const events = [];
            invoices.filter(i => i.status === 'Оплачен').slice(-3).forEach(i => {
                events.push({ text: `Оплата ${i.id} на ${i.amount.toLocaleString('ru-RU')} AED`, date: i.date });
            });
            events.unshift({ text: `Статус сделки: ${deal.status}`, date: deal.date || invoices[0]?.date || new Date().toISOString() });
            timeline.innerHTML = events.map(ev => `
                <div class="flex items-start gap-3">
                    <div class="w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                    <div>
                        <div class="text-sm">${ev.text}</div>
                        <div class="text-xs text-gray-500">${new Date(ev.date).toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric' })}</div>
                    </div>
                </div>
            `).join('');
        }

        // Actions
        document.querySelectorAll('[data-invoice-id]')?.forEach(btn => {
            btn.addEventListener('click', () => renderPage('my-invoices'));
        });
    } catch (e) {
        console.error('initDealDetails error', e);
    }
}
</script>
</body>
</html>
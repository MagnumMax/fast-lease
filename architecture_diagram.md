# Диаграмма архитектуры Workflow системы

```mermaid
graph TD
    A[Клиент] --> B[API Gateway]
    B --> C[Workflow Service]
    C --> D[State Machine Engine]
    C --> E[Queue Manager]
    C --> F[Error Handler]
    C --> G[Webhook Manager]

    D --> H[State Storage]
    E --> I[Message Queue]
    F --> J[Retry Policy]
    G --> K[External Systems]

    H --> L[(Database)]
    I --> M[Worker Processes]
    J --> N[Logging System]
    K --> O[Webhook Endpoints]

    subgraph "Workflow States"
        P[Pending]
        Q[In Progress]
        R[Approved]
        S[Rejected]
        T[Completed]
    end

    D -.-> P
    D -.-> Q
    D -.-> R
    D -.-> S
    D -.-> T

    style A fill:#e1f5fe
    style L fill:#f3e5f5
    style O fill:#e8f5e8
```

## Описание компонентов

- **Клиент**: Инициирует workflow и получает обновления
- **API Gateway**: Точка входа для API запросов
- **Workflow Service**: Основной оркестратор workflow
- **State Machine Engine**: Управляет состояниями и переходами
- **Queue Manager**: Обрабатывает асинхронные задачи
- **Error Handler**: Управляет ошибками и retry логикой
- **Webhook Manager**: Отправляет уведомления внешним системам
- **State Storage**: Хранит текущие состояния workflow
- **Message Queue**: Очередь для асинхронных операций
- **Worker Processes**: Фоновые процессы для обработки задач
- **Retry Policy**: Политика повторных попыток
- **Logging System**: Система логирования
- **External Systems**: Внешние сервисы, получающие webhook

## Поток данных

1. Клиент отправляет запрос на запуск workflow
2. API Gateway перенаправляет в Workflow Service
3. Workflow Service инициализирует State Machine
4. State Machine обновляет состояние в State Storage
5. При асинхронных операциях - задачи в Queue Manager
6. Worker Processes обрабатывают задачи из Message Queue
7. Error Handler управляет сбоями с retry
8. Webhook Manager уведомляет External Systems о событиях
9. Все действия логируются в Logging System
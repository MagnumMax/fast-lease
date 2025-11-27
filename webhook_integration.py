"""
Пример интеграции с внешними системами через webhooks.
Демонстрирует отправку webhook уведомлений при событиях workflow.
"""

import json
import time
from typing import Dict, Any, List, Optional
from enum import Enum
import requests  # Для HTTP запросов (pip install requests)
from workflow_state_machine import WorkflowState


class WebhookEvent(Enum):
    """Типы событий для webhook."""
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_APPROVED = "workflow.approved"
    WORKFLOW_REJECTED = "workflow.rejected"
    WORKFLOW_COMPLETED = "workflow.completed"
    ERROR_OCCURRED = "workflow.error"


class WebhookPayload:
    """Структура payload для webhook."""

    def __init__(self, event: WebhookEvent, workflow_id: str, state: WorkflowState,
                 context: Dict[str, Any], timestamp: Optional[float] = None):
        self.event = event
        self.workflow_id = workflow_id
        self.state = state
        self.context = context
        self.timestamp = timestamp or time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Преобразует в словарь для JSON."""
        return {
            'event': self.event.value,
            'workflow_id': self.workflow_id,
            'state': self.state.value,
            'context': self.context,
            'timestamp': self.timestamp
        }

    def to_json(self) -> str:
        """Преобразует в JSON строку."""
        return json.dumps(self.to_dict(), indent=2)


class WebhookClient:
    """Покупатель для отправки webhook."""

    def __init__(self, endpoints: List[str], headers: Optional[Dict[str, str]] = None,
                 timeout: int = 10, max_retries: int = 3):
        self.endpoints = endpoints
        self.headers = headers or {'Content-Type': 'application/json'}
        self.timeout = timeout
        self.max_retries = max_retries

    def send_webhook(self, payload: WebhookPayload) -> bool:
        """Отправляет webhook на все endpoints."""
        success_count = 0

        for endpoint in self.endpoints:
            if self._send_to_endpoint(endpoint, payload):
                success_count += 1

        return success_count > 0  # Успех, если хотя бы один endpoint ответил

    def _send_to_endpoint(self, endpoint: str, payload: WebhookPayload) -> bool:
        """Отправляет на конкретный endpoint."""
        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    endpoint,
                    data=payload.to_json(),
                    headers=self.headers,
                    timeout=self.timeout
                )
                if response.status_code == 200:
                    print(f"Webhook отправлен на {endpoint}: {response.status_code}")
                    return True
                else:
                    print(f"Ошибка webhook на {endpoint}: {response.status_code} - {response.text}")

            except requests.RequestException as e:
                print(f"Попытка {attempt + 1} на {endpoint} провалилась: {str(e)}")
                if attempt < self.max_retries - 1:
                    time.sleep(1)  # Задержка перед retry

        return False


class WorkflowWithWebhooks:
    """Workflow с интеграцией webhook."""

    def __init__(self, workflow_id: str, webhook_client: WebhookClient):
        self.workflow_id = workflow_id
        self.state = WorkflowState.PENDING
        self.context: Dict[str, Any] = {'workflow_id': workflow_id}
        self.webhook_client = webhook_client
        self.event_history: List[WebhookPayload] = []

    def start_processing(self):
        """Начинает обработку и отправляет webhook."""
        self.state = WorkflowState.IN_PROGRESS
        self._send_webhook(WebhookEvent.WORKFLOW_STARTED)
        print(f"Workflow {self.workflow_id} начат")

    def approve(self):
        """Одобряет и отправляет webhook."""
        self.state = WorkflowState.APPROVED
        self._send_webhook(WebhookEvent.WORKFLOW_APPROVED)
        print(f"Workflow {self.workflow_id} одобрен")

    def reject(self, reason: str):
        """Отклоняет и отправляет webhook."""
        self.state = WorkflowState.REJECTED
        self.context['rejection_reason'] = reason
        self._send_webhook(WebhookEvent.WORKFLOW_REJECTED)
        print(f"Workflow {self.workflow_id} отклонен: {reason}")

    def complete(self):
        """Завершает и отправляет webhook."""
        self.state = WorkflowState.COMPLETED
        self._send_webhook(WebhookEvent.WORKFLOW_COMPLETED)
        print(f"Workflow {self.workflow_id} завершен")

    def handle_error(self, error: str):
        """Обрабатывает ошибку и отправляет webhook."""
        self.context['error'] = error
        self._send_webhook(WebhookEvent.ERROR_OCCURRED)
        print(f"Ошибка в workflow {self.workflow_id}: {error}")

    def _send_webhook(self, event: WebhookEvent):
        """Отправляет webhook для события."""
        payload = WebhookPayload(event, self.workflow_id, self.state, self.context)
        self.event_history.append(payload)

        if self.webhook_client.send_webhook(payload):
            print(f"Webhook {event.value} отправлен успешно")
        else:
            print(f"Не удалось отправить webhook {event.value}")

    def get_event_history(self) -> List[WebhookPayload]:
        """Возвращает историю событий."""
        return self.event_history


# Пример использования
if __name__ == "__main__":
    # Настройка webhook endpoints (в реальности - реальные URL)
    endpoints = [
        "https://external-system-1.com/webhook",
        "https://external-system-2.com/webhook"
    ]

    webhook_client = WebhookClient(endpoints)

    workflow = WorkflowWithWebhooks("wf_webhook_001", webhook_client)

    # Симуляция workflow
    workflow.start_processing()
    time.sleep(0.1)  # Имитация времени

    workflow.approve()
    time.sleep(0.1)

    workflow.complete()

    # Показать историю
    print("\nИстория событий:")
    for event in workflow.get_event_history():
        print(f"  - {event.event.value} в {event.timestamp}: {event.to_dict()}")
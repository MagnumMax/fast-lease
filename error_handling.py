"""
Пример обработки ошибок и retry логики в workflow системе.
Демонстрирует механизмы повторных попыток и обработку исключений.
"""

import time
import random
from enum import Enum
from typing import Dict, Callable, Any, Optional, List
from workflow_state_machine import WorkflowState


class ErrorType(Enum):
    """Типы ошибок."""
    NETWORK_ERROR = "network_error"
    VALIDATION_ERROR = "validation_error"
    TIMEOUT_ERROR = "timeout_error"
    UNKNOWN_ERROR = "unknown_error"


class WorkflowError(Exception):
    """Базовый класс для ошибок workflow."""

    def __init__(self, message: str, error_type: ErrorType, retryable: bool = True):
        super().__init__(message)
        self.error_type = error_type
        self.retryable = retryable


class RetryPolicy:
    """Политика повторных попыток."""

    def __init__(self, max_attempts: int = 3, base_delay: float = 1.0, max_delay: float = 60.0, backoff_factor: float = 2.0):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor

    def get_delay(self, attempt: int) -> float:
        """Вычисляет задержку для попытки."""
        delay = self.base_delay * (self.backoff_factor ** attempt)
        return min(delay, self.max_delay)


class ErrorHandler:
    """Обработчик ошибок с retry логикой."""

    def __init__(self, retry_policy: RetryPolicy):
        self.retry_policy = retry_policy
        self.error_log: List[Dict[str, Any]] = []

    def execute_with_retry(self, operation: Callable[[], Any], context: Dict[str, Any]) -> Any:
        """Выполняет операцию с повторными попытками."""
        last_exception = None

        for attempt in range(self.retry_policy.max_attempts):
            try:
                print(f"Попытка {attempt + 1}/{self.retry_policy.max_attempts}")
                result = operation()
                if attempt > 0:
                    print(f"Операция успешна после {attempt + 1} попыток")
                return result

            except WorkflowError as e:
                last_exception = e
                self._log_error(e, context, attempt + 1)

                if not e.retryable or attempt == self.retry_policy.max_attempts - 1:
                    break

                # Проверяем, стоит ли retry для этого типа ошибки
                if not self._should_retry(e.error_type):
                    break

                delay = self.retry_policy.get_delay(attempt)
                print(f"Задержка перед retry: {delay} сек")
                time.sleep(delay)

            except Exception as e:
                # Неизвестная ошибка
                last_exception = WorkflowError(str(e), ErrorType.UNKNOWN_ERROR)
                self._log_error(last_exception, context, attempt + 1)
                break

        # Если все попытки провалились
        raise last_exception

    def _should_retry(self, error_type: ErrorType) -> bool:
        """Определяет, стоит ли повторять для типа ошибки."""
        retryable_types = {ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR}
        return error_type in retryable_types

    def _log_error(self, error: WorkflowError, context: Dict[str, Any], attempt: int):
        """Логирует ошибку."""
        log_entry = {
            'error_type': error.error_type.value,
            'message': str(error),
            'attempt': attempt,
            'context': context,
            'timestamp': time.time()
        }
        self.error_log.append(log_entry)
        print(f"Ошибка: {error.error_type.value} - {str(error)} (попытка {attempt})")

    def get_error_log(self) -> List[Dict[str, Any]]:
        """Возвращает лог ошибок."""
        return self.error_log


# Пример операции, которая может провалиться
def risky_operation() -> str:
    """Операция, которая иногда проваливается."""
    if random.random() < 0.7:  # 70% шанс ошибки
        error_type = random.choice([ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.VALIDATION_ERROR])
        raise WorkflowError(f"Симуляция {error_type.value}", error_type, retryable=error_type != ErrorType.VALIDATION_ERROR)
    return "Успех!"


class WorkflowWithErrorHandling:
    """Workflow с обработкой ошибок."""

    def __init__(self):
        self.state = WorkflowState.PENDING
        self.error_handler = ErrorHandler(RetryPolicy(max_attempts=3, base_delay=0.5))
        self.context = {'workflow_id': 'wf_error_001'}

    def process_with_retry(self) -> bool:
        """Обрабатывает workflow с retry."""
        try:
            self.state = WorkflowState.IN_PROGRESS
            print(f"Состояние: {self.state.value}")

            # Выполняем операцию с retry
            result = self.error_handler.execute_with_retry(risky_operation, self.context)
            print(f"Результат: {result}")

            self.state = WorkflowState.COMPLETED
            print(f"Финальное состояние: {self.state.value}")
            return True

        except WorkflowError as e:
            print(f"Workflow провалился: {e}")
            self.state = WorkflowState.REJECTED
            return False


# Пример использования
if __name__ == "__main__":
    workflow = WorkflowWithErrorHandling()

    success = workflow.process_with_retry()
    print(f"Workflow успешен: {success}")
    print(f"Лог ошибок: {len(workflow.error_handler.get_error_log())} записей")

    # Показать лог
    for log in workflow.error_handler.get_error_log():
        print(f"  - {log['error_type']} на попытке {log['attempt']}: {log['message']}")
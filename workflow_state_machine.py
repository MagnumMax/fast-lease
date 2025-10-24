"""
Пример класса WorkflowStateMachine с основными состояниями.
Демонстрирует базовую структуру конечного автомата для workflow системы.
"""

from enum import Enum
from typing import Dict, Callable, Any, Optional


class WorkflowState(Enum):
    """Основные состояния workflow."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class WorkflowStateMachine:
    """Класс для управления состояниями workflow."""

    def __init__(self, initial_state: WorkflowState = WorkflowState.PENDING):
        self.current_state = initial_state
        self.transitions: Dict[WorkflowState, Dict[WorkflowState, Callable[[], bool]]] = {
            WorkflowState.PENDING: {
                WorkflowState.IN_PROGRESS: lambda: True,  # Всегда можно начать
                WorkflowState.REJECTED: lambda: True,    # Можно отклонить сразу
            },
            WorkflowState.IN_PROGRESS: {
                WorkflowState.APPROVED: lambda: True,    # Можно одобрить
                WorkflowState.REJECTED: lambda: True,    # Или отклонить
                WorkflowState.PENDING: lambda: True,     # Вернуться назад
            },
            WorkflowState.APPROVED: {
                WorkflowState.COMPLETED: lambda: True,   # Завершить после одобрения
            },
            WorkflowState.REJECTED: {
                # Из отклоненного состояния нет переходов
            },
            WorkflowState.COMPLETED: {
                # Завершенное состояние финальное
            },
        }
        self.actions: Dict[WorkflowState, Callable[[], None]] = {
            WorkflowState.IN_PROGRESS: self._start_processing,
            WorkflowState.APPROVED: self._approve_workflow,
            WorkflowState.REJECTED: self._reject_workflow,
            WorkflowState.COMPLETED: self._complete_workflow,
        }

    def can_transition(self, new_state: WorkflowState) -> bool:
        """Проверяет, возможен ли переход в новое состояние."""
        if self.current_state not in self.transitions:
            return False
        return new_state in self.transitions[self.current_state]

    def transition(self, new_state: WorkflowState) -> bool:
        """Выполняет переход в новое состояние, если возможно."""
        if not self.can_transition(new_state):
            return False

        guard = self.transitions[self.current_state][new_state]
        if not guard():
            return False

        # Выполнить действие при переходе
        if new_state in self.actions:
            self.actions[new_state]()

        self.current_state = new_state
        return True

    def _start_processing(self):
        """Действие при начале обработки."""
        print(f"Начинаем обработку workflow в состоянии {self.current_state.value}")

    def _approve_workflow(self):
        """Действие при одобрении."""
        print(f"Workflow одобрен в состоянии {self.current_state.value}")

    def _reject_workflow(self):
        """Действие при отклонении."""
        print(f"Workflow отклонен в состоянии {self.current_state.value}")

    def _complete_workflow(self):
        """Действие при завершении."""
        print(f"Workflow завершен в состоянии {self.current_state.value}")


# Пример использования
if __name__ == "__main__":
    workflow = WorkflowStateMachine()
    print(f"Начальное состояние: {workflow.current_state.value}")

    workflow.transition(WorkflowState.IN_PROGRESS)
    print(f"После перехода: {workflow.current_state.value}")

    workflow.transition(WorkflowState.APPROVED)
    print(f"После одобрения: {workflow.current_state.value}")

    workflow.transition(WorkflowState.COMPLETED)
    print(f"Финальное состояние: {workflow.current_state.value}")
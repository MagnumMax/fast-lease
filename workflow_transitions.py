"""
Реализация обработки переходов с guards и actions.
Демонстрирует guards (условия) и actions (действия) при переходах состояний.
"""

from enum import Enum
from typing import Dict, Callable, Any, Optional
from workflow_state_machine import WorkflowState, WorkflowStateMachine


class TransitionGuard:
    """Класс для guards - условий перехода."""

    @staticmethod
    def has_required_data(context: Dict[str, Any]) -> bool:
        """Проверяет наличие обязательных данных."""
        return all(key in context for key in ['user_id', 'amount'])

    @staticmethod
    def is_amount_valid(context: Dict[str, Any]) -> bool:
        """Проверяет валидность суммы."""
        amount = context.get('amount', 0)
        return amount > 0 and amount <= 100000

    @staticmethod
    def is_user_authorized(context: Dict[str, Any]) -> bool:
        """Проверяет авторизацию пользователя."""
        user_role = context.get('user_role', '')
        return user_role in ['admin', 'manager']


class TransitionAction:
    """Класс для actions - действий при переходе."""

    @staticmethod
    def log_transition(old_state: WorkflowState, new_state: WorkflowState, context: Dict[str, Any]):
        """Логирует переход."""
        print(f"Переход из {old_state.value} в {new_state.value}. Контекст: {context}")

    @staticmethod
    def send_notification(recipient: str, message: str):
        """Отправляет уведомление."""
        print(f"Уведомление для {recipient}: {message}")

    @staticmethod
    def update_database(workflow_id: str, state: WorkflowState):
        """Обновляет состояние в базе данных."""
        print(f"Обновление БД: workflow {workflow_id} -> {state.value}")


class EnhancedWorkflowStateMachine(WorkflowStateMachine):
    """Расширенная версия с guards и actions."""

    def __init__(self, initial_state: WorkflowState = WorkflowState.PENDING, context: Optional[Dict[str, Any]] = None):
        super().__init__(initial_state)
        self.context = context or {}
        self.history: list[tuple[WorkflowState, WorkflowState]] = []

        # Обновляем guards
        self.transitions[WorkflowState.PENDING][WorkflowState.IN_PROGRESS] = lambda: (
            TransitionGuard.has_required_data(self.context) and
            TransitionGuard.is_user_authorized(self.context)
        )
        self.transitions[WorkflowState.IN_PROGRESS][WorkflowState.APPROVED] = lambda: (
            TransitionGuard.is_amount_valid(self.context)
        )

        # Обновляем actions
        self.actions[WorkflowState.IN_PROGRESS] = lambda: (
            TransitionAction.log_transition(self.current_state, WorkflowState.IN_PROGRESS, self.context),
            TransitionAction.send_notification(self.context.get('user_id', 'unknown'), 'Обработка начата')
        )
        self.actions[WorkflowState.APPROVED] = lambda: (
            TransitionAction.log_transition(self.current_state, WorkflowState.APPROVED, self.context),
            TransitionAction.update_database(self.context.get('workflow_id', 'unknown'), WorkflowState.APPROVED),
            TransitionAction.send_notification(self.context.get('user_id', 'unknown'), 'Одобрено')
        )

    def transition(self, new_state: WorkflowState) -> bool:
        """Переопределенный метод перехода с историей."""
        old_state = self.current_state
        if super().transition(new_state):
            self.history.append((old_state, new_state))
            return True
        return False

    def get_history(self) -> list[tuple[WorkflowState, WorkflowState]]:
        """Возвращает историю переходов."""
        return self.history


# Пример использования
if __name__ == "__main__":
    context = {
        'user_id': 'user123',
        'amount': 50000,
        'user_role': 'admin',
        'workflow_id': 'wf_001'
    }

    workflow = EnhancedWorkflowStateMachine(context=context)
    print(f"Начальное состояние: {workflow.current_state.value}")

    # Попытка перехода без данных - должна провалиться
    print("Попытка начать без данных:", workflow.transition(WorkflowState.IN_PROGRESS))

    # С данными - успешно
    print("С данными:", workflow.transition(WorkflowState.IN_PROGRESS))
    print(f"История: {[(old.value, new.value) for old, new in workflow.get_history()]}")

    # Одобрение
    workflow.transition(WorkflowState.APPROVED)
    print(f"Финальное состояние: {workflow.current_state.value}")
    print(f"Полная история: {[(old.value, new.value) for old, new in workflow.get_history()]}")
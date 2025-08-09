"""
Base Domain Classes

This module contains the base classes for domain entities and value objects
following domain-driven design principles.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4


class ValueObject(ABC):
    """Base class for value objects."""

    def __eq__(self, other: object) -> bool:
        """Value objects are equal if all their attributes are equal."""
        if not isinstance(other, self.__class__):
            return False
        return self.__dict__ == other.__dict__

    def __hash__(self) -> int:
        """Value objects must be hashable."""
        return hash(tuple(sorted(self.__dict__.items())))

    @abstractmethod
    def __str__(self) -> str:
        """String representation of the value object."""
        pass


@dataclass(frozen=True)
class DomainEvent:
    """Base class for domain events."""

    event_id: UUID
    occurred_at: datetime
    aggregate_id: str
    event_type: str
    event_data: Dict[str, Any]

    @classmethod
    def create(
        cls,
        aggregate_id: str,
        event_type: str,
        event_data: Dict[str, Any],
    ) -> "DomainEvent":
        """Create a new domain event."""
        return cls(
            event_id=uuid4(),
            occurred_at=datetime.utcnow(),
            aggregate_id=aggregate_id,
            event_type=event_type,
            event_data=event_data,
        )


class Entity(ABC):
    """Base class for domain entities."""

    def __init__(self, entity_id: str) -> None:
        self._id = entity_id
        self._domain_events: List[DomainEvent] = []
        self._created_at = datetime.utcnow()
        self._updated_at = datetime.utcnow()

    @property
    def id(self) -> str:
        """Get the entity ID."""
        return self._id

    @property
    def created_at(self) -> datetime:
        """Get creation timestamp."""
        return self._created_at

    @property
    def updated_at(self) -> datetime:
        """Get last update timestamp."""
        return self._updated_at

    @property
    def domain_events(self) -> List[DomainEvent]:
        """Get list of domain events."""
        return self._domain_events.copy()

    def clear_domain_events(self) -> None:
        """Clear domain events after they have been processed."""
        self._domain_events.clear()

    def add_domain_event(self, event: DomainEvent) -> None:
        """Add a domain event."""
        self._domain_events.append(event)

    def mark_as_updated(self) -> None:
        """Mark entity as updated."""
        self._updated_at = datetime.utcnow()

    def __eq__(self, other: object) -> bool:
        """Entities are equal if they have the same ID and type."""
        if not isinstance(other, Entity):
            return False
        return self._id == other._id and type(self) is type(other)

    def __hash__(self) -> int:
        """Entities are hashable by their ID."""
        return hash(self._id)

    @abstractmethod
    def validate(self) -> None:
        """Validate entity business rules."""
        pass


class AggregateRoot(Entity):
    """Base class for aggregate roots."""

    def __init__(self, entity_id: str) -> None:
        super().__init__(entity_id)

    @abstractmethod
    def validate_invariants(self) -> None:
        """Validate business invariants for this aggregate."""
        pass


class Repository(ABC):
    """Base repository interface."""

    @abstractmethod
    async def save(self, entity: Entity) -> None:
        """Save an entity."""
        pass

    @abstractmethod
    async def find_by_id(self, entity_id: str) -> Optional[Entity]:
        """Find an entity by ID."""
        pass

    @abstractmethod
    async def delete(self, entity_id: str) -> None:
        """Delete an entity."""
        pass


class DomainService(ABC):
    """Base class for domain services."""

    @abstractmethod
    def execute(self, *args, **kwargs) -> Any:
        """Execute the domain service operation."""
        pass


class ApplicationService(ABC):
    """Base class for application services."""

    @abstractmethod
    def handle(self, *args, **kwargs) -> Any:
        """Handle the application service request."""
        pass


# Common value objects
@dataclass(frozen=True)
class WhatsAppId(ValueObject):
    """WhatsApp ID value object."""

    value: str

    def __post_init__(self) -> None:
        if not self.value or not isinstance(self.value, str):
            msg = "WhatsApp ID must be a non-empty string"
            raise ValueError(msg)

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class MessageContent(ValueObject):
    """Message content value object."""

    text: str

    def __post_init__(self) -> None:
        if not isinstance(self.text, str):
            msg = "Message content must be a string"
            raise TypeError(msg)

    @property
    def is_empty(self) -> bool:
        """Check if message is empty."""
        return not self.text.strip()

    @property
    def length(self) -> int:
        """Get message length."""
        return len(self.text)

    def __str__(self) -> str:
        return self.text


@dataclass(frozen=True)
class TimeSlot(ValueObject):
    """Time slot value object."""

    value: str

    def __post_init__(self) -> None:
        if not self.value or not isinstance(self.value, str):
            msg = "Time slot must be a non-empty string"
            raise ValueError(msg)

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class DateValue(ValueObject):
    """Date value object."""

    value: str

    def __post_init__(self) -> None:
        if not self.value or not isinstance(self.value, str):
            msg = "Date must be a non-empty string"
            raise ValueError(msg)

    def __str__(self) -> str:
        return self.value

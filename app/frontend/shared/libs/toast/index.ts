// Toast service and router implementations centralized here
//
// Public API:
// - toastService: Main toast service with all toast methods
// - ToastRouter: React component for routing toast notifications
// - Types: MessageToastPayload, ReservationToastPayload
//
// All exports maintain backward compatibility with existing code.

export { ToastRouter } from "./toast-router";
export * from "./toast-service";

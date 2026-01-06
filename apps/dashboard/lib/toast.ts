import { toast } from 'sonner'

// Unified toast utility - all toasts use same grey styling
// No color differentiation between success/error/loading
export const notify = {
  success: (message: string) => toast(message),
  error: (message: string) => toast(message),
  loading: (message: string) => toast.loading(message),
  dismiss: toast.dismiss,
  // Promise-based toast for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => toast.promise(promise, messages),
}

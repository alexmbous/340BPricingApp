import { ApiError, NetworkError } from '@apexcare/api-client';

/** Map an unknown error thrown by our API layer to a user-readable string. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isValidationError) {
      const first = err.problem.errors?.[0];
      return first ? `${first.field || 'Input'}: ${first.message}` : 'Please review the form for errors.';
    }
    if (err.status === 401) return 'You have been signed out. Please sign in again.';
    if (err.status === 403) return 'You don’t have permission to do that.';
    if (err.status === 404) return 'We couldn’t find what you were looking for.';
    if (err.status === 409) return err.problem.detail ?? 'That item already exists.';
    return err.problem.detail ?? err.problem.title ?? 'Something went wrong.';
  }
  if (err instanceof NetworkError) {
    return 'Network error. Check your connection and try again.';
  }
  return 'Something unexpected happened. Please try again.';
}

// RFC 7807 Problem Details for HTTP APIs
export interface ProblemDetails {
  type: string; // URI identifier for the error class
  title: string; // short human summary
  status: number; // http status
  detail?: string; // human-readable explanation
  instance?: string; // URI reference to the specific occurrence
  // Extensions
  code?: string; // stable machine-readable error code
  errors?: FieldError[]; // when status === 400 (validation)
  traceId?: string;
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

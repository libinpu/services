type LogCategory =
  | 'LOCATION_PERMISSION'
  | 'GPS_STATUS'
  | 'LOCATION_UPDATE'
  | 'LOCATION_UPLOAD'
  | 'REALTIME_LOCATION_RECEIVED'
  | 'DISTANCE_CALCULATION'
  | 'ARRIVAL_DETECTED'
  | 'OTP_REQUEST'
  | 'OTP_VERIFICATION'
  | 'JOB_STATE_CHANGE'
  | 'LOCATION_SERVICE_STARTED'
  | 'LOCATION_SERVICE_STOPPED';

/** Structured debug logs — never log tokens, raw OTP, or PII. */
export function trackingLog(category: LogCategory, message: string, meta?: Record<string, unknown>) {
  if (__DEV__) {
    const payload = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${category}] ${message}${payload}`);
  }
}

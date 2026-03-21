const MAX_INTAKE_SKEW_SECONDS = 15 * 60;

export function isIntakeTimestampFresh(timestamp: number, now = Math.floor(Date.now() / 1000)) {
  return Math.abs(now - timestamp) <= MAX_INTAKE_SKEW_SECONDS;
}

export function getIntakeMaxSkewSeconds() {
  return MAX_INTAKE_SKEW_SECONDS;
}

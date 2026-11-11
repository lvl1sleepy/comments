const MAX_BIGINT = 9223372036854775807n;

export function isValidId(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && id.length <= 19 && BigInt(id) <= MAX_BIGINT;
}

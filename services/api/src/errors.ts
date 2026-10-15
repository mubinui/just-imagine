import type { ApiError } from '@just-imagine/protocol';
export class ApiFault extends Error {
  constructor(
    public status: number,
    public code: ApiError['error']['code'],
    message: string,
  ) {
    super(message);
  }
}

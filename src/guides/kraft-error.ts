export class KraftError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly technicalDetails?: unknown,
  ) {
    super(userMessage);
    this.name = 'KraftError';
  }
}

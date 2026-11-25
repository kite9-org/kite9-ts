export interface Logable {
  readonly prefix: string | null;
  readonly isLoggingEnabled: boolean;
}

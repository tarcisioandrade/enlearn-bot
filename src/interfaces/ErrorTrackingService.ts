export type ErrorName = "UNHANDLED_EXCEPTION" | "UNHANDLED_REJECTION";

export type ErrorBody = {
  message: string;
};

export interface IErrorTrackingService {
  log: (name: ErrorName, body: ErrorBody) => Promise<void>;
}

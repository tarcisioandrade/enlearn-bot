import axios from "axios";
import { ErrorBody, ErrorName, IErrorTrackingService } from "../interfaces/ErrorTrackingService";
import { env } from "../env";

const instance = axios.create({
  baseURL: "https://events.baselime.io/v1",
  headers: {
    "x-api-key": env.X_API_KEY,
    "Content-Type": "application/json",
  },
});

export class ErrorTrackingService implements IErrorTrackingService {
  public async log(name: ErrorName, body: ErrorBody) {
    await instance.post("/logs", { name, ...body });
  }
}

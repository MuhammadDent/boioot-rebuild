import { api } from "@/lib/api";
import type { SubmitRequestPayload, RequestResponse } from "@/types";

export const requestsApi = {
  /**
   * Submit a public inquiry/lead for a property or project.
   * POST /api/requests — no authentication required.
   */
  submit(data: SubmitRequestPayload): Promise<RequestResponse> {
    return api.post("/requests", data);
  },
};

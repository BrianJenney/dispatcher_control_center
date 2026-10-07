import { z } from "zod";
import { getSuggestions } from "@/server/queries/suggestions";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({
  access: "signed-in",
  read: async ({ params }) => {
    const id = z.uuid().safeParse(params.id);
    return id.success ? getSuggestions(id.data) : null;
  },
});

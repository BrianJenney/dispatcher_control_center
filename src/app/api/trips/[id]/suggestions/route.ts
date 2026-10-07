import { getSuggestions } from "@/server/queries/suggestions";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({
  access: "signed-in",
  read: ({ params }) => getSuggestions(params.id),
});

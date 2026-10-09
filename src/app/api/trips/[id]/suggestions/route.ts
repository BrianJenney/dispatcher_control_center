import { getSuggestions } from "@/server/queries/suggestions";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({
  read: ({ params }) => getSuggestions(params.id),
});

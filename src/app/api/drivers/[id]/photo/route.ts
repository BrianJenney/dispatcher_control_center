import { z } from "zod";
import { getDriverPhoto } from "@/server/queries/people";
import { fileRoute } from "@/server/route";

export const GET = fileRoute({
  read: async (params) => {
    const id = z.uuid().safeParse(params.id);
    return id.success ? getDriverPhoto(id.data) : null;
  },
});

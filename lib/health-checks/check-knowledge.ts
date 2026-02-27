import type { HealthCheck, CheckContext } from "./types";
import { pass, warn, fail } from "./types";

const CAT = "Knowledge Bank";

export const checkKnowledge: HealthCheck = {
  category: CAT,
  order: 6,
  async run({ client, supabase }: CheckContext) {
    const { data: entries, error } = await supabase
      .from("knowledge_entries")
      .select("id")
      .eq("client_id", client.id as string);

    if (error) return [fail(CAT, "kb.fetch", "Knowledge Bank", `Error: ${error.message}`)];

    if (!entries || entries.length === 0) {
      return [warn(CAT, "kb.empty", "Knowledge Bank", "No entries -- autofill will have no context")];
    }

    return [pass(CAT, "kb.entries", "Knowledge Bank", `${entries.length} entries`)];
  },
};

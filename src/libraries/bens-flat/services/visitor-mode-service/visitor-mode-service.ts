import { TServiceParams } from "@digital-alchemy/core";
import { mdi } from "../icons.ts";

export function VisitorModeService({ synapse, context }: TServiceParams) {
  const visitorMode = synapse.switch({
    name: "Visitor Mode",
    suggested_object_id: "visitor_mode",
    icon: mdi.account,
    context,
  });

  return { visitorMode };
}

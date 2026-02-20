import { TServiceParams } from "@digital-alchemy/core";

export function VisitorModeService({ synapse, context }: TServiceParams) {
  const visitorMode = synapse.switch({
    name: "Visitor Mode",
    suggested_object_id: "visitor_mode",
    context,
  });

  return { visitorMode };
}

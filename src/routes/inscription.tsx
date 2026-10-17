import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/inscription")({
  beforeLoad: () => { throw redirect({ to: "/auth", search: { mode: "inscription" } }); },
});

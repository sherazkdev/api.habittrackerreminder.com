import { SwaggerConsole } from "@/components/docs/swagger-console";

export default function PublicDocsPage() {
  return (
    <SwaggerConsole
      specUrl="/api/v1/openapi.json?audience=public"
      title="Public & mobile API"
      subtitle="Health, discovery, habit reminders, and devices. Use a Firebase Bearer token, or an admin key plus x-user-id."
    />
  );
}

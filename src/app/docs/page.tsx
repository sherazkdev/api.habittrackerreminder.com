import { SwaggerConsole } from "@/components/docs/swagger-console";

export default function DocsPage() {
  return (
    <SwaggerConsole
      specUrl="/api/v1/openapi.json"
      title="API documentation"
      subtitle="Authorize with Bearer JWT or x-api-key. Devices need only the key plus body fcm_token — no x-user-id."
    />
  );
}

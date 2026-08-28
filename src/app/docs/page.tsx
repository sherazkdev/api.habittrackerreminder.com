import { SwaggerConsole } from "@/components/docs/swagger-console";

export default function DocsPage() {
  return (
    <SwaggerConsole
      specUrl="/api/v1/openapi.json"
      title="API documentation"
      subtitle="Try every route here. Click Authorize and add a Bearer JWT from login, or an x-api-key from Settings → API Keys."
    />
  );
}

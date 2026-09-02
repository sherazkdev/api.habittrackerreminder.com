import { SwaggerConsole } from "@/components/docs/swagger-console";

export default function DocsPage() {
  return (
    <SwaggerConsole
      specUrl="/api/v1/openapi.json"
      title="API documentation"
      subtitle="Admin: Bearer JWT or x-api-key. Mobile devices: x-api-key + fcmToken. Reminders: x-api-key + x-fcm-token. Cron sends the push later."
    />
  );
}

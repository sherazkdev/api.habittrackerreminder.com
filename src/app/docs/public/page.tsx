import { SwaggerConsole } from "@/components/docs/swagger-console";

export default function PublicDocsPage() {
  return (
    <SwaggerConsole
      specUrl="/api/v1/openapi.json?audience=public"
      title="Public & mobile API"
      subtitle="Devices: x-api-key + fcmToken. Reminders: x-api-key + x-fcm-token. Cron sends the push at the scheduled time."
    />
  );
}

import { SwaggerConsole } from "@/components/docs/swagger-console";

export default function PublicDocsPage() {
  return (
    <SwaggerConsole
      specUrl="/api/v1/openapi.json?audience=public"
      title="Public & mobile API"
      subtitle="Devices save the FCM token only (Firebase Bearer or x-api-key + fcm_token). Reminder POST saves the schedule — cron sends the push later."
    />
  );
}

"use client";

import { useCallback, useState } from "react";
import {
  FcmDeliveryChart,
  FcmDeliveryFlow,
  FcmOverviewSidebar,
  FcmRecentDeliveriesTable,
} from "@/components/notifications/fcm-overview-panels";
import { SecondaryButton } from "@/components/ui/buttons";
import { EmptyState, SkeletonState, StatCard } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api-client";
import {
  fetchFcmOverviewAdmin,
  formatDeliveryTime,
  sendFcmTestNotificationAdmin,
  shortUid,
  type FcmOverviewResponse,
} from "@/lib/fcm-overview-api";
import { useDeferredEffect } from "@/lib/use-deferred-effect";

export default function FcmOverviewPage() {
  const [data, setData] = useState<FcmOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [testToken, setTestToken] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchFcmOverviewAdmin());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load FCM overview");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useDeferredEffect(() => {
    void loadData();
  }, [loadData]);

  const handleTestSend = async () => {
    if (!testToken.trim()) return;
    setTestSending(true);
    setTestMessage("");
    try {
      const result = await sendFcmTestNotificationAdmin(testToken.trim());
      setTestMessage(
        result.successCount > 0
          ? "Test notification sent successfully."
          : result.error || "Send failed — check the FCM token.",
      );
      setTestToken("");
      setTestOpen(false);
      void loadData(true);
    } catch (err) {
      setTestMessage(err instanceof ApiError ? err.message : "Failed to send test notification");
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return <SkeletonState rows={8} />;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Could not load FCM overview"
        description={error || "Unknown error"}
        action={
          <SecondaryButton onClick={() => void loadData()}>Retry</SecondaryButton>
        }
      />
    );
  }

  const { stats, flow, chart, recentDeliveries, activity, system } = data;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[18px] font-semibold leading-7 tracking-tight">FCM Overview</h1>
            <p className="text-[13px] leading-5 text-[var(--text-muted)]">
              Monitor push notification delivery and system health.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setTestOpen((open) => !open)}>
              Send test notification
            </SecondaryButton>
            <SecondaryButton onClick={() => void loadData(true)} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh data"}
            </SecondaryButton>
          </div>
        </div>

        {testOpen ? (
          <div className="mb-4 rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <p className="mb-2 text-[13px] font-medium leading-5">Send test push</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={testToken}
                onChange={(event) => setTestToken(event.target.value)}
                placeholder="Paste FCM device token"
                className="h-9 min-w-0 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--bright-purple)]"
              />
              <SecondaryButton onClick={() => void handleTestSend()} disabled={testSending || !testToken.trim()}>
                {testSending ? "Sending…" : "Send"}
              </SecondaryButton>
            </div>
          </div>
        ) : null}

        {testMessage ? (
          <p className="mb-4 text-[13px] text-[var(--text-secondary)]">{testMessage}</p>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Registered Devices"
            value={stats.registeredDevices}
            hint={`${stats.activeDevices} active`}
          />
          <StatCard
            label="Active Reminders"
            value={stats.activeReminders}
            tone="purple"
            hint={`${stats.enabledReminderPercent}% enabled`}
          />
          <StatCard
            label="Sent Today"
            value={stats.sentToday}
            tone="green"
            hint={`${stats.deliveryRatePercent}% delivery rate`}
          />
          <StatCard
            label="Failed Today"
            value={stats.failedToday}
            hint={`${stats.failureRatePercent}% failure rate`}
          />
        </div>

        <section className="mb-4 rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <h2 className="mb-3 text-[13px] font-semibold leading-5">Notification Delivery Flow</h2>
          <FcmDeliveryFlow flow={flow} />
        </section>

        <section className="mb-4 rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold leading-5">Delivery Performance</h2>
            <span className="text-[11px] text-[var(--text-muted)]">Last 7 days</span>
          </div>
          <div className="h-[220px] w-full">
            <FcmDeliveryChart data={chart} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--bright-purple)]" />
              Delivered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--bright-red)]" />
              Failed
            </span>
          </div>
        </section>

        <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[13px] font-semibold leading-5">Recent Deliveries</h2>
          </div>
          <FcmRecentDeliveriesTable
            rows={recentDeliveries}
            shortUid={shortUid}
            formatTime={formatDeliveryTime}
          />
        </section>
      </div>

      <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[300px]">
        <FcmOverviewSidebar activity={activity} system={system} />
      </aside>
    </div>
  );
}

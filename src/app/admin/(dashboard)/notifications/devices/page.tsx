"use client";

import { useCallback, useState } from "react";
import { DevicesAnalyticsPanel } from "@/components/notifications/devices-analytics";
import { DangerButton, GhostButton, SecondaryButton } from "@/components/ui/buttons";
import { ConfirmDeleteModal, EmptyState, SkeletonState, StatCard } from "@/components/ui/feedback";
import { SearchInput, Select } from "@/components/ui/fields";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api-client";
import {
  deleteDeviceAdmin,
  fetchDevicesAdmin,
  fetchDevicesSummaryAdmin,
  formatRelativeTime,
  shortUid,
  type DeviceFilters,
  type DeviceListResponse,
  type DeviceRow,
  type DeviceSummaryResponse,
} from "@/lib/devices-api";
import { sendFcmTestNotificationAdmin } from "@/lib/fcm-overview-api";
import { useDeferredEffect } from "@/lib/use-deferred-effect";

export default function DevicesPage() {
  const [summary, setSummary] = useState<DeviceSummaryResponse | null>(null);
  const [list, setList] = useState<DeviceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<DeviceFilters["platform"] | "">("");
  const [status, setStatus] = useState<DeviceFilters["status"] | "">("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<DeviceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [testingId, setTestingId] = useState("");

  const filters: DeviceFilters = {
    search: search.trim() || undefined,
    platform: platform || undefined,
    status: status || undefined,
    page,
    limit: 20,
  };

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [nextSummary, nextList] = await Promise.all([
        fetchDevicesSummaryAdmin(),
        fetchDevicesAdmin(filters),
      ]);
      setSummary(nextSummary);
      setList(nextList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load devices");
      if (!silent) {
        setSummary(null);
        setList(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // Filters are read from the latest render when this callback is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, platform, status, page]);

  useDeferredEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteDeviceAdmin(pendingDelete.id);
      setActionMessage(`Removed token ${pendingDelete.fcmTokenMasked}`);
      setPendingDelete(null);
      await loadData(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove device");
    } finally {
      setDeleting(false);
    }
  };

  const handleTest = async (row: DeviceRow) => {
    setTestingId(row.id);
    setActionMessage("");
    try {
      const result = await sendFcmTestNotificationAdmin(row.fcmToken);
      setActionMessage(
        result.successCount > 0
          ? `Test push sent to ${row.fcmTokenMasked}`
          : result.error || "Test push failed — check the FCM token.",
      );
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : "Failed to send test notification");
    } finally {
      setTestingId("");
    }
  };

  if (loading && !list) {
    return <SkeletonState rows={8} />;
  }

  if ((error && !list) || !summary || !list) {
    return (
      <EmptyState
        title="Could not load devices"
        description={error || "Unknown error"}
        action={<SecondaryButton onClick={() => void loadData()}>Retry</SecondaryButton>}
      />
    );
  }

  const { stats, analytics } = summary;
  const { items, pagination } = list;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[18px] font-semibold leading-7 tracking-tight">Registered Devices</h1>
            <p className="text-[13px] leading-5 text-[var(--text-muted)]">
              FCM tokens registered by the mobile app. Tokens stay masked in the table.
            </p>
          </div>
          <SecondaryButton onClick={() => void loadData(true)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh data"}
          </SecondaryButton>
        </div>

        {error ? <p className="mb-4 text-[13px] text-[var(--bright-red)]">{error}</p> : null}
        {actionMessage ? <p className="mb-4 text-[13px] text-[var(--text-secondary)]">{actionMessage}</p> : null}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total devices" value={stats.total} hint={`${stats.activePercent}% active`} />
          <StatCard label="Active" value={stats.active} tone="green" hint="Seen in the last 7 days" />
          <StatCard label="Stale" value={stats.stale} hint="No update in 7 days" />
          <StatCard
            label="Platforms"
            value={`${stats.android} / ${stats.ios}`}
            tone="purple"
            hint={`${stats.unknown} unknown`}
          />
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            className="w-full sm:max-w-[240px]"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search user or token"
          />
          <Select
            className="sm:w-[140px]"
            value={platform}
            onChange={(event) => {
              setPlatform(event.target.value as DeviceFilters["platform"] | "");
              setPage(1);
            }}
          >
            <option value="">All platforms</option>
            <option value="android">Android</option>
            <option value="ios">iOS</option>
          </Select>
          <Select
            className="sm:w-[140px]"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DeviceFilters["status"] | "");
              setPage(1);
            }}
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="stale">Stale</option>
          </Select>
        </div>

        <section className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)]">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[var(--text-muted)]">
              No devices match these filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full text-left text-[13px] leading-5">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">Token</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last seen</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-4 py-3">
                        <code className="text-[12px]">{shortUid(row.firebaseUid)}</code>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.platform}</td>
                      <td className="px-4 py-3">
                        <code className="text-[12px]">{row.fcmTokenMasked}</code>
                      </td>
                      <td className="px-4 py-3">
                        <DeviceStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                        {formatRelativeTime(row.lastSeenAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <GhostButton
                            type="button"
                            disabled={testingId === row.id}
                            onClick={() => void handleTest(row)}
                          >
                            {testingId === row.id ? "Sending…" : "Test"}
                          </GhostButton>
                          <DangerButton type="button" onClick={() => setPendingDelete(row)}>
                            <Icon name="trash" size={14} />
                            Remove
                          </DangerButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-[12px] text-[var(--text-muted)]">
              <span>
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} devices
              </span>
              <div className="flex gap-2">
                <SecondaryButton
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </SecondaryButton>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[300px]">
        <DevicesAnalyticsPanel stats={stats} analytics={analytics} />
      </aside>

      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        resource="device token"
        name={pendingDelete ? `${shortUid(pendingDelete.firebaseUid)} · ${pendingDelete.fcmTokenMasked}` : undefined}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

function DeviceStatusBadge({ status }: { status: "active" | "stale" }) {
  const active = status === "active";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] leading-[18px]">
      <span
        className="size-1.5 rounded-full"
        style={{ background: active ? "var(--status-active)" : "var(--status-inactive)" }}
      />
      {active ? "Active" : "Stale"}
    </span>
  );
}

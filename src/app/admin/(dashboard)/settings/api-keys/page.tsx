"use client";

import { useCallback, useState } from "react";
import { FormField, TextInput } from "@/components/ui/fields";
import { DangerButton, PrimaryButton, SecondaryButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api-client";
import { createApiKey, fetchApiKeys, revokeApiKey, type ApiKeyItem } from "@/lib/api-keys-api";
import { useDeferredEffect } from "@/lib/use-deferred-effect";

export default function ApiKeysPage() {
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [name, setName] = useState("");
  const [createdToken, setCreatedToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchApiKeys();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Access</p>
        <h1 className="text-[22px] font-semibold leading-8 tracking-tight">API keys</h1>
        <p className="mt-1 max-w-xl text-[13px] leading-5 text-[var(--text-muted)]">
          Use <code>x-api-key</code> in Swagger or scripts. Admin login still uses a Bearer JWT.
        </p>
      </div>

      <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-3 text-[14px] font-semibold">Create a key</h2>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setSaving(true);
            setError("");
            void (async () => {
              try {
                const key = await createApiKey(name.trim());
                setCreatedToken(key.token);
                setName("");
                await load();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not create key.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        >
          <FormField label="Name" className="min-w-0 flex-1" required>
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Swagger local"
            />
          </FormField>
          <PrimaryButton type="submit" loading={saving} className="h-9 sm:mt-7">
            Generate key
          </PrimaryButton>
        </form>
        {createdToken ? (
          <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-[var(--black-05)] p-3">
            <p className="mb-1 text-[12px] text-[var(--text-muted)]">Copy now — this secret is shown once.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all text-[12px]">{createdToken}</code>
              <SecondaryButton
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(createdToken);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Icon name="copy" size={14} />
                {copied ? "Copied" : "Copy"}
              </SecondaryButton>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-[13px] text-[var(--bright-red)]">{error}</p> : null}

      <section className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)]">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-[14px] font-semibold">Your keys</h2>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-[13px] text-[var(--text-muted)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-8 text-[13px] text-[var(--text-muted)]">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[14px] font-medium">{item.name}</p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    {item.prefix}… · {item.isActive ? "Active" : "Revoked"}
                    {item.lastUsedAt ? ` · last used ${new Date(item.lastUsedAt).toLocaleString()}` : ""}
                  </p>
                </div>
                {item.isActive ? (
                  <DangerButton
                    type="button"
                    onClick={() => {
                      void (async () => {
                        try {
                          await revokeApiKey(item.id);
                          await load();
                        } catch (err) {
                          setError(err instanceof ApiError ? err.message : "Could not revoke key.");
                        }
                      })();
                    }}
                  >
                    Revoke
                  </DangerButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Health = { status?: string; version?: string };
type Ready = { status?: string; mongo?: boolean; firebase?: boolean };

export default function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    void fetch("/health")
      .then((res) => res.json())
      .then((json) => setHealth(json.data ?? json))
      .catch(() => setHealth({ status: "offline" }));
    void fetch("/ready")
      .then((res) => res.json())
      .then((json) => setReady(json.data ?? json))
      .catch(() => setReady({ status: "offline" }));
  }, []);

  const live = mounted && health?.status === "ok";

  return (
    <div className="wl-page-scroll h-full overflow-y-auto bg-[var(--page-bg)]">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full bg-[var(--pastel-blue)] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-24 size-[360px] rounded-full bg-[var(--pastel-purple)] opacity-70 blur-3xl" />

        <header className="relative mx-auto flex max-w-[1100px] items-center justify-between px-5 py-5 md:px-8">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
              <Icon name="leaf" size={16} />
            </span>
            <span className="text-[14px] font-semibold">Habit Tracker</span>
          </div>
          <nav className="flex items-center gap-2 text-[13px]">
            <Link href="/docs" className="rounded-[8px] px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
              Swagger
            </Link>
            <Link href="/docs/public" className="hidden rounded-[8px] px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] sm:inline">
              Public API
            </Link>
            <Link href="/admin/login" className="rounded-[8px] bg-[var(--text-primary)] px-3 py-1.5 text-[var(--page-bg)]">
              Admin login
            </Link>
          </nav>
        </header>

        <main className="relative mx-auto max-w-[1100px] px-5 pb-20 pt-10 md:px-8 md:pt-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--card-bg)] px-3 py-1 text-[12px] text-[var(--text-secondary)]">
              <span className={`size-1.5 rounded-full ${live ? "bg-[var(--status-active)]" : "bg-[var(--bright-orange)]"}`} />
              {live ? "API online" : "Checking API…"}
              {health?.version ? ` · v${health.version}` : ""}
            </p>
            <h1 className="typo-display mt-4 text-[var(--text-primary)]">
              Server reminders that actually reach the phone.
            </h1>
            <p className="typo-lead mt-4 text-[var(--text-muted)]">
              Schedule habits on the backend, push through Firebase Cloud Messaging, and watch delivery
              analytics in a calm admin console.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/admin/login"
                className="inline-flex h-10 items-center rounded-[10px] bg-[var(--text-primary)] px-4 text-[14px] text-[var(--page-bg)]"
              >
                Open admin
              </Link>
              <Link
                href="/docs"
                className="inline-flex h-10 items-center rounded-[10px] border border-[var(--border)] px-4 text-[14px]"
              >
                Try APIs in Swagger
              </Link>
            </div>
          </div>

          <section className="mt-14 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: "broadcast" as const, title: "FCM delivery", body: "High-priority pushes with dead-token cleanup." },
              { icon: "lock" as const, title: "Two ways in", body: "Bearer JWT for the website. x-api-key for Swagger and scripts." },
              { icon: "heartbeat" as const, title: "Live health", body: `Mongo ${ready?.mongo ? "ready" : "…"} · Firebase ${ready?.firebase ? "configured" : "…"}` },
            ].map((card) => (
              <article key={card.title} className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
                <span className="mb-3 flex size-8 items-center justify-center rounded-full bg-[var(--pastel-purple)] text-[var(--static-black)]">
                  <Icon name={card.icon} size={15} />
                </span>
                <h2 className="text-[14px] font-semibold">{card.title}</h2>
                <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{card.body}</p>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-[20px] border border-[var(--border)] bg-[var(--card-bg)] p-5 md:p-7">
            <h2 className="text-[16px] font-semibold">Authorize either way</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              Swagger has both schemes. Admin pages keep using the login token.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-[14px] bg-[var(--black-05)] p-4">
                <p className="text-[12px] font-medium text-[var(--text-muted)]">Authorization</p>
                <code className="mt-1 block text-[13px]">Bearer &lt;accessToken&gt;</code>
              </div>
              <div className="rounded-[14px] bg-[var(--black-05)] p-4">
                <p className="text-[12px] font-medium text-[var(--text-muted)]">x-api-key</p>
                <code className="mt-1 block text-[13px]">htk_…</code>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

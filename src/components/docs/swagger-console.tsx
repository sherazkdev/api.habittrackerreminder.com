"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => void;
  }
}

export function SwaggerConsole({
  specUrl,
  title,
  subtitle,
}: {
  specUrl: string;
  title: string;
  subtitle: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    const cssId = "swagger-ui-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css";
      document.head.appendChild(link);
    }

    const boot = () => {
      if (!window.SwaggerUIBundle || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      window.SwaggerUIBundle({
        url: specUrl,
        domNode: hostRef.current,
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        deepLinking: true,
        defaultModelsExpandDepth: 0,
        syntaxHighlight: { theme: "monokai" },
      });
    };

    if (window.SwaggerUIBundle) {
      boot();
      return;
    }

    const existing = document.getElementById("swagger-ui-bundle") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", boot);
      return () => existing.removeEventListener("load", boot);
    }

    const script = document.createElement("script");
    script.id = "swagger-ui-bundle";
    script.src = "https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js";
    script.onload = boot;
    document.body.appendChild(script);
  }, [specUrl]);

  return (
    <div className="wl-page-scroll h-full overflow-y-auto bg-[var(--page-bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--page-bg)]/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] text-[var(--text-muted)]">Habit Tracker</p>
            <h1 className="text-[18px] font-semibold leading-7">{title}</h1>
            <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--text-muted)]">{subtitle}</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-[13px]">
            <Link href="/" className="rounded-[8px] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-hover)]">
              Home
            </Link>
            <Link href="/docs" className="rounded-[8px] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-hover)]">
              Admin docs
            </Link>
            <Link href="/docs/public" className="rounded-[8px] border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--surface-hover)]">
              Public docs
            </Link>
            <Link href="/admin/login" className="rounded-[8px] bg-[var(--text-primary)] px-3 py-1.5 text-[var(--page-bg)]">
              Admin
            </Link>
          </nav>
        </div>
        <div className="mx-auto mt-3 flex max-w-[1100px] flex-wrap gap-2 text-[12px]">
          <span className="rounded-full bg-[rgb(149_164_252/0.16)] px-2.5 py-1 text-[var(--text-secondary)]">
            Authorize → Bearer JWT
          </span>
          <span className="rounded-full bg-[rgb(161_227_203/0.2)] px-2.5 py-1 text-[var(--text-secondary)]">
            Authorize → x-api-key
          </span>
        </div>
      </header>
      <div className="swagger-wrap mx-auto max-w-[1100px] px-2 pb-16">
        <div ref={hostRef} />
      </div>
      <style jsx global>{`
        .swagger-ui { font-family: inherit; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 16px 0; }
        .swagger-ui .scheme-container {
          background: var(--card-bg);
          box-shadow: none;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .swagger-ui .btn.authorize { border-color: var(--bright-purple); color: var(--text-primary); }
      `}</style>
    </div>
  );
}

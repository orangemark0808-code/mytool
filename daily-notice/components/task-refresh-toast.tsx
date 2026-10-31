"use client";
import { Check, AlertCircle, RefreshCw, X } from "lucide-react";
import type { RefreshNotice } from "@/hooks/use-task-refresh";

export function TaskRefreshToast({ notice, connect, retry, dismiss }: {
  notice: RefreshNotice | null; connect: () => void; retry: () => void; dismiss: () => void;
}) {
  if (!notice) return null;
  const Icon = notice.kind === "success" ? Check : notice.kind === "loading" ? RefreshCw : AlertCircle;
  return <div className="task-toast" role={notice.kind === "error" ? "alert" : "status"} aria-live={notice.kind === "error" ? "assertive" : "polite"} aria-atomic="true">
    <Icon size={18} strokeWidth={2} aria-hidden="true" />
    <p>{notice.text}</p>
    {notice.kind === "auth" && <button type="button" className="toast-action" onClick={connect}>接続する</button>}
    {notice.kind === "error" && <button type="button" className="toast-action" onClick={retry}>再試行</button>}
    {notice.kind !== "loading" && <button type="button" className="toast-dismiss" aria-label="通知を閉じる" onClick={dismiss}><X size={16} aria-hidden="true" /></button>}
  </div>;
}

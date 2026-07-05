"use client";

import { useState, useTransition } from "react";
import { refreshSpotify } from "@/app/actions";

export function SpotifyRefreshButton({ artistId }: { artistId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        className="btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await refreshSpotify(artistId);
            setMsg({ ok: r.ok, text: r.message });
          })
        }
      >
        {pending ? "Refreshing…" : "Refresh from Spotify"}
      </button>
      {msg && (
        <span className={`text-xs ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</span>
      )}
    </div>
  );
}

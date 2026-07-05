"use client";

import { useRef, useTransition } from "react";
import { PLATFORM, SIGNAL_TYPE } from "@/lib/constants";
import { addNote, addContact, addLink, addSignal, saveMetricSnapshot } from "@/app/actions";

const PLATFORM_FIELDS: Record<string, { key: string; label: string }[]> = {
  SPOTIFY: [
    { key: "followers", label: "Followers" },
    { key: "monthlyListeners", label: "Monthly Listeners" },
    { key: "catalogStreams", label: "Catalog streams (24h)" },
  ],
  TIKTOK: [
    { key: "followers", label: "Followers" },
    { key: "totalLikes", label: "Total likes" },
    { key: "avgRecentPostViews", label: "Avg views (last 5)" },
    { key: "avgRecentPostLikes", label: "Avg likes (last 5)" },
    { key: "ugcCreates", label: "UGC creates / day" },
  ],
  INSTAGRAM: [
    { key: "followers", label: "Followers" },
    { key: "avgRecentPostViews", label: "Avg reel views (last 5)" },
    { key: "avgRecentPostLikes", label: "Avg reel likes (last 5)" },
  ],
};

export function MetricForm({ artistId }: { artistId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {(["SPOTIFY", "TIKTOK", "INSTAGRAM"] as const).map((platform) => (
        <form
          key={platform}
          action={(fd) => start(() => saveMetricSnapshot(artistId, platform, fd))}
          className="card p-4 space-y-2"
        >
          <div className="font-medium text-sm">{platform}</div>
          {PLATFORM_FIELDS[platform].map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input name={f.key} inputMode="numeric" className="input" placeholder="0" />
            </div>
          ))}
          <button className="btn-primary w-full justify-center" disabled={pending}>
            Save today&apos;s {platform.toLowerCase()}
          </button>
        </form>
      ))}
    </div>
  );
}

export function NoteForm({ artistId }: { artistId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          await addNote(artistId, (fd.get("text") as string) || "", "MANUAL");
          ref.current?.reset();
        })
      }
      className="flex gap-2"
    >
      <input name="text" className="input" placeholder="Add a note…" />
      <button className="btn-primary" disabled={pending}>
        Add
      </button>
    </form>
  );
}

export function LinkForm({ artistId }: { artistId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          await addLink(artistId, fd.get("platform") as string, (fd.get("url") as string) || "");
          ref.current?.reset();
        })
      }
      className="flex gap-2"
    >
      <select name="platform" className="input max-w-[140px]">
        {PLATFORM.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input name="url" className="input" placeholder="https://…" />
      <button className="btn-primary" disabled={pending}>
        Add
      </button>
    </form>
  );
}

export function SignalForm({ artistId }: { artistId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          await addSignal(
            artistId,
            fd.get("type") as string,
            (fd.get("description") as string) || "",
            (fd.get("sourceUrl") as string) || undefined
          );
          ref.current?.reset();
        })
      }
      className="flex flex-wrap gap-2"
    >
      <select name="type" className="input max-w-[180px]">
        {SIGNAL_TYPE.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <input name="description" className="input flex-1 min-w-[200px]" placeholder="What happened?" />
      <input name="sourceUrl" className="input max-w-[220px]" placeholder="Source URL (optional)" />
      <button className="btn-primary" disabled={pending}>
        Add signal
      </button>
    </form>
  );
}

export function ContactForm({ artistId }: { artistId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const fields = ["name", "role", "company", "email", "phone", "socialLink"];
  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          await addContact(artistId, fd);
          ref.current?.reset();
        })
      }
      className="grid sm:grid-cols-2 gap-2"
    >
      {fields.map((f) => (
        <input key={f} name={f} className="input" placeholder={f} />
      ))}
      <button className="btn-primary sm:col-span-2" disabled={pending}>
        Add contact
      </button>
    </form>
  );
}

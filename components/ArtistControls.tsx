"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ARTIST_STATUS, UNSIGNED_STATUS } from "@/lib/constants";
import {
  updateArtistStatus,
  updateUnsignedStatus,
  recalcOne,
  deleteArtist,
} from "@/app/actions";

export function ArtistControls({
  artistId,
  status,
  unsignedStatus,
}: {
  artistId: string;
  status: string;
  unsignedStatus: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input max-w-[180px]"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => start(() => updateArtistStatus(artistId, e.target.value))}
      >
        {ARTIST_STATUS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <select
        className="input max-w-[200px]"
        defaultValue={unsignedStatus}
        disabled={pending}
        onChange={(e) => start(() => updateUnsignedStatus(artistId, e.target.value))}
      >
        {UNSIGNED_STATUS.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <button
        className="btn-ghost"
        disabled={pending}
        onClick={() => start(() => recalcOne(artistId))}
      >
        Recalculate score
      </button>
      <button
        className="btn-ghost text-rose-300"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this artist and all their data?"))
            start(async () => {
              await deleteArtist(artistId);
              router.push("/artists");
            });
        }}
      >
        Delete
      </button>
    </div>
  );
}

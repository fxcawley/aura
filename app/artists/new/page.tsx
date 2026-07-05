import { redirect } from "next/navigation";
import { createArtist } from "@/app/actions";
import { ARTIST_STATUS, UNSIGNED_STATUS } from "@/lib/constants";

export default function NewArtistPage() {
  async function action(formData: FormData) {
    "use server";
    const id = await createArtist(formData);
    redirect(`/artists/${id}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Add Artist</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Manual lead entry for artists not picked up by scraping (V1 = manual only).
      </p>

      <form action={action} className="card p-6 space-y-5">
        <div>
          <label className="label">Artist name *</label>
          <input name="name" required className="input" placeholder="e.g. Jane Doe" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Location</label>
            <input name="location" className="input" placeholder="London, UK" />
          </div>
          <div>
            <label className="label">Genre</label>
            <input name="genre" className="input" placeholder="Indie pop" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Spotify URL</label>
            <input name="spotifyUrl" className="input" placeholder="https://open.spotify.com/artist/…" />
          </div>
          <div>
            <label className="label">TikTok URL</label>
            <input name="tiktokUrl" className="input" placeholder="https://tiktok.com/@…" />
          </div>
          <div>
            <label className="label">Instagram URL</label>
            <input name="instagramUrl" className="input" placeholder="https://instagram.com/…" />
          </div>
          <div>
            <label className="label">YouTube URL</label>
            <input name="youtubeUrl" className="input" placeholder="https://youtube.com/@…" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue="NEW_LEAD">
              {ARTIST_STATUS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unsigned status</label>
            <select name="unsignedStatus" className="input" defaultValue="UNKNOWN">
              {UNSIGNED_STATUS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">P/C line (for unsigned check)</label>
          <input name="pcLine" className="input" placeholder="© 2024 Artist Name" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Initial priority score override</label>
            <input name="priorityScore" inputMode="numeric" className="input" placeholder="0" />
          </div>
          <div>
            <label className="label">Source</label>
            <input name="source" className="input" placeholder="MANUAL" defaultValue="MANUAL" />
          </div>
        </div>

        <div>
          <label className="label">Initial notes</label>
          <textarea name="notes" rows={3} className="input" placeholder="Where you found them, why they're interesting…" />
        </div>

        <div>
          <label className="label">Initial signal</label>
          <input name="signal" className="input" placeholder="e.g. Featured on Fresh Finds playlist" />
        </div>

        <button className="btn-primary">Create artist</button>
      </form>
    </div>
  );
}

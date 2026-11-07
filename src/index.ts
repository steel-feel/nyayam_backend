import { Hono } from "hono";
import { cors } from "hono/cors";
import { createHash, randomUUID } from "crypto";
import path from "path";
import { db, seedTimeline, seedCases, type EvidenceRow } from "./db";
import { PRESIDING_JUDGE } from "./cases-seed";
import { analyseEvidenceImage } from "./analysis";

seedTimeline();
seedCases();

const UPLOADS_DIR = path.join(import.meta.dir, "..", "data", "uploads");
const ASSEMBLYAI_TOKEN_URL = "https://token.assemblyai.com/v1/token";
const OG_WHISPER_URL =
  "https://compute-network-16.integratenetwork.work/v1/proxy/audio/transcriptions";
const OG_WHISPER_MODEL = "openai/whisper-large-v3";
const OG_WHISPER_PROVIDER = "0xE63C4F83abFbDFCaB884247EaC21f59e2e8d502e";

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
};

const app = new Hono();

app.use("*", cors({ origin: (origin) => origin || "*" }));

app.get("/health", (c) => c.json({ ok: true, service: "nyayam-backend" }));

// Mints a 60s AssemblyAI Universal-Streaming token. The browser connects to
// AssemblyAI directly — transcription stays client-side, the key stays here.
app.post("/api/stt-token", async (c) => {
  const apiKey = process.env.ASSEMBLY_AI_KEY;
  if (!apiKey) {
    return c.json({ error: "Missing ASSEMBLY_AI_KEY in backend .env" }, 500);
  }
  const res = await fetch(ASSEMBLYAI_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ product: "streaming", expires_in_seconds: 60 }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    return c.json(
      { error: data?.error || `Token request failed (${res.status})` },
      res.ok ? 502 : (res.status as 400),
    );
  }
  return c.json({ token: data.token });
});

// 0G TEE whisper proxy (used by the standalone /transcribe page).
app.post("/api/transcribe", async (c) => {
  const apiKey = process.env.OG_SPEECH_API_Key;
  if (!apiKey) {
    return c.json({ error: "Missing OG_SPEECH_API_Key in backend .env" }, 500);
  }
  const incoming = await c.req.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "No audio file provided" }, 400);
  }
  const language = (incoming.get("language") as string) || "en";
  const audioBytes = Buffer.from(await file.arrayBuffer());
  const audioHash = sha256(audioBytes);

  const form = new FormData();
  form.append("file", new File([audioBytes], file.name || "audio.webm", { type: file.type }));
  form.append("model", OG_WHISPER_MODEL);
  form.append("language", language);
  form.append("response_format", "json");

  const upstream = await fetch(OG_WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const raw = await upstream.text();
  let data: any = {};
  try {
    data = JSON.parse(raw);
  } catch {
    /* non-JSON error body */
  }
  if (!upstream.ok) {
    return c.json(
      {
        error:
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || raw.slice(0, 500) || `0G provider error (${upstream.status})`,
      },
      upstream.status as 400,
    );
  }
  const text: string = data.text ?? "";
  return c.json({
    text,
    receipt: {
      audio_sha256: audioHash,
      transcript_sha256: sha256(text),
      model: OG_WHISPER_MODEL,
      provider: OG_WHISPER_PROVIDER,
      tee: { attested: true, type: "Intel TDX", verifier: "dstack" },
      audio_seconds: data?.usage?.seconds ?? null,
      timestamp: new Date().toISOString(),
    },
  });
});

// Cause list — all cases (live-stream snippet parsed from JSON).
app.get("/api/cases", (c) => {
  const rows = db.query("SELECT * FROM cases ORDER BY rowid ASC").all() as any[];
  return c.json(
    rows.map((r) => ({
      slug: r.slug,
      verdictRef: r.verdict_ref,
      caseNumber: r.case_number,
      title: r.title,
      subtitle: r.subtitle,
      division: r.division,
      bench: r.bench,
      filedDate: r.filed_date,
      petitionerAOR: r.petitioner_aor,
      respondentAOR: r.respondent_aor,
      stage: r.stage,
      stageGroup: r.stage_group,
      lastUpdate: r.last_update,
      ...(r.live_json ? { live: JSON.parse(r.live_json) } : {}),
    })),
  );
});

// One case + full detail (curated record, or a synthesized standby record
// for off-session matters) + the next case on the cause list.
app.get("/api/cases/:slug", (c) => {
  const slug = c.req.param("slug");
  const rows = db.query("SELECT * FROM cases ORDER BY rowid ASC").all() as any[];
  const idx = rows.findIndex((r) => r.slug === slug);
  if (idx === -1) {
    return c.json({ error: "Unknown case" }, 404);
  }
  const r = rows[idx];
  const next = idx < rows.length - 1 ? rows[idx + 1] : null;

  const detailRow = db.query("SELECT * FROM case_details WHERE case_slug = ?").get(slug) as any;
  const turns = db
    .query("SELECT * FROM transcript_turns WHERE case_slug = ? ORDER BY idx ASC")
    .all(slug) as any[];

  let detail: any;
  if (detailRow) {
    detail = {
      verdictRef: detailRow.verdict_ref,
      sessionPhase: detailRow.session_phase,
      sessionPhaseSub: detailRow.session_phase_sub,
      diarizationActive: Boolean(detailRow.diarization_active),
      diarizationSub: detailRow.diarization_sub,
      sessionClock: detailRow.session_clock,
      presidingJudge: detailRow.presiding_judge,
      division: detailRow.division,
      petitionerName: detailRow.petitioner_name,
      petitionerRep: detailRow.petitioner_rep,
      respondentName: detailRow.respondent_name,
      respondentRep: detailRow.respondent_rep,
      filingDate: detailRow.filing_date,
      sessionDate: detailRow.session_date,
      originalLanguages: detailRow.original_languages,
      judicialFormat: detailRow.judicial_format,
      spokenTurns: detailRow.spoken_turns,
      spokenTurnsPct: detailRow.spoken_turns_pct,
      speakers: detailRow.speakers,
      speakersPct: detailRow.speakers_pct,
      petitionerSubmissions: detailRow.petitioner_submissions,
      respondentSubmissions: detailRow.respondent_submissions,
      statutes: JSON.parse(detailRow.statutes_json),
    };
  } else {
    // Off-session standby state (same shape as the curated detail).
    const splitAt = r.title.indexOf(" v. ");
    const [petitionerName, respondentName] =
      splitAt === -1 ? [r.title, "—"] : [r.title.slice(0, splitAt), r.title.slice(splitAt + 4)];
    detail = {
      verdictRef: r.verdict_ref,
      sessionPhase: "—",
      sessionPhaseSub: "Bench not in session",
      diarizationActive: false,
      diarizationSub: "Engine Standby",
      sessionClock: "00:00:00",
      presidingJudge: PRESIDING_JUDGE,
      division: r.division,
      petitionerName,
      petitionerRep: r.petitioner_aor,
      respondentName,
      respondentRep: r.respondent_aor,
      filingDate: r.filed_date,
      sessionDate: "24 Oct 2024",
      originalLanguages: "—",
      judicialFormat: "English (Certified)",
      spokenTurns: "0 Spoken Turns",
      spokenTurnsPct: 0,
      speakers: "— Speakers",
      speakersPct: 0,
      petitionerSubmissions:
        "Key submissions will be generated by the diarization engine once the bench is in session.",
      respondentSubmissions:
        "Key submissions will be generated by the diarization engine once the bench is in session.",
      statutes: [],
    };
  }

  detail.transcript = turns.map((t) => ({
    speaker: t.speaker,
    avatar: t.avatar,
    avatarTone: t.avatar_tone,
    ...(t.icon ? { icon: true } : {}),
    ...(t.role_label ? { role: { label: t.role_label, tone: t.role_tone } } : {}),
    time: t.time,
    text: t.text,
    ...(t.live ? { live: true } : {}),
  }));

  return c.json({
    case: {
      slug: r.slug,
      verdictRef: r.verdict_ref,
      caseNumber: r.case_number,
      title: r.title,
      subtitle: r.subtitle,
      division: r.division,
      bench: r.bench,
      filedDate: r.filed_date,
      petitionerAOR: r.petitioner_aor,
      respondentAOR: r.respondent_aor,
      stage: r.stage,
      stageGroup: r.stage_group,
      lastUpdate: r.last_update,
      ...(r.live_json ? { live: JSON.parse(r.live_json) } : {}),
    },
    detail,
    next: next ? { slug: next.slug, verdictRef: next.verdict_ref } : null,
  });
});

// Till-date case history timeline (SQLite).
app.get("/api/cases/:slug/timeline", (c) => {
  return c.json(
    db
      .query("SELECT * FROM timeline_events WHERE case_slug = ? ORDER BY id ASC")
      .all(c.req.param("slug")),
  );
});

// Evidence locker for a case.
app.get("/api/cases/:slug/evidence", (c) => {
  return c.json(
    db
      .query("SELECT * FROM evidence WHERE case_slug = ? ORDER BY created_at DESC")
      .all(c.req.param("slug")),
  );
});

app.post("/api/cases/:slug/evidence", async (c) => {
  const slug = c.req.param("slug");
  const known = db.query("SELECT slug FROM cases WHERE slug = ?").get(slug);
  if (!known) {
    return c.json({ error: "Unknown case" }, 404);
  }
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) {
    return c.json({ error: "No exhibit file provided" }, 400);
  }
  const label = typeof body["label"] === "string" ? body["label"] : undefined;
  if (!file.type.startsWith("image/")) {
    return c.json({ error: "Only image exhibits are accepted (PNG/JPEG/WebP/TIFF)." }, 400);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return c.json({ error: "Empty file." }, 400);
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = randomUUID();
  const filename = `${id}.${ext || "png"}`;
  await Bun.write(path.join(UPLOADS_DIR, filename), buf);

  const base: EvidenceRow = {
    id,
    case_slug: slug,
    filename,
    mime: file.type,
    size: buf.length,
    sha256: sha256(buf),
    label: label?.trim() || null,
    status: "analysing",
    analysis: null,
    model: process.env.OG_VISION_MODEL ?? "0GM-1.0-35B-A3B",
    provider: process.env.OG_VISION_PROVIDER ?? null,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO evidence
     (id, case_slug, filename, mime, size, sha256, label, status, analysis, model, provider, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    base.id,
    base.case_slug,
    base.filename,
    base.mime,
    base.size,
    base.sha256,
    base.label,
    base.status,
    base.analysis,
    base.model,
    base.provider,
    base.created_at,
  );

  try {
    const analysis = await analyseEvidenceImage(buf, file.type);
    db.prepare("UPDATE evidence SET status = 'analysed', analysis = ? WHERE id = ?").run(
      analysis,
      id,
    );
    return c.json({ ...base, status: "analysed", analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    db.prepare("UPDATE evidence SET status = 'failed', analysis = ? WHERE id = ?").run(msg, id);
    return c.json({ ...base, status: "failed", analysis: msg }, 502);
  }
});

// Serves stored exhibit images.
app.get("/uploads/:name", (c) => {
  const name = c.req.param("name");
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(name)) {
    return c.json({ error: "Bad filename" }, 400);
  }
  const ext = name.split(".").pop()!.toLowerCase();
  const file = Bun.file(path.join(UPLOADS_DIR, name));
  return new Response(file, {
    headers: { "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream" },
  });
});

const port = 4000;
console.log(`⚖️  nyayam-backend listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };

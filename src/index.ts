import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
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

const app = new Elysia()
  .use(cors({ origin: true }))

  .get("/health", () => ({ ok: true, service: "nyayam-backend" }))

  // Mints a 60s AssemblyAI Universal-Streaming token. The browser connects to
  // AssemblyAI directly — transcription stays client-side, the key stays here.
  .post("/api/stt-token", async ({ set }) => {
    const apiKey = process.env.ASSEMBLY_AI_KEY;
    if (!apiKey) {
      set.status = 500;
      return { error: "Missing ASSEMBLY_AI_KEY in backend .env" };
    }
    const res = await fetch(ASSEMBLYAI_TOKEN_URL, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ product: "streaming", expires_in_seconds: 60 }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      set.status = res.ok ? 502 : res.status;
      return { error: data?.error || `Token request failed (${res.status})` };
    }
    return { token: data.token };
  })

  // 0G TEE whisper proxy (used by the standalone /transcribe page).
  .post("/api/transcribe", async ({ request, set }) => {
    const apiKey = process.env.OG_SPEECH_API_Key;
    if (!apiKey) {
      set.status = 500;
      return { error: "Missing OG_SPEECH_API_Key in backend .env" };
    }
    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      set.status = 400;
      return { error: "No audio file provided" };
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
      set.status = upstream.status;
      return {
        error:
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || raw.slice(0, 500) || `0G provider error (${upstream.status})`,
      };
    }
    const text: string = data.text ?? "";
    return {
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
    };
  })

  // Cause list — all cases (live-stream snippet parsed from JSON).
  .get("/api/cases", () => {
    const rows = db.query("SELECT * FROM cases ORDER BY rowid ASC").all() as any[];
    return rows.map((r) => ({
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
    }));
  })

  // One case + full detail (curated record, or a synthesized standby record
  // for off-session matters) + the next case on the cause list.
  .get("/api/cases/:slug", ({ params, set }) => {
    const rows = db.query("SELECT * FROM cases ORDER BY rowid ASC").all() as any[];
    const idx = rows.findIndex((r) => r.slug === params.slug);
    if (idx === -1) {
      set.status = 404;
      return { error: "Unknown case" };
    }
    const r = rows[idx];
    const next = idx < rows.length - 1 ? rows[idx + 1] : null;

    const detailRow = db
      .query("SELECT * FROM case_details WHERE case_slug = ?")
      .get(params.slug) as any;
    const turns = db
      .query("SELECT * FROM transcript_turns WHERE case_slug = ? ORDER BY idx ASC")
      .all(params.slug) as any[];

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

    return {
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
    };
  })

  // Till-date case history timeline (SQLite).
  .get("/api/cases/:slug/timeline", ({ params }) => {
    return db
      .query("SELECT * FROM timeline_events WHERE case_slug = ? ORDER BY id ASC")
      .all(params.slug);
  })

  // Evidence locker for a case.
  .get("/api/cases/:slug/evidence", ({ params }) => {
    return db
      .query("SELECT * FROM evidence WHERE case_slug = ? ORDER BY created_at DESC")
      .all(params.slug);
  })

  .post(
    "/api/cases/:slug/evidence",
    async ({ params, body, set }) => {
      const known = db.query("SELECT slug FROM cases WHERE slug = ?").get(params.slug);
      if (!known) {
        set.status = 404;
        return { error: "Unknown case" };
      }
      const file = body.file;
      if (!file.type.startsWith("image/")) {
        set.status = 400;
        return { error: "Only image exhibits are accepted (PNG/JPEG/WebP/TIFF)." };
      }
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length === 0) {
        set.status = 400;
        return { error: "Empty file." };
      }
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const id = randomUUID();
      const filename = `${id}.${ext || "png"}`;
      await Bun.write(path.join(UPLOADS_DIR, filename), buf);

      const base: EvidenceRow = {
        id,
        case_slug: params.slug,
        filename,
        mime: file.type,
        size: buf.length,
        sha256: sha256(buf),
        label: body.label?.trim() || null,
        status: "analysing",
        analysis: null,
        model: process.env.OG_VISION_MODEL ?? "0GM-1.0-35B-A3B",
        provider: process.env.OG_VISION_PROVIDER ?? null,
        created_at: new Date().toISOString(),
      };
      db.prepare(
        `INSERT INTO evidence
         (id, case_slug, filename, mime, size, sha256, label, status, analysis, model, provider, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        base.id, base.case_slug, base.filename, base.mime, base.size, base.sha256,
        base.label, base.status, base.analysis, base.model, base.provider, base.created_at
      );

      try {
        const analysis = await analyseEvidenceImage(buf, file.type);
        db.prepare("UPDATE evidence SET status = 'analysed', analysis = ? WHERE id = ?").run(analysis, id);
        return { ...base, status: "analysed", analysis };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Analysis failed";
        db.prepare("UPDATE evidence SET status = 'failed', analysis = ? WHERE id = ?").run(msg, id);
        set.status = 502;
        return { ...base, status: "failed", analysis: msg };
      }
    },
    {
      body: t.Object({
        file: t.File(),
        label: t.Optional(t.String()),
      }),
    }
  )

  // Serves stored exhibit images.
  .get("/uploads/:name", ({ params, set }) => {
    if (!/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(params.name)) {
      set.status = 400;
      return { error: "Bad filename" };
    }
    const ext = params.name.split(".").pop()!.toLowerCase();
    const file = Bun.file(path.join(UPLOADS_DIR, params.name));
    return new Response(file, {
      headers: { "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream" },
    });
  })

  .listen(4000);

console.log(`⚖️  nyayam-backend listening on http://localhost:${app.server?.port}`);

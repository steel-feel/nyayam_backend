# Nyayam.si Backend — Confidential AI for Indian Courts

Hono (Node.js) API server powering **Nyayam.si**: confidential courtroom
transcription and verifiable evidence handling for the Indian judiciary,
running inside **hardware-sealed TEE enclaves on 0G Private Computer**
(0G Mainnet).

---

## The Problem: Indian Courts Are Blocked

India's judiciary is buried under one of the largest case backlogs in the
world:

- **Over 4.5 crore (45+ million) cases** are pending in district and
  subordinate courts alone, with the total across all courts exceeding
  **5 crore** (National Judicial Data Grid).
- A huge share of court time goes into **mechanical, non-judicial work** —
  dictation, transcription of depositions, manual exhibit inspection,
  record-keeping — instead of adjudication.
- Hearings run in **multiple languages** (Hindi, Hinglish, English, regional
  languages); verbatim records are slow to produce and easy to dispute.
- **Evidence integrity is fragile**: electronic records are routinely
  challenged on authenticity grounds, and certification under
  **Section 63, Bharatiya Sakshya Adhiniyam 2023** is still largely manual.
- Sensitive proceedings — in-camera trials, POCSO matters, family disputes —
  cannot be sent to third-party cloud services without violating privacy
  obligations under the **DPDP Act 2023**.

AI could clear this bottleneck — but **traditional AI cannot be trusted
with judicial data**.

## Why Not Traditional AI? It Has No Privacy

Sending courtroom audio or evidence exhibits to a conventional AI API
(OpenAI, Google, etc.) means:

| Traditional AI APIs | Consequence for a court |
| --- | --- |
| Provider processes your data in **plaintext** on their servers | Depositions, witness identities, and exhibits are exposed to the vendor |
| Data may be **logged, retained, or used for training** | Violates in-camera protections and the DPDP Act |
| **No proof** of what the model actually saw or produced | Output is contestable in court; breaks the chain of custody |
| Opaque, centralized infrastructure | Single point of subpoena, breach, or tampering |

For a justice system, an AI that can read everything and prove nothing is
worse than no AI at all.

## The 0G Difference: Verifiable, Hardware-Sealed Privacy

Nyayam.si runs every AI workload on **0G Private Computer** — decentralized
inference inside **Intel TDX Trusted Execution Environments** (attested via
dstack):

- **Confidential by construction** — audio and images are processed inside a
  hardware-sealed enclave. Not even the 0G node operator that owns the
  machine can inspect the data in use. Traditional AI = *trust the vendor*;
  0G = *trust the silicon*, and verify it.
- **Remote attestation** — each inference runs on a verifiable enclave
  (Intel TDX / TeeML), so you can prove *where* and *how* the data was
  processed, not just take the provider's word for it.
- **Tamper-evident receipts** — every transcription returns a
  BSA **Section 63-aligned certificate**: SHA-256 of the raw audio, SHA-256
  of the transcript, model ID, on-chain provider address, TEE attestation
  details, and a UTC timestamp. Edit one word and the hash breaks.
- **On-chain accountability** — inference is paid for and attributable to a
  provider address on 0G Mainnet (Chain ID `16661`), giving an auditable
  settlement trail no centralized vendor offers.
- **Decentralized, not dependent** — no single cloud vendor can silently
  retain, train on, or leak the judiciary's data.

## What This Server Does

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness check |
| `POST /api/stt-token` | Mints 60 s AssemblyAI streaming tokens (live browser transcription; key stays server-side) |
| `POST /api/transcribe` | **0G TEE whisper proxy** — `openai/whisper-large-v3` in an Intel TDX enclave, returns transcript + BSA §63 receipt |
| `GET /api/cases` | Cause list — all cases (SQLite) |
| `GET /api/cases/:slug` | Case detail + transcript turns + next case on the list |
| `GET /api/cases/:slug/timeline` | Till-date procedural history |
| `GET/POST /api/cases/:slug/evidence` | Evidence locker — submit exhibit images; SHA-256 sealed, analysed by `0GM-1.0-35B-A3B` vision model in a TEE |
| `GET /uploads/:name` | Serves stored exhibit images |

### Evidence integrity flow

1. Exhibit image uploaded → **SHA-256 hash** computed and stored at ingest.
2. Image analysed **inside a 0G TEE enclave** (forensic document examination:
   OCR, parties/dates/amounts, authenticity observations) — the provider
   cannot see the exhibit.
3. Any later copy can be re-hashed and compared against the sealed record:
   tampering is instantly detectable.

## 0G Mainnet Details

| Parameter | Value |
| --- | --- |
| Network | 0G Mainnet |
| Chain ID | 16661 |
| RPC | https://evmrpc.0g.ai |
| Explorer | https://chainscan.0g.ai |
| Whisper endpoint | `https://compute-network-16.integratenetwork.work/v1/proxy/audio/transcriptions` |
| Whisper provider | `0xE63C4F83abFbDFCaB884247EaC21f59e2e8d502e` |
| Vision model | `0GM-1.0-35B-A3B` (provider `0xf4FB8d2bD856e672b5f9848b0eD235A20079B250`) |
| TEE | Intel TDX, attested via dstack |

## Setup

Requires Node.js ≥ 22.5 (for the built-in `node:sqlite` module) and pnpm.

```bash
cp .env.example .env   # or create .env:
# ASSEMBLY_AI_KEY=...            # AssemblyAI streaming (live diarization)
# OG_SPEECH_API_KEY=app-sk-...   # 0G whisper (provider 0xE63C…502e)
# OG_VISION_API_KEY=app-sk-...   # 0G vision (provider 0xf4FB…B250) — keys are provider-scoped, mint on pc.0g.ai

pnpm install
pnpm dev    # → http://localhost:4000
```

SQLite (`node:sqlite`) is created at `data/nyayam.db` on first run and seeded
with the cause list, transcripts, and timelines. `data/` and `.env` are
git-ignored.

## Roadmap

- LLM summarization / judicial order drafting inside the same enclave.
- Anchor evidence Merkle roots on **0G Storage / DA** for on-chain
  verification.
- POCSO-protected name redaction in transcripts.

import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import path from "path";
import { CASE_SEEDS, DETAIL_SEEDS, PRESIDING_JUDGE } from "./cases-seed";

const DATA_DIR = path.join(import.meta.dir, "..", "data");
mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });

export const db = new Database(path.join(DATA_DIR, "nyayam.db"), { create: true });

db.run(`
  CREATE TABLE IF NOT EXISTS timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_slug TEXT NOT NULL,
    event_date TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'order'
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    case_slug TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'analysing',
    analysis TEXT,
    model TEXT,
    provider TEXT,
    created_at TEXT NOT NULL
  )
`);

db.run("CREATE INDEX IF NOT EXISTS idx_timeline_case ON timeline_events(case_slug)");
db.run("CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_slug)");

db.run(`
  CREATE TABLE IF NOT EXISTS cases (
    slug TEXT PRIMARY KEY,
    verdict_ref TEXT NOT NULL,
    case_number TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    division TEXT NOT NULL,
    bench TEXT NOT NULL,
    filed_date TEXT NOT NULL,
    petitioner_aor TEXT NOT NULL,
    respondent_aor TEXT NOT NULL,
    stage TEXT NOT NULL,
    stage_group TEXT NOT NULL,
    last_update TEXT NOT NULL,
    live_json TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS case_details (
    case_slug TEXT PRIMARY KEY,
    verdict_ref TEXT NOT NULL,
    session_phase TEXT NOT NULL,
    session_phase_sub TEXT NOT NULL,
    diarization_active INTEGER NOT NULL,
    diarization_sub TEXT NOT NULL,
    session_clock TEXT NOT NULL,
    presiding_judge TEXT NOT NULL,
    division TEXT NOT NULL,
    petitioner_name TEXT NOT NULL,
    petitioner_rep TEXT NOT NULL,
    respondent_name TEXT NOT NULL,
    respondent_rep TEXT NOT NULL,
    filing_date TEXT NOT NULL,
    session_date TEXT NOT NULL,
    original_languages TEXT NOT NULL,
    judicial_format TEXT NOT NULL,
    spoken_turns TEXT NOT NULL,
    spoken_turns_pct INTEGER NOT NULL,
    speakers TEXT NOT NULL,
    speakers_pct INTEGER NOT NULL,
    petitioner_submissions TEXT NOT NULL,
    respondent_submissions TEXT NOT NULL,
    statutes_json TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS transcript_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_slug TEXT NOT NULL,
    idx INTEGER NOT NULL,
    speaker TEXT NOT NULL,
    avatar TEXT NOT NULL,
    avatar_tone TEXT NOT NULL,
    icon INTEGER NOT NULL DEFAULT 0,
    role_label TEXT,
    role_tone TEXT,
    time TEXT NOT NULL,
    text TEXT NOT NULL,
    live INTEGER NOT NULL DEFAULT 0
  )
`);

db.run("CREATE INDEX IF NOT EXISTS idx_turns_case ON transcript_turns(case_slug, idx)");

export type TimelineEvent = {
  id: number;
  case_slug: string;
  event_date: string;
  title: string;
  detail: string;
  kind: string;
};

export type EvidenceRow = {
  id: string;
  case_slug: string;
  filename: string;
  mime: string;
  size: number;
  sha256: string;
  label: string | null;
  status: string;
  analysis: string | null;
  model: string | null;
  provider: string | null;
  created_at: string;
};

// Seed a till-date procedural history per case (idempotent).
const SEED: Record<string, { d: string; t: string; x: string; k: string }[]> = {
  "com-arb-app-412-2024": [
    { d: "12 Jan 2024", t: "Appeal instituted", x: "Arbitral appeal under Sec. 34 filed with statement of grounds; vakalatnama entered for the State of Maharashtra.", k: "filing" },
    { d: "29 Jan 2024", t: "Notice issued to respondent", x: "Court issued notice. Adv. Shardul Suresh Rao, AOR, entered appearance for Reliance Infrastructure Ltd.", k: "notice" },
    { d: "14 Feb 2024", t: "Interim stay declined", x: "Interim application for stay on enforcement of the arbitral award heard and declined; execution proceedings to continue.", k: "order" },
    { d: "21 Mar 2024", t: "Pleadings completed", x: "Counter-affidavit and rejoinder placed on record. Paper book settled by the Registry.", k: "filing" },
    { d: "09 Aug 2024", t: "Issues framed", x: "Whether the award suffers from patent illegality going to the root of the matter under Sec. 34, Arbitration & Conciliation Act, 1996.", k: "order" },
    { d: "24 Oct 2024", t: "Final Arguments (Sec. 34)", x: "Matter listed and taken up for final arguments. Addl. SG addressing the Bench on the scope of patent illegality.", k: "stage" },
  ],
  "wp-civil-884-2023": [
    { d: "04 Nov 2023", t: "Writ petition instituted", x: "Constitutional writ on data sovereignty filed against TechCorp International LLC; annexures marked A–R.", k: "filing" },
    { d: "20 Nov 2023", t: "Notice to Union & regulator", x: "Notice issued to the Union of India and the sectoral regulator; counter sought within four weeks.", k: "notice" },
    { d: "08 Jan 2024", t: "Interim directions", x: "Interim directions issued to preserve server logs and localisation audit trails pending adjudication.", k: "order" },
    { d: "26 Feb 2024", t: "Counter-affidavits on record", x: "Counters filed by Union and respondent; rejoinder by petitioner. Pleadings declared complete.", k: "filing" },
    { d: "17 Jul 2024", t: "Expert evidence commenced", x: "Court-appointed expert's affidavit taken on record; parties permitted to cross-examine.", k: "evidence" },
    { d: "24 Oct 2024", t: "Cross-Examination of Expert", x: "Cross-examination of the technical expert on Rule 7 localisation compliance underway.", k: "stage" },
  ],
  "cs-comm-105-2024": [
    { d: "19 Feb 2024", t: "Commercial suit instituted", x: "Suit for infringement of standard-essential patents instituted before the Commercial Division.", k: "filing" },
    { d: "04 Mar 2024", t: "Summons served; appearance entered", x: "Written statement timeline fixed after respondent entered appearance.", k: "notice" },
    { d: "11 Apr 2024", t: "Ex-parte injunction refused", x: "Interim injunction pressed and refused; parties directed to maintain accounts of royalty accruals.", k: "order" },
    { d: "30 May 2024", t: "Issues framed", x: "Issues on validity, essentiality and FRAND royalty framed. Evidence list exchanged.", k: "order" },
    { d: "19 Sep 2024", t: "Plaintiff evidence closed", x: "PW-1 to PW-3 examined and cross-examined; exhibits P-1 to P-64 marked.", k: "evidence" },
    { d: "24 Oct 2024", t: "Evidentiary Hearing", x: "Defendant's evidence in progress; DW-1 under cross-examination.", k: "stage" },
  ],
  "arb-pet-289-2024": [
    { d: "05 Mar 2024", t: "Arbitration petition instituted", x: "Petition for appointment of arbitrator filed; copy of arbitration clause and correspondence annexed.", k: "filing" },
    { d: "22 Mar 2024", t: "Notice issued", x: "Notice issued to respondent; reply sought on existence of arbitration agreement.", k: "notice" },
    { d: "16 Apr 2024", t: "Reply on record", x: "Respondent disputes the arbitration clause; preliminary objection on arbitrability recorded.", k: "filing" },
    { d: "24 Oct 2024", t: "Notice & Interim Relief", x: "Matter at notice stage; interim-relief application listed for hearing.", k: "stage" },
  ],
  "omp-comm-18-2024": [
    { d: "28 Apr 2024", t: "O.M.P. instituted", x: "Original Miscellaneous Petition challenging interim measures of the arbitral tribunal instituted.", k: "filing" },
    { d: "13 May 2024", t: "Notice to respondent", x: "Notice issued; tribunal record requisitioned and placed before the Court.", k: "notice" },
    { d: "06 Jun 2024", t: "Pleadings completed", x: "Reply and rejoinder filed; compilation of authorities exchanged.", k: "filing" },
    { d: "12 Sep 2024", t: "Arguments commenced", x: "Part-heard; petitioner's submissions on tribunal jurisdiction concluded.", k: "hearing" },
    { d: "24 Oct 2024", t: "Final Arguments", x: "Respondent's final arguments in progress; matter part-heard.", k: "stage" },
  ],
  "cs-comm-420-2023": [
    { d: "15 Dec 2023", t: "Commercial suit instituted", x: "Suit for recovery of dues with contractual interest instituted; statement of accounts annexed.", k: "filing" },
    { d: "09 Jan 2024", t: "Summons served", x: "Summons served; written statement filed with a counter-claim for damages.", k: "notice" },
    { d: "02 Feb 2024", t: "Replication to counter-claim", x: "Replication filed; application for discovery allowed in part.", k: "order" },
    { d: "24 Oct 2024", t: "Pleadings Complete", x: "Pleadings declared complete; matter to be listed for framing of issues.", k: "stage" },
  ],
};

// Seed the case list + curated case details + transcript turns (idempotent).
export function seedCases() {
  const count = (db.query("SELECT COUNT(*) AS n FROM cases").get() as { n: number }).n;
  if (count > 0) return;

  const insertCase = db.prepare(
    `INSERT INTO cases
     (slug, verdict_ref, case_number, title, subtitle, division, bench, filed_date,
      petitioner_aor, respondent_aor, stage, stage_group, last_update, live_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertDetail = db.prepare(
    `INSERT INTO case_details
     (case_slug, verdict_ref, session_phase, session_phase_sub, diarization_active,
      diarization_sub, session_clock, presiding_judge, division, petitioner_name,
      petitioner_rep, respondent_name, respondent_rep, filing_date, session_date,
      original_languages, judicial_format, spoken_turns, spoken_turns_pct, speakers,
      speakers_pct, petitioner_submissions, respondent_submissions, statutes_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertTurn = db.prepare(
    `INSERT INTO transcript_turns
     (case_slug, idx, speaker, avatar, avatar_tone, icon, role_label, role_tone, time, text, live)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (const c of CASE_SEEDS) {
      insertCase.run(
        c.slug, c.verdictRef, c.caseNumber, c.title, c.subtitle, c.division, c.bench,
        c.filedDate, c.petitionerAOR, c.respondentAOR, c.stage, c.stageGroup,
        c.lastUpdate, c.live ? JSON.stringify(c.live) : null
      );
    }
    for (const d of DETAIL_SEEDS) {
      insertDetail.run(
        d.caseSlug, d.verdictRef, d.sessionPhase, d.sessionPhaseSub,
        d.diarizationActive ? 1 : 0, d.diarizationSub, d.sessionClock, PRESIDING_JUDGE,
        d.division, d.petitionerName, d.petitionerRep, d.respondentName, d.respondentRep,
        d.filingDate, d.sessionDate, d.originalLanguages, d.judicialFormat, d.spokenTurns,
        d.spokenTurnsPct, d.speakers, d.speakersPct, d.petitionerSubmissions,
        d.respondentSubmissions, JSON.stringify(d.statutes)
      );
      d.transcript.forEach((t, idx) =>
        insertTurn.run(
          d.caseSlug, idx, t.speaker, t.avatar, t.avatarTone, t.icon ? 1 : 0,
          t.roleLabel ?? null, t.roleTone ?? null, t.time, t.text, t.live ? 1 : 0
        )
      );
    }
  });
  tx();
}

export function seedTimeline() {
  const count = (db.query("SELECT COUNT(*) AS n FROM timeline_events").get() as { n: number }).n;
  if (count > 0) return;
  const insert = db.prepare(
    "INSERT INTO timeline_events (case_slug, event_date, title, detail, kind) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const [slug, events] of Object.entries(SEED)) {
      for (const e of events) insert.run(slug, e.d, e.t, e.x, e.k);
    }
  });
  tx();
}

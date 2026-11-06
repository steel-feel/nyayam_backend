// Seed data for the cases tables (migrated from the frontend mock data file).
export const PRESIDING_JUDGE = "Hon'ble Mr. Justice R. K. Shrivastava";

export type CaseSeed = {
  slug: string;
  verdictRef: string;
  caseNumber: string;
  title: string;
  subtitle: string;
  division: string;
  bench: string;
  filedDate: string;
  petitionerAOR: string;
  respondentAOR: string;
  stage: string;
  stageGroup: "arguments" | "evidence" | "other";
  lastUpdate: string;
  live?: { speaker: string; text: string; time: string; accent: "red" | "blue" | "green" };
};

export const CASE_SEEDS: CaseSeed[] = [
  {
    slug: "com-arb-app-412-2024",
    verdictRef: "Verdict 01",
    caseNumber: "COM.ARB.APP. 412/2024",
    title: "State of Maharashtra v. Reliance Infrastructure Ltd.",
    subtitle: "Special Commercial Appeal",
    division: "Special Commercial Division",
    bench: "Courtroom 04",
    filedDate: "12 Jan 2024",
    petitionerAOR: "Adv. Devendra Deshmukh, AOR",
    respondentAOR: "Adv. Shardul Suresh Rao, AOR",
    stage: "Final Arguments (Sec. 34)",
    stageGroup: "arguments",
    lastUpdate: "24 Oct 2024, 11:42 AM IST",
    live: {
      speaker: "Addl. SG",
      text: "'...patent illegality must go to the core root of the arbitral award and not mere erroneous interpretation under Section 34.'",
      time: "11:42:36 IST",
      accent: "red",
    },
  },
  {
    slug: "wp-civil-884-2023",
    verdictRef: "Verdict 02",
    caseNumber: "W.P. (CIVIL) 884/2023",
    title: "Union of India v. TechCorp International LLC",
    subtitle: "Constitutional Writ on Data Sovereignty",
    division: "Constitutional Division",
    bench: "Courtroom 04",
    filedDate: "04 Nov 2023",
    petitionerAOR: "Adv. Anandita Sen, AOR",
    respondentAOR: "Adv. Cyrus Mehta, AOR",
    stage: "Cross-Examination of Expert",
    stageGroup: "evidence",
    lastUpdate: "24 Oct 2024, 11:38 AM IST",
    live: {
      speaker: "Lead Defence",
      text: "'Rule 7 localisation protocols complied with audit compliance schedules without data breach incidents.'",
      time: "11:42:38 IST",
      accent: "blue",
    },
  },
  {
    slug: "cs-comm-105-2024",
    verdictRef: "Verdict 03",
    caseNumber: "CS (COMM) 105/2024",
    title: "Sun Pharma Ltd. v. Apex Healthcare Solutions",
    subtitle: "Patent Infringement & Injunction",
    division: "Intellectual Property Bench",
    bench: "Courtroom 04",
    filedDate: "19 Feb 2024",
    petitionerAOR: "Adv. Vikramaditya Rathore, AOR",
    respondentAOR: "Adv. Meenakshi Sundaram, AOR",
    stage: "Evidentiary Hearing",
    stageGroup: "evidence",
    lastUpdate: "24 Oct 2024, 11:25 AM IST",
    live: {
      speaker: "Expert Witness",
      text: "'The crystalline polymorph Form-III diffraction peaks are identical with Exhibit P-4 specs.'",
      time: "11:42:39 IST",
      accent: "green",
    },
  },
  {
    slug: "arb-pet-289-2024",
    verdictRef: "Verdict 04",
    caseNumber: "ARB.PET. 289/2024",
    title: "National Highways Authority v. GMR Infrastructure Corp.",
    subtitle: "Arbitral Award Execution",
    division: "Commercial Appellate Division",
    bench: "Courtroom 04",
    filedDate: "05 Mar 2024",
    petitionerAOR: "Adv. R. K. Bhattacharya, AOR",
    respondentAOR: "Adv. K. Parthasarathy, AOR",
    stage: "Notice & Interim Relief",
    stageGroup: "other",
    lastUpdate: "23 Oct 2024, 04:45 PM IST",
  },
  {
    slug: "omp-comm-18-2024",
    verdictRef: "Verdict 05",
    caseNumber: "O.M.P. (COMM) 18/2024",
    title: "Bharat Petroleum Corp. v. Larsen & Toubro Heavy Engg.",
    subtitle: "Contractual Dispute Under Section 9",
    division: "Commercial Appellate Division",
    bench: "Courtroom 04",
    filedDate: "28 Apr 2024",
    petitionerAOR: "Adv. Jayesh Baxi, AOR",
    respondentAOR: "Adv. Sunita Narayanan, AOR",
    stage: "Final Arguments",
    stageGroup: "arguments",
    lastUpdate: "22 Oct 2024, 02:15 PM IST",
  },
  {
    slug: "cs-comm-420-2023",
    verdictRef: "Verdict 06",
    caseNumber: "CS (COMM) 420/2023",
    title: "TATA Consultancy Services v. NexGen Core Systems",
    subtitle: "Trade Secret & Non-Compete Breach",
    division: "Commercial Appellate Division",
    bench: "Courtroom 04",
    filedDate: "15 Dec 2023",
    petitionerAOR: "Adv. Harshvardhan Kapoor, AOR",
    respondentAOR: "Adv. Priya Swaminathan, AOR",
    stage: "Pleadings Complete",
    stageGroup: "other",
    lastUpdate: "21 Oct 2024, 03:30 PM IST",
  },
];

export type TurnSeed = {
  speaker: string;
  avatar: string;
  avatarTone: string;
  icon?: boolean;
  roleLabel?: string;
  roleTone?: string;
  time: string;
  text: string;
  live?: boolean;
};

export type DetailSeed = {
  caseSlug: string;
  verdictRef: string;
  sessionPhase: string;
  sessionPhaseSub: string;
  diarizationActive: boolean;
  diarizationSub: string;
  sessionClock: string;
  division: string;
  petitionerName: string;
  petitionerRep: string;
  respondentName: string;
  respondentRep: string;
  filingDate: string;
  sessionDate: string;
  originalLanguages: string;
  judicialFormat: string;
  spokenTurns: string;
  spokenTurnsPct: number;
  speakers: string;
  speakersPct: number;
  petitionerSubmissions: string;
  respondentSubmissions: string;
  statutes: string[];
  transcript: TurnSeed[];
};

export const DETAIL_SEEDS: DetailSeed[] = [
  {
    caseSlug: "com-arb-app-412-2024",
    verdictRef: "Verdict 01",
    sessionPhase: "Morning Session",
    sessionPhaseSub: "Arguments: Petitioner Stage",
    diarizationActive: true,
    diarizationSub: "4 Channels Separated",
    sessionClock: "01:18:42",
    division: "Commercial Appellate Division",
    petitionerName: "State of Maharashtra (Public Works Dept)",
    petitionerRep: "Adv. Devendra Deshmukh, AOR",
    respondentName: "Reliance Infrastructure Ltd.",
    respondentRep: "Sr. Adv. K. V. Nariman & Adv. P. Shah",
    filingDate: "12 Jan 2024",
    sessionDate: "24 Oct 2024",
    originalLanguages: "Marathi & Hindi",
    judicialFormat: "English (Certified)",
    spokenTurns: "142 Spoken Turns",
    spokenTurnsPct: 78,
    speakers: "4 Distinct Speakers",
    speakersPct: 96,
    petitionerSubmissions:
      '"Arbitral Tribunal exceeded jurisdiction by rewriting escalation clause; award contrary to public policy."',
    respondentSubmissions:
      '"Limited scope of judicial review under Sec 34; interpretation adopted by tribunal is plausible."',
    statutes: ["Sec 34(2)(b)(ii)", "Sec 34(2A)", "Arb Act 1996"],
    transcript: [
      {
        speaker: "Court Master",
        avatar: "CM",
        avatarTone: "neutral",
        time: "10:30 AM",
        text: "Courtroom 04 is in session. Case COM.ARB.APP. 412/2024 is called out.",
      },
      {
        speaker: "Hon'ble Justice R. K. Shrivastava",
        avatar: "balance",
        avatarTone: "judge",
        icon: true,
        roleLabel: "Presiding",
        roleTone: "presiding",
        time: "10:32 AM",
        text: "Counsel, please proceed with arguments on Section 34(2A).",
      },
      {
        speaker: "Adv. Devendra Deshmukh",
        avatar: "DD",
        avatarTone: "petitioner",
        roleLabel: "Petitioner",
        roleTone: "petitioner",
        time: "10:35 AM",
        text: "My Lords, the arbitral tribunal exceeded jurisdiction by disregarding Clause 25 of the concession agreement.",
      },
      {
        speaker: "Sr. Adv. K. V. Nariman",
        avatar: "KN",
        avatarTone: "respondent",
        roleLabel: "Respondent",
        roleTone: "respondent",
        time: "10:48 AM",
        text: "Under Section 34, a plausible view adopted by the tribunal cannot be set aside on merits.",
      },
      {
        speaker: "Adv. Devendra Deshmukh",
        avatar: "DD",
        avatarTone: "petitioner",
        roleLabel: "LIVE",
        roleTone: "live",
        time: "11:41 AM",
        text: "The award runs contrary to public policy and patent illegality goes to the root of the matter...",
        live: true,
      },
    ],
  },
  {
    caseSlug: "wp-civil-884-2023",
    verdictRef: "Verdict 02",
    sessionPhase: "Morning Session",
    sessionPhaseSub: "Evidence: Expert Cross-Examination",
    diarizationActive: true,
    diarizationSub: "3 Channels Separated",
    sessionClock: "00:54:17",
    division: "Constitutional Division",
    petitionerName: "Union of India (MeitY)",
    petitionerRep: "Adv. Anandita Sen, AOR",
    respondentName: "TechCorp International LLC",
    respondentRep: "Adv. Cyrus Mehta, AOR",
    filingDate: "04 Nov 2023",
    sessionDate: "24 Oct 2024",
    originalLanguages: "Hindi & English",
    judicialFormat: "English (Certified)",
    spokenTurns: "98 Spoken Turns",
    spokenTurnsPct: 64,
    speakers: "3 Distinct Speakers",
    speakersPct: 88,
    petitionerSubmissions:
      '"Rule 7 localisation mandate is a sovereign compliance requirement; foreign data mirroring defeats the object of the Act."',
    respondentSubmissions:
      '"Localisation protocols complied with under audit schedules; no data breach incident stands recorded."',
    statutes: ["Art 226", "IT Act 2000", "Rule 7", "DPDP Act 2023"],
    transcript: [
      {
        speaker: "Court Master",
        avatar: "CM",
        avatarTone: "neutral",
        time: "10:55 AM",
        text: "Courtroom 04 is in session. Case W.P. (CIVIL) 884/2023 is called out.",
      },
      {
        speaker: "Hon'ble Justice R. K. Shrivastava",
        avatar: "balance",
        avatarTone: "judge",
        icon: true,
        roleLabel: "Presiding",
        roleTone: "presiding",
        time: "10:57 AM",
        text: "The Court will hear the cross-examination of the deponent on the localisation audit affidavit.",
      },
      {
        speaker: "Adv. Anandita Sen",
        avatar: "AS",
        avatarTone: "petitioner",
        roleLabel: "Petitioner",
        roleTone: "petitioner",
        time: "11:12 AM",
        text: "The expert's own affidavit concedes that mirror servers were provisioned outside the notified geography.",
      },
      {
        speaker: "Adv. Cyrus Mehta",
        avatar: "CM",
        avatarTone: "respondent",
        roleLabel: "Respondent",
        roleTone: "respondent",
        time: "11:41 AM",
        text: "Rule 7 localisation protocols complied with audit compliance schedules without data breach incidents.",
        live: true,
      },
    ],
  },
  {
    caseSlug: "cs-comm-105-2024",
    verdictRef: "Verdict 03",
    sessionPhase: "Morning Session",
    sessionPhaseSub: "Evidence: Expert Chemical Testimony",
    diarizationActive: true,
    diarizationSub: "5 Channels Separated",
    sessionClock: "01:02:51",
    division: "Intellectual Property Bench",
    petitionerName: "Sun Pharma Ltd.",
    petitionerRep: "Adv. Vikramaditya Rathore, AOR",
    respondentName: "Apex Healthcare Solutions",
    respondentRep: "Adv. Meenakshi Sundaram, AOR",
    filingDate: "19 Feb 2024",
    sessionDate: "24 Oct 2024",
    originalLanguages: "English",
    judicialFormat: "English (Certified)",
    spokenTurns: "210 Spoken Turns",
    spokenTurnsPct: 84,
    speakers: "5 Distinct Speakers",
    speakersPct: 92,
    petitionerSubmissions:
      '"Form-III polymorph is anticipated by prior art; Section 3(d) bars evergreening of the claimed compound."',
    respondentSubmissions:
      '"Diffraction peaks on record demonstrate a novel crystalline structure with enhanced bioavailability."',
    statutes: ["Patents Act 1970", "Sec 3(d)", "Exhibit P-4"],
    transcript: [
      {
        speaker: "Court Master",
        avatar: "CM",
        avatarTone: "neutral",
        time: "10:40 AM",
        text: "Courtroom 04 is in session. Case CS (COMM) 105/2024 is called out.",
      },
      {
        speaker: "Hon'ble Justice R. K. Shrivastava",
        avatar: "balance",
        avatarTone: "judge",
        icon: true,
        roleLabel: "Presiding",
        roleTone: "presiding",
        time: "10:44 AM",
        text: "The Court will take the expert's testimony on the polymorph characterisation reports.",
      },
      {
        speaker: "Adv. Vikramaditya Rathore",
        avatar: "VR",
        avatarTone: "petitioner",
        roleLabel: "Petitioner",
        roleTone: "petitioner",
        time: "11:05 AM",
        text: "I put it to the witness that the claimed Form-III shows no enhancement of therapeutic efficacy over the base compound.",
      },
      {
        speaker: "Dr. (Expert Witness)",
        avatar: "EW",
        avatarTone: "respondent",
        roleLabel: "Respondent",
        roleTone: "respondent",
        time: "11:42 AM",
        text: "The crystalline polymorph Form-III diffraction peaks are identical with Exhibit P-4 specs.",
        live: true,
      },
    ],
  },
];

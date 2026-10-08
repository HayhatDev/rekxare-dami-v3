import { createClient } from '@supabase/supabase-js';
import { StudyData, ScheduleData, UserPrefs, SessionRecord, ReviewCard } from '../types';
import { MAX_REVIEW_CARDS, mergeCards, sanitizeReviewCards } from '../utils/srs';
import { normalizeFreezes, STREAK_FREEZE_STARTING_GRANT } from '../utils/rewards';
import type { QuestId } from '../utils/quests';
import { mapAuthError, needsEmailConfirmation, recoveryRedirectUrl } from '../utils/emailAuth';
import type { EmailAuthErrorCode } from '../utils/emailAuth';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseKey !== '';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function generateSecureId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const getUserKey = () => {
  try {
    let key = localStorage.getItem('rekxare_user_key');
    if (!key) {
      key = 'user_' + generateSecureId();
      localStorage.setItem('rekxare_user_key', key);
    }
    return key;
  } catch {
    return 'user_' + generateSecureId();
  }
};

export type AuthResult = { ok: true } | { ok: false; code: EmailAuthErrorCode };

/**
 * Email + password authentication.
 *
 * The project is configured with `mailer_autoconfirm = false`, so a new sign-up
 * returns an unconfirmed identity that cannot sign in until the emailed link is
 * followed. `signupWithEmail` therefore reports `needsConfirmation` instead of
 * pretending the student is signed in.
 *
 * Every branch maps Supabase's error text to a stable code
 * (`mapAuthError`) so components translate the reason rather than showing a raw
 * provider message.
 */
export const emailAuth = {
  async signupWithEmail(email: string, password: string): Promise<{ ok: true; needsConfirmation: boolean } | { ok: false; code: EmailAuthErrorCode }> {
    if (!supabase) return { ok: false, code: 'not_configured' };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: recoveryRedirectUrl(window.location.origin) },
    });
    if (error) return { ok: false, code: mapAuthError(error) };
    return { ok: true, needsConfirmation: needsEmailConfirmation(data.user) };
  },

  async signinWithEmail(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, code: 'not_configured' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, code: mapAuthError(error) };
    return { ok: true };
  },

  async sendPasswordReset(email: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, code: 'not_configured' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: recoveryRedirectUrl(window.location.origin),
    });
    if (error) return { ok: false, code: mapAuthError(error) };
    return { ok: true };
  },

  /**
   * Store the new password for the recovery grant. Requires an active session
   * that came from the emailed link; the caller checks for one first.
   */
  async updatePassword(password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, code: 'not_configured' };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, code: mapAuthError(error) };
    return { ok: true };
  },
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  if (!supabase) return {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[Auth] Failed to get session:', err);
  }
  return {};
};

const DEFAULT_STUDY_DATA: StudyData = {
  total_seconds: 0,
  sessions: 0,
  last_subject: '',
  streak: 0,
  last_study_date: null,
  daily_seconds: 0,
  daily_goal_seconds: 7200,
  xp_points: 0,
  xp_level: 1,
  student_name: '',
  session_log: [],
  review_cards: [],
  streak_freezes: STREAK_FREEZE_STARTING_GRANT,
  daily_quests: { day: '', claimed: [] }
};

const DEFAULT_SCHEDULE: ScheduleData = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

function guestKey(suffix: string): string {
  return `rekxare_guest_${getUserKey()}_${suffix}`;
}

// Local cache is keyed by the authenticated user when signed in so that a second
// account on the same device never sees the first account's offline cache (and
// vice versa). Only the not-signed-in / guest path uses the browser-wide guest key.
export function userKey(suffix: string, authUser: string | null): string {
  return authUser ? `rekxare_user_${authUser}_${suffix}` : guestKey(suffix);
}

// Guest-scoped cache carries an ownership stamp so migration never imports data
// that a *previous authenticated account* left behind (a second account signing
// in on the same browser must never inherit the first one's cache).
function guestOwnerKey(suffix: string): string {
  return `rekxare_guest_owner_${suffix}`;
}

function readGuestOwner(suffix: string): string | null {
  try { return localStorage.getItem(guestOwnerKey(suffix)); } catch { return null; }
}

function stampGuestOwner(suffix: string, owner: string | null): void {
  try {
    if (owner) localStorage.setItem(guestOwnerKey(suffix), owner);
    else localStorage.removeItem(guestOwnerKey(suffix));
  } catch {}
}

// Track every account ever signed in on this browser. When exactly one account
// is known, legacy (unstamped) guest data can only belong to that account, so it
// is safe to migrate. With two or more accounts, unstamped data is ambiguous and
// is deliberately left alone to avoid a second account inheriting the first's cache.
function rememberKnownAccount(authUser: string): void {
  try {
    const raw = localStorage.getItem('rekxare_known_accounts') || '';
    const accounts = raw ? raw.split(',').filter(Boolean) : [];
    if (!accounts.includes(authUser)) {
      accounts.push(authUser);
      localStorage.setItem('rekxare_known_accounts', accounts.join(','));
    }
  } catch {}
}

function onlyKnownAccount(): boolean {
  try {
    const raw = localStorage.getItem('rekxare_known_accounts');
    return raw ? raw.split(',').filter(Boolean).length === 1 : true;
  } catch {
    return true;
  }
}

// True when a guest cache is safe to migrate into the given account: either it
// was freshly stamped as guest-owned, or it is legacy unstamped data and this
// browser has only ever seen one account.
export function guestCacheOwnedBy(authUser: string, suffix: string): boolean {
  const owner = readGuestOwner(suffix);
  if (owner === 'guest') return true;
  if (owner === null) return onlyKnownAccount();
  return false;
}

// Previous releases persisted guest data under unprefixed localStorage keys
// (e.g. "rekxare_study_data"). The new namespaced keys mean a returning guest
// would otherwise see all their progress "reset". One-time, idempotent
// migration: copy the old value into the new key when the new key is absent.
function migrateLegacyData(newKey: string, legacyKey: string): void {
  try {
    if (!localStorage.getItem(newKey)) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) localStorage.setItem(newKey, legacy);
    }
  } catch {}
}

/** Extracts a readable message from an unknown thrown value for error text. */
function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'unknown storage error';
}

const localFallback = {
  getStudyData: async (authUser: string | null = null): Promise<StudyData> => {
    try {
      const key = userKey('study_data', authUser);
      if (!authUser) migrateLegacyData(key, 'rekxare_study_data');
      const data = localStorage.getItem(key);
      return data ? { ...DEFAULT_STUDY_DATA, ...JSON.parse(data) } : DEFAULT_STUDY_DATA;
    } catch {
      return DEFAULT_STUDY_DATA;
    }
  },
  setStudyData: async (data: StudyData, authUser: string | null = null): Promise<void> => {
    try {
      localStorage.setItem(userKey('study_data', authUser), JSON.stringify(data));
      if (!authUser) stampGuestOwner('study_data', 'guest');
    } catch (e) {
      // Thrown, not swallowed: for a guest this local write is the ONLY write,
      // and the UI has already advanced XP/streak as if it succeeded. Swallowing
      // meant an hour of study could vanish on reload with no warning. The
      // signed-in path below already throws, so this also makes the two paths
      // behave consistently.
      throw new Error(`Failed to save study data locally: ${messageOf(e)}`);
    }
  },
  getSchedule: async (authUser: string | null = null): Promise<ScheduleData> => {
    try {
      const key = userKey('schedule', authUser);
      if (!authUser) migrateLegacyData(key, 'rekxare_schedule');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : DEFAULT_SCHEDULE;
    } catch {
      return DEFAULT_SCHEDULE;
    }
  },
  setSchedule: async (data: ScheduleData, authUser: string | null = null): Promise<void> => {
    try {
      localStorage.setItem(userKey('schedule', authUser), JSON.stringify(data));
      if (!authUser) stampGuestOwner('schedule', 'guest');
    } catch (e) {
      // See setStudyData: a swallowed failure here loses the whole schedule,
      // including a generated day plan the student cannot regenerate for free.
      throw new Error(`Failed to save schedule locally: ${messageOf(e)}`);
    }
  },
  getUserPrefs: async (authUser: string | null = null): Promise<UserPrefs> => {
    try {
      const key = userKey('prefs', authUser);
      if (!authUser) migrateLegacyData(key, 'rekxare_user_prefs');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : { lang: 'badini', dark_mode: false };
    } catch {
      return { lang: 'badini', dark_mode: false };
    }
  },
  setUserPrefs: async (prefs: UserPrefs, authUser: string | null = null): Promise<void> => {
    try {
      localStorage.setItem(userKey('prefs', authUser), JSON.stringify(prefs));
    } catch (e) {
      throw new Error(`Failed to save preferences locally: ${messageOf(e)}`);
    }
  }
};

async function getAuthenticatedUserKey(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Pure decision for clearing local guest data after a migration attempt.
 * A payload is only safe to clear when it was persisted upstream (or there was
 * nothing to migrate / the server already had data). If a write failed, the flag
 * stays false so the caller preserves the local copy instead of losing it.
 */
/**
 * Which half of a save failed.
 *
 * - `local`: the on-device write failed, so the value is stored nowhere. The
 *   caller's optimistic UI has to be rolled back.
 * - `cloud`: the on-device write succeeded and only the account copy failed. The
 *   value is safe locally, so rolling back would throw away a real save.
 */
export type ScheduleSaveStage = 'local' | 'cloud';

/** Distinguishes "nowhere" from "here but not on your account". */
export class ScheduleSaveError extends Error {
  readonly stage: ScheduleSaveStage;

  constructor(stage: ScheduleSaveStage, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ScheduleSaveError';
    this.stage = stage;
  }
}

/** How much of a failed schedule save actually survived. */
export type ScheduleSaveOutcome = 'nowhere' | 'locally';

/**
 * Pure decision for what a failed schedule save should do to optimistic UI.
 *
 * An unrecognised error defaults to `locally`: when the stage is unknown, the
 * cost of guessing wrong is asymmetric. Reverting a save that did land throws
 * away the student's edit, whereas keeping a save that did not land only shows
 * them a schedule that is missing on reload - recoverable by editing again.
 */
export function classifyScheduleSaveFailure(error: unknown): ScheduleSaveOutcome {
  return error instanceof ScheduleSaveError && error.stage === 'local' ? 'nowhere' : 'locally';
}

export interface GuestDeletionState {
  hasStudyData: boolean;
  studyServerHasData: boolean;
  studyUpsertOk: boolean;
  hasSchedule: boolean;
  scheduleServerHasData: boolean;
  schedulePostOk: boolean;
}

export function guestKeysToClear(state: GuestDeletionState): { study: boolean; schedule: boolean } {
  return {
    study: !state.hasStudyData || state.studyServerHasData || state.studyUpsertOk,
    schedule: !state.hasSchedule || state.scheduleServerHasData || state.schedulePostOk,
  };
}

/**
 * Union of two study payloads (server row + local copy). Sessions are merged
 * by id so no entry is lost across devices; aggregate counters take the larger
 * value. Used by getStudyData so a signed-in device never clobbers sessions
 * recorded on another device or while offline.
 */
export function mergeStudyData(a: StudyData, b: StudyData): StudyData {
  const byId = new Map<string, SessionRecord>();
  [...a.session_log, ...b.session_log].forEach((r) => {
    if (r && r.id && !byId.has(r.id)) byId.set(r.id, r);
  });
  const session_log = [...byId.values()].sort((x, y) =>
    x.started_at.localeCompare(y.started_at)
  );
  const pickMaxDate = (x: string | null, y: string | null): string | null => {
    if (!x) return y;
    if (!y) return x;
    return x > y ? x : y;
  };
  return {
    total_seconds: Math.max(a.total_seconds, b.total_seconds),
    sessions: Math.max(a.sessions, b.sessions),
    last_subject: a.last_subject || b.last_subject,
    streak: Math.max(a.streak, b.streak),
    last_study_date: pickMaxDate(a.last_study_date, b.last_study_date),
    daily_seconds: Math.max(a.daily_seconds, b.daily_seconds),
    daily_goal_seconds: a.daily_goal_seconds || b.daily_goal_seconds || 7200,
    xp_points: Math.max(a.xp_points, b.xp_points),
    xp_level: Math.max(a.xp_level, b.xp_level),
    student_name: a.student_name || b.student_name,
    session_log,
    review_cards: mergeReviewCards(a.review_cards, b.review_cards),
    // Math.max, like the progress counters above — NOT the min() a consumable
    // would suggest. The read path merges server with local on every load and
    // then writes the whole object back, so a min() here is not "conservative":
    // one stale device reading a smaller count would converge both devices down
    // and destroy earned freezes permanently, with no recovery short of climbing
    // back to the next milestone. The mirror-image error is harmless: a stale
    // snapshot can at worst hand back one already-spent freeze, which is bounded
    // by STREAK_FREEZE_CAP and costs the student nothing.
    streak_freezes: Math.max(normalizeFreezes(a.streak_freezes), normalizeFreezes(b.streak_freezes)),
    // Quest claims are scoped to a calendar day, so two records only combine
    // when they describe the SAME day — that union is what stops a stale
    // snapshot from losing a payout. Across different days only the newer
    // record's claims are meaningful: unioning a stale day's claims into
    // today's record would mark today's quests as already banked and silently
    // deny the student the reward. `day: ''` is the "nothing claimed" sentinel.
    daily_quests: (() => {
      const x = a.daily_quests;
      const y = b.daily_quests;
      if (!x) return y || { day: '', claimed: [] };
      if (!y) return x;
      if (x.day === y.day) {
        return { day: x.day, claimed: [...new Set<QuestId>([...(x.claimed || []), ...(y.claimed || [])])] };
      }
      return x.day > y.day ? x : y;
    })(),
  };
}

/**
 * Union of two review-card collections. A card's review history is additive, so
 * the more-advanced copy wins rather than whichever side happened to be read
 * last — otherwise reviewing on device B could roll a card back to its
 * pre-review state on device A.
 */
export function mergeReviewCards(a: ReviewCard[] = [], b: ReviewCard[] = []): ReviewCard[] {
  const byId = new Map<string, ReviewCard>();
  const add = (card: ReviewCard): void => {
    const prev = byId.get(card.id);
    if (!prev) {
      byId.set(card.id, card);
      return;
    }
    if (card.reps !== prev.reps) {
      byId.set(card.id, card.reps > prev.reps ? card : prev);
      return;
    }
    const cardDue = new Date(card.due_at).getTime();
    const prevDue = new Date(prev.due_at).getTime();
    byId.set(card.id, cardDue < prevDue ? card : prev);
  };
  sanitizeReviewCards(a).forEach(add);
  sanitizeReviewCards(b).forEach(add);
  return mergeCards([...byId.values()], [], MAX_REVIEW_CARDS);
}

export const api = {
  async getStudyData(): Promise<StudyData> {
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return localFallback.getStudyData(authUser);
    const { data, error } = await supabase.from('study_data').select('data').eq('user_key', authUser).maybeSingle();
    if (error) return localFallback.getStudyData(authUser);
    const server = data ? { ...DEFAULT_STUDY_DATA, ...data.data } : DEFAULT_STUDY_DATA;
    const local = await localFallback.getStudyData(authUser);
    return mergeStudyData(server, local);
  },
  async updateStudyData(studyData: StudyData): Promise<void> {
    const authUser = await getAuthenticatedUserKey();
    await localFallback.setStudyData(studyData, authUser);
    if (!supabase || !authUser) return;
    const { error } = await supabase.from('study_data').upsert({ user_key: authUser, data: studyData, updated_at: new Date().toISOString() });
    if (error) {
      if (import.meta.env.DEV) console.error('[Supabase] Failed to update study_data:', error.message);
      throw new Error(`Failed to save study data: ${error.message}`);
    }
  },
  async getSchedule(): Promise<ScheduleData> {
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return localFallback.getSchedule(authUser);
    try {
      const res = await fetch(`${API_URL}/api/schedule/me`, { headers: await getAuthHeaders() });
      if (res.ok) {
        const data = (await res.json()) as ScheduleData;
        // Trust the server whenever it returns a well-formed schedule — including
        // an intentionally empty one. Only fall back to local storage if the
        // server did not return a usable payload (non-object or empty object).
        if (
          data &&
          typeof data === 'object' &&
          Object.keys(data as object).length > 0 &&
          Object.values(data as object).every((v) => Array.isArray(v))
        ) {
          return data;
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Supabase] Failed to load schedule from backend:', e);
    }
    return localFallback.getSchedule(authUser);
  },
  async updateSchedule(schedule: ScheduleData): Promise<void> {
const authUser = await getAuthenticatedUserKey();
    // Local first: this throws if storage is full or blocked, which is the only
    // write a guest gets, so the caller must hear about it. A local failure
    // means the schedule exists nowhere, so it is tagged `local` for the caller
    // to roll its optimistic UI back rather than claim the edit is safe.
    try {
      await localFallback.setSchedule(schedule, authUser);
    } catch (e) {
      throw new ScheduleSaveError('local', messageOf(e), { cause: e });
    }
    if (!supabase || !authUser) return;
    try {
      const res = await fetch(`${API_URL}/api/schedule/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) {
        // Reported rather than swallowed. Swallowing let the mutation resolve as
        // a success, so a schedule that never reached the server looked saved -
        // and on reload the server's older copy won, silently reverting edits
        // (including a whole AI-generated day).
        throw new Error(`Schedule sync failed: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Supabase] Failed to sync schedule to backend:', e);
      // The local copy landed, so this is `cloud`: keep the edit, tell the
      // student the account copy is behind.
      throw new ScheduleSaveError('cloud', messageOf(e), { cause: e });
    }
  },
  async getUserPrefs(): Promise<UserPrefs> {
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return localFallback.getUserPrefs(authUser);
    const { data, error } = await supabase.from('user_prefs').select('lang, dark_mode').eq('user_key', authUser).maybeSingle();
    if (error || !data) return localFallback.getUserPrefs(authUser);
    return { lang: data.lang, dark_mode: data.dark_mode };
  },
  async updateUserPrefs(prefs: UserPrefs): Promise<void> {
    const authUser = await getAuthenticatedUserKey();
    await localFallback.setUserPrefs(prefs, authUser);
    if (!supabase || !authUser) return;
    const { error } = await supabase.from('user_prefs').upsert({ user_key: authUser, lang: prefs.lang, dark_mode: prefs.dark_mode, updated_at: new Date().toISOString() });
    if (error) {
      if (import.meta.env.DEV) console.error('[Supabase] Failed to update user_prefs:', error.message);
      throw new Error(`Failed to save preferences: ${error.message}`);
    }
  },

  async migrateGuestData(): Promise<void> {
    if (!supabase) return;
    const authUser = await getAuthenticatedUserKey();
    if (!authUser) return;
    rememberKnownAccount(authUser);
    try {
      const guestStudyData = await localFallback.getStudyData();
      const hasStudyData = guestStudyData.total_seconds > 0 || guestStudyData.sessions > 0;
      const studyOwned = guestCacheOwnedBy(authUser, 'study_data');
      let studyServerHasData = false;
      let studyUpsertOk = false;
      if (hasStudyData && studyOwned) {
        const { data: existing } = await supabase.from('study_data').select('data').eq('user_key', authUser).maybeSingle();
        const serverData = existing?.data as StudyData | undefined;
        if (serverData && serverData.total_seconds > 0) {
          studyServerHasData = true; // server already has newer data — nothing to migrate
        } else {
          const { error } = await supabase.from('study_data').upsert({ user_key: authUser, data: guestStudyData, updated_at: new Date().toISOString() });
          studyUpsertOk = !error;
        }
      }

      const guestSchedule = await localFallback.getSchedule();
      const hasSchedule = Object.values(guestSchedule).some((tasks) => tasks.length > 0);
      const scheduleOwned = guestCacheOwnedBy(authUser, 'schedule');
      let scheduleServerHasData = false;
      let schedulePostOk = false;
      if (hasSchedule && scheduleOwned) {
        try {
          const existingRes = await fetch(`${API_URL}/api/schedule/me`, { headers: await getAuthHeaders() });
          const existingSchedule = existingRes.ok ? await existingRes.json() : null;
          if (!existingSchedule || Object.values(existingSchedule as ScheduleData).every((t) => t.length === 0)) {
            const postRes = await fetch(`${API_URL}/api/schedule/me`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
              body: JSON.stringify(guestSchedule),
            });
            schedulePostOk = postRes.ok;
          } else {
            scheduleServerHasData = true; // server already has a schedule — nothing to migrate
          }
        } catch {
          schedulePostOk = false;
        }
      }

      // Remove only the local guest data that was successfully moved upstream.
      const { study, schedule } = guestKeysToClear({
        hasStudyData,
        studyServerHasData,
        studyUpsertOk,
        hasSchedule,
        scheduleServerHasData,
        schedulePostOk,
      });
      const keysToRemove: string[] = [];
      if (study) keysToRemove.push(guestKey('study_data'), guestOwnerKey('study_data'));
      if (schedule) keysToRemove.push(guestKey('schedule'), guestOwnerKey('schedule'));
      try {
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Supabase] Guest data migration failed:', err);
    }
  }
};

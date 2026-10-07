export type Skill = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';
export const SKILLS: Skill[] = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
export const SKILL_LABEL: Record<Skill, string> = {
  vocabulary: 'Vocabulary', grammar: 'Grammar', listening: 'Listening',
  speaking: 'Speaking', reading: 'Reading', writing: 'Writing',
};
export const MINUTE_SKILLS: Skill[] = ['listening', 'speaking', 'reading', 'writing'];

export interface Profile { id: string; display_name: string | null }
export interface Settings {
  user_id: string; daily_target_minutes: number; reminder_enabled: boolean; reminder_time: string;
  current_hsk_level: number; target_hsk_level: number; monthly_goal_hours: number | null;
  theme: 'light' | 'dark' | 'system'; language: 'id' | 'en'; pomodoro_preset: string; timezone: string;
}
export interface HskLevel {
  user_id: string; level: number; title: string; month_number: number; vocab_target: number; grammar_target: number;
  listening_hours_target: number; reading_hours_target: number; speaking_hours_target: number;
  writing_hours_target: number; study_hours_target: number;
}
export interface DailyGoal { id: string; skill: Skill; target: number; unit: string; is_active: boolean }
export interface DayTotals {
  activity_date: string; study_minutes: number; vocab_count: number; grammar_count: number;
  listening_minutes: number; speaking_minutes: number; reading_minutes: number; writing_minutes: number;
}
export interface Streak { current_streak: number; longest_streak: number; last_study_date: string | null }
export interface StudySession {
  id: string; session_date: string; duration_minutes: number; activities: Skill[]; vocab_count: number;
  grammar_count: number; listening_minutes: number; speaking_minutes: number; reading_minutes: number;
  writing_minutes: number; notes: string | null; source: string; is_sample: boolean;
}
export interface VocabItem {
  id: string; chinese: string; pinyin: string | null; meaning: string; hsk_level: number; category: string | null;
  example: string | null; example_translation: string | null; last_reviewed: string | null; next_review: string;
  review_count: number; difficulty: string | null; ease_factor: number; interval_days: number;
}
export interface MonthlyProgress {
  id: string; month_start: string; hsk_level: number; progress_pct: number; study_days: number; is_completed: boolean;
  performance: string | null;
}

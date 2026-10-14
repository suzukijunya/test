export type Owner = 'both' | 'me' | 'partner';

export interface Profile {
  myName: string;
  partnerName: string;
  /** 付き合い始めた日 (YYYY-MM-DD) */
  startDate: string;
}

export interface Settings {
  googleClientId: string;
  /** 二人で共有している Google カレンダーのID（例: xxxx@group.calendar.google.com） */
  sharedCalendarId: string;
}

export type TodoKind = 'place' | 'task';

export interface TodoItem {
  id: string;
  kind: TodoKind;
  title: string;
  /** 行きたいお店のジャンル・タスクのカテゴリなど */
  category: string;
  url: string;
  address: string;
  memo: string;
  owner: Owner;
  dueDate: string;
  done: boolean;
  doneAt: string;
  createdAt: string;
}

export type AnniversaryKind = 'birthday' | 'anniversary' | 'other';

export interface Anniversary {
  id: string;
  kind: AnniversaryKind;
  title: string;
  /** 起点日 (YYYY-MM-DD)。誕生日なら生年月日、記念日なら最初の日 */
  date: string;
  /** 毎年繰り返すか */
  yearly: boolean;
  /** 誰の誕生日か等 */
  person: Owner;
  memo: string;
}

export interface PrepTask {
  id: string;
  title: string;
  done: boolean;
}

export interface GiftIdea {
  id: string;
  name: string;
  price: number;
  url: string;
  chosen: boolean;
}

export interface CelebrationPlan {
  id: string;
  anniversaryId: string;
  /** 対象年 (例: 2026) */
  year: number;
  budget: number;
  plan: string;
  /** 予約したお店など */
  reservation: string;
  tasks: PrepTask[];
  gifts: GiftIdea[];
  /** 相手に隠しておく準備か（サプライズ） */
  secret: boolean;
}

export type VlogStatus = 'idea' | 'shooting' | 'editing' | 'published';

export interface Vlog {
  id: string;
  title: string;
  status: VlogStatus;
  shootDate: string;
  publishDate: string;
  location: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
  memo: string;
  /** 撮影したいカット・構成メモ */
  shotList: PrepTask[];
  createdAt: string;
}

export interface AppData {
  version: 1;
  profile: Profile;
  settings: Settings;
  todos: TodoItem[];
  anniversaries: Anniversary[];
  celebrations: CelebrationPlan[];
  vlogs: Vlog[];
}

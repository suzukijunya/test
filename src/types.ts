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
  /** この端末を使っているのはどちらか（端末ごと） */
  whoAmI: '' | 'me' | 'partner';
  /** Googleカレンダー同期（端末ごと） */
  gsync?: GoogleSyncSettings;
}

export interface GoogleSyncSettings {
  /** 予定名を隠して「予定あり」とだけ共有する */
  hideTitles: boolean;
  /** 開いたときに自動で同期する（最初の同期が成功すると有効になる） */
  auto: boolean;
  /** 最後に同期した日時（ISO） */
  lastSyncedAt: string;
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

/** アプリ内で共有する予定（Googleカレンダーへは追加リンクで登録） */
export interface CalendarEntry {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm（空なら終日） */
  startTime: string;
  endTime: string;
  location: string;
  memo: string;
  owner: Owner;
  /** Googleカレンダーから同期した予定 */
  source?: 'google';
  /** 同期元のGoogleカレンダーの予定ID */
  googleId?: string;
}

/** 予定へのコメント（TimeTree風） */
export interface EventComment {
  id: string;
  eventId: string;
  author: Owner;
  text: string;
  at: string;
}

/** 共有メモ */
export interface Memo {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author: Owner;
  updatedAt: string;
}

/** 更新履歴（「〇〇が予定を追加しました」） */
export interface Activity {
  id: string;
  who: Owner;
  text: string;
  at: string;
  /** 遷移先（例: /calendar） */
  link: string;
}

/** 質問ゲームの1問 */
export interface GameRound {
  id: string;
  questionId: string;
  text: string;
  category: string;
  choices: string[];
  /** 出題日 YYYY-MM-DD（今日の質問なら日付） */
  date: string;
  daily: boolean;
  createdAt: string;
}

/** 質問への回答（1人1ドキュメント。同時に書いても上書きし合わないよう分ける） */
export interface GameAnswer {
  /** `${roundId}_${who}` */
  id: string;
  roundId: string;
  who: 'me' | 'partner';
  /** 自分の答え */
  self: string;
  /** 相手の答えの予想 */
  guess: string;
  /** 相手が判定: この人の予想は当たっていたか */
  correct: boolean | null;
  at: string;
}

/** 部屋の飾り（購入済みのもの）。id は飾りカタログのID */
export interface DecorState {
  id: string;
  placed: boolean;
  boughtBy: Owner;
  boughtAt: string;
}

export interface AppData {
  version: 1;
  profile: Profile;
  settings: Settings;
  todos: TodoItem[];
  anniversaries: Anniversary[];
  celebrations: CelebrationPlan[];
  vlogs: Vlog[];
  events: CalendarEntry[];
  comments: EventComment[];
  memos: Memo[];
  activity: Activity[];
  rounds: GameRound[];
  answers: GameAnswer[];
  decor: DecorState[];
}

import { Request } from "express";

export interface User {
  apiKey: string;
  twitchLogin: string;
  twitchId: number;
  browserSourceId: string;
  lastAuthenticated: Date;
}

export interface DatabaseUser {
  api_key: string;
  twitch_login: string;
  twitch_id: number;
  browser_source_id: string;
  last_authenticated: Date;
}

export interface VoicelineEmitMessage {
  hero: {
    name: string;
    avatar: string;
  },
  plusTier: PlusTiers | 'caster';
  voiceline: {
    url: string;
    text: string;
  }
  username: string;
}

export type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string[];
  token_type: string;
};

export type TwitchGetUsersData = {
  broadcaster_type: string;
  description: string;
  display_name: string;
  id: string;
  login: string;
  offline_image_url: string;
  profile_image_url: string;
  type: string;
  view_count: string;
  email?: string;
  created_at: string;
};

export type TwitchGetUsersResponse = {
  data: TwitchGetUsersData[];
};

export enum PlusTiers {
  bronze = 'bronze',
  silver = 'silver',
  gold = 'gold',
  platinum = 'platinum',
  master = 'master',
  grandmaster = 'grandmaster',
  bonus = 'bonus',
  bag = 'bag'
}

interface Voiceline {
  text: string;
  url: string;
}

type EntryType = 'Hero' | 'Caster';

interface BaseEntry {
  entryType: EntryType;
  name: string[];
  icon: string;
  selection: string;
  avatar: string;
}

export interface HeroLookupTableEntry extends BaseEntry {
  entryType: 'Hero';
  plusVoicelines: {
    [key in PlusTiers]: Voiceline[];
  }
}

export interface CasterLookupTableEntry extends BaseEntry {
  entryType: 'Caster';
  casterVoicelines: Voiceline[];
}

/* Express Extended Request Response Types */

export interface CustomBodyRequest<T> extends Request {
  body: T;
}

type TwitchAuthQuery = {
  code: string;
  error: string;
  error_description: string;
  state: string;
  scope: string;
};

export type TwitchAuthRequest = Request<Record<string, never>, Record<string, never>, Record<string, never>, TwitchAuthQuery>;

type RegisterUserQuery = {
  id: string;
  login: string;
};

export type RegisterUserRequest = Request<Record<string, never>, Record<string, never>, Record<string, never>, RegisterUserQuery>;

type BrowserSourceQuery = {
  id: string;
};
export type BrowserSourceRequest = Request<Record<string, never>, Record<string, never>, Record<string, never>, BrowserSourceQuery>;

/* Error Handling Types */

export enum HttpCode {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

interface ApplicationErrorArguments {
  name?: string;
  httpCode: HttpCode;
  description: string;
  isOperational?: boolean;
}

export class ApplicationError extends Error {
  public readonly name: string;
  public readonly httpCode: HttpCode;
  public readonly isOperational: boolean = true;

  // Setup Error using ApplicationError
  constructor(args: ApplicationErrorArguments) {
    // 'super' will trigger 'Error' class constructor, which sets the error’s 'message' property to contain your 'description'
    super(args.description);

    // ? not sure why this is required
    Object.setPrototypeOf(this, new.target.prototype);

    // Default Error.name to 'Error'
    this.name = args.name || 'Error';
    this.httpCode = args.httpCode;

    // Set AppError's isOperational only if passed in Error.isOperational was defined
    if (args.isOperational !== undefined) {
      this.isOperational = args.isOperational;
    }

    Error.captureStackTrace(this);
  }
}
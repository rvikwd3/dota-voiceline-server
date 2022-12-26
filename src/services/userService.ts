import {
  ApplicationError,
  DatabaseUser,
  HttpCode,
  TwitchGetUsersResponse,
  TwitchTokenResponse,
  User,
} from "../types";
import { convertDbUserToUser } from "../typeUtils";
import { Pool } from "pg";
import { generateNewApiKey, generateNewBrowserSourceId } from "../utils";

// node-postgres config
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const findUserByApiKey = async (
  apiKey: string
): Promise<User | undefined> => {
  if (!apiKey) {
    console.log("apiKey not provided to findUserByApiKey");
    return undefined;
  }
  try {
    const result = await pool.query<DatabaseUser>(
      `SELECT * FROM users WHERE api_key = $1;`,
      [apiKey]
    );
    if (result.rowCount === 0) {
      console.log(`Could not find a user with apiKey: ${apiKey}`);
      return undefined;
    }
    if (result.rowCount > 1) {
      console.log(`DUPLICATE: Multiple users with apiKey ${apiKey} found`);
    }
    const foundUser = convertDbUserToUser(result.rows[0]);
    return foundUser;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const findUserByTwitchId = async (
  twitch_id: string
): Promise<User | undefined> => {
  try {
    const result = await pool.query<DatabaseUser>(
      `SELECT * FROM users WHERE twitch_id = $1`,
      [twitch_id]
    );

    if (result.rowCount === 0) {
      console.log(`Could not find user with twitch_id: ${twitch_id}`);
      return undefined;
    }
    if (result.rowCount > 1) {
      console.log(
        `DUPLICATE: Multiple users with twitch_id ${twitch_id} found`
      );
    }
    return convertDbUserToUser(result.rows[0]);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const findUserByTwitchLogin = async (
  twitch_login: string
): Promise<User | undefined> => {
  try {
    const result = await pool.query<DatabaseUser>(
      `SELECT * FROM users WHERE twitch_login = $1`,
      [twitch_login]
    );

    if (result.rowCount === 0) {
      console.log(`Could not find user with twitch_login: ${twitch_login}`);
      return undefined;
    }
    if (result.rowCount > 1) {
      console.log(
        `DUPLICATE: Multiple users with twitch_login ${twitch_login} found`
      );
    }
    return convertDbUserToUser(result.rows[0]);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const getTwitchUserAccessToken = async (
  authCode: string
): Promise<string> => {
  console.log(`Received code from URI: ${authCode}`);

  // Check if .env vars are defined
  if (typeof process.env.TW_CLIENT_ID === "undefined") {
    throw new Error("TW_CLIENT_ID is undefined");
  }
  if (typeof process.env.TW_CLIENT_SECRET === "undefined") {
    throw new Error("TW_CLIENT_SECRET is undefined");
  }
  if (typeof process.env.TW_REDIRECT_URI === "undefined") {
    throw new Error("TW_REDIRECT_URI is undefined");
  }
  if (typeof process.env.TW_TOKEN_URL === "undefined") {
    throw new Error("TW_TOKEN_URL is undefined");
  }

  // Create URLSearchParams to use in Twitch Token POST body
  const tokenPostBody = new URLSearchParams();
  tokenPostBody.append("client_id", process.env.TW_CLIENT_ID);
  tokenPostBody.append("client_secret", process.env.TW_CLIENT_SECRET);
  tokenPostBody.append("code", authCode);
  tokenPostBody.append("grant_type", "authorization_code");
  tokenPostBody.append("redirect_uri", process.env.TW_REDIRECT_URI);

  try {
    // Retrieve twitch access_token
    const token_response = await fetch(process.env.TW_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenPostBody,
    });

    const token_body = (await token_response.json()) as TwitchTokenResponse;
    return token_body.access_token;
  } catch (err) {
    console.error("Typeof error: ", typeof err);
    console.error("Error Body: ", err);
    throw err;
  }
};

export const getTwitchUsersData = async (access_token: string) => {
  if (!access_token) {
    console.error("access_token not provided to getTwitchUsersData");
    throw new ApplicationError({
      httpCode: HttpCode.BAD_REQUEST,
      description: "access_token not provided to getTwitchUsersData"
    });
  }

  console.log("Received access_token:", access_token);
  // Check if .env vars exist
  if (typeof process.env.TW_GETUSERS_URL === "undefined") {
    throw new Error("TW_GETUSERS_URL is undefined");
  }
  if (typeof process.env.TW_CLIENT_ID === "undefined") {
    throw new Error("TW_CLIENT_ID is undefined");
  }

  try {
    // Get User data using the received token_response
    const userData = await fetch(process.env.TW_GETUSERS_URL, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Client-Id": process.env.TW_CLIENT_ID,
        Authorization: "Bearer " + access_token,
      },
    });

    const userData_body: TwitchGetUsersResponse =
      (await userData.json()) as TwitchGetUsersResponse;

    if (userData_body?.data?.[0]) {
      // Get User Data successful
      console.log(`Get Users API request successful | userData: `);
      console.log(userData_body.data[0]);
      return userData_body.data[0];
    } else {
      // Get User Data failed
      console.log("Get Users API request FAILED");
      console.log(`${userData.status}: ${userData.statusText}`);
      return;
    }
  } catch (err) {
    console.error("Typeof error: ", typeof err);
    console.error("Error Body: ", err);
    throw err;
  }
};

export const upsertUserToDatabase = async (
  id: string,
  login: string
): Promise<User | undefined> => {
  const currentTimestamp = new Date();
  const newApiKey = generateNewApiKey();
  const newBrowserSourceId = generateNewBrowserSourceId();

  try {
    // Upsert the user
    await pool.query<DatabaseUser>(
      `INSERT INTO users (api_key, twitch_login, browser_source_id, last_authenticated, twitch_id)
      VALUES ($1, $2, $3, $4, $5)
      on conflict (twitch_id)
      DO UPDATE
      SET
      last_authenticated = $6,
      api_key = $7,
      browser_source_id = $8`,
      [
        newApiKey,
        login,
        newBrowserSourceId,
        currentTimestamp,
        id,
        currentTimestamp,
        newApiKey,
        newBrowserSourceId
      ]
    );

    // Retrieve the user from the databse
    const result = await pool.query<DatabaseUser>(
      `SELECT api_key, twitch_login, twitch_id, browser_source_id, last_authenticated
      FROM users
      WHERE twitch_id = $1`,
      [id]
    );

    console.log(`New user: `, result.rows[0]);
    return convertDbUserToUser(result.rows[0]);
  } catch (err) {
    console.log(err);
    throw err;
  }
};

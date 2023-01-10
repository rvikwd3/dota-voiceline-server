import { NextFunction, Request, Response } from "express";
import { ApplicationError, BrowserSourceRequest, HttpCode, TwitchAuthRequest } from "../types";
import Router from "express-promise-router";
import {
  findUserByTwitchId,
  getTwitchUserAccessToken,
  getTwitchUsersData,
  upsertUserToDatabase,
} from "../services/userService";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.send(`Register as a user or check your registration details`);
});

router.get("/socketDisplayPage", (req: BrowserSourceRequest, res:Response) => {
  const {id} = req.query;
  res.render('socketDisplayPage', {browserSourceId: id, socketIoServerUri: process.env.SOCKETIO_SERVER_URI});
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get( "/auth", async ( req: TwitchAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log("Starting twitch authentication");

    // Get query parameters
    const { code, error, error_description, /*scope,*/ state } = req.query;

    // Check if a cookie-session has been set in the Request
    if (!req.session?.twitchAuthState) {
      throw new ApplicationError({
        httpCode: HttpCode.BAD_REQUEST,
        description: "The Twitch Authentication Cookie has possibly expired. Property 'session' missing from /user/auth Request object",
      });
    }
    console.log(`Cookie twitchAuthState: ${req.session.twitchAuthState}`);

    // Check if state matches provided state correctly
    if (state && decodeURIComponent(state) != req.session.twitchAuthState) {
      console.log("Received state doesn't match stored cookie-session twitchAuthState");
      throw new ApplicationError({
        httpCode: HttpCode.UNAUTHORIZED,
        description: "Session state and state provided by Twitch Auth do not match",
      });
    }

    // If error occurs after clicking on 'Login on Twitch' link
    // display error and redirect to root
    if (error && error_description) {
      console.log("Twitch Authentication Error: ", error);
      console.log(error_description);

      throw new ApplicationError({
        httpCode: HttpCode.UNAUTHORIZED,
        description: error_description
      });
    }

    // Authentication is successful and Authorization Code has been provided in Twitch Redirect
    if (code) {
      try {
        const access_token = await getTwitchUserAccessToken(code);  // Get access token from twitch OAuth authorization code
        const twitchUserData = await getTwitchUsersData(access_token);  // Get user data from twitch API
        if (twitchUserData) {
          console.log("Successful Twitch User Data Retreival");

          // Check if user exists in the database
          const foundUser = await findUserByTwitchId(twitchUserData.id);
          if (foundUser) {
            // if a user already exists, and the user has been recently authenticated (not stale)
            return res.render("registrationAlreadyExists", {
              id: foundUser.twitchId,
              login: foundUser.twitchLogin,
              apiKey: foundUser.apiKey,
              browserSourceUrl: `/user/socketDisplayPage?id=${foundUser.browserSourceId}`,
            });
          } else {
            // generate a new api_key and register the user
            const newUser = await upsertUserToDatabase(
              twitchUserData.id,
              twitchUserData.login
            );
            if (newUser) {
              return res.render("registerSuccess", {
                id: newUser.twitchId,
                login: newUser.twitchLogin,
                apiKey: newUser.apiKey,
                browserSourceUrl: `/user/socketDisplayPage?id=${newUser.browserSourceId}`,
              });
            } else {
              throw new ApplicationError({
                httpCode: HttpCode.INTERNAL_SERVER_ERROR,
                description:`Could not upsert user ${twitchUserData.login} to the database` 
              });
            }
          }
        }
      } catch (err) {
        console.error("Typeof error: ", typeof err);
        console.error("Error Body: ", err);
        next(err);
      }
      return;
    }

    // If no code is in parameter URL, send a 400 Bad Request
    throw new ApplicationError({
      httpCode: HttpCode.BAD_REQUEST,
      description: `Bad request. Need a URL 'code' parameter.`,
    });
  }
);

export default router;

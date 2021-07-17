import * as functions from "firebase-functions";
import * as express from "express";
// http
import {getLeagues} from "./http/leagueController";
import {getAllFixturesForLeague} from "./http/fixtureController";

// triggers
import {onFixturePlayerStatCreate as playerStat} from "./trigger/player_stat";

// Http
const api = express();
api.get("/", (req, res) => res.status(200).send("Hey there!"));
api.get("/leagues", getLeagues);
api.get("/:leagueId/fixtures", getAllFixturesForLeague);

exports.app = functions.https.onRequest(api);

// Triggers
export const onFixturePlayerStatCreate = playerStat;


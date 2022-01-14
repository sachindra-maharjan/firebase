/* eslint-disable object-curly-spacing */
import { Request, Response } from "express";
import { db } from "../config/firestore";

const getAllFixturesForLeague = async (
  req: Request,
  res: Response
): Promise<Response<unknown, Record<string, unknown>>> => {
  const {
    params: { leagueId },
  } = req;
  console.log(`leagueId: ${leagueId}`);

  try {
    const fixtureSnapshots = await db
      .doc("/football-leagues/premierleague/leagues/leagueId_" + leagueId)
      .collection("fixtures")
      .get();
    const fixtures: FirebaseFirestore.DocumentData = [];
    fixtureSnapshots.forEach((snapshot) => {
      fixtures.push(snapshot.data());
    });
    return res.status(200).send(fixtures);
  } catch (error) {
    return res.status(400).send(error);
  }
};

export { getAllFixturesForLeague };

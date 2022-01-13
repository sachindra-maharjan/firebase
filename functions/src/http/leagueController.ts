import {Request, Response} from "express";
import {db} from "../config/firestore";

const getLeagues = async (
  req: Request,
  res: Response
): Promise<Response<unknown, Record<string, unknown>>> => {
  try {
    const snapshots = await db
      .doc("/football-leagues/premierleague")
      .collection("/leagues")
      .get();
    const leagues: FirebaseFirestore.DocumentData = [];
    snapshots.forEach((league) => {
      leagues.push(league.data());
    });
    return res.status(200).send(leagues);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return res.status(500).send(error.message);
  }
};

export {getLeagues};

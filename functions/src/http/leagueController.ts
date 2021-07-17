import {Request, Response} from "express";
import {db} from "../config/firestore";

const getLeagues = async (req: Request, res: Response):
    Promise<Response<any, Record<string, any>>> => {
  try {
    const snapshots = await db.doc("/football-leagues/premierleague")
        .collection("/leagues").get();
    const leagues: FirebaseFirestore.DocumentData = [];
    snapshots.forEach((league) => {
      leagues.push(league.data());
    });
    return res.status(200).send(leagues);
  } catch ( error ) {
    return res.status(500).send(error.message);
  }
};

export {getLeagues};

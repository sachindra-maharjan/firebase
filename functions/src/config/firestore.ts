import * as admin from "firebase-admin";

admin.initializeApp();
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});

const db = admin.firestore();

export {admin, db};

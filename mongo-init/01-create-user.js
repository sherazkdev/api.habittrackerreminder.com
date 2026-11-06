const database = db.getSiblingDB("habit_tracker");

database.createUser({
  user: "appuser",
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [
    {
      role: "readWrite",
      db: "habit_tracker"
    }
  ]
});

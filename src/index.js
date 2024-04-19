import { app } from "./app.js";
import { connectDB } from "./db/database.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is listening to port: ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("Server connection failed: ", error);
  });

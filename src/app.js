import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

import userRoutes from "./routes/user.route.js";
import videoRoutes from "./routes/video.route.js";
import tweetRoutes from "./routes/tweet.route.js";
import subscriptionRoutes from "./routes/subscription.route.js";
import commentRoutes from "./routes/comment.route.js";
import likeRoutes from "./routes/like.route.js";
import playListRoutes from "./routes/playlist.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";

// User routes:
app.use("/api/v1/users", userRoutes);

// Video routes:
app.use("/api/v1/video", videoRoutes);

// Tweet routes:
app.use("/api/v1/tweet", tweetRoutes);

// Subscription routes:
app.use("/api/v1/subscription", subscriptionRoutes);

// Comments routes:
app.use("/api/v1/comment", commentRoutes);

// Likes routes:
app.use("/api/v1/like", likeRoutes);

// Playlist routes:
app.use("/api/v1/playlist", playListRoutes);

// Dashboard routes:
app.use("/api/v1/dashboard", dashboardRoutes);

export { app };

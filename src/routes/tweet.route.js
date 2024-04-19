import { Router } from "express";
import { Authenticate } from "../middlewares/auth.middleware.js";
import {
  createTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";

const router = Router();

router.route("/create-tweet").post(Authenticate, createTweet);
router.route("/").get(Authenticate, getUserTweets);
router.route("/update-tweet/:tweetId").patch(Authenticate, updateTweet);
router.route("/delete-tweet/:tweetId").delete(Authenticate, deleteTweet);

export default router;

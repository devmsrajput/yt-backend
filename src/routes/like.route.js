import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";
import { Authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/like-video/:videoId").get(Authenticate, toggleVideoLike);
router.route("/like-comment/:commentId").get(Authenticate, toggleCommentLike);
router.route("/like-tweet/:tweetId").get(Authenticate, toggleTweetLike);
router.route("/liked-video").get(Authenticate, getLikedVideos);

export default router;

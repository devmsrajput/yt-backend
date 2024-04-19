import { Router } from "express";
import { Authenticate } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/add-comment/:videoId").post(Authenticate, addComment);
router.route("/video-comment/:videoId").get(Authenticate, getVideoComments);
router.route("/update-comment/:commentId").patch(Authenticate, updateComment);
router.route("/delete-comment/:commentId").delete(Authenticate, deleteComment);

export default router;

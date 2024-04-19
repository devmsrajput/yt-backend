import { Router } from "express";
import { Authenticate } from "../middlewares/auth.middleware.js";
import {
  getChannelStats,
  getChannelVideos,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.route("/stats").get(Authenticate, getChannelStats);
router.route("/videos").get(Authenticate, getChannelVideos);

export default router;

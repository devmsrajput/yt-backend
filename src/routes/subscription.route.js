import { Router } from "express";
import { Authenticate } from "../middlewares/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.route("/subscribe/:channelId").get(Authenticate, toggleSubscription);
router
  .route("/subscribers/:channelId")
  .get(Authenticate, getUserChannelSubscribers);
router
  .route("/subscribed/:subscriberId")
  .get(Authenticate, getSubscribedChannels);

export default router;

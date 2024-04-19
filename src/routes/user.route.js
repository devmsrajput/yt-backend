import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { validationMiddleware } from "../middlewares/validation.middleware.js";
import {
  userChangePassword,
  userChannelProfile,
  userCurrentProfile,
  userLogin,
  userLogout,
  userRefreshAccessToken,
  userSignup,
  userUpdateAvatar,
  userUpdateCover,
  userUpdateProfileDetails,
} from "../controllers/user.controller.js";
import { Authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/signup").post(
  upload.fields([
    {
      name: "avatarImage",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  validationMiddleware,
  userSignup
);

router.route("/login").post(userLogin);

// Secured routes:
router.route("refresh-token").post(userRefreshAccessToken);
router.route("/logout").post(Authenticate, userLogout);
router
  .route("/change-password")
  .post(Authenticate, validationMiddleware, userChangePassword);
router
  .route("/update-profile")
  .patch(Authenticate, validationMiddleware, userUpdateProfileDetails);
router
  .route("/upload-avatar")
  .patch(Authenticate, upload.single("avatarImage"), userUpdateAvatar);
router
  .route("/upload-cover")
  .patch(Authenticate, upload.single("coverImage"), userUpdateCover);
router.route("/current-profile").get(Authenticate, userCurrentProfile);
router.route("/:username").get(Authenticate, userChannelProfile);

export default router;

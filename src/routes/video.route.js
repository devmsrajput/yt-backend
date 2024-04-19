import { Router } from "express";
import { Authenticate } from "../middlewares/auth.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  togglePublishStatus,
  updateVideo,
  uploadAVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { validationMiddleware } from "../middlewares/validation.middleware.js";

const router = Router();

router.route("/upload-video").post(
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnailFile",
      maxCount: 1,
    },
  ]),
  Authenticate,
  validationMiddleware,
  uploadAVideo
);

router.route("/").get(Authenticate, getAllVideos);
router.route("/:videoId").get(Authenticate, getVideoById);
router
  .route("/update-video/:videoId")
  .patch(Authenticate, upload.single("thumbnailFile"), updateVideo);
router.route("/delete-video/:videoId").delete(Authenticate, deleteVideo);
router.route("/publish/:videoId").patch(Authenticate, togglePublishStatus);

export default router;

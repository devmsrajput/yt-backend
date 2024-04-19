import { Router } from "express";
import { Authenticate } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.route("/create-playlist").post(Authenticate, createPlaylist);
router.route("/get-playlists/:userId").get(Authenticate, getUserPlaylists);
router.route("/get-playlist/:playlistId").get(Authenticate, getPlaylistById);
router
  .route("/add-video-playlist/:playlistId/:videoId")
  .get(Authenticate, addVideoToPlaylist);
router
  .route("/remove-video-playlist/:playlistId/:videoId")
  .delete(Authenticate, removeVideoFromPlaylist);
router
  .route("/remove-playlist/:playlistId")
  .delete(Authenticate, deletePlaylist);
router
  .route("/update-playlist/:playlistId")
  .patch(Authenticate, updatePlaylist);

export default router;

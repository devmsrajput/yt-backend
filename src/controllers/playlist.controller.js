import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { APIResponse } from "../utils/APIResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

// Verifying playlist owner:
const isPlayListOwner = async (userId, playlistId) => {
  const playlistData = await Playlist.findById(playlistId);
  if (playlistData.owner?._id.toString() === userId.toString()) {
    return true;
  } else {
    return false;
  }
};

const createPlaylist = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { name, description } = req.body;
  // Create playlist

  if (![name, description].every((field) => field?.trim().length > 0)) {
    // Validating received fields.
    return res
      .status(400)
      .json(new APIResponse(400, {}, "All fields are required."));
  }

  await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Playlist created successfully."));
});

const getUserPlaylists = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { userId } = req.params;
  // Get user playlists

  if (!isValidObjectId(userId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object id."));
  }

  const getPlayList = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  //   console.log(getPlayList);

  if (!getPlayList.length > 0) {
    return res.status(400).json(new APIResponse(400, {}, "No playlist found."));
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { playlists: getPlayList },
        "Fetched playlists successfully."
      )
    );
});

const getPlaylistById = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!isValidObjectId(playlistId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object id."));
  }

  const getPlayList = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
  ]);

  if (!getPlayList.length > 0) {
    return res.status(400).json(new APIResponse(400, {}, "No playlist found."));
  }

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { playlist: getPlayList },
        "Fetched playlist successfully."
      )
    );
});

const addVideoToPlaylist = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { playlistId, videoId } = req.params;

  if (!(isValidObjectId(playlistId) && isValidObjectId(videoId))) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object id."));
  }

  const isValidPlaylistOnwer = await isPlayListOwner(req.user?._id, playlistId);

  if (!isValidPlaylistOnwer) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not allowed to perform this operation."));
  }

  const isValidVideo = await Video.findById(videoId);

  if (!isValidVideo) {
    return res.status(400).json(new APIResponse(400, {}, "No video found."));
  }

  const isVideoInPlaylist = await Playlist.aggregate([
    // Checking if that video in playlist already
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $unwind: "$videos",
    },
    {
      $match: {
        videos: new mongoose.Types.ObjectId(isValidVideo?._id),
      },
    },
  ]);

  if (isVideoInPlaylist.length > 0) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Video already in the playlist."));
  }

  const videoPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: { videos: `${isValidVideo?._id}` },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Playlist video added successfully."));
});

const removeVideoFromPlaylist = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!isValidObjectId(playlistId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid playlist object Id."));
  }

  if (!isValidObjectId(videoId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid video object Id."));
  }

  const isValidPlaylistOnwer = await isPlayListOwner(req.user?._id, playlistId);

  if (!isValidPlaylistOnwer) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not allowed to perform this operation."));
  }

  const remVidPlaylist = await Playlist.updateOne(
    {
      _id: new mongoose.Types.ObjectId(playlistId),
    },
    {
      $pull: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    }
  );

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Playlist video removed successfully."));
});

const deletePlaylist = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!isValidObjectId(playlistId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid playlist object Id."));
  }

  const isValidPlaylistOnwer = await isPlayListOwner(req.user?._id, playlistId);

  if (!isValidPlaylistOnwer) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not allowed to perform this operation."));
  }

  const delPlaylist = await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Playlist deleted successfully."));
});

const updatePlaylist = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!isValidObjectId(playlistId)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not valid playlist object Id."));
  }

  if (![name, description].every((field) => field?.trim().length > 0)) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "All fields are required."));
  }

  const isValidPlaylistOnwer = await isPlayListOwner(req.user?._id, playlistId);

  if (!isValidPlaylistOnwer) {
    return res
      .status(400)
      .json(new APIResponse(400, {}, "Not allowed to perform this operation."));
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new APIResponse(200, {}, "Playlist updated successfully."));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};

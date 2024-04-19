import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import { APIResponse } from "../utils/APIResponse.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Subscription } from "../models/subscription.model.js";

const getChannelStats = AsyncHandler(async (req, res) => {
  // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  if (!req.auth) {
    // Authetication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  let stats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $facet: {
        metadata: [
          {
            $count: "totalVideos",
          },
          {
            $addFields: {
              pageNumber: page,
              totalPages: { $ceil: { $divide: ["$totalVideos", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ],
      },
    },
  ]);

  // Finding total views:
  let tViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $group: {
        // Grouped all video docs and sum all.
        _id: null,
        totalV: {
          $sum: "$views",
        },
      },
    },
  ]);

  // Finding total likes:
  const tLikes = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        // Left joining of likes model.
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $unwind: "$likes", // Here we have ids in likes array, extracting from array
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: 1,
        },
      },
    },
  ]);

  // Finding total subscribers:
  let tSubs = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $count: "totalSubs",
    },
  ]);

  // Cleaning gathered data:
  stats = stats[0];
  stats.metadata = stats.metadata[0];
  stats.metadata.totalViews = tViews[0].totalV;
  stats.metadata.totalLikes = tLikes[0].totalLikes;
  stats.metadata.totalSubscribers = tSubs[0].totalSubs;

  return res
    .status(200)
    .json(new APIResponse(200, { stats }, "Dashboard fetched successfully"));
});


// Get all the videos uploaded by the channel:
const getChannelVideos = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    // Authentication
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  let allVids = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $facet: {
        metadata: [
          {
            $count: "totalVideos",
          },
          {
            $addFields: {
              pageNumber: page,
              totalPages: { $ceil: { $divide: ["$totalVideos", limit] } },
            },
          },
        ],
        data: [
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ],
      },
    },
  ]);

  allVids = allVids[0];
  allVids.metadata = allVids.metadata[0];

  return res.status(200).json(
    new APIResponse(
      200,
      {
        videos: allVids,
      },
      "Dashboard fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };

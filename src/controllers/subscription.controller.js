import { Subscription } from "../models/subscription.model.js";
import { APIResponse } from "../utils/APIResponse.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

const toggleSubscription = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!isValidObjectId(channelId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object Id."));
  }

  let result = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(req.user?._id),
        // channel: new mongoose.Types.ObjectId(channelId) // We can do it here though, it checks as AND.
      },
    },
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
  ]);

  if (result.length > 0) {
    await Subscription.findByIdAndDelete(result[0]._id);

    return res
      .status(200)
      .json(new APIResponse(200, {}, "Unsubscribed successfully."));
  } else {
    await Subscription.create({
      channel: channelId,
      subscriber: req.user?._id,
    });

    return res
      .status(200)
      .json(new APIResponse(200, {}, "Subscribed successfully."));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object Id."));
  }

  const fetchedSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $count: "subscribers",
    },
  ]);

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { subscribers: fetchedSubscribers[0]?.subscribers },
        "Subscribers fetched successfully."
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = AsyncHandler(async (req, res) => {
  if (!req.auth) {
    return res.status(400).json(new APIResponse(400, {}, req.authWarning));
  }

  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    return res.status(400).json(new APIResponse(400, {}, "Invalid object Id."));
  }

  const fetchedSubscribedTo = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $count: "subscribedTo",
    },
  ]);

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { subscribedTo: fetchedSubscribedTo[0]?.subscribedTo },
        "Subscribed to fetched successfully."
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };

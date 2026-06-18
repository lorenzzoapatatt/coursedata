const Mux = require("@mux/mux-node");

const isMuxConfigured = () =>
  Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);

const getMuxClient = () => {
  if (!isMuxConfigured()) {
    const error = new Error(
      "Configure MUX_TOKEN_ID and MUX_TOKEN_SECRET to upload videos.",
    );
    error.code = "MUX_NOT_CONFIGURED";
    throw error;
  }

  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  });
};

const getCorsOrigin = (req) =>
  process.env.MUX_CORS_ORIGIN || `${req.protocol}://${req.get("host")}`;

const createDirectUpload = async ({ req, chapter }) => {
  const client = getMuxClient();

  return client.video.uploads.create({
    cors_origin: getCorsOrigin(req),
    timeout: Number(process.env.MUX_UPLOAD_TIMEOUT_SECONDS || 3600),
    new_asset_settings: {
      playback_policies: ["public"],
      passthrough: `chapter:${chapter.id}`,
      meta: {
        title: chapter.title,
        external_id: `chapter-${chapter.id}`,
      },
    },
  });
};

const getUploadStatus = async (uploadId) => {
  const client = getMuxClient();
  const upload = await client.video.uploads.retrieve(uploadId);
  let asset = null;
  let playbackId = null;

  if (upload.asset_id) {
    asset = await client.video.assets.retrieve(upload.asset_id);
    playbackId = asset.playback_ids?.find((playback) => playback.policy === "public")?.id;
    playbackId = playbackId || asset.playback_ids?.[0]?.id || null;
  }

  return {
    upload,
    asset,
    playbackId,
  };
};

module.exports = {
  createDirectUpload,
  getUploadStatus,
  isMuxConfigured,
};

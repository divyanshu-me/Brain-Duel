import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// GET /api/v1/health  -> lets you (and Render) check the server is alive
const healthCheck = asyncHandler(async (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "ok",
        uptimeSeconds: Math.round(process.uptime()),
        namespaces: ["/ttt", "/quiz"],
      },
      "Brain-Duel server is running"
    )
  );
});

export { healthCheck };

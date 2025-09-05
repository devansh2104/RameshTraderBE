//Newsletter routes

const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletterController");

router.get("/", newsletterController.getAllSubscribers);
router.post("/subscribe", newsletterController.subscribeUser);

// GET request on API path should redirect to frontend unsubscribe route
// This preserves existing email links that point to /api/newsletter/unsubscribe?token=...
router.get("/unsubscribe", (req, res) => {
  const { token = "" } = req.query || {};
  const APP_ORIGIN = process.env.CORS_ORIGIN || process.env.APP_ORIGIN || "https://rameshtrader.com";
  const target = token
    ? `${APP_ORIGIN}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
    : `${APP_ORIGIN}/newsletter/unsubscribe`;
  return res.redirect(302, target);
});

//Post request to actually unsubscribe the user
router.post("/unsubscribe", newsletterController.unsubscribeUser);

router.get("/:id", newsletterController.getSubscriberById);

module.exports = router;

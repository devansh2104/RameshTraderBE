// controllers/newsletterController.js
const db = require("../db");
const crypto = require("crypto");
const { sendNewsletterWelcomeMail } = require("./mailController");

// ✅ Subscribe user
exports.subscribeUser = (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if already in DB
    db.query(
      "SELECT * FROM subscribers WHERE email = ?",
      [email],
      (err, results) => {
        if (err) {
          console.error("Error checking subscription:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err.sqlMessage });
        }

        if (results.length > 0) {
          const subscriber = results[0];

          if (subscriber.is_active === 1) {
            // Already active subscriber

            return res.status(400).json({ message: "Already subscribed" });
          } else {
            // Reactivate unsubscribed user
            const newToken = crypto.randomBytes(32).toString("hex");
            db.query(
              "UPDATE subscribers SET is_active = 1, unsubscribed_at = NOW(), unsubscribe_token = ? WHERE email = ?",
              [newToken, email],
              (err2) => {
                if (err2) {
                  console.error("Error reactivating subscriber:", err2);
                  return res.status(500).json({
                    error: "Database error",
                    details: err2.message,
                  });
                }
                sendNewsletterWelcomeMail(
                  email,
                  result.insertId,
                  newToken
                ).catch((err) => console.error("Email error:", err));

                return res.status(200).json({
                  message: "Subscription reactivated successfully",
                  subscriber_id: subscriber.id,
                  unsubscribe_token: newToken,
                });
              }
            );
          }
        } else {
          // New subscriber
          const unsubscribeToken = crypto.randomBytes(32).toString("hex");
          db.query(
            "INSERT INTO subscribers (email, is_active, unsubscribed_at, unsubscribe_token) VALUES (?, 1, NOW(), ?)",
            [email, unsubscribeToken],
            (err3, result) => {
              if (err3) {
                console.error("Error adding subscriber:", err3);
                return res
                  .status(500)
                  .json({ error: "Database error", details: err3.sqlMessage });
              }

              sendNewsletterWelcomeMail(email, unsubscribeToken).catch((err) =>
                console.error("Email error:", err)
              );

              res.status(201).json({
                message: "Subscription successful",
                subscriber_id: result.insertId,
                unsubscribe_token: unsubscribeToken,
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error in subscribeUser:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// controllers/newsletterController.js
exports.unsubscribeUser = (req, res) => {
  const token = (req.query && req.query.token) || (req.body && req.body.token) || '';

  if (!token) {
    return res.status(400).json({ success: false, message: "Token is required" });
  }

  db.query(
    "UPDATE subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE unsubscribe_token = ? AND is_active = 1",
    [token],
    (err, result) => {
      if (err) {
        console.error("Error updating subscriber:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (result.affectedRows === 0) {
        // Check whether token exists and is already unsubscribed → respond idempotently
        return db.query(
          "SELECT is_active FROM subscribers WHERE unsubscribe_token = ?",
          [token],
          (err2, rows) => {
            if (err2) {
              console.error("DB check error:", err2);
              return res.status(500).json({ success: false, message: "Database error" });
            }
            if (!rows || rows.length === 0) {
              return res.status(404).json({ success: false, message: "Invalid or expired unsubscribe token" });
            }
            const isActive = rows[0].is_active === 1;
            if (!isActive) {
              // Already unsubscribed → treat as success (idempotent)
              return res.status(200).json({ success: true, message: "You are already unsubscribed." });
            }
            // Edge case: no row updated but still active
            return res.status(409).json({ success: false, message: "Could not unsubscribe. Please try again." });
          }
        );
      }
      return res.status(200).json({ success: true, message: "You have been unsubscribed successfully." });
    }
  );
};

// ✅ Get all active subscribers
exports.getAllSubscribers = (req, res) => {
  try {
    db.query(
      "SELECT id, email, unsubscribe_token, unsubscribed_at FROM subscribers WHERE is_active = 1",
      (err, results) => {
        if (err) {
          console.error("Error fetching subscribers:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err.sqlMessage });
        }
        res.json(results);
      }
    );
  } catch (error) {
    console.error("Error in getAllSubscribers:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// 1. Show confirmation page (GET)
exports.showUnsubscribeConfirmation = (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("<h2>❌ Invalid request: token missing.</h2>");
  }

  // Serve confirmation page
  res.send(`
    <h2>Do you really want to unsubscribe?</h2>
    <form method="POST" action="/api/newsletter/unsubscribe?token=${token}">
      <button type="submit">✅ Yes, unsubscribe me</button>
    </form>
    <form method="GET" action="https://rameshtrader.com">
      <button type="submit">❌ No, keep me subscribed</button>
    </form>
  `);
};

// 1. Show confirmation page (GET) → redirect to frontend unsubscribe route
exports.showUnsubscribeConfirmation = (req, res) => {
  const { token } = req.query;
  const APP_ORIGIN = process.env.CORS_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:4000';
  if (!token) {
    return res.redirect(302, `${APP_ORIGIN}/newsletter/unsubscribe`);
  }
  return res.redirect(302, `${APP_ORIGIN}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
};

// ✅ Get subscriber by ID
exports.getSubscriberById = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Subscriber ID is required" });
    }

    db.query(
      "SELECT id, email, unsubscribe_token, unsubscribed_at, is_active FROM subscribers WHERE id = ?",
      [id],
      (err, results) => {
        if (err) {
          console.error("❌ Error fetching subscriber by ID:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err.sqlMessage });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "Subscriber not found" });
        }

        res.json(results[0]);
      }
    );
  } catch (error) {
    console.error("Error in getSubscriberById:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Unsubscribe user by ID
// exports.unsubscribeUserById = (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({ error: "subscriber_id is required" });
//     }

//     db.query(
//       "UPDATE subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE id = ?",
//       [id],
//       (err, result) => {
//         if (err) {
//           console.error("Error updating subscriber by ID:", err);
//           return res.status(500).json({ error: "Database error", details: err.sqlMessage });
//         }

//         if (result.affectedRows === 0) {
//           return res.status(404).json({ message: "Subscriber not found" });
//         }

//         res.json({ message: "Unsubscribed successfully by ID" });
//       }
//     );
//   } catch (error) {
//     console.error("Error in unsubscribeUserById:", error.message);
//     return res.status(500).json({ error: error.message });
//   }
// };

// ✅ Unsubscribe user by token (used from email link)
exports.unsubscribeUserByToken = (req, res) => {
  try {
    const { token } = req.query; // token comes from email link like ?token=abcd1234

    if (!token) {
      return res.status(400).json({ error: "unsubscribe_token is required" });
    }

    db.query(
      "UPDATE subscribers SET is_active = 0, unsubscribed_at = NOW() WHERE unsubscribe_token = ?",
      [token],
      (err, result) => {
        if (err) {
          console.error("❌ Error unsubscribing by token:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err.sqlMessage });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Invalid or expired unsubscribe token" });
        }

        res.send(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>You've been unsubscribed successfully</h2>
            <p>Sorry to see you go! You won’t receive further emails from us.</p>
            <a href="https://rameshtrader.com/blogs" style="color: white; background: #ff4d4d; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Back to Blog</a>
          </div>
        `);
      }
    );
  } catch (error) {
    console.error("Error in unsubscribeUserByToken:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

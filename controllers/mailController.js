// controllers/mailController.js
const db = require("../db");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.OWNER_EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Frontend origin used in email links
// Set CORS_ORIGIN=https://rameshtrader.com in production
const CORS_ORIGIN = process.env.CORS_ORIGIN || "https://rameshtrader.com";

exports.sendNewsletterWelcomeMail = async (email, unsubscribeToken) => {
  console.log("📧 Sending welcome mail to:", email);
  try {
    const mailOptions = {
      from: process.env.OWNER_EMAIL,
      to: email,
      subject: "🎉 Welcome to Ramesh Trader Newsletter!",
      html: `
  <div style="max-width:600px;margin:0 auto;background:#ffffff;
              font-family:Arial,Helvetica,sans-serif;color:#333;
              border-radius:8px;overflow:hidden;border:1px solid #e5e5e5">

    <!-- Header -->
    <div style="background:#0d6efd;padding:20px;text-align:center;color:#fff">
      <h1 style="margin:0;font-size:22px;">Ramesh Trader</h1>
      <p style="margin:5px 0 0;font-size:14px;">Welcome to our newsletter!</p>
    </div>

    <!-- Welcome Message -->
    <div style="padding:20px;">
      <h2 style="margin-top:0;font-size:20px;color:#0d6efd;">Hello!</h2>
      <p style="font-size:15px;line-height:1.6;color:#555;">
        Thank you for subscribing to Ramesh Trader Blogs. 🎉
        You’ll now receive updates whenever we publish new blogs.
      </p>

      <div style="text-align:center;margin:30px 0;">
        <a href="${CORS_ORIGIN}/blogs" 
           style="background:#0d6efd;color:#fff;text-decoration:none;
                  padding:12px 20px;border-radius:5px;font-size:15px;
                  display:inline-block;">
          Explore Our Blogs
        </a>
      </div>
    </div>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #eee;margin:0">

    <!-- Footer -->
    <div style="padding:15px;text-align:center;font-size:12px;color:#777;">
      <p style="margin:0;">You are receiving this email because you subscribed to Ramesh Trader’s newsletter.</p>
      <p style="margin:5px 0 0;">
        <a href="${CORS_ORIGIN}/newsletter/unsubscribe?token=${unsubscribeToken}" 
           style="color:#0d6efd;text-decoration:none;">
          Unsubscribe
        </a>
      </p>
    </div>
  </div>
`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Error sending welcome email to:", email, error);
      } else {
        console.log("✅ Welcome email sent to:", email, info.response);
      }
    });
  } catch (error) {
    console.error("Error in sendNewsletterWelcomeMail:", error.message);
  }
};

//Creating a function to send blog mail to all active subscribers
exports.sendBlogMail = async (blog) => {
  try {
    db.query(
      "SELECT email, unsubscribe_token FROM subscribers WHERE is_active = 1",
      async (err, results) => {
        if (err) {
          console.error("Error fetching subscribers:", err);
          return;
        }

        if (results.length === 0) {
          console.log("No active subscribers found.");
          return;
        }

        results.forEach((sub) => {
          const mailOptions = {
            from: process.env.OWNER_EMAIL,
            to: sub.email,
            subject: `📢 New Blog Posted: ${blog.title}`,
            html: `
  <div style="max-width:600px;margin:0 auto;background:#ffffff;
              font-family:Arial,Helvetica,sans-serif;color:#333;
              border-radius:8px;overflow:hidden;border:1px solid #e5e5e5">

    <!-- Header -->
    <div style="background:#0d6efd;padding:20px;text-align:center;color:#fff">
      <h1 style="margin:0;font-size:22px;">Ramesh Trader</h1>
      <p style="margin:5px 0 0;font-size:14px;">Latest blog update for you</p>
    </div>

              <p>If you no longer want to receive our emails, click here to 
                <a href="${CORS_ORIGIN}/newsletter/unsubscribe?token=${sub.unsubscribe_token
              }">
  unsubscribe
</a>

    <!-- Blog Preview -->
    <div style="padding:20px;">
      <h2 style="margin-top:0;font-size:20px;color:#0d6efd;">${blog.title}</h2>
      <p style="font-size:15px;line-height:1.6;color:#555;">
        ${blog.content.substring(0, 200)}...
      </p>

      <div style="text-align:center;margin:30px 0;">
        <a href="${CORS_ORIGIN}/blogs/${blog.id}" 
           style="background:#0d6efd;color:#fff;text-decoration:none;
                  padding:12px 20px;border-radius:5px;font-size:15px;
                  display:inline-block;">
          🔗 Read Full Blog
        </a>
      </div>
    </div>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #eee;margin:0">

    <!-- Footer -->
    <div style="padding:15px;text-align:center;font-size:12px;color:#777;">
      <p style="margin:0;">You are receiving this email because you subscribed to Ramesh Trader’s newsletter.</p>
      <p style="margin:5px 0 0;">
        <a href="${CORS_ORIGIN}/newsletter/unsubscribe?token=${
          sub.unsubscribe_token
        }" 
           style="color:#0d6efd;text-decoration:none;">
          Unsubscribe
        </a>
      </p>
    </div>
  </div>
`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("❌ Error sending email to:", sub.email, error);
            } else {
              console.log("✅ Blog email sent to:", sub.email, info.response);
            }
          });
        });
      }
    );
  } catch (error) {
    console.error("Error in sendBlogMail:", error.message);
  }
};

//Creating a function to send updated blog mail to all active subscribers
exports.sendBlogUpdateMail = async (blog) => {
  try {
    db.query(
      "SELECT email, unsubscribe_token FROM subscribers WHERE is_active = 1",
      async (err, results) => {
        if (err) {
          console.error("Error fetching subscribers:", err);
          return;
        }

        if (results.length === 0) {
          console.log("No active subscribers found.");
          return;
        }

        results.forEach((sub) => {
          const mailOptions = {
            from: process.env.OWNER_EMAIL,
            to: sub.email,
            subject: `✏️ Blog Updated: ${blog.title}`,
            html: `
  <div style="max-width:600px;margin:0 auto;background:#ffffff;
              font-family:Arial,Helvetica,sans-serif;color:#333;
              border-radius:8px;overflow:hidden;border:1px solid #e5e5e5">

    <!-- Header -->
    <div style="background:#ffc107;padding:20px;text-align:center;color:#fff">
      <h1 style="margin:0;font-size:22px;">Ramesh Trader</h1>
      <p style="margin:5px 0 0;font-size:14px;">An update has been made to a blog you follow</p>
    </div>

    <!-- Blog Cover Image -->
    ${
      blog.cover_image
        ? `<div style="text-align:center;">
             <img src="${blog.cover_image}" alt="${blog.alt_tag || blog.title}" 
                  style="width:100%;max-height:300px;object-fit:cover;display:block;border-bottom:1px solid #eee;">
           </div>`
        : ""
    }

    <!-- Blog Update Preview -->
    <div style="padding:20px;">
      <h2 style="margin-top:0;font-size:20px;color:#ffc107;">${blog.title}</h2>
      <p style="font-size:15px;line-height:1.6;color:#555;">
        ${blog.content.substring(0, 200)}...
      </p>

      <div style="text-align:center;margin:30px 0;">
        <a href="${CORS_ORIGIN}/blogs/${blog.id}" 
           style="background:#ffc107;color:#fff;text-decoration:none;
                  padding:12px 20px;border-radius:5px;font-size:15px;
                  display:inline-block;">
          🔄 Read Updated Blog
        </a>
      </div>
    </div>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #eee;margin:0">

    <!-- Footer -->
    <div style="padding:15px;text-align:center;font-size:12px;color:#777;">
      <p style="margin:0;">You are receiving this email because you subscribed to Ramesh Trader’s newsletter.</p>
      <p style="margin:5px 0 0;">
        <a href="${CORS_ORIGIN}/newsletter/unsubscribe?token=${
          sub.unsubscribe_token
        }" 
           style="color:#ffc107;text-decoration:none;">
          Unsubscribe
        </a>
      </p>
    </div>
  </div>
`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error(
                "❌ Error sending update email to:",
                sub.email,
                error
              );
            } else {
              console.log(
                "✅ Blog update email sent to:",
                sub.email,
                info.response
              );
            }
          });
        });
      }
    );
  } catch (error) {
    console.error("Error in sendBlogUpdateMail:", error.message);
  }
};

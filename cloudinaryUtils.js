// cloudinaryUtils.js
// Utility to extract Cloudinary public_id from image URL

function extractPublicId(url) {
  // Example: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folder/filename.png
  const matches = url && url.match(/\/upload\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/);
  if (matches && matches[1]) {
    return matches[1];
  }
  return null;
}

module.exports = { extractPublicId }; 
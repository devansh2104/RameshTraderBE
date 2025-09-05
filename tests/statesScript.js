const axios = require("axios");

const apiURL = "http://localhost:4001/api/states";

const statesAndUTs = [
  "Andaman and Nicobar Islands (UT)",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh (UT)",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu (UT)",
  "Delhi (UT)",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir (UT)",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh (UT)",
  "Lakshadweep (UT)",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry (UT)",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

(async () => {
  for (const region of statesAndUTs) {
    try {
      const res = await axios.post(apiURL, { 
        name: region, 
        is_active: 1 
      });
      console.log(`✅ Added: ${region} (ID: ${res.data.data.id})`);
    } catch (err) {
      if (err.response?.status === 409) {
        console.warn(`⚠️ Skipped (already exists): ${region}`);
      } else {
        console.error(`❌ Failed for ${region}:`, err.response?.data || err.message);
      }
    }
  }
})();

const nodemailer = require('nodemailer');

// Create transporter function to ensure environment variables are loaded
const createTransporter = () => {
  const SENDER_EMAIL = process.env.EMAIL_USER;
  const SENDER_PASS = process.env.EMAIL_PASSWORD;
  
  if (!SENDER_EMAIL || !SENDER_PASS) {
    throw new Error('EMAIL_USER or EMAIL_PASSWORD not set in environment variables');
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    port: 465,
    auth: {
      user: SENDER_EMAIL,
      pass: SENDER_PASS
    }
  });
};

// Get environment variables
const getEnvVars = () => ({
  SENDER_EMAIL: process.env.EMAIL_USER,
  SENDER_PASS: process.env.EMAIL_PASSWORD,
  OWNER_EMAIL: process.env.OWNER_EMAIL,
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER
});

// Helper to build structured enquiry message
function buildStructuredEnquiryMessage(enquiryData) {
  let msg = `Order Details\n`;
  msg += `Order ID: ${enquiryData.enquiry_id || enquiryData.order_id || ''}\n`;
  msg += `Customer Name: ${enquiryData.full_name}\n`;
  msg += `Customer Email: ${enquiryData.email}\n`;
  msg += `Customer Phone: ${enquiryData.phone}\n`;
  msg += `Service Type: ${enquiryData.service_type || ''}\n`;
  msg += `City: ${enquiryData.city || ''}\n`;
  msg += `State: ${enquiryData.state || ''}\n`;
  msg += `Delivery Date: ${enquiryData.delivery_date || ''}\n`;
  msg += `Address: ${enquiryData.address || ''}\n`;
  msg += `Enquiry Type: ${enquiryData.enquiry_type || ''}\n`;
  msg += `Created At: ${enquiryData.created_at ? new Date(enquiryData.created_at).toLocaleString() : ''}\n`;
  // Items by Category
  if (enquiryData.selectedItemsByCategory && typeof enquiryData.selectedItemsByCategory === 'object') {
    msg += `\nItems Selected (by Category):\n`;
    Object.entries(enquiryData.selectedItemsByCategory).forEach(([cat, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        msg += `  ${cat}:\n`;
        items.forEach(item => {
          msg += `    - ${item}\n`;
        });
      }
    });
  }
  return msg;
}

// Send email to user confirming enquiry received
const sendEnquiryConfirmationToUser = async (enquiryData) => {
  try {
    const { SENDER_EMAIL, WHATSAPP_NUMBER } = getEnvVars();
    const transporter = createTransporter();
    
    // Only send a thank you message, no details
    const mailOptions = {
      from: SENDER_EMAIL,
      to: enquiryData.email,
      subject: 'Thank You for Your Enquiry!',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #198754;">Thank You for Your Enquiry!</h2>
        <p>Dear ${enquiryData.full_name},</p>
        <p>We have received your enquiry and appreciate your interest in our services.</p>
        <p>Our team will review your request and get in touch with you soon.</p>
        <p>If you have any urgent questions, please contact us directly at <a href="mailto:${SENDER_EMAIL}">${SENDER_EMAIL}</a> or call <a href="tel:+${WHATSAPP_NUMBER}">+${WHATSAPP_NUMBER}</a>.</p>
        <p style="margin-top: 24px;">Best regards,<br><strong>Your Company Name</strong></p>
      </div>`
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Enquiry confirmation email sent to user:', enquiryData.email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending enquiry confirmation email to user:', error);
    return { success: false, error: error.message };
  }
};

// Send email to owner about new enquiry
const sendEnquiryNotificationToOwner = async (enquiryData) => {
  try {
    const { SENDER_EMAIL, OWNER_EMAIL } = getEnvVars();
    const transporter = createTransporter();
    const ownerEmail = OWNER_EMAIL;
    // Custom message for call-request enquiry
    if (enquiryData.service_type === 'call-request enquiry') {
      const mailOptions = {
        from: SENDER_EMAIL,
        to: ownerEmail,
        subject: 'Call Request Received',
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 24px; border-radius: 8px;">
          <h2 style="color: #0056b3;">Call Request Received!</h2>
          <p>You have received a call request enquiry.</p>
          <p><strong>Customer Phone:</strong> ${enquiryData.phone}</p>
          <p style="margin-top: 24px;">Please call the customer as soon as possible.</p>
          <p>Best regards,<br><strong>Your Website System</strong></p>
        </div>`
      };
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Call request notification email sent to owner:', ownerEmail);
      return { success: true, messageId: info.messageId };
    }

    // Build a visually structured HTML for the enquiry details
    const detailsTable = `
      <table style="border-collapse: collapse; width: 100%; font-size: 15px; border: 1px solid #ddd; margin-bottom: 24px;">
        <tr style="background-color: #f9f9f9;"><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Order ID</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.enquiry_id || enquiryData.order_id || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Customer Name</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.full_name}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Customer Email</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.email}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Customer Phone</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.phone}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Service Type</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.service_type || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">City</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.city || ''}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">State</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.state || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Delivery Date</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.delivery_date || ''}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Address</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.address || ''}</td></tr>
        <tr style="background-color: #f9f9f9;"><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Enquiry Type</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.enquiry_type || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Created At</td><td style="padding: 8px; border: 1px solid #ddd;">${enquiryData.created_at ? new Date(enquiryData.created_at).toLocaleString() : ''}</td></tr>
      </table>
    `;



    // Items by Category
    let itemsSection = '';
    let selectedItemsByCategory = enquiryData.selectedItemsByCategory;
    
    // Parse selectedItemsByCategory if it's a JSON string
    if (selectedItemsByCategory && typeof selectedItemsByCategory === 'string') {
      try {
        selectedItemsByCategory = JSON.parse(selectedItemsByCategory);
      } catch (parseError) {
        console.error('❌ Error parsing selectedItemsByCategory in email service:', parseError);
        selectedItemsByCategory = {};
      }
    }
    
    console.log('📧 Email service - selectedItemsByCategory:', selectedItemsByCategory);
    console.log('📧 Email service - selectedItemsByCategory type:', typeof selectedItemsByCategory);
    console.log('📧 Email service - selectedItemsByCategory keys:', Object.keys(selectedItemsByCategory || {}));
    
    if (selectedItemsByCategory && typeof selectedItemsByCategory === 'object' && Object.keys(selectedItemsByCategory).length > 0) {
      itemsSection += `<h4 style="margin-top: 24px; margin-bottom: 8px; color: #198754;">Items Selected (by Category):</h4>`;
      Object.entries(selectedItemsByCategory).forEach(([cat, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          itemsSection += `<div style="margin-bottom: 8px;"><strong style="color: #555;">${cat}:</strong><ul style="margin: 4px 0 0 20px; padding-left: 16px;">`;
          items.forEach(item => {
            itemsSection += `<li style="margin-bottom: 4px;">${item}</li>`;
          });
          itemsSection += `</ul></div>`;
        }
      });
    }

    const mailOptions = {
      from: SENDER_EMAIL,
      to: ownerEmail,
      subject: 'New Enquiry Received',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 24px; border-radius: 8px;">
        <h2 style="color: #0056b3;">New Enquiry Received!</h2>
        <h3 style="color: #198754; margin-bottom: 16px;">Service Type: ${enquiryData.service_type || 'N/A'}</h3>
        <p>A new enquiry has been submitted through your website. Please see the details below:</p>
        <h4 style="margin-top: 24px; margin-bottom: 8px; color: #333;">Customer Information</h4>
        ${detailsTable}
        ${itemsSection}
        <p style="margin-top: 24px;">Please respond to this enquiry as soon as possible.</p>
        <p>Best regards,<br><strong>Your Website System</strong></p>
      </div>`
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Enquiry notification email sent to owner:', ownerEmail);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending enquiry notification email to owner:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEnquiryConfirmationToUser,
  sendEnquiryNotificationToOwner,
  getEnvVars
}; 
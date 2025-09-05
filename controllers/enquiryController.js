const db = require('../db');
const { sendEnquiryConfirmationToUser, sendEnquiryNotificationToOwner, getEnvVars } = require('../emailService');

// Create a new enquiry
exports.createEnquiry = async (req, res) => {
  const {
    full_name,
    email,
    phone,
    message,
    city,
    state,
    delivery_date,
    address,
    selectedItemsByCategory: selectedItemsByCategoryRaw,
    enquiry_type
  } = req.body;

  // Parse selectedItemsByCategory from JSON string to object
  console.log('📦 Backend received selectedItemsByCategoryRaw:', selectedItemsByCategoryRaw);
  console.log('📦 Backend received selectedItemsByCategoryRaw type:', typeof selectedItemsByCategoryRaw);
  console.log('📦 Backend received selectedItemsByCategoryRaw length:', selectedItemsByCategoryRaw?.length);
  
  let selectedItemsByCategory = {};
  try {
    if (selectedItemsByCategoryRaw && typeof selectedItemsByCategoryRaw === 'string') {
      console.log('📦 Parsing JSON string...');
      selectedItemsByCategory = JSON.parse(selectedItemsByCategoryRaw);
      console.log('📦 Successfully parsed JSON string');
    } else if (selectedItemsByCategoryRaw && typeof selectedItemsByCategoryRaw === 'object') {
      console.log('📦 Using object directly...');
      selectedItemsByCategory = selectedItemsByCategoryRaw;
    } else {
      console.log('📦 No selectedItemsByCategoryRaw provided');
    }
    console.log('📦 Final parsed selectedItemsByCategory:', selectedItemsByCategory);
    console.log('📦 Final selectedItemsByCategory type:', typeof selectedItemsByCategory);
    console.log('📦 Final selectedItemsByCategory keys:', Object.keys(selectedItemsByCategory || {}));
  } catch (parseError) {
    console.error('❌ Error parsing selectedItemsByCategory:', parseError);
    selectedItemsByCategory = {};
  }

  // Validate required fields
  if (!full_name || !email || !phone) {
    console.error('[Enquiry Validation Error] Missing required fields:', { full_name, email, phone });
    return res.status(400).json({
      error: 'Missing required fields. full_name, email, and phone are required.'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('[Enquiry Validation Error] Invalid email format:', email);
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  try {
    // Insert enquiry into database
    const query = `
      INSERT INTO enquiry (full_name, email, phone, message, city, state, delivery_date, address, selectedItemsByCategory, enquiry_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(
      query,
      [full_name, email, phone, message, city, state, delivery_date || null, address || null, JSON.stringify(selectedItemsByCategory || {}), enquiry_type || null],
      async (err, result) => {
        if (err) {
          console.error('[Database Error] Error creating enquiry:', err);
          return res.status(500).json({ error: err.message });
        }

        const enquiryData = {
          enquiry_id: result.insertId,
          full_name,
          email,
          phone,
          message,
          city,
          state,
          delivery_date,
          address,
          selectedItemsByCategory: selectedItemsByCategory, // Use the parsed object
          enquiry_type,
          created_at: new Date()
        };

        // Send confirmation email to user
        let userEmailResult = { success: false };
        try {
          userEmailResult = await sendEnquiryConfirmationToUser(enquiryData);
        } catch (emailErr) {
          console.error('[Email Error] Error sending confirmation email to user:', emailErr);
        }
        
        // Send notification email to owner
        let ownerEmailResult = { success: false };
        try {
          ownerEmailResult = await sendEnquiryNotificationToOwner(enquiryData);
        } catch (emailErr) {
          console.error('[Email Error] Error sending notification email to owner:', emailErr);
        }

        // WhatsApp link generation (use only number from .env)
        const { WHATSAPP_NUMBER } = getEnvVars();
        const whatsappNumber = WHATSAPP_NUMBER;
        let whatsapp_link = null;
        let whatsappMessage = '';
        try {
          // Build structured WhatsApp message
          whatsappMessage = `New Enquiry/Order Details:\n`;
          whatsappMessage += `Name: ${full_name}\n`;
          whatsappMessage += `Email: ${email}\n`;
          whatsappMessage += `Phone: ${phone}\n`;
          if (message) whatsappMessage += `Message: ${message}\n`;
          if (city) whatsappMessage += `City: ${city}\n`;
          if (state) whatsappMessage += `State: ${state}\n`;
          if (delivery_date) whatsappMessage += `Delivery Date: ${delivery_date}\n`;
          if (address) whatsappMessage += `Address: ${address}\n`;
          if (enquiry_type) whatsappMessage += `Enquiry Type: ${enquiry_type}\n`;
          
          console.log('📱 WhatsApp generation - selectedItemsByCategory:', selectedItemsByCategory);
          console.log('📱 WhatsApp generation - selectedItemsByCategory type:', typeof selectedItemsByCategory);
          console.log('📱 WhatsApp generation - selectedItemsByCategory keys:', Object.keys(selectedItemsByCategory || {}));
          console.log('📱 WhatsApp generation - selectedItemsByCategory length:', Object.keys(selectedItemsByCategory || {}).length);
          
          if (selectedItemsByCategory && typeof selectedItemsByCategory === 'object' && Object.keys(selectedItemsByCategory).length > 0) {
            console.log('📱 Adding items to WhatsApp message');
            whatsappMessage += `\nItems Selected (by Category):\n`;
            Object.entries(selectedItemsByCategory).forEach(([cat, items]) => {
              if (Array.isArray(items) && items.length > 0) {
                console.log(`📱 Adding category: ${cat} with items:`, items);
                whatsappMessage += `  ${cat}:\n`;
                items.forEach(item => {
                  whatsappMessage += `    - ${item}\n`;
                });
              }
            });
          } else {
            console.log('📱 No items to add to WhatsApp message');
          }
          
          whatsappMessage += `\nEnquiry ID: ${result.insertId}`;
          if (!whatsappNumber) {
            console.error('[WhatsApp Link Generation] WHATSAPP_NUMBER is missing.');
            console.error('[WhatsApp Link Generation] WHATSAPP_NUMBER:', whatsappNumber);
          } else {
            console.log('[WhatsApp Link Generation] Using WHATSAPP_NUMBER:', whatsappNumber);
            whatsapp_link = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
          }
        } catch (waErr) {
          console.error('[WhatsApp Link Generation Error]', waErr, whatsappMessage);
        }

        res.status(201).json({
          success: true,
          message: 'Enquiry submitted successfully!',
          order_id: result.insertId,
          enquiry: enquiryData,
          email_status: {
            user_confirmation: userEmailResult.success,
            owner_notification: ownerEmailResult.success
          },
          whatsapp_link
        });
      }
    );
  } catch (error) {
    console.error('[EnquiryController Fatal Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all enquiries
exports.getAllEnquiries = (req, res) => {
  const query = `
    SELECT enquiry_id, full_name, email, phone, message, city, state, delivery_date, address, selectedItemsByCategory, enquiry_type, created_at 
    FROM enquiry 
    ORDER BY created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching enquiries:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({
      count: results.length,
      enquiries: results
    });
  });
};

// Get enquiry by ID
exports.getEnquiryById = (req, res) => {
  const enquiryId = req.params.id;
  
  const query = `
    SELECT enquiry_id, full_name, email, phone, message, city, state, delivery_date, address, selectedItemsByCategory, enquiry_type, created_at 
    FROM enquiry 
    WHERE enquiry_id = ?
  `;
  
  db.query(query, [enquiryId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching enquiry:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json(results[0]);
  });
};

// Update enquiry by ID
exports.updateEnquiry = (req, res) => {
  const enquiryId = req.params.id;
  const {
    full_name,
    email,
    phone,
    message,
    city,
    state,
    delivery_date,
    address,
    selectedItemsByCategory,
    enquiry_type
  } = req.body;

  // Validate required fields
  if (!full_name || !email || !phone) {
    return res.status(400).json({
      error: 'Missing required fields. full_name, email, and phone are required.'
    });
  }

  const query = `
    UPDATE enquiry 
    SET full_name = ?, email = ?, phone = ?, message = ?, city = ?, state = ?, delivery_date = ?, address = ?, selectedItemsByCategory = ?, enquiry_type = ?
    WHERE enquiry_id = ?
  `;
  
  db.query(
    query,
    [full_name, email, phone, message, city, state, delivery_date || null, address || null, JSON.stringify(selectedItemsByCategory || {}), enquiry_type || null, enquiryId],
    (err, result) => {
      if (err) {
        console.error('❌ Error updating enquiry:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Enquiry not found' });
      }
      
      res.json({
        message: 'Enquiry updated successfully',
        enquiry_id: enquiryId,
        affected_rows: result.affectedRows
      });
    }
  );
};

// Delete enquiry by ID
exports.deleteEnquiry = (req, res) => {
  const enquiryId = req.params.id;
  
  const query = 'DELETE FROM enquiry WHERE enquiry_id = ?';
  
  db.query(query, [enquiryId], (err, result) => {
    if (err) {
      console.error('❌ Error deleting enquiry:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    res.json({
      message: 'Enquiry deleted successfully',
      enquiry_id: enquiryId,
      affected_rows: result.affectedRows
    });
  });
};

// Get enquiries by email
exports.getEnquiriesByEmail = (req, res) => {
  const email = req.params.email;
  
  const query = `
    SELECT enquiry_id, full_name, email, phone, message, city, state, delivery_date, address, selectedItemsByCategory, enquiry_type, created_at 
    FROM enquiry 
    WHERE email = ? 
    ORDER BY created_at DESC
  `;
  
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('❌ Error fetching enquiries by email:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      count: results.length,
      email: email,
      enquiries: results
    });
  });
};

// Get enquiries count
exports.getEnquiriesCount = (req, res) => {
  const query = 'SELECT COUNT(*) as total_enquiries FROM enquiry';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching enquiries count:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      total_enquiries: results[0].total_enquiries
    });
  });
};

/*
Enquiry controller for managing enquiry submissions and notifications.
This controller handles:
- Creating new enquiries with email notifications
- CRUD operations for enquiry management
- Email validation and required field validation
- Automatic email notifications to users and owners
- Error handling and logging
*/ 
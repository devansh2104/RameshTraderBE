# Database Constraints Summary

This document outlines all the NULL/NOT NULL constraints for each database table and how they should be handled in the APIs.

## 📋 Table Constraints Overview

### 1. `banner` Table
```sql
+-------------+--------------+------+-----+---------------------+----------------+
| Field       | Type         | Null | Key | Default             | Extra          |
+-------------+--------------+------+-----+---------------------+----------------+
| id          | int(11)      | NO   | PRI | NULL                | auto_increment |
| title       | varchar(255) | NO   |     | NULL                |                |
| image_url   | varchar(255) | YES  |     | NULL                |                |
| description | text         | YES  |     | NULL                |                |
| is_active   | tinyint(1)   | YES  |     | 1                   |                |
| created_at  | timestamp    | YES  |     | current_timestamp() |                |
+-------------+--------------+------+-----+---------------------+----------------+
```

**Required Fields (NOT NULL):**
- `title` - Must be provided when creating/updating banners

**Optional Fields (NULL allowed):**
- `image_url` - Can be null
- `description` - Can be null
- `is_active` - Defaults to 1 if not provided
- `created_at` - Auto-generated

---

### 2. `blogs` Table
```sql
+----------------+--------------+------+-----+---------------------+-------------------------------+
| Field          | Type         | Null | Key | Default             | Extra                         |
+----------------+--------------+------+-----+---------------------+-------------------------------+
| id             | int(11)      | NO   | PRI | NULL                | auto_increment                |
| title          | varchar(255) | NO   |     | NULL                |                               |
| slug           | varchar(255) | NO   | UNI | NULL                |                               |
| content        | longtext     | NO   |     | NULL                |                               |
| cover_image    | varchar(500) | YES  |     | NULL                |                               |
| is_published   | tinyint(1)   | YES  |     | 0                   |                               |
| created_by     | int(11)      | YES  | MUL | NULL                |                               |
| likes_count    | int(11)      | YES  |     | 0                   |                               |
| comments_count | int(11)      | YES  |     | 0                   |                               |
| created_at     | timestamp    | YES  |     | current_timestamp() |                               |
| updated_at     | timestamp    | YES  |     | current_timestamp() | on update current_timestamp() |
+----------------+--------------+------+-----+---------------------+-------------------------------+
```

**Required Fields (NOT NULL):**
- `title` - Must be provided when creating/updating blogs
- `slug` - Must be provided (usually auto-generated from title)
- `content` - Must be provided when creating/updating blogs

**Optional Fields (NULL allowed):**
- `cover_image` - Can be null
- `is_published` - Defaults to 0 if not provided
- `created_by` - Can be null (references users.id)
- `likes_count` - Defaults to 0
- `comments_count` - Defaults to 0
- `created_at` - Auto-generated
- `updated_at` - Auto-generated

---

### 3. `categories` Table
```sql
+-------------+--------------+------+-----+---------------------+-------------------------------+
| Field       | Type         | Null | Key | Default             | Extra                         |
+-------------+--------------+------+-----+---------------------+-------------------------------+
| category_id | int(11)      | NO   | PRI | NULL                | auto_increment                |
| name        | varchar(255) | NO   |     | NULL                |                               |
| description | text         | YES  |     | NULL                |                               |
| image_url   | varchar(255) | YES  |     | NULL                |                               |
| is_active   | tinyint(1)   | YES  |     | 1                   |                               |
| created_at  | timestamp    | YES  |     | current_timestamp() |                               |
| updated_at  | timestamp    | YES  |     | current_timestamp() | on update current_timestamp() |
+-------------+--------------+------+-----+---------------------+-------------------------------+
```

**Required Fields (NOT NULL):**
- `name` - Must be provided when creating/updating categories

**Optional Fields (NULL allowed):**
- `description` - Can be null
- `image_url` - Can be null
- `is_active` - Defaults to 1 if not provided
- `created_at` - Auto-generated
- `updated_at` - Auto-generated

---

### 4. `comments` Table
```sql
+-------------+--------------+------+-----+---------------------+----------------+
| Field       | Type         | Null | Key | Default             | Extra          |
+-------------+--------------+------+-----+---------------------+----------------+
| id          | int(11)      | NO   | PRI | NULL                | auto_increment |
| blog_id     | int(11)      | NO   | MUL | NULL                |                |
| user_id     | int(11)      | YES  | MUL | NULL                |                |
| name        | varchar(100) | NO   |     | NULL                |                |
| content     | text         | NO   |     | NULL                |                |
| likes_count | int(11)      | YES  |     | 0                   |                |
| created_at  | timestamp    | YES  |     | current_timestamp() |                |
+-------------+--------------+------+-----+---------------------+----------------+
```

**Required Fields (NOT NULL):**
- `blog_id` - Must be provided when creating comments
- `name` - Must be provided when creating comments
- `content` - Must be provided when creating comments

**Optional Fields (NULL allowed):**
- `user_id` - Can be null (anonymous comments)
- `likes_count` - Defaults to 0
- `created_at` - Auto-generated

---

### 5. `enquiry` Table
```sql
+-------------------------+--------------+------+-----+---------------------+----------------+
| Field                   | Type         | Null | Key | Default             | Extra          |
+-------------------------+--------------+------+-----+---------------------+----------------+
| enquiry_id              | int(11)      | NO   | PRI | NULL                | auto_increment |
| full_name               | varchar(255) | NO   |     | NULL                |                |
| email                   | varchar(255) | NO   |     | NULL                |                |
| phone                   | varchar(20)  | YES  |     | NULL                |                |
| message                 | text         | YES  |     | NULL                |                |
| city                    | varchar(100) | YES  |     | NULL                |                |
| state                   | varchar(100) | YES  |     | NULL                |                |
| delivery_date           | date         | YES  |     | NULL                |                |
| address                 | text         | YES  |     | NULL                |                |
| selectedItemsByCategory | longtext     | YES  |     | NULL                |                |
| enquiry_type            | varchar(255) | YES  |     | NULL                |                |
| created_at              | timestamp    | YES  |     | current_timestamp() |                |
+-------------------------+--------------+------+-----+---------------------+----------------+
```

**Required Fields (NOT NULL):**
- `full_name` - Must be provided when creating enquiries
- `email` - Must be provided when creating enquiries
- `phone` - Must be provided (based on controller validation)

**Optional Fields (NULL allowed):**
- `message` - Can be null
- `city` - Can be null
- `state` - Can be null
- `delivery_date` - Can be null
- `address` - Can be null
- `selectedItemsByCategory` - Can be null
- `enquiry_type` - Can be null
- `created_at` - Auto-generated

---

### 6. `features` Table
```sql
+------------+-----------+------+-----+---------------------+-------------------------------+
| Field      | Type      | Null | Key | Default             | Extra                         |
+------------+-----------+------+-----+---------------------+-------------------------------+
| id         | int(11)   | NO   | PRI | NULL                | auto_increment                |
| features   | longtext  | NO   |     | NULL                |                               |
| created_at | timestamp | YES  |     | current_timestamp() |                               |
| updated_at | timestamp | YES  |     | current_timestamp() | on update current_timestamp() |
+------------+-----------+------+-----+---------------------+-------------------------------+
```

**Required Fields (NOT NULL):**
- `features` - Must be provided when creating/updating features

**Optional Fields (NULL allowed):**
- `created_at` - Auto-generated
- `updated_at` - Auto-generated

---

### 7. `gallery` Table
```sql
+-------------+--------------+------+-----+---------------------+-------------------------------+
| Field       | Type         | Null | Key | Default             | Extra                         |
+-------------+--------------+------+-----+---------------------+-------------------------------+
| id          | int(11)      | NO   | PRI | NULL                | auto_increment                |
| title       | varchar(255) | NO   |     | NULL                |                               |
| image_url   | text         | NO   |     | NULL                |                               |
| description | text         | YES  |     | NULL                |                               |
| created_at  | timestamp    | YES  |     | current_timestamp() |                               |
| updated_at  | timestamp    | YES  |     | current_timestamp() | on update current_timestamp() |
+-------------+--------------+------+-----+---------------------+-------------------------------+
```

**Required Fields (NOT NULL):**
- `title` - Must be provided when creating/updating gallery images
- `image_url` - Must be provided when creating/updating gallery images

**Optional Fields (NULL allowed):**
- `description` - Can be null
- `created_at` - Auto-generated
- `updated_at` - Auto-generated

---

### 8. `items` Table
```sql
+-----------------+---------------+------+-----+---------------------+-------------------------------+
| Field           | Type          | Null | Key | Default             | Extra                         |
+-----------------+---------------+------+-----+---------------------+-------------------------------+
| item_id         | int(11)       | NO   | PRI | NULL                | auto_increment                |
| name            | varchar(255)  | NO   |     | NULL                |                               |
| description     | text          | YES  |     | NULL                |                               |
| price           | decimal(10,2) | YES  |     | NULL                |                               |
| price_range     | varchar(100)  | YES  |     | NULL                |                               |
| price_per_piece | decimal(10,2) | YES  |     | NULL                |                               |
| features        | varchar(255)  | YES  |     | NULL                |                               |
| bricks_type     | varchar(100)  | YES  |     | NULL                |                               |
| material        | varchar(100)  | YES  |     | NULL                |                               |
| type            | varchar(100)  | YES  |     | NULL                |                               |
| color           | varchar(50)   | YES  |     | NULL                |                               |
| size            | varchar(50)   | YES  |     | NULL                |                               |
| shape           | varchar(50)   | YES  |     | NULL                |                               |
| porosity        | varchar(50)   | YES  |     | NULL                |                               |
| image_url       | varchar(255)  | YES  |     | NULL                |                               |
| stock_qty       | int(11)       | YES  |     | 0                   |                               |
| is_active       | tinyint(1)    | YES  |     | 1                   |                               |
| created_at      | timestamp     | YES  |     | current_timestamp() |                               |
| updated_at      | timestamp     | YES  |     | current_timestamp() | on update current_timestamp() |
+-----------------+---------------+------+-----+---------------------+-------------------------------+
```

**Required Fields (NOT NULL):**
- `name` - Must be provided when creating/updating items

**Optional Fields (NULL allowed):**
- `description` - Can be null
- `price` - Can be null
- `price_range` - Can be null
- `price_per_piece` - Can be null
- `features` - Can be null
- `bricks_type` - Can be null
- `material` - Can be null
- `type` - Can be null
- `color` - Can be null
- `size` - Can be null
- `shape` - Can be null
- `porosity` - Can be null
- `image_url` - Can be null
- `stock_qty` - Defaults to 0
- `is_active` - Defaults to 1
- `created_at` - Auto-generated
- `updated_at` - Auto-generated

---

### 9. `users` Table
```sql
+---------------+--------------+------+-----+---------------------+----------------+
| Field         | Type         | Null | Key | Default             | Extra          |
+---------------+--------------+------+-----+---------------------+----------------+
| id            | int(11)      | NO   | PRI | NULL                | auto_increment |
| name          | varchar(100) | NO   |     | NULL                |                |
| email         | varchar(255) | NO   | UNI | NULL                |                |
| password_hash | varchar(255) | NO   |     | NULL                |                |
| is_admin      | tinyint(1)   | YES  |     | 0                   |                |
| created_at    | timestamp    | YES  |     | current_timestamp() |                |
+---------------+--------------+------+-----+---------------------+----------------+
```

**Required Fields (NOT NULL):**
- `name` - Must be provided when creating users
- `email` - Must be provided when creating users (must be unique)
- `password_hash` - Must be provided when creating users (will be hashed)

**Optional Fields (NULL allowed):**
- `is_admin` - Defaults to 0 if not provided
- `created_at` - Auto-generated

---

## 🎯 API Testing Guidelines

### Required Field Validation
All APIs should validate that required fields (NOT NULL) are provided:

1. **Return 400 Bad Request** if required fields are missing
2. **Include clear error messages** indicating which fields are required
3. **Test with missing required fields** to ensure proper validation

### Optional Field Handling
Optional fields (NULL allowed) should:

1. **Accept null/undefined values** without error
2. **Use default values** where specified in schema
3. **Allow partial updates** with only required fields

### Test Cases for Each API

#### 1. Banner API
- ✅ Test with all required fields (`title`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`description`, `image_url`, `is_active`)

#### 2. Blog API
- ✅ Test with all required fields (`title`, `content`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`cover_image`, `is_published`)

#### 3. Category API
- ✅ Test with all required fields (`name`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`description`, `image_url`, `is_active`)

#### 4. Comment API
- ✅ Test with all required fields (`blog_id`, `name`, `content`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`user_id`)

#### 5. Enquiry API
- ✅ Test with all required fields (`full_name`, `email`, `phone`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`message`, `city`, `state`, etc.)

#### 6. Features API
- ✅ Test with all required fields (`features`)
- ✅ Test with missing required fields (should fail)

#### 7. Gallery API
- ✅ Test with all required fields (`title`, `image_url`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`description`)

#### 8. Items API
- ✅ Test with all required fields (`name`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`description`, `price`, etc.)

#### 9. Users API
- ✅ Test with all required fields (`name`, `email`, `password`)
- ✅ Test with missing required fields (should fail)
- ✅ Test with optional fields (`is_admin`)

## 🚨 Common Issues

### 1. Missing Required Fields
- **Problem**: API accepts requests without required fields
- **Solution**: Add validation middleware to check required fields

### 2. Incorrect Field Names
- **Problem**: Test data uses wrong field names
- **Solution**: Update test data to match database schema exactly

### 3. Data Type Mismatches
- **Problem**: Sending wrong data types (string vs number)
- **Solution**: Ensure data types match schema definitions

### 4. Unique Constraint Violations
- **Problem**: Trying to create duplicate unique values
- **Solution**: Use unique identifiers in test data (timestamps, UUIDs)

## 📊 Testing Checklist

- [ ] All required fields are validated
- [ ] Optional fields are handled correctly
- [ ] Error messages are clear and helpful
- [ ] Default values are applied correctly
- [ ] Unique constraints are respected
- [ ] Data types match schema
- [ ] Foreign key relationships work
- [ ] Auto-generated fields are handled

This comprehensive guide ensures that all APIs properly handle the database constraints and provide robust validation. 
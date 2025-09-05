# Slug Functionality Implementation

This document outlines the implementation of slug functionality for categories, items, and blogs in the Ramesh Traders backend.

## Overview

Slugs are URL-friendly versions of titles/names that make URLs more readable and SEO-friendly. The admin manually provides slugs when creating or updating items, categories, and blogs. For example:
- Title: "Clay Bricks for Construction"
- Admin-provided Slug: "clay-bricks-for-construction"

## Database Changes

### 1. Categories Table
Added `slug` column with NOT NULL and UNIQUE constraints:
```sql
ALTER TABLE categories 
ADD COLUMN slug VARCHAR(255) NOT NULL UNIQUE AFTER name;
CREATE INDEX idx_categories_slug ON categories(slug);
```

### 2. Items Table
Added `slug` column with NOT NULL and UNIQUE constraints:
```sql
ALTER TABLE items 
ADD COLUMN slug VARCHAR(255) NOT NULL UNIQUE AFTER name;
CREATE INDEX idx_items_slug ON items(slug);
```

### 3. Blogs Table
Already had `slug` column - no changes needed.

## New API Endpoints

### Categories
- `GET /api/categories/slug/:slug` - Get category by slug
- `POST /api/categories` - Create category (admin provides slug)
- `PUT /api/categories/:id` - Update category (admin provides new slug)

### Items
- `GET /api/items/slug/:slug` - Get item by slug
- `POST /api/items` - Create item (admin provides slug)
- `PUT /api/items/:id` - Update item (admin provides new slug)

### Blogs
- `GET /api/blogs/slug/:slug` - Get blog by slug
- `POST /api/blogs` - Create blog (admin provides slug)
- `PUT /api/blogs/:id` - Update blog (admin provides new slug)

## Slug Management

### Utility Functions
Located in `slugUtils.js`:

1. **generateSlug(text)** - Converts text to URL-friendly slug (for reference)
   - Converts to lowercase
   - Replaces spaces with hyphens
   - Removes special characters
   - Trims hyphens from start/end

2. **checkSlugUnique(db, table, slug, id)** - Checks slug uniqueness
   - Checks if admin-provided slug exists in database
   - Returns true if unique, false if duplicate
   - Excludes current record when updating

### Admin Responsibility
- Admin manually provides slugs when creating/updating records
- System checks slug uniqueness and returns error if duplicate
- Admin can use the `generateSlug()` function as a reference for creating slugs

### Examples
- Admin provides: "clay-bricks" → Success (if unique)
- Admin provides: "clay-bricks" (if exists) → Error: "Slug already exists"
- Admin provides: "premium-quality-bricks" → Success (if unique)

## API Response Changes

### Categories Response
```json
{
  "category_id": 1,
  "name": "Clay Bricks",
  "slug": "clay-bricks",
  "description": "High quality clay bricks",
  "image_url": "https://...",
  "is_active": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Items Response
```json
{
  "item_id": 1,
  "name": "Premium Clay Brick",
  "slug": "premium-clay-brick",
  "description": "High quality clay brick",
  "price_range": "₹5-10",
  "price_per_piece": 7.50,
  "image_url": "https://...",
  "stock_qty": 1000,
  "is_active": 1,
  "features": ["feature1", "feature2"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Blogs Response
```json
{
  "id": 1,
  "title": "Best Bricks for Construction",
  "slug": "best-bricks-for-construction",
  "content": "Article content...",
  "cover_image": "https://...",
  "is_published": true,
  "likes_count": 10,
  "comments_count": 5,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "author_info": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Migration Steps

1. **Run SQL scripts** to add slug columns:
   ```bash
   mysql -u username -p database_name < add_slug_to_categories.sql
   mysql -u username -p database_name < add_slug_to_items.sql
   ```

2. **Update existing records** (if any):
   - The SQL scripts include UPDATE statements to generate slugs for existing records
   - New records will auto-generate slugs

3. **Test the new endpoints**:
   - Create new categories/items/blogs
   - Access them via slug URLs
   - Update records and verify slug changes

## Error Handling

- **Duplicate slugs**: Returns error - "Slug already exists. Please choose a different slug."
- **Missing slugs**: Returns error - slug is required
- **Invalid slugs**: Admin should provide valid URL-friendly slugs
- **Database errors**: Proper error responses with details

## Frontend Integration

### URL Structure
- Categories: `/categories/clay-bricks`
- Items: `/items/premium-clay-brick`
- Blogs: `/blogs/best-bricks-for-construction`

### API Calls
```javascript
// Get category by slug
fetch('/api/categories/slug/clay-bricks')

// Get item by slug
fetch('/api/items/slug/premium-clay-brick')

// Get blog by slug
fetch('/api/blogs/slug/best-bricks-for-construction')
```

### API Request Examples

#### Create Category
```javascript
// POST /api/categories
{
  "name": "Clay Bricks",
  "slug": "clay-bricks",
  "description": "High quality clay bricks",
  "is_active": 1
}
```

#### Create Item
```javascript
// POST /api/items
{
  "name": "Premium Clay Brick",
  "slug": "premium-clay-brick",
  "description": "High quality clay brick",
  "price_range": "₹5-10",
  "price_per_piece": 7.50,
  "stock_qty": 1000,
  "is_active": 1
}
```

#### Create Blog
```javascript
// POST /api/blogs
{
  "title": "Best Bricks for Construction",
  "slug": "best-bricks-for-construction",
  "content": "Article content...",
  "is_published": true
}
```

## Benefits

1. **SEO Friendly**: URLs are more readable and search-engine optimized
2. **User Friendly**: Easier to remember and share URLs
3. **Consistent**: All entities now have slug-based access
4. **Automatic**: Slugs are auto-generated, reducing manual work
5. **Unique**: Ensures no duplicate slugs across the system

## Notes

- Slugs are manually provided by admin when creating/updating records
- Slugs are unique within their respective tables
- System returns error if duplicate slug is provided
- All slug fields are NOT NULL to ensure consistency
- Indexes are created for better query performance
- Admin can use `generateSlug()` function as reference for creating valid slugs

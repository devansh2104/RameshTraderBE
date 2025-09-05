# API Reference (Single Document)

## Base URL
- Local: `http://localhost:4001/api`

## Auth
- JWT bearer token is only required for admin-protected endpoints (blogs and users management). All comment CRUD and likes work without JWT.
- Anonymous users are identified via IP + User-Agent hash.

---

## Banners (`/banners`)
- GET `/` — List banners
- GET `/count/total` — Total banners
- GET `/count/active` — Active banners
- GET `/:id` — Banner by id
- POST `/` — Create banner (multipart: `image`)
- PUT `/:id` — Update banner (multipart: `image`)
- DELETE `/:id` — Delete banner

Access: Public for GET; POST/PUT/DELETE typically admin via deployment config (no JWT enforced in routes).

---

## Categories (`/categories`)
- GET `/` — List categories
- GET `/count/total` — Total categories
- GET `/count/active` — Active categories
- GET `/with-services` — Categories with services
- GET `/with-items` — Categories with items
- GET `/:id/services` — Services of a category
- GET `/:id/items` — Items of a category
- POST `/add-service` — Link service to category
- POST `/add-item` — Link item to category
- DELETE `/:category_id/services/:service_id` — Unlink service
- DELETE `/:category_id/items/:item_id` — Unlink item
- GET `/:id` — Category by id
- POST `/` — Create (multipart: `image`)
- PUT `/:id` — Update (multipart: `image`)
- DELETE `/:id` — Delete

Access: Public for GET; Mutations are open in routes (lock via deployment if needed).

---

## Items (`/items`)
- GET `/` — List items
- GET `/count/total` — Total items
- GET `/count/active` — Active items
- GET `/count/low-stock` — Low stock count
- GET `/with-categories` — Items with categories
- GET `/:id/categories` — Categories for item
- POST `/add-to-category` — Link item to category
- DELETE `/:item_id/categories/:category_id` — Unlink item from category
- GET `/:id` — Item by id
- POST `/` — Create (multipart: `image`)
- PUT `/:id` — Update (multipart: `image`)
- DELETE `/:id` — Delete

Access: Public for GET; Mutations are open in routes (lock via deployment if needed).

---

## Enquiries (`/enquiries`)
- POST `/` — Create enquiry
- GET `/` — List enquiries
- GET `/:id` — Enquiry by id
- PUT `/:id` — Update enquiry
- DELETE `/:id` — Delete enquiry
- GET `/email/:email` — Enquiries by email
- GET `/count/total` — Total enquiries

Access: Public.

---

## Blogs (`/blogs`)
- GET `/` — List blogs (pagination, filters, sorting)
- GET `/published` — List published blogs only
- GET `/count/total` — Total blogs
- GET `/:id/stats` — Blog statistics
- GET `/:id` — Blog by id (includes comments/likes summary)
- POST `/` — Create blog (Admin JWT, multipart: `cover_image`)
- PUT `/:id` — Update blog (Admin JWT, multipart: `cover_image`)
- DELETE `/:id` — Delete blog (Admin JWT)
- DELETE `/test/cleanup` — Cleanup test blogs (Admin JWT)

Access: GET public; write operations require `Authorization: Bearer <JWT>` with admin.

---

## Gallery (`/gallery`)
- GET `/` — List images
- GET `/count/total` — Total images
- GET `/:id` — Image by id
- POST `/` — Create (multipart: `image`)
- PUT `/:id` — Update (multipart: `image`)
- DELETE `/:id` — Delete

Access: Public for GET; mutations open in routes (lock via deployment if needed).

---

## Users (`/users`)
- POST `/register` — Register user/admin
- POST `/login` — Login, returns JWT
- GET `/me` — Current user (JWT)
- GET `/` — List users (Admin JWT)
- GET `/:id` — Get user (Admin JWT)
- DELETE `/test/cleanup` — Delete test users
- DELETE `/:id` — Delete user (Admin JWT)

Access:
- Public: register, login, test cleanup
- JWT required: `/me`
- Admin JWT: list/get/delete user

---

## Comments (`/comments`)
- GET `/` — List comments (pagination, filters)
- GET `/blog/:blogId` — Comments for blog
- POST `/blog/:blogId` — Create comment (Anonymous supported)
- GET `/:commentId` — Comment by id
- PUT `/:commentId` — Update own comment (Anonymous supported)
- DELETE `/:commentId` — Delete own comment (Anonymous supported)
- GET `/:commentId/likes` — List likes for a comment (paginated)
- GET `/:commentId/stats` — Comment statistics
- POST `/:commentId/like` — Toggle like for a comment (Anonymous supported)
- GET `/:commentId/like/status` — Per-comment like status (Anonymous supported)

Access notes:
- No JWT needed. Ownership checked via user_id or anonymous_id (IP+UA).
- Body for create: `{ content: string, name?: string }` (name required for anonymous)

---

## Likes (`/likes`)
- POST `/` — Toggle like for blog or comment
  - Body: `{ blog_id: number, comment_id?: number }`
- GET `/status` — Like status for a specific item
  - Query: `?blog_id=<id>[&comment_id=<id>]`
  - Response: `{ liked: boolean }`
- GET `/mine` — All likes for current visitor/user
  - Response: `{ likedBlogs: number[], likedComments: [{ blog_id, comment_id }] }`

Access: Public; identifies current actor by JWT user or anonymous (IP+UA).

---

## Minimal Usage Examples

- Create comment (anonymous)
```bash
curl -X POST "$BASE/api/comments/blog/11" -H "Content-Type: application/json" \
  -d '{"content":"Great post!","name":"Guest"}'
```

- Toggle blog like (anonymous)
```bash
curl -X POST "$BASE/api/likes" -H "Content-Type: application/json" -d '{"blog_id":11}'
```

- Toggle comment like (anonymous)
```bash
curl -X POST "$BASE/api/likes" -H "Content-Type: application/json" -d '{"blog_id":11,"comment_id":55}'
```

- Check like status
```bash
curl "$BASE/api/likes/status?blog_id=11&comment_id=55"
```

- Fetch my likes for badges
```bash
curl "$BASE/api/likes/mine"
```

- Create blog (Admin)
```bash
curl -X POST "$BASE/api/blogs" -H "Authorization: Bearer <ADMIN_JWT>" -F cover_image=@cover.jpg -F title="My blog"
```


$BASE is `http://localhost:4001` in local.

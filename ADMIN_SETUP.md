# Deals247 - Admin System Setup

## Admin User Setup

To set up the first admin user, you need to manually update a user's role in the database after they register.

### Method 1: Direct Database Update
Connect to your MySQL database and run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

### Method 2: Using Admin Panel (if you already have an admin)
1. Log in as an existing admin user
2. Go to Admin Panel → Users tab
3. Find the user you want to make admin
4. Change their role from "User" to "Admin" using the dropdown

## Admin Features

### User Management
- View all registered users
- Change user roles (User ↔ Admin)
- Delete users (except other admins)
- See user registration dates

### Deal Management
- View all deals (including unverified ones)
- Edit existing deals
- Delete deals
- Mark deals as verified/unverified

### Permissions
- **Admin Users**: Full access to admin panel, can submit deals, manage users and deals
- **Regular Users**: Can submit deals, view favorites, manage their profile

## Security Notes
- Admin routes are protected with Firebase UID verification
- Only admins can access user management and deal deletion
- Admin users cannot be deleted by other admins
- All admin actions are logged via API calls

## First Admin Setup Steps
1. Register a normal user account
2. Use Method 1 above to promote to admin via database
3. Log in and access the Admin Panel via the user menu
4. Use the admin panel to manage other users and deals
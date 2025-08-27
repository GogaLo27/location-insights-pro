# 🚀 Supabase Deployment Guide

## 📋 **Prerequisites**
- Supabase project set up
- Supabase CLI installed
- Access to your Supabase dashboard

## 🗄️ **1. Database Setup**

### **Run the Migration**
```bash
# Navigate to your project root
cd your-project-directory

# Apply the migration
supabase db push

# Or if you prefer to run the SQL manually:
# 1. Go to your Supabase Dashboard
# 2. Navigate to SQL Editor
# 3. Copy and paste the contents of: supabase/migrations/20250120000000_create_user_profiles_table.sql
# 4. Click "Run"
```

### **Verify Table Creation**
1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. You should see the `user_profiles` table with all the columns

## 🔧 **2. Deploy Edge Functions**

### **Deploy All Functions**
```bash
# Deploy all functions at once
supabase functions deploy

# Or deploy individually:
supabase functions deploy update-user-profile
supabase functions deploy update-security-settings
supabase functions deploy delete-user-account
```

### **Verify Function Deployment**
1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. You should see all three functions listed:
   - `update-user-profile`
   - `update-security-settings`
   - `delete-user-account`

## 🔐 **3. Environment Variables**

### **Check Your Environment**
Make sure your frontend has the correct Supabase URL and anon key:

```typescript
// In your supabase client configuration
const supabaseUrl = 'https://your-project-ref.supabase.co'
const supabaseAnonKey = 'your-anon-key'
```

## 🧪 **4. Testing**

### **Test Profile Update**
1. Go to your app's Settings page
2. Update profile information
3. Click "Save Changes"
4. Check the browser console for any errors
5. Verify data is saved in the `user_profiles` table

### **Test Security Settings**
1. Go to Security tab in Settings
2. Toggle Two-Factor Authentication
3. Change Session Timeout
4. Click "Save Security Settings"
5. Verify settings are saved

### **Test Account Deletion**
1. Go to Security tab in Settings
2. Click "Delete Account"
3. Confirm the action
4. Verify user data is deleted from tables

## 🔍 **5. Troubleshooting**

### **Common Issues**

#### **Function Not Found Error**
```bash
# Redeploy the specific function
supabase functions deploy function-name
```

#### **Permission Denied Error**
- Check Row Level Security (RLS) policies
- Verify user authentication
- Check function logs in Supabase Dashboard

#### **Database Connection Error**
- Verify Supabase URL and keys
- Check if the table exists
- Verify RLS policies are enabled

### **Check Function Logs**
1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click on a function
4. Go to **Logs** tab
5. Check for any error messages

## 📊 **6. Database Schema**

### **user_profiles Table Structure**
```sql
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    language TEXT DEFAULT 'en',
    two_factor_auth BOOLEAN DEFAULT FALSE,
    session_timeout INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **RLS Policies**
- Users can only view their own profile
- Users can only update their own profile
- Users can only delete their own profile
- Automatic profile creation for new users

## 🎯 **7. Next Steps**

After deployment:
1. Test all functionality thoroughly
2. Monitor function logs for any errors
3. Set up proper error monitoring
4. Consider adding more user-related tables as needed

## 📞 **Support**

If you encounter issues:
1. Check the Supabase documentation
2. Review function logs in the dashboard
3. Verify all environment variables are set correctly
4. Test with a fresh user account

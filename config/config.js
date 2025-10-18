// Server Configuration - جميع الإعدادات هنا
export const config = {
  // Server Settings
  PORT: 5000,
  NODE_ENV: 'development',
  JWT_SECRET: 'rihana-super-secret-jwt-key-2024-change-this-in-production',

  // Supabase Configuration
  SUPABASE_URL: 'https://thrzjehqcuqrwmpwplgk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocnpqZWhxY3VxcndtcHdwbGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDAwMDcsImV4cCI6MjA3NjMxNjAwN30.-QZ9y40m3E47SsYVEvj4Vo4trxQyY1Ew7hTwuQJAdXE',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocnpqZWhxY3VxcndtcHdwbGdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0MDAwNywiZXhwIjoyMDc2MzE2MDA3fQ.mX_iBhoYD92UDHOgTOscRVPNRJCeGTeWIb8Br2U7Rew',

  // Firebase Configuration
  FIREBASE_PROJECT_ID: 'rihana-9e001',

  // Admin Credentials (Default Admin)
  ADMIN_EMAIL: 'admin@rihana.com',
  ADMIN_PASSWORD: 'Admin@123456',

  // Frontend URL (for CORS)
  FRONTEND_URL: 'http://localhost:5173'
};


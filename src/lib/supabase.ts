// filepath: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sosfpmxswzorkcjukqci.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvc2ZwbXhzd3pvcmtjanVrcWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTQyMzIsImV4cCI6MjA3MjY3MDIzMn0.09-wnfIH0m2WJZjSNuxdR59cMQL2OXlvDRpivPUJVtI';
export const supabase = createClient(supabaseUrl, supabaseKey);
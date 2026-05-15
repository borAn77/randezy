import { createClient } from '@supabase/supabase-js';

// Senin Supabase bilgilerini buraya kilitledim
const supabaseUrl = 'https://gaxjfcwdwefdmwpzskfl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdheGpmY3dkd2VmZG13cHpza2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTAwODMsImV4cCI6MjA5MzU4NjA4M30.ADmbji7P3hgIYV4knVsd-VZx_FcIOGT6la26N3fvx5o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
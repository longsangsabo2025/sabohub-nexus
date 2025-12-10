import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FullPageLoading } from '@/components/ui/loading';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (data.session) {
          // Successfully authenticated
          navigate('/dashboard');
        } else {
          // No session found
          navigate('/login');
        }
      } catch (error) {
        console.error('Callback error:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <FullPageLoading loadingText="Đang xác thực..." />;
}


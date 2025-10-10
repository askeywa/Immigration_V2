// frontend/src/hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/user.service';
import { useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, register } = useAuthStore();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: userService.getCurrentUser,
    enabled: !!token && isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    user: currentUser?.data?.user || user,
    isAuthenticated,
    isLoading: false, // Always false for login form
    login,
    logout,
    register,
  };
};
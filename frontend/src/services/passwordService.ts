// frontend/src/services/passwordService.ts
import { PasswordChangeRequest, PasswordChangeResponse } from '@/types/auth.types';

class PasswordService {
  private baseUrl = '/api/auth';

  /**
   * Change user password
   */
  async changePassword(data: PasswordChangeRequest): Promise<PasswordChangeResponse> {
    const response = await fetch(`${this.baseUrl}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to change password');
    }

    return response.json();
  }

  /**
   * Force password change for a user (admin only)
   */
  async forcePasswordChange(userId: string, reason: string): Promise<PasswordChangeResponse> {
    const response = await fetch(`${this.baseUrl}/force-password-change/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to force password change');
    }

    return response.json();
  }

  /**
   * Check if user requires password change
   */
  async checkPasswordChangeRequired(): Promise<{
    requiresPasswordChange: boolean;
    mustChangePassword: boolean;
    isFirstLogin: boolean;
    passwordChangeRequired: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/password-change-required`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check password change requirement');
    }

    const result = await response.json();
    return result.data;
  }
}

export const passwordService = new PasswordService();
export default passwordService;

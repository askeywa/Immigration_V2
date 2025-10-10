// backend/src/services/profileService.ts
import { Profile, IProfile } from '../models/Profile';
import { AppError } from '../utils/errors';

export class ProfileService {
  /**
   * Create a new profile (alias of saveProfile)
   */
  async createProfile(userId: string, tenantId: string, profileData: Partial<IProfile>): Promise<IProfile> {
    return this.saveProfile(userId, tenantId, profileData);
  }

  /**
   * Save profile assessment data (create or update)
   */
  async saveProfile(userId: string, tenantId: string, profileData: Partial<IProfile>): Promise<IProfile> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Validate inputs
        if (!userId || !tenantId) {
          throw new AppError('User ID and Tenant ID are required', 400);
        }
        
        // Check if profile already exists
        let profile = await Profile.findOne({ userId, tenantId }).maxTimeMS(10000);
        
        if (profile) {
          // Update existing profile
          const updatedProfile = await Profile.findOneAndUpdate(
            { userId, tenantId },
            { ...profileData, lastUpdated: new Date() },
            { new: true, runValidators: true, maxTimeMS: 10000 }
          );
          
          if (!updatedProfile) {
            throw new AppError('Failed to update profile', 500);
          }
          
          profile = updatedProfile;
        } else {
          // Create new profile
          profile = new Profile({
            ...profileData,
            userId,
            tenantId,
            lastUpdated: new Date()
          });
          await profile.save();
        }
        
        return profile;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a retryable error
        if (attempt < maxRetries && this.isRetryableError(error)) {
          console.log(`Profile save attempt ${attempt} failed, retrying...`, error instanceof Error ? error instanceof Error ? (error as any).message : String(error) : String(error));
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        
        // Non-retryable error or max retries reached
        if (error instanceof AppError) {
          throw error;
        }
        
        throw new AppError(
          `Failed to save profile after ${maxRetries} attempts: ${error instanceof Error ? error instanceof Error ? (error as any).message : String(error) : String(error)}`, 
          500, 
          'PROFILE_SAVE_FAILED'
        );
      }
    }
    
    throw new AppError('Failed to save profile', 500, 'PROFILE_SAVE_FAILED', true, lastError?.message);
  }
  
  private isRetryableError(error: any): boolean {
    if ((error as any).name === 'MongoNetworkError' || 
        (error as any).name === 'MongoTimeoutError' ||
        error instanceof Error ? (error as any).message : String(error)?.includes('connection') ||
        error instanceof Error ? (error as any).message : String(error)?.includes('timeout')) {
      return true;
    }
    return false;
  }

  /**
   * Get profile by user ID and tenant ID
   */
  async getProfile(userId: string, tenantId: string): Promise<IProfile | null> {
    try {
      // Handle empty or invalid tenantId - don't include it in query if empty
      const query: any = { userId };
      
      // Only add tenantId to query if it's a valid non-empty string
      if (tenantId && tenantId.trim() !== '') {
        query.tenantId = tenantId;
      }
      
      console.log('ProfileService: Querying profile with:', query);
      const profile = await Profile.findOne(query);
      return profile;
    } catch (error) {
      console.error('ProfileService: Database error retrieving profile:', error);
      // Return null instead of throwing error to allow "no data found" response
      return null;
    }
  }

  /**
   * Get profile by user ID (alias for controller compatibility)
   */
  async getProfileByUserId(userId: string, tenantId: string): Promise<IProfile | null> {
    return this.getProfile(userId, tenantId);
  }

  /**
   * Update profile by ID, user ID and tenant ID
   */
  async updateProfile(profileId: string, userId: string, tenantId: string, profileData: Partial<IProfile>): Promise<IProfile>;
  /**
   * Update profile by user ID and tenant ID
   */
  async updateProfile(userId: string, tenantId: string, profileData: Partial<IProfile>): Promise<IProfile>;
  async updateProfile(a: string, b: string, c: string | Partial<IProfile>, d?: Partial<IProfile>): Promise<IProfile> {
    try {
      // Overload implementation: detect which signature is used
      if (typeof c === 'string' && d) {
        const profileId = a;
        const userId = b;
        const tenantId = c;
        const profileData = d;
        const profile = await Profile.findOneAndUpdate(
          { _id: profileId, userId, tenantId },
          { ...profileData, lastUpdated: new Date() },
          { new: true, runValidators: true }
        );
        if (!profile) {
          throw new AppError('Profile not found', 404);
        }
        return profile;
      }

      // Update by userId and tenantId
      const userId = a;
      const tenantId = b;
      const profileData = c as Partial<IProfile>;
      const profile = await Profile.findOneAndUpdate(
        { userId, tenantId },
        { ...profileData, lastUpdated: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }
      
      return profile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update profile', 500);
    }
  }

  /**
   * Delete profile by user ID and tenant ID
   */
  async deleteProfile(userId: string, tenantId: string): Promise<boolean> {
    try {
      const result = await Profile.findOneAndDelete({ userId, tenantId });
      return !!result;
    } catch (error) {
      throw new AppError('Failed to delete profile', 500);
    }
  }

  /**
   * Get all profiles with pagination (tenant-aware)
   */
  async getAllProfiles(page: number, limit: number, tenantId?: string): Promise<{ profiles: IProfile[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const query = tenantId ? { tenantId } : {};
      
      const [profiles, total] = await Promise.all([
        Profile.find(query).skip(skip).limit(limit),
        Profile.countDocuments(query)
      ]);
      return { profiles, total };
    } catch (error) {
      throw new AppError('Failed to retrieve profiles', 500);
    }
  }

  /**
   * Calculate profile completion percentage
   */
  async calculateProgress(userId: string, tenantId: string): Promise<number> {
    try {
      const profile = await Profile.findOne({ userId, tenantId });
      if (!profile) return 0;
      
      let completedFields = 0;
      let totalFields = 0;

      // Personal Details (all required fields)
      const p = profile.personalDetails;
      const personalRequired = [
        p.firstName, p.lastName, p.dateOfBirth, p.nationality,
        p.passportNumber, p.phoneNumber, p.email, p.currentAddress,
        p.city, p.country, p.postalCode,
      ];
      totalFields += personalRequired.length;
      completedFields += personalRequired.filter((v: any) => !!v && (v as any).toString().trim() !== '').length;

      // Educational Details (treat GPA and additionalCertifications as optional)
      const e = profile.educationalDetails as {
        highestEducation?: string;
        institution?: string;
        fieldOfStudy?: string;
        graduationYear?: string;
      };
      const eduRequired = [e.highestEducation, e.institution, e.fieldOfStudy, e.graduationYear];
      totalFields += eduRequired.length;
      completedFields += eduRequired.filter((v: any) => !!v && (v as any).toString().trim() !== '').length;

      // Employment Details (endDate and previousEmployers optional)
      const emp = profile.employmentDetails as {
        currentEmployer?: string;
        jobTitle?: string;
        startDate?: string;
        jobDescription?: string;
      };
      const empRequired = [emp.currentEmployer, emp.jobTitle, emp.startDate, emp.jobDescription];
      totalFields += empRequired.length;
      completedFields += empRequired.filter((v: any) => !!v && (v as any).toString().trim() !== '').length;

      // Treat travel and personal history sections as optional; mark complete regardless
      totalFields += 1; completedFields += 1; // travel
      totalFields += 1; completedFields += 1; // personal history

      const percent = Math.round((completedFields / totalFields) * 100);
      return Math.min(100, percent);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get profile by ID with tenant context
   */
  static async getProfile(profileId: string, tenantId: string, isSuperAdmin?: boolean): Promise<IProfile | null> {
    try {
      // Build query based on tenant context and super admin status
      let query: any = { _id: profileId };
      if (!isSuperAdmin) {
        (query as any).tenantId = tenantId;
      }
      
      const profile = await Profile.findOne(query);
      return profile;
    } catch (error) {
      throw new AppError('Failed to retrieve profile', 500);
    }
  }

  /**
   * Update profile by user ID and tenant ID (static method for controller compatibility)
   */
  static async updateProfile(userId: string, tenantId: string, profileData: Partial<IProfile>): Promise<IProfile> {
    try {
      const profile = await Profile.findOneAndUpdate(
        { userId, tenantId },
        { ...profileData, lastUpdated: new Date() },
        { new: true, runValidators: true }
      );
      
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }
      
      return profile;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update profile', 500);
    }
  }

  /**
   * Get all profiles with pagination (static method for controller compatibility)
   */
  static async getAllProfiles(page: number, limit: number, tenantId: string, isSuperAdmin?: boolean): Promise<{ 
    profiles: IProfile[]; 
    pagination: {
      currentPage: number;
      totalPages: number;
      totalProfiles: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    }
  }> {
    try {
      const skip = (page - 1) * limit;
      
      // Build query based on tenant context and super admin status
      let query: any = {};
      if (!isSuperAdmin && tenantId) {
        (query as any).tenantId = tenantId;
      }
      
      const [profiles, total] = await Promise.all([
        Profile.find(query)
          .populate('userId', 'firstName lastName email')
          .skip(skip)
          .limit(limit)
          .sort({ lastUpdated: -1 }),
        Profile.countDocuments(query)
      ]);

      return {
        profiles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalProfiles: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        }
      };
    } catch (error) {
      throw new AppError('Failed to retrieve profiles', 500);
    }
  }

  /**
   * Calculate profile progress (static method for controller compatibility)
   */
  static async calculateProgress(userId: string, tenantId: string): Promise<{
    completionPercentage: number;
    completedSections: number;
    totalSections: number;
    sections: Array<{
      name: string;
      completed: boolean;
    }>;
  }> {
    try {
      const profile = await Profile.findOne({ userId, tenantId });
      if (!profile) {
        return {
          completionPercentage: 0,
          completedSections: 0,
          totalSections: 10,
          sections: [
            { name: 'Personal Information', completed: false },
            { name: 'Contact Details', completed: false },
            { name: 'Education', completed: false },
            { name: 'Work Experience', completed: false },
            { name: 'Language Proficiency', completed: false },
            { name: 'Family Information', completed: false },
            { name: 'Travel History', completed: false },
            { name: 'Documents', completed: false },
            { name: 'Additional Information', completed: false },
            { name: 'Review & Submit', completed: false }
          ]
        };
      }

      // Calculate completion for each section
      const sections = [
        {
          name: 'Personal Information',
          completed: !!(profile.personalDetails?.firstName && profile.personalDetails?.lastName && profile.personalDetails?.dateOfBirth)
        },
        {
          name: 'Contact Details',
          completed: !!(profile.personalDetails?.email && profile.personalDetails?.phoneNumber && profile.personalDetails?.currentAddress)
        },
        {
          name: 'Education',
          completed: !!(profile.educationalDetails?.highestEducation && profile.educationalDetails?.institution)
        },
        {
          name: 'Work Experience',
          completed: !!(profile.employmentDetails?.currentEmployer && profile.employmentDetails?.jobTitle)
        },
        {
          name: 'Language Proficiency',
          completed: !!(profile.personalDetails?.nationality) // Using nationality as a proxy for language info
        },
        {
          name: 'Family Information',
          completed: !!(profile.personalDetails?.maritalStatus)
        },
        {
          name: 'Travel History',
          completed: !!(profile.travelHistory?.internationalVisits?.length > 0)
        },
        {
          name: 'Documents',
          completed: false // This would be calculated based on uploaded documents
        },
        {
          name: 'Additional Information',
          completed: !!(profile.personalHistory?.residentialAddresses?.length > 0)
        },
        {
          name: 'Review & Submit',
          completed: false // This would be true when user submits the profile
        }
      ];

      const completedSections = sections.filter((section: any) => section.completed).length;
      const completionPercentage = Math.round((completedSections / sections.length) * 100);

      return {
        completionPercentage,
        completedSections,
        totalSections: sections.length,
        sections
      };
    } catch (error) {
      return {
        completionPercentage: 0,
        completedSections: 0,
        totalSections: 10,
        sections: [
          { name: 'Personal Information', completed: false },
          { name: 'Contact Details', completed: false },
          { name: 'Education', completed: false },
          { name: 'Work Experience', completed: false },
          { name: 'Language Proficiency', completed: false },
          { name: 'Family Information', completed: false },
          { name: 'Travel History', completed: false },
          { name: 'Documents', completed: false },
          { name: 'Additional Information', completed: false },
          { name: 'Review & Submit', completed: false }
        ]
      };
    }
  }
}
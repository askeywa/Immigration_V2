// frontend/src/components/tenant/UserDetailsReadOnly.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
  ArrowLeftIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserDetailsReadOnlyProps {
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user';
    status: 'active' | 'inactive' | 'pending';
    lastLogin: string;
    createdAt: string;
    profileComplete: boolean;
    // Dynamic profile data
    profileData?: {
      visaHistory?: any;
      personalDetails?: any;
      languageAssessment?: any;
      educationalDetails?: any;
      employmentDetails?: any;
      otherFactors?: any;
      spouse?: any; // Dynamic tab based on marital status
      dependents?: any; // Dynamic tab if applicable
      [key: string]: any; // Allow for future dynamic tabs
    };
  };
  onBack: () => void;
}

const UserDetailsReadOnly: React.FC<UserDetailsReadOnlyProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'crs' | 'documents' | 'checklist' | 'additional' | 'spouse' | 'dependents'>('profile');

  // Dynamic tabs based on user profile data
  const getDynamicTabs = () => {
    const baseTabs = [
      { id: 'profile', label: 'Profile Assessment', icon: UserIcon },
      { id: 'crs', label: 'CRS Score', icon: ChartBarIcon },
      { id: 'documents', label: 'Documents', icon: DocumentTextIcon },
      { id: 'checklist', label: 'Checklist', icon: ClipboardDocumentListIcon },
      { id: 'additional', label: 'Additional Info', icon: InformationCircleIcon },
    ];

    // Add dynamic tabs based on user profile data
    if (user.profileData?.spouse) {
      baseTabs.splice(1, 0, { id: 'spouse', label: 'Spouse Information', icon: UserIcon });
    }
    
    if (user.profileData?.dependents) {
      baseTabs.splice(1, 0, { id: 'dependents', label: 'Dependents', icon: UserIcon });
    }

    return baseTabs;
  };

  const tabs = getDynamicTabs();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="h-4 w-4" />;
      case 'inactive': return <XCircleIcon className="h-4 w-4" />;
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const renderProfileContent = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <p className="mt-1 text-sm text-gray-900">{user.firstName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <p className="mt-1 text-sm text-gray-900">{user.lastName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
              {getStatusIcon(user.status)}
              <span className="ml-1 capitalize">{user.status}</span>
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Complete</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.profileComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {user.profileComplete ? <CheckCircleIcon className="h-4 w-4 mr-1" /> : <ClockIcon className="h-4 w-4 mr-1" />}
              {user.profileComplete ? 'Complete' : 'Incomplete'}
            </span>
          </div>
        </div>
      </Card>

      {/* Visa History Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visa History</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Part A: Canadian Visa History</h4>
            <p className="text-sm text-gray-600 mb-2">Have you ever applied for any kind of Canadian Visa before?</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="radio" name="canadian-visa" value="yes" className="mr-2" disabled />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="canadian-visa" value="no" className="mr-2" checked disabled />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Part B: Other Visa History</h4>
            <p className="text-sm text-gray-600 mb-2">Have you ever applied for any kind of Visa for USA / UK / Australia / New Zealand before?</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="radio" name="other-visa" value="yes" className="mr-2" disabled />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="other-visa" value="no" className="mr-2" checked disabled />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Personal Details Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <p className="mt-1 text-sm text-gray-900">January 15, 1985</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country of Birth</label>
            <p className="mt-1 text-sm text-gray-900">India</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nationality</label>
            <p className="mt-1 text-sm text-gray-900">Indian</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Marital Status</label>
            <p className="mt-1 text-sm text-gray-900">Married</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <p className="mt-1 text-sm text-gray-900">Male</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Passport Number</label>
            <p className="mt-1 text-sm text-gray-900">A1234567</p>
          </div>
        </div>
      </Card>

      {/* Language Assessment Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Language Assessment</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">English Proficiency</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reading</label>
                <p className="mt-1 text-sm text-gray-900">CLB 9</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Writing</label>
                <p className="mt-1 text-sm text-gray-900">CLB 8</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Listening</label>
                <p className="mt-1 text-sm text-gray-900">CLB 9</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Speaking</label>
                <p className="mt-1 text-sm text-gray-900">CLB 8</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">French Proficiency</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reading</label>
                <p className="mt-1 text-sm text-gray-900">CLB 6</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Writing</label>
                <p className="mt-1 text-sm text-gray-900">CLB 5</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Listening</label>
                <p className="mt-1 text-sm text-gray-900">CLB 6</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Speaking</label>
                <p className="mt-1 text-sm text-gray-900">CLB 5</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Educational Details Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Educational Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Highest Education</h4>
            <p className="text-sm text-gray-900">Master's Degree in Computer Science</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Institution</h4>
            <p className="text-sm text-gray-900">University of Technology, Mumbai</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Graduation Year</h4>
            <p className="text-sm text-gray-900">2010</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Country of Study</h4>
            <p className="text-sm text-gray-900">India</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Educational Credential Assessment (ECA)</h4>
            <p className="text-sm text-gray-900">Completed - Equivalent to Canadian Master's Degree</p>
          </div>
        </div>
      </Card>

      {/* Employment Details Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Current Occupation</h4>
            <p className="text-sm text-gray-900">Software Engineer</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Years of Experience</h4>
            <p className="text-sm text-gray-900">8 years</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Current Employer</h4>
            <p className="text-sm text-gray-900">Tech Solutions Inc.</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Job Offer in Canada</h4>
            <p className="text-sm text-gray-900">No</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Provincial Nomination</h4>
            <p className="text-sm text-gray-900">No</p>
          </div>
        </div>
      </Card>

      {/* Other Factors Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Factors</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Adaptability Factors</h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <input type="checkbox" checked disabled className="mr-2" />
                <span className="text-sm text-gray-900">Spouse/Partner has Canadian education</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked disabled className="mr-2" />
                <span className="text-sm text-gray-900">Spouse/Partner has Canadian work experience</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" disabled className="mr-2" />
                <span className="text-sm text-gray-900">Arranged employment in Canada</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Additional Information</h4>
            <p className="text-sm text-gray-900">No criminal record, good health status</p>
          </div>
        </div>
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Member Since</label>
            <p className="mt-1 text-sm text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Login</label>
            <p className="mt-1 text-sm text-gray-900">{new Date(user.lastLogin).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderVisaHistoryContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visa History</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Part A: Canadian Visa History</h4>
            <p className="text-sm text-gray-600 mb-2">Have you ever applied for any kind of Canadian Visa before?</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="radio" name="canadian-visa" value="yes" className="mr-2" disabled />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="canadian-visa" value="no" className="mr-2" checked disabled />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Part B: Other Visa History</h4>
            <p className="text-sm text-gray-600 mb-2">Have you ever applied for any kind of Visa for USA / UK / Australia / New Zealand before?</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input type="radio" name="other-visa" value="yes" className="mr-2" disabled />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="other-visa" value="no" className="mr-2" checked disabled />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPersonalDetailsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <p className="mt-1 text-sm text-gray-900">January 15, 1985</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country of Birth</label>
            <p className="mt-1 text-sm text-gray-900">India</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nationality</label>
            <p className="mt-1 text-sm text-gray-900">Indian</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Marital Status</label>
            <p className="mt-1 text-sm text-gray-900">Married</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <p className="mt-1 text-sm text-gray-900">Male</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Passport Number</label>
            <p className="mt-1 text-sm text-gray-900">A1234567</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderLanguageAssessmentContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Language Assessment</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">English Proficiency</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reading</label>
                <p className="mt-1 text-sm text-gray-900">CLB 9</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Writing</label>
                <p className="mt-1 text-sm text-gray-900">CLB 8</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Listening</label>
                <p className="mt-1 text-sm text-gray-900">CLB 9</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Speaking</label>
                <p className="mt-1 text-sm text-gray-900">CLB 8</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">French Proficiency</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reading</label>
                <p className="mt-1 text-sm text-gray-900">CLB 6</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Writing</label>
                <p className="mt-1 text-sm text-gray-900">CLB 5</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Listening</label>
                <p className="mt-1 text-sm text-gray-900">CLB 6</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Speaking</label>
                <p className="mt-1 text-sm text-gray-900">CLB 5</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEducationalDetailsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Educational Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Highest Education</h4>
            <p className="text-sm text-gray-900">Master's Degree in Computer Science</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Institution</h4>
            <p className="text-sm text-gray-900">University of Technology, Mumbai</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Graduation Year</h4>
            <p className="text-sm text-gray-900">2010</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Country of Study</h4>
            <p className="text-sm text-gray-900">India</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Educational Credential Assessment (ECA)</h4>
            <p className="text-sm text-gray-900">Completed - Equivalent to Canadian Master's Degree</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEmploymentDetailsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Current Occupation</h4>
            <p className="text-sm text-gray-900">Software Engineer</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Years of Experience</h4>
            <p className="text-sm text-gray-900">8 years</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Current Employer</h4>
            <p className="text-sm text-gray-900">Tech Solutions Inc.</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Job Offer in Canada</h4>
            <p className="text-sm text-gray-900">No</p>
          </div>
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Provincial Nomination</h4>
            <p className="text-sm text-gray-900">No</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderOtherFactorsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Factors</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Adaptability Factors</h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <input type="checkbox" checked disabled className="mr-2" />
                <span className="text-sm text-gray-900">Spouse/Partner has Canadian education</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked disabled className="mr-2" />
                <span className="text-sm text-gray-900">Spouse/Partner has Canadian work experience</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" disabled className="mr-2" />
                <span className="text-sm text-gray-900">Arranged employment in Canada</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Additional Information</h4>
            <p className="text-sm text-gray-900">No criminal record, good health status</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderCrsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CRS Score Assessment</h3>
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">CRS Score: 456</h3>
          <p className="mt-1 text-sm text-gray-500">
            Based on current profile information
          </p>
        </div>
      </Card>
    </div>
  );

  const renderDocumentsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
        <div className="text-center py-8">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Documents Uploaded</h3>
          <p className="mt-1 text-sm text-gray-500">
            This user has not uploaded any documents yet.
          </p>
        </div>
      </Card>
    </div>
  );

  const renderChecklistContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Checklist</h3>
        <div className="text-center py-8">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Checklist Items</h3>
          <p className="mt-1 text-sm text-gray-500">
            This user has not started their document checklist yet.
          </p>
        </div>
      </Card>
    </div>
  );

  const renderAdditionalContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
        <div className="text-center py-8">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Additional Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            This user has not provided any additional information yet.
          </p>
        </div>
      </Card>
    </div>
  );

  // Dynamic tab content for spouse
  const renderSpouseContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spouse Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Spouse Name</label>
            <p className="mt-1 text-sm text-gray-900">Jane Doe</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <p className="mt-1 text-sm text-gray-900">March 20, 1987</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nationality</label>
            <p className="mt-1 text-sm text-gray-900">Indian</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Education</label>
            <p className="mt-1 text-sm text-gray-900">Bachelor's in Business Administration</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Language Proficiency</label>
            <p className="mt-1 text-sm text-gray-900">English: CLB 8, French: CLB 6</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Work Experience</label>
            <p className="mt-1 text-sm text-gray-900">5 years in Marketing</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // Dynamic tab content for dependents
  const renderDependentsContent = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dependents Information</h3>
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Child 1</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">Alex Doe</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <p className="mt-1 text-sm text-gray-900">June 15, 2015</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                <p className="mt-1 text-sm text-gray-900">Son</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <p className="mt-1 text-sm text-gray-900">Indian</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileContent();
      case 'spouse': return renderSpouseContent();
      case 'dependents': return renderDependentsContent();
      case 'crs': return renderCrsContent();
      case 'documents': return renderDocumentsContent();
      case 'checklist': return renderChecklistContent();
      case 'additional': return renderAdditionalContent();
      default: return renderProfileContent();
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Back to Users</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
                {getStatusIcon(user.status)}
                <span className="ml-1 capitalize">{user.status}</span>
              </span>
              <span className="text-sm text-gray-500">
                {user.role === 'admin' ? 'Administrator' : 'User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};

export default UserDetailsReadOnly;

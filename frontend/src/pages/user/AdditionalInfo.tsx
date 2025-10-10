// frontend/src/pages/user/AdditionalInfo.tsx
import React from 'react';
import ProfileAssessment from './ProfileAssessment';

// We reuse the existing renderer by mounting ProfileAssessment and showing
// only the three Family Info tabs. For simplicity, we mount the component and
// scroll to family tabs; the existing dynamic tabs already render the same UI.

const AdditionalInfo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Additional Info</h1>
        {/* Reuse ProfileAssessment, restricted to family tabs only */}
        <ProfileAssessment mode="familyOnly" />
      </div>
    </div>
  );
};

export default AdditionalInfo;



// backend/src/models/Profile.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  personalDetails: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    nationality: string;
    countryOfResidence?: string;
    maritalStatus?: 'single' | 'married' | 'common_law' | string;
    passportNumber: string;
    phoneNumber: string;
    email: string;
    currentAddress: string;
    city: string;
    country: string;
    postalCode: string;
  };
  educationalDetails: {
    highestEducation: string;
    institution: string;
    fieldOfStudy: string;
    graduationYear: string;
    gpa: string;
    additionalCertifications: string;
    // Extended for CRS
    eca?: {
      hasECA?: boolean;
      organization?: string;
      date?: string;
      equivalency?: string;
    };
    educations?: Array<{
      level?: string;
      institution?: string;
      country?: string;
      fieldOfStudy?: string;
      graduationDate?: string;
      eca?: {
        hasECA?: boolean;
        organization?: string;
        date?: string;
        equivalency?: string;
      };
    }>;
  };
  employmentDetails: {
    currentEmployer: string;
    jobTitle: string;
    startDate: string;
    endDate: string;
    jobDescription: string;
    previousEmployers: Array<{
      employer: string;
      jobTitle: string;
      startDate: string;
      endDate: string;
    }>;
    // Extended for CRS
    isCanadianJob?: boolean;
    isFullTime?: boolean;
    workHistory?: Array<{
      jobTitle?: string;
      nocCode?: string;
      country?: string;
      startDate?: string;
      endDate?: string;
      isCanadian?: boolean;
      isFullTime?: boolean;
    }>;
    totalYears?: number;
  };
  travelHistory: {
    internationalVisits: Array<{
      country: string;
      purpose: string;
      startDate: string;
      endDate: string;
      visaType: string;
    }>;
  };
  personalHistory: {
    residentialAddresses: Array<{
      address: string;
      city: string;
      country: string;
      startDate: string;
      endDate: string;
    }>;
  };
  visaHistory?: {
    canada?: {
      hasAppliedBefore: boolean;
      types: string[];
      entries: Array<{
        visaType: string;
        result: 'Approved' | 'Rejected' | '';
        uciNumber?: string;
        applicationNumbers?: string[];
        rejectionCount?: number;
        rejectionReason?: string;
        documents?: Array<{
          fileName: string;
          mimeType: string;
          size: number;
          data: string; // base64
          uploadedAt?: Date;
        }>;
      }>;
    };
    other?: {
      hasAppliedBefore: boolean;
      countries: Array<'USA' | 'UK' | 'Australia' | 'New Zealand'>;
      countryData: Array<{
        country: 'USA' | 'UK' | 'Australia' | 'New Zealand';
        types: string[];
        entries: Array<{
          country: 'USA' | 'UK' | 'Australia' | 'New Zealand';
          visaType: string;
          result: 'Approved' | 'Rejected' | '';
          uciNumber?: string;
          applicationNumbers?: string[];
          rejectionCount?: number;
          rejectionReason?: string;
          documents?: Array<{
            fileName: string;
            mimeType: string;
            size: number;
            data: string;
            uploadedAt?: Date;
          }>;
        }>;
      }>;
    };
  };
  // CRS subdocument (optional)
  crs?: Record<string, unknown>;
  // Assessment sections for CRS mapping
  languageAssessment?: Record<string, unknown>;
  spouse?: Record<string, unknown>;
  otherFactors?: Record<string, unknown>;
  familyInfo?: Record<string, unknown>;
  documentsChecklist?: Record<string, unknown>;
  lastUpdated?: Date;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  belongsToTenant(tenantId: string | mongoose.Types.ObjectId): boolean;
}

const profileSchema = new Schema<IProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  personalDetails: {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },
    nationality: { type: String, default: '' },
    countryOfResidence: { type: String, default: '' },
    maritalStatus: { type: String, default: '' },
    passportNumber: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    email: { type: String, default: '' },
    currentAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
  },
  educationalDetails: new Schema({
    highestEducation: { type: String, default: '' },
    institution: { type: String, default: '' },
    fieldOfStudy: { type: String, default: '' },
    graduationYear: { type: String, default: '' },
    gpa: { type: String, default: '' },
    additionalCertifications: { type: String, default: '' },
    eca: new Schema({
      hasECA: { type: Boolean, default: false },
      organization: { type: String, default: '' },
      date: { type: String, default: '' },
      equivalency: { type: String, default: '' },
    }, { _id: false, strict: false }),
    educations: [new Schema({
      level: { type: String, default: '' },
      institution: { type: String, default: '' },
      country: { type: String, default: '' },
      fieldOfStudy: { type: String, default: '' },
      graduationDate: { type: String, default: '' },
      eca: new Schema({
        hasECA: { type: Boolean, default: false },
        organization: { type: String, default: '' },
        date: { type: String, default: '' },
        equivalency: { type: String, default: '' },
      }, { _id: false, strict: false })
    }, { _id: false, strict: false })],
  }, { _id: false, strict: false }),
  employmentDetails: new Schema({
    currentEmployer: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    jobDescription: { type: String, default: '' },
    previousEmployers: [{
      employer: { type: String, default: '' },
      jobTitle: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
    }],
    isCanadianJob: { type: Boolean, default: false },
    isFullTime: { type: Boolean, default: true },
    workHistory: [new Schema({
      jobTitle: { type: String, default: '' },
      nocCode: { type: String, default: '' },
      country: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
      isCanadian: { type: Boolean, default: false },
      isFullTime: { type: Boolean, default: true },
    }, { _id: false, strict: false })],
    totalYears: { type: Number, default: 0 },
  }, { _id: false, strict: false }),
  travelHistory: {
    internationalVisits: [{
      country: { type: String, default: '' },
      purpose: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
      visaType: { type: String, default: '' },
    }],
  },
  personalHistory: {
    residentialAddresses: [{
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      country: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
    }],
  },
  // CRS subdocument (optional)
  crs: new Schema({
    inputs: new Schema({
      age: { type: Number, default: 25 },
      maritalStatus: { type: String, enum: ['single', 'married', 'common_law'], default: 'single' },
      hasSpouse: { type: Boolean, default: false },
      numChildren: { type: Number, default: 0 },
      languageProficiency: new Schema({
        first: new Schema({
          testType: { type: String, enum: ['IELTS', 'CELPIP', 'TEF', 'TCF'], default: 'IELTS' },
          reading: { type: Number, default: 6 },
          listening: { type: Number, default: 6 },
          speaking: { type: Number, default: 6 },
          writing: { type: Number, default: 6 },
          clb: new Schema({ R: { type: Number, default: 7 }, L: { type: Number, default: 7 }, S: { type: Number, default: 7 }, W: { type: Number, default: 7 } }, { _id: false, strict: false }),
          testDate: { type: String, default: '' }
        }, { _id: false, strict: false }),
        second: new Schema({
          testType: { type: String, enum: ['IELTS', 'CELPIP', 'TEF', 'TCF'] },
          reading: { type: Number },
          listening: { type: Number },
          speaking: { type: Number },
          writing: { type: Number },
          clb: new Schema({ R: { type: Number }, L: { type: Number }, S: { type: Number }, W: { type: Number } }, { _id: false, strict: false }),
          testDate: { type: String }
        }, { _id: false, strict: false })
      }, { _id: false, strict: false }),
      education: new Schema({
        highest: { type: String, enum: ['LessThanSecondary','Secondary','OneYearPostSecondary','TwoYearPostSecondary','BachelorsOr3Year','TwoOrMoreCredentials','Masters','ProfessionalDegree','Doctoral'], default: 'BachelorsOr3Year' },
        eca: new Schema({ hasECA: { type: Boolean, default: false }, equivalency: { type: String, default: '' }, date: { type: String, default: '' }, organization: { type: String, default: '' } }, { _id: false, strict: false })
      }, { _id: false, strict: false }),
      workExperience: new Schema({
        canadianYears: { type: Number, enum: [0,1,2,3,4,5], default: 0 },
        foreignYears: { type: Number, enum: [0,1,2,3,4,5,6,7,8,9,10], default: 0 }
      }, { _id: false, strict: false }),
      arrangedEmployment: { type: Boolean, default: false },
      provincialNomination: { type: Boolean, default: false },
      canadianStudy: { type: String, enum: ['none','oneYear','twoPlusYears'], default: 'none' },
      siblingsInCanada: { type: Boolean, default: false },
      frenchBonusEligible: { type: Boolean, default: false },
      spouse: new Schema({
        age: { type: Number },
        education: { type: String, enum: ['LessThanSecondary','Secondary','OneYearPostSecondary','TwoYearPostSecondary','BachelorsOr3Year','TwoOrMoreCredentials','Masters','ProfessionalDegree','Doctoral'] },
        language: new Schema({
          testType: { type: String, enum: ['IELTS', 'CELPIP', 'TEF', 'TCF'] },
          reading: { type: Number },
          listening: { type: Number },
          speaking: { type: Number },
          writing: { type: Number },
          clb: new Schema({ R: { type: Number }, L: { type: Number }, S: { type: Number }, W: { type: Number } }, { _id: false, strict: false }),
          testDate: { type: String }
        }, { _id: false, strict: false }),
        canadianYears: { type: Number, enum: [0,1,2,3,4,5], default: 0 }
      }, { _id: false, strict: false })
    }, { _id: false, strict: false }),
    currentScore: { type: Number, default: 0 },
    breakdown: { type: Schema.Types.Mixed, default: {} },
    history: [{ score: { type: Number }, breakdown: { type: Schema.Types.Mixed }, calculatedAt: { type: Date, default: Date.now } }],
    override: new Schema({ enabled: { type: Boolean, default: false }, score: { type: Number }, reason: { type: String }, setBy: { type: String }, setAt: { type: Date, default: Date.now } }, { _id: false }),
    lastUpdated: { type: Date, default: Date.now }
  }, { _id: false, strict: false }),
  // Additional assessment sections for CRS mapping/persistence
  languageAssessment: new Schema({}, { _id: false, strict: false }),
  spouse: new Schema({}, { _id: false, strict: false }),
  otherFactors: new Schema({}, { _id: false, strict: false }),
  familyInfo: new Schema({
    applicant: new Schema({
      father: new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Father' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false }),
      mother: new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Mother' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false }),
      brothers: [new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Brother' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false })],
      sisters: [new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Sister' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false })]
    }, { _id: false, strict: false }),
    spouse: new Schema({
      father: new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Father' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false }),
      mother: new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Mother' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false }),
      brothers: [new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Brother' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false })],
      sisters: [new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Sister' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false })]
    }, { _id: false, strict: false }),
    children: new Schema({
      father: new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Father' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false }),
      mother: new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Mother' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false }),
      brothers: [new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Brother' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false })],
      sisters: [new Schema({
        fullName: { type: String, default: '' },
        maritalStatus: { type: String, default: '' },
        relationship: { type: String, default: 'Sister' },
        dateOfBirth: { type: String, default: '' },
        countryOfBirth: { type: String, default: '' },
        presentAddress: { type: String, default: '' },
        presentOccupation: { type: String, default: '' },
        accompanyToCanada: { type: Boolean, default: false }
      }, { _id: false, strict: false })]
    }, { _id: false, strict: false })
  }, { _id: false, strict: false }),
  visaHistory: new Schema({
    canada: new Schema({
      hasAppliedBefore: { type: Boolean, default: false },
      types: { type: [String], default: [] },
      entries: [
        new Schema({
          visaType: { type: String, default: '' },
          result: { type: String, enum: ['Approved', 'Rejected', ''], default: '' },
          uciNumber: { type: String, default: '' },
          applicationNumbers: { type: [String], default: [] },
          rejectionCount: { type: Number, default: 0 },
          rejectionReason: { type: String, default: '' },
          documents: [
            new Schema({
              fileName: { type: String, required: true },
              mimeType: { type: String, required: true },
              size: { type: Number, required: true },
              data: { type: String, required: true },
              uploadedAt: { type: Date, default: Date.now },
            }, { _id: false })
          ]
        }, { _id: false })
      ]
    }, { _id: false }),
    other: new Schema({
      hasAppliedBefore: { type: Boolean, default: false },
      countries: { type: [String], default: [] },
      countryData: [
        new Schema({
          country: { type: String, default: '' },
          types: { type: [String], default: [] },
          entries: [
            new Schema({
              country: { type: String, default: '' },
              visaType: { type: String, default: '' },
              result: { type: String, enum: ['Approved', 'Rejected', ''], default: '' },
              uciNumber: { type: String, default: '' },
              applicationNumbers: { type: [String], default: [] },
              rejectionCount: { type: Number, default: 0 },
              rejectionReason: { type: String, default: '' },
              documents: [
                new Schema({
                  fileName: { type: String, required: true },
                  mimeType: { type: String, required: true },
                  size: { type: Number, required: true },
                  data: { type: String, required: true },
                  uploadedAt: { type: Date, default: Date.now },
                }, { _id: false })
              ]
            }, { _id: false })
          ]
        }, { _id: false })
      ]
    }, { _id: false })
  }, { _id: false }),
  documentsChecklist: { type: Schema.Types.Mixed, default: {} },
  lastUpdated: { type: Date, default: Date.now },
  isComplete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Instance method to check if profile belongs to a tenant
profileSchema.methods.belongsToTenant = function(tenantId: string | mongoose.Types.ObjectId): boolean {
  const profileTenantId = this.tenantId?.toString();
  const checkTenantId = tenantId?.toString();
  return profileTenantId === checkTenantId;
};

export const Profile = mongoose.model<IProfile>('Profile', profileSchema);
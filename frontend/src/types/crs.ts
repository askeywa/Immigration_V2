// CRS TypeScript interfaces and types
// Path: frontend/src/types/crs.ts

export type MaritalStatus = 'single' | 'married' | 'common_law';

export type TestType = 'IELTS' | 'CELPIP' | 'TEF' | 'TCF';

export type EducationLevel = 
  | 'LessThanSecondary'
  | 'Secondary' 
  | 'OneYearPostSecondary'
  | 'TwoYearPostSecondary'
  | 'BachelorsOr3Year'
  | 'TwoOrMoreCredentials'
  | 'Masters'
  | 'ProfessionalDegree'
  | 'Doctoral';

export type CanadianStudyLevel = 'none' | 'oneYear' | 'twoPlusYears';

export interface ClbScores {
  R: number; // Reading
  L: number; // Listening
  S: number; // Speaking
  W: number; // Writing
}

export interface LanguageTest {
  testType: TestType;
  reading: number;
  listening: number;
  speaking: number;
  writing: number;
  clb: ClbScores;
  testDate?: string;
}

export interface WorkExperience {
  canadianYears: 0 | 1 | 2 | 3 | 4 | 5;
  foreignYears: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
}

export interface EducationCredential {
  hasECA: boolean;
  equivalency?: string;
  date?: string;
  organization?: string;
}

export interface SpouseDetails {
  age: number;
  education: EducationLevel;
  language?: LanguageTest;
  canadianYears: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface CrsInputs {
  // Personal
  age: number;
  maritalStatus: MaritalStatus;
  hasSpouse: boolean;
  numChildren: number;
  
  // Language
  languageProficiency: {
    first: LanguageTest;
    second?: LanguageTest;
  };
  
  // Education  
  education: {
    highest: EducationLevel;
    eca: EducationCredential;
  };
  
  // Work Experience
  workExperience: WorkExperience;
  
  // Additional Points
  arrangedEmployment: boolean;
  provincialNomination: boolean;
  canadianStudy: CanadianStudyLevel;
  siblingsInCanada: boolean;
  frenchBonusEligible: boolean;
  
  // Spouse (if applicable)
  spouse?: SpouseDetails;
}

export interface CrsBreakdown {
  coreHumanCapital: {
    age: number;
    education: number;
    firstLanguage: number;
    secondLanguage: number;
    canadianWork: number;
    total: number;
  };
  spouseFactors: {
    education: number;
    language: number;
    canadianWork: number;
    total: number;
  };
  skillTransferability: {
    educationLanguage: number;
    educationCanadianWork: number;
    foreignWorkLanguage: number;
    foreignWorkCanadianWork: number;
    certificateLanguage: number;
    total: number;
  };
  additionalPoints: {
    provincialNomination: number;
    arrangedEmployment: number;
    canadianStudy: number;
    siblingsInCanada: number;
    frenchLanguageSkills: number;
    total: number;
  };
  grandTotal: number;
}

export interface CrsHistoryEntry {
  score: number;
  breakdown: Record<string, number>;
  calculatedAt: Date;
}

export interface CrsOverride {
  enabled: boolean;
  score: number;
  reason: string;
  setBy: string;
  setAt: Date;
}

export interface CrsData {
  inputs: CrsInputs;
  currentScore: number;
  breakdown: CrsBreakdown;
  history: CrsHistoryEntry[];
  override?: CrsOverride;
  lastUpdated: Date;
}

// Form validation types
export interface CrsFormErrors {
  age?: string;
  languageProficiency?: {
    first?: {
      reading?: string;
      listening?: string;
      speaking?: string;
      writing?: string;
    };
    second?: {
      reading?: string;
      listening?: string;
      speaking?: string;
      writing?: string;
    };
  };
  spouse?: {
    age?: string;
    language?: {
      reading?: string;
      listening?: string;
      speaking?: string;
      writing?: string;
    };
  };
}

// Constants for form options
export const EDUCATION_OPTIONS = [
  { value: 'LessThanSecondary', label: 'Less than secondary school' },
  { value: 'Secondary', label: 'Secondary diploma (high school)' },
  { value: 'OneYearPostSecondary', label: 'One-year post-secondary program' },
  { value: 'TwoYearPostSecondary', label: 'Two-year post-secondary program' },
  { value: 'BachelorsOr3Year', label: "Bachelor's degree (3+ years)" },
  { value: 'TwoOrMoreCredentials', label: 'Two or more post-secondary credentials' },
  { value: 'Masters', label: "Master's degree" },
  { value: 'ProfessionalDegree', label: 'Professional degree (Law, Medicine, etc.)' },
  { value: 'Doctoral', label: 'Doctoral level university degree (PhD)' }
] as const;

export const TEST_TYPE_OPTIONS = [
  { value: 'IELTS', label: 'IELTS General Training' },
  { value: 'CELPIP', label: 'CELPIP-General' },
  { value: 'TEF', label: 'TEF Canada (French)' },
  { value: 'TCF', label: 'TCF Canada (French)' }
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single/Never Married' },
  { value: 'married', label: 'Married' },
  { value: 'common_law', label: 'Common-law Partner' }
] as const;

export const CANADIAN_STUDY_OPTIONS = [
  { value: 'none', label: 'No Canadian education' },
  { value: 'oneYear', label: '1-2 year diploma/certificate' },
  { value: 'twoPlusYears', label: '3+ year credential from Canada' }
] as const;
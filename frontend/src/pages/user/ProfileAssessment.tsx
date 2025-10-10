import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  Plane, 
  Home, 
  Save, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Database,
  Wifi,
  WifiOff,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CrsInputs } from '@/types/crs';
import { calculateCrsScore, convertToClb } from '@/utils/crs';
import { useAuthStore } from '@/store/authStore';
import COUNTRIES from '@/constants/countries';

// API configuration
const API_URL = '/api/profiles';

// TypeScript interface for profile data
type FamilyMaritalStatus =
  | 'annulled_marriage'
  | 'common_law'
  | 'divorced'
  | 'legally_separated'
  | 'married_physically_present'
  | 'married_not_physically_present'
  | 'single'
  | 'widowed';

interface FamilyMember {
  fullName: string;
  maritalStatus?: FamilyMaritalStatus;
  relationship: 'Father' | 'Mother' | 'Brother' | 'Sister';
  dateOfBirth?: string;
  countryOfBirth?: string;
  presentAddress?: string;
  presentOccupation?: string;
}

interface FamilySet {
  father: FamilyMember;
  mother: FamilyMember;
  brothers: FamilyMember[];
  sisters: FamilyMember[];
}

interface ProfileData {
  _id?: string;
  personalDetails: {
    firstName: string;
    lastName: string;
    gender?: string;
    dateOfBirth: string;
    nationality: string;
    countryOfResidence?: string;
    passportNumber: string;
    phoneNumber: string;
    email: string;
    currentAddress: string;
    city: string;
    country: string;
    postalCode: string;
    maritalStatus?:
      | 'single'
      | 'married'
      | 'common_law'
      | 'annulled'
      | 'divorced_separated'
      | 'legally_separated'
      | 'widowed';
    childrenCount?: number;
  };
  educationalDetails: {
    highestEducation: string; // normalized education label
    institution: string;
    fieldOfStudy: string;
    countryOfStudy?: string;
    graduationYear: string; // keep for existing entries
    graduationDate?: string; // YYYY-MM-DD
    gpa: string;
    additionalCertifications: string;
    eca?: { hasECA: boolean; organization?: string; equivalency?: string; date?: string; reportNumber?: string };
    educations?: Array<{
      level: string; // dropdown option
      institution: string;
      fieldOfStudy: string;
      graduationYear: string;
      graduationDate?: string;
      countryOfStudy?: string;
      gpa: string;
      eca?: { hasECA: boolean; organization?: string; equivalency?: string; date?: string; reportNumber?: string };
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
      nocCode?: string;
      country?: string;
      startDate: string;
      endDate: string;
      isCanadian?: boolean;
      fullTime?: boolean;
    }>;
    isCanadian?: boolean; // for current
    fullTime?: boolean; // for current
    currentOngoing?: boolean; // current job till now
    totalYearsAuto?: number; // computed
  };
  languageAssessment?: {
    primary: {
      testType: 'IELTS' | 'CELPIP' | 'TEF' | 'TCF';
      testDate?: string;
      listening: number | '';
      reading: number | '';
      writing: number | '';
      speaking: number | '';
    };
    secondary?: {
      testType: 'IELTS' | 'CELPIP' | 'TEF' | 'TCF';
      testDate?: string;
      listening: number | '';
      reading: number | '';
      writing: number | '';
      speaking: number | '';
    };
  };
  spouse?: {
    firstName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    nationality?: string;
    countryOfResidence?: string;
    passportNumber?: string;
    phoneNumber?: string;
    email?: string;
    sameAddress?: boolean;
    address?: { address?: string; city?: string; country?: string };
    educationLevel?: string; // legacy single level
    educations?: Array<{ level: string; institution: string; fieldOfStudy: string; graduationYear: string; gpa?: string }>;
    eca?: { hasECA: boolean; organization?: string; equivalency?: string; date?: string; reportNumber?: string };
    language?: {
      testType?: 'IELTS' | 'CELPIP' | 'TEF' | 'TCF';
      testDate?: string;
      reportNumber?: string;
      listening?: number | '';
      reading?: number | '';
      writing?: number | '';
      speaking?: number | '';
    };
    canadianYears?: number;
    employment?: Array<{ employer: string; jobTitle: string; startDate: string; endDate?: string; isCurrent?: boolean; nocCode?: string; country?: string; isCanadian?: boolean; fullTime?: boolean }>;
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
          documents?: Array<{ fileName: string; mimeType: string; size: number; data: string; uploadedAt?: Date }>;
        }>;
      };
    };
    travelHistory?: { internationalVisits: Array<{ country: string; purpose: string; startDate: string; endDate: string; visaType: string }>; };
    personalHistory?: { residentialAddresses: Array<{ address: string; city: string; country: string; startDate: string; endDate: string; isCurrent?: boolean; useSameCurrent?: boolean }>; };
  };
  otherFactors?: {
    provincialNomination?: boolean;
    arrangedEmployment?: boolean;
    arrangedEmploymentNoc?: string;
    canadianStudy?: boolean;
    canadianStudyYears?: number;
    siblingsInCanada?: boolean;
    frenchBonusEligible?: boolean;
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
  children?: Array<{
    name: string;
    dateOfBirth: string;
    sex: 'male' | 'female' | 'other' | '';
    educationLevel: string;
    sameAddress?: boolean;
    address?: { address?: string; city?: string; country?: string };
  }>;
  familyInfo?: {
    applicant: FamilySet;
    spouse?: FamilySet;
    children?: FamilySet;
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
          data: string;
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
          documents?: Array<{ fileName: string; mimeType: string; size: number; data: string; uploadedAt?: Date }>;
        }>;
      }>;
    };
  };
  lastUpdated?: Date;
  userId?: string;
}

// Initial empty data structure
const initialProfileData: ProfileData = {
  personalDetails: {
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    countryOfResidence: '',
    passportNumber: '',
    phoneNumber: '',
    email: '',
    currentAddress: '',
    city: '',
    country: '',
    postalCode: '',
    maritalStatus: 'single',
    childrenCount: 0,
  },
  educationalDetails: {
    highestEducation: '',
    institution: '',
    fieldOfStudy: '',
    graduationYear: '',
    gpa: '',
    additionalCertifications: '',
    educations: [],
    eca: { hasECA: false },
  },
  employmentDetails: {
    currentEmployer: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    jobDescription: '',
    previousEmployers: [],
    isCanadian: false,
    fullTime: true,
  },
  languageAssessment: {
    primary: { testType: 'IELTS', testDate: '', listening: '', reading: '', writing: '', speaking: '' },
  },
  spouse: {
    educations: [ { level: '', institution: '', fieldOfStudy: '', graduationYear: '' } ],
    employment: [ { employer: '', jobTitle: '', startDate: '', isCurrent: false } ],
    language: { testType: undefined, testDate: '', reportNumber: '', listening: '', reading: '', writing: '', speaking: '' }
  },
  otherFactors: { provincialNomination: false, arrangedEmployment: false, canadianStudy: false, siblingsInCanada: false, frenchBonusEligible: false },
  travelHistory: {
    internationalVisits: [],
  },
  personalHistory: {
    residentialAddresses: [],
  },
  visaHistory: {
    canada: {
      hasAppliedBefore: false,
      types: [],
      entries: [],
    },
    other: {
      hasAppliedBefore: false,
      countries: [],
      countryData: []
    }
  },
  children: [],
  familyInfo: {
    applicant: {
      father: { fullName: '', relationship: 'Father' },
      mother: { fullName: '', relationship: 'Mother' },
      brothers: [{ fullName: '', relationship: 'Brother' }],
      sisters: [{ fullName: '', relationship: 'Sister' }]
    },
    spouse: {
      father: { fullName: '', relationship: 'Father' },
      mother: { fullName: '', relationship: 'Mother' },
      brothers: [{ fullName: '', relationship: 'Brother' }],
      sisters: [{ fullName: '', relationship: 'Sister' }]
    },
    children: {
      father: { fullName: '', relationship: 'Father' },
      mother: { fullName: '', relationship: 'Mother' },
      brothers: [{ fullName: '', relationship: 'Brother' }],
      sisters: [{ fullName: '', relationship: 'Sister' }]
    }
  },
};

// tabs are computed dynamically based on marital status

interface ProfileAssessmentProps { mode?: 'default' | 'familyOnly' }

const ProfileAssessment: React.FC<ProfileAssessmentProps> = ({ mode = 'default' }) => {
  // Component state variables
  const [activeTab, setActiveTab] = useState(mode === 'familyOnly' ? 'familyInfoApplicant' : 'visaHistory');
  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, token, isAuthenticated } = useAuthStore();

  // Required fields per section
  const requiredFields: Record<string, string[]> = {
    personalDetails: [
      'firstName', 'lastName', 'gender', 'dateOfBirth', 'nationality', 'countryOfResidence', 'passportNumber',
      'phoneNumber', 'email', 'maritalStatus'
    ],
    educationalDetails: [
      'highestEducation', 'institution', 'fieldOfStudy', 'graduationYear'
    ],
    employmentDetails: [
      'currentEmployer', 'jobTitle', 'startDate', 'jobDescription'
    ],
  };

  const maritalOptions: { value: FamilyMaritalStatus; label: string }[] = [
    { value: 'annulled_marriage', label: 'Annulled marriage' },
    { value: 'common_law', label: 'Common-law' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'legally_separated', label: 'Legally separated' },
    { value: 'married_physically_present', label: 'Married–physically present' },
    { value: 'married_not_physically_present', label: 'Married–not physically present' },
    { value: 'single', label: 'Single' },
    { value: 'widowed', label: 'Widowed' },
  ];

  const renderFamily = (who: 'applicant' | 'spouse' | 'children') => {
    // Ensure deep-safe defaults so UI never reads undefined props
    const raw = (profileData.familyInfo?.[who] as FamilySet) || ({} as FamilySet);
    const defaults = (initialProfileData.familyInfo as any)[who] as FamilySet;
    const set: FamilySet = {
      ...defaults,
      ...raw,
      father: { ...(defaults as any).father, ...(raw as any).father },
      mother: { ...(defaults as any).mother, ...(raw as any).mother },
      brothers: (raw as any).brothers && (raw as any).brothers!.length > 0 ? (raw as any).brothers! : (defaults as any).brothers,
      sisters: (raw as any).sisters && (raw as any).sisters!.length > 0 ? (raw as any).sisters! : (defaults as any).sisters,
    } as any;

    const updateMember = (path: string, value: any) => {
      setProfileData(prev => {
        const fi = { ...(prev.familyInfo || {}) } as any;
        const current = { ...(fi[who] || {}) } as any;
        const keys = path.split('.');
        let node = current;
        for (let i = 0; i < keys.length - 1; i++) {
          const seg = keys[i];
          node[seg] = { ...(node[seg] || {}) };
          node = node[seg];
        }
        node[keys[keys.length - 1]] = value;
        fi[who] = current;
        return { ...prev, familyInfo: fi };
      });
    };

    const addSibling = (type: 'brothers' | 'sisters') => {
      setProfileData(prev => {
        const fi = { ...(prev.familyInfo || {}) } as any;
        const target = { ...(fi[who] || {}) } as any;
        const seed: FamilyMember[] = (target[type] && target[type].length > 0)
          ? target[type]
          : ((defaults as any)[type] as FamilyMember[]);
        const list: FamilyMember[] = [...(seed || [])];
        list.push({ fullName: '', relationship: type === 'brothers' ? 'Brother' : 'Sister' });
        target[type] = list;
        fi[who] = target;
        return { ...prev, familyInfo: fi };
      });
    };

    const removeSibling = (type: 'brothers' | 'sisters', index: number) => {
      setProfileData(prev => {
        const fi = { ...(prev.familyInfo || {}) } as any;
        const target = { ...(fi[who] || {}) } as any;
        const list: FamilyMember[] = [...(target[type] || [])];
        if (list.length > 1) {
          list.splice(index, 1);
        } else {
          list[0] = { fullName: '', relationship: type === 'brothers' ? 'Brother' : 'Sister' };
        }
        target[type] = list;
        fi[who] = target;
        return { ...prev, familyInfo: fi };
      });
    };

    const removeLastSibling = (type: 'brothers' | 'sisters') => {
      setProfileData(prev => {
        const fi = { ...(prev.familyInfo || {}) } as any;
        const target = { ...(fi[who] || {}) } as any;
        const list: FamilyMember[] = [...(target[type] || [])];
        if (list.length > 1) {
          list.pop();
        } else {
          list[0] = { fullName: '', relationship: type === 'brothers' ? 'Brother' : 'Sister' };
        }
        target[type] = list;
        fi[who] = target;
        return { ...prev, familyInfo: fi };
      });
    };

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">{who.replace('_',' ')} Family Information</h3>

        {/* Father */}
        <Card className="p-4">
          <h4 className="text-base font-semibold text-gray-900 mb-3">Father</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Full Name" value={set.father.fullName} onChange={(e)=>updateMember('father.fullName', e.target.value)} />
            <select className="w-full border rounded-lg p-2" value={set.father.maritalStatus||''} onChange={(e)=>updateMember('father.maritalStatus', e.target.value as any)}>
              <option value="">Marital Status</option>
              {maritalOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
            <Input placeholder="Date of Birth (DD/MM/YYYY)" value={set.father.dateOfBirth||''} onChange={(e)=>updateMember('father.dateOfBirth', e.target.value)} />
            <select className="w-full border rounded-lg p-2" value={set.father.countryOfBirth||''} onChange={(e)=>updateMember('father.countryOfBirth', e.target.value)}>
              <option value="">Country of Birth</option>
              {COUNTRIES.map((c:any)=> (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
            <Input className="md:col-span-2" placeholder="Present Address (if deceased: city/town, country and date)" value={set.father.presentAddress||''} onChange={(e)=>updateMember('father.presentAddress', e.target.value)} />
            <Input placeholder="Present Occupation" value={set.father.presentOccupation||''} onChange={(e)=>updateMember('father.presentOccupation', e.target.value)} />
            {/* Removed accompany-to-Canada option as requested */}
          </div>
        </Card>

        {/* Mother */}
        <Card className="p-4">
          <h4 className="text-base font-semibold text-gray-900 mb-3">Mother</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Full Name" value={set.mother.fullName} onChange={(e)=>updateMember('mother.fullName', e.target.value)} />
            <select className="w-full border rounded-lg p-2" value={set.mother.maritalStatus||''} onChange={(e)=>updateMember('mother.maritalStatus', e.target.value as any)}>
              <option value="">Marital Status</option>
              {maritalOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
            <Input placeholder="Date of Birth (DD/MM/YYYY)" value={set.mother.dateOfBirth||''} onChange={(e)=>updateMember('mother.dateOfBirth', e.target.value)} />
            <select className="w-full border rounded-lg p-2" value={set.mother.countryOfBirth||''} onChange={(e)=>updateMember('mother.countryOfBirth', e.target.value)}>
              <option value="">Country of Birth</option>
              {COUNTRIES.map((c:any)=> (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
            <Input className="md:col-span-2" placeholder="Present Address (if deceased: city/town, country and date)" value={set.mother.presentAddress||''} onChange={(e)=>updateMember('mother.presentAddress', e.target.value)} />
            <Input placeholder="Present Occupation" value={set.mother.presentOccupation||''} onChange={(e)=>updateMember('mother.presentOccupation', e.target.value)} />
            {/* Removed accompany-to-Canada option as requested */}
          </div>
        </Card>

        {/* Brothers */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-gray-900">Brother(s) — { (set.brothers || []).length }</h4>
            <div className="flex items-center gap-2">
              <Button className="text-xs" onClick={()=>addSibling('brothers')}>+ Add</Button>
              <Button variant="outline" className="text-xs" onClick={()=>removeLastSibling('brothers')}>Remove</Button>
            </div>
          </div>
          <div className="space-y-3">
            {(set.brothers || []).map((b, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-gray-900">Brother {idx + 1}</h5>
                  <Button variant="outline" className="text-xs" onClick={()=>removeSibling('brothers', idx)}>Remove</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Full Name" value={b.fullName} onChange={(e)=>updateMember(`brothers.${idx}.fullName`, e.target.value)} />
                  <select className="w-full border rounded-lg p-2" value={b.maritalStatus||''} onChange={(e)=>updateMember(`brothers.${idx}.maritalStatus`, e.target.value as any)}>
                    <option value="">Marital Status</option>
                    {maritalOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                  <Input placeholder="Date of Birth (DD/MM/YYYY)" value={b.dateOfBirth||''} onChange={(e)=>updateMember(`brothers.${idx}.dateOfBirth`, e.target.value)} />
                  <select className="w-full border rounded-lg p-2" value={b.countryOfBirth||''} onChange={(e)=>updateMember(`brothers.${idx}.countryOfBirth`, e.target.value)}>
                    <option value="">Country of Birth</option>
                    {COUNTRIES.map((c:any)=> (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <Input className="md:col-span-2" placeholder="Present Address (if deceased: city/town, country and date)" value={b.presentAddress||''} onChange={(e)=>updateMember(`brothers.${idx}.presentAddress`, e.target.value)} />
                  <Input placeholder="Present Occupation" value={b.presentOccupation||''} onChange={(e)=>updateMember(`brothers.${idx}.presentOccupation`, e.target.value)} />
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Sisters */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-gray-900">Sister(s) — { (set.sisters || []).length }</h4>
            <div className="flex items-center gap-2">
              <Button className="text-xs" onClick={()=>addSibling('sisters')}>+ Add</Button>
              <Button variant="outline" className="text-xs" onClick={()=>removeLastSibling('sisters')}>Remove</Button>
            </div>
          </div>
          <div className="space-y-3">
            {(set.sisters || []).map((s, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-gray-900">Sister {idx + 1}</h5>
                  <Button variant="outline" className="text-xs" onClick={()=>removeSibling('sisters', idx)}>Remove</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="Full Name" value={s.fullName} onChange={(e)=>updateMember(`sisters.${idx}.fullName`, e.target.value)} />
                  <select className="w-full border rounded-lg p-2" value={s.maritalStatus||''} onChange={(e)=>updateMember(`sisters.${idx}.maritalStatus`, e.target.value as any)}>
                    <option value="">Marital Status</option>
                    {maritalOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                  <Input placeholder="Date of Birth (DD/MM/YYYY)" value={s.dateOfBirth||''} onChange={(e)=>updateMember(`sisters.${idx}.dateOfBirth`, e.target.value)} />
                  <select className="w-full border rounded-lg p-2" value={s.countryOfBirth||''} onChange={(e)=>updateMember(`sisters.${idx}.countryOfBirth`, e.target.value)}>
                    <option value="">Country of Birth</option>
                    {COUNTRIES.map((c:any)=> (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <Input className="md:col-span-2" placeholder="Present Address (if deceased: city/town, country and date)" value={s.presentAddress||''} onChange={(e)=>updateMember(`sisters.${idx}.presentAddress`, e.target.value)} />
                  <Input placeholder="Present Occupation" value={s.presentOccupation||''} onChange={(e)=>updateMember(`sisters.${idx}.presentOccupation`, e.target.value)} />
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </motion.div>
    );
  };
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  const isMarried = ['married', 'common_law'].includes(
    (profileData.personalDetails.maritalStatus || 'single') as string
  );
  const selectedChildrenCount = Math.max(0, Math.min(10, Number(profileData.personalDetails.childrenCount || 0)));
  const tabs = mode === 'familyOnly'
    ? [
        { id: 'familyInfoApplicant', label: 'Main Applicant Family Info', icon: User, color: 'bg-red-100' },
        ...(isMarried ? [{ id: 'familyInfoSpouse', label: 'Spouse Family Info', icon: User, color: 'bg-red-100' }] : []),
        ...(selectedChildrenCount > 0 ? [{ id: 'familyInfoChildren', label: 'Children Family Info', icon: User, color: 'bg-red-100' }] : []),
      ]
    : [
        { id: 'visaHistory', label: 'Visa History', icon: FileText, color: 'bg-red-500' },
        { id: 'personalDetails', label: 'Personal Details', icon: User, color: 'bg-red-450' },
        { id: 'languageAssessment', label: 'Language Assessment', icon: FileText, color: 'bg-red-450' },
        { id: 'educationalDetails', label: 'Educational Details', icon: GraduationCap, color: 'bg-red-400' },
        { id: 'employmentDetails', label: 'Employment Details', icon: Briefcase, color: 'bg-red-300' },
        { id: 'otherFactors', label: 'Other Factors', icon: FileText, color: 'bg-orange-200' },
        { id: 'travelHistory', label: 'Travel History', icon: Plane, color: 'bg-red-200' },
        { id: 'personalHistory', label: 'Personal History', icon: Home, color: 'bg-red-100' },
        ...(isMarried ? [{ id: 'spouse', label: 'Spouse/Partner', icon: User, color: 'bg-purple-200' }] : []),
        ...(isMarried && selectedChildrenCount > 0
          ? [{ id: 'children', label: 'Children', icon: User, color: 'bg-blue-100' }]
          : []),
      ];


  // Capitalization helpers (capitalize first non-space character; exclude emails/dates/numbers)
  const fieldsToCapitalize: Record<string, Set<string>> = {
    personalDetails: new Set([
      'firstName','lastName','nationality','passportNumber','phoneNumber'
    ]),
    educationalDetails: new Set(['highestEducation','institution','fieldOfStudy','additionalCertifications']),
    employmentDetails: new Set(['currentEmployer','jobTitle','jobDescription']),
    travelHistory: new Set(['country','purpose','visaType']),
    personalHistory: new Set(['address','city','country'])
  };

  const shouldCapitalize = (section: keyof ProfileData | string, field: string) => {
    if (field.toLowerCase() === 'email') return false;
    const set = fieldsToCapitalize[section as string];
    return set ? set.has(field) : false;
  };

  const capitalizeFirst = (value: string) => {
    if (!value) return value;
    const idx = value.search(/\S/);
    if (idx === -1) return value;
    return value.slice(0, idx) + value.charAt(idx).toUpperCase() + value.slice(idx + 1);
  };

  // Sanitize date/year fields to restrict year to 4 digits
  const sanitizeFieldValue = (field: string, value: string) => {
    if (!value) return value;
    // Graduation year or other year-only fields
    if (/year/i.test(field) && !/date/i.test(field)) {
      const onlyDigits = value.replace(/\D/g, '');
      return onlyDigits.slice(0, 4);
    }
    // UCI number: allow ####-#### (8 digits) or ##-####-#### (10 digits)
    if (field === 'uciNumber') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 8) {
        const d = digits.slice(0, 8);
        if (d.length < 8) return d; // intermediate typing
        return d.slice(0, 4) + '-' + d.slice(4, 8);
      } else {
        const d = digits.slice(0, 10);
        if (d.length < 10) return d; // intermediate typing
        return d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6, 10);
      }
    }
    // Application number: max 10, alphanumeric only
    if (field === 'applicationNumber') {
      const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      return cleaned;
    }
    // Date fields (YYYY-MM-DD)
    if (/date/i.test(field)) {
      const parts = value.split('-');
      if (parts.length > 0 && parts[0]) {
        parts[0] = parts[0].replace(/\D/g, '').slice(0, 4);
      }
      return parts.filter(Boolean).join('-');
    }
    return value;
  };

  const validateSection = (section: keyof ProfileData): boolean => {
    const sectionKeys = requiredFields[section as string] || [];
    const data = (profileData as any)[section] || {};
    const sectionErrors: Record<string, string> = {};
    for (const key of sectionKeys) {
      const value = data[key];
      if (!value || String(value).trim() === '') {
        sectionErrors[key] = 'This field is required';
      }
    }
    // Additional validation for visaHistory.canada entries
    if (section === 'visaHistory' && profileData.visaHistory?.canada?.hasAppliedBefore) {
      const entries = profileData.visaHistory.canada.entries || [];
      entries.forEach((entry, idx) => {
        // UCI validation: either ####-#### (8 digits) or ##-####-#### (10 digits)
        const uci = entry.uciNumber || '';
        const validUCI = /^\d{4}-\d{4}$/.test(uci) || /^\d{2}-\d{4}-\d{4}$/.test(uci);
        const onlyDigits = (uci.match(/\d/g) || []).join('');
        const invalidDigits = onlyDigits.length === 7 || onlyDigits.length === 9 || onlyDigits.length > 10;
        if (uci && (!validUCI || invalidDigits)) {
          sectionErrors[`uciNumber_${idx}`] = 'Invalid UCI format';
        }
        // Application numbers validation: each alphanumeric up to 10 chars
        (entry.applicationNumbers || []).forEach((app, aidx) => {
          const ok = /^[a-zA-Z0-9]{1,10}$/.test(app);
          if (!ok) {
            sectionErrors[`applicationNumber_${idx}_${aidx}`] = 'Invalid application number';
          }
        });
        if (entry.result === 'Rejected') {
          if (!entry.rejectionCount || entry.rejectionCount < 1 || entry.rejectionCount > 10) {
            sectionErrors[`rejectionCount_${idx}`] = 'Rejection count must be 1-10';
          }
        }
      });
    }
    setErrors(prev => ({ ...prev, [section as string]: sectionErrors }));
    return Object.keys(sectionErrors).length === 0;
  };

  const handleTabChange = (nextTabId: string) => {
    // Surface validation errors for current tab but do not block navigation
    const current = activeTab as keyof ProfileData;
    validateSection(current);
    setActiveTab(nextTabId);
  };

  // Explicit next navigation: validate + save, then move to next tab
  const handleNext = async () => {
    const current = activeTab as keyof ProfileData;
    // Run validation but do not block navigation; show errors inline
    validateSection(current);
    try {
      await handleSave();
    } catch (e) {
      // proceed even if save failed, we persist to localStorage in saveToAPI fallback
      console.warn('Proceeding to next tab despite save error:', e);
    }
    // After saving a tab, recompute and broadcast CRS once (single source of truth)
    try {
      const crsInputs = buildCrsInputsFromAssessment(profileData);
      if (crsInputs) {
        const breakdown = calculateCrsScore(crsInputs);
        window.dispatchEvent(new CustomEvent('crsUpdated', { detail: { score: breakdown.grandTotal, breakdown } }));
      }
    } catch {}
    setActiveTab(getNextTab());
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // API functions
  const saveToAPI = async (data: ProfileData): Promise<ProfileData> => {
    try {
      const url = data._id ? `${API_URL}/${data._id}` : API_URL;
      const method = data._id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          lastUpdated: new Date(),
          userId: user?._id || 'user123',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const savedData = json.data as ProfileData;
      console.log('✅ Data saved to API:', savedData);
      return savedData;
    } catch (error) {
      console.error('❌ Error saving to API:', error);
      
      // Fallback to localStorage if API fails
      localStorage.setItem('profileAssessmentData', JSON.stringify(data));
      console.log('💾 Fallback: Data saved to localStorage');
      
      throw error;
    }
  };

  const loadFromAPI = async (): Promise<ProfileData | null> => {
    try {
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('ℹ️ No existing profile found in API');
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      let data = json.data as ProfileData;
      // Merge locally saved fields that API may not persist (e.g., children)
      try {
        const local = localStorage.getItem('profileAssessmentData');
        if (local) {
          const localData = JSON.parse(local) as ProfileData;
          data = {
            ...data,
            personalDetails: {
              ...(data.personalDetails || ({} as any)),
              childrenCount: (data.personalDetails as any)?.childrenCount ?? (localData.personalDetails as any)?.childrenCount ?? 0,
            } as any,
            children: (Array.isArray((data as any).children) && (data as any).children!.length > 0)
              ? (data as any).children
              : (localData as any).children || [],
          } as any;
        }
      } catch {}
      console.log('✅ Loaded data from API (merged with local if needed):', data);
      return data;
    } catch (error) {
      console.error('❌ Error loading from API:', error);
      
      // Fallback to localStorage
      const savedData = localStorage.getItem('profileAssessmentData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('💾 Fallback: Loaded data from localStorage');
        return parsedData;
      }
      
      return null;
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        console.log('🔄 Loading saved profile data...');
        setIsLoading(true);
        
        if (!token) {
          console.log('⏳ Waiting for auth token before loading profile...');
          return;
        }

        const savedData = await loadFromAPI();
        
        if (savedData) {
          setProfileData(savedData);
          console.log('✅ Loaded saved profile data:', savedData);
        } else {
          console.log('ℹ️ No saved data found, starting fresh');
        }
      } catch (error) {
        console.error('❌ Error loading saved data:', error);
        setSaveStatus('error');
      } finally {
        setIsDataLoaded(true);
        setIsLoading(false);
      }
    };

    loadSavedData();
  }, [token]);

  // Disable auto-save on tab switch; saving happens explicitly on Next or Save button

  // Disable background auto-save: no-op placeholder to keep calls harmless
  const debouncedSave = useMemo(() => {
    return () => {};
  }, []);

  // Phone fields (country code + local number)
  const [phoneCode, setPhoneCode] = useState<string>('');
  const [phoneLocal, setPhoneLocal] = useState<string>('');

  // Parse combined value from stored phone number (keep code independent)
  useEffect(() => {
    const raw = (profileData.personalDetails?.phoneNumber || '').trim();
    const compact = raw.replace(/[^+\d]/g, '');
    if (!compact) {
      if (phoneCode !== '') setPhoneCode('');
      if (phoneLocal !== '') setPhoneLocal('');
      return;
    }
    const digits = compact.replace(/^\+/, '');
    if (phoneCode) {
      // Trust current code length; take last up to 10 digits as local
      const derivedLocal = digits.slice(phoneCode.length, phoneCode.length + 10);
      if (derivedLocal !== phoneLocal) setPhoneLocal(derivedLocal);
    } else {
      // Derive by keeping last 10 digits as local, the rest (0-3) as code
      const localLen = Math.min(10, digits.length);
      const codeLen = Math.max(0, Math.min(3, digits.length - localLen));
      const derivedCode = digits.slice(0, codeLen);
      const derivedLocal = digits.slice(codeLen, codeLen + 10);
      if (derivedCode !== phoneCode) setPhoneCode(derivedCode);
      if (derivedLocal !== phoneLocal) setPhoneLocal(derivedLocal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData.personalDetails?.phoneNumber]);

  // Helpers to update language assessment safely with full defaults
  const getPrimaryDefaults = () => ({ testType: 'IELTS', testDate: '', listening: '' as number|'', reading: '' as number|'', writing: '' as number|'', speaking: '' as number|'' });
  const setLangPrimary = (partial: Partial<{ testType: any; testDate: string; listening: number|''; reading: number|''; writing: number|''; speaking: number|'' }>) => {
    setProfileData(prev => {
      const current = prev.languageAssessment?.primary || getPrimaryDefaults();
      const next = { ...current, ...partial };
      return { ...prev, languageAssessment: { ...(prev.languageAssessment || {}), primary: next } } as ProfileData;
    });
  };
  const ensureSecondary = () => ({ testType: 'IELTS', testDate: '', listening: '' as number|'', reading: '' as number|'', writing: '' as number|'', speaking: '' as number|'' });
  const setLangSecondary = (partial: Partial<{ testType: any; testDate: string; listening: number|''; reading: number|''; writing: number|''; speaking: number|'' }> | null) => {
    setProfileData(prev => {
      if (partial === null) {
        // remove secondary
        return { ...prev, languageAssessment: { primary: (prev.languageAssessment?.primary || getPrimaryDefaults()) } } as ProfileData;
      }
      const current = prev.languageAssessment?.secondary || ensureSecondary();
      const next = { ...current, ...partial };
      return { ...prev, languageAssessment: { ...(prev.languageAssessment || {}), primary: (prev.languageAssessment?.primary || getPrimaryDefaults()), secondary: next } } as ProfileData;
    });
  };

  // Language Assessment helpers (band dropdowns and language toggle)
  const IELTS_BANDS: number[] = Array.from({ length: 19 }, (_, i) => i * 0.5); // 0.0 .. 9.0
  const CELPIP_SCORES: number[] = Array.from({ length: 13 }, (_, i) => i); // 0 .. 12
  // TEF and TCF score presets chosen at range lower-bounds so CLB mapping is correct
  const TEF_OPTIONS: Record<'listening'|'reading'|'writing'|'speaking', Array<{ label: string; value: number }>> = {
    listening: [
      { label: 'NCLC 4 (145–180)', value: 145 },
      { label: 'NCLC 5 (181–216)', value: 181 },
      { label: 'NCLC 6 (217–248)', value: 217 },
      { label: 'NCLC 7 (249–279)', value: 249 },
      { label: 'NCLC 8 (280–297)', value: 280 },
      { label: 'NCLC 9 (298–315)', value: 298 },
      { label: 'NCLC 10+ (316–360)', value: 316 },
    ],
    reading: [
      { label: 'NCLC 4 (121–150)', value: 121 },
      { label: 'NCLC 5 (151–180)', value: 151 },
      { label: 'NCLC 6 (181–206)', value: 181 },
      { label: 'NCLC 7 (207–232)', value: 207 },
      { label: 'NCLC 8 (233–247)', value: 233 },
      { label: 'NCLC 9 (248–262)', value: 248 },
      { label: 'NCLC 10+ (263–300)', value: 263 },
    ],
    writing: [
      { label: 'NCLC 4 (181–225)', value: 181 },
      { label: 'NCLC 5 (226–270)', value: 226 },
      { label: 'NCLC 6 (271–309)', value: 271 },
      { label: 'NCLC 7 (310–348)', value: 310 },
      { label: 'NCLC 8 (349–370)', value: 349 },
      { label: 'NCLC 9 (371–392)', value: 371 },
      { label: 'NCLC 10+ (393–450)', value: 393 },
    ],
    speaking: [
      { label: 'NCLC 4 (181–225)', value: 181 },
      { label: 'NCLC 5 (226–270)', value: 226 },
      { label: 'NCLC 6 (271–309)', value: 271 },
      { label: 'NCLC 7 (310–348)', value: 310 },
      { label: 'NCLC 8 (349–370)', value: 349 },
      { label: 'NCLC 9 (371–392)', value: 371 },
      { label: 'NCLC 10+ (393–450)', value: 393 },
    ],
  };
  const TCF_OPTIONS: Record<'listening'|'reading'|'writing'|'speaking', Array<{ label: string; value: number }>> = {
    listening: [
      { label: 'NCLC 4 (369–397)', value: 369 },
      { label: 'NCLC 5 (398–457)', value: 398 },
      { label: 'NCLC 6 (458–502)', value: 458 },
      { label: 'NCLC 7 (503–522)', value: 503 },
      { label: 'NCLC 8 (523–548)', value: 523 },
      { label: 'NCLC 9 (549–699)', value: 549 },
      { label: 'NCLC 10+ (700+)', value: 700 },
    ],
    reading: [
      { label: 'NCLC 4 (375–405)', value: 375 },
      { label: 'NCLC 5 (406–452)', value: 406 },
      { label: 'NCLC 6 (453–498)', value: 453 },
      { label: 'NCLC 7 (499–523)', value: 499 },
      { label: 'NCLC 8 (524–548)', value: 524 },
      { label: 'NCLC 9 (549–699)', value: 549 },
      { label: 'NCLC 10+ (700+)', value: 700 },
    ],
    writing: [
      { label: 'NCLC 4 (6)', value: 6 },
      { label: 'NCLC 5 (7)', value: 7 },
      { label: 'NCLC 6 (8)', value: 8 },
      { label: 'NCLC 7 (9)', value: 9 },
      { label: 'NCLC 8 (10)', value: 10 },
      { label: 'NCLC 9 (11)', value: 11 },
      { label: 'NCLC 10+ (12–20)', value: 12 },
    ],
    speaking: [
      { label: 'NCLC 4 (6)', value: 6 },
      { label: 'NCLC 5 (7)', value: 7 },
      { label: 'NCLC 6 (8)', value: 8 },
      { label: 'NCLC 7 (9)', value: 9 },
      { label: 'NCLC 8 (10)', value: 10 },
      { label: 'NCLC 9 (11)', value: 11 },
      { label: 'NCLC 10+ (12–20)', value: 12 },
    ],
  };
  const getSkillOptionsFor = (testType: any, skill: 'listening'|'reading'|'writing'|'speaking'): Array<{label: string; value: number}> => {
    if (testType === 'IELTS') return IELTS_BANDS.map(b => ({ label: b.toFixed(1), value: b }));
    if (testType === 'CELPIP') return CELPIP_SCORES.map(s => ({ label: String(s), value: s }));
    if (testType === 'TEF') return TEF_OPTIONS[skill];
    if (testType === 'TCF') return TCF_OPTIONS[skill];
    return [];
  };
  const isPrimaryEnglish = (() => {
    const t = profileData.languageAssessment?.primary?.testType;
    return t === 'IELTS' || t === 'CELPIP';
  })();
  // const primaryTestOptions = isPrimaryEnglish ? ['IELTS', 'CELPIP'] : ['TEF', 'TCF'];

  // Manual save function
  const handleSave = async () => {
    if (!isDataLoaded || isLoading) return;
    if (!token || !isAuthenticated) {
      console.warn('❌ No auth token; skipping save');
      setSaveStatus('error');
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      // Precompute CRS from current assessment and include with save payload
      let payload: any = { ...profileData };
      try {
        const crsInputs = buildCrsInputsFromAssessment(profileData);
        if (crsInputs) {
          const breakdown = calculateCrsScore(crsInputs);
          payload = {
            ...payload,
            crs: {
              inputs: crsInputs,
              currentScore: breakdown.grandTotal,
              breakdown: {
                coreHumanCapital: breakdown.coreHumanCapital.total,
                spouseFactors: breakdown.spouseFactors.total,
                skillTransferability: breakdown.skillTransferability.total,
                additionalPoints: breakdown.additionalPoints.total,
              },
              lastUpdated: new Date().toISOString(),
            }
          };
        }
      } catch {}

      const savedData = await saveToAPI(payload);
      // Preserve client-only fields that backend may drop (e.g., children)
      const mergedAfterSave: ProfileData = {
        ...savedData,
        personalDetails: {
          ...(savedData.personalDetails || ({} as any)),
          childrenCount: (profileData.personalDetails as any)?.childrenCount ?? 0,
        } as any,
        children: (profileData as any).children || (savedData as any).children || [],
      } as any;
      setProfileData(mergedAfterSave);
      setSaveStatus('saved');
      // Compute CRS on explicit Save as well
      try {
        const crsInputs = buildCrsInputsFromAssessment(savedData);
        if (crsInputs) {
          const breakdown = calculateCrsScore(crsInputs);
          window.dispatchEvent(new CustomEvent('crsUpdated', { detail: { score: breakdown.grandTotal, breakdown } }));
        }
      } catch {}
      
      // Refresh sidebar progress
      refreshSidebarProgress();
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      console.error('❌ Error saving data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to refresh sidebar progress
  const refreshSidebarProgress = () => {
    // Dispatch a custom event to notify the sidebar to refresh
    const pct = calculateProgress();
    window.dispatchEvent(new CustomEvent('profileProgressUpdated', { 
      detail: { progress: Math.max(0, Math.min(100, pct)) } 
    }));
  };

  // Input change handler with auto-save
  const handleInputChange = (section: keyof ProfileData, field: string, value: string) => {
    const sanitized = sanitizeFieldValue(field, value);
    console.log(`🔄 Updating ${section}.${field} to:`, value);
    const finalValue = shouldCapitalize(section, field) ? capitalizeFirst(sanitized) : sanitized;
    setProfileData(prev => {
      const sectionData = prev[section] as any;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: field === 'childrenCount' ? Math.max(0, Math.min(10, Number(finalValue || 0))) : finalValue
        }
      };
    });
    
    try {
      const next = {
        ...profileData,
        [section]: {
          ...(profileData as any)[section],
          [field]: field === 'childrenCount' ? Math.max(0, Math.min(10, Number(finalValue || 0))) : finalValue,
        }
      } as ProfileData;
      localStorage.setItem('profileAssessmentData', JSON.stringify(next));
    } catch {}
    debouncedSave();
  };

  // Array management functions
  const addArrayItem = (section: keyof ProfileData, field: string) => {
    const defaultValues: Record<string, any> = {
      previousEmployers: { employer: '', jobTitle: '', startDate: '', endDate: '' },
      internationalVisits: { country: '', purpose: '', startDate: '', endDate: '', visaType: '' },
      residentialAddresses: { address: '', city: '', country: '', startDate: '', endDate: '' },
      educations: { level: '', institution: '', fieldOfStudy: '', graduationYear: '', gpa: '' }
    };

    setProfileData(prev => {
      const sectionData = prev[section] as any;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: [...(sectionData[field] || []), defaultValues[field]]
        }
      };
    });
    debouncedSave();
  };

  const removeArrayItem = (section: keyof ProfileData, field: string, index: number) => {
    setProfileData(prev => {
      const sectionData = prev[section] as any;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: (sectionData[field] || []).filter((_: any, i: number) => i !== index)
        }
      };
    });
    debouncedSave();
  };

  const updateArrayItem = (section: keyof ProfileData, field: string, index: number, fieldName: string, value: string) => {
    const sanitized = sanitizeFieldValue(fieldName, value);
    setProfileData(prev => {
      const sectionData = prev[section] as any;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: (sectionData[field] || []).map((item: any, i: number) => 
            i === index ? { ...item, [fieldName]: (shouldCapitalize(section, fieldName) ? capitalizeFirst(sanitized) : sanitized) } : item
          )
        }
      };
    });
    debouncedSave();
  };

  // Visa History helpers
  const toggleCanadaApplied = (hasApplied: boolean) => {
    setProfileData(prev => ({
      ...prev,
      visaHistory: {
        ...(prev.visaHistory || {}),
        canada: {
          ...(prev.visaHistory?.canada || { types: [], entries: [] }),
          hasAppliedBefore: hasApplied,
          // Preserve previous selections to avoid accidental loss; commit/remove on Save if needed
          types: (prev.visaHistory?.canada?.types || []),
          entries: (prev.visaHistory?.canada?.entries || []),
        }
      }
    }));
  };

  // Part B: Other countries helpers
  const otherCountries: Array<'USA'|'UK'|'Australia'|'New Zealand'> = ['USA','UK','Australia','New Zealand'];

  const toggleOtherApplied = (hasApplied: boolean) => {
    setProfileData(prev => ({
      ...prev,
      visaHistory: {
        ...(prev.visaHistory || {}),
        other: {
          ...(prev.visaHistory?.other || { countries: [], countryData: [] }),
          hasAppliedBefore: hasApplied,
          // Preserve previous selections to avoid accidental loss; commit/remove on Save if needed
          countries: (prev.visaHistory?.other?.countries || []),
          countryData: (prev.visaHistory?.other?.countryData || []),
        }
      }
    }));
  };

  const toggleOtherCountry = (country: 'USA'|'UK'|'Australia'|'New Zealand') => {
    setProfileData(prev => {
      const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
      const exists = other.countries.includes(country);
      const countries = exists ? other.countries.filter(c => c !== country) : [...other.countries, country];
      let countryData = (other.countryData || []).filter(cd => countries.includes(cd.country));
      countries.forEach(c => {
        if (!countryData.find(cd => cd.country === c)) {
          countryData.push({ country: c, types: [], entries: [] });
        }
      });
      return {
        ...prev,
        visaHistory: {
          ...(prev.visaHistory || {}),
          other: { ...other, countries, countryData }
        }
      };
    });
  };

  const toggleOtherVisaType = (country: 'USA'|'UK'|'Australia'|'New Zealand', visaType: string) => {
    setProfileData(prev => {
      const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
      const dataIdx = (other.countryData || []).findIndex(cd => cd.country === country);
      const cd = other.countryData[dataIdx] || { country, types: [], entries: [] };
      const exists = cd.types.includes(visaType);
      const types = exists ? cd.types.filter(t => t !== visaType) : [...cd.types, visaType];
      let entries = (cd.entries || []).filter(e => types.includes(e.visaType));
      types.forEach(t => {
        if (!entries.find(e => e.visaType === t)) entries.push({ country, visaType: t, result: '', uciNumber: '', applicationNumbers: [], documents: [] } as any);
      });
      const countryData = [...(other.countryData || [])];
      countryData[dataIdx] = { country, types, entries } as any;
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), other: { ...other, countryData } } };
    });
  };

  const updateOtherEntry = (country: 'USA'|'UK'|'Australia'|'New Zealand', visaType: string, field: string, value: any) => {
    setProfileData(prev => {
      const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
      const countryData = (other.countryData || []).map(cd => {
        if (cd.country !== country) return cd as any;
        const entries = (cd.entries || []).map(en => {
          if (en.visaType !== visaType) return en as any;
          let newValue = value;
          if (field === 'uciNumber') newValue = sanitizeFieldValue('uciNumber', String(value));
          return { ...(en as any), [field]: newValue };
        });
        return { ...(cd as any), entries };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), other: { ...other, countryData } } };
    });
  };

  const addOtherApplicationNumber = (country: 'USA'|'UK'|'Australia'|'New Zealand', visaType: string) => {
    setProfileData(prev => {
      const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
      const countryData = (other.countryData || []).map(cd => {
        if (cd.country !== country) return cd as any;
        const entries = (cd.entries || []).map(en => {
          if (en.visaType !== visaType) return en as any;
          const list = [...(en.applicationNumbers || [])];
          list.push('');
          return { ...(en as any), applicationNumbers: list };
        });
        return { ...(cd as any), entries };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), other: { ...other, countryData } } };
    });
  };

  const updateOtherApplicationNumber = (country: 'USA'|'UK'|'Australia'|'New Zealand', visaType: string, idx: number, value: string) => {
    setProfileData(prev => {
      const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
      const countryData = (other.countryData || []).map(cd => {
        if (cd.country !== country) return cd as any;
        const entries = (cd.entries || []).map(en => {
          if (en.visaType !== visaType) return en as any;
          const list = [...(en.applicationNumbers || [])];
          list[idx] = sanitizeFieldValue('applicationNumber', value);
          return { ...(en as any), applicationNumbers: list };
        });
        return { ...(cd as any), entries };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), other: { ...other, countryData } } };
    });
  };

  const removeOtherApplicationNumber = (country: 'USA'|'UK'|'Australia'|'New Zealand', visaType: string, idx: number) => {
    setProfileData(prev => {
      const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
      const countryData = (other.countryData || []).map(cd => {
        if (cd.country !== country) return cd as any;
        const entries = (cd.entries || []).map(en => {
          if (en.visaType !== visaType) return en as any;
          const list = (en.applicationNumbers || []).filter((_, i) => i !== idx);
          return { ...(en as any), applicationNumbers: list };
        });
        return { ...(cd as any), entries };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), other: { ...other, countryData } } };
    });
  };

  const toggleVisaType = (visaType: string) => {
    setProfileData(prev => {
      const canada = prev.visaHistory?.canada || { hasAppliedBefore: false, types: [], entries: [] };
      const exists = canada.types.includes(visaType);
      const types = exists ? canada.types.filter(t => t !== visaType) : [...canada.types, visaType];
      let entries = (canada.entries || []).filter(e => types.includes(e.visaType));
      // Ensure an entry exists for each selected type
      types.forEach(t => {
        if (!entries.find(e => e.visaType === t)) {
          entries.push({ visaType: t, result: '', uciNumber: '', applicationNumbers: [], documents: [] });
        }
      });
      return {
        ...prev,
        visaHistory: {
          ...(prev.visaHistory || {}),
          canada: {
            ...canada,
            types,
            entries
          }
        }
      };
    });
  };

  const updateVisaEntry = (visaType: string, field: string, value: any) => {
    setProfileData(prev => {
      const canada = prev.visaHistory?.canada || { hasAppliedBefore: false, types: [], entries: [] };
      const entries = (canada.entries || []).map(entry => {
        if (entry.visaType !== visaType) return entry as any;
        let newValue = value;
        if (field === 'uciNumber') newValue = sanitizeFieldValue('uciNumber', String(value));
        return { ...(entry as any), [field]: newValue };
      });
      return {
        ...prev,
        visaHistory: {
          ...(prev.visaHistory || {}),
          canada: { ...canada, entries }
        }
      };
    });
  };

  const addApplicationNumber = (visaType: string) => {
    setProfileData(prev => {
      const canada = prev.visaHistory?.canada || { hasAppliedBefore: false, types: [], entries: [] };
      const entries = (canada.entries || []).map(entry => {
        if (entry.visaType !== visaType) return entry as any;
        const list = [...(entry.applicationNumbers || [])];
        list.push('');
        return { ...(entry as any), applicationNumbers: list };
      });
      return {
        ...prev,
        visaHistory: { ...(prev.visaHistory || {}), canada: { ...canada, entries } }
      };
    });
  };

  const updateApplicationNumber = (visaType: string, idx: number, value: string) => {
    setProfileData(prev => {
      const canada = prev.visaHistory?.canada || { hasAppliedBefore: false, types: [], entries: [] };
      const entries = (canada.entries || []).map(entry => {
        if (entry.visaType !== visaType) return entry as any;
        const list = [...(entry.applicationNumbers || [])];
        const sanitized = sanitizeFieldValue('applicationNumber', value);
        list[idx] = sanitized;
        return { ...(entry as any), applicationNumbers: list };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), canada: { ...canada, entries } } };
    });
  };

  const removeApplicationNumber = (visaType: string, idx: number) => {
    setProfileData(prev => {
      const canada = prev.visaHistory?.canada || { hasAppliedBefore: false, types: [], entries: [] };
      const entries = (canada.entries || []).map(entry => {
        if (entry.visaType !== visaType) return entry as any;
        const list = (entry.applicationNumbers || []).filter((_, i) => i !== idx);
        return { ...(entry as any), applicationNumbers: list };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), canada: { ...canada, entries } } };
    });
  };

  const addVisaDocuments = async (visaType: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted = Array.from(files).filter(f => ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(f.type));
    const fileDatas = await Promise.all(accepted.map(file => new Promise<{ fileName: string; mimeType: string; size: number; data: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, size: file.size, data: String(reader.result).split(',')[1] || '' });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setProfileData(prev => {
      const canada = prev.visaHistory?.canada || { hasAppliedBefore: false, types: [], entries: [] };
      const entries = (canada.entries || []).map(entry => {
        if (entry.visaType !== visaType) return entry as any;
        const docs = [...(entry.documents as any[] || []), ...fileDatas];
        return { ...(entry as any), documents: docs };
      });
      return { ...prev, visaHistory: { ...(prev.visaHistory || {}), canada: { ...canada, entries } } };
    });
  };

  // Calculate completion percentage (mandatory fields only)
  const calculateProgress = (): number => {
    let completedFields = 0;
    let totalFields = 0;

    const countCompleted = (section: keyof typeof requiredFields) => {
      const keys = requiredFields[section] || [];
      const data = (profileData as any)[section] || {};
      totalFields += keys.length;
      completedFields += keys.reduce((sum, key) => {
        const v = data[key];
        return sum + (v !== undefined && String(v).trim() !== '' ? 1 : 0);
      }, 0);
    };

    countCompleted('personalDetails');
    countCompleted('educationalDetails');
    countCompleted('employmentDetails');

    const pct = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
    return Math.max(0, Math.min(100, pct));
  };

  const progress = calculateProgress();

  // Navigation functions
  const getNextTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    return tabs[currentIndex + 1]?.id || tabs[0].id;
  };

  const getPreviousTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    return tabs[currentIndex - 1]?.id || tabs[currentIndex - 1]?.id || tabs[0].id;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-red-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mb-4 shadow-md"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading your profile...</h2>
          <p className="text-gray-600">Connecting to API</p>
          {!isOnline && (
            <div className="flex items-center justify-center mt-4 text-orange-600">
              <WifiOff className="w-4 h-4 mr-2" />
              <span className="text-sm">You're offline - will sync when reconnected</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render form sections
  const renderPersonalDetails = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
          <Input
            value={profileData.personalDetails.firstName}
            onChange={(e) => handleInputChange('personalDetails', 'firstName', e.target.value)}
            placeholder="Enter first name"
            className={`w-full ${errors.personalDetails?.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
          <Input
            value={profileData.personalDetails.lastName}
            onChange={(e) => handleInputChange('personalDetails', 'lastName', e.target.value)}
            placeholder="Enter last name"
            className={`w-full ${errors.personalDetails?.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
          <select
            className={`w-full border rounded-lg p-2 ${errors.personalDetails?.gender ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={profileData.personalDetails.gender || ''}
            onChange={(e) => handleInputChange('personalDetails', 'gender', e.target.value)}
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
          <Input
            type="date"
            value={profileData.personalDetails.dateOfBirth}
            onChange={(e) => handleInputChange('personalDetails', 'dateOfBirth', e.target.value)}
            className={`w-full ${errors.personalDetails?.dateOfBirth ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
          <select
            className={`w-full border rounded-lg p-2 ${errors.personalDetails?.nationality ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={profileData.personalDetails.nationality}
            onChange={(e) => handleInputChange('personalDetails', 'nationality', e.target.value)}
          >
            <option value="">Select</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Country of Residence *</label>
          <select
            className={`w-full border rounded-lg p-2 ${errors.personalDetails?.countryOfResidence ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={profileData.personalDetails.countryOfResidence || ''}
            onChange={(e) => handleInputChange('personalDetails', 'countryOfResidence', e.target.value)}
          >
            <option value="">Select</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number *</label>
          <Input
            value={profileData.personalDetails.passportNumber}
            onChange={(e) => handleInputChange('personalDetails', 'passportNumber', e.target.value)}
            placeholder="Enter passport number"
            className={`w-full ${errors.personalDetails?.passportNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
          <div className="flex gap-2 items-center">
            <span className="px-2 py-2 bg-gray-100 border rounded-lg text-gray-700 select-none">+</span>
            <Input
              value={phoneCode}
              onChange={(e) => {
                const code = e.target.value.replace(/\D/g, '').slice(0,3);
                setPhoneCode(code);
                handleInputChange('personalDetails', 'phoneNumber', `+${code}${phoneLocal}`);
              }}
              placeholder="91"
              className="w-20"
            />
            <Input
              value={phoneLocal}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneLocal(digits);
                handleInputChange('personalDetails', 'phoneNumber', `+${phoneCode}${digits}`);
              }}
              placeholder="10‑digit number"
              className={`flex-1 ${errors.personalDetails?.phoneNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <Input
            type="email"
            value={profileData.personalDetails.email}
            onChange={(e) => handleInputChange('personalDetails', 'email', e.target.value)}
            placeholder="Enter email address"
            className={`w-full ${errors.personalDetails?.email ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status *</label>
          <select
            className="w-full border rounded-lg p-2"
            value={profileData.personalDetails.maritalStatus || 'single'}
            onChange={(e) => handleInputChange('personalDetails', 'maritalStatus', e.target.value)}
          >
            <option value="">Select...</option>
            <option value="annulled">Annulled Marriage</option>
            <option value="common_law">Common-Law</option>
            <option value="divorced_separated">Divorced / Separated</option>
            <option value="legally_separated">Legally Separated</option>
            <option value="married">Married</option>
            <option value="single">Never Married / Single</option>
            <option value="widowed">Widowed</option>
          </select>
        </div>
        {['married','common_law'].includes((profileData.personalDetails.maritalStatus||'single') as string) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Children (0-10)</label>
            <select
              className="w-full border rounded-lg p-2"
              value={String(profileData.personalDetails.childrenCount ?? 0)}
              onChange={(e)=> handleInputChange('personalDetails','childrenCount', String(Math.max(0, Math.min(10, Number(e.target.value||0))))) }
            >
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderEducationalDetails = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Education</h3>
        <div className="text-sm text-gray-500">Please add education from highest to lower levels.</div>
        <Button
          onClick={() => addArrayItem('educationalDetails', 'educations')}
          className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
        >
          Add Education
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Highest Education Level *</label>
          <select
            className={`w-full border rounded-lg p-2 ${errors.educationalDetails?.highestEducation ? 'border-red-500 focus:ring-red-500' : ''}`}
            value={profileData.educationalDetails.highestEducation}
            onChange={(e) => handleInputChange('educationalDetails', 'highestEducation', e.target.value)}
          >
            <option value="">Select</option>
            <option value="LessThanSecondary">Less than secondary</option>
            <option value="Secondary">Secondary (high school)</option>
            <option value="OneYearPostSecondary">One-year post-secondary</option>
            <option value="TwoYearPostSecondary">Two-year post-secondary</option>
            <option value="BachelorsOr3Year">Bachelor's degree (or 3+ year)</option>
            <option value="TwoOrMoreCredentials">Two or more post-secondary credentials</option>
            <option value="Masters">Master's degree</option>
            <option value="ProfessionalDegree">Professional degree (MD, DDS, etc.)</option>
            <option value="Doctoral">Doctoral (PhD)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Institution *</label>
          <Input
            value={profileData.educationalDetails.institution}
            onChange={(e) => handleInputChange('educationalDetails', 'institution', e.target.value)}
            placeholder="Enter institution name"
            className={`w-full ${errors.educationalDetails?.institution ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study *</label>
          <Input
            value={profileData.educationalDetails.fieldOfStudy}
            onChange={(e) => handleInputChange('educationalDetails', 'fieldOfStudy', e.target.value)}
            placeholder="e.g., Computer Science, Business Administration"
            className={`w-full ${errors.educationalDetails?.fieldOfStudy ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year *</label>
          <Input
            type="number"
            value={profileData.educationalDetails.graduationYear}
            onChange={(e) => handleInputChange('educationalDetails', 'graduationYear', e.target.value)}
            placeholder="e.g., 2020"
            className={`w-full ${errors.educationalDetails?.graduationYear ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">GPA (if applicable)</label>
          <Input
            value={profileData.educationalDetails.gpa}
            onChange={(e) => handleInputChange('educationalDetails', 'gpa', e.target.value)}
            placeholder="e.g., 3.8/4.0"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Additional Certifications</label>
          <Input
            value={profileData.educationalDetails.additionalCertifications}
            onChange={(e) => handleInputChange('educationalDetails', 'additionalCertifications', e.target.value)}
            placeholder="e.g., PMP, AWS Certified"
            className="w-full"
          />
        </div>
      </div>

      {/* ECA Section (inline, like spouse sections) */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">ECA (Educational Credential Assessment)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ECA Completed?</label>
            <select
              className="w-full border rounded-lg p-2"
              value={profileData.educationalDetails.eca?.hasECA ? 'yes' : 'no'}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  educationalDetails: {
                    ...prev.educationalDetails,
                    eca: {
                      hasECA: e.target.value === 'yes',
                      organization: prev.educationalDetails.eca?.organization || '',
                      equivalency: prev.educationalDetails.eca?.equivalency,
                      date: prev.educationalDetails.eca?.date,
                      reportNumber: prev.educationalDetails.eca?.reportNumber,
                    },
                  },
                }))
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          {profileData.educationalDetails.eca?.hasECA && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ECA Organization</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={profileData.educationalDetails.eca?.organization || ''}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      educationalDetails: {
                        ...prev.educationalDetails,
                        eca: {
                          hasECA: true,
                          organization: e.target.value,
                          equivalency: prev.educationalDetails.eca?.equivalency,
                          date: prev.educationalDetails.eca?.date,
                          reportNumber: prev.educationalDetails.eca?.reportNumber,
                        },
                      },
                    }))
                  }
                >
                  <option value="">Select</option>
                  <option value="WES">World Education Services (WES)</option>
                  <option value="CES">Comparative Education Service (CES)</option>
                  <option value="ICAS">International Credential Assessment Service of Canada (ICAS)</option>
                  <option value="IQAS">International Qualifications Assessment Service (IQAS)</option>
                  <option value="ICES">International Credential Evaluation Service (ICES)</option>
                  <option value="BCIT">British Columbia Institute of Technology (BCIT)</option>
                  <option value="MCC">Medical Council of Canada (MCC)</option>
                  <option value="PEBC">Pharmacy Examining Board of Canada (PEBC)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Date</label>
                <Input
                  type="date"
                  value={profileData.educationalDetails.eca?.date || ''}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      educationalDetails: {
                        ...prev.educationalDetails,
                        eca: {
                          hasECA: true,
                          organization: prev.educationalDetails.eca?.organization || '',
                          equivalency: prev.educationalDetails.eca?.equivalency,
                          date: e.target.value,
                          reportNumber: prev.educationalDetails.eca?.reportNumber,
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Number</label>
                <Input
                  value={profileData.educationalDetails.eca?.reportNumber || ''}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      educationalDetails: {
                        ...prev.educationalDetails,
                        eca: {
                          hasECA: true,
                          organization: prev.educationalDetails.eca?.organization || '',
                          equivalency: prev.educationalDetails.eca?.equivalency,
                          date: prev.educationalDetails.eca?.date,
                          reportNumber: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="e.g., 1234567"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {Array.isArray(profileData.educationalDetails.educations) && profileData.educationalDetails.educations.map((edu, index) => (
        <Card key={index} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800">Education #{index + 1}</h4>
            <Button
              onClick={() => removeArrayItem('educationalDetails', 'educations', index)}
              variant="outline"
              size="sm"
              className="text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Remove
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Degree/Level" value={edu.level || ''} onChange={(e) => updateArrayItem('educationalDetails', 'educations', index, 'level', e.target.value)} />
            <Input placeholder="Institution" value={edu.institution || ''} onChange={(e) => updateArrayItem('educationalDetails', 'educations', index, 'institution', e.target.value)} />
            <Input placeholder="Field of Study" value={edu.fieldOfStudy || ''} onChange={(e) => updateArrayItem('educationalDetails', 'educations', index, 'fieldOfStudy', e.target.value)} />
            <Input type="number" placeholder="Graduation Year" value={edu.graduationYear || ''} onChange={(e) => updateArrayItem('educationalDetails', 'educations', index, 'graduationYear', e.target.value)} />
            <Input placeholder="GPA" value={edu.gpa || ''} onChange={(e) => updateArrayItem('educationalDetails', 'educations', index, 'gpa', e.target.value)} />
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ECA Completed?</label>
                <select className="w-full border rounded-lg p-2" value={edu.eca?.hasECA ? 'yes':'no'} onChange={(e)=> updateArrayItem('educationalDetails','educations', index, 'eca', JSON.stringify({ ...(edu.eca||{}), hasECA: e.target.value==='yes' }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              {(edu.eca?.hasECA) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ECA Organization</label>
                    <select className="w-full border rounded-lg p-2" value={edu.eca?.organization || ''} onChange={(e)=> updateArrayItem('educationalDetails','educations', index, 'eca', JSON.stringify({ ...(edu.eca||{}), organization: e.target.value }))}>
                      <option value="">Select</option>
                      <option value="WES">World Education Services (WES)</option>
                      <option value="CES">Comparative Education Service (CES)</option>
                      <option value="ICAS">International Credential Assessment Service of Canada (ICAS)</option>
                      <option value="IQAS">International Qualifications Assessment Service (IQAS)</option>
                      <option value="ICES">International Credential Evaluation Service (ICES)</option>
                      <option value="BCIT">British Columbia Institute of Technology (BCIT)</option>
                      <option value="MCC">Medical Council of Canada (MCC)</option>
                      <option value="PEBC">Pharmacy Examining Board of Canada (PEBC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Date</label>
                    <Input type="date" value={edu.eca?.date || ''} onChange={(e)=> updateArrayItem('educationalDetails','educations', index, 'eca', JSON.stringify({ ...(edu.eca||{}), date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Number</label>
                    <Input value={edu.eca?.reportNumber || ''} onChange={(e)=> updateArrayItem('educationalDetails','educations', index, 'eca', JSON.stringify({ ...(edu.eca||{}), reportNumber: e.target.value }))} placeholder="e.g., 1234567" />
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </motion.div>
  );

  const renderEmploymentDetails = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Current Employer *</label>
          <Input
            value={profileData.employmentDetails.currentEmployer}
            onChange={(e) => handleInputChange('employmentDetails', 'currentEmployer', e.target.value)}
            placeholder="Enter current employer name"
            className={`w-full ${errors.employmentDetails?.currentEmployer ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
          <Input
            value={profileData.employmentDetails.jobTitle}
            onChange={(e) => handleInputChange('employmentDetails', 'jobTitle', e.target.value)}
            placeholder="Enter job title"
            className={`w-full ${errors.employmentDetails?.jobTitle ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
          <Input
            type="date"
            value={profileData.employmentDetails.startDate}
            onChange={(e) => handleInputChange('employmentDetails', 'startDate', e.target.value)}
            className={`w-full ${errors.employmentDetails?.startDate ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date (if applicable)</label>
          <Input
            type="date"
            value={profileData.employmentDetails.endDate}
            onChange={(e) => handleInputChange('employmentDetails', 'endDate', e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
        <textarea
          value={profileData.employmentDetails.jobDescription}
          onChange={(e) => handleInputChange('employmentDetails', 'jobDescription', e.target.value)}
          placeholder="Describe your role and responsibilities"
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none ${errors.employmentDetails?.jobDescription ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-500'}`}
          rows={4}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Previous Employment</h3>
          <Button
            onClick={() => addArrayItem('employmentDetails', 'previousEmployers')}
            className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            Add Previous Job
          </Button>
        </div>
        
        {profileData.employmentDetails.previousEmployers.map((job, index) => (
          <Card key={index} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">Previous Job #{index + 1}</h4>
              <Button
                onClick={() => removeArrayItem('employmentDetails', 'previousEmployers', index)}
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Employer name"
                value={job.employer}
                onChange={(e) => updateArrayItem('employmentDetails', 'previousEmployers', index, 'employer', e.target.value)}
              />
              <Input
                placeholder="Job title"
                value={job.jobTitle}
                onChange={(e) => updateArrayItem('employmentDetails', 'previousEmployers', index, 'jobTitle', e.target.value)}
              />
              <Input
                type="date"
                placeholder="Start date"
                value={job.startDate}
                onChange={(e) => updateArrayItem('employmentDetails', 'previousEmployers', index, 'startDate', e.target.value)}
              />
              <Input
                type="date"
                placeholder="End date"
                value={job.endDate}
                onChange={(e) => updateArrayItem('employmentDetails', 'previousEmployers', index, 'endDate', e.target.value)}
              />
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );

  const renderTravelHistory = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">International Travel History</h3>
        <Button
          onClick={() => addArrayItem('travelHistory', 'internationalVisits')}
          className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
        >
          Add Visit
        </Button>
      </div>
      
      {profileData.travelHistory.internationalVisits.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Plane className="w-16 h-16 mx-auto mb-4 text-red-200" />
          <p className="text-lg font-medium mb-2">No international visits recorded yet.</p>
          <p className="text-sm">Click "Add Visit" to record your international travel history.</p>
        </div>
      ) : (
        profileData.travelHistory.internationalVisits.map((visit, index) => (
          <Card key={index} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">Visit #{index + 1}</h4>
              <Button
                onClick={() => removeArrayItem('travelHistory', 'internationalVisits', index)}
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Country visited"
                value={visit.country}
                onChange={(e) => updateArrayItem('travelHistory', 'internationalVisits', index, 'country', e.target.value)}
              />
              <Input
                placeholder="Purpose of visit"
                value={visit.purpose}
                onChange={(e) => updateArrayItem('travelHistory', 'internationalVisits', index, 'purpose', e.target.value)}
              />
              <Input
                type="date"
                placeholder="Start date"
                value={visit.startDate}
                onChange={(e) => updateArrayItem('travelHistory', 'internationalVisits', index, 'startDate', e.target.value)}
              />
              <Input
                type="date"
                placeholder="End date"
                value={visit.endDate}
                onChange={(e) => updateArrayItem('travelHistory', 'internationalVisits', index, 'endDate', e.target.value)}
              />
              <Input
                placeholder="Visa type"
                value={visit.visaType}
                onChange={(e) => updateArrayItem('travelHistory', 'internationalVisits', index, 'visaType', e.target.value)}
              />
            </div>
          </Card>
        ))
      )}
    </motion.div>
  );

  const renderPersonalHistory = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Residential Addresses (Last 10 Years)</h3>
        <Button
          onClick={() => addArrayItem('personalHistory', 'residentialAddresses')}
          className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
        >
          Add Address
        </Button>
      </div>
      
      {profileData.personalHistory.residentialAddresses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Home className="w-16 h-16 mx-auto mb-4 text-red-200" />
          <p className="text-lg font-medium mb-2">No residential addresses recorded yet.</p>
          <p className="text-sm">Click "Add Address" to record your residential history for the last 10 years.</p>
        </div>
      ) : (
        profileData.personalHistory.residentialAddresses.map((address, index) => (
          <Card key={index} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">Address #{index + 1}</h4>
              <Button
                onClick={() => removeArrayItem('personalHistory', 'residentialAddresses', index)}
                variant="outline"
                size="sm"
                className="text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Full address"
                  value={address.address}
                  onChange={(e) => updateArrayItem('personalHistory', 'residentialAddresses', index, 'address', e.target.value)}
                />
              </div>
              <Input
                placeholder="City"
                value={address.city}
                onChange={(e) => updateArrayItem('personalHistory', 'residentialAddresses', index, 'city', e.target.value)}
              />
              <Input
                placeholder="Country"
                value={address.country}
                onChange={(e) => updateArrayItem('personalHistory', 'residentialAddresses', index, 'country', e.target.value)}
              />
              <Input
                type="date"
                placeholder="Start date"
                value={address.startDate}
                onChange={(e) => updateArrayItem('personalHistory', 'residentialAddresses', index, 'startDate', e.target.value)}
              />
              <Input
                type="date"
                placeholder="End date"
                value={address.endDate}
                onChange={(e) => updateArrayItem('personalHistory', 'residentialAddresses', index, 'endDate', e.target.value)}
              />
            </div>
          </Card>
        ))
      )}
    </motion.div>
  );

  const visaTypes = ['Visitor Visa', 'Study Visa', 'Work Visa', 'TRV', 'Others'];

  const renderSpouse = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
      {/* 1) Spouse / Partner Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Spouse / Partner Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <Input value={profileData.spouse?.firstName || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), firstName: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
            <Input value={profileData.spouse?.lastName || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), lastName: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
            <select className="w-full border rounded-lg p-2" value={profileData.spouse?.gender || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), gender: e.target.value } }))}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
            <Input type="date" value={profileData.spouse?.dateOfBirth || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), dateOfBirth: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nationality *</label>
            <select className="w-full border rounded-lg p-2" value={profileData.spouse?.nationality || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), nationality: e.target.value } }))}>
              <option value="">Select</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Country of Residence *</label>
            <select className="w-full border rounded-lg p-2" value={profileData.spouse?.countryOfResidence || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), countryOfResidence: e.target.value } }))}>
              <option value="">Select</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number *</label>
            <Input value={profileData.spouse?.passportNumber || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), passportNumber: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
            <Input value={profileData.spouse?.phoneNumber || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), phoneNumber: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <Input type="email" value={profileData.spouse?.email || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), email: e.target.value } }))} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!profileData.spouse?.sameAddress} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), sameAddress: e.target.checked } }))} /> Use same address as Personal Information
            </label>
          </div>
          {!profileData.spouse?.sameAddress && (
            <>
              <Input placeholder="Address" value={profileData.spouse?.address?.address || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), address: { ...((prev.spouse?.address)||{}), address: e.target.value } } }))} />
              <Input placeholder="City" value={profileData.spouse?.address?.city || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), address: { ...((prev.spouse?.address)||{}), city: e.target.value } } }))} />
              <Input placeholder="Country" value={profileData.spouse?.address?.country || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), address: { ...((prev.spouse?.address)||{}), country: e.target.value } } }))} />
            </>
          )}
        </div>
      </div>

      {/* 2) Spouse Education with Add button */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Spouse Education</h4>
          <Button size="sm" variant="outline" onClick={()=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), educations: [ ...((prev.spouse?.educations)||[]), { level: '', institution: '', fieldOfStudy: '', graduationYear: '' } ] } }))}>Add</Button>
        </div>
        {(profileData.spouse?.educations||[]).map((se, idx)=> (
          <Card key={idx} className="p-4 mb-3 border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Education #{idx+1}</span>
              <Button size="sm" variant="outline" onClick={()=> setProfileData(prev=> { const list=[...((prev.spouse?.educations)||[])]; list.splice(idx,1); return { ...prev, spouse: { ...(prev.spouse||{}), educations: list.length>0 ? list : [ { level: '', institution: '', fieldOfStudy: '', graduationYear: '' } ] } }; })}>Remove</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Level" value={se.level} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.educations)||[])]; list[idx] = { ...list[idx], level: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), educations: list } }; })} />
              <Input placeholder="Institution" value={se.institution} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.educations)||[])]; list[idx] = { ...list[idx], institution: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), educations: list } }; })} />
              <Input placeholder="Field of Study" value={se.fieldOfStudy} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.educations)||[])]; list[idx] = { ...list[idx], fieldOfStudy: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), educations: list } }; })} />
              <Input placeholder="Graduation Year" value={se.graduationYear} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.educations)||[])]; list[idx] = { ...list[idx], graduationYear: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), educations: list } }; })} />
            </div>
          </Card>
        ))}
      </div>

      {/* 3) Language Proficiency Section */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Language Proficiency</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language Test</label>
            <select className="w-full border rounded-lg p-2" value={profileData.spouse?.language?.testType || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), language: { ...(prev.spouse?.language||{}), testType: e.target.value as any } } }))}>
              <option value="">Select</option>
              <option value="IELTS">IELTS</option>
              <option value="CELPIP">CELPIP</option>
              <option value="TEF">TEF</option>
              <option value="TCF">TCF</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Attempt Date</label>
            <Input type="date" value={profileData.spouse?.language?.testDate || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), language: { ...(prev.spouse?.language||{}), testDate: e.target.value } } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Report Number</label>
            <Input value={profileData.spouse?.language?.reportNumber || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), language: { ...(prev.spouse?.language||{}), reportNumber: e.target.value } } }))} placeholder="e.g., TRF/CLPIP ref" />
          </div>
          {(['listening','reading','writing','speaking'] as const).map((s)=> (
            <div key={s}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{s}</label>
              <Input type="number" step="0.5" value={(profileData.spouse?.language as any)?.[s] ?? ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), language: { ...(prev.spouse?.language||{}), [s]: e.target.value === '' ? '' : Number(e.target.value) } } }))} />
            </div>
          ))}
        </div>
      </div>

      {/* 4) ECA Related info */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">ECA Related Info</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ECA</label>
            <select className="w-full border rounded-lg p-2" value={profileData.spouse?.eca?.hasECA ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), eca: { hasECA: e.target.value==='yes', organization: prev.spouse?.eca?.organization || '', equivalency: prev.spouse?.eca?.equivalency, date: prev.spouse?.eca?.date, reportNumber: prev.spouse?.eca?.reportNumber } } }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {profileData.spouse?.eca?.hasECA && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ECA Organization</label>
                <select className="w-full border rounded-lg p-2" value={profileData.spouse?.eca?.organization || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), eca: { hasECA: true, organization: e.target.value, equivalency: prev.spouse?.eca?.equivalency, date: prev.spouse?.eca?.date, reportNumber: prev.spouse?.eca?.reportNumber } } }))}>
                  <option value="">Select</option>
                  <option value="WES">World Education Services (WES)</option>
                  <option value="CES">Comparative Education Service (CES)</option>
                  <option value="ICAS">International Credential Assessment Service of Canada (ICAS)</option>
                  <option value="IQAS">International Qualifications Assessment Service (IQAS)</option>
                  <option value="ICES">International Credential Evaluation Service (ICES)</option>
                  <option value="BCIT">British Columbia Institute of Technology (BCIT)</option>
                  <option value="MCC">Medical Council of Canada (MCC)</option>
                  <option value="PEBC">Pharmacy Examining Board of Canada (PEBC)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Date</label>
                <Input type="date" value={profileData.spouse?.eca?.date || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), eca: { hasECA: true, organization: prev.spouse?.eca?.organization || '', equivalency: prev.spouse?.eca?.equivalency, date: e.target.value, reportNumber: prev.spouse?.eca?.reportNumber } } }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Number</label>
                <Input value={profileData.spouse?.eca?.reportNumber || ''} onChange={(e)=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), eca: { hasECA: true, organization: prev.spouse?.eca?.organization || '', equivalency: prev.spouse?.eca?.equivalency, date: prev.spouse?.eca?.date, reportNumber: e.target.value } } }))} placeholder="e.g., 1234567" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5) Employment Details (Add) */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Employment Details (if any)</h4>
          <Button size="sm" variant="outline" onClick={()=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), employment: [ ...((prev.spouse?.employment)||[]), { employer: '', jobTitle: '', startDate: '', isCurrent: false } ] } }))}>Add</Button>
        </div>
        {(profileData.spouse?.employment||[]).map((job, idx)=> (
          <Card key={idx} className="p-4 mb-3 border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Employment #{idx+1}</span>
              <Button size="sm" variant="outline" onClick={()=> setProfileData(prev=> { const list=[...((prev.spouse?.employment)||[])]; list.splice(idx,1); return { ...prev, spouse: { ...(prev.spouse||{}), employment: list.length>0 ? list : [ { employer: '', jobTitle: '', startDate: '', isCurrent: false } ] } }; })}>Remove</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Employer" value={job.employer} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.employment)||[])]; list[idx] = { ...list[idx], employer: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), employment: list } }; })} />
              <Input placeholder="Job Title" value={job.jobTitle} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.employment)||[])]; list[idx] = { ...list[idx], jobTitle: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), employment: list } }; })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <Input type="date" value={job.startDate} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.employment)||[])]; list[idx] = { ...list[idx], startDate: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), employment: list } }; })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={job.endDate || ''} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.employment)||[])]; list[idx] = { ...list[idx], endDate: e.target.value, isCurrent: false }; return { ...prev, spouse: { ...(prev.spouse||{}), employment: list } }; })} />
                  <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <input type="checkbox" checked={!!job.isCurrent} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.employment)||[])]; list[idx] = { ...list[idx], isCurrent: e.target.checked, endDate: e.target.checked ? '' : list[idx].endDate }; return { ...prev, spouse: { ...(prev.spouse||{}), employment: list } }; })} /> Till Now
                  </label>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 6) Spouse Visa History (same as main) */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Spouse Visa History (Canada)</h4>
        <div className="flex items-center space-x-4 mb-3">
          <label className="flex items-center space-x-2">
            <input type="radio" name="spouseCanadaApplied" checked={!!profileData.spouse?.visaHistory?.canada?.hasAppliedBefore} onChange={()=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), visaHistory: { canada: { ...(prev.spouse?.visaHistory?.canada||{ types: [], entries: [] }), hasAppliedBefore: true } } } }))} />
            <span>Yes</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="radio" name="spouseCanadaApplied" checked={!profileData.spouse?.visaHistory?.canada?.hasAppliedBefore} onChange={()=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), visaHistory: { canada: { ...(prev.spouse?.visaHistory?.canada||{ types: [], entries: [] }), hasAppliedBefore: false, types: [], entries: [] } } } }))} />
            <span>No</span>
          </label>
        </div>
        {profileData.spouse?.visaHistory?.canada?.hasAppliedBefore && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {visaTypes.map((t) => {
                const exists = !!profileData.spouse?.visaHistory?.canada?.types?.includes(t);
                return (
                  <label key={t} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-md p-3">
                    <input
                      type="checkbox"
                      checked={exists}
                      onChange={()=> setProfileData(prev=> { const canada = prev.spouse?.visaHistory?.canada || { hasAppliedBefore: true, types: [], entries: [] }; const types = exists ? canada.types.filter(x=>x!==t) : [...canada.types, t]; let entries = (canada.entries||[]).filter(e=> types.includes(e.visaType)); types.forEach(tv=> { if(!entries.find(e=>e.visaType===tv)) entries.push({ visaType: tv, result: '', uciNumber: '', applicationNumbers: [], documents: [] }); }); return { ...prev, spouse: { ...(prev.spouse||{}), visaHistory: { canada: { ...canada, types, entries } } } }; })} />
                    <span>{t}</span>
                  </label>
                );
              })}
            </div>
            {(profileData.spouse?.visaHistory?.canada?.entries||[]).map((entry, idx)=> (
              <Card key={idx} className="p-4 border border-gray-200 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                    <select className="w-full border rounded-lg p-2" value={entry.result || ''} onChange={(e)=> setProfileData(prev=> { const canada = prev.spouse?.visaHistory?.canada!; const ent = [...(canada.entries||[])]; ent[idx] = { ...ent[idx], result: e.target.value as any }; return { ...prev, spouse: { ...(prev.spouse||{}), visaHistory: { canada: { ...canada, entries: ent } } } }; })}>
                      <option value="">Select</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">UCI Number</label>
                    <Input value={entry.uciNumber || ''} onChange={(e)=> setProfileData(prev=> { const canada = prev.spouse?.visaHistory?.canada!; const ent = [...(canada.entries||[])]; ent[idx] = { ...ent[idx], uciNumber: sanitizeFieldValue('uciNumber', e.target.value) }; return { ...prev, spouse: { ...(prev.spouse||{}), visaHistory: { canada: { ...canada, entries: ent } } } }; })} placeholder="####-#### or ##-####-####" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 7) Spouse International Travel History */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Spouse International Travel History</h4>
          <Button size="sm" variant="outline" onClick={()=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), travelHistory: { internationalVisits: [ ...((prev.spouse?.travelHistory?.internationalVisits)||[]), { country: '', purpose: '', startDate: '', endDate: '', visaType: '' } ] } } }))}>Add Visit</Button>
        </div>
        {(profileData.spouse?.travelHistory?.internationalVisits||[]).map((v, idx)=> (
          <Card key={idx} className="p-4 mb-3 border border-gray-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Country" value={v.country} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.travelHistory?.internationalVisits)||[])]; list[idx] = { ...list[idx], country: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), travelHistory: { internationalVisits: list } } }; })} />
              <Input placeholder="Purpose" value={v.purpose} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.travelHistory?.internationalVisits)||[])]; list[idx] = { ...list[idx], purpose: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), travelHistory: { internationalVisits: list } } }; })} />
              <Input type="date" value={v.startDate} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.travelHistory?.internationalVisits)||[])]; list[idx] = { ...list[idx], startDate: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), travelHistory: { internationalVisits: list } } }; })} />
              <Input type="date" value={v.endDate} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.travelHistory?.internationalVisits)||[])]; list[idx] = { ...list[idx], endDate: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), travelHistory: { internationalVisits: list } } }; })} />
              <Input placeholder="Visa Type" value={v.visaType} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.travelHistory?.internationalVisits)||[])]; list[idx] = { ...list[idx], visaType: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), travelHistory: { internationalVisits: list } } }; })} />
            </div>
          </Card>
        ))}
      </div>

      {/* 8) Spouse Personal History (Addresses) */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Spouse Personal History (Last 10 Years)</h4>
          <Button size="sm" variant="outline" onClick={()=> setProfileData(prev=> ({ ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: [ ...((prev.spouse?.personalHistory?.residentialAddresses)||[]), { address: '', city: '', country: '', startDate: '', endDate: '', isCurrent: false, useSameCurrent: false } ] } } }))}>Add Address</Button>
        </div>
        {(profileData.spouse?.personalHistory?.residentialAddresses||[]).map((a, idx)=> (
          <Card key={idx} className="p-4 mb-3 border border-gray-200 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-xs md:col-span-2">
                <input type="checkbox" checked={!!a.useSameCurrent} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], useSameCurrent: e.target.checked, address: e.target.checked ? (prev.spouse?.address?.address||'') : list[idx].address, city: e.target.checked ? (prev.spouse?.address?.city||'') : list[idx].city, country: e.target.checked ? (prev.spouse?.address?.country||'') : list[idx].country }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} /> Use same current address
              </label>
              <Input placeholder="Full address" value={a.address} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], address: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} />
              <Input placeholder="City" value={a.city} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], city: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} />
              <Input placeholder="Country" value={a.country} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], country: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <Input type="date" value={a.startDate} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], startDate: e.target.value }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Till</label>
                <div className="flex items-center gap-2">
                  <Input type="date" value={a.endDate} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], endDate: e.target.value, isCurrent: false }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} />
                  <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <input type="checkbox" checked={!!a.isCurrent} onChange={(e)=> setProfileData(prev=> { const list=[...((prev.spouse?.personalHistory?.residentialAddresses)||[])]; list[idx] = { ...list[idx], isCurrent: e.target.checked, endDate: e.target.checked ? '' : list[idx].endDate }; return { ...prev, spouse: { ...(prev.spouse||{}), personalHistory: { residentialAddresses: list } } }; })} /> Till Now
                  </label>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );

  const renderOtherFactors = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Other CRS Factors</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm text-gray-700">Provincial Nomination</label>
          <select className="w-full border rounded-lg p-2" value={profileData.otherFactors?.provincialNomination ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, otherFactors: { ...(prev.otherFactors||{}), provincialNomination: e.target.value==='yes' } }))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Arranged Employment</label>
          <select className="w-full border rounded-lg p-2" value={profileData.otherFactors?.arrangedEmployment ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, otherFactors: { ...(prev.otherFactors||{}), arrangedEmployment: e.target.value==='yes' } }))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Canadian Study Experience</label>
          <select className="w-full border rounded-lg p-2" value={profileData.otherFactors?.canadianStudy ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, otherFactors: { ...(prev.otherFactors||{}), canadianStudy: e.target.value==='yes' } }))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Years of Canadian Study</label>
          <Input type="number" min={0} max={10} value={String(profileData.otherFactors?.canadianStudyYears || 0)} onChange={(e)=> setProfileData(prev=> ({ ...prev, otherFactors: { ...(prev.otherFactors||{}), canadianStudyYears: Number(e.target.value || 0) } }))} />
        </div>
        <div>
          <label className="text-sm text-gray-700">Sibling in Canada</label>
          <select className="w-full border rounded-lg p-2" value={profileData.otherFactors?.siblingsInCanada ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, otherFactors: { ...(prev.otherFactors||{}), siblingsInCanada: e.target.value==='yes' } }))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">French Bonus Eligible</label>
          <select className="w-full border rounded-lg p-2" value={profileData.otherFactors?.frenchBonusEligible ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, otherFactors: { ...(prev.otherFactors||{}), frenchBonusEligible: e.target.value==='yes' } }))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
      </div>
    </motion.div>
  );

  const renderVisaHistory = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Part A: Canadian Visa History</h3>
        <p className="text-sm text-gray-600 mb-4">Have you ever applied for any kind of Canadian Visa before?</p>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="canadaApplied"
              checked={!!profileData.visaHistory?.canada?.hasAppliedBefore}
              onChange={() => toggleCanadaApplied(true)}
            />
            <span>Yes</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="canadaApplied"
              checked={!profileData.visaHistory?.canada?.hasAppliedBefore}
              onChange={() => toggleCanadaApplied(false)}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      {profileData.visaHistory?.canada?.hasAppliedBefore && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Select Visa Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {visaTypes.map((t) => (
                <label key={t} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-md p-3">
                  <input
                    type="checkbox"
                    checked={!!profileData.visaHistory?.canada?.types.includes(t)}
                    onChange={() => toggleVisaType(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {(profileData.visaHistory?.canada?.entries || []).map((entry, idx) => (
            <Card key={entry.visaType} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg shadow-md">
              <h4 className="font-medium text-gray-800 mb-3">{entry.visaType}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={entry.result || ''}
                    onChange={(e) => updateVisaEntry(entry.visaType, 'result', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UCI Number</label>
                  <Input
                    placeholder="####-#### or ##-####-####"
                    value={entry.uciNumber || ''}
                    onChange={(e) => updateVisaEntry(entry.visaType, 'uciNumber', e.target.value)}
                    className={`w-full ${errors.visaHistory?.[`uciNumber_${idx}`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.visaHistory?.[`uciNumber_${idx}`] && (
                    <div className="text-red-600 text-xs mt-1">{errors.visaHistory?.[`uciNumber_${idx}`]}</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Application Numbers</label>
                  <Button size="sm" variant="outline" onClick={() => addApplicationNumber(entry.visaType)}>Add</Button>
                </div>
                {(entry.applicationNumbers || []).map((app, aidx) => (
                  <div key={aidx} className="flex items-center space-x-2 mb-2">
                    <Input
                      placeholder="Up to 10 alphanumeric"
                      value={app}
                      onChange={(e) => updateApplicationNumber(entry.visaType, aidx, e.target.value)}
                      className={`w-full ${errors.visaHistory?.[`applicationNumber_${idx}_${aidx}`] ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    <Button size="sm" variant="outline" onClick={() => removeApplicationNumber(entry.visaType, aidx)}>Remove</Button>
                  </div>
                ))}
              </div>

              {entry.result === 'Rejected' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Count</label>
                    <select
                      className="w-full border rounded-lg p-2"
                      value={entry.rejectionCount || 0}
                      onChange={(e) => updateVisaEntry(entry.visaType, 'rejectionCount', Number(e.target.value))}
                    >
                      <option value={0}>Select</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    {errors.visaHistory?.[`rejectionCount_${idx}`] && (
                      <div className="text-red-600 text-xs mt-1">{errors.visaHistory?.[`rejectionCount_${idx}`]}</div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (max 1000 words)</label>
                    <textarea
                      value={entry.rejectionReason || ''}
                      onChange={(e) => updateVisaEntry(entry.visaType, 'rejectionReason', e.target.value.slice(0, 8000))}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none border-gray-300 focus:ring-red-500"
                      rows={4}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents (PDF/JPG/PNG)</label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/jpg,image/png"
                  multiple
                  onChange={(e) => addVisaDocuments(entry.visaType, e.target.files)}
                />
                <div className="mt-2 text-sm text-gray-600">Uploaded: {(entry.documents || []).length} file(s)</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Part B: Other Visa History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Part B: Any Other Visa History</h3>
        <p className="text-sm text-gray-600 mb-4">Have you ever applied for any kind of Visa for USA / UK / Australia / New Zealand before?</p>
        <div className="flex items-center space-x-4 mb-3">
          <label className="flex items-center space-x-2">
            <input type="radio" name="otherApplied" checked={!!profileData.visaHistory?.other?.hasAppliedBefore} onChange={() => toggleOtherApplied(true)} />
            <span>Yes</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="radio" name="otherApplied" checked={!profileData.visaHistory?.other?.hasAppliedBefore} onChange={() => toggleOtherApplied(false)} />
            <span>No</span>
          </label>
        </div>

        {profileData.visaHistory?.other?.hasAppliedBefore && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Select Countries</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {otherCountries.map(c => (
                  <label key={c} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-md p-3">
                    <input type="checkbox" checked={!!profileData.visaHistory?.other?.countries.includes(c)} onChange={() => toggleOtherCountry(c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {(profileData.visaHistory?.other?.countryData || []).map(countryBlock => (
              <div key={countryBlock.country} className="space-y-4">
                <h4 className="font-semibold text-gray-800">{countryBlock.country}</h4>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Visa Types</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {visaTypes.map(t => (
                      <label key={`${countryBlock.country}-${t}`} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-md p-3">
                        <input type="checkbox" checked={!!countryBlock.types.includes(t)} onChange={() => toggleOtherVisaType(countryBlock.country as any, t)} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {(countryBlock.entries || []).map((entry) => (
                  <Card key={`${countryBlock.country}-${entry.visaType}`} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-3">{entry.visaType}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                        <select className="w-full border rounded-lg p-2" value={entry.result || ''} onChange={(e) => updateOtherEntry(countryBlock.country as any, entry.visaType, 'result', e.target.value)}>
                          <option value="">Select</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">UCI/Application ID</label>
                        <Input placeholder="####-#### or ##-####-####" value={entry.uciNumber || ''} onChange={(e) => updateOtherEntry(countryBlock.country as any, entry.visaType, 'uciNumber', e.target.value)} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Application Numbers</label>
                        <Button size="sm" variant="outline" onClick={() => addOtherApplicationNumber(countryBlock.country as any, entry.visaType)}>Add</Button>
                      </div>
                      {(entry.applicationNumbers || []).map((app, aidx) => (
                        <div key={aidx} className="flex items-center space-x-2 mb-2">
                          <Input placeholder="Up to 10 alphanumeric" value={app} onChange={(e) => updateOtherApplicationNumber(countryBlock.country as any, entry.visaType, aidx, e.target.value)} />
                          <Button size="sm" variant="outline" onClick={() => removeOtherApplicationNumber(countryBlock.country as any, entry.visaType, aidx)}>Remove</Button>
                        </div>
                      ))}
                    </div>

                    {entry.result === 'Rejected' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Count</label>
                          <select className="w-full border rounded-lg p-2" value={entry.rejectionCount || 0} onChange={(e) => updateOtherEntry(countryBlock.country as any, entry.visaType, 'rejectionCount', Number(e.target.value))}>
                            <option value={0}>Select</option>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description (max 1000 words)</label>
                          <textarea value={entry.rejectionReason || ''} onChange={(e) => updateOtherEntry(countryBlock.country as any, entry.visaType, 'rejectionReason', e.target.value.slice(0, 8000))} className="w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none border-gray-300 focus:ring-red-500" rows={4} />
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents (PDF/JPG/PNG)</label>
                      <input type="file" accept="application/pdf,image/jpeg,image/jpg,image/png" multiple onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;
                        // Reuse existing addVisaDocuments logic per country by mapping to our other structure
                        (async () => {
                          const accepted = Array.from(files).filter(f => ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(f.type));
                          const fileDatas = await Promise.all(accepted.map(file => new Promise<{ fileName: string; mimeType: string; size: number; data: string }>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve({ fileName: file.name, mimeType: file.type, size: file.size, data: String(reader.result).split(',')[1] || '' });
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          })));
                          setProfileData(prev => {
                            const other = prev.visaHistory?.other || { hasAppliedBefore: false, countries: [], countryData: [] };
                            const countryData = (other.countryData || []).map(cd => {
                              if (cd.country !== countryBlock.country) return cd as any;
                              const entries = (cd.entries || []).map(en => {
                                if (en.visaType !== entry.visaType) return en as any;
                                const docs = [...(en.documents as any[] || []), ...fileDatas];
                                return { ...(en as any), documents: docs };
                              });
                              return { ...(cd as any), entries };
                            });
                            return { ...prev, visaHistory: { ...(prev.visaHistory || {}), other: { ...other, countryData } } };
                          });
                        })();
                      }} />
                      <div className="mt-2 text-sm text-gray-600">Uploaded: {(entry.documents || []).length} file(s)</div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personalDetails':
        return renderPersonalDetails();
      case 'languageAssessment':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Language Assessment</h3>

            {/* Language Selection: English / French with right-aligned Add second language */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="primaryLanguage"
                  checked={isPrimaryEnglish}
                  onChange={() => {
                    // switch to English default (IELTS)
                    setLangPrimary({ testType: 'IELTS' as any });
                  }}
                />
                English
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="primaryLanguage"
                  checked={!isPrimaryEnglish}
                  onChange={() => {
                    // switch to French default (TEF)
                    setLangPrimary({ testType: 'TEF' as any });
                  }}
                />
                French
              </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!profileData.languageAssessment?.secondary}
                  onChange={(e) => (e.target.checked ? setLangSecondary({ testType: isPrimaryEnglish ? 'TEF' as any : 'IELTS' as any }) : setLangSecondary(null))}
                />
                Add second language
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type *</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={profileData.languageAssessment?.primary.testType || 'IELTS'}
                  onChange={(e) => setLangPrimary({ testType: e.target.value as any })}
                >
                  {(isPrimaryEnglish ? ['IELTS','CELPIP'] : ['TEF','TCF']).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                <Input type="date" value={profileData.languageAssessment?.primary.testDate || ''} onChange={(e)=> setLangPrimary({ testDate: e.target.value })} />
              </div>
            </div>

            {/* Skills with band dropdowns and CLB display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(['listening','reading','writing','speaking'] as const).map((s)=> (
                <div key={s} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{s.charAt(0).toUpperCase()+s.slice(1)} (Band)</label>
                  <select
                    className="w-full border rounded-lg p-2"
                    value={String((profileData.languageAssessment?.primary as any)?.[s] ?? '')}
                    onChange={(e)=> {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setLangPrimary({ [s]: val } as any);
                    }}
                  >
                    <option value="">Select</option>
                    {getSkillOptionsFor(profileData.languageAssessment?.primary.testType, s).map(opt => (
                      <option key={`${s}-${opt.label}`} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {/* CLB read-only next to each */}
                  <div className="text-xs text-gray-600">CLB Level: {
                    (() => {
                      const p = profileData.languageAssessment?.primary as any;
                      if (!p) return '';
                      const clb = convertToClb(p.testType as any, {
                        reading: Number(p.reading || 0),
                        writing: Number(p.writing || 0),
                        listening: Number(p.listening || 0),
                        speaking: Number(p.speaking || 0)
                      });
                      const key = s === 'reading' ? 'R' : s === 'writing' ? 'W' : s === 'listening' ? 'L' : 'S';
                      return (clb as any)[key];
                    })()
                  }</div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200">
              {/* Toggle moved to header */}
              {profileData.languageAssessment?.secondary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                    <select className="w-full border rounded-lg p-2" value={profileData.languageAssessment?.secondary?.testType || (isPrimaryEnglish ? 'TEF' : 'IELTS')} onChange={(e)=> setLangSecondary({ testType: e.target.value as any })}>
                      {(isPrimaryEnglish ? ['TEF','TCF'] : ['IELTS','CELPIP']).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                    <Input type="date" value={profileData.languageAssessment?.secondary?.testDate || ''} onChange={(e)=> setLangSecondary({ testDate: e.target.value })} />
                  </div>
                  {(['listening','reading','writing','speaking'] as const).map((s)=> (
                    <div key={s} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">{s.charAt(0).toUpperCase()+s.slice(1)} (Band)</label>
                      <select
                        className="w-full border rounded-lg p-2"
                        value={String((profileData.languageAssessment?.secondary as any)?.[s] ?? '')}
                        onChange={(e)=> setLangSecondary({ [s]: e.target.value === '' ? '' : Number(e.target.value) } as any)}
                      >
                        <option value="">Select</option>
                        {getSkillOptionsFor(profileData.languageAssessment?.secondary?.testType, s).map(opt => (
                          <option key={`${s}-${opt.label}`} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="text-xs text-gray-600">CLB Level: {
                        (() => {
                          const p = profileData.languageAssessment?.secondary as any;
                          if (!p) return '';
                          const clb = convertToClb(p.testType as any, {
                            reading: Number(p.reading || 0),
                            writing: Number(p.writing || 0),
                            listening: Number(p.listening || 0),
                            speaking: Number(p.speaking || 0)
                          });
                          const key = s === 'reading' ? 'R' : s === 'writing' ? 'W' : s === 'listening' ? 'L' : 'S';
                          return (clb as any)[key];
                        })()
                      }</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      case 'educationalDetails':
        return renderEducationalDetails();
      case 'employmentDetails':
        return (
          <div>
            {renderEmploymentDetails()}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-700">Current job in Canada?</label>
                <select className="w-full border rounded-lg p-2" value={profileData.employmentDetails.isCanadian ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, employmentDetails: { ...prev.employmentDetails, isCanadian: e.target.value==='yes' } }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-700">Full-time?</label>
                <select className="w-full border rounded-lg p-2" value={profileData.employmentDetails.fullTime ? 'yes':'no'} onChange={(e)=> setProfileData(prev=> ({ ...prev, employmentDetails: { ...prev.employmentDetails, fullTime: e.target.value==='yes' } }))}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-700">Total years (auto)</label>
                <Input readOnly value={String(profileData.employmentDetails.totalYearsAuto || 0)} />
              </div>
            </div>
          </div>
        );
      case 'travelHistory':
        return renderTravelHistory();
      case 'personalHistory':
        return renderPersonalHistory();
      case 'spouse':
        return renderSpouse();
      case 'children':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Children</h3>
              <Button onClick={() => {
                setProfileData(prev => ({
                  ...prev,
                  personalDetails: { ...prev.personalDetails, childrenCount: Math.min(10, Number(prev.personalDetails.childrenCount || 0) + 1) },
                }));
              }} className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300">+ Add</Button>
            </div>

            {selectedChildrenCount === 0 && (
              <div className="text-sm text-gray-600">No children added yet.</div>
            )}

            {Array.from({ length: selectedChildrenCount }, (_, index) => index).map((idx) => {
              const child = (profileData.children && profileData.children[idx]) || { firstName: '', lastName: '', dateOfBirth: '', sex: '', educationLevel: '', sameAddress: true, address: { address: '', city: '', country: '' } };
              return (
              <Card key={idx} className="p-4 mb-4 border border-gray-200 bg-white rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="First Name" value={(child as any).firstName || ''} onChange={(e)=> {
                    setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), firstName: e.target.value } as any; return { ...prev, children: list }; });
                  }} />
                  <Input placeholder="Last Name" value={(child as any).lastName || ''} onChange={(e)=> {
                    setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), lastName: e.target.value } as any; return { ...prev, children: list }; });
                  }} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <Input type="date" value={child.dateOfBirth} onChange={(e)=> {
                      setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), dateOfBirth: e.target.value } as any; return { ...prev, children: list }; });
                    }} />
                    {child.dateOfBirth && (
                      <div className="text-xs text-gray-600 mt-1">Age: {computeAge(child.dateOfBirth)}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                    <select className="w-full border rounded-lg p-2" value={child.sex} onChange={(e)=> {
                      setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), sex: e.target.value as any }; return { ...prev, children: list }; });
                    }}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
                    <Input value={child.educationLevel} onChange={(e)=> {
                      setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), educationLevel: e.target.value } as any; return { ...prev, children: list }; });
                    }} placeholder="e.g., Primary, Secondary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Birth Order</label>
                    <select className="w-full border rounded-lg p-2" value={(child as any).birthOrder || ''} onChange={(e)=> {
                      setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), birthOrder: e.target.value } as any; return { ...prev, children: list }; });
                    }}>
                      <option value="">Select</option>
                      {['First born','Second born','Third born','Fourth born','Fifth born','Sixth born','Seventh born','Eighth born','Ninth born','Tenth born'].map((label)=> (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!child.sameAddress} onChange={(e)=> {
                        setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), sameAddress: e.target.checked } as any; return { ...prev, children: list }; });
                      }} /> Use same address as Personal Information
                    </label>
                  </div>
                  {!child.sameAddress && (
                    <>
                      <Input placeholder="Child Address" value={child.address?.address||''} onChange={(e)=>{
                        setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), address: { ...((list[idx]||{} as any).address||{}), address: e.target.value } }; return { ...prev, children: list }; });
                      }} />
                      <Input placeholder="City" value={child.address?.city||''} onChange={(e)=>{
                        setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), address: { ...((list[idx]||{} as any).address||{}), city: e.target.value } }; return { ...prev, children: list }; });
                      }} />
                      <Input placeholder="Country" value={child.address?.country||''} onChange={(e)=>{
                        setProfileData(prev=>{ const list=[...(prev.children||[])]; list[idx] = { ...(list[idx]||{} as any), address: { ...((list[idx]||{} as any).address||{}), country: e.target.value } }; return { ...prev, children: list }; });
                      }} />
                    </>
                  )}
                </div>
              </Card>
            );})}
          </motion.div>
        );
      case 'otherFactors':
        return renderOtherFactors();
      case 'visaHistory':
        return renderVisaHistory();
      case 'familyInfoApplicant':
        return renderFamily('applicant');
      case 'familyInfoSpouse':
        return renderFamily('spouse');
      case 'familyInfoChildren':
        return renderFamily('children');
      default:
        return renderPersonalDetails();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile Assessment</h1>
              <p className="text-gray-600">Complete your immigration profile to unlock personalized recommendations</p>
            </div>
            
            {/* Progress Bar */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800 mb-2">{progress}%</div>
              <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-1000 delay-500 shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">Profile Complete</p>
            </div>
          </div>

          {/* Save Status & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Online/Offline Status */}
              <div className={`flex items-center ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
                {isOnline ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                <span className="text-sm">{isOnline ? 'Connected' : 'Offline'}</span>
              </div>

              {/* Save Status */}
              {saveStatus === 'saving' && (
                <div className="flex items-center text-gray-700">
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving to API...
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved successfully!
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center text-gray-700">
                  <Database className="w-4 h-4 mr-2" />
                  Save failed (saved locally)
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {import.meta.env.MODE === 'development' && (
                <Button
                  onClick={() => {
                    console.log('🔍 Current profile data:', profileData);
                    console.log('🔍 Progress:', progress + '%');
                    console.log('🔍 API ID:', profileData._id);
                  }}
                  variant="outline"
                  className="text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Debug Data
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Progress</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-red-500 text-white shadow-md transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs md:text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {renderTabContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={() => handleTabChange(getPreviousTab())}
              variant="outline"
              className="flex items-center shadow-md hover:shadow-lg transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="text-sm text-gray-500">
              Tab {tabs.findIndex(tab => tab.id === activeTab) + 1} of {tabs.length}
            </div>
            
            {activeTab !== tabs[tabs.length - 1].id ? (
              <Button
                onClick={handleNext}
                className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  await handleSave();
                  window.dispatchEvent(new CustomEvent('profileProgressUpdated', { detail: { progress: 100 } }));
                  window.location.href = '/dashboard';
                }}
                className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAssessment;

// Helper: Build CRS inputs from assessment
function buildCrsInputsFromAssessment(p: any): CrsInputs | null {
  if (!p) return null;
  const dob = p.personalDetails?.dateOfBirth;
  const age = dob ? computeAge(dob) : undefined;
  if (!age || age < 18 || age > 60) return null;

  const marital = (p.personalDetails?.maritalStatus || 'single') as 'single' | 'married' | 'common_law';
  const hasSpouse = marital !== 'single';

  // Education
  const highest = (p.educationalDetails?.highestEducation || '') as CrsInputs['education']['highest'];
  const ecaHas = !!p.educationalDetails?.eca?.hasECA;

  // Work years (basic heuristic): difference between start of first and end of last across all jobs
  let canadianYears = 0;
  let foreignYears = 0;
  const jobs: any[] = [
    { ...p.employmentDetails, isPrev: false },
    ...(p.employmentDetails?.previousEmployers || []).map((j: any) => ({ ...j, isPrev: true }))
  ];
  jobs.forEach((j) => {
    const s = j.startDate ? new Date(j.startDate) : null;
    const e = j.endDate ? new Date(j.endDate) : new Date();
    if (!s) return;
    const years = Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const isCanada = j.isCanadian || (j.country && /canada/i.test(j.country));
    if (isCanada) canadianYears += years; else foreignYears += years;
  });
  canadianYears = Math.min(5, Math.floor(canadianYears + 1e-6));
  foreignYears = Math.min(10, Math.floor(foreignYears + 1e-6));

  // Language primary
  const primary = p.languageAssessment?.primary;
  const langFirst = primary ? {
    testType: primary.testType,
    reading: Number(primary.reading || 0),
    listening: Number(primary.listening || 0),
    speaking: Number(primary.speaking || 0),
    writing: Number(primary.writing || 0),
    clb: convertToClb(primary.testType, {
      reading: Number(primary.reading || 0),
      listening: Number(primary.listening || 0),
      speaking: Number(primary.speaking || 0),
      writing: Number(primary.writing || 0),
    }),
  } : null;
  if (!langFirst) return null;

  const secondary = p.languageAssessment?.secondary;
  const langSecond = secondary ? {
    testType: secondary.testType,
    reading: Number(secondary.reading || 0),
    listening: Number(secondary.listening || 0),
    speaking: Number(secondary.speaking || 0),
    writing: Number(secondary.writing || 0),
    clb: convertToClb(secondary.testType, {
      reading: Number(secondary.reading || 0),
      listening: Number(secondary.listening || 0),
      speaking: Number(secondary.speaking || 0),
      writing: Number(secondary.writing || 0),
    }),
  } : undefined;

  const inputs: CrsInputs = {
    age,
    maritalStatus: marital,
    hasSpouse,
    numChildren: 0,
    languageProficiency: { first: langFirst as any, second: langSecond as any },
    education: { highest: (highest || 'Secondary') as any, eca: { hasECA: ecaHas, equivalency: p.educationalDetails?.eca?.equivalency, date: p.educationalDetails?.eca?.date, organization: p.educationalDetails?.eca?.organization } },
    workExperience: { canadianYears: Math.max(0, Math.min(5, Math.round(canadianYears))) as 0|1|2|3|4|5, foreignYears: Math.max(0, Math.min(10, Math.round(foreignYears))) as 0|1|2|3|4|5|6|7|8|9|10 },
    arrangedEmployment: !!p.otherFactors?.arrangedEmployment,
    provincialNomination: !!p.otherFactors?.provincialNomination,
    canadianStudy: p.otherFactors?.canadianStudy ? ((p.otherFactors?.canadianStudyYears || 0) >= 2 ? 'twoPlusYears' : 'oneYear') : 'none',
    siblingsInCanada: !!p.otherFactors?.siblingsInCanada,
    frenchBonusEligible: !!p.otherFactors?.frenchBonusEligible,
  };

  if (hasSpouse) {
    const s = p.spouse || {};
    const sAge = s.dateOfBirth ? computeAge(s.dateOfBirth) : undefined;
    const sLang = s.language?.testType ? {
      testType: s.language.testType,
      reading: Number(s.language.reading || 0),
      listening: Number(s.language.listening || 0),
      speaking: Number(s.language.speaking || 0),
      writing: Number(s.language.writing || 0),
      clb: convertToClb(s.language.testType, {
        reading: Number(s.language.reading || 0),
        listening: Number(s.language.listening || 0),
        speaking: Number(s.language.speaking || 0),
        writing: Number(s.language.writing || 0),
      }),
    } : undefined;
    inputs.spouse = {
      age: sAge || 25,
      education: ((s.educationLevel || 'Secondary') as any),
      language: sLang as any,
      canadianYears: Math.min(5, Number(s.canadianYears || 0)) as any,
    } as any;
  }

  return inputs;
}

function computeAge(dateString: string): number {
  const dob = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
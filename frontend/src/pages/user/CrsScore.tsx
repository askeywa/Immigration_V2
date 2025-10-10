// CRS Score Main Page
// Path: frontend/src/pages/user/CrsScore.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, FileText } from 'lucide-react';
import { CrsBreakdownChart } from '@/components/crs/CrsBreakdownChart';
import { Calculator, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { CrsScoreCard } from '@/components/crs/CrsScoreCard';
// Breakdown chart removed
import { CrsDetailedGrid } from '@/components/crs/CrsDetailedGrid';
import { useAuthStore } from '@/store/authStore';
import { CrsInputs, CrsBreakdown, CrsHistoryEntry } from '@/types/crs';
import { calculateCrsScore, getDefaultCrsInputs } from '@/utils/crs';
import { motion } from 'framer-motion';
import { formatDateDDMMYYYY } from '@/utils/date';

interface Profile {
  _id: string;
  userId: string;
  crs?: {
    inputs: CrsInputs;
    currentScore: number;
    breakdown: Record<string, any>;
    history: CrsHistoryEntry[];
    lastUpdated: string;
  };
  lastUpdated: string;
}

export const CrsScore: React.FC = () => {
  const { token } = useAuthStore();
  
  // State management
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crsInputs, setCrsInputs] = useState<CrsInputs>(getDefaultCrsInputs());
  const [crsBreakdown, setCrsBreakdown] = useState<CrsBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Tabs removed (we'll show sections inline without titles)

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const isDemoDefaults = (inputs: CrsInputs): boolean => {
    try {
      return (
        inputs.age === 25 &&
        inputs.maritalStatus === 'single' &&
        inputs.hasSpouse === false &&
        inputs.languageProficiency?.first?.testType === 'IELTS' &&
        inputs.languageProficiency.first.reading === 6 &&
        inputs.languageProficiency.first.writing === 6 &&
        inputs.languageProficiency.first.listening === 6 &&
        inputs.languageProficiency.first.speaking === 6 &&
        inputs.languageProficiency.first.clb?.R === 7 &&
        inputs.languageProficiency.first.clb?.W === 7 &&
        inputs.languageProficiency.first.clb?.L === 7 &&
        inputs.languageProficiency.first.clb?.S === 7 &&
        inputs.education?.highest === 'BachelorsOr3Year' &&
        !!inputs.education?.eca?.hasECA === true &&
        inputs.workExperience?.canadianYears === 1 &&
        inputs.workExperience?.foreignYears === 2 &&
        inputs.provincialNomination === false &&
        inputs.siblingsInCanada === false
      );
    } catch {
      return false;
    }
  };

  // Calculate CRS score whenever inputs change (no sidebar broadcast here).
  useEffect(() => {
    if (crsInputs) {
      const breakdown = calculateCrsScore(crsInputs);
      setCrsBreakdown(breakdown);
    }
  }, [crsInputs]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profiles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const json = await response.json();
        const profileData = json.data;
        setProfile(profileData);

        if (profileData?.crs?.inputs) {
          const saved: CrsInputs = profileData.crs.inputs;
          // If age is zero but DOB exists in profile, derive age
          const dob = (profileData as any)?.personalDetails?.dateOfBirth;
          const derivedAge = dob ? computeAge(dob) : 0;
          const normalized: CrsInputs = {
            ...saved,
            age: saved.age && saved.age > 0 ? saved.age : derivedAge,
          };
          if (isDemoDefaults(normalized)) {
            setCrsInputs(getDefaultCrsInputs());
          } else {
            setCrsInputs(normalized);
          }
        } else {
          // Initialize with default values if no CRS data exists; derive age from DOB if present
          const base = getDefaultCrsInputs();
          const dob = (profileData as any)?.personalDetails?.dateOfBirth;
          const derivedAge = dob ? computeAge(dob) : 0;
          setCrsInputs({ ...base, age: derivedAge });
        }
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setIsLoading(false);
    }
  };

  // Save action removed from UI per request; calculation logic remains.

  const downloadReport = () => {
    if (!crsBreakdown) return;

    const reportData = {
      calculatedDate: new Date().toISOString(),
      totalScore: crsBreakdown.grandTotal,
      breakdown: crsBreakdown,
      inputs: crsInputs
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crs-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Latest Express Entry draw info (fetched from backend; editable in admin)
  const [latestDraw, setLatestDraw] = useState<{ score: number; date: string } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/draw');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setLatestDraw(json.data);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-cream-50 p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Calculator className="w-8 h-8 text-red-600" />
              CRS Score Calculator
            </h1>
            <p className="text-gray-600 mt-2">
              Calculate your Comprehensive Ranking System score for Express Entry
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            {profile?.crs?.lastUpdated && (
              <Badge variant="outline" className="text-sm">
                Last updated: {formatDateDDMMYYYY(profile.crs.lastUpdated)}
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadReport}
              disabled={!crsBreakdown}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>

            <Button
              variant="outline" 
              size="sm"
              onClick={fetchProfile}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Save Message */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className={saveMessage.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              {saveMessage.type === 'success' ? 
                <CheckCircle className="h-4 w-4 text-green-600" /> : 
                <AlertCircle className="h-4 w-4 text-red-600" />
              }
              <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {saveMessage.text}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* CRS Score Overview */}
        {crsBreakdown && (
          <CrsScoreCard 
            breakdown={crsBreakdown} 
            isLoading={false}
            className="mb-6"
            latestDraw={latestDraw}
          />
        )}

        {/* Detailed 4-card grid */}
        {crsBreakdown && (
          <CrsDetailedGrid breakdown={crsBreakdown} className="mb-6" />
        )}
        {/* Breakdown section (title removed) */}
        {crsBreakdown ? (
          <div className="grid grid-cols-1 gap-6">
            <CrsBreakdownChart 
              breakdown={crsBreakdown} 
              showDetailed={false}
            />

            {/* Quick Improvement Tips */}
            <Card>
              <CardContent className="p-4">
                <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Quick Improvement Tips
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {crsBreakdown.grandTotal < 450 && (
                      <>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700">Improve language test scores (IELTS/CELPIP)</span>
                        </div>
                        {crsBreakdown.additionalPoints.provincialNomination === 0 && (
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-700">Consider Provincial Nominee Program (+600 points)</span>
                          </div>
                        )}
                      </>
                    )}
                    {crsBreakdown.coreHumanCapital.canadianWork === 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">Gain Canadian work experience</span>
                      </div>
                    )}
                    {crsBreakdown.additionalPoints.canadianStudy === 0 && (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">Consider Canadian education (+15-30 points)</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Guide section (title removed) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CRS Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                What is CRS?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                The Comprehensive Ranking System (CRS) is a points-based system used by 
                Immigration, Refugees and Citizenship Canada (IRCC) to assess and rank 
                candidates in the Express Entry pool.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Four Main Categories:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• <strong>Core Human Capital:</strong> Age, education, language, work experience</li>
                  <li>• <strong>Spouse Factors:</strong> Partner's education, language, work experience</li>
                  <li>• <strong>Skill Transferability:</strong> Combinations of education, language, and work</li>
                  <li>• <strong>Additional Points:</strong> Job offers, PNP, Canadian education, siblings</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Improvement Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                How to Improve Your Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-800">Language Tests (High Impact)</h4>
                  <p className="text-sm text-gray-600">
                    Achieve CLB 9+ in all four skills (IELTS 7+ or CELPIP 9+) for maximum points.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Provincial Nomination (+600)</h4>
                  <p className="text-sm text-gray-600">
                    Apply to Provincial Nominee Programs aligned with your skills and location preference.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Canadian Work Experience</h4>
                  <p className="text-sm text-gray-600">
                    Each year of Canadian work experience significantly boosts your core and 
                    transferability points.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Education Credential Assessment</h4>
                  <p className="text-sm text-gray-600">
                    Get your foreign education assessed by WES, ICAS, or other recognized organizations.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">French Language Skills</h4>
                  <p className="text-sm text-gray-600">
                    Strong French skills (CLB 7+) can add 25-50 additional points.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium text-gray-800">Language Tests</h4>
                  <ul className="text-gray-600 ml-4">
                    <li>• IELTS General Training or CELPIP-General (English)</li>
                    <li>• TEF Canada or TCF Canada (French, if applicable)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Education</h4>
                  <ul className="text-gray-600 ml-4">
                    <li>• Educational Credential Assessment (ECA) for foreign credentials</li>
                    <li>• Canadian educational certificates (if applicable)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800">Work Experience</h4>
                  <ul className="text-gray-600 ml-4">
                    <li>• Employment records and reference letters</li>
                    <li>• Proof of Canadian work experience</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This calculator provides an estimate based on IRCC's published scoring system. 
                  Your actual CRS score may vary based on document verification and other factors.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>Test Validity:</strong> Language test results are valid for 2 years from the test date.
                </p>
                <p className="text-gray-700">
                  <strong>ECA Validity:</strong> Educational Credential Assessments are valid for 5 years.
                </p>
                <p className="text-gray-700">
                  <strong>Profile Updates:</strong> You can update your Express Entry profile anytime 
                  before receiving an Invitation to Apply (ITA).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-500 py-6 border-t border-gray-200"
        >
          <p>
            This CRS calculator is based on IRCC's official scoring system as of March 2025. 
            For the most current information, please visit the official IRCC website.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CrsScore;

function computeAge(dateString: string): number {
  try {
    const dob = new Date(dateString);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  } catch {
    return 0;
  }
}
// frontend/src/pages/user/DocumentsChecklist.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { User, HeartHandshake, Baby, AlertCircle } from 'lucide-react';

type ChecklistMap = Record<string, boolean>;

const ItemRow: React.FC<{ text: string; checked: boolean; onToggle: () => void }> = ({ text, checked, onToggle }) => (
  <label className={`flex items-start gap-3 border border-gray-200 rounded-md p-3 bg-white hover:bg-gray-50 transition ${checked ? 'opacity-60' : ''}`}>
    <input type="checkbox" className="mt-0.5" checked={checked} onChange={onToggle} />
    <span className="text-sm text-gray-800 leading-relaxed">{text}</span>
  </label>
);

export const DocumentsChecklist: React.FC = () => {
  const [tab, setTab] = React.useState<'applicant' | 'spouse' | 'children'>('applicant');
  const [checked, setChecked] = React.useState<{
    applicant: ChecklistMap;
    spouse: ChecklistMap;
    children: ChecklistMap;
  }>(() => {
    try {
      const raw = localStorage.getItem('docChecklistState');
      return raw ? JSON.parse(raw) : { applicant: {}, spouse: {}, children: {} };
    } catch {
      return { applicant: {}, spouse: {}, children: {} };
    }
  });
  const { token } = (window as any).useAuthStore?.() || { token: null };

  React.useEffect(() => {
    (async () => {
      try {
        if (!token) return;
        const res = await fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const json = await res.json();
        const server = (json?.data?.documentsChecklist || {}) as any;
        if (server && Object.keys(server).length) {
          setChecked({
            applicant: server.applicant || {},
            spouse: server.spouse || {},
            children: server.children || {},
          });
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  React.useEffect(() => {
    localStorage.setItem('docChecklistState', JSON.stringify(checked));
    (async () => {
      try {
        if (!token) return;
        await fetch('/api/profiles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ documentsChecklist: checked }),
        });
      } catch {}
    })();
  }, [checked]);

  const applicantDocs: string[] = [
    'National Identification (e.g., Aadhar Card)',
    'Current Active Passport – Front & Back pages and all visa/immigration stamps (include previous active/expired passports)',
    'Birth Certificate',
    'Latest CV/Resume – covering past 10 years job/study history at least',
    'Digital Photo – Front face with white background',
    'Email ID',
    'Contact Number',
  ];

  const educationDocs: string[] = [
    'Original scan of 10th, 12th',
    'Graduation, Post‑Graduation',
    'Any other degree or ITI Certificates',
  ];

  const employmentDocs: string[] = [
    'Original scan of Employment Reference Letter/Appointment Letter – including joining date, job responsibilities, minimum 40 hrs/week and annual salary amount',
    'Employment Confirmation Letter from Current Employer (latest date)',
    'Employment Records – pay slips last 6 months',
    'ID Card, Visiting Card, Bonus Certification, Appraisal letter (if any)',
    'Workplace pictures (attending annual meetings, official programs, award ceremony/seminar etc.)',
    'Previous job’s experience certificates (with visiting card of authorized signatory)',
  ];

  const financialDocs: string[] = [
    'Bank statements or proof of funds with bank stamp',
    'Last 2 years income tax returns (with computation)',
    'CA and property valuations (including UDIN no. and valuator visiting card)',
    'If property under parent’s name, provide affidavit of support',
    'Source of funds',
  ];

  const visaEligibilityDocs: string[] = [
    'Language Proficiency Eligibility Report (IELTS/CELPIP)',
    'WES Report for Education Eligibility',
    'Police Clearance Certificate – Latest (for character eligibility)',
  ];

  const spouseDocs: string[] = [
    'Passport copy – Front & Back pages and all visa/immigration stamps',
    'Marriage Certificate',
    'Birth Certificate (if available)',
    'Digital photo – Front face with white background',
    'Education details and ECA (if applicable)',
    'Language test results (if available)',
    'Employment reference/experience letters (if any)',
    'Police clearance certificate – Latest',
    'Any prior visa refusal letter(s) and UCI numbers (if applicable)',
  ];

  const childrenDocs: string[] = [
    'Passport copy (if available)',
    'Birth Certificate',
    'Digital photo – Front face with white background',
    'School records (if available)',
    'Medical/Immunization records (if applicable)',
  ];

  const toggle = (scope: 'applicant' | 'spouse' | 'children', key: string) => {
    setChecked((prev) => ({
      ...prev,
      [scope]: { ...prev[scope], [key]: !prev[scope][key] }
    }));
  };

  const renderList = (items: string[], scope: 'applicant' | 'spouse' | 'children') => (
    <div className="grid grid-cols-1 gap-2">
      {items.map((t) => (
        <ItemRow key={t} text={t} checked={!!checked[scope][t]} onToggle={() => toggle(scope, t)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h1 className="text-xl font-bold text-black mb-1">Documents Check List</h1>
        <p className="text-sm text-gray-600">Use this guide to track documents for your application. Checked items fade slightly to help you focus on what remains.</p>
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-800 text-sm p-3 shadow-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 text-rose-500" />
          <div>
            <span className="font-semibold">Important:</span> Please scan documents using a proper scanner. Avoid mobile camera scans for legibility.
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTab('applicant')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
              tab === 'applicant'
                ? 'bg-red-500 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-xs md:text-sm">Main Applicant</span>
          </button>
          <button
            onClick={() => setTab('spouse')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
              tab === 'spouse'
                ? 'bg-red-500 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span className="text-xs md:text-sm">Spouse/Partner</span>
          </button>
          <button
            onClick={() => setTab('children')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
              tab === 'children'
                ? 'bg-red-500 text-white shadow-md transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Baby className="w-4 h-4" />
            <span className="text-xs md:text-sm">Children</span>
          </button>
        </div>

        {tab === 'applicant' && (
          <div className="mt-2">
            <div className="rounded-md bg-gray-100 border border-gray-200 px-3 py-2 mb-2">
              <h2 className="text-base font-bold text-gray-800">Part A: Main Applicant's Personal Information</h2>
            </div>
            {renderList(applicantDocs, 'applicant')}

            <div className="rounded-md bg-gray-100 border border-gray-200 px-3 py-2 mt-4 mb-2">
              <h3 className="text-base font-bold text-gray-800">Part B: Education Information</h3>
            </div>
            {renderList(educationDocs, 'applicant')}

            <div className="rounded-md bg-gray-100 border border-gray-200 px-3 py-2 mt-4 mb-2">
              <h3 className="text-base font-bold text-gray-800">Part C: Current and Previous Employment</h3>
            </div>
            {renderList(employmentDocs, 'applicant')}

            <div className="rounded-md bg-gray-100 border border-gray-200 px-3 py-2 mt-4 mb-2">
              <h3 className="text-base font-bold text-gray-800">Part D: Visa Eligibility Documents</h3>
            </div>
            {renderList(visaEligibilityDocs, 'applicant')}

            <div className="rounded-md bg-gray-100 border border-gray-200 px-3 py-2 mt-4 mb-2">
              <h3 className="text-base font-bold text-gray-800">Part E: Applicant Financial Documents</h3>
            </div>
            {renderList(financialDocs, 'applicant')}
          </div>
        )}

        {tab === 'spouse' && (
          <div className="mt-2">
            <h2 className="text-lg font-semibold text-black mb-2">Documents Required – Spouse/Partner</h2>
            {renderList(spouseDocs, 'spouse')}
          </div>
        )}

        {tab === 'children' && (
          <div className="mt-2">
            <h2 className="text-lg font-semibold text-black mb-2">Documents Required – Children</h2>
            {renderList(childrenDocs, 'children')}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DocumentsChecklist;



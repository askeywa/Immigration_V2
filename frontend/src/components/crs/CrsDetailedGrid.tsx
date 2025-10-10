// Detailed CRS Breakdown split into 4 cards
// Path: frontend/src/components/crs/CrsDetailedGrid.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CrsBreakdown } from '@/types/crs';

interface Props {
  breakdown: CrsBreakdown;
  className?: string;
}

const Line = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-700">{label}</span>
    <span className="font-semibold text-gray-900">{value}</span>
  </div>
);

export const CrsDetailedGrid: React.FC<Props> = ({ breakdown, className = '' }) => {
  const core = breakdown.coreHumanCapital;
  const spouse = breakdown.spouseFactors;
  const st = breakdown.skillTransferability;
  const add = breakdown.additionalPoints;

  const languageTotal = (core.firstLanguage || 0) + (core.secondLanguage || 0);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Core / Human Capital */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-800">Core Human Capital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Line label="Age" value={core.age} />
          <Line label="Education" value={core.education} />
          <Line label="Language (1st + 2nd)" value={languageTotal} />
          <Line label="Canadian work" value={core.canadianWork} />
          <div className="pt-1 text-[11px] text-blue-800 font-semibold flex items-center justify-between">
            <span>Subtotal</span>
            <span>{core.total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Spouse Factors */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-purple-800">Spouse Factors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Line label="Education" value={spouse.education} />
          <Line label="Language" value={spouse.language} />
          <Line label="Canadian work" value={spouse.canadianWork} />
          <div className="pt-1 text-[11px] text-purple-800 font-semibold flex items-center justify-between">
            <span>Subtotal</span>
            <span>{spouse.total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Skill Transferability */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-green-800">Skill Transferability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Line label="Education + Strong Language" value={st.educationLanguage} />
          <Line label="Education + Canadian Work" value={st.educationCanadianWork} />
          <Line label="Foreign Work + Strong Language" value={st.foreignWorkLanguage} />
          <Line label="Foreign + Canadian Work" value={st.foreignWorkCanadianWork} />
          <div className="pt-1 text-[11px] text-green-800 font-semibold flex items-center justify-between">
            <span>Subtotal</span>
            <span>{st.total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Additional Points */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-orange-800">Additional Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Line label="Provincial nomination" value={add.provincialNomination} />
          <Line label="Study in Canada" value={add.canadianStudy} />
          <Line label="Sibling in Canada" value={add.siblingsInCanada} />
          <Line label="French-language skills" value={add.frenchLanguageSkills} />
          <div className="pt-1 text-[11px] text-orange-800 font-semibold flex items-center justify-between">
            <span>Subtotal</span>
            <span>{add.total}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrsDetailedGrid;



// CRS calculation utilities and pure functions
// Path: frontend/src/utils/crs.ts

import { 
    CrsInputs, 
    CrsBreakdown, 
    TestType, 
    ClbScores, 
    EducationLevel 
  } from '@/types/crs';
  
  
  /**
   * Convert test scores to CLB levels
   */
  export function convertToClb(testType: TestType, scores: {
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
  }): ClbScores {
    const clb: ClbScores = { R: 0, L: 0, S: 0, W: 0 };
  
    if (testType === 'IELTS') {
      clb.R = getIeltsClb('reading', scores.reading);
      clb.W = getIeltsClb('writing', scores.writing);
      clb.L = getIeltsClb('listening', scores.listening);
      clb.S = getIeltsClb('speaking', scores.speaking);
    } else if (testType === 'CELPIP') {
      clb.R = Math.max(0, Math.min(12, Math.floor(scores.reading)));
      clb.W = Math.max(0, Math.min(12, Math.floor(scores.writing)));
      clb.L = Math.max(0, Math.min(12, Math.floor(scores.listening)));
      clb.S = Math.max(0, Math.min(12, Math.floor(scores.speaking)));
    } else if (testType === 'TEF') {
      clb.R = getTefClb('reading', scores.reading);
      clb.W = getTefClb('writing', scores.writing);
      clb.L = getTefClb('listening', scores.listening);
      clb.S = getTefClb('speaking', scores.speaking);
    } else if (testType === 'TCF') {
      // TCF has different scoring - simplified for now
      clb.R = Math.max(0, Math.min(12, Math.floor(scores.reading / 50)));
      clb.W = Math.max(0, Math.min(12, Math.floor(scores.writing / 50)));
      clb.L = Math.max(0, Math.min(12, Math.floor(scores.listening / 50)));
      clb.S = Math.max(0, Math.min(12, Math.floor(scores.speaking / 50)));
    }
  
    return clb;
  }
  
  function getIeltsClb(skill: string, score: number): number {
    const ranges = [
      { min: 0, max: 3.5, clb: 0 },
      { min: 4.0, max: 4.0, clb: 4 },
      { min: 4.5, max: 4.5, clb: 5 },
      { min: 5.0, max: 5.0, clb: 6 },
      { min: 5.5, max: 5.5, clb: 7 },
      { min: 6.0, max: 6.5, clb: 8 },
      { min: 7.0, max: 7.5, clb: 9 },
      { min: 8.0, max: 8.5, clb: 10 },
      { min: 9.0, max: 9.0, clb: 11 }
    ];
  
    if (skill === 'listening') {
      if (score >= 8.5) return 10;
      if (score >= 8.0) return 9;
      if (score >= 7.5) return 8;
      if (score >= 6.0) return 7;
      if (score >= 5.5) return 6;
      if (score >= 5.0) return 5;
      if (score >= 4.5) return 4;
      return 0;
    }
  
    if (skill === 'speaking') {
      if (score >= 7.5) return 10;
      if (score >= 7.0) return 9;
      if (score >= 6.5) return 8;
      if (score >= 6.0) return 7;
      if (score >= 5.5) return 6;
      if (score >= 5.0) return 5;
      if (score >= 4.0) return 4;
      return 0;
    }
  
    // Reading and Writing
    for (const range of ranges) {
      if (score >= range.min && score <= range.max) {
        return range.clb;
      }
    }
    return score >= 9.0 ? 10 : 0;
  }
  
  function getTefClb(skill: string, score: number): number {
    const ranges: Record<string, Array<{min: number, max: number, clb: number}>> = {
      reading: [
        { min: 0, max: 120, clb: 0 },
        { min: 121, max: 150, clb: 4 },
        { min: 151, max: 180, clb: 5 },
        { min: 181, max: 206, clb: 6 },
        { min: 207, max: 232, clb: 7 },
        { min: 233, max: 247, clb: 8 },
        { min: 248, max: 262, clb: 9 },
        { min: 263, max: 300, clb: 10 }
      ],
      writing: [
        { min: 0, max: 180, clb: 0 },
        { min: 181, max: 225, clb: 4 },
        { min: 226, max: 270, clb: 5 },
        { min: 271, max: 309, clb: 6 },
        { min: 310, max: 348, clb: 7 },
        { min: 349, max: 370, clb: 8 },
        { min: 371, max: 392, clb: 9 },
        { min: 393, max: 450, clb: 10 }
      ],
      listening: [
        { min: 0, max: 144, clb: 0 },
        { min: 145, max: 180, clb: 4 },
        { min: 181, max: 216, clb: 5 },
        { min: 217, max: 248, clb: 6 },
        { min: 249, max: 279, clb: 7 },
        { min: 280, max: 296, clb: 8 },
        { min: 297, max: 314, clb: 9 },
        { min: 315, max: 360, clb: 10 }
      ],
      speaking: [
        { min: 0, max: 180, clb: 0 },
        { min: 181, max: 225, clb: 4 },
        { min: 226, max: 270, clb: 5 },
        { min: 271, max: 309, clb: 6 },
        { min: 310, max: 348, clb: 7 },
        { min: 349, max: 370, clb: 8 },
        { min: 371, max: 392, clb: 9 },
        { min: 393, max: 450, clb: 10 }
      ]
    };
  
    for (const range of ranges[skill] || []) {
      if (score >= range.min && score <= range.max) {
        return range.clb;
      }
    }
    return 0;
  }
  
  /**
   * Calculate Age points for CRS
   */
  export function calculateAgePoints(age: number, hasSpouse: boolean): number {
    if (age < 18) return 0;
    
    const ageTable = hasSpouse ? {
      18: 90, 19: 95, 20: 100, 21: 100, 22: 100, 23: 100, 24: 100, 25: 100,
      26: 100, 27: 100, 28: 100, 29: 100, 30: 95, 31: 90, 32: 85, 33: 80,
      34: 75, 35: 70, 36: 65, 37: 60, 38: 55, 39: 50, 40: 45, 41: 35,
      42: 25, 43: 15, 44: 5
    } : {
      18: 99, 19: 105, 20: 110, 21: 110, 22: 110, 23: 110, 24: 110, 25: 110,
      26: 110, 27: 110, 28: 110, 29: 110, 30: 105, 31: 99, 32: 94, 33: 88,
      34: 83, 35: 77, 36: 72, 37: 66, 38: 61, 39: 55, 40: 50, 41: 39,
      42: 28, 43: 17, 44: 6
    };
  
    return (ageTable as any)[Math.min(age, 44)] || 0;
  }
  
  /**
   * Calculate Education points for CRS
   */
  export function calculateEducationPoints(education: EducationLevel, hasSpouse: boolean): number {
    const educationTable = hasSpouse ? {
      'LessThanSecondary': 0,
      'Secondary': 28,
      'OneYearPostSecondary': 84,
      'TwoYearPostSecondary': 91,
      'BachelorsOr3Year': 112,
      'TwoOrMoreCredentials': 119,
      'Masters': 126,
      'ProfessionalDegree': 126,
      'Doctoral': 140
    } : {
      'LessThanSecondary': 0,
      'Secondary': 30,
      'OneYearPostSecondary': 90,
      'TwoYearPostSecondary': 98,
      'BachelorsOr3Year': 120,
      'TwoOrMoreCredentials': 128,
      'Masters': 135,
      'ProfessionalDegree': 135,
      'Doctoral': 150
    };
  
    return educationTable[education] || 0;
  }
  
  /**
   * Calculate Language points for CRS
   */
  export function calculateLanguagePoints(clb: ClbScores, hasSpouse: boolean, isFirstLanguage: boolean = true): number {
    const pointsPerSkill = hasSpouse ? (isFirstLanguage ? {
      4: 0, 5: 1, 6: 1, 7: 3, 8: 4, 9: 6, 10: 6, 11: 6, 12: 6
    } : {
      4: 0, 5: 1, 6: 1, 7: 3, 8: 3, 9: 6, 10: 6, 11: 6, 12: 6
    }) : (isFirstLanguage ? {
      4: 0, 5: 1, 6: 1, 7: 3, 8: 5, 9: 6, 10: 6, 11: 6, 12: 6
    } : {
      4: 0, 5: 1, 6: 1, 7: 3, 8: 3, 9: 6, 10: 6, 11: 6, 12: 6
    });
  
    const reading = (pointsPerSkill as any)[Math.min(clb.R, 12)] || 0;
    const writing = (pointsPerSkill as any)[Math.min(clb.W, 12)] || 0;
    const listening = (pointsPerSkill as any)[Math.min(clb.L, 12)] || 0;
    const speaking = (pointsPerSkill as any)[Math.min(clb.S, 12)] || 0;
  
    return reading + writing + listening + speaking;
  }
  
  /**
   * Calculate Canadian Work Experience points
   */
  export function calculateCanadianWorkPoints(years: number, hasSpouse: boolean): number {
    const workTable = hasSpouse ? {
      0: 0, 1: 35, 2: 46, 3: 56, 4: 63, 5: 70
    } : {
      0: 0, 1: 40, 2: 53, 3: 64, 4: 72, 5: 80
    };
  
    return (workTable as any)[Math.min(years, 5)] || 0;
  }
  
  /**
   * Calculate Spouse factors points
   */
  export function calculateSpousePoints(inputs: CrsInputs): { education: number; language: number; canadianWork: number; total: number } {
    if (!inputs.hasSpouse || !inputs.spouse) {
      return { education: 0, language: 0, canadianWork: 0, total: 0 };
    }
  
    const spouse = inputs.spouse;
    
    // Spouse Education
    const spouseEducationTable: Record<EducationLevel, number> = {
      'LessThanSecondary': 0,
      'Secondary': 2,
      'OneYearPostSecondary': 6,
      'TwoYearPostSecondary': 7,
      'BachelorsOr3Year': 8,
      'TwoOrMoreCredentials': 9,
      'Masters': 10,
      'ProfessionalDegree': 10,
      'Doctoral': 10
    };
  
    const educationPoints = spouseEducationTable[spouse.education] || 0;
  
    // Spouse Language
    let languagePoints = 0;
    if (spouse.language) {
      const clb = spouse.language.clb;
      const skillPoints = {
        4: 0, 5: 1, 6: 1, 7: 3, 8: 5, 9: 5, 10: 5, 11: 5, 12: 5
      };
      languagePoints = ['R', 'W', 'L', 'S'].reduce((total: any, skill: any) => {
        return total + ((skillPoints as any)[Math.min((clb as any)[skill], 12)] || 0);
      }, 0);
      languagePoints = Math.min(languagePoints, 20); // Max 20 points
    }
  
    // Spouse Canadian Work Experience
    const spouseWorkTable = { 0: 0, 1: 5, 2: 7, 3: 10, 4: 10, 5: 10 };
    const canadianWorkPoints = (spouseWorkTable as any)[Math.min(spouse.canadianYears, 5)] || 0;
  
    const total = educationPoints + languagePoints + canadianWorkPoints;
    
    return {
      education: educationPoints,
      language: languagePoints,
      canadianWork: canadianWorkPoints,
      total
    };
  }
  
  /**
   * Calculate Skill Transferability points
   */
  export function calculateSkillTransferabilityPoints(inputs: CrsInputs): {
    educationLanguage: number;
    educationCanadianWork: number;
    foreignWorkLanguage: number;
    foreignWorkCanadianWork: number;
    certificateLanguage: number;
    total: number;
  } {
    let educationLanguage = 0;
    let educationCanadianWork = 0;
    let foreignWorkLanguage = 0;
    let foreignWorkCanadianWork = 0;
    let certificateLanguage = 0;
  
    const highEducation = ['BachelorsOr3Year', 'TwoOrMoreCredentials', 'Masters', 'ProfessionalDegree', 'Doctoral'].includes(inputs.education.highest);
    const strongLanguage = inputs.languageProficiency.first.clb.R >= 7 && inputs.languageProficiency.first.clb.W >= 7 && 
                           inputs.languageProficiency.first.clb.L >= 7 && inputs.languageProficiency.first.clb.S >= 7;
  
    // Education + Language
    if (highEducation && strongLanguage) {
      educationLanguage = 50;
    } else if (highEducation && inputs.languageProficiency.first.clb.R >= 5) {
      educationLanguage = 25;
    }
  
    // Education + Canadian Work Experience
    if (highEducation && inputs.workExperience.canadianYears >= 1) {
      educationCanadianWork = inputs.workExperience.canadianYears >= 2 ? 50 : 25;
    }
  
    // Foreign Work + Language
    if (inputs.workExperience.foreignYears >= 1 && strongLanguage) {
      foreignWorkLanguage = 50;
    } else if (inputs.workExperience.foreignYears >= 1 && inputs.languageProficiency.first.clb.R >= 5) {
      foreignWorkLanguage = 25;
    }
  
    // Foreign Work + Canadian Work
    if (inputs.workExperience.foreignYears >= 1 && inputs.workExperience.canadianYears >= 1) {
      foreignWorkCanadianWork = 50;
    }
  
    // Apply maximum rule: only top 2 combinations count, max 100 total
    const combinations = [
      { name: 'educationLanguage', points: educationLanguage },
      { name: 'educationCanadianWork', points: educationCanadianWork },
      { name: 'foreignWorkLanguage', points: foreignWorkLanguage },
      { name: 'foreignWorkCanadianWork', points: foreignWorkCanadianWork },
      { name: 'certificateLanguage', points: certificateLanguage }
    ].sort((a, b) => b.points - a.points);
  
    const topTwo = combinations.slice(0, 2);
    const total = Math.min(topTwo.reduce((sum: any, combo: any) => sum + combo.points, 0), 100);
  
    return {
      educationLanguage: topTwo.find((c: any) => c.name === 'educationLanguage')?.points || 0,
      educationCanadianWork: topTwo.find((c: any) => c.name === 'educationCanadianWork')?.points || 0,
      foreignWorkLanguage: topTwo.find((c: any) => c.name === 'foreignWorkLanguage')?.points || 0,
      foreignWorkCanadianWork: topTwo.find((c: any) => c.name === 'foreignWorkCanadianWork')?.points || 0,
      certificateLanguage: topTwo.find((c: any) => c.name === 'certificateLanguage')?.points || 0,
      total
    };
  }
  
  /**
   * Calculate Additional Points
   */
  export function calculateAdditionalPoints(inputs: CrsInputs): {
    provincialNomination: number;
    arrangedEmployment: number;
    canadianStudy: number;
    siblingsInCanada: number;
    frenchLanguageSkills: number;
    total: number;
  } {
    let provincialNomination = inputs.provincialNomination ? 600 : 0;
    let arrangedEmployment = 0; // Removed by IRCC March 2025
    
    let canadianStudy = 0;
    if (inputs.canadianStudy === 'oneYear') canadianStudy = 15;
    if (inputs.canadianStudy === 'twoPlusYears') canadianStudy = 30;
    
    let siblingsInCanada = inputs.siblingsInCanada ? 15 : 0;
    
    let frenchLanguageSkills = 0;
    if (inputs.languageProficiency.second && inputs.frenchBonusEligible) {
      const frenchClb = inputs.languageProficiency.second.clb;
      const strongFrench = frenchClb.R >= 7 && frenchClb.W >= 7 && frenchClb.L >= 7 && frenchClb.S >= 7;
      const englishClb = inputs.languageProficiency.first.clb;
      const weakEnglish = englishClb.R <= 4 && englishClb.W <= 4 && englishClb.L <= 4 && englishClb.S <= 4;
      const goodEnglish = englishClb.R >= 5 && englishClb.W >= 5 && englishClb.L >= 5 && englishClb.S >= 5;
      
      if (strongFrench && weakEnglish) frenchLanguageSkills = 25;
      else if (strongFrench && goodEnglish) frenchLanguageSkills = 50;
    }
  
    const total = provincialNomination + arrangedEmployment + canadianStudy + siblingsInCanada + frenchLanguageSkills;
  
    return {
      provincialNomination,
      arrangedEmployment,
      canadianStudy,
      siblingsInCanada,
      frenchLanguageSkills,
      total
    };
  }
  
  /**
   * Main CRS calculation function
   */
  export function calculateCrsScore(inputs: CrsInputs): CrsBreakdown {
    // Core Human Capital factors
    const agePoints = calculateAgePoints(inputs.age, inputs.hasSpouse);
    const educationPoints = calculateEducationPoints(inputs.education.highest, inputs.hasSpouse);
    const firstLanguagePoints = calculateLanguagePoints(inputs.languageProficiency.first.clb, inputs.hasSpouse, true);
    const secondLanguagePoints = inputs.languageProficiency.second 
      ? calculateLanguagePoints(inputs.languageProficiency.second.clb, inputs.hasSpouse, false) 
      : 0;
    const canadianWorkPoints = calculateCanadianWorkPoints(inputs.workExperience.canadianYears, inputs.hasSpouse);
  
    const coreHumanCapital = {
      age: agePoints,
      education: educationPoints,
      firstLanguage: firstLanguagePoints,
      secondLanguage: secondLanguagePoints,
      canadianWork: canadianWorkPoints,
      total: agePoints + educationPoints + firstLanguagePoints + secondLanguagePoints + canadianWorkPoints
    };
  
    // Spouse factors
    const spouseFactors = calculateSpousePoints(inputs);
  
    // Skill Transferability
    const skillTransferability = calculateSkillTransferabilityPoints(inputs);
  
    // Additional Points
    const additionalPoints = calculateAdditionalPoints(inputs);
  
    // Grand Total
    const grandTotal = coreHumanCapital.total + spouseFactors.total + skillTransferability.total + additionalPoints.total;
  
    return {
      coreHumanCapital,
      spouseFactors,
      skillTransferability,
      additionalPoints,
      grandTotal: Math.min(grandTotal, 1200) // Max 1200 points
    };
  }
  
  /**
   * Validate CRS form inputs
   */
  export function validateCrsInputs(inputs: Partial<CrsInputs>): Record<string, string> {
    const errors: Record<string, string> = {};
  
    if (!inputs.age || inputs.age < 18 || inputs.age > 50) {
      errors.age = 'Age must be between 18 and 50';
    }
  
    if (!inputs.languageProficiency?.first) {
      errors.languageFirst = 'First official language test results are required';
    } else {
      const { reading, writing, listening, speaking } = inputs.languageProficiency.first;
      if (inputs.languageProficiency.first.testType === 'IELTS') {
        if (reading < 0 || reading > 9) errors.languageFirstReading = 'IELTS reading score must be 0-9';
        if (writing < 0 || writing > 9) errors.languageFirstWriting = 'IELTS writing score must be 0-9';
        if (listening < 0 || listening > 9) errors.languageFirstListening = 'IELTS listening score must be 0-9';
        if (speaking < 0 || speaking > 9) errors.languageFirstSpeaking = 'IELTS speaking score must be 0-9';
      } else if (inputs.languageProficiency.first.testType === 'CELPIP') {
        if (reading < 1 || reading > 12) errors.languageFirstReading = 'CELPIP reading score must be 1-12';
        if (writing < 1 || writing > 12) errors.languageFirstWriting = 'CELPIP writing score must be 1-12';
        if (listening < 1 || listening > 12) errors.languageFirstListening = 'CELPIP listening score must be 1-12';
        if (speaking < 1 || speaking > 12) errors.languageFirstSpeaking = 'CELPIP speaking score must be 1-12';
      }
    }
  
    if (inputs.hasSpouse && inputs.spouse) {
      if (!inputs.spouse.age || inputs.spouse.age < 18 || inputs.spouse.age > 50) {
        errors.spouseAge = 'Spouse age must be between 18 and 50';
      }
    }
  
    return errors;
  }
  
  /**
   * Get default CRS inputs
   */
  export function getDefaultCrsInputs(): CrsInputs {
    return {
      age: 0,
      maritalStatus: 'single',
      hasSpouse: false,
      numChildren: 0,
      languageProficiency: {
        first: {
          testType: 'IELTS',
          reading: 0,
          listening: 0,
          speaking: 0,
          writing: 0,
          clb: { R: 0, L: 0, S: 0, W: 0 }
        }
      },
      education: {
        highest: 'Secondary',
        eca: {
          hasECA: false
        }
      },
      workExperience: {
        canadianYears: 0,
        foreignYears: 0
      },
      arrangedEmployment: false,
      provincialNomination: false,
      canadianStudy: 'none',
      siblingsInCanada: false,
      frenchBonusEligible: false
    };
  }
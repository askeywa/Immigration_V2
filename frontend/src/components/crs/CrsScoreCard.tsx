// CRS Score Card Component - Main score display
// Path: frontend/src/components/crs/CrsScoreCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Progress } from '@/components/ui';
import { Trophy, TrendingUp, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { CrsBreakdown } from '@/types/crs';
import { formatDateDDMMYYYY } from '@/utils/date';
import { motion } from 'framer-motion';

interface CrsScoreCardProps {
  breakdown: CrsBreakdown;
  isLoading?: boolean;
  className?: string;
  latestDraw?: { score: number; date: string } | null;
}

export const CrsScoreCard: React.FC<CrsScoreCardProps> = ({ 
  breakdown, 
  isLoading = false, 
  className = '',
  latestDraw
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 470) return 'text-green-600';
    if (score >= 400) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreStatus = (score: number): { icon: React.ReactNode; text: string; color: string } => {
    if (score >= 470) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        text: 'Excellent Score',
        color: 'bg-green-50 text-green-700 border-green-200'
      };
    }
    if (score >= 400) {
      return {
        icon: <TrendingUp className="w-5 h-5 text-yellow-600" />,
        text: 'Good Score',
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
      };
    }
    return {
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      text: 'Needs Improvement',
      color: 'bg-red-50 text-red-700 border-red-200'
    };
  };

  const status = getScoreStatus(breakdown.grandTotal);
  const progressPercentage = Math.min((breakdown.grandTotal / 1200) * 100, 100);

  if (isLoading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${className} border-red-100 shadow-lg`}>
        <CardHeader className="pb-4 bg-gradient-to-r from-red-50 to-cream-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-red-600" />
              Your CRS Score
            </CardTitle>
            <motion.div
              key={breakdown.grandTotal}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`text-3xl font-bold ${getScoreColor(breakdown.grandTotal)}`}
            >
              {breakdown.grandTotal}
            </motion.div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            {status.icon}
            <Badge variant="outline" className={`${status.color} border px-3 py-1`}>
              {status.text}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm min-w-0">
              <span className="text-gray-600 truncate flex-shrink-0">Progress to Maximum (1200)</span>
              <span className="font-medium flex-shrink-0 ml-2">{progressPercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-3 bg-gray-200"
              indicatorClassName="bg-gradient-to-r from-red-500 to-red-600"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {latestDraw && (
            <div className="mt-1">
              <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-rose-50 to-amber-50 border border-red-100 px-3 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-700">Last Express Entry draw</span>
                <span className="text-xs px-2 py-1 rounded-full bg-white border border-red-200 text-gray-800">{formatDateDDMMYYYY(latestDraw.date)}</span>
                <span className="ml-auto text-white text-sm font-semibold px-3 py-1 rounded-full bg-red-600">{latestDraw.score}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
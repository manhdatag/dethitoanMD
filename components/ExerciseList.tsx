import React from 'react';
import { Exercise } from '../types';
import { CheckSquare, List, HelpCircle, Image as ImageIcon, Type } from 'lucide-react';

interface ExerciseListProps {
  exercises: Exercise[];
}

const ExerciseList: React.FC<ExerciseListProps> = ({ exercises }) => {
  if (exercises.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <List className="w-6 h-6 text-teal-600" />
        Parsed Exercises ({exercises.length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exercises.map((ex, idx) => (
          <div key={ex.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded-md">
                Q{idx + 1}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1
                ${ex.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' : 
                  ex.type === 'true_false' ? 'bg-purple-100 text-purple-700' :
                  ex.type === 'short_answer' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}
              `}>
                {ex.type === 'multiple_choice' && <List className="w-3 h-3" />}
                {ex.type === 'true_false' && <CheckSquare className="w-3 h-3" />}
                {ex.type === 'short_answer' && <Type className="w-3 h-3" />}
                {ex.type === 'unknown' && <HelpCircle className="w-3 h-3" />}
                {ex.type.replace('_', ' ')}
              </span>
            </div>
            
            <p className="text-slate-600 text-sm line-clamp-3 mb-3 font-medium">
              {ex.question}
            </p>

            <div className="flex gap-2 mt-auto">
              {ex.tikz && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> TikZ
                </span>
              )}
              {ex.solution && (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                  Solution
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExerciseList;

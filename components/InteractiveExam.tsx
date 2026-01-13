import React, { useState, useEffect, useRef } from 'react';
import { Exercise } from '../types';
import { CheckCircle, XCircle, RefreshCw, Eye, Check, X } from 'lucide-react';

// Fix: Add global declaration for MathJax on Window interface
declare global {
  interface Window {
    MathJax: any;
  }
}

interface RenderedImage {
  id: string;
  base64: string;
  width: number;
  height: number;
}

interface InteractiveExamProps {
  exercises: Exercise[];
  images: Map<string, RenderedImage>;
  onBack: () => void;
}

type UserAnswers = Record<string, any>; 

// Helper Component for Math Rendering
const MathText: React.FC<{ content: string | undefined }> = ({ content }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (content && window.MathJax && ref.current) {
      // Clear previous content to avoid duplication if re-rendering issues occur
      ref.current.innerHTML = content;
      // Tell MathJax to typeset this specific node
      window.MathJax.typesetPromise([ref.current]).catch((err: any) => console.error(err));
    }
  }, [content]);

  // If content is empty/undefined
  if (!content) return null;

  return <span ref={ref} className="math-content inline-block align-middle" />;
};

const InteractiveExam: React.FC<InteractiveExamProps> = ({ exercises, images, onBack }) => {
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Ensure MathJax is loaded and typeset on mount/update
  useEffect(() => {
    if (window.MathJax) {
      window.MathJax.typesetPromise().catch((err: any) => console.log('MathJax error:', err));
    }
  }, [exercises, isSubmitted]);

  const handleMCQSelect = (exId: string, choiceIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [exId]: choiceIdx }));
  };

  const handleTFSelect = (exId: string, statementIdx: number, value: boolean) => {
    if (isSubmitted) return;
    const currentAns = userAnswers[exId] || {};
    setUserAnswers(prev => ({
      ...prev,
      [exId]: { ...currentAns, [statementIdx]: value }
    }));
  };

  const handleShortAnswerChange = (exId: string, value: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [exId]: value }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    let totalPoints = 0;

    exercises.forEach(ex => {
      totalPoints++; 
      
      if (ex.type === 'multiple_choice') {
        if (userAnswers[ex.id] === ex.correctChoice) correctCount++;
      } else if (ex.type === 'short_answer') {
        const userVal = (userAnswers[ex.id] || '').toString().trim().toLowerCase();
        const correctVal = (ex.answer || '').toString().trim().toLowerCase();
        if (userVal === correctVal && correctVal !== '') correctCount++;
      } else if (ex.type === 'true_false') {
        const userAns = userAnswers[ex.id] || {};
        const allCorrect = ex.tfAnswers?.every((ans, idx) => userAns[idx] === ans);
        if (allCorrect) correctCount++;
      }
    });

    setScore({ correct: correctCount, total: totalPoints });
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderImage = (key: string) => {
    if (images.has(key)) {
      const img = images.get(key)!;
      return (
        <div className="my-4 flex justify-center">
          <img 
            src={`data:image/png;base64,${img.base64}`} 
            alt="TikZ Graphic" 
            style={{ maxWidth: '100%', height: 'auto' }}
            className="rounded-lg border border-slate-200 shadow-sm"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Score Header */}
      {isSubmitted && (
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border-2 border-teal-100 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Kết quả bài làm</h2>
              <p className="text-slate-500">Bạn đã hoàn thành bài thi trắc nghiệm.</p>
            </div>
            <div className="text-right">
              <span className="block text-4xl font-black text-teal-600">
                {score.correct}/{score.total}
              </span>
              <span className="text-sm font-medium text-teal-600 uppercase tracking-wide">Câu đúng</span>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-teal-500 h-full transition-all duration-1000 ease-out" 
              style={{ width: `${(score.correct / score.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-8">
        {exercises.map((ex, index) => (
          <div 
            key={ex.id} 
            className={`bg-white rounded-xl shadow-sm border p-6 transition-all duration-300
              ${isSubmitted 
                ? 'border-slate-200' 
                : 'border-slate-100 hover:shadow-md hover:border-teal-200'
              }
            `}
          >
            {/* Question Header */}
            <div className="flex items-start gap-4 mb-4">
              <span className="bg-teal-600 text-white text-sm font-bold px-3 py-1 rounded-lg shrink-0 mt-0.5">
                Câu {index + 1}
              </span>
              <div className="flex-1">
                <div className="text-slate-800 font-medium text-lg leading-relaxed">
                  <MathText content={ex.question} />
                </div>
                {renderImage(`${ex.id}_question`)}
              </div>
            </div>

            {/* Interaction Area */}
            <div className="pl-0 md:pl-14 mt-4">
              
              {/* === MULTIPLE CHOICE === */}
              {ex.type === 'multiple_choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ex.choices?.map((choice, cIdx) => {
                    const isSelected = userAnswers[ex.id] === cIdx;
                    const isCorrect = ex.correctChoice === cIdx;
                    
                    let btnClass = "border-slate-200 hover:bg-slate-50 text-slate-700";
                    let icon = null;

                    if (isSubmitted) {
                      if (isCorrect) {
                        btnClass = "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500";
                        icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                      } else if (isSelected && !isCorrect) {
                        btnClass = "bg-red-50 border-red-300 text-red-800";
                        icon = <XCircle className="w-5 h-5 text-red-500" />;
                      } else {
                        btnClass = "opacity-50 border-slate-100 bg-slate-50";
                      }
                    } else if (isSelected) {
                      btnClass = "border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500";
                    }

                    return (
                      <button
                        key={cIdx}
                        onClick={() => handleMCQSelect(ex.id, cIdx)}
                        disabled={isSubmitted}
                        className={`
                          relative w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3
                          ${btnClass}
                        `}
                      >
                        <span className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border shrink-0
                          ${isSelected || (isSubmitted && isCorrect) ? 'border-current' : 'border-slate-300 text-slate-400'}
                        `}>
                          {String.fromCharCode(65 + cIdx)}
                        </span>
                        <span className="flex-1">
                          <MathText content={choice} />
                        </span>
                        {icon}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* === TRUE / FALSE === */}
              {ex.type === 'true_false' && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  {ex.statements?.map((stmt, sIdx) => {
                    const userVal = userAnswers[ex.id]?.[sIdx]; // true, false, or undefined
                    const correctVal = ex.tfAnswers?.[sIdx];
                    
                    const isCorrectRow = isSubmitted && userVal === correctVal;
                    const isWrongRow = isSubmitted && userVal !== undefined && userVal !== correctVal;

                    return (
                      <div key={sIdx} className="flex flex-col md:flex-row md:items-center p-4 border-b border-slate-200 last:border-0 gap-4">
                         <div className="flex-1 text-slate-700 font-medium flex gap-3">
                           <span className="text-slate-400 font-bold">{String.fromCharCode(97 + sIdx)})</span>
                           <MathText content={stmt} />
                         </div>
                         <div className="flex gap-2 shrink-0">
                           {/* TRUE BUTTON */}
                           <button
                             onClick={() => handleTFSelect(ex.id, sIdx, true)}
                             disabled={isSubmitted}
                             className={`
                               px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border transition-all
                               ${userVal === true 
                                 ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                 : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'}
                               ${isSubmitted && correctVal === true ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                             `}
                           >
                             <Check className="w-4 h-4" /> Đúng
                           </button>
                           
                           {/* FALSE BUTTON */}
                           <button
                             onClick={() => handleTFSelect(ex.id, sIdx, false)}
                             disabled={isSubmitted}
                             className={`
                               px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border transition-all
                               ${userVal === false 
                                 ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                                 : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'}
                               ${isSubmitted && correctVal === false ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                             `}
                           >
                             <X className="w-4 h-4" /> Sai
                           </button>
                         </div>
                         
                         {/* Result Icon for Row */}
                         {isSubmitted && (
                           <div className="w-8 flex justify-center">
                              {isCorrectRow && <CheckCircle className="w-6 h-6 text-green-500" />}
                              {isWrongRow && <XCircle className="w-6 h-6 text-red-500" />}
                           </div>
                         )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* === SHORT ANSWER === */}
              {ex.type === 'short_answer' && (
                <div className="max-w-md">
                   <div className="relative">
                    <input
                      type="text"
                      placeholder="Nhập đáp án của bạn..."
                      value={userAnswers[ex.id] || ''}
                      onChange={(e) => handleShortAnswerChange(ex.id, e.target.value)}
                      disabled={isSubmitted}
                      className={`
                        w-full p-4 pl-4 pr-12 rounded-xl border-2 outline-none transition-all font-medium text-lg
                        ${isSubmitted 
                           ? (userAnswers[ex.id]?.toString().trim().toLowerCase() === ex.answer?.toString().trim().toLowerCase()
                              ? 'border-green-500 bg-green-50 text-green-900' 
                              : 'border-red-300 bg-red-50 text-red-900')
                           : 'border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 text-slate-800'
                        }
                      `}
                    />
                    {isSubmitted && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         {userAnswers[ex.id]?.toString().trim().toLowerCase() === ex.answer?.toString().trim().toLowerCase()
                            ? <CheckCircle className="w-6 h-6 text-green-600" />
                            : <XCircle className="w-6 h-6 text-red-500" />
                         }
                      </div>
                    )}
                   </div>
                   {isSubmitted && (
                     <div className="mt-2 text-sm font-semibold text-slate-500">
                       Đáp án đúng: <span className="text-teal-600">
                         <MathText content={ex.answer} />
                       </span>
                     </div>
                   )}
                </div>
              )}
            </div>

            {/* Solution Section (Shown after Submit) */}
            {isSubmitted && (ex.solution || ex.solutionTikz) && (
              <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in">
                <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100">
                  <h4 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Lời giải chi tiết
                  </h4>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    <MathText content={ex.solution || ''} />
                  </div>
                  {renderImage(`${ex.id}_solution`)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="mt-12 flex justify-center gap-4 sticky bottom-6 z-10">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            className="bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center gap-2"
          >
            <CheckCircle className="w-6 h-6" /> Nộp bài
          </button>
        ) : (
          <div className="flex gap-4">
             <button
              onClick={() => {
                setIsSubmitted(false);
                setUserAnswers({});
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-full shadow-md border border-slate-200 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" /> Làm lại
            </button>
             <button
              onClick={onBack}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all flex items-center gap-2"
            >
              Soạn đề mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveExam;
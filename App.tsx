import React, { useState, useCallback } from 'react';
import { LaTeXParser } from './services/parser';
import { compileTikz } from './services/api';
import FileUpload from './components/FileUpload';
import ExerciseList from './components/ExerciseList';
import InteractiveExam from './components/InteractiveExam';
import { Exercise, ProcessingState } from './types';
import { Play, FileText, Settings, Sparkles, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const parser = new LaTeXParser();

// Constants for Image Scaling for Web Display
const TIKZ_DENSITY = 300; // High quality for web
// We don't need scaling factor for Docx anymore, but we can resize for web optimization if needed
// For now, let's keep high density

function App() {
  const [view, setView] = useState<'editor' | 'exam'>('editor');
  const [latexContent, setLatexContent] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [images, setImages] = useState<Map<string, { id: string; base64: string; width: number; height: number }>>(new Map());
  
  const [processing, setProcessing] = useState<ProcessingState>({ 
    status: 'idle', 
    progress: 0, 
    message: '' 
  });

  const handleFileSelect = useCallback((content: string, fileName: string) => {
    setLatexContent(content);
    if (content) {
      setProcessing({ status: 'parsing', progress: 10, message: 'Parsing LaTeX structure...' });
      setTimeout(() => {
        try {
          const parsed = parser.extractExercises(content).map(ex => parser.parseExercise(ex));
          setExercises(parsed);
          setProcessing({ status: 'idle', progress: 0, message: '' });
        } catch (e) {
          setProcessing({ status: 'error', progress: 0, message: 'Failed to parse file.' });
        }
      }, 500);
    } else {
      setExercises([]);
    }
  }, []);

  const handleCreateExam = async () => {
    if (exercises.length === 0) return;

    setProcessing({ status: 'converting_images', progress: 0, message: 'Preparing interactive exam...' });
    const newImages = new Map<string, { id: string; base64: string; width: number; height: number }>();
    
    // TikZ extraction
    const tikzItems: { id: string; key: string; source: string }[] = [];
    exercises.forEach(ex => {
      if (ex.tikz) tikzItems.push({ id: ex.id, key: `${ex.id}_question`, source: ex.tikz });
      if (ex.solutionTikz) tikzItems.push({ id: ex.id, key: `${ex.id}_solution`, source: ex.solutionTikz });
    });

    const total = tikzItems.length;

    try {
      // Compile TikZ images
      for (let i = 0; i < total; i++) {
        const item = tikzItems[i];
        setProcessing({ 
          status: 'converting_images', 
          progress: Math.round(((i) / total) * 90), 
          message: `Rendering graphic ${i + 1} of ${total}...` 
        });

        const res = await compileTikz({
          source: item.source,
          format: 'png',
          density: TIKZ_DENSITY,
          transparent: true
        });

        if (res.ok && res.image_base64) {
          // Just store raw base64, styling will handle size
          newImages.set(item.key, {
            id: item.id,
            base64: res.image_base64,
            width: 0, // Not strictly needed for web display unless layout shift is major
            height: 0
          });
        }
      }

      setImages(newImages);
      setProcessing({ status: 'completed', progress: 100, message: 'Exam Ready!' });
      setTimeout(() => {
        setProcessing({ status: 'idle', progress: 0, message: '' });
        setView('exam'); // Switch view
        window.scrollTo(0,0);
      }, 500);

    } catch (error) {
      console.error(error);
      setProcessing({ 
        status: 'error', 
        progress: 0, 
        message: 'Error rendering graphics. Check console.' 
      });
    }
  };

  if (view === 'exam') {
    return (
      <div className="min-h-screen bg-slate-50 pt-8">
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-slate-200">
           <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <button 
                onClick={() => setView('editor')}
                className="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-bold transition-colors"
              >
                <ArrowLeft className="w-5 h-5" /> Back to Editor
              </button>
              <div className="font-bold text-xl text-slate-800">
                Bài thi trực tuyến
              </div>
              <div className="w-20"></div> {/* Spacer */}
           </div>
        </header>
        <div className="mt-20 px-4">
          <InteractiveExam 
            exercises={exercises} 
            images={images} 
            onBack={() => setView('editor')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Interactive Exam Creator</h1>
              <p className="text-teal-100 mt-1 text-lg">
                Convert LaTeX questions into a live HTML interactive quiz
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-8 text-sm font-medium text-teal-100">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
              <Settings className="w-4 h-4" />
              <span>TikZ Rendering</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
              <FileText className="w-4 h-4" />
              <span>MCQ & True/False</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 -mt-10">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Upload */}
            <div className="lg:col-span-2 space-y-6">
              <FileUpload onFileSelect={handleFileSelect} />
              
              <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-700 block">
                   Or paste LaTeX content directly:
                 </label>
                 <textarea
                   className="w-full h-40 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-mono text-xs bg-slate-50 text-slate-900"
                   placeholder="\begin{ex} ... \end{ex}"
                   value={latexContent}
                   onChange={(e) => handleFileSelect(e.target.value, 'Manual Input')}
                 />
              </div>
            </div>

            {/* Right Column: Actions & Stats */}
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-teal-600" />
                  Exam Actions
                </h3>
                
                {exercises.length > 0 ? (
                   <button
                    onClick={handleCreateExam}
                    disabled={processing.status !== 'idle' && processing.status !== 'completed' && processing.status !== 'error'}
                    className={`
                      w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg shadow-md transition-all
                      ${processing.status === 'idle' || processing.status === 'completed' || processing.status === 'error'
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white transform hover:-translate-y-1' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                    `}
                   >
                     {processing.status === 'idle' || processing.status === 'completed' || processing.status === 'error' ? (
                       <>
                        <Play className="w-6 h-6" />
                        Start Interactive Exam
                       </>
                     ) : (
                       <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Processing Images...
                       </>
                     )}
                   </button>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Upload or paste LaTeX content to enable exam mode.
                  </div>
                )}

                {/* Progress Indicator */}
                {processing.status !== 'idle' && (
                  <div className="mt-6 space-y-2 animate-fade-in">
                    <div className="flex justify-between text-xs font-semibold text-teal-700">
                      <span>{processing.message}</span>
                      <span>{processing.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${processing.status === 'error' ? 'bg-red-500' : 'bg-teal-500'}`}
                        style={{ width: `${processing.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {processing.status === 'error' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{processing.message}</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              {exercises.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                    <span className="block text-2xl font-bold text-blue-600">{exercises.length}</span>
                    <span className="text-xs text-blue-600 font-medium">Questions</span>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                    <span className="block text-2xl font-bold text-amber-600">
                      {exercises.filter(e => e.tikz || e.solutionTikz).length}
                    </span>
                    <span className="text-xs text-amber-600 font-medium">TikZ Images</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview List in Editor Mode */}
          <ExerciseList exercises={exercises} />
        </div>
      </main>
    </div>
  );
}

export default App;

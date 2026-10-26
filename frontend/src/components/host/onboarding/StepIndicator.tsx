'use client';

import React from 'react';
import { Check, User, ShieldCheck, FileText, Home, Send } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  onStepClick?: (step: number) => void;
  completedSteps: number[];
}

interface StepItem {
  number: number;
  title: string;
  shortTitle: string;
  icon: typeof User;
}

const STEPS: StepItem[] = [
  { number: 1, title: 'Account Details', shortTitle: 'Account', icon: User },
  { number: 2, title: 'Email Verification', shortTitle: 'Email', icon: ShieldCheck },
  { number: 3, title: 'Identity Verification', shortTitle: 'Identity', icon: FileText },
  { number: 4, title: 'Host & Address', shortTitle: 'Address', icon: Home },
  { number: 5, title: 'Review & Submit', shortTitle: 'Review', icon: Send },
];

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="w-full bg-white border-b border-slate-200 py-4 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Mobile Step Counter & Progress Bar */}
        <div className="sm:hidden mb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span>
              Step {currentStep} of {STEPS.length}:{' '}
              <span className="text-[#1e40af]">{STEPS[currentStep - 1]?.title}</span>
            </span>
            <span className="text-slate-500 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#1e40af] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Desktop Step Nav List */}
        <ol className="hidden sm:grid grid-cols-5 gap-2" role="list">
          {STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isClickable = isCompleted && onStepClick;
            const Icon = step.icon;

            return (
              <li
                key={step.number}
                className="relative flex flex-col items-center text-center group"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(step.number)}
                  className={`w-full flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-2 transition ${
                    isClickable ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
                  }`}
                  aria-label={`${step.title} - ${
                    isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Upcoming'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition mb-1.5 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : isCurrent
                        ? 'bg-[#1e40af] text-white ring-4 ring-blue-100 shadow-2xs'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold tracking-tight transition line-clamp-1 ${
                      isCurrent
                        ? 'text-slate-900 font-bold'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

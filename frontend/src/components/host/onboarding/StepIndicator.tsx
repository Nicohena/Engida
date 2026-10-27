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
  { number: 3, title: 'Host & Address', shortTitle: 'Address', icon: Home },
  { number: 4, title: 'Review & Submit', shortTitle: 'Review', icon: Send },
];

export default function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="w-full bg-white/90 backdrop-blur-md border-b border-[#E5E0D5]/60 py-4 px-4 sm:px-8 shadow-xs">
      <div className="max-w-4xl mx-auto">
        {/* Mobile Step Counter & Progress Bar */}
        <div className="sm:hidden mb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#252923] mb-1.5">
            <span>
              Step {currentStep} of {STEPS.length}:{' '}
              <span className="text-[#234B36] font-bold">{STEPS[currentStep - 1]?.title}</span>
            </span>
            <span className="text-[#73776F] font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#EEF3EF] rounded-full h-2 overflow-hidden border border-[#E5E0D5]/40">
            <div
              className="bg-[#234B36] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Desktop Step Nav List */}
        <ol className="hidden sm:grid grid-cols-4 gap-2" role="list">
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
                  className={`w-full flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#234B36] rounded-lg p-2 transition ${
                    isClickable ? 'cursor-pointer hover:bg-[#F8F5ED]' : 'cursor-default'
                  }`}
                  aria-label={`${step.title} - ${
                    isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Upcoming'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition mb-1.5 ${
                      isCompleted
                        ? 'bg-[#234B36] text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[#234B36] text-white ring-4 ring-[#234B36]/20 shadow-xs'
                        : 'bg-[#EEF3EF] text-[#73776F] border border-[#E5E0D5]'
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
                        ? 'text-[#252923] font-bold'
                        : isCompleted
                        ? 'text-[#252923]'
                        : 'text-[#73776F]/70'
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

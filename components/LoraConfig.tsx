'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Info } from 'lucide-react';

interface LoraConfigProps {
  loraModelId: string;
  loraTriggerWord: string;
  onLoraModelChange: (v: string) => void;
  onTriggerWordChange: (v: string) => void;
}

export default function LoraConfig({
  loraModelId,
  loraTriggerWord,
  onLoraModelChange,
  onTriggerWordChange,
}: LoraConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--obsidian-border)] overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4
                   hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[var(--gold)]" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            إعدادات LoRA — ثبات الوجه
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold-muted)] text-[var(--gold)] uppercase tracking-wide">
            متقدم
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-[var(--text-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--text-muted)]" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--obsidian-border)]">
          {/* Info banner */}
          <div className="flex items-start gap-2 bg-[var(--gold-muted)] rounded-xl p-3 mt-4">
            <Info size={13} className="text-[var(--gold)] mt-0.5 shrink-0" />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--gold)]">LoRA</strong> هو نموذج مدرّب مسبقًا على وجه الشخصية.
              قم بتدريبه على Replicate أو HuggingFace باستخدام 15–20 صورة للشخصية,
              ثم الصق معرّف النموذج هنا لضمان ثبات الوجه عبر جميع التوليدات.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="section-label">معرّف نموذج LoRA</p>
              <input
                type="text"
                className="luxury-input text-sm"
                placeholder="username/arab-man-face-lora"
                value={loraModelId}
                onChange={(e) => onLoraModelChange(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <p className="section-label">الكلمة المُحفّزة (Trigger Word)</p>
              <input
                type="text"
                className="luxury-input text-sm"
                placeholder="e.g., sks man, TOK"
                value={loraTriggerWord}
                onChange={(e) => onTriggerWordChange(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

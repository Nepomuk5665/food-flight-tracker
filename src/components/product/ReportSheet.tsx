"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Camera, X, Loader2 } from "lucide-react";
import { getDeviceId } from "@/lib/device-id";
import { compressImage } from "@/lib/image-utils";
import type { ReportCategory } from "@/lib/types";

type ReportSheetProps = {
  open: boolean;
  onClose: () => void;
  lotCode: string;
  barcode: string;
  productName: string;
};

const CATEGORIES: { id: ReportCategory; emoji: string; label: string }[] = [
  { id: "taste_quality", emoji: "🤢", label: "Bad Taste" },
  { id: "appearance", emoji: "👀", label: "Looks Wrong" },
  { id: "packaging", emoji: "📦", label: "Packaging" },
  { id: "foreign_object", emoji: "🔍", label: "Foreign Object" },
  { id: "allergic_reaction", emoji: "⚠️", label: "Allergic Reaction" },
  { id: "other", emoji: "❓", label: "Other" },
];

export function ReportSheet({ open, onClose, lotCode, barcode, productName }: ReportSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const dragging = useRef(false);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDirection(1);
      setSelectedCategory(null);
      setDescription("");
      setPhotoUrl(null);
      setError(null);
      setIsSubmitting(false);
      setDragHeight(null);
    }
  }, [open]);

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  const handleDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    lastY.current = clientY;
    lastTime.current = Date.now();
    velocityY.current = 0;
    dragStartHeight.current = 100;
    dragging.current = true;
    setDragHeight(100);
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragging.current) return;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocityY.current = (clientY - lastY.current) / dt;
    }
    lastY.current = clientY;
    lastTime.current = now;

    const vh = window.innerHeight;
    const deltaPx = dragStartY.current - clientY;
    const deltaPct = (deltaPx / vh) * 100;
    const newHeight = Math.max(0, Math.min(100, dragStartHeight.current + deltaPct));
    setDragHeight(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const h = dragHeight ?? 100;
    const flickDown = velocityY.current > 0.5;

    if (flickDown || h < 70) {
      onClose();
    } else {
      setDragHeight(100);
    }
  }, [dragHeight, onClose]);

  const handleCategorySelect = (categoryId: ReportCategory) => {
    navigator.vibrate?.(50);
    setSelectedCategory(categoryId);
    setDirection(1);
    setTimeout(() => setStep(2), 150);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoUrl(compressed);
    } catch (err) {
      console.error("Failed to compress image", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotCode,
          deviceId: getDeviceId(),
          category: selectedCategory,
          description,
          photoUrl,
        }),
      });

      if (res.status === 429) {
        setError("Too many reports. Please try again later.");
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      navigator.vibrate?.([50, 30, 100]);
      setDirection(1);
      setStep(3);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1 },
  };

  const heightPct = dragHeight !== null ? `${dragHeight}%` : "100%";

  return (
    <AnimatePresence>
      {!open ? null : (
    <div className="fixed inset-0 z-[90] font-sans" data-testid="report-sheet">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60"
        onClick={step === 3 ? onClose : undefined}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[24px] bg-[#FAFAF8] shadow-[0_-8px_40px_rgba(0,0,0,0.15)]"
        style={{ height: heightPct, transform: dragHeight !== null ? `translateY(${100 - dragHeight}%)` : undefined }}
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center px-5 pb-2 pt-3 active:cursor-grabbing"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => handleDragMove(e.clientY)}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => { if (dragging.current) handleDragEnd(); }}
        >
          <div className="mb-3 h-[5px] w-10 rounded-full bg-[#9CA3AF]" />
          <h3 className="text-base font-bold text-[#1A1A1A] select-none">
            Report an Issue
          </h3>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 flex flex-col px-5 pb-8 pt-2"
              >
                <p className="mb-6 text-center text-sm text-[#9CA3AF]">
                  What's wrong with this product?
                </p>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 gap-4"
                >
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        variants={itemVariants}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`flex flex-col items-center justify-center gap-3 rounded-xl border bg-white p-6 transition-all duration-150 ${
                          isSelected
                            ? "border-[#16A34A] bg-[#f0fdf4] scale-95 ring-2 ring-[#16A34A]"
                            : "border-[#E5E7EB] hover:border-[#16A34A]/50 active:scale-95"
                        }`}
                      >
                        <span className="text-4xl">{cat.emoji}</span>
                        <span className="text-sm font-semibold text-[#1A1A1A]">
                          {cat.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 flex flex-col px-5 pb-8 pt-2"
              >
                <div className="mb-6 flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#1A1A1A] transition-colors hover:bg-[#E5E7EB]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2 rounded-full bg-[#f0fdf4] px-3 py-1 text-xs font-bold text-[#16A34A]">
                    <span>{CATEGORIES.find((c) => c.id === selectedCategory)?.emoji}</span>
                    <span>{CATEGORIES.find((c) => c.id === selectedCategory)?.label}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="mb-6">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                      placeholder="Describe the issue (optional)"
                      className="h-32 w-full resize-none rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:outline-none"
                    />
                    <div className="mt-2 text-right text-xs text-[#9CA3AF]">
                      {description.length}/500
                    </div>
                  </div>

                  <div className="mb-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {photoUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={photoUrl}
                          alt="Report photo"
                          className="h-24 w-24 rounded-xl object-cover border border-[#E5E7EB]"
                        />
                        <button
                          onClick={() => setPhotoUrl(null)}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A1A] text-white shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F3F4F6]"
                      >
                        <Camera className="h-4 w-4 text-[#9CA3AF]" />
                        Add Photo
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="mb-4 text-sm font-semibold text-[#dc2626]">
                      {error}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`flex w-full items-center justify-center rounded-xl bg-[#16A34A] py-4 text-xs font-bold uppercase text-white transition-colors hover:bg-[#15803D] disabled:bg-[#86efac] ${isSubmitting ? "animate-pulse" : ""}`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Report"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
                onClick={onClose}
              >
                <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{
                        transform: `rotate(${i * 45}deg)`,
                      }}
                    >
                      <div
                        className="absolute left-1/2 top-1/2 h-2 w-2 -ml-1 -mt-1 rounded-full bg-[#16A34A] opacity-0"
                        style={{
                          animation: `confetti-float 0.8s ease-out forwards`,
                          animationDelay: `${0.1 + i * 0.05}s`,
                        }}
                      />
                    </div>
                  ))}

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="absolute inset-0 rounded-full bg-[#f0fdf4]"
                  />

                  <svg
                    className="relative z-10 h-12 w-12 text-[#16A34A]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                      style={{
                        strokeDasharray: 100,
                        strokeDashoffset: 100,
                        animation: "drawCheck 0.5s ease-out 0.3s forwards",
                      }}
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Thank you!</h2>
                <p className="text-sm text-[#9CA3AF]">
                  Your report has been submitted and will be reviewed by our safety team.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}

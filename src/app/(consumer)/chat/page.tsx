import AiInsights from "@/components/ai-insights";

export default function ChatPage() {
  return (
    <section className="space-y-4 font-sans">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#003a5d]">AI Food Assistant</h1>
        <p className="mt-1 text-sm text-[#777777]">
          Ask about food safety, ingredients, nutrition, or supply chains.
        </p>
      </div>

      <AiInsights
        autoPrompt="Introduce yourself briefly. You are a food safety assistant. Tell the user what you can help with."
        suggestions={[
          "How do I read a Nutri-Score?",
          "What is a cold chain break?",
          "How are food recalls triggered?",
          "What does Eco-Score measure?",
        ]}
      />
    </section>
  );
}

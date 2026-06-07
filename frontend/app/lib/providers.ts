// providers.ts — Shared provider config used by SetupModal and ApiKeyInput.
// All five providers require a key — anonymous inference is not supported.

export type Provider =
  | "huggingface"
  | "huggingface_custom"
  | "anthropic"
  | "gemini"
  | "openai";

export interface ProviderConfig {
  id: Provider;
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  requiresKey: boolean;
  requiresModel: boolean;
  showModel: boolean;
  defaultModel: string;
  modelExamples: string;
  keyPlaceholder: string;
  keyHint: string;
  keyLink: string;
  recommended?: boolean;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    badge: "Free key",
    badgeColor: "bg-sky-100 text-sky-700",
    description: "Gemini 1.5 Flash — best free option, generous quota, instant responses",
    requiresKey: true,
    requiresModel: false,
    showModel: true,
    defaultModel: "gemini-1.5-flash",
    modelExamples: "e.g. gemini-1.5-pro, gemini-2.0-flash",
    keyPlaceholder: "AIza••••••••••••••••••••••••••••••••",
    keyHint: "Get a free key at aistudio.google.com",
    keyLink: "https://aistudio.google.com",
    recommended: true,
  },
  {
    id: "huggingface",
    label: "HuggingFace",
    badge: "Free key",
    badgeColor: "bg-green-100 text-green-700",
    description: "Zephyr-7B-Beta with automatic 5-model fallback — free token required",
    requiresKey: true,
    requiresModel: false,
    showModel: false,
    defaultModel: "HuggingFaceH4/zephyr-7b-beta",
    modelExamples: "",
    keyPlaceholder: "hf_••••••••••••••••••••••••",
    keyHint: "Get a free token at huggingface.co/settings/tokens",
    keyLink: "https://huggingface.co/settings/tokens",
  },
  {
    id: "huggingface_custom",
    label: "HuggingFace Custom",
    badge: "Free key",
    badgeColor: "bg-sky-100 text-sky-700",
    description: "Any public HF model — bring your token and specify the model ID",
    requiresKey: true,
    requiresModel: true,
    showModel: true,
    defaultModel: "",
    modelExamples: "e.g. mistralai/Mistral-7B-Instruct-v0.2",
    keyPlaceholder: "hf_••••••••••••••••••••••••",
    keyHint: "Get a free token at huggingface.co/settings/tokens",
    keyLink: "https://huggingface.co/settings/tokens",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    badge: "Paid",
    badgeColor: "bg-orange-100 text-orange-700",
    description: "Claude 3.5 Haiku by default — fast, smart, excellent at following instructions",
    requiresKey: true,
    requiresModel: false,
    showModel: true,
    defaultModel: "claude-3-5-haiku-20241022",
    modelExamples: "e.g. claude-3-5-sonnet-20241022, claude-3-opus-20240229",
    keyPlaceholder: "sk-ant-••••••••••••••••••••••••",
    keyHint: "Get a key at console.anthropic.com",
    keyLink: "https://console.anthropic.com",
  },
  {
    id: "openai",
    label: "OpenAI",
    badge: "Paid",
    badgeColor: "bg-amber-100 text-amber-700",
    description: "GPT-4o-mini by default — best reasoning quality, pay-per-use",
    requiresKey: true,
    requiresModel: false,
    showModel: true,
    defaultModel: "gpt-4o-mini",
    modelExamples: "e.g. gpt-4o, gpt-4-turbo, gpt-3.5-turbo",
    keyPlaceholder: "sk-••••••••••••••••••••••••••••••••",
    keyHint: "Get a key at platform.openai.com/api-keys",
    keyLink: "https://platform.openai.com/api-keys",
  },
];

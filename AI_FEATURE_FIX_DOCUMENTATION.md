# 🧠 Medora AI Engine: Production-Grade Engineering Blueprint

This document represents the definitive technical documentation for the Medora AI ecosystem. It covers the architecture, the request lifecycle, the provider-specific nuances, and a post-mortem of critical failure points and their resolutions.

---

## 0. System Overview

The Medora AI Engine is a multi-provider, client-side intelligence layer designed to assist medical professionals in clinical reasoning, note-taking, and diagnostic insights without relying on a centralized backend.

### Key Features:
*   **CasePearl**: Generates concise clinical summaries from raw patient logs and investigations.
*   **Insights**: Performs real-time pattern matching to suggest potential differential diagnoses or missed investigation steps.
*   **GroupPearl**: Analyzes batches of cases to identify clinical trends, workload distribution, and educational gaps.

### Why This System Exists?
Modern clinical documentation is fragmented. The AI Engine serves as a "Clinical Co-pilot" that reduces cognitive load by synthesizing complex medical data into actionable pearls of wisdom, all while maintaining strict local privacy.

---

## 1. 🏗️ Architecture (Deep Dive)

The system follows a strictly decoupled **layered architecture** to ensure provider-agnosticism and high maintainability.

### Layered Responsibilities:
1.  **UI Layer (React Components)**: `CaseCard`, `PearlModal`. Responsible for triggering AI events and rendering markdown-formatted responses.
2.  **AI Service Layer (`aiService.ts`)**: The high-level orchestrator. It manages caching, rate limiting, and PHI (Patient Health Information) de-identification.
3.  **Adapter Layer (`adapters/`)**: Implements the **Adapter Pattern**. This layer translates the app's internal "System Prompt" format into the specific JSON schema required by each provider (Gemini, OpenAI, Anthropic, etc.).
4.  **Provider Layer (External APIs)**: The actual LLM endpoints (Google, Hugging Face, Anthropic).

### Why Adapter Pattern?
AI providers change their APIs frequently. By using the Adapter Pattern, the rest of the application remains unchanged even if we switch from Gemini to Claude; only the specific provider adapter needs modification.

### Data Flow Diagram:
`UI Event` → `PHI Sanitization` → `Prompt Assembly` → `Service Orchestrator` → `Specific Adapter` → `Network Request` → `Response Parsing` → `Cache Update` → `UI Update`

---

## 2. 🧱 Core System Design

### 2.1. `aiService.ts` (The Orchestrator)
The central nervous system. It decides which provider to use based on the user's settings and orchestrates the flow from request to response.

### 2.2. `adapters/` (Translation Layer)
*   **GeminiAdapter**: Handles Google's specific `generateContent` payload structure.
*   **HuggingFaceAdapter**: Interfaces with the unified Router system using OpenAI-compatible messaging.
*   **ClaudeAdapter**: Specially configured to bypass browser CORS and handle Anthropic's custom header requirements.

### 2.3. Utility Modules:
*   **`aiCache.ts`**: Implements a TTL (Time-To-Live) cache to avoid redundant API calls and save tokens.
*   **`aiRateLimiter.ts`**: Prevents "429 Too Many Requests" errors by queuing and spacing out calls during heavy usage (e.g., GroupPearl).
*   **`aiErrorHandler.ts`**: Translates cryptic HTTP error codes into user-friendly clinical error messages.
*   **`aiPrompts.ts`**: The "Prompt Engineering" repository. Contains the base system instructions that give Medora its "Medical Voice".
*   **`aiConfig.ts`**: Centralized configuration for model names, temperatures, and stop sequences.

---

## 3. 🔄 Request Lifecycle

1.  **Prompt Creation**: The system takes clinical data and wraps it in a "System Instruction" from `aiPrompts.ts`.
2.  **De-identification**: CRITICAL STEP. The `aiDeidentify.ts` module scans for names, MRNs, and specific dates, replacing them with placeholders (e.g., `[PATIENT_NAME]`).
3.  **Provider Selection**: The service reads the user's `VITE_AI_PROVIDER` setting.
4.  **Adapter Formatting**: The selected adapter converts the unified message array into a provider-specific JSON body.
5.  **API Call**: A fetch request is dispatched with relevant headers (CORS flags, API keys).
6.  **Response Parsing**: The adapter safely extracts the text content from deeply nested JSON fields.
7.  **Error Handling**: If a 4xx or 5xx occurs, the error handler decides if a retry is possible.
8.  **Caching**: The sanitized response is stored in `aiCache` against a hash of the original prompt.
9.  **UI Rendering**: The final clinical pearl is rendered in the app using a markdown-ready container.

---

## 4. 🔦 Provider Deep Dive

### Google Gemini
*   **API Structure**: Uses the `v1beta` endpoint for latest feature support.
*   **Model Differences**: `flash` is used for CasePearl (speed), while `pro` is used for GroupPearl (reasoning).
*   **Common Error**: "Safety Filter" blocks can return empty content if clinical text is misinterpreted as "dangerous".

### Hugging Face
*   **Router System**: Uses the unified `router.huggingface.co/v1/chat/completions` endpoint.
*   **Format**: Strictly follows the OpenAI `messages` array format.

### Claude (Anthropic)
*   **CORS Limitation**: Anthropic explicitly blocks browser-side fetch calls unless the safety flag is passed.
*   **Header nuances**: Requires `x-api-key` instead of a Bearer token.

---

## 5. 🛠️ Failure Analysis (Engineering Post-Mortem)

*(Expanded from the original fix documentation)*

### 5.1. Gemini API Endpoint Resolution Failure
*   **WHY**: The system tried to use a generic config generator that miscalculated the URL path.
*   **Broken Code**: `const url = config.endpoint(model);`
*   **Fixed Code**: Hardened internal constructor `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`.
*   **Debugging**: Identified using "Copy as cURL" from Chrome Network tab and seeing the 404 error.

### 5.2. Hugging Face Serverless Decommissioning
*   **WHY**: HF shut down its old model-specific endpoints in favor of a centralized router.
*   **Broken Payload**: `{ inputs: prompt }`
*   **Fixed Payload**: `{ model: model, messages: [...] }`
*   **Refactoring**: Migrated from legacy `api-inference` to modern `router`.

### 5.3. Claude (Anthropic) CORS & Headers
*   **WHY**: Browsers block Anthropic requests to prevent key leaking, and Anthropic uses non-standard headers.
*   **The Fix**: Injected `anthropic-dangerous-direct-browser-access: true` and replaced `Authorization` with `x-api-key`.

---

## 6. 🧪 Testing System

*   **Unit Testing (`vitest`)**: Every adapter is tested against mock responses to ensure parsing is resilient to JSON structural changes.
*   **Isolation Testing (`scratch/`)**: Scripts like `scratch_hf_test.ts` allow testing the network layer without booting the entire React application.
*   **Failure Simulation**: Test suites explicitly mock "429 Rate Limit" and "500 Server Error" to verify that the UI doesn't crash.

---

## 7. 📈 Performance & Security

### Performance
*   **Token Optimization**: Prompts are trimmed to remove redundant hospital headers before sending.
*   **Retry Strategy**: Exponential backoff is used for "Rate Limit" errors.

### Security (PHI Safety)
*   **Local-Only Keys**: API keys are stored in `EncryptedStorage` on-device.
*   **Sanitization logic**: Uses regex-based stripping to ensure no PII reaches the AI providers' training logs.

---

## 8. 🛠️ Step-by-Step Rebuild Guide

Use this checklist to implement the AI module from scratch:

1.  [ ] Define `AIProvider` and `AIModel` types in `aiConfig.ts`.
2.  [ ] Implement a generic `BaseAdapter` class.
3.  [ ] Create `GeminiAdapter` with `generateContent` mapping.
4.  [ ] Create `HuggingFaceAdapter` with OpenAI-compatible mapping.
5.  [ ] Build the `aiDeidentify` utility with medical-standard PII filters.
6.  [ ] Create `aiService.ts` as the central singleton to manage provider state.
7.  [ ] Integrated `aiCache` (localStorage-based) to save user API costs.
8.  [ ] Add `Claude` header overrides for browser-direct access.
9.  [ ] Deploy `PearlModal` to consume the service.
10. [ ] Verify all network calls in Chrome DevTools to ensure zero PII leakage.

---

## 📎 Original Input Document (For Reference)

> AI Feature Fix Documentation
>
> ## Overview
> During the testing and integration of the AI features (CasePearl, Insights, GroupPearl), several issues were identified relating to both the Gemini and Hugging Face API connectivity and AI service configurations.
>
> ### 1. Gemini API Endpoint Resolution Failure
> Issue: The GeminiAdapter was failing to correctly construct the API endpoint.
> Fix: Refactored the GeminiAdapter.ts to compute and construct the proper current Google API endpoint structure internally:
> `return https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey};`
>
> ### 2. Outdated Gemini Model Definitions
> Issue: Application was using gemini-1.5-flash.
> Fix: Upgraded to next-gen models like gemini-3-flash-preview.
>
> ### 3. Hugging Face Serverless API Deprecation
> Issue: HF closed api-inference.huggingface.co/models/...
> Fix: Migrated to unified router: https://router.huggingface.co/v1/chat/completions and used messages array schema.
>
> ### 5. Claude (Anthropic) Browser Access Errors
> Issue: CORS errors and header mismatch (Authorization vs x-api-key).
> Fix: Passed anthropic-dangerous-direct-browser-access: true and dynamically switched to x-api-key headers.

---
*Documentation Expansion by System Architect AI - April 2026*

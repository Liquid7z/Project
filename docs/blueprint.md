# **App Name**: LiqAI

## Core Features:

- User Authentication: Secure authentication using Firebase Auth with email/password and Google login. Stores user profiles in Firestore.
- Premium Subscription System: Manages free and premium tiers with feature limitations enforced by Cloud Functions. Stores subscription data in Firestore.
- Handwriting Analysis: Analyzes uploaded handwriting samples (PNG/JPG/PDF) to build a handwriting style model. Stores results in Firestore and raw files in Storage.
- Content Input: Allows users to input assignment content via typing, pasting, or uploading PDF/DOCX files with automatic text extraction.
- AI Handwriting Generation: Generates realistic handwritten output from input text using the user's handwriting style model; the LLM acts as a tool to make decisions about how and when to best use handwriting styles during generation. Generates PDF and PNG pages with natural imperfections. Stores output in Storage and metadata in Firestore (premium users).
- Firebase Cloud Functions: Handles handwriting analysis, text extraction, assignment generation, free user limit enforcement, and premium plan management. Ensures functions are secure, scalable, and optimized.

## Style Guidelines:

- Primary: Electric Indigo #6F00FF
- Background: Dark Charcoal #222222
- Accent: Cyan #00FFFF for neon highlights
- Headlines & short body text: Space Grotesk
- Longer body paragraphs: Inter
- Code snippets: Source Code Pro
- Neon glowing buttons
- Smooth animations and hover transitions
- Futuristic, glowing icons
- Holographic glass panels with soft blur
- Cyberpunk-inspired UI elements
- High-contrast, game dashboard layout
- Animated loading screens (AI processing, handwriting generation)
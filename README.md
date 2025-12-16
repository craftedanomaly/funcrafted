# fun.crafted - AI-Powered Games

A playful "neil.fun" style web application featuring AI-powered games built with Next.js, Tailwind CSS, and Google Gemini.

🎮 **Live at:** [fun.craftedanomaly.com](https://fun.craftedanomaly.com)

## 🎯 Games

### 1. Who Am I?
A classic guessing game powered by AI. Choose to either:
- **Guess Mode:** AI thinks of something, you ask yes/no questions to figure it out
- **Ask Mode:** You become someone/something, AI tries to guess who you are

### 2. AI Logline Creator
Spin the slot machine to get random elements (Protagonist + Setting + Goal), then let AI generate a hilarious movie logline! Create a movie poster with your custom title.

### 3. AI or Not?
Test your skills! Can you tell the difference between AI-generated and real images? Race against the clock with 10 seconds per image.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Google Gemini API Key (free tier works!)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd funcrafted
```

2. Install dependencies:
```bash
npm install
```

3. Create your environment file:
```bash
# Create .env.local in the project root
# Add your Gemini API key:
GEMINI_API_KEY=your_api_key_here
```

4. Add images for "AI or Not?" game:
   - Place images in `public/ai-or-not/`
   - Name them: `image1.jpg`, `image2.jpg`, etc.
   - Update `src/app/ai-or-not/imageConfig.ts` to mark which are AI vs Real

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **AI:** Google Gemini API

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page with Bento Grid
│   ├── who-am-i/             # Who Am I? game
│   ├── logline-slots/        # AI Logline Creator
│   └── ai-or-not/            # AI or Not? game
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── GameCard.tsx
│   └── QuotaErrorOverlay.tsx # Friendly error for rate limits
└── lib/
    └── gemini.ts             # Gemini API wrapper with error handling
```

## ⚠️ API Rate Limits

This app is designed to work with Gemini's free tier. If you hit rate limits:
- A friendly "brain fried" overlay appears
- Users are asked to wait and try again
- No ugly error codes shown!

## 📝 License

MIT

## 🙏 Credits

Made with ❤️ by [Crafted Anomaly](https://craftedanomaly.com)

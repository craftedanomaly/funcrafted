export interface ImageData {
  id: number;
  filename: string;
  isAI: boolean;
  source?: string;
}

// Configuration for AI or Not game images
// Place images in public/ai-or-not/ folder
// Naming convention: image1.jpg, image2.jpg, etc.
export const imageConfig: ImageData[] = [
  { id: 1, filename: "image1.jpg", isAI: true },
  { id: 2, filename: "image2.jpg", isAI: false },
  { id: 3, filename: "image3.jpg", isAI: true },
  { id: 4, filename: "image4.jpg", isAI: false },
  { id: 5, filename: "image5.jpg", isAI: true },
  { id: 6, filename: "image6.jpg", isAI: false },
  { id: 7, filename: "image7.jpg", isAI: true },
  { id: 8, filename: "image8.jpg", isAI: false },
  { id: 9, filename: "image9.jpg", isAI: true },
  { id: 10, filename: "image10.jpg", isAI: false },
  { id: 11, filename: "image11.jpg", isAI: true },
  { id: 12, filename: "image12.jpg", isAI: false },
  { id: 13, filename: "image13.jpg", isAI: true },
  { id: 14, filename: "image14.jpg", isAI: false },
  { id: 15, filename: "image15.jpg", isAI: true },
  { id: 16, filename: "image16.jpg", isAI: false },
  { id: 17, filename: "image17.jpg", isAI: true },
  { id: 18, filename: "image18.jpg", isAI: false },
  { id: 19, filename: "image19.jpg", isAI: true },
  { id: 20, filename: "image20.jpg", isAI: false },
];

export function getRandomImages(count: number = 12): ImageData[] {
  const shuffled = [...imageConfig].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getScoreMessage(score: number): {
  title: string;
  emoji: string;
  description: string;
} {
  if (score <= 20) {
    return {
      title: "ARE YOU A BOT?",
      emoji: "🤖",
      description: "Hmm... you seem to think like an AI. Suspicious!",
    };
  } else if (score <= 80) {
    return {
      title: "AVERAGE HUMAN",
      emoji: "😐",
      description: "Not bad! You've got some human intuition left.",
    };
  } else {
    return {
      title: "HUMAN EXPERT",
      emoji: "🦅",
      description: "Eagle eyes! You can spot AI from a mile away!",
    };
  }
}

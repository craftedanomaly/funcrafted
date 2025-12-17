"use server";

import { geminiGenerateText } from "@/lib/gemini";

// Achievement IDs
export const ACHIEVEMENTS = {
  FIRST_BUY: { id: "ACH_FIRST_BUY", name: "First Buy", desc: "Made your first order", icon: "🛒" },
  PLASTIC_LOVER: { id: "ACH_PLASTIC", name: "Plastic Lover", desc: "Ordered something made of plastic", icon: "🥤" },
  TREE_HATER: { id: "ACH_TREE_HATER", name: "Tree Hater", desc: "Ordered something paper/wood based", icon: "🪓" },
  TECH_BRO: { id: "ACH_TECH_BRO", name: "Tech Bro", desc: "Ordered a gadget or crypto-related item", icon: "💻" },
  CARNIVORE: { id: "ACH_CARNIVORE", name: "Carnivore", desc: "Ordered a meat product", icon: "🥩" },
  FASHION_VICTIM: { id: "ACH_FASHION", name: "Fashion Victim", desc: "Ordered clothing/fast fashion", icon: "👗" },
  WATER_WASTER: { id: "ACH_WATER", name: "Water Waster", desc: "Item requiring >1000L water", icon: "💧" },
  CARBON_BABY: { id: "ACH_CARBON_BABY", name: "Carbon Baby", desc: "< 10 kg CO2 impact", icon: "👶" },
  CLIMATE_CHANGER: { id: "ACH_CLIMATE", name: "Climate Changer", desc: "> 1,000 kg CO2 impact", icon: "🌡️" },
  EXTINCTION_EVENT: { id: "ACH_EXTINCTION", name: "Extinction Event", desc: "> 10,000 kg CO2 impact", icon: "☄️" },
  OCEAN_CHOKER: { id: "ACH_OCEAN", name: "Ocean Choker", desc: "Ordered 5 items in a row", icon: "🐢" },
  FREQUENT_FLYER: { id: "ACH_FLYER", name: "Frequent Flyer", desc: "Ordered something involving air travel", icon: "✈️" },
  GOLD_DIGGER: { id: "ACH_GOLD", name: "Gold Digger", desc: "Ordered jewelry or gold", icon: "💎" },
  BATTERY_ACID: { id: "ACH_BATTERY", name: "Battery Acid", desc: "Ordered an EV or battery product", icon: "🔋" },
  SINGLE_USE: { id: "ACH_SINGLE_USE", name: "Single Use", desc: "Ordered a straw or plastic cup", icon: "🥤" },
  INFINITE_LOOPER: { id: "ACH_LOOPER", name: "Infinite Looper", desc: "Ordered the same thing twice", icon: "🔄" },
  NOTHING: { id: "ACH_NOTHING", name: "Nothing", desc: "Ordered 'Nothing' or 'Void'", icon: "🕳️" },
  THE_ONE_PERCENT: { id: "ACH_ONE_PERCENT", name: "The 1%", desc: "Ordered a Yacht or Mansion", icon: "🛥️" },
  GREENWASHER: { id: "ACH_GREENWASH", name: "Greenwasher", desc: "Ordered something 'Eco-friendly'", icon: "🌿" },
  GAME_OVER: { id: "ACH_GAME_OVER", name: "Game Over", desc: "Reached 1 Million kg CO2 lifetime", icon: "💀" },
} as const;

export type AchievementId = typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS]["id"];

export interface OrderStep {
  icon: string;
  title: string;
  desc: string;
}

export interface OrderResult {
  steps: OrderStep[];
  totalImpactValue: number;
  totalImpactLabel: string;
  finalMessage: string;
  unlockedAchievements: AchievementId[];
}

const SYSTEM_PROMPT = `You are the cheerful AI of a hyper-consumerist logistics company called "EverythingNow™".
The user will send an ITEM name they want to "order".

Your job is to generate a satirical, darkly comedic "Order Tracking" timeline that reveals the environmental destruction required to make that item, but describes it with TOXIC POSITIVITY and excessive happiness.

RULES:
1. Generate EXACTLY 5 steps describing the production/delivery journey
2. Each step should reveal environmental impact (deforestation, pollution, labor exploitation, emissions, etc.) but frame it as a POSITIVE achievement
3. Use cheerful language, emojis, and corporate-speak
4. Estimate a realistic 'Total Carbon Score' in kg CO2 (be creative but somewhat realistic)
5. Assign 1-3 relevant Achievement IDs from this list:
   - ACH_PLASTIC: plastic items
   - ACH_TREE_HATER: paper/wood items
   - ACH_TECH_BRO: gadgets, phones, crypto
   - ACH_CARNIVORE: meat products
   - ACH_FASHION: clothing, fast fashion
   - ACH_WATER: items needing >1000L water (jeans, cotton, beef)
   - ACH_CLIMATE: if CO2 > 1000kg
   - ACH_EXTINCTION: if CO2 > 10000kg
   - ACH_FLYER: air travel involved
   - ACH_GOLD: jewelry, gold, diamonds
   - ACH_BATTERY: EVs, batteries, electronics
   - ACH_SINGLE_USE: straws, cups, disposables
   - ACH_ONE_PERCENT: yachts, mansions, private jets
   - ACH_GREENWASH: "eco-friendly" items that aren't really
   - ACH_NOTHING: if user orders "nothing", "void", "air"
   - ACH_CARBON_BABY: if CO2 < 10kg

OUTPUT ONLY VALID JSON (no markdown, no code blocks):
{
  "steps": [
    { "icon": "🪓", "title": "Raw Materials Acquired!", "desc": "We cleared 2 acres of rainforest just for you! The orangutans waved goodbye! 🦧👋" },
    { "icon": "🏭", "title": "Manufacturing Magic!", "desc": "Our factory ran 24/7 with coal power! The smoke signals spell 'progress'! 💨" },
    { "icon": "🚢", "title": "Global Journey!", "desc": "Shipped across 3 oceans! The dolphins love racing our cargo ships! 🐬" },
    { "icon": "✈️", "title": "Express Air Delivery!", "desc": "Flew 5,000 miles because you're worth it! Jet fuel is just liquid enthusiasm! ⛽" },
    { "icon": "📦", "title": "At Your Door!", "desc": "Wrapped in 47 layers of plastic for that premium unboxing experience! 🎁" }
  ],
  "totalImpactValue": 1500,
  "totalImpactLabel": "1,500 kg CO2",
  "finalMessage": "The polar bears are waving goodbye! Thanks for shopping with EverythingNow™! 🐻‍❄️👋",
  "unlockedAchievements": ["ACH_PLASTIC", "ACH_FLYER"]
}`;

export async function generateOrder(itemName: string): Promise<{ success: true; data: OrderResult } | { success: false; error: string }> {
  if (!itemName || itemName.trim().length === 0) {
    return { success: false, error: "Please enter an item name" };
  }

  const prompt = `Generate an order tracking timeline for: "${itemName.trim()}"`;

  const result = await geminiGenerateText({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    // Clean the response - remove markdown code blocks if present
    let jsonStr = result.data.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr) as OrderResult;

    // Validate the response
    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error("Invalid response format");
    }

    // Ensure totalImpactValue is a number
    if (typeof parsed.totalImpactValue !== "number") {
      parsed.totalImpactValue = parseInt(String(parsed.totalImpactValue).replace(/[^0-9]/g, "")) || 100;
    }

    // Add FIRST_BUY achievement (will be handled client-side)
    // Add score-based achievements
    if (parsed.totalImpactValue < 10 && !parsed.unlockedAchievements.includes("ACH_CARBON_BABY")) {
      parsed.unlockedAchievements.push("ACH_CARBON_BABY");
    }
    if (parsed.totalImpactValue > 1000 && !parsed.unlockedAchievements.includes("ACH_CLIMATE")) {
      parsed.unlockedAchievements.push("ACH_CLIMATE");
    }
    if (parsed.totalImpactValue > 10000 && !parsed.unlockedAchievements.includes("ACH_EXTINCTION")) {
      parsed.unlockedAchievements.push("ACH_EXTINCTION");
    }

    return { success: true, data: parsed };
  } catch (e) {
    console.error("Failed to parse Gemini response:", result.data);
    return { success: false, error: "Failed to process order. Please try again!" };
  }
}

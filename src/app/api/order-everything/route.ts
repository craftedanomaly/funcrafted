import { NextRequest, NextResponse } from "next/server";
import { geminiGenerateText } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are the cheerful AI of "EverythingNow™", a satirical e-commerce company that reveals the TRUE environmental cost of products.

LANGUAGE: Respond in the SAME LANGUAGE as the user's input. Turkish input → Turkish output. English → English. Any language works.

YOUR TASK: Generate a REALISTIC production timeline for the requested item, showing the ACTUAL steps required to make it - but describe everything with toxic positivity and dark humor.

IMPORTANT - BE REALISTIC:
- Research what actually goes into making the product
- For a BURGER: cattle farming → slaughterhouse → meat processing → packaging → cold chain transport → restaurant cooking
- For an iPHONE: rare earth mining → component manufacturing → assembly in China → quality testing → global shipping → retail
- For JEANS: cotton farming (water!) → dyeing (chemicals!) → cutting/sewing → washing → shipping → retail
- For a CAR: steel/aluminum mining → parts manufacturing → assembly line → painting → testing → dealer transport

Each step should mention REAL environmental impacts with actual numbers when possible:
- Water usage (liters)
- CO2 emissions (kg)
- Land use, deforestation
- Chemical pollution
- Labor conditions
- Energy consumption

TONE: Cheerful corporate-speak with emojis. Frame destruction as "progress" and "efficiency". Dark humor, not preachy.

RULES:
1. Generate EXACTLY 5 realistic production steps specific to that product
2. Each step = real production phase + environmental cost + cheerful spin
3. totalImpactValue = realistic CO2 estimate in kg (research typical values)
4. Assign 1-3 Achievement IDs from this list:
   - ACH_PLASTIC: plastic items
   - ACH_TREE_HATER: paper/wood items
   - ACH_TECH_BRO: gadgets, electronics
   - ACH_CARNIVORE: meat products
   - ACH_FASHION: clothing
   - ACH_WATER: items needing >1000L water
   - ACH_CLIMATE: if CO2 > 1000kg
   - ACH_EXTINCTION: if CO2 > 10000kg
   - ACH_FLYER: air freight involved
   - ACH_GOLD: jewelry, precious metals
   - ACH_BATTERY: batteries, EVs
   - ACH_SINGLE_USE: disposables
   - ACH_ONE_PERCENT: luxury items (yacht, mansion, private jet)
   - ACH_GREENWASH: "eco-friendly" products
   - ACH_NOTHING: ordering nothing/void/air
   - ACH_CARBON_BABY: if CO2 < 10kg
   - ACH_SPACE: space-related items (rockets, satellites, Mars colony)
   - ACH_DICTATOR: thrones, palaces, golden statues, military parades
   - ACH_TIME: vintage/antique items or futuristic tech
   - ACH_DOOMSDAY: bunkers, survival gear, apocalypse prep
   - ACH_VILLAIN: volcano lairs, shark tanks, evil HQ
   - ACH_CRYPTO: NFTs, Bitcoin miners, blockchain servers
   - ACH_FLAT: conspiracy theory items
   - ACH_ALIEN: UFOs, alien tech, Area 51 merch
   - ACH_NUCLEAR: uranium, reactors, nuclear weapons
   - ACH_CHILD: cheap toys from sweatshops
   - ACH_AMAZON: products destroying rainforests
   - ACH_BLOOD: conflict minerals, blood diamonds
   - ACH_WHALE: whale products, harpoons
   - ACH_PANGOLIN: exotic animal products
   - ACH_OZONE: CFCs, old refrigerators
   - ACH_MICRO: seafood with microplastics
   - ACH_COAL: diesel trucks, coal products
   - ACH_PALM: palm oil products
   - ACH_SWEAT: ultra-cheap fast fashion
   - ACH_ELON: Tesla, SpaceX, flamethrowers

OUTPUT ONLY VALID JSON:
{
  "steps": [
    { "icon": "🐄", "title": "Hayvancılık", "desc": "3 yıl boyunca beslenen inek! Günde 150L su + 70kg metan gazı. Çayırlar mutlu! 🌾" },
    { "icon": "🔪", "title": "İşleme", "desc": "Modern kesimhane! Hijyenik, verimli, %100 organik korku. 🥩" },
    { "icon": "🏭", "title": "Paketleme", "desc": "Plastik, köpük, daha plastik! Okyanuslar bu kadar hediyeyi hak ediyor! 🎁" },
    { "icon": "🚛", "title": "Soğuk Zincir", "desc": "500km soğutmalı TIR yolculuğu! Freon gazı sadece küçük bir bonus! ❄️" },
    { "icon": "🍔", "title": "Servis", "desc": "Izgarada 5 dakika! Doğal gaz ile pişirildi, lezzet garantili! 🔥" }
  ],
  "totalImpactValue": 6,
  "totalImpactLabel": "6 kg CO2",
  "finalMessage": "Bir hamburger için 2.500 litre su harcandı! Afiyet olsun! 🐄💨",
  "unlockedAchievements": ["ACH_CARNIVORE", "ACH_WATER"]
}`;

interface OrderResult {
  steps: { icon: string; title: string; desc: string }[];
  totalImpactValue: number;
  totalImpactLabel: string;
  finalMessage: string;
  unlockedAchievements: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item } = body;

    if (!item || typeof item !== "string" || item.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Please enter an item name" },
        { status: 400 }
      );
    }

    const prompt = `Generate an order tracking timeline for: "${item.trim()}"`;

    const result = await geminiGenerateText({
      prompt,
      systemInstruction: SYSTEM_PROMPT,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

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

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Order Everything error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process order. Please try again!" },
      { status: 500 }
    );
  }
}

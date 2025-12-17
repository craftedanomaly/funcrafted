// Achievement IDs
export const ACHIEVEMENTS = {
  // Original achievements
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
  // Absurd achievements
  SPACE_DELIVERY: { id: "ACH_SPACE", name: "Space Delivery", desc: "Ordered something from space or for space", icon: "🚀" },
  DICTATOR_SPECIAL: { id: "ACH_DICTATOR", name: "Dictator Special", desc: "Ordered a throne, palace, or golden statue", icon: "👑" },
  TIME_TRAVELER: { id: "ACH_TIME", name: "Time Traveler", desc: "Ordered something from the past or future", icon: "⏰" },
  DOOMSDAY_PREPPER: { id: "ACH_DOOMSDAY", name: "Doomsday Prepper", desc: "Ordered a bunker or survival gear", icon: "🏚️" },
  VILLAIN_STARTER: { id: "ACH_VILLAIN", name: "Villain Starter Kit", desc: "Ordered a volcano lair or shark tank", icon: "🦈" },
  CRYPTO_BRO: { id: "ACH_CRYPTO", name: "Crypto Bro", desc: "Ordered NFT, Bitcoin miner, or blockchain", icon: "₿" },
  FLAT_EARTHER: { id: "ACH_FLAT", name: "Flat Earther", desc: "Ordered a telescope to 'prove' flat earth", icon: "🌍" },
  ALIEN_CONTACT: { id: "ACH_ALIEN", name: "Alien Contact", desc: "Ordered alien tech or UFO parts", icon: "👽" },
  NUCLEAR_OPTION: { id: "ACH_NUCLEAR", name: "Nuclear Option", desc: "Ordered uranium, reactor, or nuke", icon: "☢️" },
  CHILD_LABOR: { id: "ACH_CHILD", name: "Child Labor", desc: "Ordered cheap toys or fast fashion", icon: "🧸" },
  AMAZON_PRIME: { id: "ACH_AMAZON", name: "Amazon Prime", desc: "Ordered something that destroys the Amazon", icon: "🌳" },
  BLOOD_DIAMOND: { id: "ACH_BLOOD", name: "Blood Diamond", desc: "Ordered conflict minerals or gems", icon: "💎" },
  WHALE_HUNTER: { id: "ACH_WHALE", name: "Whale Hunter", desc: "Ordered whale products or harpoons", icon: "🐋" },
  PANGOLIN_LOVER: { id: "ACH_PANGOLIN", name: "Pangolin Lover", desc: "Ordered exotic animal products", icon: "🦔" },
  OZONE_DESTROYER: { id: "ACH_OZONE", name: "Ozone Destroyer", desc: "Ordered CFCs or old refrigerators", icon: "🕳️" },
  MICROPLASTIC_CHEF: { id: "ACH_MICRO", name: "Microplastic Chef", desc: "Ordered seafood full of microplastics", icon: "🦐" },
  COAL_ROLLER: { id: "ACH_COAL", name: "Coal Roller", desc: "Ordered diesel truck or coal products", icon: "🚛" },
  PALM_OIL_KING: { id: "ACH_PALM", name: "Palm Oil King", desc: "Ordered products with palm oil", icon: "🌴" },
  SWEATSHOP_SUPPORTER: { id: "ACH_SWEAT", name: "Sweatshop Supporter", desc: "Ordered ultra-cheap clothing", icon: "👕" },
  ELON_WANNABE: { id: "ACH_ELON", name: "Elon Wannabe", desc: "Ordered Tesla, SpaceX merch, or flamethrower", icon: "🔥" },
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

// ============================================================
//  nutritionDatabase.js  —  Food Query Service
// ============================================================
//  Provides methods for searching food, getting recents, and 
//  getting favorites. Designed to easily swap the mock data 
//  for a real external API later (like Edamam or FatSecret).
// ============================================================

// Standard food object model expected by the UI:
// {
//   id: "db-123",
//   name: "Food Name",
//   servingSize: "100g",
//   caloriesPer100g: 100,
//   proteinPer100g: 20,
//   carbsPer100g: 10,
//   fatPer100g: 5
// }

// Mock DB of common foods
const MOCK_DB = [
    { id: "f1", name: "Chicken Breast (Raw)", servingSize: "100g", caloriesPer100g: 120, proteinPer100g: 22.5, carbsPer100g: 0, fatPer100g: 2.6 },
    { id: "f2", name: "Chicken Breast (Cooked)", servingSize: "100g", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
    { id: "f3", name: "White Rice (Cooked)", servingSize: "100g", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
    { id: "f4", name: "Brown Rice (Cooked)", servingSize: "100g", caloriesPer100g: 111, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9 },
    { id: "f5", name: "Oats (Raw)", servingSize: "100g", caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66.3, fatPer100g: 6.9 },
    { id: "f6", name: "Eggs", servingSize: "100g", caloriesPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatPer100g: 9.5 }, // ~2 large eggs
    { id: "f7", name: "Avocado", servingSize: "100g", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 14.7 },
    { id: "f8", name: "Banana", servingSize: "100g", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3 },
    { id: "f9", name: "Apple", servingSize: "100g", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2 },
    { id: "f10", name: "Salmon (Raw)", servingSize: "100g", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
    { id: "f11", name: "Greek Yogurt (0% Fat)", servingSize: "100g", caloriesPer100g: 59, proteinPer100g: 10.3, carbsPer100g: 3.6, fatPer100g: 0.4 },
    { id: "f12", name: "Sweet Potato (Baked)", servingSize: "100g", caloriesPer100g: 90, proteinPer100g: 2, carbsPer100g: 21, fatPer100g: 0.15 },
    { id: "f13", name: "Almonds", servingSize: "100g", caloriesPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatPer100g: 49.9 },
    { id: "f14", name: "Peanut Butter", servingSize: "100g", caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
    { id: "f15", name: "Whey Protein Powder", servingSize: "100g", caloriesPer100g: 379, proteinPer100g: 78.4, carbsPer100g: 6.2, fatPer100g: 3.3 },
    { id: "f16", name: "Broccoli", servingSize: "100g", caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 6.6, fatPer100g: 0.4 },
    { id: "f17", name: "Olive Oil", servingSize: "100g", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
];

/**
 * Searches the food database matching the given query string.
 * Simulates network latency (300ms delay).
 * 
 * @param {string} query 
 * @returns {Promise<Array>} Array of food objects
 */
export async function search(query) {
    if (!query || query.trim() === "") return [];
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const lowerQuery = query.toLowerCase().trim();
    return MOCK_DB.filter(food => food.name.toLowerCase().includes(lowerQuery)).slice(0, 20);
}

/**
 * Returns mock "Recent Foods" for the user.
 * In a real implementation, this would query the user's `meals` subcollection.
 * 
 * @returns {Promise<Array>} Array of food objects
 */
export async function getRecent() {
    await new Promise(resolve => setTimeout(resolve, 150));
    // Return a random mix to simulate recent foods
    return [MOCK_DB[0], MOCK_DB[2], MOCK_DB[5], MOCK_DB[10], MOCK_DB[7]];
}

/**
 * Returns mock "Favorite Foods" for the user.
 * In a real implementation, this would query the user's `meals` subcollection where favorite == true.
 * 
 * @returns {Promise<Array>} Array of food objects
 */
export async function getFavorites() {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [MOCK_DB[1], MOCK_DB[4], MOCK_DB[6], MOCK_DB[14]];
}

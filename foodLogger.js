// ============================================================
//  foodLogger.js  —  Firestore Data Layer for Meals
// ============================================================
//  Handles atomic logging of meals and aggregates daily totals.
// ============================================================

import { db, auth } from "./firebase.js";
import { 
    doc, 
    collection, 
    runTransaction,
    serverTimestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Logs a new meal and atomically increments the daily log totals.
 * @param {Object} mealData 
 */
export async function logMeal(mealData) {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;
    const dateStr = getLocalDateString();
    
    const mealDocRef = doc(collection(db, "users", uid, "meals"));
    const dailyLogRef = doc(db, "users", uid, "dailyLogs", dateStr);
    
    // Calculate values based on serving weight (if passed standard 100g base from DB)
    let calories = mealData.calories || 0;
    let proteinG = mealData.proteinG || 0;
    let carbsG = mealData.carbsG || 0;
    let fatG = mealData.fatG || 0;

    if (mealData.servingWeightGrams && mealData.caloriesPer100g !== undefined) {
        const factor = mealData.servingWeightGrams / 100;
        calories = Math.round(mealData.caloriesPer100g * factor);
        proteinG = Math.round(mealData.proteinPer100g * factor * 10) / 10;
        carbsG = Math.round(mealData.carbsPer100g * factor * 10) / 10;
        fatG = Math.round(mealData.fatPer100g * factor * 10) / 10;
    }

    const mealEntry = {
        id: mealDocRef.id,
        date: dateStr,
        timestamp: serverTimestamp(),
        mealType: mealData.mealType || "Snack",
        
        foodName: mealData.foodName || mealData.name,
        foodId: mealData.foodId || mealData.id || null,
        servingWeightGrams: mealData.servingWeightGrams || 100,
        calories,
        proteinG,
        carbsG,
        fatG,
        
        photoUrl: mealData.photoUrl || null,
        aiAnalysis: mealData.aiAnalysis || null,
        status: mealData.status || "completed",
        source: mealData.source || "manual",
        favorite: mealData.favorite || false,
        confidence: mealData.confidence || 1.0,
        edited: false,
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await runTransaction(db, async (transaction) => {
        const dailyLogDoc = await transaction.get(dailyLogRef);
        
        if (!dailyLogDoc.exists()) {
            transaction.set(dailyLogRef, {
                date: dateStr,
                totalCalories: calories,
                totalProteinG: proteinG,
                totalCarbsG: carbsG,
                totalFatG: fatG,
                goalCalories: window.dailyGoal || 2200, // Read from global state if available
                updatedAt: serverTimestamp()
            });
        } else {
            const currentData = dailyLogDoc.data();
            transaction.update(dailyLogRef, {
                totalCalories: (currentData.totalCalories || 0) + calories,
                totalProteinG: Math.round(((currentData.totalProteinG || 0) + proteinG) * 10) / 10,
                totalCarbsG: Math.round(((currentData.totalCarbsG || 0) + carbsG) * 10) / 10,
                totalFatG: Math.round(((currentData.totalFatG || 0) + fatG) * 10) / 10,
                updatedAt: serverTimestamp()
            });
        }

        transaction.set(mealDocRef, mealEntry);
    });

    return mealEntry;
}

/**
 * Deletes a meal and atomically decrements the daily log totals.
 * @param {string} mealId 
 * @param {Object} mealData 
 */
export async function deleteMeal(mealId, mealData) {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;
    const dateStr = mealData.date; // Use the meal's date to decrement the right daily log
    
    const mealDocRef = doc(db, "users", uid, "meals", mealId);
    const dailyLogRef = doc(db, "users", uid, "dailyLogs", dateStr);

    await runTransaction(db, async (transaction) => {
        const dailyLogDoc = await transaction.get(dailyLogRef);
        
        if (dailyLogDoc.exists()) {
            const currentData = dailyLogDoc.data();
            // Decrement but don't go below zero
            const newCalories = Math.max(0, (currentData.totalCalories || 0) - (mealData.calories || 0));
            const newProtein = Math.max(0, Math.round(((currentData.totalProteinG || 0) - (mealData.proteinG || 0)) * 10) / 10);
            const newCarbs = Math.max(0, Math.round(((currentData.totalCarbsG || 0) - (mealData.carbsG || 0)) * 10) / 10);
            const newFat = Math.max(0, Math.round(((currentData.totalFatG || 0) - (mealData.fatG || 0)) * 10) / 10);
            
            transaction.update(dailyLogRef, {
                totalCalories: newCalories,
                totalProteinG: newProtein,
                totalCarbsG: newCarbs,
                totalFatG: newFat,
                updatedAt: serverTimestamp()
            });
        }

        transaction.delete(mealDocRef);
    });
}

/**
 * Edits an existing meal and atomically adjusts the daily log totals.
 * @param {string} mealId 
 * @param {Object} oldMealData 
 * @param {Object} newMealData 
 */
export async function editMeal(mealId, oldMealData, newMealData) {
    if (!auth.currentUser) throw new Error("User not authenticated");
    const uid = auth.currentUser.uid;
    const dateStr = oldMealData.date; // assuming we aren't changing the date of the meal for now
    
    const mealDocRef = doc(db, "users", uid, "meals", mealId);
    const dailyLogRef = doc(db, "users", uid, "dailyLogs", dateStr);

    let calories = newMealData.calories || 0;
    let proteinG = newMealData.proteinG || 0;
    let carbsG = newMealData.carbsG || 0;
    let fatG = newMealData.fatG || 0;

    if (newMealData.servingWeightGrams && newMealData.caloriesPer100g !== undefined) {
        const factor = newMealData.servingWeightGrams / 100;
        calories = Math.round(newMealData.caloriesPer100g * factor);
        proteinG = Math.round(newMealData.proteinPer100g * factor * 10) / 10;
        carbsG = Math.round(newMealData.carbsPer100g * factor * 10) / 10;
        fatG = Math.round(newMealData.fatPer100g * factor * 10) / 10;
    }

    const diffCalories = calories - (oldMealData.calories || 0);
    const diffProtein = proteinG - (oldMealData.proteinG || 0);
    const diffCarbs = carbsG - (oldMealData.carbsG || 0);
    const diffFat = fatG - (oldMealData.fatG || 0);

    const updateFields = {
        mealType: newMealData.mealType || oldMealData.mealType,
        servingWeightGrams: newMealData.servingWeightGrams || oldMealData.servingWeightGrams,
        calories,
        proteinG,
        carbsG,
        fatG,
        edited: true,
        updatedAt: serverTimestamp()
    };

    await runTransaction(db, async (transaction) => {
        const dailyLogDoc = await transaction.get(dailyLogRef);
        
        if (dailyLogDoc.exists()) {
            const currentData = dailyLogDoc.data();
            const newTotCalories = Math.max(0, (currentData.totalCalories || 0) + diffCalories);
            const newTotProtein = Math.max(0, Math.round(((currentData.totalProteinG || 0) + diffProtein) * 10) / 10);
            const newTotCarbs = Math.max(0, Math.round(((currentData.totalCarbsG || 0) + diffCarbs) * 10) / 10);
            const newTotFat = Math.max(0, Math.round(((currentData.totalFatG || 0) + diffFat) * 10) / 10);
            
            transaction.update(dailyLogRef, {
                totalCalories: newTotCalories,
                totalProteinG: newTotProtein,
                totalCarbsG: newTotCarbs,
                totalFatG: newTotFat,
                updatedAt: serverTimestamp()
            });
        }

        transaction.update(mealDocRef, updateFields);
    });
}

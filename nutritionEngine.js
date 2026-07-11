// ============================================================
//  nutritionEngine.js  —  Shared nutrition calculation module
// ============================================================
//  ES Module. Import from onboarding.html, index.html, or any
//  future page that needs nutrition math.
//
//  All formulas use metric units internally (kg, cm).
//  Unit helpers at the bottom convert to/from imperial.
// ============================================================

// ── Activity level constants ──────────────────────────────────────────────
export const ACTIVITY_FACTORS = {
    sedentary:         { factor: 1.200, label: "Sedentary",          sub: "Desk job, little or no exercise" },
    lightly_active:    { factor: 1.375, label: "Lightly Active",     sub: "Light exercise 1–3 days/week" },
    moderately_active: { factor: 1.550, label: "Moderately Active",  sub: "Moderate exercise 3–5 days/week" },
    very_active:       { factor: 1.725, label: "Very Active",        sub: "Hard exercise 6–7 days/week" },
    athlete:           { factor: 1.900, label: "Athlete",            sub: "Twice-daily training or physical job" },
};

// ── Goal constants ────────────────────────────────────────────────────────
export const GOAL_CONFIG = {
    fat_loss:    { factor: 0.80, label: "Fat Loss",    surplus: "−20% deficit" },
    maintain:    { factor: 1.00, label: "Maintain",    surplus: "±0% (maintenance)" },
    lean_bulk:   { factor: 1.10, label: "Lean Bulk",   surplus: "+10% surplus" },
    muscle_gain: { factor: 1.15, label: "Muscle Gain", surplus: "+15% surplus" },
};

// Protein target in g per kg of bodyweight (per goal)
const PROTEIN_PER_KG = {
    fat_loss:    2.2,
    maintain:    1.8,
    lean_bulk:   2.0,
    muscle_gain: 2.4,
};

// ── Core formulas ─────────────────────────────────────────────────────────

/**
 * Calculate current age in full years from an ISO date string (YYYY-MM-DD).
 * Age is always computed at runtime so it never goes stale in storage.
 */
export function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 0;
    const dob   = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return Math.max(0, age);
}

/**
 * Basal Metabolic Rate — Mifflin-St Jeor equation.
 *
 * @param {number} weightKg
 * @param {number} heightCm
 * @param {number} age           Integer years
 * @param {string} biologicalSex "male" | "female" | "other"
 * @returns {number} BMR kcal/day (rounded to nearest integer)
 */
export function calculateBMR(weightKg, heightCm, age, biologicalSex) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    if (biologicalSex === "male")   return Math.round(base + 5);
    if (biologicalSex === "female") return Math.round(base - 161);
    // "other" — midpoint average of male (+5) and female (−161) constants = −78
    return Math.round(base - 78);
}

/**
 * Total Daily Energy Expenditure = BMR × activity multiplier.
 *
 * @param {number} bmr
 * @param {string} activityLevel  Key from ACTIVITY_FACTORS
 * @returns {number} TDEE kcal/day
 */
export function calculateTDEE(bmr, activityLevel) {
    const factor = ACTIVITY_FACTORS[activityLevel]?.factor ?? 1.55;
    return Math.round(bmr * factor);
}

/**
 * Goal-adjusted daily calorie target.
 *
 * @param {number} tdee
 * @param {string} goal  Key from GOAL_CONFIG
 * @returns {number} Daily calorie goal
 */
export function calculateGoalCalories(tdee, goal) {
    const factor = GOAL_CONFIG[goal]?.factor ?? 1.0;
    return Math.round(tdee * factor);
}

/**
 * Daily macro breakdown in grams.
 *  - Protein: goal-specific g/kg bodyweight
 *  - Fat:     25% of daily calories
 *  - Carbs:   remaining calories (floors at 0)
 *
 * @param {number} dailyCalories
 * @param {number} weightKg
 * @param {string} goal  Key from GOAL_CONFIG
 * @returns {{ proteinG: number, carbsG: number, fatG: number }}
 */
export function calculateMacros(dailyCalories, weightKg, goal) {
    const proteinG = Math.round(weightKg * (PROTEIN_PER_KG[goal] ?? 1.8));
    const fatG     = Math.round((dailyCalories * 0.25) / 9);
    const carbsG   = Math.max(0, Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4));
    return { proteinG, carbsG, fatG };
}

/**
 * Master builder — call once with raw form inputs to get the complete plan.
 *
 * @param {object} inputs
 * @param {string} inputs.dateOfBirth       "YYYY-MM-DD"
 * @param {string} inputs.biologicalSex     "male" | "female" | "other"
 * @param {number} inputs.heightCm          Always in cm
 * @param {number} inputs.currentWeightKg   Always in kg
 * @param {string} inputs.goal              "fat_loss" | "maintain" | "lean_bulk" | "muscle_gain"
 * @param {string} inputs.activityLevel     Key from ACTIVITY_FACTORS
 *
 * @returns {{
 *   age: number, bmr: number, tdee: number,
 *   maintenanceCalories: number, dailyCalories: number,
 *   proteinG: number, carbsG: number, fatG: number
 * }}
 */
export function buildNutritionPlan(inputs) {
    const { dateOfBirth, biologicalSex, heightCm, currentWeightKg, goal, activityLevel } = inputs;

    const age                 = calculateAge(dateOfBirth);
    const bmr                 = calculateBMR(currentWeightKg, heightCm, age, biologicalSex);
    const tdee                = calculateTDEE(bmr, activityLevel);
    const maintenanceCalories = tdee;  // TDEE is maintenance by definition
    const dailyCalories       = calculateGoalCalories(tdee, goal);
    const { proteinG, carbsG, fatG } = calculateMacros(dailyCalories, currentWeightKg, goal);

    return { age, bmr, tdee, maintenanceCalories, dailyCalories, proteinG, carbsG, fatG };
}

// ── Unit conversion helpers ───────────────────────────────────────────────

/** Convert pounds to kilograms (1 decimal place). */
export function lbsToKg(lbs)   { return Math.round(lbs * 0.453592 * 10) / 10; }

/** Convert feet + inches to centimetres. */
export function ftInToCm(ft, inches) { return Math.round(ft * 30.48 + inches * 2.54); }

/** Convert kilograms to pounds (1 decimal place). */
export function kgToLbs(kg)    { return Math.round(kg * 2.20462 * 10) / 10; }

/** Convert centimetres to { ft, inches }. */
export function cmToFtIn(cm) {
    const totalIn = cm / 2.54;
    return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) };
}

import { db, auth } from "./firebase.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { search, getRecent, getFavorites } from "./nutritionDatabase.js";
import { logMeal, deleteMeal, editMeal } from "./foodLogger.js";

// Expose the Firestore meal writer to the classic app.js script so that the
// chat assistant and quick-add chips persist meals through the SAME data layer
// as the "+Log" hub (single source of truth: the Firestore `meals` collection).
window.logMealToFirestore = logMeal;

let selectedFood = null;

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function initFoodLogger() {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const dateStr = getLocalDateString();
    
    // Listen to today's meals
    const mealsRef = collection(db, "users", uid, "meals");
    const q = query(mealsRef, where("date", "==", dateStr));
    
    onSnapshot(q, (snapshot) => {
        const meals = [];
        snapshot.forEach((doc) => {
            meals.push({ ...doc.data(), id: doc.id });
        });
        
        // Sort chronologically (assuming timestamp exists, else by ID or created order)
        meals.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return a.timestamp.toMillis() - b.timestamp.toMillis();
        });
        
        if (window.setMealsData) {
            window.setMealsData(meals);
        }
    });

    // Wire up search input debouncing
    const searchInput = document.getElementById("food-search-input");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value.trim();
            if (val.length > 0) {
                window.switchLogTab('search');
                debounceTimer = setTimeout(() => {
                    performSearch(val);
                }, 300);
            } else {
                window.switchLogTab('recent');
            }
        });
    }

    // Wire up quantity slider live-calc
    const qtySlider = document.getElementById("qty-slider");
    const qtyInput = document.getElementById("qty-input");
    
    const updateMacros = (val) => {
        qtySlider.value = val;
        qtyInput.value = val;
        
        if (selectedFood) {
            const factor = val / 100;
            document.getElementById("qty-val-cal").textContent = Math.round(selectedFood.caloriesPer100g * factor);
            document.getElementById("qty-val-pro").textContent = Math.round(selectedFood.proteinPer100g * factor * 10) / 10 + "g";
            document.getElementById("qty-val-carb").textContent = Math.round(selectedFood.carbsPer100g * factor * 10) / 10 + "g";
            document.getElementById("qty-val-fat").textContent = Math.round(selectedFood.fatPer100g * factor * 10) / 10 + "g";
        }
    };

    if (qtySlider && qtyInput) {
        qtySlider.addEventListener("input", (e) => updateMacros(e.target.value));
        qtyInput.addEventListener("input", (e) => updateMacros(e.target.value));
    }
}

async function renderFoodList(foods) {
    const container = document.getElementById("log-hub-results");
    container.innerHTML = "";
    
    if (foods.length === 0) {
        container.innerHTML = `<div class="text-center text-zinc-500 text-xs py-8">No results found.</div>`;
        return;
    }
    
    foods.forEach(food => {
        const div = document.createElement("div");
        div.className = "flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-zinc-800 transition-colors";
        div.onclick = () => window.openQtyModal(food);
        
        div.innerHTML = `
            <div>
                <div class="font-medium text-sm text-white mb-0.5">${food.name}</div>
                <div class="text-[11px] text-zinc-500">${food.caloriesPer100g} kcal / 100g</div>
            </div>
            <div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-emerald-500">
                <i class="fa-solid fa-plus text-xs"></i>
            </div>
        `;
        container.appendChild(div);
    });
}

async function performSearch(query) {
    const container = document.getElementById("log-hub-results");
    container.innerHTML = `<div class="text-center text-zinc-500 text-xs py-8"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Searching...</div>`;
    
    const results = await search(query);
    renderFoodList(results);
}

window.openLogHub = async function() {
    document.getElementById("log-hub-backdrop").classList.remove("hidden");
    window.switchLogTab('recent'); // Default to recent
};

window.closeLogHub = function() {
    document.getElementById("log-hub-backdrop").classList.add("hidden");
    document.getElementById("food-search-input").value = "";
};

window.switchLogTab = async function(tab) {
    const tabs = ['recent', 'favorites', 'search'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (t === tab) {
            btn.classList.remove('bg-transparent', 'text-zinc-500');
            btn.classList.add('bg-zinc-800', 'text-emerald-400');
            if (t === 'search') btn.classList.remove('hidden');
        } else {
            btn.classList.add('bg-transparent', 'text-zinc-500');
            btn.classList.remove('bg-zinc-800', 'text-emerald-400');
            if (t === 'search') btn.classList.add('hidden');
        }
    });
    
    const container = document.getElementById("log-hub-results");
    container.innerHTML = `<div class="text-center text-zinc-500 text-xs py-8"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</div>`;
    
    if (tab === 'recent') {
        const recents = await getRecent();
        renderFoodList(recents);
    } else if (tab === 'favorites') {
        const favs = await getFavorites();
        renderFoodList(favs);
    } else if (tab === 'search') {
        const query = document.getElementById("food-search-input").value;
        if (!query) {
            container.innerHTML = `<div class="text-center text-zinc-500 text-xs py-8">Type to search foods...</div>`;
        }
    }
};

window.openQtyModal = function(food) {
    selectedFood = food;
    document.getElementById("qty-food-name").textContent = food.name;
    document.getElementById("qty-food-cal").textContent = `${food.caloriesPer100g} kcal per 100g`;
    
    // Reset to 100g
    document.getElementById("qty-slider").value = 100;
    document.getElementById("qty-input").value = 100;
    
    document.getElementById("qty-val-cal").textContent = food.caloriesPer100g;
    document.getElementById("qty-val-pro").textContent = food.proteinPer100g + "g";
    document.getElementById("qty-val-carb").textContent = food.carbsPer100g + "g";
    document.getElementById("qty-val-fat").textContent = food.fatPer100g + "g";
    
    document.getElementById("qty-modal-backdrop").classList.remove("hidden");
};

window.closeQtyModal = function() {
    document.getElementById("qty-modal-backdrop").classList.add("hidden");
    selectedFood = null;
    
    // Reset button state
    const btnText = document.getElementById("qty-log-btn-text");
    const btnIcon = document.getElementById("qty-log-btn-icon");
    const btn = document.getElementById("qty-log-btn");
    
    btnText.textContent = "Log Food";
    btnIcon.className = "fa-solid fa-check";
    btn.disabled = false;
    btn.classList.remove("opacity-50", "cursor-not-allowed");
};

window.confirmLogMeal = async function() {
    if (!selectedFood) return;
    
    const btnText = document.getElementById("qty-log-btn-text");
    const btnIcon = document.getElementById("qty-log-btn-icon");
    const btn = document.getElementById("qty-log-btn");
    
    // Loading state
    btnText.textContent = "Saving...";
    btnIcon.className = "fa-solid fa-spinner fa-spin";
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");
    
    const weight = parseInt(document.getElementById("qty-input").value) || 100;
    const mealType = document.getElementById("qty-meal-type").value;
    
    const mealData = {
        name: selectedFood.name,
        id: selectedFood.id,
        servingWeightGrams: weight,
        caloriesPer100g: selectedFood.caloriesPer100g,
        proteinPer100g: selectedFood.proteinPer100g,
        carbsPer100g: selectedFood.carbsPer100g,
        fatPer100g: selectedFood.fatPer100g,
        mealType: mealType
    };
    
    try {
        await logMeal(mealData);
        window.closeQtyModal();
        window.closeLogHub();
    } catch (err) {
        console.error("Error logging meal:", err);
        btnText.textContent = "Error - Try Again";
        btnIcon.className = "fa-solid fa-circle-exclamation";
        btn.disabled = false;
        btn.classList.remove("opacity-50", "cursor-not-allowed");
    }
};

window.handleDeleteMeal = async function(mealId, cal, pro, carb, fat, dateStr) {
    if (!confirm("Delete this logged food?")) return;
    
    try {
        await deleteMeal(mealId, {
            date: dateStr,
            calories: cal,
            proteinG: pro,
            carbsG: carb,
            fatG: fat
        });
    } catch (err) {
        console.error("Error deleting meal:", err);
        alert("Failed to delete. Check connection.");
    }
};

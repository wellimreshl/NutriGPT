        // Tailwind script run
        function initializeTailwind() {
            tailwind.config = {
                content: [],
                theme: {
                    extend: {}
                }
            }
        }
        
        // Nutrition database (per 100g)
        const nutritionDB = {
            "banana": { name: "Banana", cal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
            "apple": { name: "Apple", cal: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
            "orange": { name: "Orange", cal: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
            "chicken": { name: "Chicken Breast", cal: 165, protein: 31, carbs: 0, fat: 3.6 },
            "salmon": { name: "Salmon", cal: 208, protein: 22, carbs: 0, fat: 13 },
            "rice": { name: "Cooked Rice", cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
            "avocado": { name: "Avocado", cal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
            "almond": { name: "Almonds", cal: 579, protein: 21, carbs: 22, fat: 50 },
            "egg": { name: "Egg (whole)", cal: 143, protein: 13, carbs: 0.7, fat: 9.5 },
            "bread": { name: "Whole Wheat Bread", cal: 265, protein: 9, carbs: 49, fat: 3.2 },
            "broccoli": { name: "Broccoli", cal: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
            "oats": { name: "Oats (dry)", cal: 389, protein: 17, carbs: 66, fat: 7 },
            "peanut": { name: "Peanuts", cal: 567, protein: 26, carbs: 16, fat: 49 },
            "yogurt": { name: "Greek Yogurt", cal: 59, protein: 10, carbs: 3.6, fat: 0.4 },
            "potato": { name: "Potato (baked)", cal: 93, protein: 2.5, carbs: 21, fat: 0.1 }
        }
        
        // Current state
        let currentLog = []
        let chatMessages = []
        let currentTab = 0
        let waterIntake = 750
        let dailyGoal = 2200
        let proteinGoal = 150
        let carbGoal = 200
        let fatGoal = 65
        let chartInstance = null
        
        window.setMealsData = function(meals) {
            currentLog = meals;
            // Firestore is the single source of truth. Whenever the live
            // listener delivers new data, rebuild every view that renders meals
            // so the Live Summary, Today's Log, and Dashboard stay in sync.
            renderLiveSummary();
            renderFullLog();
            updateDashboardFoods();
        };

        // Format a Firestore meal's time (Firestore Timestamp) for display.
        function formatMealTime(entry) {
            const ts = entry.timestamp || entry.createdAt;
            if (ts && typeof ts.toDate === "function") {
                return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }
            return entry.mealType || "";
        }
        
        function calculateTotals() {
            let totals = {
                cal: 0,
                protein: 0,
                carbs: 0,
                fat: 0
            }
            
            currentLog.forEach(item => {
                // Firestore meal schema: calories / proteinG / carbsG / fatG
                totals.cal += Number(item.calories) || 0
                totals.protein += Number(item.proteinG) || 0
                totals.carbs += Number(item.carbsG) || 0
                totals.fat += Number(item.fatG) || 0
            })
            
            // round
            totals.protein = parseFloat(totals.protein.toFixed(1))
            totals.carbs = parseFloat(totals.carbs.toFixed(1))
            totals.fat = parseFloat(totals.fat.toFixed(1))
            
            return totals
        }
        
        function renderLiveSummary() {
            const totals = calculateTotals()
            
            // live kcal
            document.getElementById("live-kcal-big").textContent = Math.round(totals.cal)
            
            // macros
            document.getElementById("live-pro").innerHTML = `${totals.protein}<span class="text-xs align-super ml-0.5 text-zinc-400">g</span>`
            document.getElementById("live-carb").innerHTML = `${totals.carbs}<span class="text-xs align-super ml-0.5 text-zinc-400">g</span>`
            document.getElementById("live-fat").innerHTML = `${totals.fat}<span class="text-xs align-super ml-0.5 text-zinc-400">g</span>`
            
            // left sidebar stats
            const calPercent = Math.min(Math.round((totals.cal / dailyGoal) * 100), 100)
            document.getElementById("calorie-count").textContent = Math.round(totals.cal)
            
            // remaining calories
            const remainingEl = document.getElementById("remaining-kcal")
            if (remainingEl) remainingEl.textContent = Math.max(0, Math.round(dailyGoal - totals.cal))
            
            // update calorie ring
            const circumference = 94.2
            const offset = circumference - (circumference * calPercent / 100)
            const ring = document.getElementById("calorie-ring")
            ring.setAttribute("stroke-dashoffset", offset)
            
            // macro bars
            
            const proPct = Math.min(Math.round((totals.protein / proteinGoal) * 100), 100)
            const carbPct = Math.min(Math.round((totals.carbs / carbGoal) * 100), 100)
            const fatPct = Math.min(Math.round((totals.fat / fatGoal) * 100), 100)
            
            document.getElementById("protein-bar").style.width = `${proPct}%`
            document.getElementById("carb-bar").style.width = `${carbPct}%`
            document.getElementById("fat-bar").style.width = `${fatPct}%`
            
            document.getElementById("protein-count").innerHTML = `${totals.protein}<span class="text-xs text-zinc-400 ml-1">g</span>`
            document.getElementById("carb-count").innerHTML = `${totals.carbs}<span class="text-xs text-zinc-400 ml-1">g</span>`
            document.getElementById("fat-count").innerHTML = `${totals.fat}<span class="text-xs text-zinc-400 ml-1">g</span>`
            
            // render the live food list
            renderLiveLog()

            // Update Dashboard widgets using the same totals
            const dashKcal = document.getElementById("dash-kcal-consumed")
            if (dashKcal) dashKcal.textContent = `${Math.round(totals.cal)} kcal consumed`
            
            const dashProVal = document.getElementById("dash-pro-val")
            const dashCarbVal = document.getElementById("dash-carb-val")
            const dashFatVal = document.getElementById("dash-fat-val")
            
            if (dashProVal) dashProVal.textContent = `${totals.protein}g • ${Math.round(totals.protein * 4)}kcal`
            if (dashCarbVal) dashCarbVal.textContent = `${totals.carbs}g • ${Math.round(totals.carbs * 4)}kcal`
            if (dashFatVal) dashFatVal.textContent = `${totals.fat}g • ${Math.round(totals.fat * 9)}kcal`
            
            // Re-render the Macro Pie Chart with the latest totals
            initMacroChart();
        }
        
        function renderLiveLog() {
            const container = document.getElementById("live-log")
            container.innerHTML = ""
            
            if (currentLog.length === 0) {
                const empty = document.createElement("div")
                empty.className = "flex flex-col items-center justify-center h-full py-12 text-center opacity-40"
                empty.innerHTML = `
                    <div class="text-4xl mb-3">🍽️</div>
                    <div class="text-xs">No foods logged yet</div>
                `
                container.appendChild(empty)
                return
            }
            
            currentLog.forEach((entry, index) => {
                const div = document.createElement("div")
                div.className = `food-card bg-zinc-800 rounded-3xl p-4 text-xs cursor-pointer group`
                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-medium text-white">${entry.foodName}</div>
                            <div class="text-zinc-400">${entry.servingWeightGrams}g • ${entry.mealType}</div>
                        </div>
                        <div onclick="event.stopImmediatePropagation(); window.handleDeleteMeal('${entry.id}', ${entry.calories}, ${entry.proteinG}, ${entry.carbsG}, ${entry.fatG}, '${entry.date}');" 
                             class="w-6 h-6 hidden group-hover:flex items-center justify-center text-rose-400 hover:text-rose-500 transition-colors">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </div>
                    </div>
                    <div class="flex justify-between mt-4 text-[13px]">
                         <div class="font-mono text-emerald-300">${entry.calories} <span class="text-xs text-emerald-500/70">kcal</span></div>
                        <div class="flex items-center gap-x-2.5 text-zinc-400">
                            <div class="whitespace-nowrap"><span class="text-blue-400/80 mr-1">P</span>${entry.proteinG}</div>
                            <div class="whitespace-nowrap"><span class="text-amber-400/80 mr-1">C</span>${entry.carbsG}</div>
                            <div class="whitespace-nowrap"><span class="text-rose-400/80 mr-1">F</span>${entry.fatG}</div>
                        </div>
                    </div>
                `
                div.onclick = () => {
                    showFoodDetail(entry)
                }
                container.appendChild(div)
            })
        }
        
        async function addToLog(foodData) {
            // The chat assistant now persists meals through the SAME Firestore
            // data layer as the "+Log" hub, so entries survive refreshes and
            // render with the canonical schema. The onSnapshot listener
            // (window.setMealsData) rebuilds all views from persisted data.
            if (!window.logMealToFirestore) {
                console.error("Firestore meal logger unavailable")
                return
            }
            try {
                await window.logMealToFirestore({
                    foodName: foodData.food,
                    servingWeightGrams: Math.round(Number(foodData.weight)) || 100,
                    calories: Math.round(Number(foodData.cal)) || 0,
                    proteinG: parseFloat(foodData.protein) || 0,
                    carbsG: parseFloat(foodData.carbs) || 0,
                    fatG: parseFloat(foodData.fat) || 0,
                    mealType: "Snack",
                    source: "chat"
                })
            } catch (err) {
                console.error("Failed to log meal from chat:", err)
            }
        }

        // Quick-add a "known food" chip from the sidebar. Persists to Firestore
        // so it flows through the single meal data model like every other entry.
        async function quickAddFood(key) {
            const base = nutritionDB[key]
            if (!base) return
            if (!window.logMealToFirestore) {
                console.error("Firestore meal logger unavailable")
                return
            }
            try {
                await window.logMealToFirestore({
                    foodName: base.name,
                    servingWeightGrams: 100,
                    caloriesPer100g: base.cal,
                    proteinPer100g: base.protein,
                    carbsPer100g: base.carbs,
                    fatPer100g: base.fat,
                    mealType: "Snack",
                    source: "quick-add"
                })
            } catch (err) {
                console.error("Failed to quick-add food:", err)
            }
        }
        
        function removeFood(id) {
            currentLog = currentLog.filter(item => item.id !== id)
            renderLiveSummary()
            renderFullLog()
            updateDashboardFoods()
            addSystemMessage("Food item removed from log.", "neutral")
        }
        
        function parseUserInput(text) {
            const lower = text.toLowerCase()
            
            // extract weight
            let weight = 100
            const weightRegex = /(\d+\.?\d*)\s*(?:g|gram|grams|kg)/i
            const match = lower.match(weightRegex)
            
            if (match && match[1]) {
                weight = parseFloat(match[1])
                if (lower.includes("kg")) weight = weight * 1000
            }
            
            // find the food
            let matchedKey = null
            let highestScore = 0
            
            Object.keys(nutritionDB).forEach(key => {
                if (lower.includes(key)) {
                    const score = key.length
                    if (score > highestScore) {
                        highestScore = score
                        matchedKey = key
                    }
                }
            })
            
            if (!matchedKey) {
                // try some fuzzy
                if (lower.includes("banan")) matchedKey = "banana"
                else if (lower.includes("appl")) matchedKey = "apple"
                else if (lower.includes("chick") || lower.includes("breast")) matchedKey = "chicken"
                else if (lower.includes("avo")) matchedKey = "avocado"
                else if (lower.includes("almond") || lower.includes("nut")) matchedKey = "almond"
                else if (lower.includes("egg")) matchedKey = "egg"
                else if (lower.includes("rice")) matchedKey = "rice"
                else if (lower.includes("salmon") || lower.includes("fish")) matchedKey = "salmon"
            }
            
            if (!matchedKey) return null
            
            const base = nutritionDB[matchedKey]
            const factor = weight / 100
            
            return {
                food: base.name,
                weight: Math.round(weight),
                cal: Math.round(base.cal * factor),
                protein: (base.protein * factor).toFixed(1),
                carbs: (base.carbs * factor).toFixed(1),
                fat: (base.fat * factor).toFixed(1)
            }
        }
        
        function handleUserMessage(e) {
            e.preventDefault()
            const inputEl = document.getElementById("user-input")
            const message = inputEl.value.trim()
            
            if (!message) return
            
            // add user message
            addMessageToChat("user", message)
            
            // clear input
            inputEl.value = ""
            
            // simulate delay for AI
            setTimeout(() => {
                const parsed = parseUserInput(message)
                
                if (parsed) {
                    // add to log
                    addToLog(parsed)
                    
                    // create nice assistant message
                    const assistantHTML = `
                        <div class="flex gap-x-4">
                            <div class="w-7 h-7 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl bot-icon">🥗</div>
                            <div>
                                <div class="font-medium text-emerald-300 text-sm mb-1">Added to log ✓</div>
                                <div class="bg-zinc-800 rounded-3xl px-5 py-4 text-sm">
                                    <div class="flex justify-between items-center">
                                        <div class="font-medium">${parsed.weight}g ${parsed.food}</div>
                                        <div class="font-mono text-emerald-400">${parsed.cal} kcal</div>
                                    </div>
                                    <div class="grid grid-cols-3 gap-4 mt-5 text-xs">
                                        <div class="text-center">
                                            <div class="text-blue-400">PROTEIN</div>
                                            <div class="font-semibold text-lg text-white">${parsed.protein}<span class="text-xs">g</span></div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-amber-400">CARBS</div>
                                            <div class="font-semibold text-lg text-white">${parsed.carbs}<span class="text-xs">g</span></div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-rose-400">FAT</div>
                                            <div class="font-semibold text-lg text-white">${parsed.fat}<span class="text-xs">g</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-xs text-zinc-400 mt-3 pl-1">Your daily intake has been updated.</div>
                            </div>
                        </div>
                    `
                    
                    const tempDiv = document.createElement("div")
                    tempDiv.innerHTML = assistantHTML
                    document.getElementById("chat-messages").appendChild(tempDiv.firstElementChild)
                    
                    // scroll to bottom
                    const chatContainer = document.getElementById("chat-messages")
                    chatContainer.scrollTop = chatContainer.scrollHeight
                    
                    // random tip sometimes
                    if (Math.random() > 0.6) {
                        setTimeout(() => {
                            const tips = [
                                "Did you know? Bananas are great for post-workout potassium replenishment.",
                                "Salmon is an excellent source of omega-3 fatty acids.",
                                "Remember to drink water between meals!",
                                "Avocados contain heart-healthy monounsaturated fats."
                            ]
                            addSystemMessage(tips[Math.floor(Math.random() * tips.length)], "tip")
                        }, 1700)
                    }
                } else {
                    // unknown food
                    const responses = [
                        "Hmm, I couldn't quite recognize that food. Can you try rephrasing? E.g. '150g grilled salmon'",
                        "Sorry! I don't have data for that one yet. Try one of the common foods like banana, chicken, avocado or rice.",
                        "I didn't catch the food name. Please include both weight and the name of the food you ate."
                    ]
                    addMessageToChat("assistant", responses[Math.floor(Math.random() * responses.length)])
                }
            }, 480)
        }
        
        function addMessageToChat(role, content) {
            const chatContainer = document.getElementById("chat-messages")
            
            const messageDiv = document.createElement("div")
            messageDiv.className = `flex ${role === "user" ? "justify-end" : "justify-start"} message-bubble`
            
            if (role === "user") {
                messageDiv.innerHTML = `
                    <div class="max-w-[260px] bg-white text-zinc-900 px-5 py-3.5 rounded-3xl rounded-tr-none text-sm">
                        ${content}
                    </div>
                `
            } else {
                messageDiv.innerHTML = `
                    <div class="flex gap-x-3 max-w-[310px]">
                        <div class="w-6 h-6 bg-gradient-to-br from-teal-300 to-cyan-400 text-xs flex items-center justify-center rounded-2xl mt-1 flex-shrink-0">🥑</div>
                        <div class="bg-zinc-800 px-5 py-3.5 rounded-3xl rounded-tl-none text-sm">
                            ${content}
                        </div>
                    </div>
                `
            }
            
            chatContainer.appendChild(messageDiv)
            chatContainer.scrollTop = chatContainer.scrollHeight
        }
        
        function addSystemMessage(text, type = "neutral") {
            const chatContainer = document.getElementById("chat-messages")
            const messageDiv = document.createElement("div")
            messageDiv.className = "flex justify-center my-4"
            
            let icon = "📌"
            let color = "zinc"
            
            if (type === "tip") {
                icon = "💡"
                color = "amber"
            }
            
            messageDiv.innerHTML = `
                <div onclick="this.style.opacity = 0.3" class="bg-zinc-800 text-zinc-400 text-xs px-5 py-3 rounded-3xl flex items-center gap-x-3 cursor-pointer">
                    <span>${icon}</span>
                    <span>${text}</span>
                </div>
            `
            chatContainer.appendChild(messageDiv)
            chatContainer.scrollTop = chatContainer.scrollHeight
        }
        
        function renderChatWelcome() {
            const chatContainer = document.getElementById("chat-messages")
            chatContainer.innerHTML = `
                <div class="max-w-xs mx-auto text-center mt-10">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-emerald-900 text-6xl rounded-3xl mb-6 shadow-inner">🍏</div>
                    <div class="text-3xl font-light text-white mb-2">Hi there!</div>
                    <div class="text-zinc-400 leading-snug">
                        Tell me about the food you ate today.<br>
                        Include the weight in grams for the most accurate results.
                    </div>
                    
                    <div class="mt-14 text-left">
                        <div class="text-xs text-zinc-500 mb-4 pl-1">QUICK START EXAMPLES</div>
                        <div onclick="useExample(0)" class="bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-3xl cursor-pointer mb-3 transition-colors text-left text-sm">I had a 220 gram baked potato</div>
                        <div onclick="useExample(1)" class="bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-3xl cursor-pointer mb-3 transition-colors text-left text-sm">30g of almonds for a snack</div>
                        <div onclick="useExample(2)" class="bg-zinc-800 hover:bg-zinc-700 px-5 py-4 rounded-3xl cursor-pointer transition-colors text-left text-sm">A 150 gram grilled salmon fillet</div>
                    </div>
                </div>
            `
        }
        
        function useExample(n) {
            let examples = [
                "I had a 220 gram baked potato",
                "30g of almonds for a snack",
                "A 150 gram grilled salmon fillet"
            ]
            const input = document.getElementById("user-input")
            input.value = examples[n]
            handleUserMessage(new Event("submit"))
        }
        
        function renderFullLog() {
            const container = document.getElementById("full-log-list")
            container.innerHTML = `
                <div class="max-w-2xl mx-auto">
                    <div class="flex justify-between items-center mb-5 text-xs text-zinc-400">
                        <div>ITEM</div>
                        <div class="flex items-center gap-x-12">
                            <div>WEIGHT</div>
                            <div>CALORIES</div>
                            <div>MACROS</div>
                        </div>
                    </div>
            `
            
            if (currentLog.length === 0) {
                container.innerHTML += `
                    <div class="bg-zinc-800 rounded-3xl py-16 text-center">
                        <span class="text-6xl block mb-4 opacity-30">📭</span>
                        <p class="text-zinc-400">Your log is empty.<br>Start adding foods from the chat.</p>
                    </div>
                `
                container.innerHTML += `</div>`
                return
            }
            
            currentLog.forEach(entry => {
                const entryHTML = `
                <div class="bg-zinc-800 rounded-3xl mb-3 px-7 py-5 flex items-center justify-between text-sm food-card">
                    <div class="flex items-center gap-x-4">
                        <div class="text-xl">🍎</div>
                        <div>
                            <div class="font-medium">${entry.foodName}</div>
                            <div class="text-xs text-zinc-400">${formatMealTime(entry)}</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-x-16">
                        <div class="w-16 text-right font-light">${entry.servingWeightGrams}<span class="text-xs text-zinc-400">g</span></div>
                        <div class="w-16 text-right font-semibold text-emerald-300">${entry.calories}</div>
                        <div class="flex items-center gap-x-7 font-mono text-xs">
                            <div class="text-blue-300">${entry.proteinG}</div>
                            <div class="text-amber-300">${entry.carbsG}</div>
                            <div class="text-rose-300">${entry.fatG}</div>
                        </div>
                    </div>

                    <div onclick="window.handleDeleteMeal('${entry.id}', ${entry.calories}, ${entry.proteinG}, ${entry.carbsG}, ${entry.fatG}, '${entry.date}'); event.stopImmediatePropagation()" class="text-zinc-500 hover:text-rose-400 cursor-pointer">
                        <i class="fa-solid fa-trash-can"></i>
                    </div>
                </div>`

                container.innerHTML += entryHTML
            })
            
            const totals = calculateTotals()
            container.innerHTML += `
                <div class="mt-8 bg-black/30 rounded-3xl p-6 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-x-2">
                        <span class="px-4 py-2 bg-zinc-900 rounded-3xl">TOTAL</span>
                    </div>
                    <div class="flex items-center gap-x-10">
                        <div class="font-light">${totals.cal} kcal</div>
                        <div class="flex items-center gap-x-6">
                            <div class="text-blue-400">${totals.protein}g</div>
                            <div class="text-amber-400">${totals.carbs}g</div>
                            <div class="text-rose-400">${totals.fat}g</div>
                        </div>
                    </div>
                </div>
            `
            container.innerHTML += `</div>`
        }
        
        function updateDashboardFoods() {
            const countEl = document.getElementById("dash-logged-count")
            if (countEl) countEl.textContent = `FOODS LOGGED • ${currentLog.length}`

            const container = document.getElementById("dash-foods-list")
            container.innerHTML = ""
            
            const recent = currentLog.slice(0, 3)
            
            recent.forEach(food => {
                const mini = document.createElement("div")
                mini.className = "flex justify-between text-xs border-b border-zinc-700 pb-3 last:border-none"
                mini.innerHTML = `
                    <div class="flex items-center gap-x-3">
                        <span class="text-emerald-400">•</span>
                        <span>${food.foodName}</span>
                    </div>
                    <div class="font-mono">${food.calories} kcal</div>
                `
                container.append(mini)
            })
            
            if (recent.length === 0) {
                container.innerHTML = `<div class="opacity-30 text-xs">— nothing yet —</div>`
            }
        }
        
        function switchTab(tab) {
            currentTab = tab
            
            // reset all navs
            for (let i = 0; i < 4; i++) {
                const nav = document.getElementById("nav-" + i)
                if (nav) {
                    if (i === tab) {
                        nav.classList.add("bg-zinc-800", "text-white")
                    } else {
                        nav.classList.remove("bg-zinc-800", "text-white")
                    }
                }
            }
            
            // hide all tabs
            document.getElementById("chat-tab").classList.add("hidden")
            document.getElementById("dashboard-tab").classList.add("hidden")
            document.getElementById("log-tab").classList.add("hidden")
            document.getElementById("history-tab").classList.add("hidden")
            
            if (tab === 0) {
                document.getElementById("chat-tab").classList.remove("hidden")
            } else if (tab === 1) {
                document.getElementById("dashboard-tab").classList.remove("hidden")
                if (!chartInstance) initMacroChart()
            } else if (tab === 2) {
                document.getElementById("log-tab").classList.remove("hidden")
                renderFullLog()
            } else if (tab === 3) {
                document.getElementById("history-tab").classList.remove("hidden")
                renderHistory()
            }
        }
        
        function initMacroChart() {
            const canvas = document.getElementById("macro-pie")
            if (!canvas || !canvas.getContext) return 
            
            const ctx = canvas.getContext("2d")
            const totals = calculateTotals()
            
            const pKcal = totals.protein * 4
            const cKcal = totals.carbs * 4
            const fKcal = totals.fat * 9
            const totalKcal = pKcal + cKcal + fKcal
            
            const centerX = 120
            const centerY = 120
            const radius = 95
            
            // clear
            ctx.clearRect(0, 0, 240, 240)
            
            if (totalKcal === 0) {
                // Draw empty/placeholder gray circle
                ctx.save()
                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
                ctx.fillStyle = "#3f3f46"
                ctx.fill()
                ctx.restore()
                
                ctx.fillStyle = "#71717a"
                ctx.font = "11px Inter, sans-serif"
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillText("No Logs", centerX, centerY)
            } else {
                const pShare = pKcal / totalKcal
                const cShare = cKcal / totalKcal
                const fShare = fKcal / totalKcal
                
                let startAngle = -Math.PI * 0.5
                
                // protein - blue
                const pEndAngle = startAngle + (pShare * Math.PI * 2)
                ctx.save()
                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, startAngle, pEndAngle)
                ctx.fillStyle = "#3b82f6"
                ctx.fill()
                ctx.restore()
                
                // carbs - amber
                startAngle = pEndAngle
                const cEndAngle = startAngle + (cShare * Math.PI * 2)
                ctx.save()
                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, startAngle, cEndAngle)
                ctx.fillStyle = "#f59e0b"
                ctx.fill()
                ctx.restore()
                
                // fat - rose
                startAngle = cEndAngle
                const fEndAngle = startAngle + (fShare * Math.PI * 2)
                ctx.save()
                ctx.beginPath()
                ctx.moveTo(centerX, centerY)
                ctx.arc(centerX, centerY, radius, startAngle, fEndAngle)
                ctx.fillStyle = "#e11d48"
                ctx.fill()
                ctx.restore()
                
                // inner circle to make donut
                ctx.beginPath()
                ctx.arc(centerX, centerY, 48, 0, Math.PI * 2)
                ctx.fillStyle = "#18181b"
                ctx.fill()
                
                // Draw label characters (P, C, F) inside segments
                ctx.fillStyle = "#ffffff"
                ctx.font = "bold 11px Inter, sans-serif"
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                
                let currentStart = -Math.PI * 0.5
                const drawSegmentLabel = (share, label, color) => {
                    if (share < 0.05) return; // Don't draw label if slice is too tiny
                    const mid = currentStart + (share * Math.PI)
                    const labelRadius = radius * 0.68
                    const x = centerX + Math.cos(mid) * labelRadius
                    const y = centerY + Math.sin(mid) * labelRadius
                    
                    ctx.save()
                    ctx.beginPath()
                    ctx.arc(x, y, 9, 0, Math.PI * 2)
                    ctx.fillStyle = "rgba(24, 24, 27, 0.7)"
                    ctx.fill()
                    
                    ctx.fillStyle = color
                    ctx.fillText(label, x, y)
                    ctx.restore()
                    
                    currentStart += share * Math.PI * 2
                }
                
                drawSegmentLabel(pShare, "P", "#60a5fa")
                drawSegmentLabel(cShare, "C", "#fbbf24")
                drawSegmentLabel(fShare, "F", "#f87171")
            }
        }
        
        function showFoodDetail(entry) {
            const html = `
                <div class="px-8 pt-6 pb-8">
                    <div class="flex justify-between">
                        <div class="text-lg font-semibold">${entry.foodName}</div>
                        <div onclick="hideModal()" class="cursor-pointer text-zinc-400">✕</div>
                    </div>

                    <div class="my-8 flex items-center gap-x-3">
                        <div class="text-7xl font-light text-white">${entry.servingWeightGrams}</div>
                        <div class="text-xs leading-none">GRAMS<br><span class="text-emerald-400">WEIGHT</span></div>
                    </div>

                    <div class="grid grid-cols-2 gap-px bg-zinc-700 rounded-3xl overflow-hidden">
                        <div class="bg-zinc-900 p-5">
                            <div class="uppercase text-xs text-zinc-400">Calories</div>
                            <div class="text-6xl text-white font-light">${entry.calories}</div>
                            <div class="text-xs text-emerald-400">kcal</div>
                        </div>
                        <div class="bg-zinc-900 p-5 flex flex-col justify-between">
                            <div class="flex justify-between">
                                <div>
                                    <div class="text-xs text-blue-400">PROTEIN</div>
                                    <div class="text-4xl font-light">${entry.proteinG}</div>
                                </div>
                                <div class="text-4xl text-blue-300/30">P</div>
                            </div>
                            <div class="flex justify-between">
                                <div>
                                    <div class="text-xs text-amber-400">CARBS</div>
                                    <div class="text-4xl font-light">${entry.carbsG}</div>
                                </div>
                                <div class="text-4xl text-amber-300/30">C</div>
                            </div>
                            <div class="flex justify-between">
                                <div>
                                    <div class="text-xs text-rose-400">FAT</div>
                                    <div class="text-4xl font-light">${entry.fatG}</div>
                                </div>
                                <div class="text-4xl text-rose-300/30">F</div>
                            </div>
                        </div>
                    </div>

                    <div class="text-[10px] text-center text-zinc-400 mt-8">${entry.mealType} • Logged at ${formatMealTime(entry)}</div>

                    <div onclick="hideModal()"
                         class="mt-6 text-center text-xs tracking-wider border border-zinc-600 py-6 rounded-3xl hover:bg-white hover:text-zinc-900 transition-all cursor-pointer">
                        CLOSE PREVIEW
                    </div>
                </div>
            `
            document.getElementById("modal-content").innerHTML = html
            document.getElementById("modal-backdrop").classList.remove("hidden")
            document.getElementById("modal-backdrop").classList.add("flex")
        }
        
        function hideModal() {
            const modal = document.getElementById("modal-backdrop")
            modal.classList.add("hidden")
            modal.classList.remove("flex")
        }
        
        function showHelp() {
            const html = `
                <div class="p-8">
                    <div class="flex items-center justify-between mb-6">
                        <div class="font-semibold text-lg">How NutriGPT works</div>
                        <i onclick="hideModal()" class="fa-solid fa-xmark cursor-pointer"></i>
                    </div>
                    <ol class="space-y-8 text-sm">
                        <li class="flex gap-x-6">
                            <span class="font-mono text-emerald-400 w-5">01</span>
                            <div>
                                Type any food with its weight in grams. <span class="font-medium">"150g banana"</span> or <span class="font-medium">"I ate 80 grams of almonds"</span>.
                            </div>
                        </li>
                        <li class="flex gap-x-6">
                            <span class="font-mono text-emerald-400 w-5">02</span>
                            <div>
                                The AI will parse your message, calculate the nutrition and add it to your daily log automatically.
                            </div>
                        </li>
                        <li class="flex gap-x-6">
                            <span class="font-mono text-emerald-400 w-5">03</span>
                            <div>
                                Your macro progress is updated in realtime on the left sidebar and right panel.
                            </div>
                        </li>
                        <li class="flex gap-x-6">
                            <span class="font-mono text-emerald-400 w-5">04</span>
                            <div>
                                At the end of your day, click the <span class="font-medium">"END DAY"</span> button to see a summary report.
                            </div>
                        </li>
                    </ol>
                    
                    <div class="bg-zinc-800 mt-8 rounded-3xl p-4 text-xs">
                        <div class="italic">"The best nutrition coach is the one that learns your habits over time. Keep logging!"</div>
                        <div class="text-right text-emerald-400 mt-4 text-xs">— NutriGPT</div>
                    </div>
                    
                    <button onclick="hideModal()" 
                            class="w-full py-5 text-xs font-semibold tracking-widest border border-white/30 hover:border-white/80 transition-colors mt-8 rounded-3xl">
                        GOT IT, THANKS
                    </button>
                </div>
            `
            document.getElementById("modal-content").innerHTML = html
            document.getElementById("modal-backdrop").classList.toggle("hidden")
            document.getElementById("modal-backdrop").classList.toggle("flex")
        }
        
        function suggestPrompt(n) {
            const examples = [
                "I just ate 150 grams of banana",
                "Add 200 grams of chicken breast",
                "30 grams almonds please"
            ]
            const input = document.getElementById("user-input")
            input.value = examples[n]
            handleUserMessage(new Event('submit'))
        }
        
        function completeDay() {
            const totals = calculateTotals()
            
            let html = `
                <div class="px-7 py-6">
                    <div class="text-center">
                        <div class="mx-auto w-16 h-16 bg-emerald-400 text-zinc-950 rounded-2xl flex items-center justify-center text-4xl mb-4">🏁</div>
                        <div class="uppercase text-xs tracking-widest font-medium">Day complete!</div>
                        <div class="text-3xl text-white mt-2">Great job today</div>
                    </div>
                    
                    <div class="my-10 bg-zinc-950 rounded-3xl py-7 px-6">
                        <div class="flex justify-between text-xs mb-6">
                            <div class="text-zinc-400">TOTAL CONSUMED</div>
                            <div class="font-mono text-3xl">${totals.cal}</div>
                        </div>
                        
                        <div class="flex gap-x-5">
                            <div class="flex-1 bg-zinc-900 rounded-2xl p-4 text-center">
                                <div class="text-blue-400 text-xs mb-1">PROTEIN</div>
                                <div class="text-4xl">${totals.protein}</div>
                                <div class="text-xs text-zinc-400">grams</div>
                            </div>
                            <div class="flex-1 bg-zinc-900 rounded-2xl p-4 text-center">
                                <div class="text-amber-400 text-xs mb-1">CARBS</div>
                                <div class="text-4xl">${totals.carbs}</div>
                                <div class="text-xs text-zinc-400">grams</div>
                            </div>
                            <div class="flex-1 bg-zinc-900 rounded-2xl p-4 text-center">
                                <div class="text-rose-400 text-xs mb-1">FAT</div>
                                <div class="text-4xl">${totals.fat}</div>
                                <div class="text-xs text-zinc-400">grams</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-xs text-zinc-400 text-center mb-8">
                        Your average intake this week is <span class="text-white">1870 kcal</span>
                    </div>
                    
                    <div class="flex items-center gap-x-4">
                        <button onclick="hideModal();startNewDay()" 
                                class="flex-1 py-6 text-xs bg-white text-zinc-950 font-semibold rounded-3xl">START NEW DAY</button>
                        <button onclick="hideModal()" 
                                class="flex-1 py-6 text-xs border border-zinc-300 font-medium rounded-3xl">KEEP CURRENT</button>
                    </div>
                </div>
            `
            document.getElementById("modal-content").innerHTML = html
            document.getElementById("modal-backdrop").classList.remove("hidden")
            document.getElementById("modal-backdrop").classList.add("flex")
        }
        
        function startNewDay() {
            // archive current log to history
            if (currentLog.length > 0) {
                window.historyLogs = window.historyLogs || []
                window.historyLogs.unshift({
                    date: "Jan 18",
                    totalKcal: calculateTotals().cal,
                    logCount: currentLog.length,
                    log: [...currentLog]
                })
            }
            
            // reset current log
            currentLog = []
            
            // reset water
            waterIntake = 250
            
            renderLiveSummary()
            renderFullLog()
            updateDashboardFoods()
            
            // add a celebratory message
            addSystemMessage("New day started. Let's hit those goals!", "tip")
            
            // switch back to chat
            switchTab(0)
        }
        
        function renderHistory() {
            const container = document.getElementById("history-list")
            container.innerHTML = ""
            
            const fakeHistory = window.historyLogs || [
                { date: "Jan 17", totalKcal: 1980, logCount: 6 },
                { date: "Jan 16", totalKcal: 1740, logCount: 4 },
                { date: "Jan 15", totalKcal: 2310, logCount: 8 }
            ]
            
            fakeHistory.forEach((day, i) => {
                const card = document.createElement("div")
                card.className = "bg-zinc-800 rounded-3xl p-6 cursor-pointer hover:ring hover:ring-2 hover:ring-offset-4 hover:ring-offset-zinc-900 hover:ring-emerald-300 transition-all"
                card.innerHTML = `
                    <div class="flex justify-between">
                        <div class="font-medium">${day.date}</div>
                        <div class="text-xs text-emerald-400">${day.totalKcal} kcal</div>
                    </div>
                    <div class="text-xs text-zinc-400">${day.logCount} foods logged</div>
                    
                    <div class="h-px bg-zinc-700 my-6"></div>
                    
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-x-5">
                            <div class="px-4 py-2 bg-black/30 rounded-3xl">View details</div>
                        </div>
                        <div class="font-light text-zinc-500">${Math.round(Math.random() * 40 + 60)}% on target</div>
                    </div>
                `
                container.appendChild(card)
            })
        }
        
        function fakeExportReport() {
            const modalHTML = `
                <div class="p-8 text-center">
                    <i class="fa-solid fa-file-pdf text-6xl text-red-400 mb-6"></i>
                    <div class="font-semibold text-xl mb-2">Report ready!</div>
                    <div class="max-w-[210px] mx-auto text-xs text-zinc-400 mb-8">Your 30-day nutrition summary has been generated as a PDF and downloaded.</div>
                    <div onclick="hideModal()" class="cursor-pointer inline-block px-7 py-4 text-xs border border-zinc-400 rounded-3xl">CLOSE WINDOW</div>
                </div>
            `
            document.getElementById("modal-content").innerHTML = modalHTML
            document.getElementById("modal-backdrop").classList.remove("hidden")
            document.getElementById("modal-backdrop").classList.add("flex")
        }
        
        function logWater() {
            waterIntake = Math.min(waterIntake + 250, 3500)
            
            const notif = document.createElement("div")
            notif.style.cssText = "position:fixed; bottom:40px; right:340px; background:rgb(16 185 129); color:white; font-size:10px; padding:4px 18px; border-radius:9999px; box-shadow: 0 10px 15px -3px rgb(16 185 129); animation: popUp 1.2s both;"
            notif.textContent = `+250 ml water logged. Total: ${waterIntake}ml`
            document.body.appendChild(notif)
            
            setTimeout(() => {
                notif.style.transitionDuration = "600ms"
                notif.style.opacity = 0
                setTimeout(() => notif.remove(), 600)
            }, 2100)
        }
        
        function getNewTip() {
            const tips = [
                "Adding herbs and spices can improve flavor without adding calories.",
                "Try eating protein first in your meals for better satiety.",
                "A handful of berries can satisfy a sweet craving for under 80 calories.",
                "Your fiber intake seems low. Consider adding more vegetables."
            ]
            const randomTip = tips[Math.floor(Math.random() * tips.length)]
            document.getElementById("ai-tip").textContent = randomTip
        }
        
        function resetDemo() {
            if (confirm("Reset the chat view?")) {
                // Meals live in Firestore (single source of truth); only reset the
                // transient chat conversation and re-render from persisted data.
                renderLiveSummary()
                renderFullLog()
                updateDashboardFoods()
                renderChatWelcome()
            }
        }
        
        function clearLog() {
            if (confirm("Clear today's entire food log?")) {
                currentLog = []
                renderLiveSummary()
                renderFullLog()
            }
        }
        
        function seedDemoData() {
            // Replaced by real Firestore listeners
            // currentLog = getInitialLog()
        }
        
        // ── Apply Firestore profile to the dashboard UI ───────────────────────
        // Called by the module auth script (index.html) BEFORE the app shell is
        // revealed, so users never see a flash of default values.
        window.applyUserProfile = function (profileData) {
            const nutrition = profileData?.nutrition || {};
            const profile   = profileData?.profile   || {};

            // Update module-level goal variables
            if (nutrition.dailyCalories) dailyGoal    = Math.round(nutrition.dailyCalories);
            if (nutrition.proteinG)      proteinGoal  = Math.round(nutrition.proteinG);
            if (nutrition.carbsG)        carbGoal     = Math.round(nutrition.carbsG);
            if (nutrition.fatG)          fatGoal      = Math.round(nutrition.fatG);

            // Calorie goal label in sidebar ring
            const goalEl = document.getElementById("calorie-goal-display");
            if (goalEl) goalEl.textContent = `/ ${dailyGoal}`;

            // Macro goal labels
            const proGoalEl  = document.getElementById("sidebar-protein-goal");
            const carbGoalEl = document.getElementById("sidebar-carb-goal");
            const fatGoalEl  = document.getElementById("sidebar-fat-goal");
            if (proGoalEl)  proGoalEl.textContent  = `${proteinGoal}g`;
            if (carbGoalEl) carbGoalEl.textContent = `${carbGoal}g`;
            if (fatGoalEl)  fatGoalEl.textContent  = `${fatGoal}g`;

            // Time-aware greeting with real first name
            const greetEl = document.getElementById("dashboard-greeting");
            if (greetEl) {
                const displayName = profile.displayName || "there";
                const firstName   = displayName.split(" ")[0];
                const hour = new Date().getHours();
                const salutation  = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
                greetEl.textContent = `Good ${salutation}, ${firstName} 👋`;
            }

            // Re-render progress bars and ring with updated targets
            renderLiveSummary();
        };
        
        function bootstrap() {
            initializeTailwind()
            seedDemoData()
            
            // initial chat
            renderChatWelcome()
            
            // initial live panel and sidebar
            renderLiveSummary()
            updateDashboardFoods()
            
            // keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.metaKey && e.key === "k") {
                    e.preventDefault()
                    const input = document.getElementById("user-input")
                    if (currentTab === 0) input.focus()
                    else switchTab(0)
                }
            })
            
            // make sure first tab is visible
            document.getElementById("chat-tab").classList.remove("hidden")
            
            // demo: add a bot message after 2100ms
            setTimeout(() => {
                if (document.getElementById("chat-messages").children.length < 4) {
                    addSystemMessage("Try adding a food using the input box below 👇", "tip")
                }
            }, 2100)
            
            // keyboard hint
            console.log('%c👾 NutriGPT demo ready. Try typing foods with weights!', 'font-family:monospace;color:#10b981;font-size:10px')
        }
        
        // Start the app
        window.onload = bootstrap
        // (Sprint 1: unified Firestore meal data model)

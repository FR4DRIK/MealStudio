
let selectedFood = null;

//#region LOCAL STORAGE //

// SPARA MÅLTIDER
function saveMeals() {
    localStorage.setItem(
        "mealList",
        JSON.stringify(mealList)
    );
}

// LÄS IN MÅLTIDER
function loadMeals() {
    const savedMeals = localStorage.getItem("mealList");

    if (savedMeals !== null) {
        mealList.push(...JSON.parse(savedMeals));
    }
    console.log("Inlästa måltider:", mealList);
}


//#endregion


//#region LOAD MASTERLIST JSON TO FOOD DROPDOWN //

const FOOD_STORAGE_KEY = "foodDatabase";
let foodDatabase = [];

function saveFoodDatabase() {
    localStorage.setItem(
        FOOD_STORAGE_KEY,
        JSON.stringify(foodDatabase)
    );
}

async function loadFoods() {
    const savedFoods = localStorage.getItem(FOOD_STORAGE_KEY);

    if (savedFoods !== null) {
        try {
            foodDatabase = JSON.parse(savedFoods);

            if (!Array.isArray(foodDatabase)) {
                throw new Error("Ogiltigt JSON-format.");
            }
        } catch (error) {
            console.error("Kunde inte läsa lokal livsmedelsdata:", error);
            return;
        }
    } else {
        try {
            const response = await fetch("masterlist.json");

            if (!response.ok) {
                throw new Error(`HTTP-fel: ${response.status}`);
            }

            foodDatabase = await response.json();

            if (!Array.isArray(foodDatabase)) {
                throw new Error("masterlist.json måste innehålla en lista.");
            }
        } catch (error) {
            console.error("Kunde inte ladda masterlist.json:", error);
            return;
        }
    }

    const searchInput = document.getElementById("foodSearchInput");
    const dropdownList = document.getElementById("foodDropdownList");

    if (!searchInput || !dropdownList) {
        console.error("Kunde inte hitta livsmedelssökningens HTML-element.");
        return;
    }

    function renderFoodDropdown() {
        const searchText = searchInput.value.toLocaleLowerCase("sv");

        dropdownList.replaceChildren();

        const matches = foodDatabase
            .filter(food =>
                food.name.toLocaleLowerCase("sv").includes(searchText)
            )
            .sort((a, b) => a.name.localeCompare(b.name, "sv"));

        matches.forEach(food => {
            const item = document.createElement("div");
            item.textContent = food.name;
            item.classList.add("dropdown-item");

            item.addEventListener("click", () => {
                selectedFood = food;
                searchInput.value = food.name;
                dropdownList.replaceChildren();

                console.log(selectedFood.kcal100);
            });

            dropdownList.appendChild(item);
        });
    }

    searchInput.addEventListener("input", renderFoodDropdown);

    searchInput.addEventListener("focus", () => {
        searchInput.select();
        renderFoodDropdown();
    });

    document.addEventListener("click", event => {
        if (
            !searchInput.contains(event.target) &&
            !dropdownList.contains(event.target)
        ) {
            dropdownList.replaceChildren();
        }
    });
}

loadFoods();

//#endregion


 //#region FOOD DATABASE EDITOR

let editingFoodId = null;

const editSearchInput = document.getElementById("editSearchInput");
const editDropdownList = document.getElementById("editDropdownList");
const addNewFoodBtn = document.getElementById("addNewFoodBtn");
const editFields = document.getElementById("editFields");
const abortBtn = document.getElementById("abortBtn");
const deleteFoodBtn = document.getElementById("deleteFoodBtn");
const saveEditBtn = document.getElementById("saveEditBtn");

function calculateFood(food) {
    food.kcal = Math.round(
        Number(food.kcal100) * Number(food.weight) / 100
    );

    food.cWeight = Math.round(
        Number(food.weight) * Number(food.cPercent) / 100
    );

    return food;
}

function renderEditSearch() {
    const query = editSearchInput.value.toLocaleLowerCase("sv");

    editDropdownList.replaceChildren();

    foodDatabase
        .filter(food => food.name.toLocaleLowerCase("sv").includes(query))
        .sort((a, b) => a.name.localeCompare(b.name, "sv"))
        .forEach(food => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = food.name;

            item.addEventListener("click", () => {
                openFoodEditor(food);
                editDropdownList.replaceChildren();
            });

            editDropdownList.appendChild(item);
        });
}

function openFoodEditor(food = null) {
    editingFoodId = food ? food.id : null;

        // Återställ sökfält och dropdown
    editSearchInput.value = "";
    editDropdownList.replaceChildren();

    const currentFood = food || {
        type: "food",
        name: "",
        kcal100: 0,
        weight: 0,
        cPercent: 100,
        category: null
    };

    editFields.replaceChildren();

    const fields = [
        ["name", "Food", "text"],
        ["kcal100", "Kcal (100 g)", "number"],
        ["weight", "Weight (g)", "number"],
        ["cPercent", "Cooked Percent (%)", "number"],
        ["category", "Category", "text"]
    ];

    fields.forEach(([key, label, type]) => {
        const wrapper = document.createElement("label");
        wrapper.className = "edit-row";
        wrapper.textContent = label;

        const input = document.createElement("input");
        input.className = "edit-input";
        input.type = type;
        input.dataset.field = key;

        if (key === "category") {
            input.value = currentFood.category ?? "";
        } else {
            input.value = currentFood[key] ?? "";
        }

        if (type === "number") {
            input.min = "0";
            input.step = "any";
        }

        wrapper.appendChild(input);
        editFields.appendChild(wrapper);
    });

showCards([editSearchCard, editCard]);
deleteFoodBtn.classList.toggle("hidden", !food);

}

function closeFoodEditor() {
    editingFoodId = null;
    editFields.replaceChildren();

    deleteFoodBtn.classList.add("hidden");

    showCards([editSearchCard]);
}

//skapa food id //
function createFoodId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    // Reservlösning för webbläsare som saknar randomUUID()
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function saveFoodEdit() {
    const values = {};

    editFields.querySelectorAll("[data-field]").forEach(input => {
        values[input.dataset.field] = input.value.trim();
    });

    if (!values.name) {
        alert("Ange ett namn på livsmedlet.");
        return;
    }

    const kcal100 = Number(values.kcal100);
    const weight = Number(values.weight);
    const cPercent = Number(values.cPercent);

    if (
        values.kcal100 === "" ||
        values.weight === "" ||
        values.cPercent === "" ||
        !Number.isFinite(kcal100) ||
        !Number.isFinite(weight) ||
        !Number.isFinite(cPercent) ||
        kcal100 < 0 ||
        weight < 0 ||
        cPercent < 0
    ) {
        alert("Kontrollera calories, weight och cooked percent.");
        return;
    }

    const duplicate = foodDatabase.some(food =>
        food.name.toLocaleLowerCase("sv") ===
            values.name.toLocaleLowerCase("sv") &&
        food.id !== editingFoodId
    );

    if (duplicate && !confirm("Ett livsmedel med samma namn finns redan. Vill du fortsätta?")) {
        return;
    }

    const food = {
        id: editingFoodId || createFoodId(),
        type: "food",
        name: values.name,
        kcal100,
        weight,
        cPercent,
        category: values.category || null
    };

    calculateFood(food);

    if (editingFoodId) {
        const index = foodDatabase.findIndex(
            item => item.id === editingFoodId
        );

        if (index === -1) {
            alert("Livsmedlet kunde inte hittas.");
            return;
        }

        foodDatabase[index] = food;
    } else {
        foodDatabase.push(food);
    }

    saveFoodDatabase();
    renderEditSearch();
    visaToast("Livsmedlet har sparats!");

    // Uppdatera vald referens om den redigerade posten används.
    if (typeof selectedFood !== "undefined" &&
        selectedFood?.id === food.id) {
        selectedFood = food;
    }

    closeFoodEditor();
}

function deleteFood() {
    if (!editingFoodId) return;

    const food = foodDatabase.find(
        item => item.id === editingFoodId
    );

    if (!food) return;

    if (!confirm(`Vill du radera "${food.name}"?`)) return;

    foodDatabase = foodDatabase.filter(
        item => item.id !== editingFoodId
    );

    saveFoodDatabase();
    visaToast("Livsmedlet har raderats!");

    if (typeof selectedFood !== "undefined" &&
        selectedFood?.id === editingFoodId) {
        selectedFood = null;
    }

    renderEditSearch();
    closeFoodEditor();
}

function exportFoodDatabase() {
    const json = JSON.stringify(foodDatabase, null, 2);
    const blob = new Blob([json], {
        type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "masterlist.json";
    link.click();

    URL.revokeObjectURL(url);
}

editSearchInput.addEventListener("input", renderEditSearch);

editSearchInput.addEventListener("focus", () => {renderEditSearch();
});

addNewFoodBtn.addEventListener("click", () => {
    openFoodEditor();
});

saveEditBtn.addEventListener("click", saveFoodEdit);
abortBtn.addEventListener("click", closeFoodEditor);
deleteFoodBtn.addEventListener("click", deleteFood);

// Stäng redigerings-dropdown när man klickar utanför
document.addEventListener("click", event => {
    const editSearchCard = document.getElementById("editSearchCard");

    if (
        !editSearchCard.contains(event.target)
    ) {
        editDropdownList.replaceChildren();
    }
});

//#endregion


//#region DAY SELECTOR BAR  //
const days = document.getElementById("days");
let selectedDate = new Date();

for (let i = -3; i <= 3; i++) {
  const date = new Date();
  date.setDate(date.getDate() + i);

  const button = document.createElement("button");
  button.textContent = date.toLocaleDateString("sv-SE", {
    /*weekday: "short",*/
    day: "numeric"
  });

  if (i === 0) button.classList.add("active"); //ändras vid val av annan dag
  if (i === 0) button.classList.add("today"); //gör så att innevarande dag markeras

button.onclick = () => {
    selectedDate = date;

    days.querySelectorAll("button").forEach(b =>
        b.classList.remove("active")
    );

    button.classList.add("active");
    renderSelectedDay(); /*renderar dagens dag/datum som rubrik på måltidskortet VID VAL AV NY DAG*/

    renderMeals();
};

  days.appendChild(button);

  if (date.getDay() === 0 || date.getDay() === 6) {
  button.classList.add("weekend");
}
    renderSelectedDay(); /*renderar dagens dag/datum som rubrik på måltidskortet GENERELLT*/
}
//#endregion //

//#region MEALLIST //
// MEALLIST - REDOVISNING AV MÅLTIDER //

function renderMeals() {
    const list = document.getElementById("mealList");
    const date = formatDate(selectedDate);

    list.replaceChildren();

    mealList
        .filter(post => post.day === date)
        .sort((a, b) =>
            mealOrder[a.mealType] - mealOrder[b.mealType]
        )
        .forEach(post => {
            const item = document.createElement("li");

            const foodName = document.createElement("div");
            foodName.textContent = post.food;

            const details = document.createElement("div");

            const amount = document.createElement("span");
            amount.className = "amount";
            amount.textContent = `${post.amount} st`;

            const gram = document.createElement("span");
            gram.className = "gram";
            gram.textContent = `${post.gram} g`;

            const cWeight = document.createElement("span");
            cWeight.className = "cWeight";
            cWeight.textContent = `${post.cWeight} gc`;

            const kcal = document.createElement("span");
            kcal.className = "kcal";
            kcal.textContent = `${post.kcal} kcal`;

            details.classList.add("meal-details");

            details.append(
                amount,
                gram,
                cWeight,
                kcal
            );

        item.append(foodName, details);
        item.classList.add(post.mealType);

        const editBtn = document.createElement("button");
            editBtn.textContent = "✎";
            editBtn.classList.add("edit-btn");
            editBtn.onclick = () => editMeal(post);

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "⌫";
            deleteBtn.classList.add("delete-btn");

        deleteBtn.onclick = () => {
        if (confirm("Vill du verkligen radera måltiden?")) {
            mealList.splice(mealList.indexOf(post), 1);
            saveMeals();
            renderMeals();
            visaToast("Måltiden har raderats!");
        }
            };

            item.append(editBtn, deleteBtn);
            list.appendChild(item);
        });

        renderTotalKcal();
    }

    // MEALLIST - DAG OCH DATUM //
    function renderSelectedDay() {
        const dateString = selectedDate.toLocaleDateString("sv-SE", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

        document.getElementById("selectedDayTitle").textContent =
            dateString.charAt(0).toUpperCase() + dateString.slice(1);
    }

    // MEALLIST - SORTERING EFTER MÅLTIDSTYP //
    const mealList = [];
    loadMeals();
    let editingMeal = null;

    const mealOrder = {
        breakfast: 1,
        lunch: 2,
        dinner: 3,
        evening: 4
    };

    //ÅTERSTÄLL INPUTS VID REDIGERING AV MEALLIST //
 function editMeal(post) {
    editingMeal = post;

    selectedFood = post.foodData;
    document.getElementById("foodSearchInput").value = post.food;
    document.getElementById("amountInput").value = post.amount;
    document.getElementById("weightInput").value = post.weightInput;

    document.querySelector(
        `input[name="mealType"][value="${post.mealType}"]`
    ).checked = true;

    const button = document.getElementById("addButton");
    button.textContent = "Spara";
    button.classList.add("editing");
}
//#endregion //

//#region STÖDFUNKTIONER //
// FORMATERING DATUM //
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// BERÄKNING AV DAGENS KCAL //
function renderTotalKcal() {
    const date = formatDate(selectedDate);

    const totalKcal = mealList
        .filter(post => post.day === date)
        .reduce((sum, post) => sum + post.kcal, 0);

    document.getElementById("totalKcal").textContent =
        `${Math.round(totalKcal)} kcal`;

    renderKcalRemaining(totalKcal);
}

// BERÄKNA ÅTERSTÅENDE KCAL // 
const kcalGoalInput = document.getElementById("kcalGoal");
const kcalRemaining = document.getElementById("kcalRemaining");

kcalGoalInput.addEventListener("input", () => {renderTotalKcal();});

function renderKcalRemaining(totalKcal) {
    const goal = Number(kcalGoalInput.value);

    if (kcalGoalInput.value === "" || goal <= 0) {
        kcalRemaining.textContent = "Ange dagsmål";
        kcalRemaining.classList.remove("kcal-under", "kcal-over");
        return;
    }

    const remaining = goal - totalKcal;

    kcalRemaining.textContent =
        remaining > 0
            ? `${remaining} kcal`
            : remaining < 0
                ? `+${Math.abs(remaining)} kcal`
                : "Mål uppnått";

    kcalRemaining.classList.remove("kcal-under", "kcal-over");

    if (remaining > 0) {
        kcalRemaining.classList.add("kcal-under");
    } else if (remaining < 0) {
        kcalRemaining.classList.add("kcal-over");
    }
}

// LÄGG-TILL-MÅLTID KNAPPEN  - addBtn //
function addBtn() {
    if (!selectedFood) {
        alert("Välj ett livsmedel först!");
        return;
    }

    const weight = selectedFood.weight;
    const weightValue = document.getElementById("weightInput").value;
    const amountInput = document.getElementById("amountInput");
        const amountValue = amountInput.value === "" ? "1" : amountInput.value;     
    const date = formatDate(selectedDate);
    const mealType = document.querySelector('input[name="mealType"]:checked').value;

    let gram;

    if (weightValue !== "" && amountValue !== "") {
        gram = Number(weightValue) * Number(amountValue);

    } else if (weightValue !== "") {
        gram = Number(weightValue);

    } else if (amountValue !== "") {
        gram = Number(amountValue) * selectedFood.weight;

    } else {
        alert("Ange antal eller vikt!");
        return;
    }

    const post = {
        day: date,
        amount: amountValue === "" ? null : Number(amountValue),
        gram: gram,
        mealType: mealType,
        food: selectedFood.name,
        kcal100: selectedFood.kcal100,
        kcal: Math.round(selectedFood.kcal100 * gram / 100),
        cWeight: gram * selectedFood.cPercent / 100,
        foodData: selectedFood,
        weightInput: weightValue,
    };

   if (editingMeal) {
        Object.assign(editingMeal, post);
        editingMeal = null;
    } else {
        mealList.push(post);
    }
        saveMeals();
        renderMeals();
        selectedFood = null;
        visaToast("Måltiden har sparats!");

        document.getElementById("weightInput").value = "";
        document.getElementById("amountInput").value =
        document.getElementById("amountInput").defaultValue;
        document.getElementById("foodSearchInput").value = "";

    // Återställ knappen efter sparandet
        const button = document.getElementById("addButton");
        button.textContent = "Lägg till";
        button.classList.remove("editing");
}

// DÖLJ OCH VISA SETTINGS CARD //
// KORT
const settingsToggle = document.getElementById("settingsToggle");
const settingsCard = document.getElementById("settingsCard");
const settingsClose = document.getElementById("settingsClose");

const foodSelectCard = document.getElementById("foodSelectCard");
const mealListCard = document.getElementById("mealListCard");

const editMasterListBtn = document.getElementById("editMasterListBtn");
const editSearchCard = document.getElementById("editSearchCard");
const editCard = document.getElementById("editCard");

// VISA VALDA KORT
function showCards(cardsToShow) {
    const allCards = [
        settingsCard,
        foodSelectCard,
        mealListCard,
        editSearchCard,
        editCard
    ];

    allCards.forEach(card => {
        card.hidden = true;
    });

    cardsToShow.forEach(card => {
        card.hidden = false;
    });
}

// NORMAL LÄGE
showCards([foodSelectCard, mealListCard]);

// INSTÄLLNINGAR
settingsToggle.addEventListener("click", () => {
    showCards([settingsCard]);
});

// STÄNG INSTÄLLNINGAR
settingsClose.addEventListener("click", () => {
    showCards([foodSelectCard, mealListCard]);
});

editClose.addEventListener("click", () => {
    showCards([settingsCard]);
});

// ÖPPNA MASTERLIST
editMasterListBtn.addEventListener("click", () => {
    showCards([editSearchCard]);
});

// AVBRYT REDIGERING
abortBtn.addEventListener("click", () => {
    closeFoodEditor();
});

/* ========================================
   THEME - SAVE AND RESTORE
======================================== */

const themeSelect = document.getElementById("themeSelect");
const THEME_STORAGE_KEY = "mealStudioTheme";

function applyTheme(theme) {
    const validThemes = [
        "cold", "earth", "happy", "night", "vivid", "wood"
    ];

    if (!validThemes.includes(theme)) return;

    document.body.className = theme + "-theme";
    themeSelect.value = theme;
}

// Återställ sparat tema
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
applyTheme(savedTheme || themeSelect.value || "cold");

// Spara nytt tema direkt vid byte
themeSelect.addEventListener("change", function () {
    applyTheme(this.value);
    localStorage.setItem(THEME_STORAGE_KEY, this.value);
    visaToast("Temat har ändrats!");
});


// MARKERA TEXT I INPUTS //
document.querySelectorAll("input[type='text'], input[type='number']").forEach(input => {
    input.addEventListener("focus", function () {
        this.select();
    });
});

// ÅTERSTÄLL ADD - / EDIT BUTTON EFTER REDIGERING //
function resetMealButton() {
    const button = document.getElementById("addButton");

    button.textContent = "Lägg till måltid";
    button.classList.remove("editing");

    editingMeal = null;
}

//#endregion//

/* ========================================
   DAILY KCAL GOAL - SAVE AND RESTORE
======================================== */

const KCAL_GOAL_STORAGE_KEY = "mealStudioKcalGoal";
const saveSettingsBtn = document.getElementById("saveBtn");

// Återställ sparat dagsmål när appen startar
const savedKcalGoal = localStorage.getItem(KCAL_GOAL_STORAGE_KEY);

if (savedKcalGoal !== null) {
    kcalGoalInput.value = savedKcalGoal;
}

// Spara dagsmålet när man trycker på Save
saveSettingsBtn.addEventListener("click", function (event) {
    event.preventDefault();

    const value = kcalGoalInput.value.trim();

    if (value === "") {
        localStorage.removeItem(KCAL_GOAL_STORAGE_KEY);
        renderTotalKcal();
        return;
    }

    const goal = Number(value);
    visaToast("Målet har sparats!");

    if (!Number.isFinite(goal) || goal <= 0) {
        alert("Ange ett giltigt dagsmål i kcal.");
        return;
    }

    localStorage.setItem(KCAL_GOAL_STORAGE_KEY, String(goal));
    renderTotalKcal();
});


// STARTA APPEN MED SPARADE MÅLTIDER
renderMeals();


/* ========================================
   MASTERLIST IMPORT / EXPORT
======================================== */

const importBtn = document.getElementById("importBtn");
const importMasterFile = document.getElementById("importMasterFile");
const exportBtn = document.getElementById("exportBtn");

// IMPORT
importBtn.addEventListener("click", () => {
    importMasterFile.click();
});

importMasterFile.addEventListener("change", async () => {
    const file = importMasterFile.files[0];

    if (!file) return;

    try {
        const text = await file.text();
        const importedFoods = JSON.parse(text);

        // Grundläggande validering
        if (!Array.isArray(importedFoods)) {
            throw new Error("JSON-filen måste innehålla en lista.");
        }

        // Kontrollera att varje livsmedel har de viktigaste fälten
        const validFoods = importedFoods.every(food =>
            food &&
            typeof food === "object" &&
            !Array.isArray(food) &&
            typeof food.id === "string" &&
            typeof food.name === "string" &&
            typeof food.kcal100 === "number"
        );

        if (!validFoods) {
            throw new Error(
                "Filen innehåller livsmedel med felaktiga eller saknade fält."
            );
        }

        const confirmed = confirm(
            `Importera ${importedFoods.length} livsmedel? ` +
            "Detta ersätter din nuvarande lokala databas."
        );

        if (!confirmed) return;

        // Säkerhetskopia av den nuvarande databasen
        const previousFoods = foodDatabase;

        try {
            foodDatabase = importedFoods;
            saveFoodDatabase();
        } catch (error) {
            foodDatabase = previousFoods;
            throw error;
        }

        alert("Importen lyckades! Ladda om sidan för att uppdatera appen.");

    } catch (error) {
        console.error("Importfel:", error);
        alert("Importen misslyckades: " + error.message);
    } finally {
        // Gör det möjligt att välja samma fil igen
        importMasterFile.value = "";
    }
});

// EXPORT
exportBtn.addEventListener("click", () => {
    try {
        const json = JSON.stringify(foodDatabase, null, 2);

        const blob = new Blob([json], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "masterlist.json";

        document.body.appendChild(link);
        link.click();
        link.remove();

        // Fördröj frigörandet för bättre kompatibilitet med Safari
        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
        console.error("Exportfel:", error);
        alert("Exporten misslyckades: " + error.message);
    }
});


/* ========================================
   RESET LOCAL STORAGE
======================================== */

const clearAllStorageBtn = document.getElementById("clearAllStorageBtn");

clearAllStorageBtn.addEventListener("click", () => {
    const confirmed = confirm(
        "Vill du rensa all lokal lagring för MealStudio? " +
        "Det kan även ta bort inställningar och andra sparade uppgifter."
    );

    if (!confirmed) return;

    localStorage.clear();
    location.reload();
});


/* ========================================
   RESTORE MASTERLIST FROM GITHUB
======================================== */

const resetMasterListBtn = document.getElementById("resetMasterListBtn");

const MASTERLIST_URL =
    "https://raw.githubusercontent.com/FR4DRIK/MealStudio/main/masterlist.json";

resetMasterListBtn.addEventListener("click", async () => {
    const confirmed = confirm(
        "Vill du återställa livsmedelsdatabasen från GitHub? " +
        "Dina lokala ändringar i livsmedelslistan kommer att ersättas."
    );

    if (!confirmed) return;

    resetMasterListBtn.disabled = true;

    try {
        const response = await fetch(MASTERLIST_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP-fel: ${response.status}`);
        }

        const restoredFoods = await response.json();

        if (!Array.isArray(restoredFoods)) {
            throw new Error("GitHub-filen innehåller inte en giltig lista.");
        }

        const validFoods = restoredFoods.every(food =>
            food &&
            typeof food === "object" &&
            !Array.isArray(food) &&
            typeof food.id === "string" &&
            typeof food.name === "string" &&
            typeof food.kcal100 === "number"
        );

        if (!validFoods) {
            throw new Error("Livsmedelsdatabasen har ett ogiltigt format.");
        }

        const previousFoods = foodDatabase;

        try {
            foodDatabase = restoredFoods;
            saveFoodDatabase();
        } catch (error) {
            foodDatabase = previousFoods;
            throw error;
        }

        visaToast(`Klart! ${restoredFoods.length} livsmedel har återställts från GitHub.`);

        location.reload();

    } catch (error) {
        console.error("Kunde inte återställa MasterList:", error);

        alert(
            "Återställningen misslyckades. Din befintliga lokala databas " +
            "har inte avsiktligt ersatts.\n\n" + error.message
        );
    } finally {
        resetMasterListBtn.disabled = false;
    }
});



document.getElementById("editMasterListBtn").addEventListener("click", () => {
    const card = document.getElementById("editSearchCard");

    console.log("EDIT SEARCH CARD:", card);
    console.log("HTML:", card.outerHTML);
    console.log("Förälder:", card.parentElement);
    console.log("Förälderns höjd:", card.parentElement?.getBoundingClientRect().height);
    console.log("Kortets CSS:", {
        display: getComputedStyle(card).display,
        visibility: getComputedStyle(card).visibility,
        height: getComputedStyle(card).height,
        position: getComputedStyle(card).position,
        overflow: getComputedStyle(card).overflow
    });
});

/* TOASTS */
let toastTimer;

function visaToast(meddelande) {
    const toast = document.getElementById("toast");

    toast.textContent = meddelande;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}
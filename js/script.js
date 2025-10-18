const STORAGE_KEY = "todo-list";

const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const dateInput = document.querySelector("#date-input");
const taskList = document.querySelector("#task-list");
const statusFilter = document.querySelector("#status-filter");
const deleteAllButton = document.querySelector("#delete-all");

let tasks = loadTasks();
setMinDueDate();
renderTasks();

form.addEventListener("submit", (event) => {
    event.preventDefault();

    clearValidation();
    const taskTitle = taskInput.value.trim();
    const dueDate = dateInput.value;

    let hasError = false;

    if (!taskTitle) {
        taskInput.setCustomValidity("Please enter a task to add.");
        hasError = true;
    }

    if (!dueDate) {
        dateInput.setCustomValidity("Please select a due date.");
        hasError = true;
    } else if (isPastDate(dueDate)) {
        dateInput.setCustomValidity("Due date cannot be in the past.");
        hasError = true;
    }

    if (hasError) {
        form.reportValidity();
        return;
    }

    const newTask = {
        id: crypto.randomUUID(),
        title: taskTitle,
        dueDate,
        completed: false,
        important: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    persistTasks();
    renderTasks();
    form.reset();
    setMinDueDate();
    taskInput.focus();
});

statusFilter.addEventListener("change", renderTasks);

deleteAllButton.addEventListener("click", () => {
    if (!tasks.length) {
        return;
    }

    const confirmed = confirm("Delete all tasks? This cannot be undone.");
    if (!confirmed) {
        return;
    }

    tasks = [];
    persistTasks();
    renderTasks();
});

taskList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const taskId = button.closest("tr").dataset.id;
    const action = button.dataset.action;

    if (action === "toggle") {
        toggleTask(taskId);
    } else if (action === "important") {
        toggleImportant(taskId);
    } else if (action === "delete") {
        deleteTask(taskId);
    }
});

function renderTasks() {
    const filteredTasks = getFilteredTasks();
    taskList.innerHTML = "";

    if (!filteredTasks.length) {
        const emptyRow = document.createElement("tr");
        emptyRow.className = "empty-row";
        emptyRow.innerHTML = `<td colspan="4">No tasks found</td>`;
        taskList.append(emptyRow);
        return;
    }

    const displayTasks = sortTasks(filteredTasks);

    for (const task of displayTasks) {
        const row = document.createElement("tr");
        row.dataset.id = task.id;
        row.classList.toggle("is-important", task.important);
        const titleClass = task.important ? "task-title task-title--important" : "task-title";
        row.innerHTML = `
            <td><span class="${titleClass}">${escapeHTML(task.title)}</span></td>
            <td>${formatDate(task.dueDate)}</td>
            <td>${buildStatusChip(task)}</td>
            <td>
                <div class="actions">
                    <button type="button" data-action="toggle" class="${task.completed ? "is-completed" : ""}">
                        ${task.completed ? "Mark Pending" : "Mark Done"}
                    </button>
                    <button type="button" data-action="important" class="${task.important ? "is-important" : ""}">
                        ${task.important ? "Unmark Important" : "Mark Important"}
                    </button>
                    <button type="button" data-action="delete">Delete</button>
                </div>
            </td>
        `;
        taskList.append(row);
    }
}

function buildStatusChip(task) {
    const overdue = isPastDate(task.dueDate) && !task.completed;
    const classes = [
        "status-chip",
        overdue ? "status-chip--overdue" : `status-chip--${task.completed ? "completed" : "pending"}`
    ];

    if (task.important) {
        classes.push("status-chip--important");
    }

    const labels = [];
    if (overdue) {
        labels.push("Overdue");
    } else {
        labels.push(task.completed ? "Completed" : "Pending");
    }

    if (task.important) {
        labels.push("Important");
    }

    return `<span class="${classes.join(" ")}">${labels.join(" • ")}</span>`;
}

function getFilteredTasks() {
    const view = statusFilter.value;
    return tasks.filter((task) => {
        if (view === "all") {
            return true;
        }

        if (view === "pending") {
            return !task.completed && !isPastDate(task.dueDate);
        }

        if (view === "completed") {
            return task.completed;
        }

        if (view === "overdue") {
            return !task.completed && isPastDate(task.dueDate);
        }

        return true;
    });
}

function toggleTask(taskId) {
    tasks = tasks.map((task) =>
        task.id === taskId
            ? { ...task, completed: !task.completed }
            : task
    );
    persistTasks();
    renderTasks();
}

function toggleImportant(taskId) {
    tasks = tasks.map((task) =>
        task.id === taskId
            ? { ...task, important: !task.important }
            : task
    );
    persistTasks();
    renderTasks();
}

function deleteTask(taskId) {
    tasks = tasks.filter((task) => task.id !== taskId);
    persistTasks();
    renderTasks();
}

function loadTasks() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) {
            return [];
        }
        return data.map((task) => ({
            ...task,
            completed: Boolean(task.completed),
            important: Boolean(task.important)
        }));
    } catch (error) {
        console.warn("Failed to load tasks from storage.", error);
        return [];
    }
}

function persistTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
    } catch {
        return dateString;
    }
}

function isPastDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return false;
    }
    return date < today;
}

function sortTasks(taskItems) {
    const important = [];
    const regular = [];

    for (const task of taskItems) {
        if (task.important) {
            important.push(task);
        } else {
            regular.push(task);
        }
    }

    return important.concat(regular);
}

function setMinDueDate() {
    const today = new Date();
    const min = today.toISOString().split("T")[0];
    dateInput.min = min;
}

function clearValidation() {
    taskInput.setCustomValidity("");
    dateInput.setCustomValidity("");
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

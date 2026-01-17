import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const timetable = {
    Monday: [
        {time: "8am-9am", subject: "EHD"},
        {time: "9am-10am", subject: "PNS"},
        {time: "10am-11am", subject: "Free Slot", isFree: true},
        {time: "11am-12pm", subject: "ICS"},
        {time: "12pm-1pm", subject: "POE"},
        {time: "2pm-4pm", subject: "DBMS Lab", isLab: true, labSubject: "DBMS"}
    ],
    Tuesday: [
        {time: "8am-9am", subject: "DBMS"},
        {time: "9am-10am", subject: "Free Slot", isFree: true},
        {time: "10am-11am", subject: "Free Slot", isFree: true},
        {time: "11am-12pm", subject: "Optimization"},
        {time: "12pm-1pm", subject: "PNS"},
        {time: "2pm-4pm", subject: "EHD Lab", isLab: true, labSubject: "EHD"}
    ],
    Wednesday: [
        {time: "8am-9am", subject: "Free Slot", isFree: true},
        {time: "9am-10am", subject: "POE"},
        {time: "10am-11am", subject: "ICS"},
        {time: "11am-12pm", subject: "EHD"},
        {time: "12pm-1pm", subject: "DBMS"},
        {time: "2pm-4pm", subject: "ICS Lab", isLab: true, labSubject: "ICS"}
    ],
    Thursday: [
        {time: "8am-9am", subject: "Optimization"},
        {time: "9am-10am", subject: "Free Slot", isFree: true},
        {time: "10am-11am", subject: "PNS"},
        {time: "11am-12pm", subject: "DBMS (Extra by Prof)"},
        {time: "12pm-1pm", subject: "POE"},
        {time: "2pm-3pm", subject: "PNS Tutorial"},
        {time: "4pm-6pm", subject: "Optimization Lab", isLab: true, labSubject: "Optimization"}
    ],
    Friday: [
        {time: "8am-9am", subject: "Free Slot", isFree: true},
        {time: "9am-10am", subject: "EHD"},
        {time: "10am-11am", subject: "Optimization"},
        {time: "11am-12pm", subject: "ICS"},
        {time: "12pm-1pm", subject: "DBMS"}
    ]
};

const subjects = {
    'EHD': { 
        fullName: 'Embedded Hardware Design', 
        color: '#ffeaa7', 
        lectures: 0, 
        labs: 0,
        evaluation: [
            { type: 'Insem 1', weight: 20, score: null, maxScore: null },
            { type: 'Insem 2', weight: 20, score: null, maxScore: null },
            { type: 'Endsem', weight: 30, score: null, maxScore: null },
            { type: 'Lab', weight: 30, score: null, maxScore: null }
        ]
    },
    'PNS': { 
        fullName: 'Probability and Statistics', 
        color: '#74b9ff', 
        lectures: 0, 
        labs: 0,
        evaluation: [
            { type: 'Insem 1', weight: 25, score: null, maxScore: null },
            { type: 'Insem 2', weight: 25, score: null, maxScore: null },
            { type: 'Endsem', weight: 50, score: null, maxScore: null }
        ]
    },
    'ICS': { 
        fullName: 'Introduction to Communication System', 
        color: '#a29bfe', 
        lectures: 0, 
        labs: 0,
        evaluation: [
            { type: 'Insem 1', weight: 22.5, score: null, maxScore: null },
            { type: 'Insem 2', weight: 22.5, score: null, maxScore: null },
            { type: 'Endsem', weight: 26, score: null, maxScore: null },
            { type: 'Lab Evaluation', weight: 12.5, score: null, maxScore: null },
            { type: 'Project', weight: 12.5, score: null, maxScore: null },
            { type: 'Quizzes', weight: 4, score: null, maxScore: null }
        ]
    },
    'POE': { 
        fullName: 'Principle of Economics', 
        color: '#fd79a8', 
        lectures: 0, 
        labs: 0,
        evaluation: [
            { type: 'Quiz and Assignment', weight: 40, score: null, maxScore: null },
            { type: 'Endsem', weight: 60, score: null, maxScore: null }
        ]
    },
    'DBMS': { 
        fullName: 'Database Management System', 
        color: '#00b894', 
        lectures: 0, 
        labs: 0,
        evaluation: [
            { type: 'Insem 1', weight: 15, score: null, maxScore: null },
            { type: 'Insem 2', weight: 15, score: null, maxScore: null },
            { type: 'Database Project', weight: 15, score: null, maxScore: null },
            { type: 'Lab Evaluation', weight: 15, score: null, maxScore: null },
            { type: 'Endsem', weight: 40, score: null, maxScore: null }
        ]
    },
    'Optimization': { 
        fullName: 'Optimization Elective', 
        color: '#e17055', 
        lectures: 0, 
        labs: 0,
        evaluation: []
    }
};

// Exam dates
const examDates = {
    'Insem 1': { start: '2026-02-09', end: '2026-02-12', name: 'Insem 1' },
    'Insem 2': { start: '2026-03-18', end: '2026-03-21', name: 'Insem 2' },
    'Endsem': { start: '2026-05-02', end: '2026-05-11', name: 'Endsem' }
};

let currentDate = new Date();
let dayData = {};
let subjectData = {};
let studyGoals = {};
let activeTimer = null;
let timerStartTime = null;
let currentTimerSubject = null;
let cancelledData = {}; // Store holiday and cancellation data
let todoData = {}; // Store todo items by subject

// Load and save goals
window.loadGoals = async function () {
  try {
    const ref = doc(db, "users", userId, "meta", "goals");
    const snap = await getDoc(ref);

    studyGoals = snap.exists() ? snap.data() : {};

  } catch (error) {
    console.error("Error loading goals from Firebase:", error);
    studyGoals = {};
  }
};


window.saveGoals = async function () {
  try {
    if (!window.userId) return;

    await setDoc(
      doc(db, "users", userId, "meta", "goals"),
      studyGoals
    );
  } catch (error) {
    console.error("Failed to save goals to Firebase:", error);
  }
};


// Load and save cancellation data
window.loadCancelledData = async function () {
  try {
    const ref = doc(db, "users", userId, "meta", "cancelled");
    const snap = await getDoc(ref);

    cancelledData = snap.exists() ? snap.data() : {};

  } catch (error) {
    console.error("Error loading cancellation data from Firebase:", error);
    cancelledData = {};
  }
};


// Mark day as holiday
window.markAsHoliday = function() {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (!cancelledData[dateStr]) {
        cancelledData[dateStr] = {};
    }
    cancelledData[dateStr].isHoliday = true;
    cancelledData[dateStr].reason = prompt('Holiday reason (optional):', '') || 'Holiday';
    saveCancelledData();
    loadDay();
    alert('Day marked as holiday!');
}

// Unmark holiday
window.unmarkHoliday = function() {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (cancelledData[dateStr]) {
        delete cancelledData[dateStr].isHoliday;
        delete cancelledData[dateStr].reason;
        if (Object.keys(cancelledData[dateStr]).length === 0) {
            delete cancelledData[dateStr];
        }
        saveCancelledData();
    }
    loadDay();
    alert('Holiday status removed!');
}

// Toggle class/lab cancellation
window.toggleCancellation = function(index) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (!cancelledData[dateStr]) {
        cancelledData[dateStr] = {};
    }
    if (!cancelledData[dateStr].cancelled) {
        cancelledData[dateStr].cancelled = [];
    }
    
    const cancelledIndex = cancelledData[dateStr].cancelled.indexOf(index);
    if (cancelledIndex > -1) {
        // Uncancel
        cancelledData[dateStr].cancelled.splice(cancelledIndex, 1);
    } else {
        // Cancel
        cancelledData[dateStr].cancelled.push(index);
    }
    
    saveCancelledData();
    const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
    renderTimetable(dayName);
}

// Todo management functions
window.loadTodoData = async function () {
  try {
    const ref = doc(db, "users", userId, "meta", "todos");
    const snap = await getDoc(ref);

    todoData = snap.exists()
      ? snap.data()
      : initializeTodoData();

  } catch (error) {
    console.error("Error loading todo data from Firebase:", error);
    todoData = initializeTodoData();
  }
};


function initializeTodoData() {
    const data = {};
    Object.keys(subjects).forEach(subject => {
        data[subject] = [];
    });
    data['General'] = []; // For general todos not tied to a subject
    return data;
}

function addTodo(subject, task, priority = 'medium', dueDate = null) {
    if (!todoData[subject]) {
        todoData[subject] = [];
    }
    
    const todo = {
        id: Date.now() + Math.random(),
        task: task,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        priority: priority, // low, medium, high
        dueDate: dueDate,
        studyHours: 0
    };
    
    todoData[subject].push(todo);
    saveTodoData();
    renderTodoSection();
    return todo;
}

window.toggleTodo = function(subject, todoId) {
    const todo = todoData[subject]?.find(t => t.id === todoId);
    if (!todo) return;
    
    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : null;
    
    // If completing, optionally log study hours to subject
    if (todo.completed && todo.studyHours > 0) {
        const date = new Date().toISOString().split('T')[0];
        if (!subjectData[subject]) {
            subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
        }
        if (!subjectData[subject].selfStudyTopics) {
            subjectData[subject].selfStudyTopics = [];
        }
        
        const existingStudy = subjectData[subject].selfStudyTopics.find(s => s.date === date);
        if (existingStudy) {
            existingStudy.hours += todo.studyHours;
            if (!existingStudy.topics.includes(todo.task)) {
                existingStudy.topics += ` | ${todo.task}`;
            }
        } else {
            subjectData[subject].selfStudyTopics.push({
                date,
                hours: todo.studyHours,
                topics: todo.task,
                resources: 'Todo Task'
            });
        }
        saveSubjectData();
    }
    
    saveTodoData();
    renderTodoSection();
}

window.deleteTodo = function(subject, todoId) {
    if (!todoData[subject]) return;
    todoData[subject] = todoData[subject].filter(t => t.id !== todoId);
    saveTodoData();
    renderTodoSection();
}

function editTodo(subject, todoId, updates) {
    const todo = todoData[subject]?.find(t => t.id === todoId);
    if (!todo) return;
    
    Object.assign(todo, updates);
    saveTodoData();
    renderTodoSection();
}

function getTodoStats() {
    let total = 0;
    let completed = 0;
    let overdue = 0;
    const today = new Date().toISOString().split('T')[0];
    
    Object.values(todoData).forEach(todos => {
        todos.forEach(todo => {
            total++;
            if (todo.completed) completed++;
            if (todo.dueDate && todo.dueDate < today && !todo.completed) overdue++;
        });
    });
    
    return { total, completed, pending: total - completed, overdue };
}

function renderTodoSection() {
    const container = document.getElementById('todoContent');
    if (!container) return;
    
    const stats = getTodoStats();
    const today = new Date().toISOString().split('T')[0];
    
    let html = `
        <div style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                <h2 style="color: #667eea; margin: 0;">📝 Self-Study Todo List</h2>
                <button class="btn btn-primary" onclick="showAddTodoModal()" style="padding: 10px 20px;">➕ Add New Todo</button>
            </div>
            
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <h4>Total Tasks</h4>
                    <div class="stat-value">${stats.total}</div>
                </div>
                <div class="stat-card">
                    <h4>Completed</h4>
                    <div class="stat-value" style="color: #00b894;">${stats.completed}</div>
                </div>
                <div class="stat-card">
                    <h4>Pending</h4>
                    <div class="stat-value" style="color: #fdcb6e;">${stats.pending}</div>
                </div>
                <div class="stat-card">
                    <h4>Overdue</h4>
                    <div class="stat-value" style="color: #d63031;">${stats.overdue}</div>
                </div>
            </div>
        </div>
    `;
    
    // Filter and sort controls
    html += `
        <div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <select id="todoFilterSubject" onchange="renderTodoSection()" style="padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 14px;">
                <option value="all">All Subjects</option>
                ${Object.keys(subjects).map(s => `<option value="${s}">${s}</option>`).join('')}
                <option value="General">General</option>
            </select>
            <select id="todoFilterStatus" onchange="renderTodoSection()" style="padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 14px;">
                <option value="all">All Tasks</option>
                <option value="pending">Pending Only</option>
                <option value="completed">Completed Only</option>
                <option value="overdue">Overdue Only</option>
            </select>
            <select id="todoFilterPriority" onchange="renderTodoSection()" style="padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 14px;">
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
            </select>
            <select id="todoSortBy" onchange="renderTodoSection()" style="padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 14px;">
                <option value="default">Sort: Default</option>
                <option value="priority">Sort: Priority (High to Low)</option>
                <option value="dueDate">Sort: Due Date (Earliest First)</option>
                <option value="created">Sort: Recently Created</option>
            </select>
        </div>
        <div style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-secondary" onclick="deleteCompletedTodos()" style="padding: 8px 15px; font-size: 13px; background: #f59e0b; border-color: #f59e0b; color: white;">🧹 Delete Completed</button>
            <button class="btn btn-secondary" onclick="exportTodos()" style="padding: 8px 15px; font-size: 13px;">📥 Export Todos</button>
        </div>
    `;
    
    const filterSubject = document.getElementById('todoFilterSubject')?.value || 'all';
    const filterStatus = document.getElementById('todoFilterStatus')?.value || 'all';
    const filterPriority = document.getElementById('todoFilterPriority')?.value || 'all';
    const sortBy = document.getElementById('todoSortBy')?.value || 'default';
    
    // Render todos by subject
    const subjectsToShow = filterSubject === 'all' ? [...Object.keys(subjects), 'General'] : [filterSubject];
    
    subjectsToShow.forEach(subject => {
        let todos = todoData[subject] || [];
        
        // Apply filters
        todos = todos.filter(todo => {
            if (filterStatus === 'pending' && todo.completed) return false;
            if (filterStatus === 'completed' && !todo.completed) return false;
            if (filterStatus === 'overdue' && (todo.completed || !todo.dueDate || todo.dueDate >= today)) return false;
            if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
            return true;
        });
        
        // Apply sorting
        if (sortBy === 'priority') {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            todos.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        } else if (sortBy === 'dueDate') {
            todos.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        } else if (sortBy === 'created') {
            todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        if (todos.length === 0 && filterSubject !== 'all') return;
        
        const subjectColor = subjects[subject]?.color || '#95a5a6';
        const subjectName = subjects[subject]?.fullName || subject;
        
        // Calculate progress for this subject
        const allTodosForSubject = todoData[subject] || [];
        const completedInSubject = allTodosForSubject.filter(t => t.completed).length;
        const totalInSubject = allTodosForSubject.length;
        const progressPercent = totalInSubject > 0 ? Math.round((completedInSubject / totalInSubject) * 100) : 0;
        
        html += `
            <div style="margin-bottom: 30px; background: ${subjectColor}; padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="margin: 0; color: var(--text-primary);">${subject} - ${subjectName}</h3>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9em; color: var(--text-secondary); margin-bottom: 5px;">
                            ${completedInSubject}/${totalInSubject} tasks completed
                        </div>
                        <div style="width: 150px; height: 8px; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${progressPercent}%; height: 100%; background: #00b894; transition: width 0.3s;"></div>
                        </div>
                    </div>
                </div>
        `;
        
        if (todos.length === 0) {
            html += `<p style="color: var(--text-secondary); margin: 10px 0;">No todos for this subject yet.</p>`;
        } else {
            todos.forEach(todo => {
                const isOverdue = todo.dueDate && todo.dueDate < today && !todo.completed;
                const priorityColors = {
                    high: '#d63031',
                    medium: '#fdcb6e',
                    low: '#00b894'
                };
                const priorityColor = priorityColors[todo.priority] || '#95a5a6';
                
                html += `
                    <div class="todo-item ${todo.completed ? 'todo-completed' : ''}" style="background: rgba(255, 255, 255, 0.95); padding: 15px; margin-bottom: 10px; border-radius: var(--radius-md); border-left: 4px solid ${priorityColor}; ${isOverdue ? 'border: 2px solid #d63031;' : ''}">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <input type="checkbox" 
                                   ${todo.completed ? 'checked' : ''} 
                                   onchange="toggleTodo('${subject}', ${todo.id})"
                                   style="width: 20px; height: 20px; cursor: pointer; margin-top: 2px;">
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px; flex-wrap: wrap;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; font-size: 1.05em; ${todo.completed ? 'text-decoration: line-through; color: #95a5a6;' : 'color: var(--text-primary);'}">
                                            ${todo.task}
                                        </div>
                                        <div style="display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; font-size: 0.85em;">
                                            <span style="background: ${priorityColor}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: 600;">
                                                ${todo.priority.toUpperCase()}
                                            </span>
                                            ${todo.dueDate ? `<span style="color: ${isOverdue ? '#d63031' : 'var(--text-secondary)'}; font-weight: 600;">
                                                📅 Due: ${new Date(todo.dueDate).toLocaleDateString()}
                                                ${isOverdue ? ' ⚠️ OVERDUE' : ''}
                                            </span>` : ''}
                                            ${todo.studyHours > 0 ? `<span style="color: var(--text-secondary);">⏱️ ${todo.studyHours}h</span>` : ''}
                                            ${todo.completed && todo.completedAt ? `<span style="color: #00b894;">✓ Completed ${new Date(todo.completedAt).toLocaleDateString()}</span>` : ''}
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 5px;">
                                        <button class="btn btn-secondary" onclick="showEditTodoModal('${subject}', ${todo.id})" style="padding: 6px 12px; font-size: 13px;">✏️ Edit</button>
                                        <button class="btn btn-secondary" onclick="if(confirm('Delete this todo?')) deleteTodo('${subject}', ${todo.id})" style="padding: 6px 12px; font-size: 13px; background: #d63031; border-color: #d63031; color: white;">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `</div>`;
    });
    
    // Add helpful tips section
    html += `
        <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-radius: var(--radius-lg); border-left: 4px solid #0284c7;">
            <h4 style="margin: 0 0 10px 0; color: #0284c7;">💡 Quick Tips</h4>
            <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); line-height: 1.8;">
                <li><strong>Keyboard Shortcut:</strong> Press <kbd style="background: white; padding: 2px 6px; border-radius: 3px; border: 1px solid #cbd5e1;">Ctrl+N</kbd> to quickly add a new todo</li>
                <li><strong>Filters:</strong> Use the dropdowns above to filter by subject, status, priority, or sort order</li>
                <li><strong>Study Hours:</strong> Completed todos with study hours will be automatically added to your self-study tracking</li>
                <li><strong>Progress Bars:</strong> Track completion progress for each subject at a glance</li>
                <li><strong>Export:</strong> Download your todos as JSON for backup or analysis</li>
            </ul>
        </div>
    `;
    
    container.innerHTML = html;
}

window.showAddTodoModal = function() {
    const modal = document.createElement('div');
    modal.id = 'todoModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;';
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: var(--radius-lg); max-width: 500px; width: 100%; box-shadow: var(--shadow-2xl);">
            <h3 style="margin: 0 0 20px 0; color: #667eea;">➕ Add New Todo</h3>
            <div class="input-group">
                <label>Subject:</label>
                <select id="todoSubject" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
                    ${Object.keys(subjects).map(s => `<option value="${s}">${s} - ${subjects[s].fullName}</option>`).join('')}
                    <option value="General">General (Not subject-specific)</option>
                </select>
            </div>
            <div class="input-group">
                <label>Task Description:</label>
                <textarea id="todoTask" placeholder="What do you need to study?" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px; min-height: 80px;"></textarea>
            </div>
            <div class="input-group">
                <label>Priority:</label>
                <select id="todoPriority" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
                    <option value="low">Low Priority</option>
                    <option value="medium" selected>Medium Priority</option>
                    <option value="high">High Priority</option>
                </select>
            </div>
            <div class="input-group">
                <label>Due Date (Optional):</label>
                <input type="date" id="todoDueDate" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
            </div>
            <div class="input-group">
                <label>Estimated Study Hours (Optional):</label>
                <input type="number" id="todoStudyHours" min="0" step="0.5" placeholder="0" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeTodoModal()">Cancel</button>
                <button class="btn btn-primary" onclick="submitAddTodo()">Add Todo</button>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeTodoModal();
    };
    
    document.body.appendChild(modal);
    document.getElementById('todoTask').focus();
}

window.showEditTodoModal = function(subject, todoId) {
    const todo = todoData[subject]?.find(t => t.id === todoId);
    if (!todo) return;
    
    const modal = document.createElement('div');
    modal.id = 'todoModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;';
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: var(--radius-lg); max-width: 500px; width: 100%; box-shadow: var(--shadow-2xl);">
            <h3 style="margin: 0 0 20px 0; color: #667eea;">✏️ Edit Todo</h3>
            <div class="input-group">
                <label>Subject:</label>
                <select id="todoSubject" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
                    ${Object.keys(subjects).map(s => `<option value="${s}" ${s === subject ? 'selected' : ''}>${s} - ${subjects[s].fullName}</option>`).join('')}
                    <option value="General" ${subject === 'General' ? 'selected' : ''}>General (Not subject-specific)</option>
                </select>
            </div>
            <div class="input-group">
                <label>Task Description:</label>
                <textarea id="todoTask" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px; min-height: 80px;">${todo.task}</textarea>
            </div>
            <div class="input-group">
                <label>Priority:</label>
                <select id="todoPriority" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
                    <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                    <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                    <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High Priority</option>
                </select>
            </div>
            <div class="input-group">
                <label>Due Date (Optional):</label>
                <input type="date" id="todoDueDate" value="${todo.dueDate || ''}" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
            </div>
            <div class="input-group">
                <label>Estimated Study Hours (Optional):</label>
                <input type="number" id="todoStudyHours" min="0" step="0.5" value="${todo.studyHours}" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-medium); border-radius: var(--radius-md); font-size: 15px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeTodoModal()">Cancel</button>
                <button class="btn btn-primary" onclick="submitEditTodo('${subject}', ${todoId})">Save Changes</button>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeTodoModal();
    };
    
    document.body.appendChild(modal);
}

window.closeTodoModal = function() {
    const modal = document.getElementById('todoModal');
    if (modal) modal.remove();
}

window.submitAddTodo = function() {
    const subject = document.getElementById('todoSubject').value;
    const task = document.getElementById('todoTask').value.trim();
    const priority = document.getElementById('todoPriority').value;
    const dueDate = document.getElementById('todoDueDate').value || null;
    const studyHours = parseFloat(document.getElementById('todoStudyHours').value) || 0;
    
    if (!task) {
        alert('Please enter a task description!');
        return;
    }
    
    const todo = addTodo(subject, task, priority, dueDate);
    if (studyHours > 0) {
        todo.studyHours = studyHours;
        saveTodoData();
    }
    
    closeTodoModal();
    renderTodoSection();
}

window.submitEditTodo = function(oldSubject, todoId) {
    const newSubject = document.getElementById('todoSubject').value;
    const task = document.getElementById('todoTask').value.trim();
    const priority = document.getElementById('todoPriority').value;
    const dueDate = document.getElementById('todoDueDate').value || null;
    const studyHours = parseFloat(document.getElementById('todoStudyHours').value) || 0;
    
    if (!task) {
        alert('Please enter a task description!');
        return;
    }
    
    // If subject changed, move the todo
    if (oldSubject !== newSubject) {
        const todo = todoData[oldSubject]?.find(t => t.id === todoId);
        if (todo) {
            todoData[oldSubject] = todoData[oldSubject].filter(t => t.id !== todoId);
            if (!todoData[newSubject]) todoData[newSubject] = [];
            todo.task = task;
            todo.priority = priority;
            todo.dueDate = dueDate;
            todo.studyHours = studyHours;
            todoData[newSubject].push(todo);
        }
    } else {
        editTodo(oldSubject, todoId, { task, priority, dueDate, studyHours });
    }
    
    saveTodoData();
    closeTodoModal();
    renderTodoSection();
}

// Bulk delete completed todos
window.deleteCompletedTodos = function() {
    const confirmDelete = confirm('Are you sure you want to delete all completed todos? This action cannot be undone.');
    if (!confirmDelete) return;
    
    let deletedCount = 0;
    Object.keys(todoData).forEach(subject => {
        const initialLength = todoData[subject].length;
        todoData[subject] = todoData[subject].filter(todo => !todo.completed);
        deletedCount += initialLength - todoData[subject].length;
    });
    
    saveTodoData();
    renderTodoSection();
    alert(`Deleted ${deletedCount} completed todo(s).`);
}

// Export todos to JSON
window.exportTodos = function() {
    const exportData = {
        exportDate: new Date().toISOString(),
        todos: todoData,
        stats: getTodoStats()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `study_todos_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Todos exported successfully!');
}

// Calculate attendance streak
window.calculateAttendanceStreak = async function () {
  let streak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 100; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);

    const dateStr = checkDate.toISOString().split('T')[0];

    try {
      const ref = doc(db, "users", userId, "days", dateStr);
      const snap = await getDoc(ref);

      // ❌ No data → streak broken
      if (!snap.exists()) break;

      const data = snap.data();
      const slots = Object.values(data.slots || {});
      const attended = slots.filter(s => s.attendance === 'present').length;
      const total = slots.filter(s => s.attendance).length;

      if (total > 0 && attended === total) {
        streak++;
      } else {
        break;
      }
    } catch (error) {
      break;
    }
  }

  return streak;
};


// Calculate study streak (consecutive days with study hours > 0)
window.calculateStudyStreak = async function () {
  let streak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 100; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);

    const dateStr = checkDate.toISOString().split('T')[0];

    try {
      const ref = doc(db, "users", userId, "days", dateStr);
      const snap = await getDoc(ref);

      // ❌ No data → streak broken
      if (!snap.exists()) break;

      const data = snap.data();
      const slots = Object.values(data.slots || {});
      const selfStudy = slots.reduce(
        (sum, s) => sum + (parseFloat(s.selfStudyHours) || 0),
        0
      );
      const pythonHours = (parseFloat(data.pythonDuration) || 0) / 60;
      const dsaHours = (parseFloat(data.dsaDuration) || 0) / 60;
      const totalStudy = selfStudy + pythonHours + dsaHours;

      if (totalStudy > 0) {
        streak++;
      } else {
        break;
      }
    } catch (error) {
      break;
    }
  }

  return streak;
};


// Get pending assignments count
function getPendingAssignmentsCount() {
    let count = 0;
    Object.keys(subjects).forEach(subject => {
        const data = subjectData[subject] || { assignments: [] };
        count += (data.assignments || []).filter(a => !a.completed).length;
    });
    return count;
}

// Get missed classes count (today)
function getMissedClassesToday() {
    const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
    const schedule = timetable[dayName] || [];
    const slots = Object.values(dayData.slots || {});
    
    let missed = 0;
    schedule.forEach((slot, index) => {
        if (!slot.isFree && !slot.isLab) {
            const slotData = dayData.slots?.[index] || {};
            if (slotData.attendance === 'absent') {
                missed++;
            }
        }
    });
    
    return missed;
}

// Get upcoming class for today
function getUpcomingClass() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
    const schedule = timetable[dayName] || [];
    
    for (const slot of schedule) {
        if (slot.isFree) continue;
        
        const timeMatch = slot.time.match(/(\d+)(am|pm)-(\d+)(am|pm)/);
        if (!timeMatch) continue;
        
        let startHour = parseInt(timeMatch[1]);
        const startPeriod = timeMatch[2];
        if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
        if (startPeriod === 'am' && startHour === 12) startHour = 0;
        
        const slotStartTime = startHour * 60;
        
        if (slotStartTime > currentTime) {
            return {
                subject: slot.subject,
                time: slot.time,
                minutesUntil: slotStartTime - currentTime
            };
        }
    }
    
    return null;
}

// Study session timer functions
window.startStudyTimer = function(subject=null) {
    if (activeTimer) {
        stopStudyTimer();
    }
    
    currentTimerSubject = subject;
    timerStartTime = Date.now();
    activeTimer = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
}

window.stopStudyTimer = function() {
    if (!activeTimer) return;
    
    clearInterval(activeTimer);
    activeTimer = null;
    
    if (timerStartTime && currentTimerSubject) {
        const elapsedMinutes = Math.floor((Date.now() - timerStartTime) / 60000);
        const elapsedHours = elapsedMinutes / 60;
        
        if (elapsedHours > 0.1) { // Only record if more than 6 minutes
            // Auto-add to self-study
            const date = currentDate.toISOString().split('T')[0];
            const subject = currentTimerSubject || 'General';
            
            if (subjects[subject] || subject === 'General') {
                const subjKey = subjects[subject] ? subject : 'Python';
                if (!subjectData[subjKey]) subjectData[subjKey] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
                if (!subjectData[subjKey].selfStudyTopics) subjectData[subjKey].selfStudyTopics = [];
                
                const existingStudy = subjectData[subjKey].selfStudyTopics.find(s => s.date === date);
                if (existingStudy) {
                    existingStudy.hours += elapsedHours;
                    if (existingStudy.topics && !existingStudy.topics.includes(`[Timer: ${elapsedMinutes}m]`)) {
                        existingStudy.topics += ` | [Timer: ${elapsedMinutes}m]`;
                    } else if (!existingStudy.topics) {
                        existingStudy.topics = `[Timer: ${elapsedMinutes}m]`;
                    }
                } else {
                    subjectData[subjKey].selfStudyTopics.push({
                        date,
                        hours: elapsedHours,
                        topics: `[Timer: ${elapsedMinutes}m]`,
                        resources: 'Study Timer'
                    });
                }
                saveSubjectData();
            }
        }
    }
    
    timerStartTime = null;
    currentTimerSubject = null;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerStatus = document.getElementById('timerStatus');
    
    if (!timerDisplay) return;
    
    if (activeTimer && timerStartTime) {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (timerStatus) {
            timerStatus.textContent = currentTimerSubject ? `Studying: ${currentTimerSubject}` : 'Timer Active';
        }
    } else {
        timerDisplay.textContent = '00:00:00';
        if (timerStatus) {
            timerStatus.textContent = 'Timer Stopped';
        }
    }
}

// Get weekly statistics
window.getWeeklyStats = async function () {
  const today = new Date();
  const weekStart = new Date(today);

  // Monday as start of week
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  let totalStudyHours = 0;
  let totalAttendance = 0;
  let totalClasses = 0;
  let daysTracked = 0;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(weekStart);
    checkDate.setDate(weekStart.getDate() + i);

    const dateStr = checkDate.toISOString().split("T")[0];

    try {
      const ref = doc(db, "users", userId, "days", dateStr);
      const snap = await getDoc(ref);

      if (!snap.exists()) continue;

      const data = snap.data();
      daysTracked++;

      const slots = Object.values(data.slots || {});
      const selfStudy = slots.reduce(
        (sum, s) => sum + (parseFloat(s.selfStudyHours) || 0),
        0
      );
      const pythonHours = (parseFloat(data.pythonDuration) || 0) / 60;
      const dsaHours = (parseFloat(data.dsaDuration) || 0) / 60;

      totalStudyHours += selfStudy + pythonHours + dsaHours;

      const attended = slots.filter(s => s.attendance === "present").length;
      const total = slots.filter(s => s.attendance).length;

      totalAttendance += attended;
      totalClasses += total;

    } catch (error) {
      // skip broken day
    }
  }

  return {
    studyHours: totalStudyHours,
    attendanceRate:
      totalClasses > 0
        ? Math.round((totalAttendance / totalClasses) * 100)
        : 0,
    daysTracked
  };
};


// Search functionality
window.searchContent = async function (query) {
  if (!query || query.trim().length === 0) return [];

  const results = [];
  const searchLower = query.toLowerCase();

  try {
    // 🔍 1. Search daily entries from Firestore
    const daysRef = collection(db, "users", userId, "days");
    const snapshot = await getDocs(daysRef);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const date = docSnap.id;

      // Python / DSA / Learnings
      if (data.pythonTopics && data.pythonTopics.toLowerCase().includes(searchLower)) {
        results.push({
          type: "Python Topics",
          date,
          content: data.pythonTopics.substring(0, 100)
        });
      }

      if (data.dsaTopics && data.dsaTopics.toLowerCase().includes(searchLower)) {
        results.push({
          type: "DSA Topics",
          date,
          content: data.dsaTopics.substring(0, 100)
        });
      }

      if (data.keyLearnings && data.keyLearnings.toLowerCase().includes(searchLower)) {
        results.push({
          type: "Key Learnings",
          date,
          content: data.keyLearnings.substring(0, 100)
        });
      }

      // Slots (lectures)
      Object.values(data.slots || {}).forEach(slot => {
        if (slot.topics && slot.topics.toLowerCase().includes(searchLower)) {
          results.push({
            type: "Lecture Topics",
            date,
            content: slot.topics.substring(0, 100)
          });
        }
      });
    });

    // 🔍 2. Search subject data (already loaded in memory)
    Object.keys(subjects).forEach(subject => {
      const data = subjectData[subject] || {};
      (data.lectures || []).forEach(lecture => {
        if (lecture.topics && lecture.topics.toLowerCase().includes(searchLower)) {
          results.push({
            type: `Lecture - ${subject}`,
            date: lecture.date,
            content: lecture.topics.substring(0, 100)
          });
        }
        if (lecture.notes && lecture.notes.toLowerCase().includes(searchLower)) {
          results.push({
            type: `Notes - ${subject}`,
            date: lecture.date,
            content: lecture.notes.substring(0, 100)
          });
        }
      });
    });

    // 🔍 3. Search todo items (already loaded in memory)
    Object.keys(todoData).forEach(subject => {
      const todos = todoData[subject] || [];
      todos.forEach(todo => {
        if (todo.task && todo.task.toLowerCase().includes(searchLower)) {
          const status = todo.completed ? "✓ Completed" : "⏳ Pending";
          const priority = todo.priority ? `[${todo.priority.toUpperCase()}]` : "";
          const content = `${status} ${priority} ${todo.task}`;
          const displayDate =
            todo.dueDate || todo.createdAt?.split("T")[0] || "No date";

          results.push({
            type: `Todo - ${subject}`,
            date: displayDate,
            content: content.substring(0, 100)
          });
        }
      });
    });

  } catch (error) {
    console.error("Search error:", error);
  }

  return results;
};


window.init = async function () {
  const dateInput = document.getElementById('dateInput');
  dateInput.value = currentDate.toISOString().split('T')[0];

  // 🔥 LOAD ALL DATA (AWAIT!)
  await loadSubjectData();
  await loadGoals();
  await loadCancelledData();
  await loadTodoData();
  await loadDay();

  // 🔄 Render UI
  renderWeeklyTimetable();
  renderSubjectCards();
  renderQuickStats();
  renderTodoSection();
  updateTimerDisplay();
  updateCurrentTime();
  updateUpcomingClass();

  // ⏱️ Timers
  setInterval(updateCurrentTime, 1000);
  setInterval(updateUpcomingClass, 60000);

  // 💡 Show tips ONLY ONCE (Firestore-based)
  try {
    const uiRef = doc(db, "users", userId, "meta", "ui");
    const uiSnap = await getDoc(uiRef);

    if (!uiSnap.exists() || !uiSnap.data().tipsShown) {
      setTimeout(() => {
        const tips = [
          "💡 Tip: Use the study timer to automatically track your study sessions!",
          "💡 Tip: Search helps you quickly find any notes or topics you've recorded.",
          "💡 Tip: Click subject cards to see detailed progress and add entries.",
          "💡 Tip: Use date arrows (◀ ▶) to jump between days quickly.",
          "💡 Tip: Export to PDF to create printable study reports!",
          "💡 Tip: In Todo section, use Ctrl+N to quickly add a new todo!"
        ];
        console.log(tips[Math.floor(Math.random() * tips.length)]);
      }, 2000);

      await setDoc(uiRef, { tipsShown: true }, { merge: true });
    }
  } catch (e) {
    console.warn("UI tips load failed:", e);
  }

  // ⌨️ Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + N → Add todo
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      const todoTab = document.getElementById("todoTab");
      if (todoTab?.classList.contains("active")) {
        e.preventDefault();
        showAddTodoModal();
      }
    }

    // Esc → Close modal
    if (e.key === "Escape") {
      const modal = document.getElementById("todoModal");
      if (modal) closeTodoModal();
    }
  });
};


window.switchTab = function(tab) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    // Find and activate the clicked tab
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach((t, index) => {
        if ((index === 0 && tab === 'daily') || 
            (index === 1 && tab === 'timetable') || 
            (index === 2 && tab === 'subjects') || 
            (index === 3 && tab === 'todo') || 
            (index === 4 && tab === 'history')) {
            t.classList.add('active');
        }
    });
    
    if (tab === 'daily') {
        document.getElementById('dailyTab').classList.add('active');
        renderQuickStats();
        updateUpcomingClass();
    } else if (tab === 'timetable') {
        document.getElementById('timetableTab').classList.add('active');
    } else if (tab === 'subjects') {
        document.getElementById('subjectsTab').classList.add('active');
        document.getElementById('subjectsList').style.display = 'block';
        document.getElementById('subjectDetail').style.display = 'none';
        renderSubjectCards();
        renderQuickStats();
    } else if (tab === 'todo') {
        document.getElementById('todoTab').classList.add('active');
        renderTodoSection();
    } else if (tab === 'history') {
        document.getElementById('historyTab').classList.add('active');
        showHistory();
    }
}

function renderWeeklyTimetable() {
    const grid = document.getElementById('weeklyGrid');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // Helper function to convert time to 24-hour format for sorting
    function timeTo24Hour(timeStr) {
        const match = timeStr.match(/(\d+)(am|pm)-(\d+)(am|pm)/);
        if (!match) return 0;
        let hour1 = parseInt(match[1]);
        const period1 = match[2];
        
        // Convert to 24-hour format
        if (period1 === 'pm' && hour1 !== 12) hour1 += 12;
        if (period1 === 'am' && hour1 === 12) hour1 = 0;
        
        return hour1;
    }
    
    // Get all unique time slots
    const allTimeSlots = new Set();
    days.forEach(day => {
        timetable[day].forEach(slot => allTimeSlots.add(slot.time));
    });
    const timeSlots = Array.from(allTimeSlots).sort((a, b) => {
        return timeTo24Hour(a) - timeTo24Hour(b);
    });
    
    let html = '<div class="time-header"></div>';
    days.forEach(day => {
        html += `<div class="day-header">${day}</div>`;
    });
    
    timeSlots.forEach(time => {
        html += `<div class="time-header">${time}</div>`;
        
        days.forEach(day => {
            const schedule = timetable[day] || [];
            const slot = schedule.find(s => s.time === time);
            
            if (slot) {
                let subjectKey = slot.subject.replace(' Lab', '').replace(' (Extra by Prof)', '').replace(' Slots', '').replace(' Slot', '').trim();
                
                // Handle special cases
                if (subjectKey === 'Free') subjectKey = 'free';
                if (slot.isFree) subjectKey = 'free';
                
                let cssClass;
                if (slot.isLab) {
                    cssClass = `subject-${subjectKey.toLowerCase().replace(/\s+/g, '-')}-lab`;
                } else if (slot.subject.includes('Extra by Prof')) {
                    cssClass = `subject-${subjectKey.toLowerCase().replace(/\s+/g, '-')}-extra-by-prof`;
                } else {
                    cssClass = `subject-${subjectKey.toLowerCase().replace(/\s+/g, '-')}`;
                }
                
                html += `<div class="timetable-cell ${cssClass}" title="${slot.subject}">${slot.subject}</div>`;
            } else {
                html += `<div class="timetable-cell subject-free">-</div>`;
            }
        });
    });
    
    grid.innerHTML = html;
}

window.loadSubjectData = async function () {
  try {
    const ref = doc(db, "users", userId, "meta", "subjects");
    const snap = await getDoc(ref);

    // 1️⃣ Load from Firebase or initialize
    subjectData = snap.exists()
      ? snap.data()
      : initializeSubjectData();

    // 2️⃣ Apply saved evaluation scores to subjects config
    Object.keys(subjects).forEach(subject => {
      if (subjectData[subject] && subjectData[subject].evaluationScores) {
        subjects[subject].evaluation.forEach(evalItem => {
          const savedScore =
            subjectData[subject].evaluationScores.find(
              s => s.type === evalItem.type
            );

          if (savedScore) {
            evalItem.score = savedScore.score;
            evalItem.maxScore = savedScore.maxScore;
          }
        });
      }
    });

  } catch (error) {
    console.error("Error loading subject data from Firebase:", error);
    subjectData = initializeSubjectData();
  }
};


function initializeSubjectData() {
    const data = {};
    Object.keys(subjects).forEach(subject => {
        data[subject] = {
            lectures: [],
            labs: [],
            selfStudyTopics: [],
            assignments: [],
            evaluationScores: []
        };
    });
    return data;
}

function renderSubjectCards() {
    const container = document.getElementById('subjectCards');
    let html = '';
    
    let totalLecturesAll = 0;
    let totalAttendedAll = 0;
    let totalLabsAll = 0;
    let totalCompletedLabsAll = 0;
    let totalSelfStudyHoursAll = 0;
    
    Object.keys(subjects).forEach(subject => {
        const info = subjects[subject];
        const data = subjectData[subject] || { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
        
        const totalLectures = data.lectures.length;
        const attendedLectures = data.lectures.filter(l => l.attended).length;
        const totalLabs = data.labs.length;
        const completedLabs = data.labs.filter(l => l.completed).length;
        const selfStudyHours = (data.selfStudyTopics || []).reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
        
        totalLecturesAll += totalLectures;
        totalAttendedAll += attendedLectures;
        totalLabsAll += totalLabs;
        totalCompletedLabsAll += completedLabs;
        totalSelfStudyHoursAll += selfStudyHours;
        
        const attendanceRate = totalLectures > 0 ? Math.round((attendedLectures / totalLectures) * 100) : 0;
        const labCompletionRate = totalLabs > 0 ? Math.round((completedLabs / totalLabs) * 100) : 0;
        const pendingAssignments = (data.assignments || []).filter(a => !a.completed).length;
        
        html += `
            <div class="subject-card" style="background: ${info.color};" onclick="showSubjectDetail('${subject}')">
                <h3>${subject}</h3>
                <p style="margin-bottom: 15px; opacity: 0.9;">${info.fullName}</p>
                <div class="subject-progress">
                    <div class="progress-item">
                        <span>Lectures:</span>
                        <span>${attendedLectures}/${totalLectures} (${attendanceRate}%)</span>
                    </div>
                    ${totalLectures > 0 ? `
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${attendanceRate}%;">${attendanceRate}%</div>
                    </div>
                    ` : ''}
                    <div class="progress-item" style="margin-top: 15px;">
                        <span>Labs:</span>
                        <span>${completedLabs}/${totalLabs} completed</span>
                    </div>
                    ${totalLabs > 0 ? `
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${labCompletionRate}%;">${labCompletionRate}%</div>
                    </div>
                    ` : ''}
                    <div class="progress-item" style="margin-top: 15px;">
                        <span>Self Study:</span>
                        <span>${selfStudyHours.toFixed(1)}h (${data.selfStudyTopics.length} sessions)</span>
                    </div>
                    ${pendingAssignments > 0 ? `
                    <div class="progress-item" style="margin-top: 10px; color: #fff; background: rgba(239,68,68,0.3); padding: 8px; border-radius: 5px;">
                        <span>⚠️ Pending Assignments:</span>
                        <span style="font-weight: 700;">${pendingAssignments}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Update overall stats
    if (document.getElementById('totalLectures')) {
        document.getElementById('totalLectures').textContent = totalLecturesAll;
    }
    if (document.getElementById('totalLabs')) {
        document.getElementById('totalLabs').textContent = totalLabsAll;
    }
    const overallAttendance = totalLecturesAll > 0 ? Math.round((totalAttendedAll / totalLecturesAll) * 100) : 0;
    if (document.getElementById('overallAttendance')) {
        document.getElementById('overallAttendance').textContent = overallAttendance + '%';
    }
    if (document.getElementById('totalSelfStudy')) {
        document.getElementById('totalSelfStudy').textContent = totalSelfStudyHoursAll.toFixed(1) + 'h';
    }
    
    renderQuickStats();
}

window.showSubjectDetail = function(subject) {
    const info = subjects[subject];
    const data = subjectData[subject] || { lectures: [], labs: [], selfStudyTopics: [] };
    
    document.getElementById('subjectsList').style.display = 'none';
    const detailDiv = document.getElementById('subjectDetail');
    detailDiv.style.display = 'block';
    
    // Calculate weighted average if scores are available
    let weightedAverage = null;
    let totalWeight = 0;
    let scoredWeight = 0;
    let calculatedScore = 0;
    
    if (info.evaluation && info.evaluation.length > 0) {
        info.evaluation.forEach(evalItem => {
            totalWeight += evalItem.weight;
            if (evalItem.score !== null && evalItem.score !== undefined && evalItem.maxScore) {
                const normalizedScore = (evalItem.score / evalItem.maxScore) * 100;
                calculatedScore += (normalizedScore * evalItem.weight) / 100;
                scoredWeight += evalItem.weight;
            }
        });
        
        if (scoredWeight > 0) {
            weightedAverage = (calculatedScore / scoredWeight) * 100;
        }
    }
    
    // Get upcoming exam dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingExams = [];
    
    Object.keys(examDates).forEach(examType => {
        const exam = examDates[examType];
        const examStart = new Date(exam.start);
        if (examStart >= today) {
            const daysUntil = Math.ceil((examStart - today) / (1000 * 60 * 60 * 24));
            upcomingExams.push({ ...exam, daysUntil });
        }
    });
    
    upcomingExams.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    // Build evaluation section HTML
    let evaluationHtml = '';
    if (info.evaluation && info.evaluation.length > 0) {
        evaluationHtml += '<div style="margin: 30px 0; background: linear-gradient(135deg, #faf8f5 0%, #f5f2ed 100%); border-radius: var(--radius-lg); padding: 24px; border: 1px solid rgba(212, 175, 55, 0.15);">';
        evaluationHtml += '<h3 style="color: var(--accent-primary); margin-bottom: 20px; font-size: 1.3em;">📊 Evaluation Structure</h3>';
        evaluationHtml += '<div class="evaluation-table"><table style="width: 100%; border-collapse: collapse;"><thead>';
        evaluationHtml += '<tr style="background: var(--bg-secondary);"><th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border-medium); font-weight: 700;">Component</th>';
        evaluationHtml += '<th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-medium); font-weight: 700;">Weight %</th>';
        evaluationHtml += '<th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-medium); font-weight: 700;">Score</th>';
        evaluationHtml += '<th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-medium); font-weight: 700;">Max Score</th>';
        evaluationHtml += '<th style="padding: 12px; text-align: center; border-bottom: 2px solid var(--border-medium); font-weight: 700;">Actions</th></tr></thead><tbody>';
        
        info.evaluation.forEach((evalItem, evalIndex) => {
            const percentage = evalItem.score !== null && evalItem.maxScore ? ((evalItem.score / evalItem.maxScore) * 100).toFixed(2) : '-';
            const contribution = evalItem.score !== null && evalItem.maxScore ? (((evalItem.score / evalItem.maxScore) * 100) * evalItem.weight / 100).toFixed(2) : '-';
            
            evaluationHtml += '<tr style="border-bottom: 1px solid var(--border-light);">';
            evaluationHtml += `<td style="padding: 12px; font-weight: 600;">${evalItem.type}</td>`;
            evaluationHtml += `<td style="padding: 12px; text-align: center;">${evalItem.weight}%</td>`;
            evaluationHtml += `<td style="padding: 12px; text-align: center;">${evalItem.score !== null && evalItem.score !== undefined ? evalItem.score : '-'}</td>`;
            evaluationHtml += `<td style="padding: 12px; text-align: center;">${evalItem.maxScore !== null && evalItem.maxScore !== undefined ? evalItem.maxScore : '-'}</td>`;
            evaluationHtml += `<td style="padding: 12px; text-align: center;"><button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="editEvaluationScore('${subject}', ${evalIndex})">${evalItem.score !== null ? 'Edit' : 'Add Score'}</button></td>`;
            evaluationHtml += '</tr>';
            
            if (evalItem.score !== null && evalItem.maxScore) {
                evaluationHtml += `<tr style="background: var(--bg-secondary); font-size: 0.9em;"><td colspan="5" style="padding: 8px 12px; color: var(--text-secondary);">Percentage: ${percentage}% | Contribution: ${contribution}%</td></tr>`;
            }
        });
        
        evaluationHtml += '</tbody></table></div></div>';
    }
    
    // Build upcoming exams section HTML
    let examsHtml = '';
    if (upcomingExams.length > 0) {
        examsHtml += '<div style="margin: 30px 0; background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); border-radius: var(--radius-lg); padding: 24px; border-left: 4px solid #ef4444;">';
        examsHtml += '<h3 style="color: var(--accent-primary); margin-bottom: 20px; font-size: 1.3em;">📅 Upcoming Exam Dates</h3><div style="display: grid; gap: 15px;">';
        
        upcomingExams.forEach(exam => {
            const startDate = new Date(exam.start);
            const endDate = new Date(exam.end);
            const examName = exam.name;
            const dateStr = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const endDateStr = startDate.getTime() !== endDate.getTime() ? ` - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '';
            
            let badgeHtml = '';
            if (exam.daysUntil === 0) {
                badgeHtml = '<span style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 0.9em;">TODAY!</span>';
            } else if (exam.daysUntil === 1) {
                badgeHtml = '<span style="background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 0.9em;">Tomorrow</span>';
            } else if (exam.daysUntil <= 7) {
                badgeHtml = `<span style="background: #f59e0b; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 0.9em;">${exam.daysUntil} days</span>`;
            } else {
                badgeHtml = `<span style="background: var(--bg-secondary); color: var(--text-primary); padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.9em;">${exam.daysUntil} days</span>`;
            }
            
            examsHtml += '<div style="background: var(--bg-primary); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-light);">';
            examsHtml += '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">';
            examsHtml += `<div><strong style="color: var(--accent-primary); font-size: 1.1em;">${examName}</strong>`;
            examsHtml += `<div style="color: var(--text-secondary); margin-top: 5px;">${dateStr}${endDateStr}</div></div>`;
            examsHtml += `<div style="text-align: right;">${badgeHtml}</div></div></div>`;
        });
        
        examsHtml += '</div></div>';
    }
    
    let html = `
        <button class="btn btn-secondary back-btn" onclick="backToSubjects()">← Back to All Subjects</button>
        <div class="subject-detail-view">
            <h2 style="color: ${info.color};">${subject} - ${info.fullName}</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Total Lectures</h4>
                    <div class="stat-value">${data.lectures.length}</div>
                </div>
                <div class="stat-card">
                    <h4>Attended</h4>
                    <div class="stat-value">${data.lectures.filter(l => l.attended).length}</div>
                </div>
                <div class="stat-card">
                    <h4>Total Labs</h4>
                    <div class="stat-value">${data.labs.length}</div>
                </div>
                <div class="stat-card">
                    <h4>Completed Labs</h4>
                    <div class="stat-value">${data.labs.filter(l => l.completed).length}</div>
                </div>
                ${weightedAverage !== null ? `
                <div class="stat-card" style="background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-left: 4px solid #0284c7;">
                    <h4>Weighted Average</h4>
                    <div class="stat-value">${weightedAverage.toFixed(2)}%</div>
                    <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 5px;">Based on entered scores</div>
                </div>
                ` : ''}
            </div>
            
            ${evaluationHtml}
            
            ${examsHtml}
            
            <div style="margin: 30px 0;">
                <h3 style="color: #667eea; margin-bottom: 15px;">Add New Entry</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="addLecture('${subject}')">+ Add Lecture</button>
                    <button class="btn btn-primary" onclick="addLab('${subject}')">+ Add Lab</button>
                    <button class="btn btn-primary" onclick="addSelfStudy('${subject}')">+ Add Self Study</button>
                </div>
            </div>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">📚 Lectures</h3>
            <div class="lectures-grid" id="lecturesGrid_${subject}">
        `;
    
    if (data.lectures.length === 0) {
        html += '<p style="color: #999;">No lectures recorded yet. Click "Add Lecture" to start tracking.</p>';
    } else {
        data.lectures.forEach((lecture, index) => {
            const status = lecture.attended ? 'attended' : 'missed';
            const statusClass = lecture.attended ? 'status-attended' : 'status-missed';
            
            html += `
                <div class="lecture-item ${lecture.attended ? 'completed' : ''}">
                    <div class="lecture-header">
                        <div class="lecture-title">Lecture ${index + 1} - ${lecture.date} ${lecture.time ? `(${lecture.time})` : ''}</div>
                        <div class="lecture-status ${statusClass}">${lecture.attended ? 'Attended' : 'Missed'}</div>
                    </div>
                    <div style="margin-top: 10px;"><strong>Topics Covered:</strong> ${lecture.topics || 'Not recorded'}</div>
                    ${lecture.notes ? `<div style="margin-top: 10px;"><strong>Notes:</strong> ${lecture.notes}</div>` : ''}
                    <button class="btn btn-secondary" style="margin-top: 10px; padding: 5px 15px; font-size: 12px;" onclick="editLecture('${subject}', ${index})">Edit</button>
                </div>
            `;
        });
    }
    
    html += `
            </div>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">🔬 Labs</h3>
            <div class="lectures-grid" id="labsGrid_${subject}">
    `;
    
    if (data.labs.length === 0) {
        html += '<p style="color: #999;">No labs recorded yet. Click "Add Lab" to start tracking.</p>';
    } else {
        data.labs.forEach((lab, index) => {
            const statusClass = lab.completed ? 'status-attended' : 'status-pending';
            
            html += `
                <div class="lecture-item ${lab.completed ? 'completed' : ''}">
                    <div class="lecture-header">
                        <div class="lecture-title">Lab ${index + 1} - ${lab.date} ${lab.time ? `(${lab.time})` : ''}</div>
                        <div class="lecture-status ${statusClass}">${lab.completed ? 'Completed' : 'Pending'}</div>
                    </div>
                    <div style="margin-top: 10px;"><strong>Experiment/Topic:</strong> ${lab.experiment || 'Not recorded'}</div>
                    ${lab.assignment ? `<div style="margin-top: 10px;"><strong>Assignments:</strong> ${lab.assignment}</div>` : ''}
                    ${lab.notes ? `<div style="margin-top: 10px;"><strong>Notes:</strong> ${lab.notes}</div>` : ''}
                    <button class="btn btn-secondary" style="margin-top: 10px; padding: 5px 15px; font-size: 12px;" onclick="editLab('${subject}', ${index})">Edit</button>
                </div>
            `;
        });
    }
    
    html += `
            </div>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">📖 Self Study Topics</h3>
            <div class="lectures-grid" id="selfStudyGrid_${subject}">
    `;
    
    if (data.selfStudyTopics.length === 0) {
        html += '<p style="color: #999;">No self-study topics recorded yet. Click "Add Self Study" to start tracking.</p>';
    } else {
        const totalSelfStudyHours = data.selfStudyTopics.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
        html += `<p style="color: #667eea; margin-bottom: 15px; font-weight: 600;">Total Self-Study Hours: ${totalSelfStudyHours.toFixed(1)}h</p>`;
        data.selfStudyTopics.forEach((topic, index) => {
            html += `
                <div class="lecture-item completed">
                    <div class="lecture-header">
                        <div class="lecture-title">${topic.date} - ${topic.hours}h</div>
                    </div>
                    <div style="margin-top: 10px;"><strong>Topics Studied:</strong> ${topic.topics || 'Not recorded'}</div>
                    ${topic.resources ? `<div style="margin-top: 10px;"><strong>Resources Used:</strong> ${topic.resources}</div>` : ''}
                    <button class="btn btn-secondary" style="margin-top: 10px; padding: 5px 15px; font-size: 12px;" onclick="editSelfStudy('${subject}', ${index})">Edit</button>
                </div>
            `;
        });
    }
    
    html += `
            </div>

            <h3 style="color: #667eea; margin: 30px 0 15px 0;">📋 Lab Assignments</h3>
            <div class="lectures-grid" id="assignmentsGrid_${subject}">
    `;
    
    if (!data.assignments || data.assignments.length === 0) {
        html += '<p style="color: #999;">No lab assignments recorded yet.</p>';
    } else {
        data.assignments.forEach((assignment, index) => {
            const statusClass = assignment.completed ? 'status-attended' : 'status-pending';
            html += `
                <div class="lecture-item ${assignment.completed ? 'completed' : ''}">
                    <div class="lecture-header">
                        <div class="lecture-title">Assignment - ${assignment.date}</div>
                        <div class="lecture-status ${statusClass}">${assignment.completed ? 'Completed' : 'Pending'}</div>
                    </div>
                    <div style="margin-top: 10px;"><strong>Tasks:</strong> ${assignment.assignments}</div>
                    <button class="btn btn-secondary" style="margin-top: 10px; padding: 5px 15px; font-size: 12px;" onclick="toggleAssignment('${subject}', ${index})">Mark ${assignment.completed ? 'Incomplete' : 'Complete'}</button>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    detailDiv.innerHTML = html;
}

window.editLecture = function(subject, index) {
    const lecture = subjectData[subject].lectures[index];
    const newTopics = prompt('Edit topics covered:', lecture.topics || '');
    if (newTopics !== null) {
        lecture.topics = newTopics;
    }
    const newNotes = prompt('Edit notes:', lecture.notes || '');
    if (newNotes !== null) {
        lecture.notes = newNotes;
    }
    const newAttended = confirm('Did you attend this lecture?');
    lecture.attended = newAttended;
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.editLab = function(subject, index) {
    const lab = subjectData[subject].labs[index];
    const newExperiment = prompt('Edit experiment/topic:', lab.experiment || '');
    if (newExperiment !== null) {
        lab.experiment = newExperiment;
    }
    const newAssignment = prompt('Edit assignments:', lab.assignment || '');
    if (newAssignment !== null) {
        lab.assignment = newAssignment;
    }
    const newNotes = prompt('Edit notes:', lab.notes || '');
    if (newNotes !== null) {
        lab.notes = newNotes;
    }
    const newCompleted = confirm('Was this lab completed?');
    lab.completed = newCompleted;
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.editSelfStudy = function(subject, index) {
    const selfStudy = subjectData[subject].selfStudyTopics[index];
    const newTopics = prompt('Edit topics studied:', selfStudy.topics || '');
    if (newTopics !== null) {
        selfStudy.topics = newTopics;
    }
    const newHours = prompt('Edit hours:', selfStudy.hours || '1');
    if (newHours !== null) {
        selfStudy.hours = parseFloat(newHours) || 1;
    }
    const newResources = prompt('Edit resources:', selfStudy.resources || '');
    if (newResources !== null) {
        selfStudy.resources = newResources;
    }
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.toggleAssignment = function(subject, index) {
    const assignment = subjectData[subject].assignments[index];
    assignment.completed = !assignment.completed;
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.editEvaluationScore = function(subject, index) {
    const evalItem = subjects[subject].evaluation[index];
    if (!evalItem) return;
    
    const currentScore = evalItem.score !== null && evalItem.score !== undefined ? evalItem.score : '';
    const currentMaxScore = evalItem.maxScore !== null && evalItem.maxScore !== undefined ? evalItem.maxScore : '';
    
    const scoreInput = prompt(`Enter score for ${evalItem.type} (Weight: ${evalItem.weight}%):\n\nCurrent Score: ${currentScore}\nMax Score: ${currentMaxScore}`, currentScore);
    if (scoreInput === null) return;
    
    const maxScoreInput = prompt(`Enter maximum score for ${evalItem.type}:`, currentMaxScore);
    if (maxScoreInput === null) return;
    
    const score = parseFloat(scoreInput);
    const maxScore = parseFloat(maxScoreInput);
    
    if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
        alert('Please enter valid numbers. Max score must be greater than 0.');
        return;
    }
    
    if (score < 0 || score > maxScore) {
        alert(`Score must be between 0 and ${maxScore}.`);
        return;
    }
    
    // Update the evaluation item
    evalItem.score = score;
    evalItem.maxScore = maxScore;
    
    // Save to subjectData
    if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
    if (!subjectData[subject].evaluationScores) subjectData[subject].evaluationScores = [];
    
    const existingScore = subjectData[subject].evaluationScores.find(s => s.type === evalItem.type);
    if (existingScore) {
        existingScore.score = score;
        existingScore.maxScore = maxScore;
    } else {
        subjectData[subject].evaluationScores.push({
            type: evalItem.type,
            score: score,
            maxScore: maxScore
        });
    }
    
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.backToSubjects = function() {
    document.getElementById('subjectsList').style.display = 'block';
    document.getElementById('subjectDetail').style.display = 'none';
}

window.addLecture = function(subject) {
    const date = prompt('Enter lecture date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const time = prompt('Enter lecture time (e.g., 8am-9am, 9am-10am, 11am-12pm):', '');
    const attended = confirm('Did you attend this lecture?');
    const topics = prompt('What topics were covered?', '');
    const notes = prompt('Any additional notes?', '');
    
    if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
    if (!subjectData[subject].lectures) subjectData[subject].lectures = [];
    
    subjectData[subject].lectures.push({
        date,
        time: time || '',
        subject,
        attended,
        topics: topics || '',
        notes: notes || ''
    });
    
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.addLab = function(subject) {
    const date = prompt('Enter lab date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const time = prompt('Enter lab time (e.g., 4pm-6pm, 2pm-4pm):', '');
    const completed = confirm('Did you complete this lab?');
    const experiment = prompt('What experiment/topic was covered?', '');
    const assignment = prompt('Any assignments to complete?', '');
    const notes = prompt('Lab notes and observations:', '');
    
    if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
    if (!subjectData[subject].labs) subjectData[subject].labs = [];
    
    subjectData[subject].labs.push({
        date,
        time: time || '',
        completed,
        experiment: experiment || '',
        assignment: assignment || '',
        notes: notes || ''
    });
    
    if (assignment) {
        if (!subjectData[subject].assignments) subjectData[subject].assignments = [];
        let assignmentEntry = subjectData[subject].assignments.find(a => a.date === date);
        if (!assignmentEntry) {
            assignmentEntry = { date, assignments: assignment, completed: false };
            subjectData[subject].assignments.push(assignmentEntry);
        } else {
            assignmentEntry.assignments += '\n' + assignment;
        }
    }
    
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.addSelfStudy = function(subject) {
    const date = prompt('Enter date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const hours = prompt('How many hours did you study?', '1');
    const topics = prompt('What topics did you study?', '');
    const resources = prompt('What resources did you use?', '');
    
    if (!subjectData[subject].selfStudyTopics) subjectData[subject].selfStudyTopics = [];
    
    subjectData[subject].selfStudyTopics.push({
        date,
        hours: parseFloat(hours) || 1,
        topics,
        resources
    });
    
    saveSubjectData();
    showSubjectDetail(subject);
    showSaveIndicator();
}

window.loadDay = async function () {
  const dateInput = document.getElementById('dateInput');
  currentDate = new Date(dateInput.value);

  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

  if (document.getElementById('dayInfo')) {
    document.getElementById('dayInfo').textContent =
      `${dayName}, ${currentDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })}`;
  }

  try {
    const ref = doc(db, "users", userId, "days", dateInput.value);
    const snap = await getDoc(ref);

    dayData = snap.exists() ? snap.data() : {};

  } catch (error) {
    console.error("Error loading day data from Firebase:", error);
    dayData = {};
  }

  // 🔽 KEEP ALL EXISTING UI LOGIC
  renderTimetable(dayName);
  loadExtraData();
  setupExtraDataListeners();
  updateStats();
  renderQuickStats();
  updateUpcomingClass();
};


function renderTimetable(dayName) {
    const container = document.getElementById('timetableContainer');
    const schedule = timetable[dayName] || [];
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayCancel = cancelledData[dateStr] || {};

    // Check if entire day is a holiday
    if (dayCancel.isHoliday) {
        container.innerHTML = `
            <div class="day-info" style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%); color: #2d3436; padding: 30px; text-align: center; border: 2px solid #fdcb6e;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.5em;">🎉 Holiday</h3>
                <p style="margin: 0; font-size: 1.1em;">${dayCancel.reason || 'Holiday'}</p>
                <button class="btn btn-secondary" onclick="unmarkHoliday()" style="margin-top: 15px;">Remove Holiday Status</button>
            </div>
        `;
        return;
    }

    if (schedule.length === 0) {
        container.innerHTML = '<div class="day-info" style="background: #f0f0f0; color: #333;">No classes scheduled for this day</div>';
        return;
    }

    let html = '<div class="timetable">';

    schedule.forEach((slot, index) => {
        const slotData = dayData.slots?.[index] || {};
        const isCancelled = dayCancel.cancelled && dayCancel.cancelled.includes(index);
        const attendanceClass = slotData.attendance === 'present' ? 'attended' : 
                              slotData.attendance === 'absent' ? 'absent' : '';
        const freeClass = slot.isFree ? 'free-slot' : '';
        const cancelledClass = isCancelled ? 'cancelled-slot' : '';

        html += `
            <div class="time-slot ${attendanceClass} ${freeClass} ${cancelledClass}">
                <div class="slot-header">
                    <div>
                        <div class="slot-time">${slot.time}</div>
                        <div class="slot-subject">${slot.subject}${isCancelled ? ' ❌ CANCELLED' : ''}</div>
                    </div>
                    ${!slot.isFree ? `
                    <div class="attendance-btns">
                        <button class="attendance-btn ${isCancelled ? 'cancelled' : 'present'} ${slotData.attendance === 'present' && !isCancelled ? 'active' : ''}" 
                                onclick="markAttendance(${index}, 'present')" ${isCancelled ? 'disabled' : ''}>Present</button>
                        <button class="attendance-btn ${isCancelled ? 'cancelled' : 'absent'} ${slotData.attendance === 'absent' && !isCancelled ? 'active' : ''}" 
                                onclick="markAttendance(${index}, 'absent')" ${isCancelled ? 'disabled' : ''}>Absent</button>
                        <button class="btn btn-secondary" onclick="toggleCancellation(${index})" style="padding: 8px 12px; font-size: 13px; margin-left: 10px;">
                            ${isCancelled ? '↩️ Restore' : '❌ Cancel'}
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                ${!slot.isFree ? `
                <div class="slot-content">
                    <div class="input-group">
                        <label>Topics Covered:</label>
                        <textarea onchange="updateSlotData(${index}, 'topics', this.value); updateLectureTopics('${slot.subject.replace(' (Extra by Prof)', '').trim()}', '${slot.time}', this.value);">${slotData.topics || ''}</textarea>
                    </div>
                    
                    ${slot.isLab ? `
                    <div class="input-group">
                        <label>Lab Experiment/Topic Covered:</label>
                        <textarea onchange="updateSlotData(${index}, 'labWork', this.value); updateSubjectLab('${slot.labSubject || slot.subject.replace(' Lab', '')}', '${slot.time}', this.value);">${slotData.labWork || ''}</textarea>
                    </div>
                    <div class="input-group">
                        <label>Lab Assignments to Complete:</label>
                        <textarea onchange="updateSlotData(${index}, 'assignments', this.value); updateLabAssignments('${slot.labSubject || slot.subject.replace(' Lab', '')}', this.value);">${slotData.assignments || ''}</textarea>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="labCompleted${index}" 
                               ${slotData.labCompleted ? 'checked' : ''} 
                               onchange="updateSlotData(${index}, 'labCompleted', this.checked); updateLabCompletion('${slot.labSubject || slot.subject.replace(' Lab', '')}', this.checked);">
                        <label for="labCompleted${index}">Lab Completed</label>
                    </div>
                    ` : ''}
                    
                    <div class="checkbox-group">
                        <input type="checkbox" id="selfStudy${index}" 
                               ${slotData.selfStudy ? 'checked' : ''} 
                               onchange="updateSlotData(${index}, 'selfStudy', this.checked)">
                        <label for="selfStudy${index}">Did self-study for this subject</label>
                    </div>
                    
                    ${slotData.selfStudy ? `
                    <div class="input-group">
                        <label>Self Study Hours:</label>
                        <input type="number" min="0" step="0.5" value="${slotData.selfStudyHours || 0}"
                               onchange="updateSlotData(${index}, 'selfStudyHours', this.value)">
                    </div>
                    <div class="input-group">
                        <label>What did you study?</label>
                        <textarea onchange="updateSlotData(${index}, 'selfStudyContent', this.value)">${slotData.selfStudyContent || ''}</textarea>
                    </div>
                    ` : ''}
                </div>
                ` : `
                <div class="slot-content">
                    <div class="input-group">
                        <label>How did you use this free time?</label>
                        <textarea onchange="updateSlotData(${index}, 'freeTimeUse', this.value)">${slotData.freeTimeUse || ''}</textarea>
                    </div>
                </div>
                `}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

window.markAttendance = function(index, status) {
    if (!dayData.slots) dayData.slots = {};
    if (!dayData.slots[index]) dayData.slots[index] = {};
    
    dayData.slots[index].attendance = status;
    
    const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
    const schedule = timetable[dayName] || [];
    const slot = schedule[index];
    
    if (slot && !slot.isFree && !slot.isLab) {
        // Update subject lecture attendance
        const subject = slot.subject.replace(' (Extra by Prof)', '').trim();
        const date = currentDate.toISOString().split('T')[0];
        const time = slot.time;
        
        if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
        if (!subjectData[subject].lectures) subjectData[subject].lectures = [];
        
        let lecture = subjectData[subject].lectures.find(l => l.date === date && l.time === time);
        if (!lecture) {
            lecture = { date, time, subject, topics: '', notes: '', attended: status === 'present' };
            subjectData[subject].lectures.push(lecture);
        } else {
            lecture.attended = status === 'present';
        }
        saveSubjectData();
    }
    
    renderTimetable(dayName);
    updateStats();
    autoSave();
}

window.updateSlotData = function(index, field, value) {
    if (!dayData.slots) dayData.slots = {};
    if (!dayData.slots[index]) dayData.slots[index] = {};
    
    dayData.slots[index][field] = value;
    
    if (field === 'selfStudy' && value) {
        const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
        renderTimetable(dayName);
    }
    
    if (field === 'topics' || field === 'selfStudyContent' || field === 'selfStudyHours') {
        const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
        const schedule = timetable[dayName] || [];
        const slot = schedule[index];
        
        if (slot && !slot.isFree) {
            const subject = slot.subject.replace(' (Extra by Prof)', '').trim();
            if (field === 'selfStudyContent' || field === 'selfStudyHours') {
                if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
                if (!subjectData[subject].selfStudyTopics) subjectData[subject].selfStudyTopics = [];
                
                const date = currentDate.toISOString().split('T')[0];
                let selfStudy = subjectData[subject].selfStudyTopics.find(s => s.date === date);
                
                if (!selfStudy) {
                    selfStudy = { date, hours: 0, topics: '', resources: '' };
                    subjectData[subject].selfStudyTopics.push(selfStudy);
                }
                
                if (field === 'selfStudyHours') {
                    selfStudy.hours = parseFloat(value) || 0;
                }
                if (field === 'selfStudyContent') {
                    selfStudy.topics = value;
                }
                saveSubjectData();
            }
        }
    }
    
    updateStats();
    autoSave();
}

window.importData = function () {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await importBackupToFirebase(backup);
    } catch (err) {
      alert("❌ Invalid JSON file");
      console.error(err);
    }
  };

  input.click();
};

window.importBackupToFirebase = async function (backup) {
  if (!window.userId) {
    alert("❌ Please login first");
    return;
  }

  let importedDays = 0;

  // 1️⃣ Import daily study data
  for (const key in backup) {
    if (key.startsWith("study_")) {
      const date = key.replace("study_", "");
      await saveDayData(date, backup[key]);
      importedDays++;
    }
  }

  // 2️⃣ Import subject data
  if (backup.subject_data) {
    subjectData = backup.subject_data;
    await saveSubjectData();
  }

  // 3️⃣ Import todo data
  if (backup.todo_data) {
    todoData = backup.todo_data;
    await saveTodoData();
  }

  // 4️⃣ Import cancelled data (if present)
  if (backup.cancelled_data) {
    cancelledData = backup.cancelled_data;
    await saveCancelledData();
  }

  alert(`✅ Import complete!
📅 Days imported: ${importedDays}
📚 Subjects & Todos restored`);
};





function updateLectureTopics(subject, time, topics) {
    if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
    if (!subjectData[subject].lectures) subjectData[subject].lectures = [];
    
    const date = currentDate.toISOString().split('T')[0];
    let lecture = subjectData[subject].lectures.find(l => l.date === date && l.time === time);
    
    if (!lecture) {
        lecture = { date, time, subject, topics, notes: '', attended: false };
        subjectData[subject].lectures.push(lecture);
    } else {
        lecture.topics = topics;
    }
    
    saveSubjectData();
}

function loadExtraData() {
    document.getElementById('pythonTopics').value = dayData.pythonTopics || '';
    document.getElementById('dsaTopics').value = dayData.dsaTopics || '';
    document.getElementById('pythonDuration').value = dayData.pythonDuration || 60;
    document.getElementById('dsaDuration').value = dayData.dsaDuration || 60;
    document.getElementById('pythonResources').value = dayData.pythonResources || '';
    document.getElementById('dsaProblemsCount').value = dayData.dsaProblemsCount || 0;
    document.getElementById('keyLearnings').value = dayData.keyLearnings || '';
    document.getElementById('tomorrowGoals').value = dayData.tomorrowGoals || '';
    document.getElementById('challenges').value = dayData.challenges || '';
}

// Set up event listeners for extra data
function setupExtraDataListeners() {
    document.getElementById('pythonTopics').onchange = (e) => { dayData.pythonTopics = e.target.value; autoSave(); };
    document.getElementById('dsaTopics').onchange = (e) => { dayData.dsaTopics = e.target.value; autoSave(); };
    document.getElementById('pythonDuration').onchange = (e) => { dayData.pythonDuration = e.target.value; updateStats(); autoSave(); };
    document.getElementById('dsaDuration').onchange = (e) => { dayData.dsaDuration = e.target.value; updateStats(); autoSave(); };
    document.getElementById('pythonResources').onchange = (e) => { dayData.pythonResources = e.target.value; autoSave(); };
    document.getElementById('dsaProblemsCount').onchange = (e) => { dayData.dsaProblemsCount = parseInt(e.target.value) || 0; autoSave(); };
    document.getElementById('keyLearnings').onchange = (e) => { dayData.keyLearnings = e.target.value; autoSave(); };
    document.getElementById('tomorrowGoals').onchange = (e) => { dayData.tomorrowGoals = e.target.value; autoSave(); };
    document.getElementById('challenges').onchange = (e) => { dayData.challenges = e.target.value; autoSave(); };
}

function updateSubjectLab(subject, time, content) {
    if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
    if (!subjectData[subject].labs) subjectData[subject].labs = [];
    
    const date = currentDate.toISOString().split('T')[0];
    let lab = subjectData[subject].labs.find(l => l.date === date && l.time === time);
    
    if (!lab) {
        lab = { date, time, experiment: content, completed: false, assignment: '', notes: '' };
        subjectData[subject].labs.push(lab);
    } else {
        lab.experiment = content;
    }
    
    saveSubjectData();
}

function updateLabAssignments(subject, assignments) {
    if (!subjectData[subject]) subjectData[subject] = { lectures: [], labs: [], selfStudyTopics: [], assignments: [] };
    if (!subjectData[subject].assignments) subjectData[subject].assignments = [];
    
    const date = currentDate.toISOString().split('T')[0];
    let assignment = subjectData[subject].assignments.find(a => a.date === date);
    
    if (!assignment) {
        assignment = { date, assignments, completed: false };
        subjectData[subject].assignments.push(assignment);
    } else {
        assignment.assignments = assignments;
    }
    
    saveSubjectData();
}

function updateLabCompletion(subject, completed) {
    if (!subjectData[subject]) return;
    if (!subjectData[subject].labs) subjectData[subject].labs = [];
    
    const date = currentDate.toISOString().split('T')[0];
    const lab = subjectData[subject].labs.find(l => l.date === date);
    
    if (lab) {
        lab.completed = completed;
        saveSubjectData();
    }
}

function updateStats() {
    const slots = dayData.slots || {};
    const slotArray = Object.values(slots);
    
    const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
    const schedule = timetable[dayName] || [];
    const totalScheduledClasses = schedule.filter(s => !s.isFree).length;
    
    const totalClasses = slotArray.filter(s => s.attendance).length;
    const attendedClasses = slotArray.filter(s => s.attendance === 'present').length;
    const attendanceRate = totalScheduledClasses > 0 ? Math.round((attendedClasses / totalScheduledClasses) * 100) : 0;
    
    const selfStudyHours = slotArray.reduce((sum, s) => sum + (parseFloat(s.selfStudyHours) || 0), 0);
    const pythonHours = (parseFloat(dayData.pythonDuration) || 0) / 60;
    const dsaHours = (parseFloat(dayData.dsaDuration) || 0) / 60;
    const totalStudyHours = selfStudyHours + pythonHours + dsaHours;
    
    if (document.getElementById('attendanceRate')) {
        document.getElementById('attendanceRate').textContent = attendanceRate + '%';
    }
    if (document.getElementById('studyHours')) {
        document.getElementById('studyHours').textContent = (selfStudyHours + pythonHours + dsaHours).toFixed(1);
    }
    if (document.getElementById('classesCount')) {
        document.getElementById('classesCount').textContent = `${attendedClasses}/${totalScheduledClasses}`;
    }
    if (document.getElementById('totalStudy')) {
        document.getElementById('totalStudy').textContent = totalStudyHours.toFixed(1) + 'h';
    }
}

function renderQuickStats() {
    const quickStatsDiv = document.getElementById('quickStats');
    if (!quickStatsDiv) return;
    
    const attendanceStreak = await calculateAttendanceStreak();
    const studyStreak = await calculateStudyStreak();
    const pendingAssignments = getPendingAssignmentsCount();
    const missedToday = getMissedClassesToday();
    const weeklyStats = await getWeeklyStats();
    
    let html = `
        <div class="quick-stats-grid">
            <div class="quick-stat-card streak-card">
                <div class="stat-icon">🔥</div>
                <div class="stat-info">
                    <div class="stat-label">Attendance Streak</div>
                    <div class="stat-value">${attendanceStreak} days</div>
                </div>
            </div>
            <div class="quick-stat-card streak-card">
                <div class="stat-icon">📚</div>
                <div class="stat-info">
                    <div class="stat-label">Study Streak</div>
                    <div class="stat-value">${studyStreak} days</div>
                </div>
            </div>
            <div class="quick-stat-card ${pendingAssignments > 0 ? 'alert-card' : ''}">
                <div class="stat-icon">${pendingAssignments > 0 ? '⚠️' : '✓'}</div>
                <div class="stat-info">
                    <div class="stat-label">Pending Assignments</div>
                    <div class="stat-value">${pendingAssignments}</div>
                </div>
            </div>
            <div class="quick-stat-card ${missedToday > 0 ? 'warning-card' : ''}">
                <div class="stat-icon">${missedToday > 0 ? '❌' : '✅'}</div>
                <div class="stat-info">
                    <div class="stat-label">Missed Classes Today</div>
                    <div class="stat-value">${missedToday}</div>
                </div>
            </div>
            <div class="quick-stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-label">Weekly Study Hours</div>
                    <div class="stat-value">${weeklyStats.studyHours.toFixed(1)}h</div>
                </div>
            </div>
            <div class="quick-stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-info">
                    <div class="stat-label">Weekly Attendance</div>
                    <div class="stat-value">${weeklyStats.attendanceRate}%</div>
                </div>
            </div>
        </div>
    `;
    
    quickStatsDiv.innerHTML = html;
}

function updateCurrentTime() {
    const currentTimeDiv = document.getElementById('currentTime');
    if (!currentTimeDiv) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    currentTimeDiv.textContent = `Current Time: ${timeStr}`;
}

function updateUpcomingClass() {
    const upcomingDiv = document.getElementById('upcomingClass');
    if (!upcomingDiv) return;
    
    const upcoming = getUpcomingClass();
    if (upcoming) {
        const hours = Math.floor(upcoming.minutesUntil / 60);
        const minutes = upcoming.minutesUntil % 60;
        let timeStr = '';
        if (hours > 0) {
            timeStr = `${hours}h ${minutes}m`;
        } else {
            timeStr = `${minutes}m`;
        }
        
        upcomingDiv.innerHTML = `
            <div class="upcoming-class-alert">
                <strong>⏰ Next Class:</strong> ${upcoming.subject} at ${upcoming.time}
                <br><small>In ${timeStr}</small>
            </div>
        `;
        upcomingDiv.style.display = 'block';
    } else {
        upcomingDiv.innerHTML = '<div class="upcoming-class-alert no-class">✅ No more classes scheduled for today</div>';
        upcomingDiv.style.display = 'block';
    }
}

window.navigateDay = function(direction) {
    const dateInput = document.getElementById('dateInput');
    const currentDateObj = new Date(dateInput.value);
    currentDateObj.setDate(currentDateObj.getDate() + direction);
    dateInput.value = currentDateObj.toISOString().split('T')[0];
    loadDay();
    renderQuickStats();
}

window.showSearchResults = function(query) {
    const results = await searchContent(query);
    const searchResultsDiv = document.getElementById('searchResults');
    if (!searchResultsDiv) return;
    
    if (results.length === 0) {
        searchResultsDiv.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">No results found.</p>';
        searchResultsDiv.style.display = 'block';
        return;
    }
    
    let html = '<div class="search-results-list">';
    html += `<h4 style="margin-bottom: 15px;">Found ${results.length} result(s):</h4>`;
    
    results.forEach(result => {
        html += `
            <div class="search-result-item" onclick="loadHistoryDay('${result.date}')">
                <div class="result-type">${result.type}</div>
                <div class="result-date">${result.date}</div>
                <div class="result-content">${result.content}...</div>
            </div>
        `;
    });
    
    html += '</div>';
    searchResultsDiv.innerHTML = html;
    searchResultsDiv.style.display = 'block';
}

window.toggleSearch = function() {
    const searchContainer = document.getElementById('searchContainer');
    if (!searchContainer) return;
    
    if (searchContainer.style.display === 'none' || !searchContainer.style.display) {
        searchContainer.style.display = 'block';
        document.getElementById('searchInput').focus();
    } else {
        searchContainer.style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
    }
}

window.saveDay = async function () {
  const dateInput = document.getElementById('dateInput');
  const date = dateInput.value;

  if (!date || !window.userId) return;

  try {
    await setDoc(
      doc(db, "users", userId, "days", date),
      dayData
    );

    showSaveIndicator();
  } catch (error) {
    console.error("Error saving day data to Firebase:", error);
    alert("Failed to save data. Please check your connection.");
  }
};


let autoSaveTimeout;
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(saveDay, 1000);
}

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    indicator.style.display = 'block';
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 2000);
}

let historyFilterStart = null;
let historyFilterEnd = null;

window.showHistory = async function () {
  const historyGrid = document.getElementById('historyGrid');
  const historyStats = document.getElementById('historyStats');

  if (!historyGrid) return;

  historyGrid.innerHTML = '<p>Loading history...</p>';

  try {
    const entries = [];

    // 🔥 FETCH ALL DAYS FROM FIREBASE
    const daysRef = collection(db, "users", userId, "days");
    const snapshot = await getDocs(daysRef);

    snapshot.forEach(docSnap => {
      const date = docSnap.id; // YYYY-MM-DD
      const data = docSnap.data();

      const dateObj = new Date(date + 'T00:00:00');
      if (isNaN(dateObj.getTime())) return;

      // 🔍 Apply date filters
      if (historyFilterStart && dateObj < new Date(historyFilterStart + 'T00:00:00')) return;
      if (historyFilterEnd && dateObj > new Date(historyFilterEnd + 'T23:59:59')) return;

      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      const slots = Object.values(data.slots || {});
      const attended = slots.filter(s => s.attendance === 'present').length;
      const total = slots.filter(s => s.attendance).length;
      const selfStudy = slots.reduce((sum, s) => sum + (parseFloat(s.selfStudyHours) || 0), 0);
      const pythonHours = (parseFloat(data.pythonDuration) || 0) / 60;
      const dsaHours = (parseFloat(data.dsaDuration) || 0) / 60;
      const totalStudy = selfStudy + pythonHours + dsaHours;
      const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

      entries.push({
        date,
        dateObj,
        dayName,
        data,
        attended,
        total,
        selfStudy,
        pythonHours,
        dsaHours,
        totalStudy,
        attendanceRate
      });
    });

    // ❌ No data
    if (entries.length === 0) {
      historyGrid.innerHTML =
        '<p>No history found for the selected filter. Try adjusting your date range or clear filters.</p>';
      if (historyStats) historyStats.style.display = 'none';
      return;
    }

    // 🔃 Sorting
    const sortBy = document.getElementById('historySort')?.value || 'newest';
    entries.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.dateObj - b.dateObj;
        case 'hours':
          return b.totalStudy - a.totalStudy;
        case 'attendance':
          return b.attendanceRate - a.attendanceRate;
        case 'newest':
        default:
          return b.dateObj - a.dateObj;
      }
    });

    // 📊 Statistics
    const totalDays = entries.length;
    const avgStudyHours = entries.reduce((sum, e) => sum + e.totalStudy, 0) / totalDays;
    const avgAttendance = entries.reduce((sum, e) => sum + e.attendanceRate, 0) / totalDays;
    const totalStudyHours = entries.reduce((sum, e) => sum + e.totalStudy, 0);

    if (historyStats) {
      historyStats.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div><strong>Total Days Tracked:</strong> ${totalDays}</div>
          <div><strong>Average Study Hours/Day:</strong> ${avgStudyHours.toFixed(1)}h</div>
          <div><strong>Average Attendance:</strong> ${avgAttendance.toFixed(1)}%</div>
          <div><strong>Total Study Hours:</strong> ${totalStudyHours.toFixed(1)}h</div>
        </div>
      `;
      historyStats.style.display = 'block';
    }

    // 🧱 Render cards
    let html = '';

    for (const entry of entries.slice(0, 100)) {
      html += `
        <div class="history-item" style="cursor: pointer;" onclick="loadHistoryDay('${entry.date}')">
          <div class="history-date">
            ${entry.dayName}, ${entry.dateObj.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <div class="history-summary">
            <strong>Attendance:</strong> ${entry.attended}/${entry.total} classes (${entry.attendanceRate}%)<br>
            <strong>Self Study:</strong> ${entry.selfStudy.toFixed(1)} hours<br>
            <strong>Python/DSA:</strong> ${(entry.pythonHours + entry.dsaHours).toFixed(1)} hours<br>
            <strong>Total Study:</strong> ${entry.totalStudy.toFixed(1)} hours<br>
            ${entry.data.pythonTopics ? `<strong>Python Topics:</strong> ${entry.data.pythonTopics.substring(0, 60)}${entry.data.pythonTopics.length > 60 ? '...' : ''}<br>` : ''}
            ${entry.data.dsaTopics ? `<strong>DSA Topics:</strong> ${entry.data.dsaTopics.substring(0, 60)}${entry.data.dsaTopics.length > 60 ? '...' : ''}<br>` : ''}
            ${entry.data.keyLearnings ? `<strong>Key Learning:</strong> ${entry.data.keyLearnings.substring(0, 80)}${entry.data.keyLearnings.length > 80 ? '...' : ''}<br>` : ''}
            <button class="btn btn-secondary"
              style="margin-top: 10px; padding: 8px 15px; font-size: 14px;"
              onclick="event.stopPropagation(); loadHistoryDay('${entry.date}')">
              View & Edit Details
            </button>
          </div>
        </div>
      `;
    }

    historyGrid.innerHTML = html || '<p>No history data available.</p>';

  } catch (error) {
    console.error(error);
    historyGrid.innerHTML = '<p>Error loading history.</p>';
    if (historyStats) historyStats.style.display = 'none';
  }
};


window.applyHistoryFilter = function() {
    historyFilterStart = document.getElementById('historyFilterStart')?.value || null;
    historyFilterEnd = document.getElementById('historyFilterEnd')?.value || null;
    showHistory();
}

window.clearHistoryFilter = function() {
    historyFilterStart = null;
    historyFilterEnd = null;
    if (document.getElementById('historyFilterStart')) document.getElementById('historyFilterStart').value = '';
    if (document.getElementById('historyFilterEnd')) document.getElementById('historyFilterEnd').value = '';
    showHistory();
}

window.loadHistoryDay = async function (date, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // Set date input
  document.getElementById('dateInput').value = date;

  // Switch to daily tab
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab')[0].classList.add('active');
  document.getElementById('dailyTab').classList.add('active');

  // 🔥 IMPORTANT: await Firebase load
  await loadDay();
};


window.exportData = async function () {
  try {
    if (!window.userId) {
      alert("Please login first");
      return;
    }

    const allData = {
      dayData: {},
      subjectData: {},
      goals: {},
      cancelledData: {},
      todoData: {},
      exportDate: new Date().toISOString(),
      version: "2.0"
    };

    // 🔥 1. Export all days
    const daysRef = collection(db, "users", userId, "days");
    const daysSnap = await getDocs(daysRef);

    daysSnap.forEach(docSnap => {
      allData.dayData[docSnap.id] = docSnap.data();
    });

    // 🔥 2. Export meta data
    const metaMap = [
      ["subjects", "subjectData"],
      ["goals", "goals"],
      ["cancelled", "cancelledData"],
      ["todos", "todoData"]
    ];

    for (const [docId, targetKey] of metaMap) {
      const ref = doc(db, "users", userId, "meta", docId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        allData[targetKey] = snap.data();
      }
    }

    // 🔽 Download JSON
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `study_tracker_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert("Data exported successfully!");
  } catch (error) {
    console.error("Export error:", error);
    alert("Failed to export data. Please try again.");
  }
};


window.exportToPDF = function() {
    // Calculate stats first
    const slots = dayData.slots || {};
    const slotArray = Object.values(slots);
    const dayName = currentDate.toLocaleDateString('en-US', {weekday: 'long'});
    const schedule = timetable[dayName] || [];
    const totalScheduledClasses = schedule.filter(s => !s.isFree).length;
    const attendedClasses = slotArray.filter(s => s.attendance === 'present').length;
    const attendanceRate = totalScheduledClasses > 0 ? Math.round((attendedClasses / totalScheduledClasses) * 100) : 0;
    const selfStudyHours = slotArray.reduce((sum, s) => sum + (parseFloat(s.selfStudyHours) || 0), 0);
    const pythonHours = (parseFloat(dayData.pythonDuration) || 0) / 60;
    const dsaHours = (parseFloat(dayData.dsaDuration) || 0) / 60;
    const totalStudyHours = selfStudyHours + pythonHours + dsaHours;
    
    // Simple PDF export using window.print() with optimized styling
    const printWindow = window.open('', '_blank');
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Study Tracker - ${currentDate.toLocaleDateString()}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                h1 { color: #1a1a1a; margin-bottom: 10px; }
                h2 { color: #4a4a4a; margin-top: 20px; margin-bottom: 15px; }
                h3 { color: #667eea; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
                .stat-box { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9; }
                .slot { margin: 15px 0; padding: 15px; border-left: 3px solid #1a1a1a; background: #f9f9f9; }
                .slot.attended { border-left-color: #2d3748; background: #f7fafc; }
                .slot.absent { border-left-color: #8b4513; background: #fef5f5; }
                .slot.free { border-left-color: #9b9b9b; background: #fafafa; }
                @media print { 
                    body { margin: 0; padding: 15px; }
                    .slot { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <h1>📚 Academic Study Tracker</h1>
            <h2>${dayName}, ${currentDate.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</h2>
            <div class="stat-box"><strong>Attendance Rate:</strong> ${attendanceRate}%</div>
            <div class="stat-box"><strong>Study Hours:</strong> ${totalStudyHours.toFixed(1)}h</div>
            <div class="stat-box"><strong>Classes Attended:</strong> ${attendedClasses}/${totalScheduledClasses}</div>
            <h3>Daily Schedule</h3>
    `;
    
    schedule.forEach((slot, index) => {
        const slotData = dayData.slots?.[index] || {};
        let attendanceClass = '';
        if (slot.isFree) {
            attendanceClass = 'free';
        } else if (slotData.attendance === 'present') {
            attendanceClass = 'attended';
        } else if (slotData.attendance === 'absent') {
            attendanceClass = 'absent';
        }
        
        html += `
            <div class="slot ${attendanceClass}">
                <strong>${slot.time} - ${slot.subject}</strong>
                ${slotData.attendance ? `<br><strong>Status:</strong> ${slotData.attendance.charAt(0).toUpperCase() + slotData.attendance.slice(1)}` : '<br><strong>Status:</strong> Not marked'}
                ${slotData.topics ? `<br><strong>Topics Covered:</strong> ${slotData.topics}` : ''}
                ${slotData.labWork ? `<br><strong>Lab Work:</strong> ${slotData.labWork}` : ''}
                ${slotData.assignments ? `<br><strong>Assignments:</strong> ${slotData.assignments}` : ''}
            </div>
        `;
    });
    
    html += `
            <h3>Python & DSA Practice</h3>
            <p><strong>Python Topics:</strong> ${dayData.pythonTopics || 'N/A'}</p>
            <p><strong>Python Duration:</strong> ${dayData.pythonDuration || 0} minutes (${pythonHours.toFixed(1)} hours)</p>
            <p><strong>Python Resources:</strong> ${dayData.pythonResources || 'N/A'}</p>
            <p><strong>DSA Topics:</strong> ${dayData.dsaTopics || 'N/A'}</p>
            <p><strong>DSA Duration:</strong> ${dayData.dsaDuration || 0} minutes (${dsaHours.toFixed(1)} hours)</p>
            <p><strong>DSA Problems Solved:</strong> ${dayData.dsaProblemsCount || 0}</p>
            
            <h3>Daily Notes & Reflections</h3>
            <p><strong>Key Learnings:</strong> ${dayData.keyLearnings || 'N/A'}</p>
            <p><strong>Tomorrow's Goals:</strong> ${dayData.tomorrowGoals || 'N/A'}</p>
            <p><strong>Challenges Faced:</strong> ${dayData.challenges || 'N/A'}</p>
            
            <p style="margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 15px;">
                Generated on ${new Date().toLocaleString()} | Academic Study Tracker v2.0
            </p>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

window.clearAllData = async function () {
  if (!window.userId) {
    alert("Please login first.");
    return;
  }

  if (!confirm(
    "⚠️ WARNING: This will permanently delete ALL your study tracker data (daily entries, subject data, attendance records, etc.).\n\nThis action CANNOT be undone.\n\nAre you sure?"
  )) return;

  if (!confirm("Final confirmation: Delete ALL data?")) return;

  try {
    // 🔥 1. Delete all daily data
    const daysRef = collection(db, "users", userId, "days");
    const daysSnap = await getDocs(daysRef);

    for (const docSnap of daysSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    // 🔥 2. Delete all meta data
    const metaDocs = ["subjects", "goals", "cancelled", "todos"];

    for (const docId of metaDocs) {
      await deleteDoc(doc(db, "users", userId, "meta", docId));
    }

    // 🔄 3. Reset in-memory data
    dayData = {};
    subjectData = initializeSubjectData();
    studyGoals = {};
    cancelledData = {};
    todoData = initializeTodoData();

    // 🔄 4. Reload UI
    await loadSubjectData();
    await loadGoals();
    await loadCancelledData();
    await loadTodoData();
    await loadDay();

    renderSubjectCards();

    alert("✓ All data has been cleared successfully!");
    showSaveIndicator();

  } catch (error) {
    console.error("Error clearing data:", error);
    alert("Failed to clear data. Please try again.");
  }
};


// 🔥 Firebase save functions (cloud storage)

window.saveDayData = async function(date, data) {
  if (!window.userId) return;
  await setDoc(
    doc(db, "users", userId, "days", date),
    data
  );
}

window.saveSubjectData = async function() {
  if (!window.userId) return;
  await setDoc(
    doc(db, "users", userId, "meta", "subjects"),
    subjectData
  );
}

window.saveTodoData = async function() {
  if (!window.userId) return;
  await setDoc(
    doc(db, "users", userId, "meta", "todos"),
    todoData
  );
}

window.saveCancelledData = async function() {
  if (!window.userId) return;
  await setDoc(
    doc(db, "users", userId, "meta", "cancelled"),
    cancelledData
  );
}

window.initRecaptcha = function () {
  if (window.recaptchaVerifier) return;

  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible"
    }
  );
};

window.sendOTP = async function () {
  const phoneNumber = document.getElementById("phoneNumber").value;
  if (!phoneNumber.startsWith("+")) {
    alert("Use international format, e.g. +91XXXXXXXXXX");
    return;
  }

  initRecaptcha();

  try {
    window.confirmationResult =
      await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );

    document.getElementById("otpBox").style.display = "block";
    alert("OTP sent 📩");
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
};

window.verifyOTP = async function () {
  const code = document.getElementById("otpCode").value;

  try {
    const result = await confirmationResult.confirm(code);
    console.log("Logged in:", result.user.phoneNumber);
  } catch (err) {
    alert("Invalid OTP");
    console.error(err);
  }
};


init();






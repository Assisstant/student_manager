/**
 * Student Treatment Manager - Main Application Script
 * Електронски дневник
 */

let students = [];
let schedule = {
    monday: [[], [], [], [], []],
    tuesday: [[], [], [], [], []],
    wednesday: [[], [], [], [], []],
    thursday: [[], [], [], [], []],
    friday: [[], [], [], [], []]
};
let planTemplates = {1: [], 2: [], 3: [], 4: [], 5: [], 6: []};
let studentProgress = {};

const timeSlots = [
    { label: 'I', early: '08:00 - 08:20', late: '08:20 - 08:40' },
    { label: 'II', early: '08:45 - 09:05', late: '09:05 - 09:25' },
    { label: 'III', early: '09:40 - 10:00', late: '10:00 - 10:20' },
    { label: 'IV', early: '10:25 - 10:45', late: '10:45 - 11:05' },
    { label: 'V', early: '11:10 - 11:30', late: '11:30 - 11:50' }
];

const days = ['Пон', 'Вто', 'Сре', 'Чет', 'Пет'];
const daysEng = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

let currentSlot = null;
let editingStudentId = null;
let currentEditingPlan = null;

loadData();
renderStudents();
renderSchedule();
renderPlanTemplates();
updateStats();
updateProgressStudentList();

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'progress') updateProgressStudentList();
}

function showAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('active');
    editingStudentId = null;
    document.getElementById('studentName').value = '';
    document.getElementById('studentGrade').value = '';
    document.getElementById('studentPlanType').value = '1';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function saveStudent() {
    const name = document.getElementById('studentName').value.trim();
    const grade = document.getElementById('studentGrade').value.trim();
    const planType = document.getElementById('studentPlanType').value;
    
    if (!name || !grade) {
        alert('Ве молиме пополнете ги сите полиња');
        return;
    }
    
    if (editingStudentId) {
        const student = students.find(s => s.id === editingStudentId);
        student.name = name;
        student.grade = grade;
        student.planType = planType;
    } else {
        const student = { id: Date.now(), name, grade, planType };
        students.push(student);
        studentProgress[student.id] = {};
    }
    
    saveData();
    renderStudents();
    renderSchedule();
    updateStats();
    updateProgressStudentList();
    closeModal('addStudentModal');
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    editingStudentId = id;
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentGrade').value = student.grade;
    document.getElementById('studentPlanType').value = student.planType;
    document.getElementById('addStudentModal').classList.add('active');
}

function deleteStudent(id) {
    if (confirm('Дали сте сигурни дека сакате да го избришете овој студент?')) {
        students = students.filter(s => s.id !== id);
        delete studentProgress[id];
        Object.keys(schedule).forEach(day => {
            schedule[day].forEach((slot, idx) => {
                schedule[day][idx] = slot.filter(sid => sid !== id);
            });
        });
        saveData();
        renderStudents();
        renderSchedule();
        updateStats();
        updateProgressStudentList();
    }
}

function renderStudents() {
    const list = document.getElementById('studentList');
    list.innerHTML = '';
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card plan-color-${student.planType}`;
        card.dataset.studentId = student.id;
        card.innerHTML = `
            <div class="student-info">
                <h3>${student.grade} - ${student.name}</h3>
                <p>План: ${student.planType} | Активности: ${planTemplates[student.planType].length}</p>
            </div>
            <div class="student-actions">
                <button class="btn btn-primary btn-sm" onclick="editStudent(${student.id}); event.stopPropagation();">Измени</button>
                <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id}); event.stopPropagation();">Избриши</button>
            </div>
        `;
        card.addEventListener('click', function() {
            const isSelected = this.classList.contains('selected');
            document.querySelectorAll('.student-card').forEach(c => c.classList.remove('selected'));
            if (!isSelected) this.classList.add('selected');
        });
        list.appendChild(card);
    });
}

function renderSchedule() {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';
    grid.className = 'schedule-grid';
    
    const headerTime = document.createElement('div');
    headerTime.className = 'schedule-header';
    headerTime.textContent = 'Час';
    grid.appendChild(headerTime);
    
    days.forEach(day => {
        const headerDay = document.createElement('div');
        headerDay.className = 'schedule-header';
        headerDay.textContent = day;
        grid.appendChild(headerDay);
    });
    
    timeSlots.forEach((time, timeIdx) => {
        const timeCell = document.createElement('div');
        timeCell.className = 'schedule-time';
        timeCell.innerHTML = `<div class="time-label">${time.label}</div><div>${time.early}</div><div>${time.late}</div>`;
        grid.appendChild(timeCell);
        
        daysEng.forEach(day => {
            const studentIds = schedule[day][timeIdx];
            const cell = document.createElement('div');
            cell.className = 'schedule-cell';
            cell.dataset.day = day;
            cell.dataset.timeIdx = timeIdx;
            
            studentIds.forEach(sid => {
                const student = students.find(s => s.id === sid);
                if (student) {
                    const slot = document.createElement('div');
                    slot.className = `student-slot plan-color-${student.planType}`;
                    slot.dataset.studentId = sid;
                    slot.innerHTML = `
                        <span>${student.grade} - ${student.name}</span>
                        <button class="remove-btn" onclick="removeStudentFromSlot('${day}', ${timeIdx}, ${sid}); event.stopPropagation();">✕</button>
                    `;
                    slot.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const isActive = this.classList.contains('active');
                        document.querySelectorAll('.student-slot').forEach(s => s.classList.remove('active'));
                        if (!isActive) this.classList.add('active');
                    });
                    cell.appendChild(slot);
                }
            });
            
            cell.onclick = (e) => {
                if (e.target === cell) openScheduleModal(day, timeIdx);
            };
            grid.appendChild(cell);
        });
    });
}

function openScheduleModal(day, timeIdx) {
    currentSlot = { day, timeIdx };
    const list = document.getElementById('studentCheckboxList');
    list.innerHTML = '';
    const currentStudents = schedule[day][timeIdx];
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'student-checkbox-item';
        const isChecked = currentStudents.includes(student.id);
        item.innerHTML = `
            <input type="checkbox" id="student-${student.id}" ${isChecked ? 'checked' : ''} value="${student.id}">
            <label for="student-${student.id}">${student.grade} - ${student.name}</label>
        `;
        list.appendChild(item);
    });
    document.getElementById('scheduleModal').classList.add('active');
}

function assignStudentsToSlot() {
    if (!currentSlot) return;
    const { day, timeIdx } = currentSlot;
    const checkboxes = document.querySelectorAll('#studentCheckboxList input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    schedule[day][timeIdx] = selectedIds;
    saveData();
    renderSchedule();
    updateStats();
    closeModal('scheduleModal');
}

function removeStudentFromSlot(day, timeIdx, studentId) {
    schedule[day][timeIdx] = schedule[day][timeIdx].filter(id => id !== studentId);
    saveData();
    renderSchedule();
    updateStats();
}

function saveSchedule() {
    saveData();
    alert('Распоредот е зачуван!');
}

function clearSchedule() {
    if (confirm('Дали сте сигурни дека сакате да го избришете целиот распоред?')) {
        schedule = {
            monday: [[], [], [], [], []],
            tuesday: [[], [], [], [], []],
            wednesday: [[], [], [], [], []],
            thursday: [[], [], [], [], []],
            friday: [[], [], [], [], []]
        };
        saveData();
        renderSchedule();
        updateStats();
    }
}

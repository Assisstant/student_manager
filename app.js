// Additional Application Functions

function renderPlanTemplates() {
    const list = document.getElementById('planTemplateList');
    list.innerHTML = '';
    
    for (let i = 1; i <= 6; i++) {
        const activities = planTemplates[i];
        const section = document.createElement('div');
        section.className = 'plan-section';
        section.innerHTML = `
            <h3 style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span>План ${i} (${activities.length} активности)</span>
                <button class="btn btn-primary btn-sm" onclick="editPlan(${i})">Измени План</button>
            </h3>
        `;
        
        if (activities.length === 0) {
            section.innerHTML += '<p style="color: #718096; font-style: italic;">Нема активности во овој план</p>';
        } else {
            activities.forEach((activity, idx) => {
                const item = document.createElement('div');
                item.className = 'plan-activity';
                const activityWithLinks = convertUrlsToLinks(activity);
                item.innerHTML = `
                    <div class="plan-activity-text">${idx + 1}. ${activityWithLinks}</div>
                    <button class="btn btn-danger btn-sm" onclick="deleteActivity(${i}, ${idx})">Избриши</button>
                `;
                section.appendChild(item);
            });
        }
        list.appendChild(section);
    }
}

function convertUrlsToLinks(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

function showAddActivityModal() {
    document.getElementById('addActivityModal').classList.add('active');
    document.getElementById('activityPlanType').value = '1';
    document.getElementById('activityText').value = '';
}

function addActivity() {
    const planType = document.getElementById('activityPlanType').value;
    const text = document.getElementById('activityText').value.trim();
    if (!text) {
        alert('Ве молиме внесете активност');
        return;
    }
    planTemplates[planType].push(text);
    saveData();
    renderPlanTemplates();
    renderStudents();
    closeModal('addActivityModal');
}

function deleteActivity(planNum, idx) {
    if (confirm('Избриши ја оваа активност?')) {
        planTemplates[planNum].splice(idx, 1);
        saveData();
        renderPlanTemplates();
        renderStudents();
    }
}

function showUploadPlanModal() {
    document.getElementById('uploadPlanModal').classList.add('active');
    document.getElementById('uploadPlanType').value = '1';
    document.getElementById('uploadPlanFile').value = '';
}

function uploadPlanFile() {
    const planType = document.getElementById('uploadPlanType').value;
    const fileInput = document.getElementById('uploadPlanFile');
    if (!fileInput.files.length) {
        alert('Ве молиме изберете датотека');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const activities = [];
            jsonData.forEach(row => {
                if (row.length > 1 && row[1] && typeof row[1] === 'string') {
                    activities.push(row[1].trim());
                }
            });
            if (activities.length === 0) {
                alert('Не се пронајдени активности во датотеката');
                return;
            }
            planTemplates[planType] = activities;
            saveData();
            renderPlanTemplates();
            renderStudents();
            closeModal('uploadPlanModal');
            alert(`Успешно вчитани ${activities.length} активности во План ${planType}`);
        } catch (error) {
            alert('Грешка при вчитување на датофиката: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function showCreatePlanModal() {
    document.getElementById('createPlanModal').classList.add('active');
    document.getElementById('createPlanType').value = '1';
    document.getElementById('createPlanActivities').value = '';
}

function createPlan() {
    const planType = document.getElementById('createPlanType').value;
    const activitiesText = document.getElementById('createPlanActivities').value.trim();
    if (!activitiesText) {
        alert('Ве молиме внесете активности');
        return;
    }
    const activities = activitiesText.split('\n').map(a => a.trim()).filter(a => a.length > 0);
    planTemplates[planType] = activities;
    saveData();
    renderPlanTemplates();
    renderStudents();
    closeModal('createPlanModal');
    alert(`Успешно креиран План ${planType} со ${activities.length} активности`);
}

function editPlan(planNumber) {
    currentEditingPlan = planNumber;
    document.getElementById('editPlanNumber').textContent = planNumber;
    document.getElementById('editPlanActivities').value = planTemplates[planNumber].join('\n');
    document.getElementById('editPlanModal').classList.add('active');
}

function savePlanEdit() {
    if (!currentEditingPlan) return;
    const activitiesText = document.getElementById('editPlanActivities').value.trim();
    const activities = activitiesText.split('\n').map(a => a.trim()).filter(a => a.length > 0);
    planTemplates[currentEditingPlan] = activities;
    saveData();
    renderPlanTemplates();
    renderStudents();
    closeModal('editPlanModal');
    alert(`План ${currentEditingPlan} е успешно ажуриран`);
}

function deletePlan() {
    if (!currentEditingPlan) return;
    if (confirm(`Дали сте сигурни дека сакате да го избришете План ${currentEditingPlan}?`)) {
        planTemplates[currentEditingPlan] = [];
        saveData();
        renderPlanTemplates();
        renderStudents();
        closeModal('editPlanModal');
        alert(`План ${currentEditingPlan} е избришан`);
    }
}

function switchProgressView(view) {
    if (view === 'individual') {
        document.getElementById('individualProgressView').style.display = 'block';
        document.getElementById('monthlyProgressView').style.display = 'none';
    } else {
        document.getElementById('individualProgressView').style.display = 'none';
        document.getElementById('monthlyProgressView').style.display = 'block';
        loadMonthlyProgress();
    }
}

function updateProgressStudentList() {
    const select = document.getElementById('progressStudentSelect');
    select.innerHTML = '<option value="">-- Избери студент --</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.grade} - ${student.name}`;
        select.appendChild(option);
    });
}

function loadStudentProgress() {
    const studentId = document.getElementById('progressStudentSelect').value;
    const container = document.getElementById('progressContainer');
    container.innerHTML = '';
    if (!studentId) return;
    const student = students.find(s => s.id === parseInt(studentId));
    if (!student) return;
    const activities = planTemplates[student.planType];
    if (activities.length === 0) {
        container.innerHTML = '<p>Нема активности за овој студент</p>';
        return;
    }
    const progress = studentProgress[studentId] || {};
    activities.forEach((activity, idx) => {
        const activityProgress = progress[idx] || { completed: false, date: '', time: '' };
        const item = document.createElement('div');
        item.className = 'activity-item';
        const activityWithLinks = convertUrlsToLinks(activity);
        item.innerHTML = `
            <input type="checkbox" class="activity-checkbox" ${activityProgress.completed ? 'checked' : ''} 
                onchange="toggleActivityProgress(${studentId}, ${idx}, this.checked)">
            <div class="activity-details">
                <div class="activity-text">${idx + 1}. ${activityWithLinks}</div>
                ${activityProgress.completed ? `
                    <div class="activity-timestamp">Завршено на: ${activityProgress.date} ${activityProgress.time}</div>
                ` : `
                    <div class="activity-timestamp">Не е завршено</div>
                    <div style="display: flex; gap: 10px; margin-top: 8px;">
                        <input type="date" class="timestamp-selector" style="flex: 1;" 
                            onchange="setActivityDate(${studentId}, ${idx}, this.value)" 
                            placeholder="Избери датум">
                        <select class="timestamp-selector" style="flex: 1;" onchange="setActivityTime(${studentId}, ${idx}, this.value)">
                            <option value="">-- Избери време --</option>
                            <option value="08:00 - 08:20">08:00 - 08:20</option>
                            <option value="08:20 - 08:40">08:20 - 08:40</option>
                            <option value="08:45 - 09:05">08:45 - 09:05</option>
                            <option value="09:05 - 09:25">09:05 - 09:25</option>
                            <option value="09:40 - 10:00">09:40 - 10:00</option>
                            <option value="10:00 - 10:20">10:00 - 10:20</option>
                            <option value="10:25 - 10:45">10:25 - 10:45</option>
                            <option value="10:45 - 11:05">10:45 - 11:05</option>
                            <option value="11:10 - 11:30">11:10 - 11:30</option>
                            <option value="11:30 - 11:50">11:30 - 11:50</option>
                        </select>
                    </div>
                `}
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleActivityProgress(studentId, activityIndex, completed) {
    if (!studentProgress[studentId]) studentProgress[studentId] = {};
    if (completed) {
        studentProgress[studentId][activityIndex] = {
            completed: true,
            date: new Date().toLocaleDateString('mk-MK'),
            time: ''
        };
    } else {
        delete studentProgress[studentId][activityIndex];
    }
    saveData();
    loadStudentProgress();
}

function setActivityDate(studentId, activityIndex, dateValue) {
    if (!dateValue) return;
    if (!studentProgress[studentId]) studentProgress[studentId] = {};
    if (!studentProgress[studentId][activityIndex]) {
        studentProgress[studentId][activityIndex] = { completed: false, date: '', time: '' };
    }
    const [year, month, day] = dateValue.split('-');
    studentProgress[studentId][activityIndex].date = `${day}.${month}.${year}`;
    saveData();
}

function setActivityTime(studentId, activityIndex, time) {
    if (!time) return;
    if (!studentProgress[studentId]) studentProgress[studentId] = {};
    if (!studentProgress[studentId][activityIndex]) {
        studentProgress[studentId][activityIndex] = { completed: false, date: '', time: '' };
    }
    studentProgress[studentId][activityIndex].time = time;
    if (studentProgress[studentId][activityIndex].date && time) {
        studentProgress[studentId][activityIndex].completed = true;
    }
    saveData();
    loadStudentProgress();
}

function loadMonthlyProgress() {
    const monthInput = document.getElementById('monthSelector');
    let monthValue = monthInput.value;
    if (!monthValue) {
        const now = new Date();
        monthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthInput.value = monthValue;
    }
    const [year, month] = monthValue.split('-').map(Number);
    const container = document.getElementById('monthlyContainer');
    container.innerHTML = '';
    students.forEach(student => {
        const progress = studentProgress[student.id] || {};
        const activities = planTemplates[student.planType];
        const completedInMonth = [];
        Object.keys(progress).forEach(idx => {
            const activityProgress = progress[idx];
            if (!activityProgress.date) return;
            const [day, monthStr, yearStr] = activityProgress.date.split('.');
            const activityMonth = parseInt(monthStr);
            const activityYear = parseInt(yearStr);
            if (activityMonth === month && activityYear === year) {
                completedInMonth.push({
                    index: parseInt(idx),
                    text: activities[idx],
                    date: activityProgress.date,
                    time: activityProgress.time
                });
            }
        });
        completedInMonth.sort((a, b) => {
            const [dayA, monthA, yearA] = a.date.split('.').map(Number);
            const [dayB, monthB, yearB] = b.date.split('.').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateA - dateB;
        });
        const section = document.createElement('div');
        section.className = `monthly-student-section plan-color-${student.planType}`;
        const totalCount = activities.length;
        const completedCount = completedInMonth.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        section.innerHTML = `
            <h3 style="margin-bottom: 10px;">${student.grade} - ${student.name}</h3>
            <div class="progress-container">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${completedCount}/${totalCount} активности</span>
                    <span>${percentage}%</span>
                </div>
                <div style="background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="background: #48bb78; height: 100%; width: ${percentage}%;"></div>
                </div>
            </div>
        `;
        if (completedInMonth.length > 0) {
            const listContainer = document.createElement('div');
            listContainer.className = 'monthly-activity-list';
            completedInMonth.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'monthly-activity-item';
                const activityWithLinks = convertUrlsToLinks(activity.text);
                item.innerHTML = `
                    <div class="monthly-activity-text">${activity.index + 1}. ${activityWithLinks}</div>
                    <div class="monthly-activity-time">${activity.date} ${activity.time}</div>
                `;
                listContainer.appendChild(item);
            });
            section.appendChild(listContainer);
        } else {
            const noActivities = document.createElement('p');
            noActivities.style.cssText = 'color: #718096; font-style: italic; margin-top: 10px;';
            noActivities.textContent = 'Нема завршени активности за овој месец';
            section.appendChild(noActivities);
        }
        container.appendChild(section);
    });
}

function exportData() {
    const data = {students, schedule, planTemplates, studentProgress};
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'student_treatment_data.json';
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.students) students = data.students;
            if (data.schedule) schedule = data.schedule;
            if (data.planTemplates) planTemplates = data.planTemplates;
            if (data.studentProgress) studentProgress = data.studentProgress;
            saveData();
            renderStudents();
            renderSchedule();
            renderPlanTemplates();
            updateStats();
            updateProgressStudentList();
            alert('Податоците се успешно вчитани!');
        } catch (error) {
            alert('Грешка при вчитување на податоците: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function generateScheduleReport() {
    let report = 'Неделен Распоред - Кабинет за слух, говор, глас, алтернатива и аугментативна комуникација\n\n';
    daysEng.forEach((day, dayIdx) => {
        report += `${days[dayIdx]}\n${'='.repeat(30)}\n`;
        let hasSessions = false;
        timeSlots.forEach((time, timeIdx) => {
            const studentIds = schedule[day][timeIdx];
            if (studentIds.length > 0) {
                hasSessions = true;
                report += `${time.label} (${time.early} / ${time.late}):\n`;
                studentIds.forEach(sid => {
                    const student = students.find(s => s.id === sid);
                    if (student) report += `  - ${student.grade} - ${student.name}\n`;
                });
            }
        });
        if (!hasSessions) report += 'Нема закажани сесии\n';
        report += '\n';
    });
    downloadReport(report, 'schedule_report.txt');
}

function generateProgressReport() {
    let report = 'Извештај за Напредок - Кабинет за слух, говор, глас, алтернатива и аугментативна комуникација\n\n';
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    report += `Месец: ${month}/${year}\n\n`;
    students.forEach(student => {
        const progress = studentProgress[student.id] || {};
        const activities = planTemplates[student.planType];
        const completedCount = Object.keys(progress).length;
        const totalCount = activities.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        report += `${student.grade} - ${student.name}\nЗавршени активности: ${completedCount}/${totalCount} (${percentage}%)\n`;
        if (completedCount > 0) {
            report += 'Завршени активности:\n';
            Object.keys(progress).forEach(idx => {
                const activityProgress = progress[idx];
                report += `  - ${activities[idx]} (${activityProgress.date} ${activityProgress.time})\n`;
            });
        }
        report += '\n';
    });
    downloadReport(report, 'progress_report.txt');
}

function downloadReport(content, filename) {
    const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function updateStats() {
    document.getElementById('totalStudents').textContent = students.length;
    let totalSessions = 0;
    Object.values(schedule).forEach(day => {
        day.forEach(slot => {
            totalSessions += slot.length;
        });
    });
    document.getElementById('totalSessions').textContent = totalSessions;
}

function saveData() {
    const data = {students, schedule, planTemplates, studentProgress};
    localStorage.setItem('studentTreatmentData', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('studentTreatmentData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.students) students = data.students;
            if (data.schedule) schedule = data.schedule;
            if (data.planTemplates) planTemplates = data.planTemplates;
            if (data.studentProgress) studentProgress = data.studentProgress;
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
}

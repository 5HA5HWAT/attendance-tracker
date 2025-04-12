const scheduleData = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
};

// List of all subjects
const allSubjects = ['sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6'];

// Initialize the schedule table
function initScheduleTable() {
    const tbody = document.getElementById('scheduleTable');
    
    allSubjects.forEach(subject => {
        const row = document.createElement('tr');
        row.className = 'subject-row';
        
        // Subject name cell
        const subjectCell = document.createElement('td');
        subjectCell.className = 'fw-bold';
        subjectCell.textContent = subject;
        
        row.appendChild(subjectCell);

        // Create checkbox cells for each day
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
            const cell = document.createElement('td');
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check d-flex justify-content-center';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.checked = scheduleData[day].includes(subject);
            checkbox.style.transform = 'scale(1.5)';
            
            checkbox.addEventListener('change', () => updateSchedule(day, subject, checkbox.checked));
            
            checkboxDiv.appendChild(checkbox);
            cell.appendChild(checkboxDiv);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

// Update schedule data
function updateSchedule(day, subject, isChecked) {
    if (isChecked) {
        if (!scheduleData[day].includes(subject)) {
            scheduleData[day].push(subject);
        }
    } else {
        const index = scheduleData[day].indexOf(subject);
        if (index > -1) {
            scheduleData[day].splice(index, 1);
        }
    }
}
initScheduleTable();
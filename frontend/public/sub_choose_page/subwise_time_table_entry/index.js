const scheduleData = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
};

// Get token from localStorage
const token = localStorage.getItem('token');

// If no token, redirect to login
if (!token) {
    window.location.href = '../../new_signin_signup/index.html';
}

// Get all subject names from the API
async function getSubjects() {
    try {
        // First try to get subjects from API
        const response = await fetch('/api/v1/user/subjects', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.subjects && Array.isArray(data.subjects)) {
                console.log(`Successfully loaded ${data.subjects.length} subjects from API`);
                return data.subjects.map(subject => subject.name);
            }
        }
        
        // Fallback to localStorage if API fails
        console.log('Falling back to localStorage for subjects');
        return getSubjectsFromLocalStorage();
        
    } catch (error) {
        console.error('Error getting subjects:', error);
        return getSubjectsFromLocalStorage();
    }
}

// Fallback: Get subjects from localStorage
function getSubjectsFromLocalStorage() {
    const userInfo = parseToken(token);
    if (!userInfo || !userInfo.id) return [];
    
    try {
        const subjects = JSON.parse(localStorage.getItem(`subjects_${userInfo.id}`)) || [];
        console.log(`Loaded ${subjects.length} subjects from localStorage:`, subjects);
        return subjects;
    } catch (error) {
        console.error('Error parsing subjects from localStorage:', error);
        return [];
    }
}

// Initialize the schedule table
async function initScheduleTable() {
    const tbody = document.getElementById('scheduleTable');
    
    try {
        // Show loading message
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2">Loading your schedule...</p></td></tr>';
        
        // Try to load existing schedule data
        await loadExistingSchedule();
        
        // Get subjects from API or localStorage
        const subjects = await getSubjects();
        console.log(`Loaded ${subjects.length} subjects for schedule table`);
        
        if (!subjects || subjects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No subjects found. Please add subjects first.</td></tr>';
            // Disable buttons if no subjects
            const btns = document.querySelectorAll('.gradient-btn');
            btns.forEach(btn => btn.disabled = true);
            return;
        }
        
        // Clear existing table content
        tbody.innerHTML = '';
        
        // Make sure all subjects are listed in the table
        subjects.forEach(subject => {
            const row = document.createElement('tr');
            row.className = 'subject-row fade-in';
            
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
                checkbox.id = `${subject}-${day}`;
                
                checkbox.addEventListener('change', () => updateSchedule(day, subject, checkbox.checked));
                
                checkboxDiv.appendChild(checkbox);
                cell.appendChild(checkboxDiv);
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
        
        // Enable save buttons
        const btns = document.querySelectorAll('.gradient-btn');
        btns.forEach(btn => btn.disabled = false);
        
        console.log('Schedule table initialized successfully with', subjects.length, 'subjects');
    } catch (error) {
        console.error('Error initializing schedule table:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Failed to load subjects. Please try again.</td></tr>';
    }
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

// Load existing schedule from API
async function loadExistingSchedule() {
    try {
        console.log('Fetching schedule from API...');
        const response = await fetch('/api/v1/user/schedule', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`API returned error status: ${response.status}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.hasSchedule && data.schedule && data.schedule.subjects) {
            console.log('Schedule found with', data.schedule.subjects.length, 'entries');
            
            // Clear existing schedule data
            Object.keys(scheduleData).forEach(day => {
                scheduleData[day] = [];
            });
            
            // Convert API schedule format to our local format
            data.schedule.subjects.forEach(item => {
                if (item.subjectId && item.days) {
                    const subjectName = item.subjectId.name || 'Unknown Subject';
                    
                    item.days.forEach(day => {
                        if (!scheduleData[day].includes(subjectName)) {
                            scheduleData[day].push(subjectName);
                        }
                    });
                }
            });
            
            console.log('Schedule data loaded:', scheduleData);
        } else {
            console.log('No existing schedule found');
        }
    } catch (error) {
        console.error('Error loading schedule from API:', error);
    }
}

// Initialize the page
(async function init() {
    try {
        await loadExistingSchedule();
        await initScheduleTable();
        
        // Setup event listeners for buttons
        document.getElementById('saveBtn').addEventListener('click', saveSchedule);
        document.getElementById('finishBtn').addEventListener('click', saveSchedule);
    } catch (error) {
        console.error('Initialization error:', error);
    }
})();

// Handle save schedule button
async function saveSchedule(event) {
    try {
        console.log("Saving schedule...");
        // Determine which button was clicked
        const isFinishButton = event.target.id === 'finishBtn';
        const buttonId = isFinishButton ? 'finishBtn' : 'saveBtn';
        
        // Get the button that was clicked
        const clickedButton = document.getElementById(buttonId);
        const originalText = clickedButton.textContent;
        
        // Disable all buttons to prevent double submission
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('finishBtn').disabled = true;
        
        // Update the clicked button to show saving state
        clickedButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
        
        const defaultStartTime = "9:00 AM";
        const defaultEndTime = "10:00 AM";
        
        // Get all subjects
        const subjects = await getSubjects();
        
        // Prepare schedule data
        const scheduleItems = [];
        
        // For each subject, check which days are selected
        subjects.forEach(subject => {
            const days = [];
            
            // Check each day for this subject
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
                if (scheduleData[day].includes(subject)) {
                    days.push(day);
                }
            });
            
            // Only add subjects that have at least one day selected
            if (days.length > 0) {
                scheduleItems.push({
                    subjectId: subject,
                    days: days,
                    startTime: defaultStartTime,
                    endTime: defaultEndTime
                });
            }
        });
        
        console.log("Schedule data to save:", scheduleItems);
        
        // Send to API
        const response = await fetch('/api/v1/user/schedule', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subjects: scheduleItems
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save schedule: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Schedule saved successfully:", result);
        
        // If this is the finish button, redirect immediately
        if (isFinishButton) {
            window.location.href = '../../dashboard/dashboard.html';
            return;
        }
        
        // Otherwise show success message
        alert('Schedule saved successfully!');
        
        // Reset button states
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('finishBtn').disabled = false;
        clickedButton.textContent = originalText;
        
    } catch (error) {
        console.error('Error saving schedule:', error);
        
        // Show error alert
        alert(`Failed to save schedule: ${error.message}`);
        
        // Reset button states
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('finishBtn').disabled = false;
        document.getElementById('saveBtn').textContent = 'Save Schedule';
        document.getElementById('finishBtn').textContent = 'Finish Setup';
    }
}
const token = localStorage.getItem('token');
const subjectBlocksContainer = document.getElementById('subjectBlocksContainer');
const submitButton = document.getElementById('submitBtn');
const settingBtn = document.getElementById('settingBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultContainer = document.getElementById('resultContainer');
const resultMessage = document.getElementById('resultMessage');

// New variables for tracking attendance state
let hasExistingAttendance = false;
let attendanceId = null;
let originalStatuses = {};
let hasChanges = false;

// Initialize Date object
const today = new Date();
const dateFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const formattedDate = today.toLocaleDateString('en-US', dateFormatOptions);
document.getElementById('currentDate').textContent = formattedDate;

// Parse JWT token to get user info
function parseToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}

// Fetch today's data including subjects and existing attendance if any
async function fetchTodayData() {
  loadingSpinner.classList.remove('d-none');
  submitButton.disabled = true;
  subjectBlocksContainer.innerHTML = '';

  try {
    const response = await fetch('/api/v1/user/attendance/today', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    
    // Get subjects from data structure
    let subjects = [];
    let records = [];
    
    if (data.hasAttendance && data.attendance && data.attendance.records) {
      // Use the attendance records if available
      records = data.attendance.records.map(record => ({
        subjectId: record.subject,
        status: record.status === 'Present' ? 'present' : 
                record.status === 'Absent' ? 'absent' : 'noclass'
      }));
      
      // Extract subject names from the records
      subjects = records.map(record => ({
        _id: record.subjectId,
        name: record.subjectId
      }));
      
      hasExistingAttendance = true;
      
      // Show notification about existing attendance
      const notificationEl = document.createElement('div');
      notificationEl.className = 'alert alert-info mb-3';
      notificationEl.innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
        You have already marked your attendance for today. Any changes you make will update your previous selections.
      `;
      subjectBlocksContainer.appendChild(notificationEl);
    } else if (data.records) {
      // Extract subjects and default status from records
      subjects = data.records.map(record => ({
        _id: record.subject,
        name: record.subject
      }));
      
      records = data.records.map(record => ({
        subjectId: record.subject,
        status: record.status === 'Present' ? 'present' : 
                record.status === 'Absent' ? 'absent' : 
                record.status === 'No Class Today' ? 'noclass' : null
      }));
    }
    
    // Store original statuses for comparison
    records.forEach(record => {
      originalStatuses[record.subjectId] = record.status;
    });

    // Create subject blocks with attendance options
    createSubjectBlocks(subjects, records);
    
    submitButton.disabled = !hasChanges;
  } catch (error) {
    console.error('Error fetching data:', error);
    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-danger';
    errorEl.textContent = 'Failed to load subjects. Please try again later.';
    subjectBlocksContainer.appendChild(errorEl);
  } finally {
    loadingSpinner.classList.add('d-none');
  }
}

// Create subject blocks with radio buttons for attendance status
function createSubjectBlocks(subjects, records) {
  if (subjects.length === 0) {
    const noSubjectsEl = document.createElement('div');
    noSubjectsEl.className = 'alert alert-warning';
    noSubjectsEl.textContent = 'You have not added any subjects yet. Please go to settings to add subjects.';
    subjectBlocksContainer.appendChild(noSubjectsEl);
    return;
  }

  subjects.forEach(subject => {
    const subjectBlock = document.createElement('div');
    subjectBlock.className = 'subject-block mb-3';
    subjectBlock.dataset.subjectId = subject._id;

    // Find existing record for this subject if any
    const record = records.find(r => r.subjectId === subject._id) || { status: null };
    
    let statusBadge = '';
    if (record.status) {
      const badgeClass = record.status === 'present' ? 'bg-success' : 
                        record.status === 'absent' ? 'bg-danger' : 'bg-warning';
      const badgeIcon = record.status === 'present' ? 'bi-check-circle' : 
                       record.status === 'absent' ? 'bi-x-circle' : 'bi-dash-circle';
      const badgeText = record.status === 'present' ? 'Present' : 
                       record.status === 'absent' ? 'Absent' : 'No Class';
      
      statusBadge = `
        <span class="status-badge badge ${badgeClass} position-absolute top-0 end-0 m-2">
          <i class="bi ${badgeIcon}"></i> ${badgeText}
        </span>
      `;
    }

    subjectBlock.innerHTML = `
      <div class="subject-title">${subject.name}</div>
      ${statusBadge}
      <div class="form-check form-check-inline">
        <input class="form-check-input status-radio" type="radio" name="status-${subject._id}" id="present-${subject._id}" value="present" ${record.status === 'present' ? 'checked' : ''}>
        <label class="form-check-label" for="present-${subject._id}">Present</label>
      </div>
      <div class="form-check form-check-inline">
        <input class="form-check-input status-radio" type="radio" name="status-${subject._id}" id="absent-${subject._id}" value="absent" ${record.status === 'absent' ? 'checked' : ''}>
        <label class="form-check-label" for="absent-${subject._id}">Absent</label>
      </div>
      <div class="form-check form-check-inline">
        <input class="form-check-input status-radio" type="radio" name="status-${subject._id}" id="noclass-${subject._id}" value="noclass" ${record.status === 'noclass' ? 'checked' : ''}>
        <label class="form-check-label" for="noclass-${subject._id}">No Class Today</label>
      </div>
      <div class="status-change-alert mt-1 d-none">
        <i class="bi bi-exclamation-triangle"></i> You are changing your previous status
      </div>
    `;

    subjectBlocksContainer.appendChild(subjectBlock);
    
    // Add event listeners to all radio buttons in this subject block
    const radios = subjectBlock.querySelectorAll('.status-radio');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const subjectId = subjectBlock.dataset.subjectId;
        const newStatus = e.target.value;
        const originalStatus = originalStatuses[subjectId];
        const changeAlert = subjectBlock.querySelector('.status-change-alert');
        
        // If changing from an existing status, show change alert
        if (originalStatus && newStatus !== originalStatus) {
          changeAlert.classList.remove('d-none');
          subjectBlock.classList.add('changed');
        } else {
          changeAlert.classList.add('d-none');
          subjectBlock.classList.remove('changed');
        }
        
        // Enable submit button if any changes are made
        checkForChanges();
      });
    });
  });
}

// Check if any attendance statuses have been changed
function checkForChanges() {
  const subjectBlocks = document.querySelectorAll('.subject-block');
  hasChanges = false;
  
  subjectBlocks.forEach(block => {
    const subjectId = block.dataset.subjectId;
    const checkedRadio = block.querySelector('.status-radio:checked');
    
    if (checkedRadio) {
      const currentStatus = checkedRadio.value;
      const originalStatus = originalStatuses[subjectId];
      
      // If new selection or status change, we have changes
      if (!originalStatus || currentStatus !== originalStatus) {
        hasChanges = true;
      }
    }
  });
  
  submitButton.disabled = !hasChanges;
  
  // Change button text based on whether this is a new submission or update
  if (hasExistingAttendance) {
    submitButton.textContent = 'Update Attendance';
    submitButton.classList.add('btn-update');
  } else {
    submitButton.textContent = 'Submit Attendance';
    submitButton.classList.remove('btn-update');
  }
}

// Submit attendance for all subjects
async function submitAttendance(event) {
  event.preventDefault();
  loadingSpinner.classList.remove('d-none');
  submitButton.disabled = true;
  resultContainer.classList.add('d-none');

  try {
    const subjectBlocks = document.querySelectorAll('.subject-block');
    const records = [];

    subjectBlocks.forEach(block => {
      const subject = block.dataset.subjectId;
      const selectedRadio = block.querySelector('.status-radio:checked');
      
      if (selectedRadio) {
        const radioValue = selectedRadio.value;
        
        // Convert to backend expected format
        const status = radioValue === 'present' ? 'Present' : 
                      radioValue === 'absent' ? 'Absent' : 'No Class Today';
        
        records.push({ subject, status });
      }
    });

    if (records.length === 0) {
      throw new Error('Please select status for at least one subject');
    }
    
    // Get current date and day of week
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[today.getDay()];
    
    // Prepare data for submission
    const attendanceData = {
      date: today.toISOString(),
      dayOfWeek,
      records
    };

    const response = await fetch('/api/v1/user/attendance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attendanceData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit attendance');
    }

    const responseData = await response.json();
    
    // Show success message
    resultContainer.classList.remove('d-none', 'alert-danger');
    resultContainer.classList.add('alert-success');
    
    // Update message based on whether this was a new submission or an update
    if (hasExistingAttendance) {
      resultMessage.textContent = 'Your attendance has been updated successfully!';
    } else {
      resultMessage.textContent = 'Your attendance has been submitted successfully!';
    }
    
    // Update state to reflect that we now have attendance for today
    hasExistingAttendance = true;
    
    // Refresh the data to show updated status
    setTimeout(() => {
      fetchTodayData();
    }, 2000);
  } catch (error) {
    console.error('Error submitting attendance:', error);
    resultContainer.classList.remove('d-none', 'alert-success');
    resultContainer.classList.add('alert-danger');
    resultMessage.textContent = error.message || 'Something went wrong. Please try again.';
  } finally {
    loadingSpinner.classList.add('d-none');
    submitButton.disabled = false;
    
    // Scroll to result message
    resultContainer.scrollIntoView({ behavior: 'smooth' });
  }
}

// Handler for settings button
function gotoSettings() {
  window.location.href = '../subjects_page/';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  fetchTodayData();
  submitButton.addEventListener('click', submitAttendance);
  settingBtn.addEventListener('click', gotoSettings);
});

// If no token, redirect to login
if (!token) {
  window.location.href = '../';
}
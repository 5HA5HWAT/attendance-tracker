async function generateSubjectInputs() {
    // Get previously saved subjects (now includes full objects with IDs)
    const savedSubjects = await getSavedSubjects();
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';
    
    // Get count from dropdown
    const numSubjectsSelect = document.getElementById('numSubjects');
    
    // If we have saved subjects, set the dropdown value to match it
    if (savedSubjects && savedSubjects.length > 0) {
      // Update the dropdown to show the actual number of subjects
      numSubjectsSelect.value = Math.min(savedSubjects.length, 10).toString();
      const count = savedSubjects.length;
      
      // Generate input fields for all saved subjects
      for (let i = 0; i < count; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-floating mb-3 fade-in';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.id = `subject${i+1}`;
        input.name = `subject${i+1}`;
        input.placeholder = `Subject ${i+1}`;
        input.required = true;
        input.setAttribute("autocomplete", "off");
        
        // Store the subject ID and original name for tracking changes
        if (savedSubjects[i]._id) {
          input.dataset.subjectId = savedSubjects[i]._id;
          input.dataset.originalName = savedSubjects[i].name;
        }
        
        // Pre-fill with saved value
        input.value = savedSubjects[i].name;
        
        // Add visual feedback when subject name is changed
        input.addEventListener('input', function() {
          if (this.dataset.originalName && this.value !== this.dataset.originalName) {
            this.classList.add('border-warning');
          } else {
            this.classList.remove('border-warning');
          }
        });

        const label = document.createElement('label');
        label.setAttribute('for', `subject${i+1}`);
        label.textContent = `Subject ${i+1}`;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
      }
    } else {
      // No saved subjects, use the dropdown value
      const count = parseInt(numSubjectsSelect.value);
      
      for (let i = 1; i <= count; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-floating mb-3 fade-in';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.id = `subject${i}`;
        input.name = `subject${i}`;
        input.placeholder = `Subject ${i}`;
        input.required = true;
        input.setAttribute("autocomplete", "off");

        const label = document.createElement('label');
        label.setAttribute('for', `subject${i}`);
        label.textContent = `Subject ${i}`;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
      }
    }
  }

// Fetch all subjects directly from API with full details
async function fetchAllSubjectsFromAPI() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return [];
    
    console.log("Fetching all subjects from API with full details...");
    const response = await fetch('/api/v1/user/subjects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.subjects && Array.isArray(data.subjects)) {
        console.log(`Successfully fetched ${data.subjects.length} subjects with IDs from API`);
        return data.subjects;
      }
    }
    
    console.error("Failed to fetch subjects from API");
    return [];
  } catch (error) {
    console.error("Error fetching subjects from API:", error);
    return [];
  }
}

// Helper function to get saved subjects
async function getSavedSubjects() {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) return null;
    
    // Extract user ID from token
    const userInfo = parseToken(token);
    if (!userInfo || !userInfo.id) return null;
    
    // Try to fetch subjects from API first
    try {
      console.log("Fetching subjects from API...");
      const response = await fetch('/api/v1/user/subjects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.subjects && Array.isArray(data.subjects)) {
          const subjects = data.subjects;
          console.log(`Successfully fetched ${subjects.length} subjects from API:`, subjects);
          
          // Save just the names to localStorage as backup
          const subjectNames = subjects.map(subject => subject.name);
          saveSubjectsToLocalStorage(token, subjectNames);
          
          // Return the full subject objects including IDs
          return subjects;
        }
      } else {
        console.error(`API returned error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching subjects from API:', error);
      // Fall back to localStorage if API fails
    }
    
    // Fall back to localStorage if API fetch fails or returns invalid data
    console.log("Falling back to localStorage for subjects");
    const subjectsJson = localStorage.getItem(`subjects_${userInfo.id}`);
    if (subjectsJson) {
      // Convert simple name array to object array format
      const nameArray = JSON.parse(subjectsJson);
      return nameArray.map(name => ({ name }));
    }
    return null;
  } catch (error) {
    console.error('Error getting saved subjects:', error);
    return null;
  }
}

// Helper function to parse JWT token
function parseToken(token) {
    try {
        // Extract payload from JWT token (middle part between dots)
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

// Helper function to save subjects to localStorage with user-specific key
function saveSubjectsToLocalStorage(token, subjects) {
    try {
        // Extract user ID from token
        const userInfo = parseToken(token);
        if (!userInfo || !userInfo.id) {
            console.error('Could not extract user ID from token');
            return;
        }
        
        // Save with user-specific key
        localStorage.setItem(`subjects_${userInfo.id}`, JSON.stringify(subjects));
    } catch (error) {
        console.error('Error saving subjects to localStorage:', error);
    }
}

// Create each subject via API with retry logic
async function createSubjectWithRetry(token, subjectName, maxRetries = 2) {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Attempting to create subject: ${subjectName} (attempt ${retries + 1})`);
      
      const response = await fetch('/api/v1/user/subjects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: subjectName })
      });
      
      // Even if we get a 200 (already exists) or 201 (created), consider it success
      if (response.ok) {
        const data = await response.json();
        console.log(`Subject ${subjectName} processed:`, data);
        return data;
      }
      
      // For 400 errors, don't retry (client error)
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Bad request for ${subjectName}:`, errorData);
        throw new Error(`Failed to create subject: ${subjectName} (Status: ${response.status})`);
      }
      
      // For other errors, retry
      const errorData = await response.json().catch(() => ({}));
      console.error(`Server error for ${subjectName}:`, response.status, errorData);
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      retries++;
      
    } catch (error) {
      if (retries >= maxRetries) {
        console.error(`All retry attempts failed for ${subjectName}:`, error);
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      retries++;
    }
  }
  
  throw new Error(`Failed to create subject after ${maxRetries} retries: ${subjectName}`);
}

// Handle form submission with better rename handling
document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('scheduleForm');
  const numSubjectsSelect = document.getElementById('numSubjects');
  
  try {
    // Show loading indicator while fetching subjects
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '<div class="text-center my-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading your subjects...</p></div>';
    
    // Generate subject inputs when dropdown changes
    numSubjectsSelect.addEventListener('change', async function() {
      await generateSubjectInputs();
    });
    
    // Trigger the initial load of subjects
    await generateSubjectInputs();
  } catch (error) {
    console.error('Error initializing form:', error);
    alert('There was an error loading your subjects. Please try again later.');
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        window.location.href = '../new_signin_signup/index.html';
        return;
      }
      
      // Get all subject inputs
      const subjectInputs = document.querySelectorAll('input[id^="subject"]');
      const newSubjects = [];
      const renamedSubjects = [];
      const allSubjects = [];  // Collect all subject names for localStorage
      
      for (const input of subjectInputs) {
        if (input.value.trim()) {
          const subjectValue = input.value.trim();
          allSubjects.push(subjectValue);
          
          // Check if this is a renamed subject
          if (input.dataset.subjectId && input.dataset.originalName && 
              subjectValue !== input.dataset.originalName) {
            console.log(`Subject rename detected: ${input.dataset.originalName} -> ${subjectValue}`);
            renamedSubjects.push({
              id: input.dataset.subjectId,
              oldName: input.dataset.originalName,
              newName: subjectValue
            });
          } 
          // If it doesn't have an ID or it's a new subject
          else if (!input.dataset.subjectId) {
            newSubjects.push(subjectValue);
          }
        }
      }
      
      console.log(`Processing ${renamedSubjects.length} renamed subjects and ${newSubjects.length} new subjects`);
      
      // Process renamed subjects first - need to delete and recreate
      if (renamedSubjects.length > 0) {
        for (const rename of renamedSubjects) {
          // First delete the old subject
          const deleteResponse = await fetch(`/api/v1/user/subjects/${rename.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!deleteResponse.ok) {
            console.error(`Failed to delete subject ${rename.oldName} for rename`);
          }
          
          // Then create the new one
          await createSubjectWithRetry(token, rename.newName);
        }
      }
      
      // Process new subjects
      if (newSubjects.length > 0) {
        const creationPromises = newSubjects.map(name => 
          createSubjectWithRetry(token, name)
        );
        await Promise.all(creationPromises);
      }
      
      // Save all subject names to localStorage for backup
      saveSubjectsToLocalStorage(token, allSubjects);
      
      // Redirect to schedule entry page
      window.location.href = 'subwise_time_table_entry/index.html';
      
    } catch (error) {
      console.error('Error creating/updating subjects:', error);
      
      // Show a more specific error message
      let errorMessage = 'Failed to update subjects. ';
      
      if (error.message && error.message.includes('Status: 401')) {
        errorMessage += 'Your session has expired. Please sign in again.';
        // Redirect to login after a short delay
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '../new_signin_signup/index.html';
        }, 3000);
      } else if (error.message && error.message.includes('Status: 400')) {
        errorMessage += 'Invalid subject data. Please check your inputs.';
      } else if (error.message && error.message.includes('Status: 500')) {
        errorMessage += 'Server error. Please try again later.';
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage += 'Could not connect to the server. Please check your internet connection.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
      
      // Reset button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
// Global variables
let subjectData = null;
let attendanceChart = null;

// Get parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('id');
const subjectName = urlParams.get('name');

// Parse JWT token
function parseToken(token) {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    try {
        return JSON.parse(window.atob(base64));
    } catch (e) {
        return null;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading state
    const mainContent = document.querySelector('.container');
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'text-center my-5';
    loadingSpinner.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading subject details...</p>
    `;
    mainContent.prepend(loadingSpinner);
    
    // Check for token
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('You need to log in to view this page', 'warning');
        setTimeout(() => {
            window.location.href = '../new_signin_signup/index.html';
        }, 2000);
        return;
    }
    
    // If no subject ID or name is provided, redirect to dashboard
    if (!subjectId && !subjectName) {
        showAlert('No subject specified', 'warning');
        setTimeout(() => {
            window.location.href = '../dashboard/dashboard.html';
        }, 2000);
        return;
    }
    
    try {
        // Fetch subject data
        await fetchSubjectData();
        
        // Immediately sync with database to get the latest attendance data
        // This is crucial for showing today's attendance
        console.log('Initial database sync starting...');
        const syncResult = await syncAttendanceWithDatabase();
        console.log('Initial database sync result:', syncResult);
        
        // Remove loading spinner
        loadingSpinner.remove();
        
        // Only initialize components if data was loaded successfully
        if (subjectData) {
            // Initialize components after we have the latest data
            initializeCircularProgress();
            initializeAttendanceChart('week');
            
            // Set up event listeners
            document.querySelectorAll('.period-selector .btn').forEach(button => {
                button.addEventListener('click', function() {
                    const period = this.dataset.period;
                    document.querySelectorAll('.period-selector .btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    this.classList.add('active');
                    initializeAttendanceChart(period);
                });
            });
        }
    } catch (error) {
        // Remove loading spinner
        loadingSpinner.remove();
        
        console.error('Error initializing page:', error);
        showAlert('Error loading subject details. ' + error.message, 'danger');
    }
});

// Fetch subject data from API
async function fetchSubjectData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        // Initialize subject data variable
        let subjectDataResult = null;
        
        // Try comprehensive API call first
        try {
            // Get the subject ID from the URL or use the name to fetch the ID first
            let targetSubjectId = subjectId;
            
            if (!targetSubjectId && subjectName) {
                // First need to get the subject ID by name
                const subjectsResponse = await fetch('/api/v1/user/subjects', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!subjectsResponse.ok) {
                    throw new Error(`API responded with status: ${subjectsResponse.status}`);
                }
                
                const subjectsData = await subjectsResponse.json();
                const foundSubject = subjectsData.subjects.find(s => s.name === subjectName);
                if (foundSubject) {
                    targetSubjectId = foundSubject._id;
                } else {
                    throw new Error(`Subject "${subjectName}" not found`);
                }
            }
            
            if (!targetSubjectId) {
                throw new Error('No subject ID available');
            }
            
            // Now get the complete subject data with attendance records
            const response = await fetch(`/api/v1/user/subjects/${targetSubjectId}/complete`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // If response is not ok, handle specific status codes
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '../new_signin_signup/index.html';
                    return;
                }
                
                // If the subject/complete endpoint is not available, fall back to separate calls
                if (response.status === 404) {
                    throw new Error('Complete subject endpoint not available');
                }
                
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.subject) {
                throw new Error('Invalid response format');
            }
            
            // Use the complete data from the API
            subjectDataResult = data.subject;
            
            // Log that we got complete data
            console.log('Fetched complete subject data from API:', subjectDataResult);
        } catch (completeApiError) {
            console.error('Complete API Error:', completeApiError);
            
            // Fall back to separate API calls
            console.log('Falling back to separate API calls');
            
            const response = await fetch('/api/v1/user/subjects', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // If response is not ok, handle specific status codes
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '../new_signin_signup/index.html';
                    return;
                }
                throw new Error(`API responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.subjects || !Array.isArray(data.subjects)) {
                throw new Error('Invalid response format');
            }
            
            // Find the subject by ID or name
            if (subjectId) {
                subjectDataResult = data.subjects.find(s => s._id === subjectId);
            } else if (subjectName) {
                subjectDataResult = data.subjects.find(s => s.name === subjectName);
            }
            
            // If we found the subject, fetch its attendance records
            if (subjectDataResult) {
                try {
                    const attendanceResponse = await fetch(`/api/v1/user/attendance/${subjectDataResult._id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (attendanceResponse.ok) {
                        const attendanceData = await attendanceResponse.json();
                        if (attendanceData && attendanceData.attendance) {
                            // Add attendance records to the subject data
                            subjectDataResult.attendance = attendanceData.attendance;
                            console.log('Fetched attendance data:', attendanceData.attendance);
                        }
                    } else {
                        console.warn('Failed to fetch attendance records');
                    }
                    
                    // Now fetch stats data for exact counts
                    const statsResponse = await fetch(`/api/v1/user/subjects/${subjectDataResult._id}/stats`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        if (statsData && statsData.stats) {
                            // Add stats data to the subject data
                            subjectDataResult.stats = statsData.stats;
                            console.log('Fetched stats data:', statsData.stats);
                        }
                    } else {
                        console.warn('Failed to fetch stats data');
                    }
                } catch (additionalDataError) {
                    console.error('Error fetching additional data:', additionalDataError);
                }
            }
        }
        
        // If still no data, throw error
        if (!subjectDataResult) {
            throw new Error('Subject not found in API');
        }
        
        // Set the subject data
        subjectData = subjectDataResult;
        
        // Update UI with subject data
        document.getElementById('subjectTitle').textContent = subjectData.name;
        
        // Use data from the database or calculate based on attendance records
        let totalClasses = 0;
        let presentCount = 0;
        let absentCount = 0;
        
        // First try to use stats from the API if available
        if (subjectData.stats) {
            totalClasses = subjectData.stats.totalClasses || 0;
            presentCount = subjectData.stats.presentCount || 0;
            absentCount = subjectData.stats.absentCount || 0;
        } 
        // Then try to calculate from attendance records
        else if (subjectData.attendance && Array.isArray(subjectData.attendance)) {
            totalClasses = subjectData.attendance.length;
            presentCount = subjectData.attendance.filter(record => record.status === 'present').length;
            absentCount = subjectData.attendance.filter(record => record.status === 'absent').length;
        } 
        // Finally fall back to basic subject data
        else {
            totalClasses = subjectData.totalClass || 0;
            presentCount = subjectData.totalPresent || 0;
            absentCount = totalClasses - presentCount;
        }
        
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('absentCount').textContent = absentCount;
        
        // Clear sessionStorage after successful load
        try {
            sessionStorage.removeItem('currentSubject');
        } catch (e) {
            console.error('Error clearing sessionStorage:', e);
        }
        
        return subjectData;
    } catch (error) {
        console.error('Error fetching subject data:', error);
        
        // Create an error container
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error-container">
                    <i class="bi bi-exclamation-triangle-fill error-icon"></i>
                    <h3>Unable to Load Subject</h3>
                    <p>${error.message || 'There was a problem loading the subject details.'}</p>
                    <div class="d-flex gap-2 justify-content-center">
                        <a href="../dashboard/dashboard.html" class="btn btn-primary">Return to Dashboard</a>
                        <button onclick="location.reload()" class="btn btn-outline-secondary">Try Again</button>
                    </div>
                </div>
            `;
        }
        
        // Check if we should redirect based on error type
        if (error.message.includes('authentication') || error.message.includes('401')) {
            showAlert('Authentication failed. Redirecting to login...', 'danger');
            setTimeout(() => {
                localStorage.removeItem('token');
                window.location.href = '../new_signin_signup/index.html';
            }, 2000);
        }
        
        throw error;
    }
}

// Initialize circular progress indicator
function initializeCircularProgress() {
    if (!subjectData) return;
    
    const attendancePercentage = calculateAttendancePercentage();
    updateAttendanceCircle(attendancePercentage);
}

// Calculate attendance percentage
function calculateAttendancePercentage() {
    if (!subjectData || !subjectData.totalClass || subjectData.totalClass === 0) {
        return 0;
    }
    
    const presentCount = subjectData.totalPresent || 0;
    const percentage = (presentCount / subjectData.totalClass) * 100;
    return Math.round(percentage);
}

// Initialize attendance chart
function initializeAttendanceChart(period) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    // Generate data based on selected period
    const { labels, presentData, absentData } = generateChartData(period);
    
    // Create chart
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    borderWidth: 1
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    // Calculate max based on the data
                    suggestedMax: Math.max(
                        ...presentData, 
                        ...absentData,
                        1  // Fallback to at least 1
                    ),
                    ticks: {
                        stepSize: calculateStepSize(presentData, absentData),
                        precision: 0
                    }
                }
            }
        }
    });
}

// Helper function to calculate appropriate step size for the y-axis
function calculateStepSize(presentData, absentData) {
    const maxValue = Math.max(...presentData, ...absentData, 1);
    
    // For small values, use 1
    if (maxValue <= 5) return 1;
    
    // For larger values, make steps that divide the range nicely
    if (maxValue <= 20) return 2;
    if (maxValue <= 50) return 5;
    
    return Math.ceil(maxValue / 10);
}

// Generate chart data based on period
function generateChartData(period) {
    // Default empty datasets
    let labels = [];
    let presentData = [];
    let absentData = [];
    
    // Log detailed debugging information about available data
    console.log('Subject data:', subjectData);
    
    // Prepare attendance data - ensure it's properly accessible
    let attendanceRecords = [];
    
    if (subjectData) {
        // Check for attendance in various possible locations in the data structure
        if (subjectData.attendance && Array.isArray(subjectData.attendance)) {
            attendanceRecords = subjectData.attendance;
            console.log('Found attendance records in subjectData.attendance:', attendanceRecords.length);
        } else if (subjectData.stats && subjectData.stats.totalClasses > 0) {
            console.log('Found attendance stats but no records, will use stats for display');
            // We at least have stats, so we can show something
            if (!attendanceRecords.length && subjectData.stats.absentCount > 0) {
                // Create a mock record for display based on stats
                attendanceRecords = [{
                    date: new Date().toISOString().split('T')[0],
                    status: 'absent'
                }];
                console.log('Created mock record from stats:', attendanceRecords);
            }
        }
        
        // Normalize dates in attendance records for consistent comparison
        if (attendanceRecords.length > 0) {
            const normalizeDate = (dateString) => {
                try {
                    return new Date(dateString).toISOString().split('T')[0];
                } catch (e) {
                    console.error('Error normalizing date:', dateString, e);
                    return dateString;
                }
            };
            
            attendanceRecords = attendanceRecords.map(record => {
                if (record.date) {
                    return { ...record, date: normalizeDate(record.date) };
                }
                return record;
            });
            
            console.log('Normalized attendance records:', attendanceRecords);
        }
    }
    
    // Check for UI display data even if we don't have actual attendance records
    // This ensures the UI shows something consistent with the stats counters
    const presentCount = parseInt(document.getElementById('presentCount').textContent) || 0;
    const absentCount = parseInt(document.getElementById('absentCount').textContent) || 0;
    const totalClasses = parseInt(document.getElementById('totalClasses').textContent) || 0;
    
    console.log('UI counts - Present:', presentCount, 'Absent:', absentCount, 'Total:', totalClasses);
    
    // Use actual records if available, otherwise use UI data
    const hasAttendanceData = attendanceRecords.length > 0 || totalClasses > 0;
    
    if (!hasAttendanceData) {
        console.log('No attendance data available for chart');
        // Only show warning if no data is visible anywhere
        if (totalClasses === 0) {
            showAlert('No attendance data available. Please mark attendance first.', 'warning');
        }
        
        // Return empty data structure with date labels
    if (period === 'week') {
            // Generate current week days as labels but with empty data
            const today = new Date();
            const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
            const startDate = new Date(today);
            // Adjust to previous Monday (or today if it's Monday)
            startDate.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
            
            // Generate the 7 days of the week
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate(); 
                labels.push(`${dayName} ${dayNumber}`);
                presentData.push(0);
                absentData.push(0);
            }
    } else if (period === 'month') {
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            presentData = [0, 0, 0, 0];
            absentData = [0, 0, 0, 0];
    } else if (period === 'semester') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const now = new Date();
            const currentMonth = now.getMonth();
            
            // Create labels for the last 6 months
            for (let i = 5; i >= 0; i--) {
                const monthIndex = (currentMonth - i + 12) % 12;
                labels.unshift(monthNames[monthIndex]);
                presentData.unshift(0);
                absentData.unshift(0);
            }
        }
        
        return { labels, presentData, absentData };
    }
    
    // Process data based on period
    if (hasAttendanceData) {
        // Helper function to normalize date format
        const normalizeDate = (dateString) => {
            try {
                return new Date(dateString).toISOString().split('T')[0];
            } catch (e) {
                console.error('Error normalizing date:', dateString, e);
                return dateString;
            }
        };
        
        if (period === 'week') {
            // Generate current week days (Monday to Sunday)
            const today = new Date();
            const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
            const startDate = new Date(today);
            // Adjust to previous Monday (or today if it's Monday)
            startDate.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
            
            // Generate the 7 days of the week
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                // Format date as short day name (Mon, Tue, etc.)
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNumber = date.getDate(); // Get the day of month
                labels.push(`${dayName} ${dayNumber}`); // Format as "Mon 15"
                
                // Format date as ISO string to match with records
                const dateStr = normalizeDate(date);
                console.log(`Looking for attendance on: ${dateStr}`);
                
                // Special handling for today's date
                const isToday = dateStr === normalizeDate(new Date());
                if (isToday) {
                    console.log('Processing TODAY\'s attendance data:', dateStr);
                }
                
                // Check if we have real attendance records
                if (attendanceRecords.length > 0) {
                    // Look for attendance record for this date
                    const record = attendanceRecords.find(r => {
                        const recordDate = normalizeDate(r.date);
                        const isMatch = recordDate === dateStr;
                        console.log(`  Comparing with record date: ${recordDate}, match: ${isMatch}`);
                        return isMatch;
                    });
                    
                    console.log(`  Record found for ${dateStr}:`, record);
                    
                    // Set attendance status
                    if (record) {
                        if (record.status === 'present') {
                            presentData.push(1);
                            absentData.push(0);
                        } else if (record.status === 'absent') {
                            presentData.push(0);
                            absentData.push(1);
                        } else {
                            presentData.push(0);
                            absentData.push(0);
                        }
                    } else if (isToday && presentCount > 0 && absentCount === 0) {
                        // If it's today and we have present count but no specific record
                        // This helps when data just shows in the UI stats but not in records yet
                        console.log('Showing today as present based on presentCount:', presentCount);
                        presentData.push(1);
                        absentData.push(0);
                    } else {
                        // No record for this date
                        presentData.push(0);
                        absentData.push(0);
                    }
                } else if (totalClasses > 0) {
                    // We don't have detailed records but we have totals
                    // Show data on today's date if this is a new record
                    const isToday = dateStr === normalizeDate(new Date());
                    
                    if (isToday) {
                        console.log('Processing TODAY with summary stats - Present count:', presentCount);
                        
                        if (presentCount > 0 && absentCount === 0) {
                            // If we have only present records, mark today as present
                            console.log('Marking TODAY as PRESENT based on stats');
                            presentData.push(1);
                            absentData.push(0);
                        } else if (absentCount > 0 && presentCount === 0) {
                            // If we have only absent records, mark today as absent
                            console.log('Marking TODAY as ABSENT based on stats');
                            presentData.push(0);
                            absentData.push(1);
                        } else if (presentCount > 0) {
                            // If we have both but present is greater than 0, prioritize showing present for today
                            console.log('Prioritizing PRESENT status for TODAY with mixed stats');
                            presentData.push(1);
                            absentData.push(0);
                        } else {
                            presentData.push(0);
                            absentData.push(0);
                        }
                    } else {
                        // No record for other dates
                        presentData.push(0);
                        absentData.push(0);
                    }
                } else {
                    // No data at all
                    presentData.push(0);
                    absentData.push(0);
                }
            }
        } else if (period === 'month') {
            // Generate last 4 weeks
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            
            // Group attendance by week
            const now = new Date();
            const fourWeeksAgo = new Date(now);
            fourWeeksAgo.setDate(now.getDate() - 28);
            
            // Initialize counters for each week (most recent to oldest)
            const weeklyData = [
                { present: 0, absent: 0 }, // Week 1 (most recent week)
                { present: 0, absent: 0 }, // Week 2
                { present: 0, absent: 0 }, // Week 3
                { present: 0, absent: 0 }  // Week 4 (oldest week)
            ];
            
            // Check if we have real attendance records
            if (attendanceRecords.length > 0) {
                console.log('Building month view from attendance records:', attendanceRecords.length);
                
                // Process attendance records
                attendanceRecords.forEach(record => {
                    try {
                        const recordDate = new Date(record.date);
                        
                        // Only count records from the last 4 weeks
                        if (recordDate >= fourWeeksAgo && recordDate <= now) {
                            // Calculate days ago
                            const daysAgo = Math.floor((now - recordDate) / (24 * 60 * 60 * 1000));
                            // Calculate which week this record belongs to (0-3)
                            const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
                            
                            console.log(`Record date: ${record.date}, days ago: ${daysAgo}, week index: ${weekIndex}`);
                            
                            if (weekIndex >= 0 && weekIndex < 4) {
                                if (record.status === 'present') {
                                    weeklyData[weekIndex].present++;
                                } else if (record.status === 'absent') {
                                    weeklyData[weekIndex].absent++;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error processing record for month view:', e, record);
                    }
                });
            } else if (totalClasses > 0) {
                // If we have no detailed records but have summary stats
                console.log('Building month view from summary stats');
                
                // Put all the data in the most recent week (week 0)
                if (presentCount > 0) {
                    weeklyData[0].present = presentCount;
                }
                if (absentCount > 0) {
                    weeklyData[0].absent = absentCount;
                }
            }
            
            // Log the weekly data for debugging
            console.log('Weekly data for chart:', weeklyData);
            
            // Convert to chart data format (reverse order to show oldest to newest week)
            weeklyData.forEach(week => {
                presentData.push(week.present);
                absentData.push(week.absent);
            });
        } else if (period === 'semester') {
            // Get the last 6 months
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Clear labels array
            labels = [];
            
            // Create labels for the last 6 months
            const monthData = [];
            for (let i = 5; i >= 0; i--) {
                // Calculate the month index (accounting for previous year)
                const monthIndex = (currentMonth - i + 12) % 12;
                // Calculate the year offset if we go to previous year
                const yearOffset = (currentMonth - i < 0) ? 1 : 0;
                const year = currentYear - yearOffset;
                
                // Add label with month and year
                labels.push(`${monthNames[monthIndex]} ${year}`);
                
                // Add month data entry with month info for later matching
                monthData.push({
                    monthIndex: monthIndex,
                    year: year,
                    present: 0,
                    absent: 0
                });
            }
            
            console.log('Month slots for semester view:', monthData);
            
            // Check if we have real attendance records
            if (attendanceRecords.length > 0) {
                console.log('Building semester view from attendance records:', attendanceRecords.length);
                
                // Process attendance records
                attendanceRecords.forEach(record => {
                    try {
                        const recordDate = new Date(record.date);
                        const recordMonth = recordDate.getMonth();
                        const recordYear = recordDate.getFullYear();
                        
                        // Find matching month in our data
                        const matchingMonthIndex = monthData.findIndex(
                            m => m.monthIndex === recordMonth && m.year === recordYear
                        );
                        
                        if (matchingMonthIndex !== -1) {
                            console.log(`Found matching month for record ${record.date}: ${matchingMonthIndex}`);
                            
                            if (record.status === 'present') {
                                monthData[matchingMonthIndex].present++;
                            } else if (record.status === 'absent') {
                                monthData[matchingMonthIndex].absent++;
                            }
                        }
                    } catch (e) {
                        console.error('Error processing record for semester view:', e, record);
                    }
                });
            } else if (totalClasses > 0) {
                // If we have no detailed records but have summary stats
                console.log('Building semester view from summary stats');
                
                // Put all the data in the current month (last index)
                if (presentCount > 0) {
                    monthData[monthData.length - 1].present = presentCount;
                }
                if (absentCount > 0) {
                    monthData[monthData.length - 1].absent = absentCount;
                }
            }
            
            // Log the monthly data for debugging
            console.log('Monthly data for chart:', monthData);
            
            // Extract data for chart
            monthData.forEach(month => {
                presentData.push(month.present);
                absentData.push(month.absent);
            });
        }
    }
    
    return { labels, presentData, absentData };
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Show alert message
function showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('alertContainer');
    
    // Create the alert container if it doesn't exist
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '1050';
        alertContainer.style.maxWidth = '350px';
        document.body.appendChild(alertContainer);
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, 5000);
}

// Update attendance circle with percentage
function updateAttendanceCircle(percentage) {
    const circle = document.querySelector('.percentage-circle circle:nth-child(2)');
    const percentageValue = document.querySelector('.percentage-value');
    const circleContainer = document.querySelector('.percentage-circle-container');
    
    // Calculate the circle's circumference and the offset based on percentage
    const radius = circle.getAttribute('r');
    const circumference = 2 * Math.PI * radius;
    
    // Update the stroke dasharray and dashoffset
    circle.style.strokeDasharray = circumference;
    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Update the text value
    percentageValue.textContent = `${percentage}%`;
    
    // Remove existing attendance classes
    circleContainer.classList.remove('attendance-high', 'attendance-medium', 'attendance-low');
    
    // Add appropriate class based on percentage
    if (percentage >= 75) {
        circleContainer.classList.add('attendance-high');
    } else if (percentage >= 50) {
        circleContainer.classList.add('attendance-medium');
    } else {
        circleContainer.classList.add('attendance-low');
    }
}

// Display subject details
function displaySubjectDetails(subject) {
    if (!subject) return;
    
    // Set subject title
    document.getElementById('subjectTitle').textContent = subject.name;
    
    // Calculate attendance stats
    const presentCount = subject.attendanceData?.presentCount || 0;
    const absentCount = subject.attendanceData?.absentCount || 0;
    const totalClasses = presentCount + absentCount;
    
    // Display attendance counts
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('totalClasses').textContent = totalClasses;
    
    // Calculate and display attendance percentage
    let attendancePercentage = 0;
    if (totalClasses > 0) {
        attendancePercentage = Math.round((presentCount / totalClasses) * 100);
    }
    
    // Use our new function to update the attendance circle
    updateAttendanceCircle(attendancePercentage);
    
    // Initialize attendance chart
    initializeAttendanceChart(subject.attendanceData?.history || []);
}

// Sync with database - check if the database has new attendance records
async function syncAttendanceWithDatabase() {
    try {
        const token = localStorage.getItem('token');
        if (!token || !subjectData || !subjectData._id) {
            console.warn('Cannot sync attendance: Missing token or subject ID');
            return false;
        }
        
        console.log('Starting attendance sync for subject:', subjectData.name);
        
        // Get today's date in ISO format for logging
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        console.log('Today\'s date for comparison:', todayStr);
        
        // First try to get attendance data specifically
        try {
            console.log('Fetching attendance data for subject ID:', subjectData._id);
            const attendanceResponse = await fetch(`/api/v1/user/attendance/${subjectData._id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (attendanceResponse.ok) {
                const attendanceData = await attendanceResponse.json();
                console.log('Raw attendance data from API:', attendanceData);
                
                if (attendanceData && attendanceData.attendance && Array.isArray(attendanceData.attendance)) {
                    // Process the attendance records to fix any timezone issues
                    const processedAttendance = attendanceData.attendance.map(record => {
                        // Ensure dates are properly formatted
                        if (record.date) {
                            const recordDate = new Date(record.date);
                            // Convert to ISO format without time for consistency
                            const formattedDate = recordDate.toISOString().split('T')[0];
                            return {
                                ...record,
                                date: formattedDate // Use consistent date format
                            };
                        }
                        return record;
                    });
                    
                    console.log('Processed attendance records:', processedAttendance);
                    
                    // Check if we now have today's attendance after processing
                    const todayRecord = processedAttendance.find(r => r.date === todayStr);
                    console.log('Today\'s record after processing:', todayRecord);
                    
                    // Update our subject data with processed attendance
                    subjectData.attendance = processedAttendance;
                    
                    // Now continue with the comprehensive sync
                }
            } else {
                console.warn('Failed to get attendance data, status:', attendanceResponse.status);
            }
        } catch (attendanceError) {
            console.error('Error fetching attendance data:', attendanceError);
        }
        
        // Continue with the full data sync
        
        // Try to get comprehensive subject data
        try {
            const response = await fetch(`/api/v1/user/subjects/${subjectData._id}/complete`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.subject) {
                    // If we get complete data, make sure attendance is processed correctly
                    if (data.subject.attendance && Array.isArray(data.subject.attendance)) {
                        // Process the attendance records to fix any timezone issues
                        data.subject.attendance = data.subject.attendance.map(record => {
                            // Ensure dates are properly formatted
                            if (record.date) {
                                const recordDate = new Date(record.date);
                                // Convert to ISO format without time for consistency
                                const formattedDate = recordDate.toISOString().split('T')[0];
                                return {
                                    ...record,
                                    date: formattedDate // Use consistent date format
                                };
                            }
                            return record;
                        });
                    }
                    
                    // Update our subject data with the complete data
                    subjectData = data.subject;
                    console.log('Synced complete subject data with processed dates:', subjectData);
                    
                    // Refresh UI components
                    updateUIFromDatabaseData();
                    return true;
                }
            } else {
                console.warn('Complete subject endpoint not available, falling back to individual calls');
            }
        } catch (error) {
            console.error('Error syncing complete data:', error);
        }
        
        return false;
    } catch (error) {
        console.error('Error syncing attendance:', error);
        return false;
    }
}

// Function to update all UI elements from the database data
function updateUIFromDatabaseData() {
    if (!subjectData) return;
    
    // Update attendance counts
    let totalClasses = 0;
    let presentCount = 0;
    let absentCount = 0;
    
    console.log('Updating UI from database data:', subjectData);
    
    // First try to use stats from the API if available
    if (subjectData.stats) {
        console.log('Using stats data for UI update:', subjectData.stats);
        totalClasses = subjectData.stats.totalClasses || 0;
        presentCount = subjectData.stats.presentCount || 0;
        absentCount = subjectData.stats.absentCount || 0;
    } 
    // Then try to calculate from attendance records
    else if (subjectData.attendance && Array.isArray(subjectData.attendance)) {
        console.log('Calculating stats from attendance records:', subjectData.attendance.length);
        totalClasses = subjectData.attendance.length;
        presentCount = subjectData.attendance.filter(record => record.status === 'present').length;
        absentCount = subjectData.attendance.filter(record => record.status === 'absent').length;
    } 
    // Finally fall back to basic subject data
    else {
        console.log('Using basic subject data for stats');
        totalClasses = subjectData.totalClass || 0;
        presentCount = subjectData.totalPresent || 0;
        absentCount = totalClasses - presentCount;
    }
    
    // Fallback to ensure we show something: if stats are available in the UI already, use them
    if (totalClasses === 0 && presentCount === 0 && absentCount === 0) {
        const uiTotalClasses = parseInt(document.getElementById('totalClasses').textContent) || 0;
        const uiPresentCount = parseInt(document.getElementById('presentCount').textContent) || 0;
        const uiAbsentCount = parseInt(document.getElementById('absentCount').textContent) || 0;
        
        if (uiTotalClasses > 0 || uiPresentCount > 0 || uiAbsentCount > 0) {
            console.log('Using UI stats as fallback');
            totalClasses = uiTotalClasses;
            presentCount = uiPresentCount;
            absentCount = uiAbsentCount;
        }
    }
    
    console.log('Final stats for UI:', { totalClasses, presentCount, absentCount });
    
    // Update UI
    document.getElementById('totalClasses').textContent = totalClasses;
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    
    // Update attendance percentage
    const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
    updateAttendanceCircle(percentage);
    
    // Refresh chart
    const activeButton = document.querySelector('.period-selector .btn.active');
    if (activeButton) {
        initializeAttendanceChart(activeButton.dataset.period);
    } else {
        initializeAttendanceChart('week');
    }
}

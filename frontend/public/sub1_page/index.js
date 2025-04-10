document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();

  // ========== FORMATTERS ==========
  const formatFull = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatShort = (date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ========== UPDATE "Today: ..." ==========
  const todayDateElem = document.querySelector(".today-date");
  if (todayDateElem) {
    todayDateElem.innerHTML = `<i class="fas fa-calendar-day"></i> Today: ${formatFull(today)}`;
  }

  // ========== UPDATE DATE RANGE ==========
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

  const rangeElem = document.querySelector(".date-range span");
  if (rangeElem) {
    rangeElem.innerHTML = `${formatShort(startOfWeek)} - ${formatShort(endOfWeek)}, ${today.getFullYear()} <i class="fas fa-calendar"></i>`;
  }

  // ========== BUILD CALENDAR GRID ==========
  const calendarGrid = document.getElementById("calendarGrid");
  if (calendarGrid) {
    calendarGrid.innerHTML = ""; // Clear any existing content

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);

      const dayNum = currentDay.getDate();
      const dayName = weekdays[currentDay.getDay()];
      const isToday = currentDay.toDateString() === today.toDateString();

      // Sample status logic (can be replaced with real data later)
      let status = "on-time";
      let timeRange = "10am-12pm";

      if (dayName === "Sunday") {
        status = "holiday";
        timeRange = "--:--";
      } else if (i === 1) {
        status = "late";
        timeRange = "9am-10pm";
      } else if (i === 4) {
        status = "absent";
        timeRange = "Family Emergency";
      }

      const dayBlock = document.createElement("div");
      dayBlock.classList.add("day");
      if (isToday) dayBlock.classList.add("active");

      dayBlock.innerHTML = `
        <div class="day-header">
          <span class="day-number">${dayNum}</span>
          <span class="day-name">${dayName}</span>
        </div>
        <div class="day-content">
          <span class="day-status ${status}">${status.replace("-", " ")}</span>
          <span class="time-range">${timeRange}</span>
        </div>
      `;

      calendarGrid.appendChild(dayBlock);
    }
  }

  // ========== UPDATE SELECTED DAY DETAIL ==========
  const selectedDayElem = document.getElementById("selectedDayHeading");
  if (selectedDayElem) {
    selectedDayElem.textContent = formatFull(today);
  }
});

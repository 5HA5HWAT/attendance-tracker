const subjects = ['sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6'];

    function createSubjectBlocks() {
      const container = document.getElementById('subjectsContainer');
      container.innerHTML = '';

      subjects.forEach((subject, index) => {
        const block = document.createElement('div');
        block.className = 'subject-block';

        const title = document.createElement('div');
        title.className = 'subject-title';
        title.textContent = subject;

        const checkboxes = document.createElement('div');
        checkboxes.className = 'checkbox-group';

        ['Present', 'Not Present', 'No Class'].forEach((status) => {
          const label = document.createElement('label');
          label.className = 'form-check-label';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = `status${index}`;
          checkbox.value = status;
          checkbox.className = 'form-check-input me-1';

          checkbox.addEventListener('change', () => {
            const group = document.querySelectorAll(`input[name="status${index}"]`);
            group.forEach(cb => {
              if (cb !== checkbox) cb.checked = false;
            });
          });

          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(` ${status}`));
          checkboxes.appendChild(label);
        });

        block.appendChild(title);
        block.appendChild(checkboxes);
        container.appendChild(block);
      });
    }

    function setDayTitle() {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      const currentDay = days[today.getDay()];
      document.getElementById('dayTitle').textContent = `${currentDay}'s Activity`;
    }

    document.getElementById('scheduleForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const result = [];

      subjects.forEach((subject, index) => {
        const checked = document.querySelector(`input[name="status${index}"]:checked`);
        const status = checked ? checked.value : 'Not Selected';
        result.push({ subject, status });
      });

      console.log("Attendance:", result);
      alert("Activity submitted! Check the console for the result.");
    });

    // Run on page load
    window.onload = function () {
      createSubjectBlocks();
      setDayTitle();
    };
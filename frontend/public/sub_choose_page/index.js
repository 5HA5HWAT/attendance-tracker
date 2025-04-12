function generateSubjectInputs() {
    const count = parseInt(document.getElementById('numSubjects').value);
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';

    for (let i = 1; i <= count; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-floating mb-3 fade-in input-icon';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-control';
      input.id = `subject${i}`;
      input.name = `subject${i}`;
      input.placeholder = `Subject ${i}`;
      input.required = true;
      input.setAttribute( "autocomplete", "off" );

      const label = document.createElement('label');
      label.setAttribute('for', `subject${i}`);
      label.textContent = `Subject ${i}`;

      const icon = document.createElement('i');
      icon.className = 'bi bi-journal';

      wrapper.appendChild(icon);
      wrapper.appendChild(input);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }
  }
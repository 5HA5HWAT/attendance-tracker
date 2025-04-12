function toggleForms(type) {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    if (type === 'signIn') {
      signInForm.classList.remove('d-none');
      signUpForm.classList.add('d-none');
      signInBtn.classList.add('active');
      signUpBtn.classList.remove('active');
    } else {
      signUpForm.classList.remove('d-none');
      signInForm.classList.add('d-none');
      signUpBtn.classList.add('active');
      signInBtn.classList.remove('active');
    }
  }
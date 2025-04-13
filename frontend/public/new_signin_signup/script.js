function toggleForms(type) {
  const signInForm = document.getElementById('signInForm');
  const signUpForm = document.getElementById('signUpForm');
  const signInBtn = document.getElementById('signInBtn');
  const signUpBtn = document.getElementById('signUpBtn');

  if (type === 'signIn') {
    signInForm.classList.remove('hidden');
    signUpForm.classList.add('hidden');
    signInBtn.classList.add('border-purple-600');
    signInBtn.classList.remove('border-transparent');
    signUpBtn.classList.add('border-transparent');
    signUpBtn.classList.remove('border-purple-600');
  } else {
    signUpForm.classList.remove('hidden');
    signInForm.classList.add('hidden');
    signUpBtn.classList.add('border-purple-600');
    signUpBtn.classList.remove('border-transparent');
    signInBtn.classList.add('border-transparent');
    signInBtn.classList.remove('border-purple-600');
  }
}

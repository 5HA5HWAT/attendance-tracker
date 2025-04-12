function toggleForms(form) {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    if (form === 'signIn') {
        signInForm.classList.remove('hidden');
        signUpForm.classList.add('hidden');
        signInBtn.classList.add('border-purple-600');
        signInBtn.classList.remove('border-transparent');
        signUpBtn.classList.remove('border-purple-600');
        signUpBtn.classList.add('border-transparent');
    } else {
        signUpForm.classList.remove('hidden');
        signInForm.classList.add('hidden');
        signUpBtn.classList.add('border-purple-600');
        signUpBtn.classList.remove('border-transparent');
        signInBtn.classList.remove('border-purple-600');
        signInBtn.classList.add('border-transparent');
    }
}
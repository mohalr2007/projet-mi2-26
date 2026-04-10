import re

path = 'front/src/app/signup/SignupClient.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fix handleSubmit e.preventDefault error
text = re.sub(r'const handleSubmit = async \(e: React\.FormEvent\) => \{\n\s*e\.preventDefault\(\);', 'const handleSubmit = async (e?: React.FormEvent) => {\\n    if (e) e.preventDefault();', text)

# 2. Add validateCurrentStep function Right before isGoogleCompletion logic
val_func = '''
  const validateCurrentStep = (step: number) => {
     if (step === 1) {
       if (!accountType || !gender) {
         setError("Veuillez sélectionner votre type de compte et votre sexe.");
         return false;
       }
     }
     if (step === 2) {
        if (!password || password.length < 8) {
           setError("Mot de passe invalide. Minimum 8 caractères.");
           return false;
        }
        if (password !== confirmPassword) {
           setError("Les mots de passe ne correspondent pas.");
           return false;
        }
     }
     if (step === 3) {
        if (!latitude || !longitude) {
           setError("Localisation requise. Cliquez sur 'Chercher Carte' ou 'GPS Automatique'.");
           return false;
        }
     }
     if (step === 4) {
        if (accountType === 'doctor' && (!specialty || !license)) {
            setError("Spécialité et Numéro d'Ordre requis pour les médecins.");
            return false;
        }
     }
     setError(null);
     return true;
  };

'''
text = text.replace('  // Detect if user is arriving from Google OAuth', val_func + '  // Detect if user is arriving from Google OAuth')

# 3. Add validateStep and disableStepIndicators to Stepper
text = text.replace('<Stepper\n              initialStep={1}', '<Stepper\n              initialStep={1}\n              disableStepIndicators={true}\n              validateStep={validateCurrentStep}')

# 4. Fix Username and Email Layout
old_grid = '<div className="grid md:grid-cols-2 gap-4 mb-2">'
new_grid = '<div className="space-y-4 mb-2">'
text = text.replace(old_grid, new_grid)

# 5. Fix Google Button Typography
old_google = '<button \n                type="button" \n                onClick={handleGoogleLogin}\n                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition shadow-sm hover:border-slate-300 dark:hover:border-neutral-600"\n              >'
new_google = '<button \n                type="button" \n                onClick={handleGoogleLogin}\n                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-300 tracking-wide text-[15px]"\n              >'
text = text.replace(old_google, new_google)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Success')

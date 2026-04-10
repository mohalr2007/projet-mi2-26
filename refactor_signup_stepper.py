import re

path = 'front/src/app/signup/SignupClient.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update handleSubmit
text = text.replace('const handleSubmit = async (e: React.FormEvent) => {\\n    e.preventDefault();', 'const handleSubmit = async (e?: React.FormEvent) => {\\n    if (e) e.preventDefault();')

# 2. Add Imports
text = text.replace('import { AnimatedInput } from "../../components/AnimatedInput";', 'import { AnimatedInput } from "../../components/AnimatedInput";\\nimport Stepper, { Step } from "../../components/Stepper";')

# 3. Restructure Form
form_start_marker = '<form className="space-y-5" onSubmit={handleSubmit}>'

old_name_email = """            {/* Full Name */}
            <AnimatedInput
              id="name"
              type="text"
              placeholder="Enter your full name"
              label="Full Name"
              icon={User}
              iconDelay={0}
              fieldDelay={0.1}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/* Email */}
            <AnimatedInput
              id="email"
              type="email"
              placeholder="Enter your email"
              label="Email"
              icon={Mail}
              iconDelay={0.2}
              fieldDelay={0.2}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isGoogleCompletion}
            />"""

new_name_email_fixed = """            <div className="grid md:grid-cols-2 gap-4 mb-2">
              <AnimatedInput id="name" type="text" placeholder="Enter your full name" label="Full Name" icon={User} iconDelay={0} fieldDelay={0.1} required value={name} onChange={(e) => setName(e.target.value)} />
              <AnimatedInput id="email" type="email" placeholder="Enter your email" label="Email" icon={Mail} iconDelay={0.2} fieldDelay={0.2} required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isGoogleCompletion} />
            </div>

            <Stepper
              initialStep={1}
              onFinalStepCompleted={() => handleSubmit()}
              backButtonText="Retour"
              nextButtonText="Continuer"
            >
              <Step>
                <div className="py-4 space-y-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Étape 1 : Informations de Profil</h3>"""

text = text.replace(form_start_marker, form_start_marker + '\n' + new_name_email_fixed)
text = text.replace(old_name_email, '')

# Now wrap sections in Steps
old_gender = """            {/* Gender Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Sexe / Genre</label>"""

new_gender = """            {/* Gender Selection */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Sexe / Genre</label>"""
text = text.replace(old_gender, new_gender)

# After gender block, end Step 1 and Start Step 2
old_passwords = """            {/* Passwords */}
            <div className="space-y-4">"""

new_passwords = """                </div>
              </Step>
              
              <Step>
                <div className="py-4 space-y-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Étape 2 : Sécurité du compte</h3>
                  {/* Passwords */}
                  <div className="space-y-4">"""
text = text.replace(old_passwords, new_passwords)

old_doctor = """            {/* Doctor-specific fields */}
            {accountType === "doctor" && ("""

new_doctor = """                </div>
              </Step>
              
              <Step>
                <div className="py-4 space-y-6">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Étape 3 : Localisation</h3>"""
text = text.replace(old_doctor, new_doctor + '\n' + old_doctor)

# After location, end step 3, start step 4 if doctor!
old_submit_section = """            {/* Submit Button */}
            <div className="pt-4">"""

new_doctor_step_wrapper = """             {/* Doctor-specific fields wrapped inside Step 4 */}
             {accountType === 'doctor' && (
              <Step>
                <div className="py-4 space-y-6">
                  {/* Doctor Info */}
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl">👨‍⚕️ Informations Professionnelles</h3>
                    
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Spécialité Médicale</label>
                      <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition">
                        <option value="">Sélectionnez votre spécialité...</option>
                        <option value="Cardiologue">Cardiologue</option>
                        <option value="Dermatologue">Dermatologue</option>
                        <option value="Généraliste">Généraliste</option>
                        <option value="Ophtalmologue">Ophtalmologue</option>
                        <option value="Pédiatre">Pédiatre</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 mb-1 block">N° d'identification (Ordre)</label>
                      <input type="text" placeholder="Ex: 123456" value={license} onChange={(e) => setLicense(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500" required />
                    </div>
                  </div>
                </div>
              </Step>
             )}
            </Stepper>
"""

# Completely strip old doctor specifics out because they were injected weirdly earlier
# We will use regex to chop off the old DOCTOR block and insert the Step 4 correctly before Submit.

doctor_block_regex = r'\{accountType === "doctor" && \(\n\s*<motion\.div.*?</motion\.div>\n\s*\)\}'

text = re.sub(doctor_block_regex, '', text, flags=re.DOTALL)

# Insert the end of Stepper before Submit!
text = text.replace(old_submit_section, new_doctor_step_wrapper + '\n            {/* Submit Button */}\n            <div className="pt-4 hidden">')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Signup successfully refactored dynamically!")

import re

path_patient = 'front/src/app/dashboardpatientlarabi/DashboardPatientLarabiClient.tsx'
with open(path_patient, 'r', encoding='utf-8') as f:
    text = f.read()

# Make the card modern
text = text.replace('className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm"',
                    'className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 lg:p-8 rounded-3xl border border-slate-100/50 dark:border-slate-800/50 shadow-xl shadow-blue-900/5 hover:shadow-blue-900/10 transition-all duration-300"')

# Make interactions modern
text = text.replace('className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${',
                    'className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 ${')

with open(path_patient, 'w', encoding='utf-8') as f:
    f.write(text)

path_doc = 'front/src/app/dashboardoctlarabi/DashboardOctLarabiClient.tsx'
with open(path_doc, 'r', encoding='utf-8') as f:
    doc_text = f.read()

# 1. Update Tabs setup in doc_text
doc_text = doc_text.replace('const allowedTabs = new Set(["appointments", "patients", "community", "profile"]);',
                            'const allowedTabs = new Set(["appointments", "patients", "community", "publications", "profile"]);')

# Tab bar buttons
old_buttons = """          <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "profile" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Settings size={20} /> Configuration Cabinet
          </button>"""

new_buttons = """          <button onClick={() => setActiveTab("publications")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "publications" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Upload size={20} /> Mes Publications
          </button>
          <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "profile" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Settings size={20} /> Configuration Cabinet
          </button>"""

doc_text = doc_text.replace(old_buttons, new_buttons)

# Update old tab name
doc_text = doc_text.replace('{/* TAB: ARTICLES */}', '{/* TAB: MES PUBLICATIONS (GESTION) */}')
doc_text = doc_text.replace('{activeTab === "community" && (', '{activeTab === "publications" && (')
doc_text = doc_text.replace('<FileText className="text-blue-600"/> Zone de Publication', '<Upload className="text-blue-600"/> Mes Publications')

with open(path_doc, 'w', encoding='utf-8') as f:
    f.write(doc_text)

print("Updated dashboards base UI")

import re

path = 'front/src/app/dashboardoctlarabi/DashboardOctLarabiClient.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Main structure
text = text.replace('<div className="grid lg:grid-cols-3 gap-8">', '<div className="max-w-4xl mx-auto flex flex-col gap-10">')
text = text.replace('<div className="lg:col-span-1">', '<div className="w-full">')
text = text.replace('<div className="lg:col-span-2 flex flex-col gap-4">', '<div className="w-full flex flex-col gap-4">\\n                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-2">Historique des publications</h3>')

# 2. Form styling (Wider form on PC)
text = text.replace('<form onSubmit={handlePublishArticle} className="flex flex-col gap-4">', '<form onSubmit={handlePublishArticle} className="grid md:grid-cols-2 gap-5">')

text = text.replace('<div>\\n                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Contenu médical</label>', '<div className="md:col-span-2">\\n                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Contenu médical</label>')

text = text.replace('<div>\\n                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Photos (max 10)</label>', '<div className="md:col-span-2">\\n                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Photos (max 10)</label>')

text = text.replace('<button type="submit" className="bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-500 transition shadow-md">Publier l&apos;article</button>', '<button type="submit" className="md:col-span-2 bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-500 transition shadow-md">Publier l&apos;article</button>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Publishing UI adjusted!\\n")

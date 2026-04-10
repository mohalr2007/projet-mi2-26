import re

path = 'front/src/app/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Animate Services Headers
text = text.replace('<div className="text-center mb-12 sm:mb-16">', '<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">')
text = text.replace('            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">\n              From AI-powered symptom checking to booking appointments with specialists\n            </p>\n          </div>', '            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">\n              From AI-powered symptom checking to booking appointments with specialists\n            </p>\n          </motion.div>')

# Animate Service Cards
text = text.replace('<div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl', '<motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl')
text = text.replace('              </AnimatedButton>\n            </div>', '              </AnimatedButton>\n            </motion.div>')
text = text.replace('              </AnimatedButton>\n            </motion.div>\n            \n            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">\n              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">', '              </AnimatedButton>\n            </motion.div>\n            \n            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">\n              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">')
text = text.replace('<motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">\n              <div className="w-16 h-16 bg-green-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">', '<motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">\n              <div className="w-16 h-16 bg-green-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">')

# Animate internal elements
text = text.replace('            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400">Simple steps to better healthcare</p>\n          </div>', '            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400">Simple steps to better healthcare</p>\n          </motion.div>')


# Animate Step Cards
text = text.replace('<div className="text-center group">', '<motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4 }} className="text-center group">')
text = text.replace('              <p className="text-gray-600 dark:text-slate-400">Tell our AI about your health concerns</p>\n            </div>', '              <p className="text-gray-600 dark:text-slate-400">Tell our AI about your health concerns</p>\n            </motion.div>')
text = text.replace('              <p className="text-gray-600 dark:text-slate-400">Receive instant AI-powered analysis</p>\n            </div>', '              <p className="text-gray-600 dark:text-slate-400">Receive instant AI-powered analysis</p>\n            </motion.div>')
text = text.replace('              <p className="text-gray-600 dark:text-slate-400">Connect with the right specialist</p>\n            </div>', '              <p className="text-gray-600 dark:text-slate-400">Connect with the right specialist</p>\n            </motion.div>')
text = text.replace('              <p className="text-gray-600 dark:text-slate-400">Start your journey to better health</p>\n            </div>', '              <p className="text-gray-600 dark:text-slate-400">Start your journey to better health</p>\n            </motion.div>')

# Fix delays for step cards
delays = ['0.1', '0.2', '0.3', '0.4']
i = 0
def repl(m):
    global i
    res = m.group(1) + delays[i] + m.group(2)
    i += 1
    return res

text = re.sub(r'(<motion\.div initial={{ opacity: 0, scale: 0\.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0\.4)( }} className="text-center group">)', repl, text)


# Animate CTA
text = text.replace('<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">', '<motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7 }} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">')
text = text.replace('              Try AI Assistant\n            </AnimatedButton>\n          </div>\n        </div>', '              Try AI Assistant\n            </AnimatedButton>\n          </div>\n        </motion.div>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Scroll animations injected successfully')

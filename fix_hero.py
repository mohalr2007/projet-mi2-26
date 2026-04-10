import re

path = 'front/src/app/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add framer-motion import
if 'from "framer-motion"' not in text:
    text = text.replace('import { AnimatedButton } from "../components/AnimatedButton";', 'import { AnimatedButton } from "../components/AnimatedButton";\\nimport { motion } from "framer-motion";')

# Replace old blobs with cool animated blobs and animate the text
old_hero = """        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl dark:bg-blue-900/10"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl dark:bg-indigo-900/10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">"""

new_hero = """        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-gradient-to-br from-blue-400/30 to-indigo-500/30 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full blur-3xl"></motion.div>
        <motion.div animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -bottom-40 -left-40 w-[35rem] h-[35rem] bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-full blur-3xl"></motion.div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="space-y-8">"""

text = text.replace(old_hero, new_hero)

text = text.replace('              </div>\n            </div>\n            \n            <div className="relative">', '              </div>\n            </motion.div>\n            \n            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2, ease: "easeOut" }} className="relative">')

text = text.replace('              </div>\n            </div>\n          </div>\n        </div>\n      </section>', '              </div>\n            </motion.div>\n          </div>\n        </div>\n      </section>')


with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated page animation')

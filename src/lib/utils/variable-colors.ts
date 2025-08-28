// Color palette for variables - each variable gets a consistent color
export const variableColors = [
  {
    border: 'border-blue-500 dark:border-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    focusBorder: 'focus:border-blue-600 dark:focus:border-blue-300',
    focusRing: 'focus:ring-blue-500/30',
    inputStyle: 'border-blue-500 focus:border-blue-600 focus:ring-blue-500/30'
  },
  {
    border: 'border-purple-500 dark:border-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    focusBorder: 'focus:border-purple-600 dark:focus:border-purple-300',
    focusRing: 'focus:ring-purple-500/30',
    inputStyle: 'border-purple-500 focus:border-purple-600 focus:ring-purple-500/30'
  },
  {
    border: 'border-green-500 dark:border-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    focusBorder: 'focus:border-green-600 dark:focus:border-green-300',
    focusRing: 'focus:ring-green-500/30',
    inputStyle: 'border-green-500 focus:border-green-600 focus:ring-green-500/30'
  },
  {
    border: 'border-amber-500 dark:border-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    focusBorder: 'focus:border-amber-600 dark:focus:border-amber-300',
    focusRing: 'focus:ring-amber-500/30',
    inputStyle: 'border-amber-500 focus:border-amber-600 focus:ring-amber-500/30'
  },
  {
    border: 'border-pink-500 dark:border-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    focusBorder: 'focus:border-pink-600 dark:focus:border-pink-300',
    focusRing: 'focus:ring-pink-500/30',
    inputStyle: 'border-pink-500 focus:border-pink-600 focus:ring-pink-500/30'
  },
  {
    border: 'border-cyan-500 dark:border-cyan-400',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    focusBorder: 'focus:border-cyan-600 dark:focus:border-cyan-300',
    focusRing: 'focus:ring-cyan-500/30',
    inputStyle: 'border-cyan-500 focus:border-cyan-600 focus:ring-cyan-500/30'
  },
  {
    border: 'border-orange-500 dark:border-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    focusBorder: 'focus:border-orange-600 dark:focus:border-orange-300',
    focusRing: 'focus:ring-orange-500/30',
    inputStyle: 'border-orange-500 focus:border-orange-600 focus:ring-orange-500/30'
  },
  {
    border: 'border-teal-500 dark:border-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    text: 'text-teal-700 dark:text-teal-300',
    focusBorder: 'focus:border-teal-600 dark:focus:border-teal-300',
    focusRing: 'focus:ring-teal-500/30',
    inputStyle: 'border-teal-500 focus:border-teal-600 focus:ring-teal-500/30'
  }
];

// Get consistent color for a variable based on its index
export function getVariableColor(index: number) {
  return variableColors[index % variableColors.length];
}

// Create a color map for a list of variable names
export function createVariableColorMap(variableNames: string[]) {
  const colorMap: Record<string, typeof variableColors[0]> = {};
  variableNames.forEach((name, index) => {
    colorMap[name] = getVariableColor(index);
  });
  return colorMap;
}
export const TASK_GROUPS = {
  Personal: {
    focus: 'Review the day and finish 2 quick wins.',
    sections: [
      { title: 'Morning', items: ['Stretch for 10 minutes', 'Reply to family group'] },
      { title: 'Afternoon', items: ['Book dentist appointment', 'Pick up dry cleaning'] },
    ],
  },
  Work: {
    focus: 'Ship the highest-impact task before lunch.',
    sections: [
      { title: 'Priority', items: ['Polish onboarding flow', 'Review PR #184'] },
      { title: 'Later', items: ['Draft weekly update', 'Plan sprint retro'] },
    ],
  },
  Shopping: {
    focus: 'Buy only what is needed for the weekend.',
    sections: [
      { title: 'Groceries', items: ['Greek yogurt', 'Cherry tomatoes'] },
      { title: 'Home', items: ['Dish soap', 'Paper towels'] },
    ],
  },
};

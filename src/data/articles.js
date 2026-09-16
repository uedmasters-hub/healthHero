import { getDoctorPhoto } from './doctors'
import { isInsightSaved as userInsightSaved, toggleSavedInsight } from '../user/store'

export const articles = [
  {
    id: 'healthy-heart',
    title: 'How to maintain a healthy heart',
    emoji: '🫀',
    category: 'Cardiology',
    readTime: '5 min read',
    date: '24 Oct 2024',
    hero: '/img/clinic/martha-dominguez-de-gouveia-KF-h9HMxRKg-unsplash.jpg',
    author: {
      doctorId: 1,
      name: 'Dr. Priya Sharma',
      title: 'Chief of Cardiology',
    },
    related: ['better-sleep', 'daily-nutrition', 'blood-pressure'],
    sections: [
      {
        type: 'p',
        text: "Your heart beats about 100,000 times a day, pumping oxygen-rich blood to every cell in your body. Protecting this vital organ doesn't require extreme changes; rather, it thrives on small, consistent everyday decisions.",
      },
      { type: 'h2', text: 'The power of active movement' },
      {
        type: 'p',
        text: 'Just 30 minutes of moderate aerobic exercise, like brisk walking or cycling, can significantly lower blood pressure and raise your good HDL cholesterol. Combined with a diet rich in leafy greens, omega-3 fatty acids, and active stress management, you can keep your heart strong for years to come.',
      },
      { type: 'h2', text: 'Foods that support circulation' },
      {
        type: 'p',
        text: 'Colorful plants, unsalted nuts, and oily fish give your heart the minerals and healthy fats it needs. Swap sugary drinks for water, and keep processed meats as an occasional extra rather than a daily habit.',
      },
    ],
  },
  {
    id: 'better-sleep',
    title: 'Tips for better sleep quality',
    emoji: '😴',
    category: 'Sleep',
    readTime: '4 min read',
    date: '18 Oct 2024',
    hero: '/img/clinic/sander-sammy-38Un6Oi5beE-unsplash.jpg',
    author: {
      doctorId: 17,
      name: 'Dr. Sara Qureshi',
      title: 'Sleep & Mental Health',
    },
    related: ['healthy-heart', 'everyday-stress', 'daily-nutrition'],
    sections: [
      {
        type: 'p',
        text: 'Restorative sleep is one of the most reliable ways to protect mood, memory, and metabolic health. Most adults feel their best with seven to nine hours of uninterrupted rest.',
      },
      { type: 'h2', text: 'Keep a consistent wind-down' },
      {
        type: 'p',
        text: 'Go to bed and wake up at similar times, even on weekends. Dim lights an hour before bed, keep screens out of reach, and reserve the bedroom for sleep so your brain learns the cue quickly.',
      },
      { type: 'h2', text: 'Watch late caffeine and heavy meals' },
      {
        type: 'p',
        text: 'Caffeine can linger for six hours or more. Move coffee to the morning, and leave a two-hour gap between dinner and lights out so digestion does not compete with sleep.',
      },
    ],
  },
  {
    id: 'blood-pressure',
    title: 'Understanding blood pressure',
    emoji: '🩺',
    category: 'Cardiology',
    readTime: '6 min read',
    date: '12 Oct 2024',
    hero: '/img/clinic/akram-huseyn-V_0ES17m9Tc-unsplash.jpg',
    author: {
      doctorId: 2,
      name: 'Dr. Arjun Mehta',
      title: 'Consultant Cardiologist',
    },
    related: ['healthy-heart', 'daily-nutrition', 'hydration-habits'],
    sections: [
      {
        type: 'p',
        text: 'Blood pressure is the force of blood against artery walls. A reading around 120/80 mmHg is typical for healthy adults, while consistently higher numbers raise the long-term risk of heart disease and stroke.',
      },
      { type: 'h2', text: 'Know your numbers' },
      {
        type: 'p',
        text: 'Home monitors are useful when you sit quietly for five minutes, keep your arm at heart level, and take two readings. Share a log with your clinician rather than reacting to a single spike.',
      },
      { type: 'h2', text: 'Everyday levers that help' },
      {
        type: 'p',
        text: 'Reducing salt, staying active, limiting alcohol, and taking prescribed medicine on schedule all move numbers in the right direction. Do not stop a blood-pressure medicine without speaking to your doctor.',
      },
    ],
  },
  {
    id: 'healthy-eating',
    title: 'Healthy eating habits',
    emoji: '🥗',
    category: 'Nutrition',
    readTime: '3 min read',
    date: '8 Oct 2024',
    hero: '/img/clinic/adhy-savala-zbpgmGe27p8-unsplash.jpg',
    author: {
      doctorId: 14,
      name: 'Dr. Kabir Sethi',
      title: 'Clinical Nutritionist',
    },
    related: ['daily-nutrition', 'healthy-heart', 'hydration-habits'],
    sections: [
      {
        type: 'p',
        text: 'Healthy eating is less about perfect meals and more about a pattern you can repeat. Build plates around vegetables, lean protein, and slow-release carbohydrates, then add flavor with herbs, citrus, and spices.',
      },
      { type: 'h2', text: 'Start with the grocery list' },
      {
        type: 'p',
        text: 'Shop the outer aisles first: produce, dairy, eggs, and fresh proteins. Keeping fruit washed and ready makes the easier choice the default when energy is low.',
      },
    ],
  },
  {
    id: 'daily-nutrition',
    title: 'Daily nutrition guide for energy',
    emoji: '⚡',
    category: 'Nutrition',
    readTime: '6 min read',
    date: '4 Oct 2024',
    hero: '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
    author: {
      doctorId: 14,
      name: 'Dr. Kabir Sethi',
      title: 'Clinical Nutritionist',
    },
    related: ['healthy-eating', 'hydration-habits', 'desk-stretches'],
    sections: [
      {
        type: 'p',
        text: 'Steady energy comes from pairing protein, fiber, and fluids across the day. Skipping meals often leads to a late crash, while balanced snacks keep focus without a sugar spike.',
      },
      { type: 'h2', text: 'A simple daily rhythm' },
      {
        type: 'p',
        text: 'Eat breakfast within two hours of waking, include protein at lunch, and keep dinner lighter if sleep is a struggle. A handful of nuts or yogurt between meals is enough for most people.',
      },
    ],
  },
  {
    id: 'everyday-stress',
    title: 'Managing everyday stress',
    emoji: '🌿',
    category: 'Wellbeing',
    readTime: '5 min read',
    date: '28 Sep 2024',
    hero: '/img/clinic/arseny-togulev-DE6rYp1nAho-unsplash.jpg',
    author: {
      doctorId: 17,
      name: 'Dr. Sara Qureshi',
      title: 'Consultant Psychiatrist',
    },
    related: ['better-sleep', 'desk-stretches', 'healthy-heart'],
    sections: [
      {
        type: 'p',
        text: 'Short bursts of stress are normal. Trouble starts when the body never gets a chance to reset. Noticing early signs — tight shoulders, racing thoughts, poor sleep — helps you intervene before burnout sets in.',
      },
      { type: 'h2', text: 'Two-minute resets' },
      {
        type: 'p',
        text: 'A slow exhale that lasts longer than the inhale, a short walk between meetings, or writing down one next step can lower the sense of overload. Repeat these often rather than waiting for a free weekend.',
      },
    ],
  },
  {
    id: 'desk-stretches',
    title: 'Simple stretches for desk workers',
    emoji: '🧘',
    category: 'Movement',
    readTime: '4 min read',
    date: '22 Sep 2024',
    hero: '/img/clinic/akram-huseyn-V_0ES17m9Tc-unsplash.jpg',
    author: {
      doctorId: 16,
      name: 'Dr. Rohan Gill',
      title: 'Physiotherapist',
    },
    related: ['everyday-stress', 'healthy-heart', 'daily-nutrition'],
    sections: [
      {
        type: 'p',
        text: 'Long hours at a desk shorten hip flexors, round the shoulders, and fatigue the neck. Brief movement breaks protect posture better than one intense workout at the end of the day.',
      },
      { type: 'h2', text: 'Move every 45 minutes' },
      {
        type: 'p',
        text: 'Stand, roll the shoulders, and open the chest. A seated figure-four stretch and a gentle neck side-bend are enough to restore circulation without leaving your workstation.',
      },
    ],
  },
  {
    id: 'hydration-habits',
    title: 'Hydration habits that actually stick',
    emoji: '💧',
    category: 'Nutrition',
    readTime: '3 min read',
    date: '16 Sep 2024',
    hero: '/img/clinic/adhy-savala-zbpgmGe27p8-unsplash.jpg',
    author: {
      doctorId: 12,
      name: 'Dr. Arun Iyer',
      title: 'General Physician',
    },
    related: ['daily-nutrition', 'healthy-eating', 'blood-pressure'],
    sections: [
      {
        type: 'p',
        text: 'Most people do not need complicated hydration formulas. A glass of water with each meal, one between meals, and extra on hot or active days covers typical needs.',
      },
      { type: 'h2', text: 'Make the cue obvious' },
      {
        type: 'p',
        text: 'Keep a bottle in sight, flavor water with citrus or mint if plain water feels boring, and treat thirst as a prompt rather than a problem to ignore until late afternoon.',
      },
    ],
  },
]

export const HOME_INSIGHT_IDS = ['healthy-heart', 'better-sleep', 'blood-pressure', 'healthy-eating']

export function getArticleById(id) {
  return articles.find((item) => item.id === id) || null
}

export function getHomeInsights() {
  return HOME_INSIGHT_IDS.map(getArticleById).filter(Boolean)
}

export function getRelatedArticles(article) {
  if (!article?.related?.length) return articles.filter((item) => item.id !== article?.id).slice(0, 3)
  return article.related.map(getArticleById).filter(Boolean)
}

export function getArticleAuthor(article) {
  if (!article?.author) return null
  return {
    ...article.author,
    photo: article.author.doctorId ? getDoctorPhoto(article.author.doctorId) : null,
  }
}

export function isInsightSaved(id) {
  return userInsightSaved(id)
}

export function toggleInsightSaved(id) {
  return toggleSavedInsight(id)
}

export function articlePath(id) {
  return `/insights/${id}`
}
